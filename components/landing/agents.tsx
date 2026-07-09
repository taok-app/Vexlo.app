'use client'

import { motion } from 'framer-motion'
import { Lightbulb, Search, LayoutTemplate, Eye, Code2, TestTube, Server } from 'lucide-react'

const agents = [
  {
    id: 'planner',
    name: 'Planner',
    role: 'Strategic planning',
    description: 'Breaks complex tasks into actionable subtasks. Understands intent, defines scope, coordinates handoffs.',
    icon: Lightbulb,
    color: 'text-amber-400',
    glow: 'from-amber-500/15 to-amber-500/5',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400',
    connections: [1, 2],
  },
  {
    id: 'researcher',
    name: 'Researcher',
    role: 'Deep research',
    description: 'Searches the web, reads docs and papers, validates sources, and extracts structured knowledge.',
    icon: Search,
    color: 'text-blue-400',
    glow: 'from-blue-500/15 to-blue-500/5',
    border: 'border-blue-500/20',
    dot: 'bg-blue-400',
    connections: [2, 3],
  },
  {
    id: 'architect',
    name: 'Architect',
    role: 'System design',
    description: 'Designs software architecture, selects patterns, plans API surfaces, and ensures scalability.',
    icon: LayoutTemplate,
    color: 'text-violet-400',
    glow: 'from-violet-500/15 to-violet-500/5',
    border: 'border-violet-500/20',
    dot: 'bg-violet-400',
    connections: [3, 4],
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    role: 'Code review',
    description: 'Reviews diffs for correctness, security vulnerabilities, performance issues, and style consistency.',
    icon: Eye,
    color: 'text-orange-400',
    glow: 'from-orange-500/15 to-orange-500/5',
    border: 'border-orange-500/20',
    dot: 'bg-orange-400',
    connections: [4],
  },
  {
    id: 'coder',
    name: 'Coder',
    role: 'Implementation',
    description: 'Writes production-ready code following your conventions, patterns, and repository style guide.',
    icon: Code2,
    color: 'text-emerald-400',
    glow: 'from-emerald-500/15 to-emerald-500/5',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
    connections: [3, 5],
  },
  {
    id: 'tester',
    name: 'Tester',
    role: 'QA & testing',
    description: 'Writes unit, integration, and E2E tests. Runs test suites and iterates until full coverage.',
    icon: TestTube,
    color: 'text-pink-400',
    glow: 'from-pink-500/15 to-pink-500/5',
    border: 'border-pink-500/20',
    dot: 'bg-pink-400',
    connections: [6],
  },
  {
    id: 'devops',
    name: 'DevOps',
    role: 'Deployment',
    description: 'Manages CI/CD, monitors deployments, handles infrastructure, opens PRs to main branches.',
    icon: Server,
    color: 'text-cyan-400',
    glow: 'from-cyan-500/15 to-cyan-500/5',
    border: 'border-cyan-500/20',
    dot: 'bg-cyan-400',
    connections: [],
  },
]

export function AgentsSection() {
  return (
    <section id="agents" className="py-32 bg-[#050508]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 max-w-2xl"
        >
          <p className="text-sm text-blue-400 uppercase tracking-widest mb-4">AI Agents</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight text-balance mb-4">
            Specialized agents,<br />working in concert.
          </h2>
          <p className="text-lg text-white/40 leading-relaxed">
            Each agent is an expert in its domain. They collaborate, hand off context, and self-correct — exactly like a world-class engineering team.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {agents.map((agent, i) => {
            const Icon = agent.icon
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group relative"
              >
                {/* Hover glow */}
                <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${agent.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                <div className={`relative bg-[#0a0a0e] border ${agent.border} rounded-2xl p-5 h-full transition-all duration-300 group-hover:border-opacity-40`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${agent.glow} border ${agent.border} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${agent.color}`} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${agent.dot} animate-pulse`} />
                      <span className="text-[10px] text-white/20">Active</span>
                    </div>
                  </div>

                  <div className="mb-1">
                    <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
                    <p className={`text-[11px] ${agent.color} mb-3`}>{agent.role}</p>
                  </div>

                  <p className="text-xs text-white/40 leading-relaxed">{agent.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Connection hint */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-10 flex items-center justify-center gap-3 text-sm text-white/20"
        >
          <div className="h-px w-20 bg-white/[0.06]" />
          <span>Agents share context and coordinate in real-time</span>
          <div className="h-px w-20 bg-white/[0.06]" />
        </motion.div>
      </div>
    </section>
  )
}
