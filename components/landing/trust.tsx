'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

const logos = [
  'Vercel', 'Linear', 'Notion', 'Figma', 'GitHub', 'Anthropic',
  'OpenAI', 'Supabase', 'Stripe', 'Resend', 'Neon', 'Cloudflare',
]

const metrics = [
  { value: 10, suffix: 'x', label: 'Faster delivery' },
  { value: 97, suffix: '%', label: 'Test coverage' },
  { value: 500, suffix: 'k+', label: 'Lines deployed' },
  { value: 24, suffix: '/7', label: 'Agent uptime' },
]

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const duration = 1600
    const step = 16
    const increment = (target / (duration / step))
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, step)
    return () => clearInterval(timer)
  }, [inView, target])

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString()}{suffix}
    </span>
  )
}

function MarqueeLogo({ logos }: { logos: string[] }) {
  return (
    <div className="flex gap-12 items-center">
      {logos.map((logo, i) => (
        <div
          key={i}
          className="flex-shrink-0 text-sm font-medium text-white/20 hover:text-white/50 transition-colors duration-300 tracking-wide"
        >
          {logo}
        </div>
      ))}
    </div>
  )
}

export function TrustSection() {
  return (
    <section className="py-24 bg-[#050508] border-t border-white/[0.04]">
      {/* Marquee */}
      <div className="relative overflow-hidden mb-20">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#050508] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#050508] to-transparent z-10 pointer-events-none" />

        <motion.div
          className="flex gap-12"
          animate={{ x: [0, -50 * logos.length] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          style={{ width: 'max-content' }}
        >
          <MarqueeLogo logos={logos} />
          <MarqueeLogo logos={logos} />
          <MarqueeLogo logos={logos} />
        </motion.div>
      </div>

      {/* Metrics */}
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <p className="text-sm text-white/30 uppercase tracking-widest mb-3">Trusted by engineering teams</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white text-balance">
            Real results, measurable impact
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.04] rounded-2xl overflow-hidden">
          {metrics.map((metric, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#050508] px-8 py-10 text-center"
            >
              <div className="text-4xl md:text-5xl font-bold text-white mb-2 tabular-nums">
                <CountUp target={metric.value} suffix={metric.suffix} />
              </div>
              <div className="text-sm text-white/30">{metric.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
