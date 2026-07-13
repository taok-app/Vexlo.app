import type { NextRequest } from 'next/server'
import { getSessionFromReq } from '@/lib/session/server'
import { isRelativeUrl } from '@/lib/utils/is-relative-url'
import { saveSession } from '@/lib/session/create'
import { getOAuthToken } from '@/lib/session/get-oauth-token'

export async function GET(req: NextRequest) {
  const session = await getSessionFromReq(req)
  
  // Attempt token revocation but don't block signout on failure
  if (session) {
    try {
      if (session.authProvider === 'github') {
        const tokenData = await getOAuthToken(session.user.id, 'github')
        if (tokenData) {
          fetch(`https://api.github.com/applications/${process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID}/token`, {
            method: 'DELETE',
            headers: {
              Authorization: `Basic ${Buffer.from(`${process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID}:${process.env.GITHUB_CLIENT_SECRET}`).toString('base64')}`,
              Accept: 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({ access_token: tokenData.accessToken }),
          }).catch(() => {})
        }
      } else {
        const tokenData = await getOAuthToken(session.user.id, 'vercel')
        if (tokenData) {
          fetch('https://vercel.com/api/login/oauth/token/revoke', {
            method: 'POST',
            body: new URLSearchParams({ token: tokenData.accessToken }),
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${Buffer.from(`${process.env.NEXT_PUBLIC_VERCEL_CLIENT_ID}:${process.env.VERCEL_CLIENT_SECRET}`).toString('base64')}`,
            },
          }).catch(() => {})
        }
      }
    } catch (error) {
      // Silently fail token revocation - user is still logged out
    }
  }

  const response = Response.json({
    url: isRelativeUrl(req.nextUrl.searchParams.get('next') ?? '/') ? req.nextUrl.searchParams.get('next') : '/',
  })

  await saveSession(response, undefined)
  return response
}
