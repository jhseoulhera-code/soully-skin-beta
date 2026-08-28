// Skin Diagnosis V1.0 — structural + scoring regression checks.
// Plain Node, no test framework (matches this repo's existing tooling,
// which has none). Run with: node scripts/testSkinV1.mjs
import assert from 'node:assert/strict'
import { questionsV1, chaptersV1, TYPE_AXES_V1, STATE_AXES_V1 } from '../src/questionsV1.js'
import { computeAnalysisV1, normalizeAnswer } from '../src/scoringV1.js'
import { applyMultiSelect } from '../src/multiSelect.js'

let passed = 0
function check(name, fn) {
  try {
    fn()
    passed++
    console.log(`ok - ${name}`)
  } catch (e) {
    console.error(`FAIL - ${name}`)
    console.error(e)
    process.exitCode = 1
  }
}

const quickQs = questionsV1.filter(q => q.modes.includes('quick'))
const deepQs = questionsV1.filter(q => q.modes.includes('deep'))

check('QUICK is exactly 16 questions', () => {
  assert.equal(quickQs.length, 16)
})

check('DEEP is exactly 48 questions', () => {
  assert.equal(deepQs.length, 48)
})

check('all 16 QUICK questions are included in DEEP', () => {
  const deepIds = new Set(deepQs.map(q => q.id))
  quickQs.forEach(q => assert.ok(deepIds.has(q.id), `${q.id} missing from DEEP`))
})

check('axis counts match the confirmed structure', () => {
  const count = (pred) => deepQs.filter(pred).length
  assert.equal(count(q => q.axis === 'OD' && !q.state), 8, 'OD')
  assert.equal(count(q => q.axis === 'SR' && !q.state), 8, 'SR')
  assert.equal(count(q => q.axis === 'PN' && !q.state), 8, 'PN')
  assert.equal(count(q => q.axis === 'WT' && !q.state), 8, 'WT')
  assert.equal(count(q => q.axis === 'BG' && !q.state), 4, 'BG')
  assert.equal(count(q => q.axis === 'AC' && !q.state), 4, 'AC')
  assert.equal(count(q => q.state === true), 7, 'STATE')
  assert.equal(count(q => q.validation_only === true), 1, 'validation')
})

check('QUICK is OD4+SR4+PN4+WT4 only (no BG/AC/STATE/validation)', () => {
  const axes = new Set(quickQs.map(q => q.axis))
  assert.deepEqual([...axes].sort(), ['OD', 'PN', 'SR', 'WT'])
  assert.equal(quickQs.filter(q => q.state).length, 0)
  assert.equal(quickQs.filter(q => q.validation_only).length, 0)
})

check('N/A questions are exactly q14, q21, q22, q36, q39', () => {
  const naIds = questionsV1
    .filter(q => q.options.some(o => o.na))
    .map(q => q.id)
    .sort()
  assert.deepEqual(naIds, ['skin_v1_q14', 'skin_v1_q21', 'skin_v1_q22', 'skin_v1_q36', 'skin_v1_q39'])
})

check('numeric_0_10 questions are exactly q41, q43, q45', () => {
  const ids = questionsV1.filter(q => q.scale_type === 'numeric_0_10').map(q => q.id).sort()
  assert.deepEqual(ids, ['skin_v1_q41', 'skin_v1_q43', 'skin_v1_q45'])
})

check('q42/q44/q46/q47 are likert_5, not numeric_0_10', () => {
  ;['skin_v1_q42', 'skin_v1_q44', 'skin_v1_q46', 'skin_v1_q47'].forEach(id => {
    const q = questionsV1.find(x => x.id === id)
    assert.equal(q.scale_type, 'likert_5', id)
  })
})

check('q11 is ordinal_4', () => {
  const q = questionsV1.find(x => x.id === 'skin_v1_q11')
  assert.equal(q.scale_type, 'ordinal_4')
  assert.equal(q.options.length, 4)
})

check('q48 is multi_select, validation_only, capped at 2', () => {
  const q = questionsV1.find(x => x.id === 'skin_v1_q48')
  assert.equal(q.scale_type, 'multi_select')
  assert.equal(q.validation_only, true)
  assert.equal(q.multiSelectMax, 2)
})

check('every TYPE question has type_weight === 1 in this initial version', () => {
  questionsV1.filter(q => !q.state && !q.validation_only).forEach(q => {
    assert.equal(q.type_weight, 1, `${q.id} type_weight`)
  })
})

check('anchor metadata is preserved on q33/q37 without affecting weight', () => {
  const bgAnchor = questionsV1.find(q => q.id === 'skin_v1_q33')
  const acAnchor = questionsV1.find(q => q.id === 'skin_v1_q37')
  assert.equal(bgAnchor.anchor, true)
  assert.equal(bgAnchor.type_weight, 1)
  assert.equal(acAnchor.anchor, true)
  assert.equal(acAnchor.type_weight, 1)
})

check('every question_version is skin_v1.0', () => {
  questionsV1.forEach(q => assert.equal(q.question_version, 'skin_v1.0', q.id))
})

check('every chapter referenced by a question exists in chaptersV1', () => {
  const chapterIds = new Set(chaptersV1.map(c => c.id))
  questionsV1.forEach(q => assert.ok(chapterIds.has(q.chapter), `${q.id} -> ${q.chapter}`))
})

check('normalizeAnswer: likert_5 mapping', () => {
  assert.equal(normalizeAnswer('likert_5', 1), 0)
  assert.equal(normalizeAnswer('likert_5', 2), 25)
  assert.equal(normalizeAnswer('likert_5', 3), 50)
  assert.equal(normalizeAnswer('likert_5', 4), 75)
  assert.equal(normalizeAnswer('likert_5', 5), 100)
})

check('normalizeAnswer: ordinal_4 mapping', () => {
  assert.equal(normalizeAnswer('ordinal_4', 1), 0)
  assert.ok(Math.abs(normalizeAnswer('ordinal_4', 2) - 33.333) < 0.01)
  assert.ok(Math.abs(normalizeAnswer('ordinal_4', 3) - 66.667) < 0.01)
  assert.equal(normalizeAnswer('ordinal_4', 4), 100)
})

check('normalizeAnswer: numeric_0_10 mapping', () => {
  for (let v = 0; v <= 10; v++) assert.equal(normalizeAnswer('numeric_0_10', v), v * 10)
})

// ---- computeAnalysisV1 behavioral checks ----

function answerAllBest(questions) {
  const answers = {}
  questions.forEach(q => {
    if (q.scale_type === 'multi_select') return
    // pick the highest non-NA option (last non-na option, since options are
    // ordered low-problem -> high-problem per the spec)
    let idx = q.options.length - 1
    while (idx >= 0 && q.options[idx].na) idx--
    answers[q.id] = idx
  })
  return answers
}

check('QUICK: all axes 0-100, type16 generated from 4 letters', () => {
  const answers = answerAllBest(quickQs)
  const analysis = computeAnalysisV1(quickQs, answers)
  ;['OD', 'SR', 'PN', 'WT'].forEach(k => {
    assert.ok(analysis.p[k] >= 0 && analysis.p[k] <= 100, `${k}=${analysis.p[k]}`)
  })
  assert.equal(analysis.p.BG, null)
  assert.equal(analysis.p.AC, null)
  assert.match(analysis.type16, /^[ODSRPNWT]{4}$/)
  assert.equal(analysis.type64, null, 'QUICK never produces type64')
  assert.equal(analysis.primaryType, analysis.type16)
})

check('DEEP: all 6 TYPE axes 0-100, type64 generated from 6 letters, STATE has 7 scores 0-100', () => {
  const answers = answerAllBest(deepQs)
  const analysis = computeAnalysisV1(deepQs, answers)
  TYPE_AXES_V1.forEach(k => {
    assert.ok(analysis.p[k] >= 0 && analysis.p[k] <= 100, `${k}=${analysis.p[k]}`)
  })
  assert.match(analysis.type64, /^[ODSRPNWTBGAC]{6}$/)
  assert.equal(analysis.type64.slice(0, 4), analysis.type16)
  assert.equal(analysis.primaryType, analysis.type64)
  STATE_AXES_V1.forEach(k => {
    assert.ok(analysis.state[k] >= 0 && analysis.state[k] <= 100, `state.${k}=${analysis.state[k]}`)
  })
  assert.equal(Object.keys(analysis.state).length, 7)
})

check('best-case answers (all worst-problem option) push every axis to exactly 100', () => {
  const answers = answerAllBest(deepQs)
  const analysis = computeAnalysisV1(deepQs, answers)
  TYPE_AXES_V1.forEach(k => assert.equal(analysis.p[k], 100, k))
})

check('N/A answers are excluded from BOTH numerator and denominator (never scored as 0)', () => {
  const srQuestions = deepQs.filter(q => q.axis === 'SR')
  const withoutNA = answerAllBest(srQuestions)
  const baseline = computeAnalysisV1(srQuestions, withoutNA)
  assert.equal(baseline.p.SR, 100)

  // Now answer q21 and q22 (the two N/A-capable SR questions) with their
  // N/A option instead of the worst-problem option, keep every other SR
  // question at worst-problem.
  const withNA = { ...withoutNA }
  const q21 = srQuestions.find(q => q.id === 'skin_v1_q21')
  const q22 = srQuestions.find(q => q.id === 'skin_v1_q22')
  withNA[q21.id] = q21.options.findIndex(o => o.na)
  withNA[q22.id] = q22.options.findIndex(o => o.na)
  const withNAResult = computeAnalysisV1(srQuestions, withNA)
  // If N/A were wrongly scored as 0, this would drag SR well below 100.
  // Correct behavior: SR stays 100 because the remaining answered,
  // non-NA questions are still all worst-problem.
  assert.equal(withNAResult.p.SR, 100, 'N/A must not be scored as 0')
})

check('an unanswered (not just N/A) question is also excluded from the denominator', () => {
  const srQuestions = deepQs.filter(q => q.axis === 'SR')
  const answers = answerAllBest(srQuestions)
  delete answers['skin_v1_q24'] // simulate "not answered"
  const analysis = computeAnalysisV1(srQuestions, answers)
  assert.equal(analysis.p.SR, 100)
})

check('q48 (multi_select/validation_only) never contributes to any axis', () => {
  const q48 = questionsV1.find(q => q.id === 'skin_v1_q48')
  const answers = answerAllBest(deepQs.filter(q => q.id !== 'skin_v1_q48'))
  answers[q48.id] = [0, 1]
  const withAnswer = computeAnalysisV1(deepQs, answers)
  const without = computeAnalysisV1(deepQs, { ...answers, [q48.id]: undefined })
  assert.deepEqual(withAnswer.p, without.p)
  assert.deepEqual(withAnswer.state, without.state)
})

// ---- applyMultiSelect (q48 max-2 cap) ----

check('applyMultiSelect: selecting up to max is allowed', () => {
  let picked = []
  picked = applyMultiSelect(picked, 0, 2)
  picked = applyMultiSelect(picked, 3, 2)
  assert.deepEqual(picked, [0, 3])
})

check('applyMultiSelect: a 3rd selection beyond max is ignored', () => {
  const picked = applyMultiSelect([0, 3], 5, 2)
  assert.deepEqual(picked, [0, 3])
})

check('applyMultiSelect: deselecting always works, even at the cap', () => {
  const picked = applyMultiSelect([0, 3], 0, 2)
  assert.deepEqual(picked, [3])
})

check('applyMultiSelect: uncapped (no max) behaves as before', () => {
  let picked = []
  picked = applyMultiSelect(picked, 0)
  picked = applyMultiSelect(picked, 1)
  picked = applyMultiSelect(picked, 2)
  assert.deepEqual(picked, [0, 1, 2])
})

console.log(`\n${passed} checks passed.`)
if (process.exitCode) {
  console.error('\nSome checks FAILED.')
  process.exit(1)
}
