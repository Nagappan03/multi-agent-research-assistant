import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    LevelFormat,
    BorderStyle,
    Header,
    Footer,
    PageNumber,
    ExternalHyperlink,
    PageBreak,
    TabStopType,
    TabStopPosition,
} from 'docx'

// ── DOCX Generation ───────────────────────────────────────────────────────────

export async function generateDocx(report) {
    const { title, executiveSummary, sections, keyTakeaways, conclusion, sources } = report

    const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    })

    const children = []

    // Title
    children.push(
        new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: title, bold: true })],
            spacing: { before: 0, after: 240 },
        }),
        new Paragraph({
            children: [new TextRun({ text: `Generated on ${today}`, color: '666666', size: 20, italics: true })],
            spacing: { after: 480 },
        })
    )

    // Executive Summary
    children.push(
        new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: 'Executive Summary', bold: true })],
            spacing: { before: 240, after: 120 },
        }),
        new Paragraph({
            children: [new TextRun({ text: executiveSummary, size: 22 })],
            spacing: { after: 360 },
        })
    )

    // Main sections
    for (const section of sections) {
        children.push(new Paragraph({ children: [new PageBreak()] }))
        children.push(
            new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: [new TextRun({ text: section.heading, bold: true })],
                spacing: { before: 240, after: 120 },
            })
        )
        const paragraphs = section.content.split('\n\n').filter(Boolean)
        for (const para of paragraphs) {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: para.trim(), size: 22 })],
                    spacing: { after: 200 },
                })
            )
        }
    }

    // Key Takeaways
    children.push(new Paragraph({ children: [new PageBreak()] }))
    children.push(
        new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: 'Key Takeaways', bold: true })],
            spacing: { before: 240, after: 120 },
        })
    )
    for (const takeaway of keyTakeaways) {
        children.push(
            new Paragraph({
                numbering: { reference: 'bullets', level: 0 },
                children: [new TextRun({ text: takeaway, size: 22 })],
                spacing: { after: 80 },
            })
        )
    }

    // Conclusion
    children.push(
        new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: 'Conclusion', bold: true })],
            spacing: { before: 360, after: 120 },
        })
    )
    for (const para of conclusion.split('\n\n').filter(Boolean)) {
        children.push(
            new Paragraph({
                children: [new TextRun({ text: para.trim(), size: 22 })],
                spacing: { after: 200 },
            })
        )
    }

    // Sources
    children.push(new Paragraph({ children: [new PageBreak()] }))
    children.push(
        new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: 'Sources', bold: true })],
            spacing: { before: 240, after: 120 },
        })
    )
    for (let i = 0; i < sources.length; i++) {
        children.push(
            new Paragraph({
                numbering: { reference: 'numbers', level: 0 },
                children: [
                    new ExternalHyperlink({
                        link: sources[i].url,
                        children: [new TextRun({ text: sources[i].title || sources[i].url, style: 'Hyperlink', size: 20 })],
                    }),
                ],
                spacing: { after: 80 },
            })
        )
    }

    const doc = new Document({
        numbering: {
            config: [
                {
                    reference: 'bullets',
                    levels: [{
                        level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
                        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
                    }],
                },
                {
                    reference: 'numbers',
                    levels: [{
                        level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
                        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
                    }],
                },
            ],
        },
        styles: {
            default: { document: { run: { font: 'Arial', size: 22 } } },
            paragraphStyles: [
                {
                    id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
                    run: { size: 40, bold: true, font: 'Arial', color: '1a1a2e' },
                    paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 },
                },
                {
                    id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
                    run: { size: 28, bold: true, font: 'Arial', color: '2563eb' },
                    paragraph: { spacing: { before: 180, after: 180 }, outlineLevel: 1 },
                },
            ],
        },
        sections: [{
            properties: {
                page: {
                    size: { width: 12240, height: 15840 },
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
                },
            },
            headers: {
                default: new Header({
                    children: [new Paragraph({
                        children: [
                            new TextRun({ text: title, color: '666666', size: 18 }),
                            new TextRun('\t'),
                            new TextRun({ children: ['Page ', PageNumber.CURRENT], color: '666666', size: 18 }),
                        ],
                        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD', space: 1 } },
                    })],
                }),
            },
            footers: {
                default: new Footer({
                    children: [new Paragraph({
                        children: [new TextRun({ text: `Research Assistant — ${today}`, color: '999999', size: 16 })],
                        border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD', space: 1 } },
                    })],
                }),
            },
            children,
        }],
    })

    return await Packer.toBuffer(doc)
}

// ── PDF Generation ────────────────────────────────────────────────────────────

export function generateMarkdown(report) {
    const { title, executiveSummary, sections, keyTakeaways, conclusion, sources } = report
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    let md = ''
    md += `# ${title}\n`
    md += `*Generated on ${today}*\n\n`
    md += `---\n\n`
    md += `## Executive Summary\n\n${executiveSummary}\n\n`

    for (const section of sections) {
        md += `---\n\n## ${section.heading}\n\n${section.content}\n\n`
    }

    md += `---\n\n## Key Takeaways\n\n`
    for (const t of keyTakeaways) {
        md += `- ${t}\n`
    }

    md += `\n---\n\n## Conclusion\n\n${conclusion}\n\n`
    md += `---\n\n## Sources\n\n`
    for (let i = 0; i < sources.length; i++) {
        md += `${i + 1}. [${sources[i].title || sources[i].url}](${sources[i].url})\n`
    }

    return Buffer.from(md, 'utf8')
}