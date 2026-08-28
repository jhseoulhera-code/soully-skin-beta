// Generates the question_definitions INSERT statement for Skin Diagnosis
// V1.0's 48 questions directly from src/questionsV1.js — same pattern as
// supabase-migration-question-data-model.sql's existing v4.0 seed ("not
// hand-transcribed", so the SQL is byte-identical to what actually ships).
//
// Usage: node scripts/generateSkinV1QuestionDefinitionsSql.mjs
// Paste the output into supabase-migration-skin-v1-questions.sql.
import { questionsV1 } from '../src/questionsV1.js'

function sqlString(s) {
  if (s === null || s === undefined) return 'null'
  return `'${String(s).replace(/'/g, "''")}'`
}

function sqlNumber(n) {
  return n === null || n === undefined ? 'null' : String(n)
}

function optionsJson(options) {
  const json = JSON.stringify(options.map(o => ({
    label: o.label,
    score: o.score,
    ...(o.na ? { na: true } : {})
  })))
  return `'${json.replace(/'/g, "''")}'::jsonb`
}

const rows = questionsV1.map(q => {
  const axis = q.state ? q.axis : q.axis // same field either way; kept explicit for readability
  return `  (${sqlString(q.id)}, ${sqlString(q.question_version)}, ${sqlString(q.text)}, ${sqlString(q.scale_type)}, ${sqlString(axis)}, ${sqlNumber(q.type_weight)}, ${sqlNumber(q.state_weight)}, ${q.reverse_scored ? 'true' : 'false'}, ${optionsJson(q.options)})`
})

const sql = `insert into public.question_definitions
  (question_id, question_version, text, scale_type, axis, type_weight, state_weight, reverse_scored, options_json)
values
${rows.join(',\n')}
on conflict (question_id, question_version) do nothing;
`

console.log(sql)
