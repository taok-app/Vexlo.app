'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import {
  Lightbulb, Search, FileText, LayoutTemplate, Code2, TestTube, Rocket, Activity
} from 'lucide-react'

const steps = [
  {
    id: 'idea',
    label: 'Idea',
    icon: Lightbulb,
    description: 'Describe your feature in plain English.',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    pill: 'bg-amber-400',
  },
  {
    id: 'research',
    label: 'Research',
    icon: Search,
    description: 'Agent searches docs, issues, and the web.',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    pill: 'bg-blue-400',
  },
  {
    id: 'prd',
    label: 'PRD',
    icon: FileText,
    description: 'Generates product requirements document.',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    border: 'border-violet-400/20',
    pill: 'bg-violet-400',
  },
  {
    id: 'architecture',
    label: 'Architecture',
    icon: LayoutTemplate,
    description: 'Designs technical architecture and APIs.',
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/10',
    border: 'border-indigo-400/20',
    pill: 'bg-indigo-400',
  },
  {
    id: 'coding',
    label: 'Coding',
    icon: Code2,
    description: 'Writes code that follows your conventions.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
    pill: 'bg-emerald-400',
  },
  {
    id: 'testing',
    label: 'Testing',
    icon: TestTube,
    description: 'Runs tests, fixes failures automatically.',
    color: 'text-pink-400',
    bg: 'bg-pink-400/10',
    border: 'border-pink-400/20',
    pill: 'bg-pink-400',
  },
  {
    id: 'deploy',
    label: 'Deploy',
    icon: Rocket,
    description: 'Opens PR, merges, and deploys to production.',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/20',
    pill: 'bg-orange-400',
  },
  {
    id: 'monitor',
    label: 'Monitor',
    icon: Activity,
    description: 'Monitors metrics and auto-patches regressions.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/20',
    pill: 'bg-cyan-400',
  },
]

export function WorkflowSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-32 bg-[#050508] border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <p className="text-sm text-blue-400 uppercase tracking-widest mb-4">End-to-End Workflow</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight text-balance mb-4">
            From idea to production.<br />Fully automated.
          </h2>
          <p className="text-lg text-white/40 max-w-xl mx-auto leading-relaxed">
            Vexlo runs the complete software development lifecycle end-to-end, with humans in the loop when it matters.
          </p>
        </motion.div>

        {/* Desktop: horizontal */}
        <div ref={ref} className="hidden md:flex items-start gap-0">
          {steps.map((step, i) => {
            const Icon = step.icon
            const isLast = i === steps.length - 1
            return (
              <div key={step.id} className="flex-1 flex flex-col items-center relative">
                {/* Connector line */}
                {!isLast && (
                  <div className="absolute top-6 left-1/2 w-full h-px bg-white/[0.04] z-0">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
                      transition={{ delay: 0.3 + i * 0.12, duration: 0.5, ease: 'easeOut' }}
                      className={`h-full ${step.pill} opacity-40`}
                      style={{ transformOrigin: 'left' }}
                    />
                  </div>
                )}

                {/* Step icon */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
                  transition={{ delay: i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="relative z-10 mb-4"
                >
                  <div className={`w-12 h-12 rounded-2xl ${step.bg} border ${step.border} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${step.color}`} />
                  </div>
                </motion.div>

                {/* Label */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                  transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
                  className="text-center px-1"
                >
                  <div className="text-sm font-medium text-white/80 mb-1">{step.label}</div>
                  <div className="text-[11px] text-white/30 leading-snug">{step.description}</div>
                </motion.div>
              </div>
            )
          })}
        </div>

        {/* Mobile: vertical */}
        <div className="md:hidden space-y-0">
          {steps.map((step, i) => {
            const Icon = step.icon
            const isLast = i === steps.length - 1
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="flex gap-4"
              >
                {/* Left: icon + connector */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-xl ${step.bg} border ${step.border} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4.5 h-4.5 ${step.color}`} />
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-white/[0.06] my-1" />}
                </div>

                {/* Right: text */}
                <div className={`pb-6 pt-1 ${isLast ? '' : ''}`}>
                  <div className="text-sm font-medium text-white/80 mb-0.5">{step.label}</div>
                  <div className="text-xs text-white/30 leading-relaxed">{step.description}</div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
