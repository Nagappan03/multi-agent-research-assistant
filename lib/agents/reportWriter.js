import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function runReportWriter(state) {
    const { topic, synthesisedFindings, searchResults, criticReview } = state

    // Collect all unique sources across all searchers
    const allSources = []
    const seenUrls = new Set()
    for (const r of searchResults) {
        for (const s of r.sources) {
            if (!seenUrls.has(s.url)) {
                seenUrls.add(s.url)
                allSources.push(s)
            }
        }
    }

    const sourcesText = allSources
        .map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`)
        .join('\n')

    const subTopicsList = searchResults.map((r) => r.subTopic).join(', ')

    const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 8000,
        system: `You are an expert research report writer. Produce comprehensive, well-structured research reports that are professional, insightful, and actionable.

Output ONLY valid JSON in this exact structure:
{
  "title": "Research Report: [topic]",
  "executiveSummary": "3-4 sentence overview of key findings",
  "sections": [
    {
      "heading": "Section heading",
      "content": "Detailed prose content for this section (150-250 words)"
    }
  ],
  "keyTakeaways": ["takeaway 1", "takeaway 2", "takeaway 3", "takeaway 4", "takeaway 5"],
  "conclusion": "Strong 2-3 paragraph conclusion",
  "sources": [{"title": "...", "url": "..."}]
}

Rules:
- Produce exactly 4 sections covering distinct aspects of the topic
- Use formal authoritative prose — no bullet points within sections
- Output ONLY valid JSON, no preamble`,
        messages: [
            {
                role: 'user',
                content: `Topic: "${topic}"
Sub-topics covered: ${subTopicsList}
Critic score: ${criticReview.score}/10
Critic strengths: ${criticReview.strengths.join(', ')}

Synthesised findings:
${synthesisedFindings}

Available sources:
${sourcesText}

Write the research report.`,
            },
        ],
    })

    const text = response.content[0].text.trim()
    let clean = text.replace(/```json|```/g, '').trim()

    // If JSON is truncated, attempt to close it gracefully
    let parsed
    try {
        parsed = JSON.parse(clean)
    } catch (e) {
        // Truncated JSON — find the last complete field and close the object
        const lastComma = clean.lastIndexOf(',"')
        if (lastComma !== -1) {
            clean = clean.slice(0, lastComma) + '}'
        }
        try {
            parsed = JSON.parse(clean)
        } catch (e2) {
            throw new Error('Report Writer returned malformed JSON. Try a more focused topic.')
        }
    }

    if (!parsed.sources || parsed.sources.length === 0) {
        parsed.sources = allSources
    }

    return {
        report: parsed,
        statusEntry: {
            agent: 'Report Writer',
            status: 'done',
            message: `Report complete — ${parsed.sections.length} sections, ${parsed.sources.length} sources cited`,
            timestamp: Date.now(),
        },
    }
}