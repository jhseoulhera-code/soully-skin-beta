import { supabase } from './supabase'
import { ALGORITHM_VERSION, QUESTION_SET_VERSION, RESULT_VERSION } from './types'

const VISITOR_ID_KEY = 'soully_visitor_id'
const VISITOR_RECORDED_KEY = 'soully_visitor_recorded'

// Coarse device bucket only — deliberately not storing the raw user agent
// string, to stay away from anything that reads as device fingerprinting.
export function getDeviceType() {
  if (typeof navigator === 'undefined' || !navigator.userAgent) return 'unknown'
  const ua = navigator.userAgent
  if (/ipad|tablet(?!.*mobile)/i.test(ua)) return 'tablet'
  if (/mobi|iphone|android/i.test(ua)) return 'mobile'
  return 'desktop'
}

export function getUtmParams() {
  if (typeof window === 'undefined') return { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null }
  const params = new URLSearchParams(window.location.search)
  const pick = (key) => params.get(key) || null
  return {
    utm_source: pick('utm_source'),
    utm_medium: pick('utm_medium'),
    utm_campaign: pick('utm_campaign'),
    utm_content: pick('utm_content')
  }
}

// Stable per-browser id, generated once and reused for every diagnosis this
// visitor ever takes (logged in or not). Purely a random identifier — no
// fingerprinting inputs.
export function getOrCreateVisitorId() {
  if (typeof window === 'undefined') return null
  let id = localStorage.getItem(VISITOR_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(VISITOR_ID_KEY, id)
  }
  return id
}

// Records the visitors row for this browser, once. Safe to call on every
// app load — after the first successful insert it short-circuits locally
// without a network call.
export async function ensureVisitorRecord() {
  const visitorId = getOrCreateVisitorId()
  if (!supabase || !visitorId) return visitorId
  if (localStorage.getItem(VISITOR_RECORDED_KEY) === visitorId) return visitorId

  const utm = getUtmParams()
  const { error } = await supabase.from('visitors').insert({
    visitor_id: visitorId,
    first_source: utm.utm_source,
    first_campaign: utm.utm_campaign,
    device_type: getDeviceType()
  })
  // A unique-violation just means this visitor_id was already recorded
  // (e.g. another tab beat us to it) — not a real failure.
  if (!error || error.code === '23505') {
    localStorage.setItem(VISITOR_RECORDED_KEY, visitorId)
  }
  return visitorId
}

export async function getCurrentUserId() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data?.session?.user?.id ?? null
}

// Starts a brand new diagnosis attempt. Called every time a diagnosis is
// (re)started — QUICK -> DEEP retake included — so each attempt gets its
// own session_id and no prior answers/results are overwritten.
export async function createDiagnosisSession(testType) {
  const sessionId = crypto.randomUUID()
  const visitorId = getOrCreateVisitorId()
  if (!supabase || !visitorId) return { sessionId }

  const utm = getUtmParams()
  const userId = await getCurrentUserId()

  const { error } = await supabase.from('diagnosis_sessions').insert({
    session_id: sessionId,
    visitor_id: visitorId,
    user_id: userId,
    test_type: testType,
    status: 'started',
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    utm_content: utm.utm_content,
    algorithm_version: ALGORITHM_VERSION,
    question_set_version: QUESTION_SET_VERSION
  })
  if (error) console.error('createDiagnosisSession', error)
  return { sessionId }
}

// Saves one answer the moment it's picked, and moves current_question
// forward for abandoned-session analysis. Upserts on (session_id,
// question_id) so navigating back and changing an answer updates the same
// row instead of creating a duplicate.
export async function recordAnswer(sessionId, { questionId, answerValue, answerLabel, optionIndex, responseTimeMs }) {
  if (!supabase || !sessionId) return
  const [answerRes, progressRes] = await Promise.all([
    supabase.from('diagnosis_answers').upsert({
      session_id: sessionId,
      question_id: questionId,
      answer_value: answerValue,
      answer_label: answerLabel,
      option_index: optionIndex,
      response_time_ms: responseTimeMs,
      answered_at: new Date().toISOString(),
      question_version: QUESTION_SET_VERSION
    }, { onConflict: 'session_id,question_id' }),
    supabase.from('diagnosis_sessions')
      .update({ current_question: questionId })
      .eq('session_id', sessionId)
  ])
  if (answerRes.error) console.error('recordAnswer/answer', answerRes.error)
  if (progressRes.error) console.error('recordAnswer/progress', progressRes.error)
}

export async function completeSession(sessionId) {
  if (!supabase || !sessionId) return
  const { error } = await supabase.from('diagnosis_sessions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('session_id', sessionId)
  if (error) console.error('completeSession', error)
}

// Saves the computed result once a diagnosis finishes. `analysis` is the
// existing App.jsx analysis object (unchanged scoring) — only its already-
// computed values are copied into the row, nothing is recalculated here.
// pore_score/heat_score only exist for DEEP (CB/HQ axes aren't asked in
// QUICK), so they're left null for a QUICK session rather than guessed at.
export async function saveDiagnosisResult(sessionId, userId, analysis, mode) {
  if (!supabase || !sessionId) return
  const p = analysis.p
  const isDeep = mode === 'deep'
  const { error } = await supabase.from('diagnosis_results').upsert({
    session_id: sessionId,
    user_id: userId,
    oil_score: p.OD,
    sensitivity_score: p.SR,
    pigmentation_score: p.PN,
    aging_score: p.WT,
    pore_score: isDeep ? p.CB : null,
    heat_score: isDeep ? p.HQ : null,
    skin_type: analysis.primaryType,
    skin_type_16: analysis.type16,
    skin_type_64: analysis.type64,
    result_version: RESULT_VERSION
  }, { onConflict: 'session_id' })
  if (error) console.error('saveDiagnosisResult', error)
}

// Called right after sign-up/sign-in succeeds: every diagnosis_session (and
// its diagnosis_results row, if any) created anonymously under this
// browser's visitor_id — and not already linked to some other account — is
// attached to the newly authenticated user_id. Nothing is deleted or
// overwritten; sessions already belonging to a different user are left
// untouched by the `is('user_id', null)` filters below.
export async function linkVisitorSessionsToUser(userId, visitorId) {
  if (!supabase || !userId || !visitorId) return

  const { data: sessions, error: linkError } = await supabase
    .from('diagnosis_sessions')
    .update({ user_id: userId })
    .eq('visitor_id', visitorId)
    .is('user_id', null)
    .select('session_id')
  if (linkError) {
    console.error('linkVisitorSessionsToUser/sessions', linkError)
    return
  }

  const sessionIds = (sessions || []).map(s => s.session_id)
  if (!sessionIds.length) return

  const { error: resultError } = await supabase
    .from('diagnosis_results')
    .update({ user_id: userId })
    .in('session_id', sessionIds)
    .is('user_id', null)
  if (resultError) console.error('linkVisitorSessionsToUser/results', resultError)
}

// MY SKIN HISTORY data: every completed diagnosis result belonging to this
// member, newest first, each carrying its parent session's test_type so the
// history list can show QUICK/DEEP. Past QUICK results are never dropped —
// this simply returns everything the member's RLS policy allows them to see.
export async function fetchSkinHistory(userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('diagnosis_results')
    .select('*, session:diagnosis_sessions(session_id, test_type, status, started_at, completed_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('fetchSkinHistory', error)
    return []
  }
  return data || []
}

// Structural hook for "DEEP result outranks QUICK as the representative
// result when both exist" — picks the most recent DEEP result if one
// exists anywhere in the history, otherwise the most recent result overall.
// `results` must already be sorted newest-first (as fetchSkinHistory returns).
export function getRepresentativeResult(results) {
  if (!results || !results.length) return null
  const latestDeep = results.find(r => r.session?.test_type === 'DEEP')
  return latestDeep || results[0]
}
