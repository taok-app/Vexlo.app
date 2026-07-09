import { cookies } from 'next/headers'
import { HomePageContent } from '@/components/home-page-content'
import { getServerSession } from '@/lib/session/get-server-session'
import { getGitHubStars } from '@/lib/github-stars'
import { getMaxSandboxDuration } from '@/lib/db/settings'
import { LandingNavbar } from '@/components/landing/navbar'
import { HeroSection } from '@/components/landing/hero'
import { TrustSection } from '@/components/landing/trust'
import { PlatformSection } from '@/components/landing/platform'
import { AgentsSection } from '@/components/landing/agents'
import { WorkflowSection } from '@/components/landing/workflow'
import { FeatureSections } from '@/components/landing/features'
import { CTASection, LandingFooter } from '@/components/landing/cta-footer'

export default async function Home() {
  const cookieStore = await cookies()
  const selectedOwner = cookieStore.get('selected-owner')?.value || ''
  const selectedRepo = cookieStore.get('selected-repo')?.value || ''
  const installDependencies = cookieStore.get('install-dependencies')?.value === 'true'
  const keepAlive = cookieStore.get('keep-alive')?.value === 'true'
  const enableBrowser = cookieStore.get('enable-browser')?.value === 'true'

  const session = await getServerSession()

  // Authenticated users see the workspace directly
  if (session?.user) {
    const maxSandboxDuration = await getMaxSandboxDuration(session.user.id)
    const maxDuration = parseInt(cookieStore.get('max-duration')?.value || maxSandboxDuration.toString(), 10)
    const stars = await getGitHubStars()

    return (
      <HomePageContent
        initialSelectedOwner={selectedOwner}
        initialSelectedRepo={selectedRepo}
        initialInstallDependencies={installDependencies}
        initialMaxDuration={maxDuration}
        initialKeepAlive={keepAlive}
        initialEnableBrowser={enableBrowser}
        maxSandboxDuration={maxSandboxDuration}
        user={session.user}
        initialStars={stars}
      />
    )
  }

  // Unauthenticated users see the landing page
  return (
    <main className="bg-[#050508] min-h-screen">
      <LandingNavbar />
      <HeroSection />
      <TrustSection />
      <PlatformSection />
      <AgentsSection />
      <WorkflowSection />
      <FeatureSections />
      <CTASection />
      <LandingFooter />
    </main>
  )
}
