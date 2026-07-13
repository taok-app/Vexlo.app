'use client'

import { atom } from 'jotai'
import { useAtom } from 'jotai'
import type { SessionUserInfo } from '@/lib/session/types'

export const sessionAtom = atom<SessionUserInfo>({ user: undefined })
export const sessionInitializedAtom = atom(false)

export function useSession() {
  const [session] = useAtom(sessionAtom)
  return session
}
