import { StateGraph, END } from '@langchain/langgraph'
import { runOrchestrator } from '../agents/orchestrator.js'
import { runSearcher } from '../agents/searcher.js'
import { runSynthesiser } from '../agents/synthesiser.js'
import { runCritic } from '../agents/critic.js'
import { runReportWriter } from '../agents/reportWriter.js'

// ── State schema ──────────────────────────────────────────────────────────────
// Each key defines how updates are merged.
// (x, y) => y ?? x means: use new value if provided, otherwise keep existing
const graphState = {
    topic: { value: (x, y) => y ?? x, default: () => '' },
    researchPlan: { value: (x, y) => y ?? x, default: () => null },
    searchResults: { value: (x, y) => y ?? x, default: () => [] },
    synthesisedFindings: { value: (x, y) => y ?? x, default: () => '' },
    criticReview: { value: (x, y) => y ?? x, default: () => null },
    report: { value: (x, y) => y ?? x, default: () => null },
    retryCount: { value: (x, y) => y ?? x, default: () => 0 },
    error: { value: (x, y) => y ?? x, default: () => null },
}

// ── Node functions ────────────────────────────────────────────────────────────
// Each node receives full state, returns only the fields it wants to update

async function orchestratorNode(state) {
    const result = await runOrchestrator(state)
    return {
        researchPlan: result.researchPlan,
        // Increment retryCount only on retries so critic routing works correctly
        retryCount: state.retryCount,
    }
}

async function searcherNode(state) {
    const subTopics = state.researchPlan.subTopics

    // All searchers run in parallel
    const results = await Promise.all(
        subTopics.map((st, i) => runSearcher(st, i))
    )

    return {
        searchResults: results.map((r) => r.searchResult),
    }
}

async function synthesiserNode(state) {
    const result = await runSynthesiser(state)
    return {
        synthesisedFindings: result.synthesisedFindings,
    }
}

async function criticNode(state) {
    const result = await runCritic(state)
    return {
        criticReview: result.criticReview,
    }
}

async function reportWriterNode(state) {
    const result = await runReportWriter(state)
    return {
        report: result.report,
    }
}

// ── Conditional routing ───────────────────────────────────────────────────────
// This function decides where to go after the Critic runs
function routeAfterCritic(state) {
    const { criticReview, retryCount } = state
    if (criticReview.approved || retryCount >= 1) {
        return 'report_writer'
    }
    // Not approved and haven't retried yet — loop back with gap context
    return 'orchestrator'
}

// ── Build and export the graph ────────────────────────────────────────────────
export function buildResearchGraph() {
    const workflow = new StateGraph({ channels: graphState })

    // Register nodes
    workflow.addNode('orchestrator', orchestratorNode)
    workflow.addNode('searcher', searcherNode)
    workflow.addNode('synthesiser', synthesiserNode)
    workflow.addNode('critic', criticNode)
    workflow.addNode('report_writer', reportWriterNode)

    // Fixed edges
    workflow.setEntryPoint('orchestrator')
    workflow.addEdge('orchestrator', 'searcher')
    workflow.addEdge('searcher', 'synthesiser')
    workflow.addEdge('synthesiser', 'critic')
    workflow.addEdge('report_writer', END)

    // Conditional edge after critic
    workflow.addConditionalEdges('critic', routeAfterCritic, {
        report_writer: 'report_writer',
        orchestrator: 'orchestrator',
    })

    return workflow.compile()
}