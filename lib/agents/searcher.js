import Anthropic from '@anthropic-ai/sdk'
import { tavilySearch } from '../tools/tavilySearch.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function runSearcher(subTopic, index) {
    const { title, description, queries } = subTopic

    // Run all queries for this sub-topic in parallel
    const searchPromises = queries.map((q) => tavilySearch(q, 5))
    const searchResults = await Promise.all(searchPromises)

    // Flatten and deduplicate by URL
    const seen = new Set()
    const allResults = []
    for (const result of searchResults) {
        for (const r of result.results) {
            if (!seen.has(r.url)) {
                seen.add(r.url)
                allResults.push(r)
            }
        }
    }

    const rawContent = allResults
        .map((r) => `Source: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`)
        .join('\n\n---\n\n')

    // Use Haiku to extract structured findings from raw search results
    const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: `You are a research analyst. Extract key findings from web search results for a specific sub-topic.

Output ONLY valid JSON:
{
  "keyFindings": ["finding 1", "finding 2"],
  "sources": [{"title": "...", "url": "..."}]
}`,
        messages: [
            {
                role: 'user',
                content: `Sub-topic: ${title}\nDescription: ${description}\n\nSearch results:\n${rawContent}\n\nExtract 4-6 key findings with their sources.`,
            },
        ],
    })

    const text = response.content[0].text.trim()
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return {
        searchResult: {
            subTopic: title,
            keyFindings: parsed.keyFindings,
            sources: parsed.sources,
        },
        statusEntry: {
            agent: `Searcher #${index + 1}`,
            status: 'done',
            message: `"${title}" — ${parsed.keyFindings.length} findings from ${parsed.sources.length} sources`,
            timestamp: Date.now(),
        },
    }
}