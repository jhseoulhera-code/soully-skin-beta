import { TYPE_AXES } from './questions.js'

// Pure, framework-free port of the scoring/type-determination logic that
// used to live inline in App.jsx's `analysis` useMemo. This is a
// reorganization only — the math is byte-for-byte the same as before (see
// the "algorithm V1.0 prep" test suite that diffs this against the
// pre-refactor implementation for the full 44-question set). Extracted so
// it's independently testable and so App.jsx doesn't need to know how
// scoring works, only that it does.
//
// weightTotal is the sum of each answered question's type_weight (default
// 1), not a plain count — a weight-1.5 "anchor" question counts for 1.5x as
// much of the axis's -3..+3 range on both sides of the average.
export function pct(weightedSum, weightTotal) {
  if (!weightTotal) return 50
  const max = weightTotal * 3
  return Math.max(0, Math.min(100, Math.round(((weightedSum + max) / (max * 2)) * 100)))
}

// `answers` is keyed by question id (see the id/stable-identifier note at
// the top of src/questions.js) — NOT by question text, so editing a
// question's wording never breaks matching against in-progress or stored
// answers.
//
// Only scale_type 'bipolar_4' (TYPE) and the STATE ordinal_3/ordinal_4
// questions are actually scored here, exactly as before. multi_select and
// numeric_0_10 questions are intentionally excluded from axis scoring for
// now (skipped, like an unanswered question) — no scoring formula exists
// for them yet, and introducing one is explicitly out of scope for this
// pass. The current question bank has zero questions of those types, so
// this exclusion has no effect on today's results; it only guards against a
// future multi_select/numeric_0_10 question silently corrupting `sums`/
// `weather` (e.g. `q.options[picked]` throwing if `picked` were an array)
// before real scoring support for those types is designed.
export function computeAnalysis(activeQuestions, answers) {
  const sums = {}, weights = {}
  TYPE_AXES.forEach(k => { sums[k] = 0; weights[k] = 0 })
  const weather = {}
  const tags = {}

  activeQuestions.forEach(q => {
    if (q.scale_type === 'multi_select' || q.scale_type === 'numeric_0_10') return
    const picked = answers[q.id]
    if (picked === undefined) return
    const opt = q.options[picked]
    if (!opt) return
    if (q.state) {
      weather[q.axis] = opt.score
    } else if (sums[q.axis] !== undefined) {
      const w = q.type_weight || 1
      sums[q.axis] += opt.score * w
      weights[q.axis] += w
      if (q.id) tags[q.id] = opt.score
    }
  })

  const p = {}
  TYPE_AXES.forEach(k => { p[k] = pct(sums[k], weights[k]) })

  const type16 = (p.OD >= 50 ? 'O' : 'D') + (p.SR >= 50 ? 'S' : 'R') + (p.PN >= 50 ? 'P' : 'N') + (p.WT >= 50 ? 'W' : 'T')
  // type64 only exists once CB/HQ were actually asked (DEEP mode) — QUICK
  // never measures those two axes, so it never gets a real 64-code. CB/HQ
  // stay an explicit check (not derived from question metadata) since this
  // encodes an actual scoring rule — which axes gate the 64-code — not just
  // a duplicated axis list.
  const hasDeepAxes = weights.CB > 0 && weights.HQ > 0
  const type64 = hasDeepAxes ? type16 + (p.CB >= 50 ? 'C' : 'B') + (p.HQ >= 50 ? 'H' : 'Q') : null
  // Per policy: a user who has both a 16 and a 64 result uses the 64 result
  // as their representative code.
  const primaryType = type64 || type16

  return { p, type16, type64, primaryType, weather, tags }
}
