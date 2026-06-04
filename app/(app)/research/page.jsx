'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// ── Agent metadata ─────────────────────────────────────────────────────────────
// Maps agent names to display properties used in the status timeline
const AGENT_META = {
  'Orchestrator':   { emoji: '🧠', color: 'text-purple-400' },
  'Searcher #1':    { emoji: '🔍', color: 'text-blue-400' },
  'Searcher #2':    { emoji: '🔍', color: 'text-blue-400' },
  'Searcher #3':    { emoji: '🔍', color: 'text-blue-400' },
  'Searcher #4':    { emoji: '🔍', color: 'text-blue-400' },
  'Synthesiser':    { emoji: '🔗', color: 'text-yellow-400' },
  'Critic':         { emoji: '🎯', color: 'text-orange-400' },
  'Report Writer':  { emoji: '✍️',  color: 'text-green-400' },
  'System':         { emoji: '✅', color: 'text-green-400' },
}

function getAgentMeta(name) {
  return AGENT_META[name] || { emoji: '⚙️', color: 'text-gray-400' }
}

// ── StatusItem component ───────────────────────────────────────────────────────
function StatusItem({ entry }) {
  const meta = getAgentMeta(entry.agent)
  const isWorking = entry.status === 'working'

  return (
    <div className="flex items-start gap-3 fade-in-up">
      <div className="flex flex-col items-center shrink-0 mt-1">
        <div className={`w-2 h-2 rounded-full ${
          isWorking ? 'bg-blue-500 pulse-dot' : 'bg-green-500'
        }`} />
      </div>
      <div className="flex-1 min-w-0 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base">{meta.emoji}</span>
          <span className={`text-xs font-semibold uppercase tracking-wider ${meta.color}`}>
            {entry.agent}
          </span>
          {isWorking && (
            <span className="text-xs text-gray-500 italic">working...</span>
          )}
        </div>
        <p className="text-sm text-gray-300 mt-0.5 leading-relaxed">{entry.message}</p>
      </div>
    </div>
  )
}

// ── ReportView component ───────────────────────────────────────────────────────
function ReportView({ report, onDownload, downloading }) {
  const [activeSection, setActiveSection] = useState(null)

  return (
    <div className="fade-in-up space-y-4">

      {/* Header card with title + download buttons */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 bg-blue-600/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
              Research Report
            </span>
            <h2 className="text-xl font-bold text-white mt-2 leading-tight">{report.title}</h2>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => onDownload('docx')}
              disabled={!!downloading}
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>📄</span>
              {downloading === 'docx' ? 'Generating...' : 'Download .docx'}
            </button>
            <button
              onClick={() => onDownload('md')}
              disabled={!!downloading}
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>📝</span>
              {downloading === 'md' ? 'Generating...' : 'Download .md'}
            </button>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Executive Summary
        </h3>
        <p className="text-gray-200 text-sm leading-relaxed">{report.executiveSummary}</p>
      </div>

      {/* Collapsible sections */}
      <div className="space-y-2">
        {report.sections?.map((section, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setActiveSection(activeSection === i ? null : i)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-blue-400 bg-blue-600/10 border border-blue-500/20 rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm font-semibold text-white">{section.heading}</span>
              </div>
              <span
                className="text-gray-500 text-sm transition-transform duration-200"
                style={{ transform: activeSection === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                ▾
              </span>
            </button>
            {activeSection === i && (
              <div className="px-5 pb-5 border-t border-gray-800">
                <div className="pt-4 space-y-3">
                  {section.content.split('\n\n').filter(Boolean).map((para, pi) => (
                    <p key={pi} className="text-gray-300 text-sm leading-relaxed">{para.trim()}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Key Takeaways */}
      {report.keyTakeaways?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Key Takeaways
          </h3>
          <ul className="space-y-2">
            {report.keyTakeaways.map((t, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                <span className="text-blue-400 mt-0.5 shrink-0">→</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Conclusion */}
      {report.conclusion && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Conclusion
          </h3>
          <div className="space-y-3">
            {report.conclusion.split('\n\n').filter(Boolean).map((para, i) => (
              <p key={i} className="text-gray-300 text-sm leading-relaxed">{para.trim()}</p>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {report.sources?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Sources ({report.sources.length})
          </h3>
          <ol className="space-y-2">
            {report.sources.map((src, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-gray-600 shrink-0 w-5 text-right">{i + 1}.</span>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors leading-relaxed break-all"
                >
                  {src.title || src.url}
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ResearchPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [topic, setTopic] = useState('')
  const [running, setRunning] = useState(false)
  const [statusLog, setStatusLog] = useState([])
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(null)

  const statusEndRef = useRef(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  // Auto-scroll the status log as new entries arrive
  useEffect(() => {
    statusEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [statusLog])

  const handleReset = () => {
    setTopic('')
    setStatusLog([])
    setReport(null)
    setError('')
    setRunning(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!topic.trim() || running) return

    setRunning(true)
    setStatusLog([])
    setReport(null)
    setError('')

    try {
      const response = await fetch('/api/research/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to start research')
        setRunning(false)
        return
      }

      // Read the SSE stream manually using a ReadableStream reader
      // We do this instead of EventSource because EventSource only supports GET requests
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // keep any incomplete line for next chunk

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue

          try {
            const event = JSON.parse(jsonStr)

            if (event.type === 'agent_status') {
              const { type, ...entry } = event
              setStatusLog((prev) => [...prev, entry])
            } else if (event.type === 'complete') {
              setReport(event.report)
              setRunning(false)
              setStatusLog((prev) => [...prev, {
                agent: 'System',
                status: 'done',
                message: 'Research complete — report is ready below',
                timestamp: Date.now(),
              }])
            } else if (event.type === 'error') {
              setError(event.message)
              setRunning(false)
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      setError('Connection error: ' + err.message)
      setRunning(false)
    }
  }

  const handleDownload = async (format) => {
    if (!report) return
    setDownloading(format)

    try {
      const res = await fetch('/api/research/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, format }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Download failed')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.title?.slice(0, 50) || 'report'}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('Download failed: ' + err.message)
    } finally {
      setDownloading(null)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-4 md:px-6 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            R
          </div>
          <div>
            <span className="text-sm font-semibold text-white block leading-tight">Research Assistant</span>
            <span className="text-xs text-gray-500 hidden sm:block">Multi-Agent AI</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 hidden sm:block">
            {session?.user?.name || session?.user?.email}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Page content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-6 md:py-10">

        {/* ── State 1: Idle — input form ── */}
        {!running && !report && (
          <div className="fade-in-up">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Multi-Agent Research
              </h1>
              <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                Enter any topic and watch 5 specialised AI agents collaborate to produce a structured research report.
              </p>
            </div>

            {/* Agent pipeline visual */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-6 mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4 text-center">
                Agent Pipeline
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {[
                  { emoji: '🧠', label: 'Orchestrator', color: 'text-purple-400' },
                  { emoji: '→', label: '', color: 'text-gray-600' },
                  { emoji: '🔍', label: 'Searchers', color: 'text-blue-400' },
                  { emoji: '→', label: '', color: 'text-gray-600' },
                  { emoji: '🔗', label: 'Synthesiser', color: 'text-yellow-400' },
                  { emoji: '→', label: '', color: 'text-gray-600' },
                  { emoji: '🎯', label: 'Critic', color: 'text-orange-400' },
                  { emoji: '→', label: '', color: 'text-gray-600' },
                  { emoji: '✍️', label: 'Writer', color: 'text-green-400' },
                ].map((item, i) =>
                  item.label ? (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="text-xl">{item.emoji}</span>
                      <span className={`text-xs font-medium hidden sm:block ${item.color}`}>
                        {item.label}
                      </span>
                    </div>
                  ) : (
                    <span key={i} className={`text-lg mb-4 ${item.color}`}>{item.emoji}</span>
                  )
                )}
              </div>
            </div>

            {/* Input form */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Research topic
              </label>
              <form onSubmit={handleSubmit}>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. The impact of artificial intelligence on healthcare diagnostics"
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-500 resize-none mb-4"
                />

                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="submit"
                    disabled={!topic.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg px-6 py-2.5 text-sm transition-colors"
                  >
                    Start Research →
                  </button>
                  <p className="text-xs text-gray-500">Typically takes 1–3 minutes</p>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── State 2: Running — live agent timeline ── */}
        {running && (
          <div className="fade-in-up">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-semibold text-white">Research in progress</h2>
                <p className="text-sm text-gray-400 truncate max-w-md">{topic}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 pulse-dot" />
                <span className="text-xs text-gray-400">Agents working...</span>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 md:p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
                Agent Activity
              </p>
              <div className="space-y-1 border-l border-gray-800 pl-4">
                {statusLog.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-2 h-2 rounded-full bg-blue-500 pulse-dot" />
                    Initialising agents...
                  </div>
                )}
                {statusLog.map((entry, i) => (
                  <StatusItem key={i} entry={entry} />
                ))}
                <div ref={statusEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* ── State 3: Complete — report view ── */}
        {!running && report && (
          <div>
            {/* Collapsed activity log */}
            <details className="mb-6">
              <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-300 transition-colors select-none">
                View agent activity log ({statusLog.length} events)
              </summary>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mt-2">
                <div className="space-y-1 border-l border-gray-800 pl-4">
                  {statusLog.map((entry, i) => (
                    <StatusItem key={i} entry={entry} />
                  ))}
                </div>
              </div>
            </details>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <ReportView report={report} onDownload={handleDownload} downloading={downloading} />

            <div className="mt-6 text-center">
              <button
                onClick={handleReset}
                className="border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
              >
                ← New Research
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}