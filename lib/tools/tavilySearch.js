import { tavily } from '@tavily/core'

let client = null

function getClient() {
    if (!client) {
        client = tavily({ apiKey: process.env.TAVILY_API_KEY })
    }
    return client
}

export async function tavilySearch(query, maxResults = 5) {
    try {
        const response = await getClient().search(query, {
            maxResults,
            searchDepth: 'basic',
            includeAnswer: true,
            includeRawContent: false,
        })

        return {
            results: response.results.map((r) => ({
                title: r.title,
                url: r.url,
                content: r.content,
                score: r.score,
            })),
            answer: response.answer || '',
        }
    } catch (error) {
        console.error('[Tavily] Search error:', error)
        throw new Error(`Tavily search failed: ${error.message}`)
    }
}