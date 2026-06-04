import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runOrchestrator } from '@/lib/agents/orchestrator'
import { runSearcher } from '@/lib/agents/searcher'
import { runSynthesiser } from '@/lib/agents/synthesiser'
import { runCritic } from '@/lib/agents/critic'
import { runReportWriter } from '@/lib/agents/reportWriter'
import { rateLimiter } from '@/lib/rateLimit'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { success, reset } = await rateLimiter.limit(session.user.id)

    console.log('[RateLimit] reset value:', reset, 'Date:', new Date(reset).toISOString())

    if (!success) {
        const resetsAt = new Date(reset)
        const minutesLeft = Math.ceil((resetsAt - Date.now()) / 60000)
        return new Response(
            JSON.stringify({
                error: `Rate limit reached. You can run 2 research jobs every 30 minutes. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`
            }),
            { status: 429 }
        )
    }

    const { topic } = await req.json()
    if (!topic?.trim()) {
        return new Response(JSON.stringify({ error: 'Topic is required' }), { status: 400 })
    }

    const encoder = new TextEncoder()
    let controller

    const stream = new ReadableStream({
        start(c) { controller = c },
        cancel() { },
    })

    const send = (data) => {
        try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch (_) { }
    }

        ; (async () => {
            const state = {
                topic: topic.trim(),
                researchPlan: null,
                searchResults: [],
                synthesisedFindings: '',
                criticReview: null,
                report: null,
                retryCount: 0,
            }

            try {
                // ── 1. Orchestrator ──────────────────────────────────────────────
                send({
                    type: 'agent_status', agent: 'Orchestrator', status: 'working',
                    message: 'Analysing topic and building research plan...', timestamp: Date.now()
                })

                const orchResult = await runOrchestrator(state)
                state.researchPlan = orchResult.researchPlan
                send({ type: 'agent_status', ...orchResult.statusEntry })

                // ── 2. Searchers (parallel) ──────────────────────────────────────
                const subTopics = state.researchPlan.subTopics

                subTopics.forEach((st, i) => {
                    send({
                        type: 'agent_status', agent: `Searcher #${i + 1}`, status: 'working',
                        message: `Searching "${st.title}"...`, timestamp: Date.now()
                    })
                })

                const searcherResults = await Promise.all(
                    subTopics.map((st, i) => runSearcher(st, i))
                )
                state.searchResults = searcherResults.map((r) => r.searchResult)
                searcherResults.forEach((r) => send({ type: 'agent_status', ...r.statusEntry }))

                // ── 3. Synthesiser ───────────────────────────────────────────────
                send({
                    type: 'agent_status', agent: 'Synthesiser', status: 'working',
                    message: 'Merging findings from all research streams...', timestamp: Date.now()
                })

                const synthResult = await runSynthesiser(state)
                state.synthesisedFindings = synthResult.synthesisedFindings
                send({ type: 'agent_status', ...synthResult.statusEntry })

                // ── 4. Critic ────────────────────────────────────────────────────
                send({
                    type: 'agent_status', agent: 'Critic', status: 'working',
                    message: 'Reviewing research quality and completeness...', timestamp: Date.now()
                })

                const criticResult = await runCritic(state)
                state.criticReview = criticResult.criticReview
                send({ type: 'agent_status', ...criticResult.statusEntry })

                // ── 4b. Retry if critic not approved ────────────────────────────
                if (!state.criticReview.approved && state.retryCount < 1) {
                    state.retryCount++

                    send({
                        type: 'agent_status', agent: 'Orchestrator', status: 'working',
                        message: `Refining research plan to address gaps (retry ${state.retryCount})...`, timestamp: Date.now()
                    })

                    const orchRetry = await runOrchestrator(state)
                    state.researchPlan = orchRetry.researchPlan
                    send({ type: 'agent_status', ...orchRetry.statusEntry })

                    orchRetry.researchPlan.subTopics.forEach((st, i) => {
                        send({
                            type: 'agent_status', agent: `Searcher #${i + 1}`, status: 'working',
                            message: `Re-searching "${st.title}"...`, timestamp: Date.now()
                        })
                    })

                    const retrySearchResults = await Promise.all(
                        orchRetry.researchPlan.subTopics.map((st, i) => runSearcher(st, i))
                    )
                    state.searchResults = retrySearchResults.map((r) => r.searchResult)
                    retrySearchResults.forEach((r) => send({ type: 'agent_status', ...r.statusEntry }))

                    send({
                        type: 'agent_status', agent: 'Synthesiser', status: 'working',
                        message: 'Re-synthesising with improved findings...', timestamp: Date.now()
                    })

                    const reSynth = await runSynthesiser(state)
                    state.synthesisedFindings = reSynth.synthesisedFindings
                    send({ type: 'agent_status', ...reSynth.statusEntry })
                }

                // ── 5. Report Writer ─────────────────────────────────────────────
                send({
                    type: 'agent_status', agent: 'Report Writer', status: 'working',
                    message: 'Writing the final structured report...', timestamp: Date.now()
                })

                const reportResult = await runReportWriter(state)
                state.report = reportResult.report
                send({ type: 'agent_status', ...reportResult.statusEntry })

                send({ type: 'complete', report: state.report })

            } catch (err) {
                console.error('[Research Pipeline Error]', err)
                send({ type: 'error', message: err.message || 'An unexpected error occurred' })
            } finally {
                try { controller.close() } catch (_) { }
            }
        })()

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    })
}