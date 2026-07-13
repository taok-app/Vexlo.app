'use client'

import { useAtom } from 'jotai'
import { sessionAtom } from '@/lib/atoms/session'

export function useSession() {
  const [session] = useAtom(sessionAtom)
  return session
}
