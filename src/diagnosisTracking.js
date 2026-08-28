import { supabase } from './supabase'
import { ensureIdentity } from './auth'
import { ALGORITHM_VERSION, QUESTION_SET_VERSION, RESULT_VERSION } from './types'

// Purely a perf shortcut (skip a redundant insert attempt for a returning
// visitor) — NOT a security mechanism. Ownership/security is entirely
// handled by RLS checking auth.uid() server-side; see ensureIdentity() in
// src/auth.jsx and the SQL migration's "v2 security rewrite" note.
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

// Ensures the visitors row for this browser's identity exists. Safe to call
// on every diagnosis start — after the first successful insert it
// short-circuits locally without a network call. Also the single place that
// guarantees the FK target (visitors.visitor_id) exists before
// createDiagnosisSession inserts a session referencing it.
export async function ensureVisitorRecord() {
  const { uid } = await ensureIdentity()
  if (!supabase || !uid) return uid
  if (localStorage.getItem(VISITOR_RECORDED_KEY) === uid) return uid

  const utm = getUtmParams()
  const { error } = await supabase.from('visitors').insert({
    visitor_id: uid,
    first_source: utm.utm_source,
    first_campaign: utm.utm_campaign,
    device_type: getDeviceType()
  })
  // A unique-violation just means this identity's visitors row already
  // exists (e.g. a returning visitor, or another tab beat us to it).
  if (!error || error.code === '23505') {
    localStorage.setItem(VISITOR_RECORDED_KEY, uid)
  } else {
    console.error('ensureVisitorRecord', error)
  }
  return uid
}

// Starts a brand new diagnosis attempt. Called every time a diagnosis is
// (re)started — QUICK -> DEEP retake included — so each attempt gets its
// own session_id and no prior answers/results are overwritten.
export async function createDiagnosisSession(testType) {
  const sessionId = crypto.randomUUID()
  const uid = await ensureVisitorRecord()
  if (!supabase || !uid) return { sessionId }

  const { isMember } = await ensureIdentity()
  const utm = getUtmParams()

  const { error } = await supabase.from('diagnosis_sessions').insert({
    session_id: sessionId,
    visitor_id: uid,
    user_id: isMember ? uid : null,
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
// hydration/barrier/acne/tone_score and top_concern_1-3 are always left
// null: the current scoring algorithm doesn't produce them, and inventing
// values for them is explicitly out of scope for this change.
export async function saveDiagnosisResult(sessionId, analysis, mode) {
  if (!supabase || !sessionId) return
  const { uid, isMember } = await ensureIdentity()
  const p = analysis.p
  const isDeep = mode === 'deep'
  const { error } = await supabase.from('diagnosis_results').upsert({
    session_id: sessionId,
    user_id: isMember ? uid : null,
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

// Called right after "회원가입" (convertAnonymousToMember) succeeds. Fills
// in the nullable `user_id` "real member" marker on every session/result
// this browser's identity already owns (visitor_id = auth.uid(), unchanged
// by the conversion) but hadn't marked yet. This is RLS-safe specifically
// because it never touches another identity's rows — see the SQL
// migration's "v2 security rewrite" note for why that's now guaranteed.
export async function markVisitorAsMember() {
  if (!supabase) return
  const { uid, isMember } = await ensureIdentity()
  if (!uid || !isMember) return

  const { data: sessions, error } = await supabase
    .from('diagnosis_sessions')
    .update({ user_id: uid })
    .eq('visitor_id', uid)
    .is('user_id', null)
    .select('session_id')
  if (error) {
    console.error('markVisitorAsMember/sessions', error)
    return
  }

  const sessionIds = (sessions || []).map(s => s.session_id)
  if (!sessionIds.length) return

  const { error: resultError } = await supabase
    .from('diagnosis_results')
    .update({ user_id: uid })
    .in('session_id', sessionIds)
    .is('user_id', null)
  if (resultError) console.error('markVisitorAsMember/results', resultError)
}

// Called after "로그인" to a DIFFERENT, pre-existing account succeeds. That
// switch changes auth.uid(), so the diagnosis just taken under the old
// (now-abandoned) anonymous identity can no longer be reassigned — RLS
// correctly has no way to move ownership across identities (see the SQL
// migration's security note). Instead, this replays the same save calls
// used during the diagnosis itself (createDiagnosisSession -> recordAnswer
// per answered question -> completeSession -> saveDiagnosisResult) so the
// just-completed result also exists as a fresh row owned by the new
// identity from the start. Only the just-finished diagnosis is replayed —
// older anonymous history on this browser under the previous identity is
// not retroactively merged into the newly-logged-in account.
export async function replayCurrentDiagnosisForNewIdentity({ testType, questions, answers, analysis, mode }) {
  if (!supabase) return
  const { sessionId } = await createDiagnosisSession(testType)
  for (const q of questions) {
    const picked = answers[q.text]
    if (picked === undefined) continue
    const opt = q.options[picked]
    await recordAnswer(sessionId, {
      questionId: q.tag,
      answerValue: opt.score,
      answerLabel: opt.label,
      optionIndex: picked,
      responseTimeMs: null
    })
  }
  await completeSession(sessionId)
  await saveDiagnosisResult(sessionId, analysis, mode)
}

// MY SKIN HISTORY data: every completed diagnosis result belonging to this
// member, newest first, each carrying its parent session's test_type and
// version fields (test_type for the QUICK/DEEP badge, algorithm_version +
// question_set_version so the UI can tell whether two results are safe to
// compare score-for-score — see SkinHistory.jsx). Past QUICK results are
// never dropped — this simply returns everything the member's RLS policy
// allows them to see.
export async function fetchSkinHistory(userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('diagnosis_results')
    .select('*, session:diagnosis_sessions(session_id, test_type, status, started_at, completed_at, algorithm_version, question_set_version)')
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
