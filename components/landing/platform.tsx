'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Code2, FlaskConical, BookOpen, Zap, CheckCircle2, Circle } from 'lucide-react'

const tabs = [
  {
    id: 'engineering',
    label: 'Engineering',
    icon: Code2,
    tagline: 'From issue to deployed PR, autonomously.',
    description:
      'Vexlo reads your codebase, understands the context, writes code that passes your tests, opens PRs, and deploys — all without hand-holding.',
    steps: [
      'Analyze repository & understand patterns',
      'Plan implementation with Architect agent',
      'Write code following your conventions',
      'Run tests, fix failures automatically',
      'Open PR with detailed description',
    ],
    preview: <EngineeringPreview />,
  },
  {
    id: 'research',
    label: 'Research',
    icon: FlaskConical,
    tagline: 'Deep research, synthesized into decisions.',
    description:
      'The Research module autonomously searches the web, reads papers and docs, validates sources, and delivers structured reports with citations.',
    steps: [
      'Define research question & scope',
      'Search across 50+ sources in parallel',
      'Validate and cross-reference findings',
      'Extract key insights and decisions',
      'Generate structured report with citations',
    ],
    preview: <ResearchPreview />,
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    icon: BookOpen,
    tagline: 'Your codebase as a living knowledge base.',
    description:
      'Upload docs, connect repos, and Vexlo builds a searchable, always-current knowledge base with vector search and RAG.',
    steps: [
      'Connect repositories and documents',
      'Generate embeddings automatically',
      'Vector search across all sources',
      'RAG-powered contextual retrieval',
      'Always in sync with your codebase',
    ],
    preview: <KnowledgePreview />,
  },
  {
    id: 'automation',
    label: 'Automation',
    icon: Zap,
    tagline: 'Orchestrate agents across your entire stack.',
    description:
      'Design multi-agent workflows that run in parallel, hand off between agents, and recover from failures — all durable and resumable.',
    steps: [
      'Design workflow with visual editor',
      'Assign specialized agents to each step',
      'Run in parallel with coordination',
      'Auto-retry on failures',
      'Monitor and observe every run',
    ],
    preview: <AutomationPreview />,
  },
]

function EngineeringPreview() {
  return (
    <div className="h-full p-5 font-mono space-y-2 overflow-hidden">
      <div className="text-[10px] text-white/20 mb-4">terminal — vexlo agent</div>
      {[
        { t: '>', text: 'vexlo run "implement JWT auth"', c: 'text-white/60' },
        { t: '●', text: 'Reading 234 files...', c: 'text-blue-400' },
        { t: '●', text: 'Architect: Planning 8 file changes', c: 'text-violet-400' },
        { t: '●', text: 'Coder: Writing auth/middleware.ts', c: 'text-emerald-400' },
        { t: '✓', text: 'Tests: 47/47 passing', c: 'text-emerald-400' },
        { t: '✓', text: 'PR #142 opened → github.com/...', c: 'text-white/40' },
      ].map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.12, duration: 0.3 }}
          className={`text-xs flex gap-2 ${line.c}`}
        >
          <span className="w-3 flex-shrink-0 text-center opacity-60">{line.t}</span>
          <span>{line.text}</span>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-4 flex items-center gap-2"
      >
        <span className="text-xs text-white/20">$</span>
        <span className="text-xs text-white/30">_</span>
        <span className="inline-block w-1.5 h-3.5 bg-white/40 animate-pulse" />
      </motion.div>
    </div>
  )
}

function ResearchPreview() {
  const sources = [
    { title: 'Next.js 16 App Router Patterns', domain: 'nextjs.org', rel: 98 },
    { title: 'React Server Components Guide', domain: 'react.dev', rel: 95 },
    { title: 'Vercel Edge Runtime Docs', domain: 'vercel.com', rel: 91 },
  ]
  return (
    <div className="h-full p-5 space-y-3 overflow-hidden">
      <div className="text-xs text-white/20 mb-4">Deep Research — 47 sources analyzed</div>
      {sources.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15, duration: 0.4 }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="text-xs text-white/60 leading-snug flex-1">{s.title}</div>
            <div className="text-[10px] text-emerald-400 font-medium flex-shrink-0">{s.rel}%</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-white/20">{s.domain}</div>
            <div className="h-1 w-24 bg-white/[0.05] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${s.rel}%` }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-emerald-400/60 rounded-full"
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function KnowledgePreview() {
  return (
    <div className="h-full p-5 overflow-hidden">
      <div className="text-xs text-white/20 mb-4">Knowledge Base — 1,240 documents</div>
      <div className="space-y-2">
        {[
          { q: 'How does auth middleware work?', a: 'Based on your codebase: JWT tokens are verified in `/middleware.ts` using `jose`...', tags: ['auth', 'jwt'] },
          { q: 'What is the deployment process?', a: 'Found in `DEPLOY.md`: Push to `main` triggers Vercel deployment automatically...', tags: ['deploy', 'ci'] },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2, duration: 0.4 }}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3"
          >
            <div className="text-xs text-blue-400 mb-1.5">{item.q}</div>
            <div className="text-[11px] text-white/40 leading-relaxed mb-2">{item.a}</div>
            <div className="flex gap-1">
              {item.tags.map((t) => (
                <span key={t} className="text-[9px] px-2 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded-full text-white/30">
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function AutomationPreview() {
  const nodes = ['Planner', 'Researcher', 'Coder', 'Tester', 'DevOps']
  return (
    <div className="h-full p-5 flex flex-col justify-center overflow-hidden">
      <div className="text-xs text-white/20 mb-6">Workflow orchestration</div>
      <div className="flex items-center gap-0">
        {nodes.map((node, i) => (
          <div key={node} className="flex items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`flex flex-col items-center gap-1.5 px-2`}
            >
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center text-[10px] font-medium ${
                  i < 3
                    ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                    : i === 3
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-white/[0.04] border-white/[0.08] text-white/30'
                }`}
              >
                {i < 3 ? (
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-current"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                  />
                ) : i === 3 ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </div>
              <span className="text-[9px] text-white/30">{node}</span>
            </motion.div>
            {i < nodes.length - 1 && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.3 + i * 0.12, duration: 0.4 }}
                className={`h-px w-5 ${i < 3 ? 'bg-blue-500/40' : 'bg-white/[0.06]'}`}
                style={{ transformOrigin: 'left' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function PlatformSection() {
  const [active, setActive] = useState('engineering')
  const current = tabs.find((t) => t.id === active)!
  const Icon = current.icon

  return (
    <section id="platform" className="py-32 bg-[#050508]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 max-w-2xl"
        >
          <p className="text-sm text-blue-400 uppercase tracking-widest mb-4">The Platform</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight text-balance mb-4">
            Everything you need.<br />Nothing you don&apos;t.
          </h2>
          <p className="text-lg text-white/40 leading-relaxed">
            Four integrated modules working together as a unified AI operating system for your engineering organization.
          </p>
        </motion.div>

        {/* Tab pills */}
        <div className="flex gap-2 mb-10 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const TabIcon = tab.icon
            const isActive = tab.id === active
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex-shrink-0 ${
                  isActive
                    ? 'bg-white text-black'
                    : 'bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.06]'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="grid lg:grid-cols-2 gap-px bg-white/[0.04] rounded-2xl overflow-hidden">
          {/* Info pane */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active + '-info'}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#050508] p-10 flex flex-col justify-center"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                <Icon className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-blue-400/80 text-sm mb-3">{current.tagline}</p>
              <p className="text-white/50 text-base leading-relaxed mb-8">{current.description}</p>
              <div className="space-y-3">
                {current.steps.map((step, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.3 }}
                    className="flex items-center gap-3 text-sm text-white/50"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500/60 flex-shrink-0" />
                    {step}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Preview pane */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active + '-preview'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-[#0a0a0e] min-h-[380px] relative overflow-hidden"
            >
              {/* Window chrome */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.05]">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                <span className="ml-2 text-[11px] text-white/20">{current.label}</span>
              </div>
              {current.preview}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
