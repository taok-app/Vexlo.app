'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Github, Sparkles, Terminal, GitBranch, Zap, Shield } from 'lucide-react'

const examplePrompts = [
  'Build a real-time collaboration feature with WebSockets',
  'Add OAuth2 authentication with role-based permissions',
  'Optimize database queries and add Redis caching layer',
  'Create a CI/CD pipeline with automated testing',
  'Refactor the monolith into microservices architecture',
  'Implement end-to-end encryption for user messages',
]

const agentCards = [
  {
    label: 'Planner',
    status: 'Analyzing codebase...',
    color: 'from-blue-500/20 to-blue-600/10',
    border: 'border-blue-500/20',
    dot: 'bg-blue-400',
    icon: Sparkles,
  },
  {
    label: 'Architect',
    status: 'Designing system...',
    color: 'from-violet-500/20 to-violet-600/10',
    border: 'border-violet-500/20',
    dot: 'bg-violet-400',
    icon: GitBranch,
  },
  {
    label: 'Coder',
    status: 'Writing tests...',
    color: 'from-emerald-500/20 to-emerald-600/10',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
    icon: Terminal,
  },
]

function TypingPrompt() {
  const [index, setIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const current = examplePrompts[index]

    if (isPaused) {
      timerRef.current = setTimeout(() => {
        setIsPaused(false)
        setIsDeleting(true)
      }, 2200)
      return
    }

    if (!isDeleting) {
      if (displayed.length < current.length) {
        timerRef.current = setTimeout(() => {
          setDisplayed(current.slice(0, displayed.length + 1))
        }, 38)
      } else {
        setIsPaused(true)
      }
    } else {
      if (displayed.length > 0) {
        timerRef.current = setTimeout(() => {
          setDisplayed(displayed.slice(0, -1))
        }, 18)
      } else {
        setIsDeleting(false)
        setIndex((i) => (i + 1) % examplePrompts.length)
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [displayed, index, isDeleting, isPaused])

  return (
    <span className="text-white/60">
      {displayed}
      <span className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 animate-pulse align-middle" />
    </span>
  )
}

function StreamingLine({ delay = 0, width = '60%' }: { delay?: number; width?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: [0, 0.6, 0], scaleX: [0, 1, 1] }}
      transition={{ delay, duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
      style={{ width, originX: 0 }}
      className="h-px bg-gradient-to-r from-blue-500/80 via-violet-400/60 to-transparent"
    />
  )
}

function Particle({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <motion.div
      className="absolute w-1 h-1 rounded-full bg-blue-400/40"
      style={{ left: `${x}%`, top: `${y}%` }}
      animate={{ y: [-10, 10, -10], opacity: [0.2, 0.6, 0.2] }}
      transition={{ duration: 4 + delay, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  )
}

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden bg-[#050508]">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(59,130,246,0.15),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_70%_60%,rgba(139,92,246,0.08),transparent)]" />

      {/* Particles */}
      {[
        { x: 12, y: 30, d: 0 }, { x: 85, y: 20, d: 1.2 }, { x: 25, y: 75, d: 0.8 },
        { x: 68, y: 65, d: 2 }, { x: 45, y: 85, d: 0.4 }, { x: 90, y: 50, d: 1.6 },
        { x: 5, y: 55, d: 0.9 }, { x: 55, y: 15, d: 1.8 },
      ].map((p, i) => (
        <Particle key={i} x={p.x} y={p.y} delay={p.d} />
      ))}

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 flex flex-col items-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2 mb-8"
        >
          <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-full px-4 py-1.5">
            <Zap className="w-3 h-3 text-blue-400 fill-blue-400" />
            <span className="text-xs text-white/60">AI Operating System for Software Engineering</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6"
        >
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-[0.95] tracking-tight text-balance">
            Build software<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-blue-400 via-blue-300 to-violet-400">
              10x faster
            </span>
          </h1>
        </motion.div>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-center text-lg md:text-xl text-white/40 max-w-xl leading-relaxed mb-10 text-balance"
        >
          Vexlo orchestrates specialized AI agents to research, architect, code, test, and deploy — end to end.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center gap-3 mb-16"
        >
          <Link
            href="/tasks"
            className="group flex items-center gap-2 bg-white text-black text-sm font-semibold px-6 py-3 rounded-full hover:bg-blue-50 transition-all duration-200 shadow-lg shadow-black/20"
          >
            Start Building
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a
            href="#demo"
            className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] text-white/70 hover:text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-white/[0.08] transition-all duration-200"
          >
            Book a Demo
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
        </motion.div>

        {/* Interactive prompt box */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl mb-20"
        >
          <div className="relative group">
            {/* Glow */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-blue-500/30 via-violet-500/20 to-blue-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
            <div className="relative bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
              {/* Streaming lines */}
              <div className="absolute top-0 left-0 right-0 space-y-1 p-4 pointer-events-none">
                <StreamingLine delay={0} width="70%" />
                <StreamingLine delay={0.8} width="40%" />
                <StreamingLine delay={1.5} width="55%" />
              </div>

              <div className="flex items-center gap-3 px-5 py-4">
                <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div className="flex-1 text-sm min-h-[20px]">
                  <TypingPrompt />
                </div>
                <button className="flex-shrink-0 bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition-colors">
                  Run
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Workspace preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-6xl relative"
        >
          {/* Fade bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#050508] to-transparent z-10 pointer-events-none" />

          {/* Fake workspace UI */}
          <div className="relative bg-[#0c0c10] border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05] bg-[#0a0a0e]">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <div className="flex-1 mx-4">
                <div className="mx-auto w-48 bg-white/[0.05] rounded-md px-3 py-1 text-xs text-white/30 text-center">
                  vexlo.ai/workspace
                </div>
              </div>
            </div>

            {/* Workspace layout */}
            <div className="flex h-[400px] md:h-[520px]">
              {/* Left sidebar */}
              <div className="hidden md:flex flex-col w-56 border-r border-white/[0.05] p-3 gap-1 flex-shrink-0">
                <div className="text-xs text-white/20 uppercase tracking-wider mb-2 px-2">Tasks</div>
                {['Implement auth system', 'Add WebSocket layer', 'Write E2E tests', 'Deploy to staging'].map(
                  (task, i) => (
                    <div
                      key={i}
                      className={`text-xs px-3 py-2 rounded-lg cursor-pointer ${i === 0 ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20' : 'text-white/30 hover:text-white/50'}`}
                    >
                      {task}
                    </div>
                  ),
                )}
              </div>

              {/* Main area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Agent cards row */}
                <div className="flex items-center gap-3 p-4 border-b border-white/[0.05] overflow-x-auto">
                  {agentCards.map((agent, i) => (
                    <motion.div
                      key={agent.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + i * 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className={`flex-shrink-0 flex items-center gap-2.5 bg-gradient-to-r ${agent.color} border ${agent.border} rounded-xl px-3 py-2`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${agent.dot} animate-pulse`} />
                      <div>
                        <div className="text-xs font-medium text-white/80">{agent.label}</div>
                        <div className="text-[10px] text-white/30">{agent.status}</div>
                      </div>
                    </motion.div>
                  ))}

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.1 }}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl"
                  >
                    <Shield className="w-3 h-3 text-white/30" />
                    <span className="text-xs text-white/30">3 more running...</span>
                  </motion.div>
                </div>

                {/* Chat / stream area */}
                <div className="flex-1 p-4 space-y-3 overflow-hidden">
                  {[
                    {
                      type: 'agent',
                      name: 'Architect',
                      color: 'text-violet-400',
                      text: 'Analyzed repository structure. Found 47 components. Suggesting JWT-based auth with refresh tokens.',
                    },
                    {
                      type: 'agent',
                      name: 'Coder',
                      color: 'text-emerald-400',
                      text: 'Writing `auth/middleware.ts` — implementing route guards and session validation...',
                    },
                    {
                      type: 'system',
                      name: 'System',
                      color: 'text-white/20',
                      text: '✓ 12 files modified · 3 tests passing · PR ready',
                    },
                  ].map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.2, duration: 0.4 }}
                      className="flex gap-3"
                    >
                      <div className={`text-xs font-medium w-16 flex-shrink-0 ${msg.color} pt-0.5`}>{msg.name}</div>
                      <div className="text-xs text-white/40 leading-relaxed">{msg.text}</div>
                    </motion.div>
                  ))}

                  {/* Streaming line effect */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="flex gap-3"
                  >
                    <div className="text-xs font-medium w-16 flex-shrink-0 text-blue-400 pt-0.5">Tester</div>
                    <div className="flex items-center gap-1.5">
                      <div className="text-xs text-white/40">Running test suite</div>
                      <div className="flex gap-0.5">
                        {[0, 0.2, 0.4].map((d) => (
                          <motion.div
                            key={d}
                            className="w-1 h-1 rounded-full bg-blue-400"
                            animate={{ opacity: [0.2, 1, 0.2] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: d }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Right panel: code */}
              <div className="hidden lg:block w-72 border-l border-white/[0.05] p-4 font-mono overflow-hidden flex-shrink-0">
                <div className="text-[10px] text-white/20 mb-3">auth/middleware.ts</div>
                {[
                  { indent: 0, text: 'import { NextRequest }', color: 'text-violet-400/70' },
                  { indent: 0, text: "  from 'next/server'", color: 'text-white/20' },
                  { indent: 0, text: '', color: '' },
                  { indent: 0, text: 'export async function', color: 'text-blue-400/70' },
                  { indent: 1, text: 'middleware(req) {', color: 'text-white/40' },
                  { indent: 2, text: 'const token =', color: 'text-white/30' },
                  { indent: 3, text: "req.cookies.get('auth')", color: 'text-emerald-400/60' },
                  { indent: 0, text: '', color: '' },
                  { indent: 2, text: 'if (!token) return', color: 'text-white/30' },
                  { indent: 3, text: 'redirect("/login")', color: 'text-orange-400/60' },
                  { indent: 0, text: '', color: '' },
                  { indent: 2, text: 'return verifyJWT(', color: 'text-white/30' },
                  { indent: 3, text: 'token.value', color: 'text-emerald-400/60' },
                  { indent: 2, text: ')', color: 'text-white/30' },
                  { indent: 1, text: '}', color: 'text-white/40' },
                ].map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 + i * 0.06 }}
                    className={`text-[11px] leading-5 ${line.color}`}
                    style={{ paddingLeft: `${line.indent * 12}px` }}
                  >
                    {line.text || '\u00A0'}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
