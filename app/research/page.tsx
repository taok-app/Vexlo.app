import type { Metadata } from 'next'
import ResearchPage from '@/components/research/research-page'

export const metadata: Metadata = {
  title: 'Research | Vexlo AI',
  description: 'Manage and track your research sessions, sources, and findings.',
}

export default function Page() {
  return <ResearchPage />
}
