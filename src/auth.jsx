import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({ user: null, loading: true })

// Thin wrapper around Supabase Auth (already the project's backend — see
// src/supabase.js) so the rest of the app can read `user` without touching
// the client directly. This is the auth connection point requested for the
// "member" side of the diagnosis-tracking work; no custom auth server exists
// or is introduced here.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setUser(data?.session?.user ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      alive = false
      sub?.subscription?.unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

export async function signUpWithEmail(email, password) {
  if (!supabase) return { data: null, error: new Error('Supabase가 연결되어 있지 않습니다.') }
  return supabase.auth.signUp({ email, password })
}

export async function signInWithEmail(email, password) {
  if (!supabase) return { data: null, error: new Error('Supabase가 연결되어 있지 않습니다.') }
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

// Connection point for Kakao login. Not enabled yet — enabling it is a
// Supabase-dashboard config change (Authentication > Providers > Kakao),
// not a code change: once that provider is turned on there, this call
// starts the real OAuth flow with no other code to write. Kept here (and
// wired to a disabled button in AuthPanel) so the UI slot and the call site
// both already exist.
export async function signInWithKakao() {
  if (!supabase) return { data: null, error: new Error('Supabase가 연결되어 있지 않습니다.') }
  return supabase.auth.signInWithOAuth({ provider: 'kakao' })
}
