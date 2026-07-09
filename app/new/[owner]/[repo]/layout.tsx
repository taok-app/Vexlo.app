import { Metadata } from 'next'
import { AppLayoutWrapper } from '@/components/app-layout-wrapper'

interface LayoutProps {
  params: Promise<{
    owner: string
    repo: string
  }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { owner, repo } = await params

  return {
    title: `${owner}/${repo} - Vexlo AI`,
    description: `Create AI-powered tasks for ${owner}/${repo}`,
  }
}

export default function Layout({ children }: LayoutProps) {
  return <AppLayoutWrapper>{children}</AppLayoutWrapper>
}
