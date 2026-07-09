'use client'

import { motion } from 'framer-motion'
import { Search, Globe, BookOpen, Quote, GitBranch, Code2, Rocket, Database, Cpu, CheckCircle2 } from 'lucide-react'

/* ─── Research Feature ─── */
function ResearchUI() {
  const sources = [
    { title: 'MDN Web Docs — Fetch API', domain: 'developer.mozilla.org', date: '2024' },
    { title: 'RFC 9110: HTTP Semantics', domain: 'rfc-editor.org', date: '2022' },
    { title: 'Google Web Fundamentals', domain: 'web.dev', date: '2024' },
  ]
  return (
    <div className="bg-[#0a0a0e] rounded-2xl border border-white/[0.06] overflow-hidden h-full">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.05]">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
        <span className="ml-2 text-[11px] text-white/20">Research Session</span>
      </div>
      <div className="p-5 space-y-4">
        {/* Query */}
        <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5">
          <Search className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span className="text-sm text-white/50">Best practices for HTTP caching in Next.js apps</span>
        </div>
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-white/30">
            <span>Searching 47 sources...</span>
            <span className="text-emerald-400">94% relevant</span>
          </div>
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: '94%' }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
              className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
            />
          </div>
        </div>
        {/* Sources */}
        <div className="space-y-2">
          {sources.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.3 }}
              className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.04] rounded-xl p-3"
            >
              <Globe className="w-3 h-3 text-blue-400/60 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-white/60 truncate mb-0.5">{s.title}</div>
                <div className="text-[10px] text-white/20">{s.domain} · {s.date}</div>
              </div>
              <CheckCircle2 className="w-3 h-3 text-emerald-400/70 flex-shrink-0 mt-0.5" />
            </motion.div>
          ))}
        </div>
        {/* Citation */}
        <div className="bg-violet-500/5 border border-violet-500/15 rounded-xl p-3">
          <Quote className="w-3 h-3 text-violet-400/60 mb-2" />
          <div className="text-[11px] text-white/40 leading-relaxed italic">
            &ldquo;Use `Cache-Control: stale-while-revalidate` combined with Next.js `revalidate` for optimal performance...&rdquo;
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Engineering Feature ─── */
function EngineeringUI() {
  return (
    <div className="bg-[#0a0a0e] rounded-2xl border border-white/[0.06] overflow-hidden h-full">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.05]">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
        <span className="ml-2 text-[11px] text-white/20">Repository Intelligence</span>
      </div>
      <div className="p-5 space-y-4">
        {/* Repo stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Files analyzed', value: '1,247' },
            { label: 'Functions indexed', value: '8,432' },
            { label: 'PRs merged', value: '47' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-white/80">{stat.value}</div>
              <div className="text-[10px] text-white/25">{stat.label}</div>
            </div>
          ))}
        </div>
        {/* PR item */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-white/60">PR #142 · feat/auth-middleware</span>
            <span className="ml-auto text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">Ready</span>
          </div>
          <div className="flex gap-4 text-[11px] text-white/30">
            <span className="text-emerald-400">+284</span>
            <span className="text-red-400">-12</span>
            <span>8 files changed</span>
          </div>
          <div className="flex gap-2">
            {['✓ CI passing', '✓ Tests 47/47', '✓ No conflicts'].map((b) => (
              <span key={b} className="text-[9px] text-white/30 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
                {b}
              </span>
            ))}
          </div>
        </div>
        {/* Code snippet */}
        <div className="bg-[#050508] rounded-xl p-4 font-mono overflow-hidden">
          <div className="text-[10px] text-white/20 mb-2">src/middleware.ts</div>
          {[
            { c: 'text-blue-400/70', t: 'export const config = {' },
            { c: 'text-white/30', t: '  matcher: ["/api/:path*"],' },
            { c: 'text-white/30', t: '}' },
          ].map((l, i) => (
            <div key={i} className={`text-[11px] leading-5 ${l.c}`}>{l.t}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Knowledge Feature ─── */
function KnowledgeUI() {
  return (
    <div className="bg-[#0a0a0e] rounded-2xl border border-white/[0.06] overflow-hidden h-full">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.05]">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
        <span className="ml-2 text-[11px] text-white/20">Knowledge Base</span>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5">
          <Search className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
          <span className="text-sm text-white/50">How does our rate limiting work?</span>
        </div>
        <div className="bg-violet-500/5 border border-violet-500/15 rounded-xl p-4">
          <div className="text-xs text-violet-400/80 mb-2">Answer — from your codebase</div>
          <div className="text-[12px] text-white/50 leading-relaxed mb-3">
            Rate limiting is implemented in <code className="text-emerald-400/80 bg-emerald-400/5 px-1 rounded">lib/rate-limit.ts</code> using a sliding window algorithm with Redis. Limits are applied per user IP and authenticated user ID.
          </div>
          <div className="flex gap-1 flex-wrap">
            {['lib/rate-limit.ts', 'middleware.ts', 'api/auth'].map((ref) => (
              <span key={ref} className="text-[10px] text-blue-400/60 bg-blue-400/5 border border-blue-400/15 px-2 py-0.5 rounded-full">
                {ref}
              </span>
            ))}
          </div>
        </div>
        {/* Embedding viz */}
        <div className="space-y-2">
          <div className="text-[11px] text-white/20">Vector embeddings — 4,230 chunks</div>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: Math.random() * 0.6 + 0.1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                className="w-3 h-3 rounded-sm bg-violet-400/40"
                style={{ opacity: Math.random() * 0.5 + 0.1 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Model Router Feature ─── */
function ModelRouterUI() {
  const models = [
    { name: 'Claude 3.5 Sonnet', provider: 'Anthropic', badge: 'Active', color: 'text-orange-400', bg: 'bg-orange-400/10', badgeColor: 'text-emerald-400 bg-emerald-400/10' },
    { name: 'GPT-4o', provider: 'OpenAI', badge: 'Fallback', color: 'text-green-400', bg: 'bg-green-400/10', badgeColor: 'text-blue-400 bg-blue-400/10' },
    { name: 'Gemini 1.5 Pro', provider: 'Google', badge: 'Research', color: 'text-blue-400', bg: 'bg-blue-400/10', badgeColor: 'text-violet-400 bg-violet-400/10' },
    { name: 'o3-mini', provider: 'OpenAI', badge: 'Reasoning', color: 'text-cyan-400', bg: 'bg-cyan-400/10', badgeColor: 'text-cyan-400 bg-cyan-400/10' },
  ]
  return (
    <div className="bg-[#0a0a0e] rounded-2xl border border-white/[0.06] overflow-hidden h-full">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.05]">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
        <span className="ml-2 text-[11px] text-white/20">Model Router</span>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] text-white/30">Routing request to optimal model...</span>
        </div>
        {models.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.35 }}
            className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 py-3"
          >
            <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center flex-shrink-0`}>
              <Cpu className={`w-4 h-4 ${m.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/70 font-medium truncate">{m.name}</div>
              <div className="text-[10px] text-white/25">{m.provider}</div>
            </div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${m.badgeColor}`}>
              {m.badge}
            </span>
          </motion.div>
        ))}
        {/* Route viz */}
        <div className="mt-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-blue-500/40 to-transparent" />
          <span className="text-[10px] text-white/20">Automatic routing based on task type</span>
          <div className="h-px flex-1 bg-gradient-to-l from-blue-500/40 to-transparent" />
        </div>
      </div>
    </div>
  )
}

/* ─── Feature Row ─── */
interface FeatureRowProps {
  eyebrow: string
  title: string
  description: string
  bullets: string[]
  ui: React.ReactNode
  reversed?: boolean
  id?: string
}

function FeatureRow({ eyebrow, title, description, bullets, ui, reversed = false, id }: FeatureRowProps) {
  return (
    <div id={id} className="py-24 border-t border-white/[0.04]">
      <div className={`max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center ${reversed ? 'lg:flex lg:flex-row-reverse' : ''}`}>
        <motion.div
          initial={{ opacity: 0, x: reversed ? 24 : -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col"
        >
          <p className="text-sm text-blue-400 uppercase tracking-widest mb-4">{eyebrow}</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight text-balance mb-4">{title}</h2>
          <p className="text-base text-white/40 leading-relaxed mb-8">{description}</p>
          <div className="space-y-3">
            {bullets.map((b, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-white/50">
                <CheckCircle2 className="w-4 h-4 text-blue-400/70 flex-shrink-0" />
                {b}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: reversed ? -24 : 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          {ui}
        </motion.div>
      </div>
    </div>
  )
}

export function FeatureSections() {
  return (
    <section className="bg-[#050508]">
      <FeatureRow
        id="research"
        eyebrow="Deep Research"
        title="Research that rivals a PhD team."
        description="Vexlo's Research module autonomously searches the web, validates sources, synthesizes findings, and generates structured reports with full citations."
        bullets={[
          'Parallel web search across 50+ sources',
          'Source validation and cross-referencing',
          'Reasoning chains with confidence scores',
          'Structured reports with citations',
          'Follow-up questions and report refinement',
        ]}
        ui={<ResearchUI />}
      />

      <FeatureRow
        id="engineering"
        eyebrow="Repository Intelligence"
        title="Understands your codebase completely."
        description="Vexlo reads every file, understands your architecture, follows your patterns, and opens production-ready PRs that get merged the first time."
        bullets={[
          'Full repository analysis and indexing',
          'Follows your existing code conventions',
          'Writes tests alongside implementation',
          'Automatic PR creation and description',
          'Deployment pipeline integration',
        ]}
        ui={<EngineeringUI />}
        reversed
      />

      <FeatureRow
        id="knowledge"
        eyebrow="Knowledge Base"
        title="Your entire codebase, instantly searchable."
        description="Connect repos and documents and Vexlo builds a living knowledge base with vector search and RAG that always reflects the current state of your code."
        bullets={[
          'Connect GitHub repositories and docs',
          'Automatic embedding generation',
          'Semantic vector search',
          'RAG-powered contextual answers',
          'Always in sync with latest commits',
        ]}
        ui={<KnowledgeUI />}
      />

      <FeatureRow
        eyebrow="Multi-Model AI"
        title="The right model for every task."
        description="Vexlo automatically routes tasks to the best AI model — Claude for coding, Gemini for research, o3-mini for reasoning. You get the best of every provider."
        bullets={[
          'Automatic model selection by task type',
          'Claude, GPT-4o, Gemini, o3, and more',
          'Cost optimization across providers',
          'Fallback routing on rate limits',
          'Bring your own API keys',
        ]}
        ui={<ModelRouterUI />}
        reversed
      />
    </section>
  )
}
