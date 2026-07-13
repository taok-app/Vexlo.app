'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { redirectToSignIn } from '@/lib/session/redirect-to-sign-in'
import { getEnabledAuthProviders } from '@/lib/auth/providers'
import { GitHubIcon } from '@/components/icons/github-icon'
import { useState } from 'react'

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  const [loadingVercel, setLoadingVercel] = useState(false)
  const [loadingGitHub, setLoadingGitHub] = useState(false)

  const { github: hasGitHub, vercel: hasVercel } = getEnabledAuthProviders()

  const handleVercelSignIn = async () => {
    setLoadingVercel(true)
    await redirectToSignIn()
  }

  const handleGitHubSignIn = () => {
    setLoadingGitHub(true)
    window.location.href = `/api/auth/signin/github?next=${encodeURIComponent(next)}`
  }

  return (
    <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(59,130,246,0.08),transparent)] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <span className="text-white font-semibold text-base tracking-tight">Vexlo AI</span>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
          <h1 className="text-xl font-semibold text-white text-center mb-2">Sign in to Vexlo</h1>
          <p className="text-sm text-white/40 text-center mb-8">
            {hasGitHub && hasVercel
              ? 'Choose how you want to sign in to continue.'
              : hasVercel
                ? 'Sign in with Vercel to continue.'
                : 'Sign in with GitHub to continue.'}
          </p>

          <div className="flex flex-col gap-3">
            {hasVercel && (
              <button
                onClick={handleVercelSignIn}
                disabled={loadingVercel || loadingGitHub}
                className="w-full flex items-center justify-center gap-2.5 bg-white/[0.06] hover:bg-white/[0.09] border border-white/[0.1] text-white/80 hover:text-white text-sm font-medium px-4 py-3 rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingVercel ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white/60"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Redirecting...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 76 65" className="h-3.5 w-3.5" fill="currentColor">
                      <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
                    </svg>
                    Continue with Vercel
                  </>
                )}
              </button>
            )}

            {hasGitHub && (
              <button
                onClick={handleGitHubSignIn}
                disabled={loadingVercel || loadingGitHub}
                className="w-full flex items-center justify-center gap-2.5 bg-white/[0.06] hover:bg-white/[0.09] border border-white/[0.1] text-white/80 hover:text-white text-sm font-medium px-4 py-3 rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingGitHub ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white/60"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Redirecting...
                  </>
                ) : (
                  <>
                    <GitHubIcon className="h-4 w-4" />
                    Continue with GitHub
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Back link */}
        <p className="text-center mt-6 text-sm text-white/25">
          <Link href="/" className="hover:text-white/50 transition-colors">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
