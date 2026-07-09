'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Github, Twitter } from 'lucide-react'

const footerLinks = {
  Product: ['Engineering', 'Research', 'Knowledge Base', 'Agent Orchestration', 'Model Router', 'Changelog'],
  Developers: ['Documentation', 'API Reference', 'GitHub', 'Status', 'Community', 'Integrations'],
  Company: ['About', 'Blog', 'Careers', 'Press', 'Privacy', 'Terms'],
}

export function CTASection() {
  return (
    <section className="py-40 bg-[#050508] relative overflow-hidden border-t border-white/[0.04]">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(59,130,246,0.08),transparent)]" />

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-1.5 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-white/40">Now available — start for free</span>
          </div>

          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[0.95] tracking-tight text-balance mb-6">
            Ship great software.<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">
              Without limits.
            </span>
          </h2>

          <p className="text-lg text-white/40 max-w-xl mx-auto mb-10 leading-relaxed">
            Join thousands of engineering teams using Vexlo AI to build faster, ship more, and maintain less.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/tasks"
              className="group flex items-center gap-2 bg-white text-black text-sm font-semibold px-8 py-3.5 rounded-full hover:bg-blue-50 transition-all duration-200 shadow-lg shadow-black/20"
            >
              Start Building for Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#demo"
              className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] text-white/60 hover:text-white text-sm font-medium px-8 py-3.5 rounded-full hover:bg-white/[0.08] transition-all duration-200"
            >
              Book a Demo
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className="bg-[#050508] border-t border-white/[0.06] pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">V</span>
              </div>
              <span className="text-white font-semibold text-sm">Vexlo AI</span>
            </div>
            <p className="text-sm text-white/30 leading-relaxed mb-6 max-w-48">
              The AI Operating System for Software Engineering.
            </p>
            <div className="flex gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/30 hover:text-white transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/30 hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <div className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">{category}</div>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-white/25 hover:text-white/60 transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-white/20">
            &copy; {new Date().getFullYear()} Vexlo AI, Inc. All rights reserved.
          </div>
          <div className="flex gap-6 text-xs text-white/20">
            <a href="#" className="hover:text-white/40 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white/40 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white/40 transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
