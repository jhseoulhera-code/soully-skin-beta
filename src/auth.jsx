import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({ user: null, isMember: false, loading: true })

// Only one anonymous sign-in should ever be in flight for this browser at a
// time — two concurrent calls (e.g. AuthProvider's mount effect racing a
// diagnosisTracking.js call that also needs an identity) must not create two
// separate anonymous auth.users rows. Every caller in this app goes through
// ensureIdentity() below, which shares this single promise.
let anonymousBootstrap = null

async function ensureAnonymousSessionExists() {
  const { data } = await supabase.auth.getSession()
  if (data?.session) return
  if (!anonymousBootstrap) {
    anonymousBootstrap = supabase.auth.signInAnonymously()
      .catch(error => {
        // Most likely cause: "Allow anonymous sign-ins" isn't turned on yet
        // for this Supabase project (Authentication > Sign In / Providers >
        // Anonymous). The app still works — every diagnosisTracking.js call
        // that needs a uid just no-ops (same as the existing !supabase
        // guards), so a visitor can still take the whole diagnosis without
        // anything being persisted, exactly like before this feature.
        console.error('signInAnonymously failed — is Anonymous Sign-ins enabled in Supabase?', error)
      })
      .finally(() => { anonymousBootstrap = null })
  }
  await anonymousBootstrap
}

// Returns the current, real, JWT-verified identity for this browser —
// establishing an anonymous one first if none exists yet. This is the ONLY
// notion of "visitor_id" anywhere in the app now: it's not a value the
// client invents, it's auth.uid(), which Supabase issues and PostgREST
// verifies on every request. See the "v2 security rewrite" note at the top
// of supabase-migration-diagnosis-tracking.sql for why this replaced a
// client-generated localStorage UUID.
export async function ensureIdentity() {
  if (!supabase) return { uid: null, isMember: false }
  await ensureAnonymousSessionExists()
  const { data } = await supabase.auth.getSession()
  const u = data?.session?.user
  // is_anonymous is Supabase Auth's own flag: true for a not-yet-signed-up
  // visitor, false once they've set an email+password (or a real OAuth
  // identity) on this same auth.users row.
  return { uid: u?.id ?? null, isMember: !!u && u.is_anonymous === false }
}

// Thin wrapper around Supabase Auth (already the project's backend — see
// src/supabase.js) so the rest of the app can read {user, isMember} without
// touching the client directly.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let alive = true

    const applySession = (session) => {
      const u = session?.user ?? null
      setUser(u)
      setIsMember(!!u && u.is_anonymous === false)
    }

    ensureAnonymousSessionExists().then(async () => {
      if (!alive) return
      const { data } = await supabase.auth.getSession()
      if (!alive) return
      applySession(data?.session ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session)
    })
    return () => {
      alive = false
      sub?.subscription?.unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={{ user, isMember, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

// "회원가입": converts the CURRENT anonymous session into a permanent
// account. auth.uid() never changes, so every diagnosis_session/answer/
// result already created under this browser's anonymous identity is
// already correctly owned — nothing needs to be reassigned (see
// markVisitorAsMember in diagnosisTracking.js for the one remaining step,
// filling in the nullable "real member" marker column).
export async function convertAnonymousToMember(email, password) {
  if (!supabase) return { data: null, error: new Error('Supabase가 연결되어 있지 않습니다.') }
  return supabase.auth.updateUser({ email, password })
}

// Mints a single-use, 10-minute handoff claim token for THIS browser's
// current anonymous session (must be called before signInExistingMember
// switches identity — see claim_handoff()'s SQL comment for why the order
// matters). Returns null if there's nothing to hand off (not anonymous, or
// no completed diagnosis yet) — that's an expected, non-fatal case, not an
// error to surface to the user.
async function createHandoffClaim() {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('create_handoff_claim')
  if (error) {
    console.warn('createHandoffClaim (expected if nothing to hand off):', error.message)
    return null
  }
  return data ?? null
}

// Redeems a handoff claim token while authenticated as the NEW identity.
// Only ever reassigns rows the token's original anonymous identity actually
// owned — see claim_handoff()'s SQL comment for the full security argument.
async function claimHandoff(token) {
  if (!supabase || !token) return null
  const { data, error } = await supabase.rpc('claim_handoff', { p_token: token })
  if (error) {
    console.error('claimHandoff', error)
    return null
  }
  return data ?? null
}

// "로그인": switches to a different, pre-existing account. This REPLACES
// the anonymous session — auth.uid() changes — so any anonymous work done
// on this browser under the old identity would (correctly) become
// unreachable from the new one afterwards under plain RLS. To still honor
// "로그인해도 방금 완료한 익명 진단은 내 계정으로 이전된다", this mints a
// handoff claim BEFORE switching (while still authenticated as the
// anonymous session, so the claim can only ever be scoped to that real
// identity — see create_handoff_claim()'s SQL comment), then redeems it
// once signed in as the new identity. If there's nothing to hand off, or
// the handoff RPCs aren't deployed yet, sign-in still proceeds normally —
// the handoff is a bonus on top of a normal login, never a precondition
// for it.
export async function signInExistingMember(email, password) {
  if (!supabase) return { data: null, error: new Error('Supabase가 연결되어 있지 않습니다.') }
  const claimToken = await createHandoffClaim()
  const result = await supabase.auth.signInWithPassword({ email, password })
  if (!result.error && claimToken) {
    await claimHandoff(claimToken)
  }
  return result
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

// Connection point for Kakao login. Not enabled yet — enabling it is a
// Supabase-dashboard config change (Authentication > Providers > Kakao),
// not a code change. Once that provider is turned on, converting the
// current anonymous session via Kakao is `supabase.auth.linkIdentity({
// provider: 'kakao' })` (the anonymous-session equivalent of
// convertAnonymousToMember above). Kept here — and wired to a disabled
// button in AuthPanel — so the UI slot and the call site both already exist.
export async function linkKakaoIdentity() {
  if (!supabase) return { data: null, error: new Error('Supabase가 연결되어 있지 않습니다.') }
  return supabase.auth.linkIdentity({ provider: 'kakao' })
}
