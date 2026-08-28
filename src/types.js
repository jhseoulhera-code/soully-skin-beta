// Shared constants + JSDoc shape definitions for the anonymous diagnosis
// tracking tables (supabase-migration-diagnosis-tracking.sql). This project
// is plain JS (no TypeScript toolchain), so these are documentation/editor
// hints rather than compiler-checked types.

export const TEST_TYPE = { QUICK: 'QUICK', DEEP: 'DEEP' }

export const SESSION_STATUS = { STARTED: 'started', COMPLETED: 'completed', ABANDONED: 'abandoned' }

// Bumped only when the score calculation itself changes — untouched by this
// change, so this stays the same version string already used by submitLead
// in src/supabase.js.
export const ALGORITHM_VERSION = 'v3.3'

// Matches the "Question bank v4.0" header comment in src/questions.js.
export const QUESTION_SET_VERSION = 'v4.0'

export const RESULT_VERSION = 'v1'

// A question's scale_type (src/questions.js). Descriptive metadata only —
// see src/scoring.js's computeAnalysis() for exactly which of these are
// actually scored today (bipolar_4 and the STATE ordinal_3/ordinal_4
// questions) versus structurally supported but not yet scored
// (multi_select, numeric_0_10 — no current question uses either).
export const SCALE_TYPE = {
  BIPOLAR_4: 'bipolar_4',
  ORDINAL_3: 'ordinal_3',
  ORDINAL_4: 'ordinal_4',
  LIKERT_5: 'likert_5',
  NUMERIC_0_10: 'numeric_0_10',
  CATEGORICAL: 'categorical',
  MULTI_SELECT: 'multi_select'
}

/**
 * @typedef {Object} Visitor
 * @property {string} id
 * @property {string} visitor_id auth.uid() of this browser's Supabase Auth
 *   session (anonymous or real — see ensureIdentity in src/auth.jsx), not a
 *   client-generated value. Doubles as the FK ownership column every RLS
 *   policy checks against.
 * @property {string} created_at
 * @property {string|null} first_source
 * @property {string|null} first_campaign
 * @property {'mobile'|'tablet'|'desktop'|'unknown'|null} device_type
 */

/**
 * @typedef {Object} DiagnosisSession
 * @property {string} id
 * @property {string} session_id
 * @property {string} visitor_id The row's true owner (= auth.uid() at
 *   creation, anonymous or real) — this is what RLS checks, and it never
 *   changes after creation.
 * @property {string|null} user_id Nullable "this is a real, signed-up
 *   member" marker, filled in by markVisitorAsMember() once the visitor
 *   converts. NOT used for access control — only for MY SKIN HISTORY /
 *   analytics filtering (e.g. WHERE user_id = ...).
 * @property {'QUICK'|'DEEP'} test_type
 * @property {'started'|'completed'|'abandoned'} status
 * @property {string|null} current_question
 * @property {string} started_at
 * @property {string|null} completed_at
 * @property {string|null} utm_source
 * @property {string|null} utm_medium
 * @property {string|null} utm_campaign
 * @property {string|null} utm_content
 * @property {string|null} algorithm_version
 * @property {string|null} question_set_version
 */

/**
 * @typedef {Object} DiagnosisAnswer
 * @property {string} id
 * @property {string} session_id
 * @property {string} question_id Matches questions.js's `id` (was `tag`
 *   before the algorithm-V1.0-prep data model pass) — never the question's
 *   `text`, so editing wording never breaks matching against stored answers.
 * @property {number|null} answer_value Single-value scale_types
 *   (bipolar_4/ordinal_3/ordinal_4/likert_5/numeric_0_10) only.
 * @property {string|null} answer_label
 * @property {number|null} option_index
 * @property {Array<string|number>|null} answer_values multi_select only —
 *   the selected options (as an array), independent of answer_value/
 *   answer_label/option_index which stay null for a multi-select row. No
 *   current question uses scale_type 'multi_select' yet.
 * @property {number|null} response_time_ms
 * @property {string} answered_at
 * @property {string|null} question_version
 */

/**
 * @typedef {Object} QuestionDefinition
 * @property {string} id
 * @property {string} question_id
 * @property {string} question_version
 * @property {string} text
 * @property {string} scale_type One of SCALE_TYPE's values.
 * @property {string|null} axis
 * @property {number|null} type_weight
 * @property {number|null} state_weight
 * @property {boolean} reverse_scored
 * @property {Array<{label:string,score:number|null}>} options_json
 * @property {string} created_at
 */

/**
 * @typedef {Object} DiagnosisResult
 * @property {string} id
 * @property {string} session_id
 * @property {string|null} user_id Same nullable "real member" marker as on
 *   DiagnosisSession — not an access-control column.
 * @property {number|null} oil_score
 * @property {number|null} hydration_score
 * @property {number|null} sensitivity_score
 * @property {number|null} barrier_score
 * @property {number|null} acne_score
 * @property {number|null} pigmentation_score
 * @property {number|null} aging_score
 * @property {number|null} pore_score
 * @property {number|null} tone_score
 * @property {number|null} heat_score
 * @property {string|null} skin_type
 * @property {string|null} skin_type_16
 * @property {string|null} skin_type_64
 * @property {string|null} top_concern_1
 * @property {string|null} top_concern_2
 * @property {string|null} top_concern_3
 * @property {string|null} result_version
 * @property {string} created_at
 */
