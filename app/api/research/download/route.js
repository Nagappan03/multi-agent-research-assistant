import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateDocx, generateMarkdown } from '@/lib/report/generateReport'

export const runtime = 'nodejs'

export async function POST(req) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    try {
        const { report, format } = await req.json()

        if (!report) {
            return new Response(JSON.stringify({ error: 'Report data is required' }), { status: 400 })
        }

        if (!['docx', 'md'].includes(format)) {
            return new Response(JSON.stringify({ error: 'Format must be docx or md' }), { status: 400 })
        }

        const safeTitle = (report.title || 'research-report')
            .replace(/[^a-zA-Z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase()
            .slice(0, 60)

        if (format === 'docx') {
            const buffer = await generateDocx(report)
            return new Response(buffer, {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'Content-Disposition': `attachment; filename="${safeTitle}.docx"`,
                },
            })
        }

        if (format === 'md') {
            const buffer = generateMarkdown(report)
            return new Response(buffer, {
                headers: {
                    'Content-Type': 'text/markdown',
                    'Content-Disposition': `attachment; filename="${safeTitle}.md"`,
                },
            })
        }
    } catch (err) {
        console.error('[Download]', err)
        return new Response(
            JSON.stringify({ error: 'Failed to generate file: ' + err.message }),
            { status: 500 }
        )
    }
}