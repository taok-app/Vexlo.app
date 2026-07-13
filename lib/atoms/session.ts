import { atom } from 'jotai'
import { useAtomValue } from 'jotai'
import type { SessionUserInfo } from '@/lib/session/types'

export const sessionAtom = atom<SessionUserInfo>({ user: undefined })
export const sessionInitializedAtom = atom(false)

export function useSession(): SessionUserInfo {
  return useAtomValue(sessionAtom)
}
