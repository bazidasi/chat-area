import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import 'katex/dist/katex.min.css'
import { Check, Copy, Maximize2 } from 'lucide-react'
import mermaid from 'mermaid'
import { memo, useEffect, useId, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

let mermaidInitialized = false

function ensureMermaidInit(isDark: boolean) {
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    securityLevel: 'strict',
  })
  mermaidInitialized = true
}

function MermaidDiagram({ code }: { code: string }) {
  const uid = useId().replace(/:/g, '_')
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    if (!mermaidInitialized || true) {
      ensureMermaidInit(isDark)
    }
    mermaid
      .render(`mermaid_${uid}`, code)
      .then((res) => {
        if (!cancelled) {
          setSvg(res.svg)
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Mermaid render error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [code, uid])

  if (error || !svg) {
    return (
      <pre className="my-3 overflow-x-auto rounded-xl bg-zinc-900 p-4 text-xs text-zinc-100">
        <code>{code}</code>
      </pre>
    )
  }

  return (
    <div
      className="my-3 flex justify-center overflow-x-auto rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(true)

  if (language === 'mermaid') {
    return <MermaidDiagram code={code} />
  }

  let highlighted = ''
  try {
    if (language && hljs.getLanguage(language)) {
      highlighted = hljs.highlight(code, { language }).value
    } else {
      highlighted = hljs.highlightAuto(code).value
    }
  } catch {
    highlighted = ''
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-black/10 bg-[#1e1f24] text-zinc-100 shadow-sm dark:border-white/10">
      <div className="flex items-center justify-between border-b border-white/10 bg-black/25 px-3.5 py-2 text-xs text-zinc-400">
        <span className="font-mono uppercase tracking-wider">{language || 'text'}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded px-1.5 py-0.5 text-[11px] hover:bg-white/10 hover:text-zinc-200"
          >
            {expanded ? <Maximize2 className="inline h-3 w-3" /> : 'Expand'}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] hover:bg-white/10 hover:text-zinc-100"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
      {expanded && (
        <pre className="m-0 overflow-x-auto p-3.5 text-[13px] leading-relaxed">
          {highlighted ? (
            <code className="hljs bg-transparent p-0" dangerouslySetInnerHTML={{ __html: highlighted }} />
          ) : (
            <code>{code}</code>
          )}
        </pre>
      )}
    </div>
  )
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-([\w-]+)/.exec(className || '')
            const raw = String(children).replace(/\n$/, '')
            const isBlock = Boolean(match) || raw.includes('\n')
            if (isBlock) {
              return <CodeBlock language={match?.[1] || ''} code={raw} />
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
          a({ href, children, ...props }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})
