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

/**
 * @typedef {Object} Visitor
 * @property {string} id
 * @property {string} visitor_id
 * @property {string} created_at
 * @property {string|null} first_source
 * @property {string|null} first_campaign
 * @property {'mobile'|'tablet'|'desktop'|'unknown'|null} device_type
 */

/**
 * @typedef {Object} DiagnosisSession
 * @property {string} id
 * @property {string} session_id
 * @property {string} visitor_id
 * @property {string|null} user_id
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
 * @property {string} question_id
 * @property {number|null} answer_value
 * @property {string|null} answer_label
 * @property {number|null} option_index
 * @property {number|null} response_time_ms
 * @property {string} answered_at
 * @property {string|null} question_version
 */

/**
 * @typedef {Object} DiagnosisResult
 * @property {string} id
 * @property {string} session_id
 * @property {string|null} user_id
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
