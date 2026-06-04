import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function runCritic(state) {
    const { topic, synthesisedFindings, searchResults } = state

    const sourceCount = searchResults.reduce((acc, r) => acc + r.sources.length, 0)

    const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: `You are a research quality critic. Evaluate research findings on a 0-10 scale based on:
- Coverage: Are all important aspects of the topic covered?
- Depth: Is there sufficient detail and nuance?
- Balance: Are multiple perspectives represented?
- Coherence: Are findings well-organised and connected?

Output ONLY valid JSON:
{
  "score": 8,
  "strengths": ["strength 1", "strength 2"],
  "gaps": ["gap 1", "gap 2"],
  "approved": true,
  "reviewSummary": "One paragraph summary of the review"
}

approved must be true if score >= 7, false otherwise.`,
        messages: [
            {
                role: 'user',
                content: `Research topic: "${topic}"\nSources consulted: ${sourceCount}\n\nSynthesised findings:\n${synthesisedFindings}\n\nProvide your quality review.`,
            },
        ],
    })

    const text = response.content[0].text.trim()
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return {
        criticReview: {
            score: parsed.score,
            strengths: parsed.strengths,
            gaps: parsed.gaps,
            approved: parsed.approved,
            reviewSummary: parsed.reviewSummary,
        },
        statusEntry: {
            agent: 'Critic',
            status: 'done',
            message: parsed.approved
                ? `Score: ${parsed.score}/10 — Approved for report writing`
                : `Score: ${parsed.score}/10 — Gaps found, requesting deeper research`,
            timestamp: Date.now(),
        },
    }
}