import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function runSynthesiser(state) {
    const { topic, searchResults } = state

    const findingsText = searchResults
        .map(
            (r) =>
                `### ${r.subTopic}\n${r.keyFindings.map((f) => `- ${f}`).join('\n')}`
        )
        .join('\n\n')

    const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: `You are a research synthesiser. Merge findings from multiple research streams into a single coherent, deduplicated body of knowledge. Remove redundancies, note contradictions, and organise by theme. Write in clear prose paragraphs, not bullet points.`,
        messages: [
            {
                role: 'user',
                content: `Main topic: "${topic}"\n\nFindings from research streams:\n\n${findingsText}\n\nSynthesise into a cohesive body of knowledge (400-600 words). Cover all sub-topics and highlight connections between them.`,
            },
        ],
    })

    return {
        synthesisedFindings: response.content[0].text.trim(),
        statusEntry: {
            agent: 'Synthesiser',
            status: 'done',
            message: `Merged findings from ${searchResults.length} research streams`,
            timestamp: Date.now(),
        },
    }
}