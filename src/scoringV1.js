import { TYPE_AXES_V1, STATE_AXES_V1 } from './questionsV1.js'

// Skin Diagnosis V1.0 scoring — a separate, pure module from src/scoring.js
// (v4.0's computeAnalysis, left byte-for-byte untouched). Normalization
// rules and weighting are per the confirmed V1.0 spec:
//
//   likert_5:      1->0, 2->25, 3->50, 4->75, 5->100
//   ordinal_4:     1->0, 2->33.333.., 3->66.666.., 4->100
//   numeric_0_10:  value*10
//   multi_select:  never scored (validation_only, self-awareness check only)
//
// An option flagged `na: true` (e.g. "사용 경험 없음" / "잘 모르겠어요") is
// excluded from BOTH the numerator and the denominator of its axis — it is
// never treated as a 0/worst-case answer. type_weight is 1.0 for every
// TYPE question in this initial version (anchor questions carry
// `anchor: true` metadata only; that flag is intentionally not read here).
export function normalizeAnswer(scaleType, rawValue) {
  if (rawValue === null || rawValue === undefined) return null
  switch (scaleType) {
    case 'likert_5': return (rawValue - 1) * 25
    case 'ordinal_4': return (rawValue - 1) * (100 / 3)
    case 'numeric_0_10': return rawValue * 10
    default: return null // multi_select and anything else: not scored
  }
}

function letterFor(score, highLetter, lowLetter) {
  if (score === null || score === undefined) return null
  return score >= 50 ? highLetter : lowLetter
}

const TYPE_LETTERS = {
  OD: ['O', 'D'],
  SR: ['S', 'R'],
  PN: ['P', 'N'],
  WT: ['W', 'T'],
  BG: ['B', 'G'],
  AC: ['A', 'C']
}

// `answers` is keyed by question id -> selected option index (single-select)
// or an array of indices (multi_select, e.g. q48) — array-valued answers are
// simply never scored (see the scale_type==='multi_select' guard below),
// matching how validation_only questions are excluded regardless of answer
// shape.
export function computeAnalysisV1(activeQuestions, answers) {
  const typeSums = {}, typeWeights = {}
  TYPE_AXES_V1.forEach(k => { typeSums[k] = 0; typeWeights[k] = 0 })
  const stateSums = {}, stateWeights = {}
  STATE_AXES_V1.forEach(k => { stateSums[k] = 0; stateWeights[k] = 0 })

  activeQuestions.forEach(q => {
    if (q.validation_only || q.scale_type === 'multi_select') return
    const picked = answers[q.id]
    if (picked === undefined || picked === null || Array.isArray(picked)) return
    const opt = q.options[picked]
    if (!opt || opt.na) return // N/A: excluded from numerator AND denominator, never scored as 0

    const normalized = normalizeAnswer(q.scale_type, opt.score)
    if (normalized === null) return

    if (q.state) {
      if (stateSums[q.axis] === undefined) return
      const w = q.state_weight || 1
      stateSums[q.axis] += normalized * w
      stateWeights[q.axis] += w
    } else {
      if (typeSums[q.axis] === undefined) return
      const w = q.type_weight || 1
      typeSums[q.axis] += normalized * w
      typeWeights[q.axis] += w
    }
  })

  const p = {}
  TYPE_AXES_V1.forEach(k => {
    p[k] = typeWeights[k] > 0 ? Math.round(typeSums[k] / typeWeights[k]) : null
  })

  const state = {}
  STATE_AXES_V1.forEach(k => {
    state[k] = stateWeights[k] > 0 ? Math.round(stateSums[k] / stateWeights[k]) : null
  })

  const letters = {}
  TYPE_AXES_V1.forEach(k => { letters[k] = letterFor(p[k], TYPE_LETTERS[k][0], TYPE_LETTERS[k][1]) })

  const quickAxes = ['OD', 'SR', 'PN', 'WT']
  const type16 = quickAxes.every(k => letters[k]) ? quickAxes.map(k => letters[k]).join('') : null
  const type64 = (type16 && letters.BG && letters.AC) ? type16 + letters.BG + letters.AC : null
  const primaryType = type64 || type16

  return { p, state, type16, type64, primaryType }
}
