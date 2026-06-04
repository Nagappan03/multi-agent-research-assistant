import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function runOrchestrator(state) {
  const { topic, retryCount, criticReview } = state

  const isRetry = retryCount > 0
  const gapContext =
    isRetry && criticReview?.gaps?.length
      ? `\n\nPrevious research scored ${criticReview.score}/10. Gaps identified:\n${criticReview.gaps.map((g) => `- ${g}`).join('\n')}\n\nAdjust the plan to address these gaps.`
      : ''

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: `You are an expert research orchestrator. Break a research topic into 2-4 focused sub-topics that together produce a comprehensive report.

For each sub-topic provide 1-2 precise search queries.
Output ONLY valid JSON, no explanation:
{
  "researchPlan": {
    "subTopics": [
      {
        "title": "Sub-topic title",
        "description": "What to research here",
        "queries": ["search query 1", "search query 2"]
      }
    ]
  }
}`,
    messages: [
      {
        role: 'user',
        content: `Research topic: "${topic}"${gapContext}\n\nProduce the research plan.`,
      },
    ],
  })

  const text = response.content[0].text.trim()
  const clean = text.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)

  return {
    researchPlan: parsed.researchPlan,
    statusEntry: {
      agent: 'Orchestrator',
      status: 'done',
      message: `Research plan ready — ${parsed.researchPlan.subTopics.length} sub-topics identified`,
      timestamp: Date.now(),
    },
  }
}