// Skin Diagnosis V1.0 — confirmed 48-question bank (question_version:
// 'skin_v1.0'). Fully additive alongside src/questions.js's v4.0 bank
// (untouched) — see README's "Skin Diagnosis V1.0" section for how the two
// coexist (separate question_set_version/algorithm_version tag on
// diagnosis_sessions, separate scoring in src/scoringV1.js, separate result
// columns in diagnosis_results).
//
// QUICK 16 (mode "quick"): 4 axes (OD/SR/PN/WT), 16 questions -> type16.
// DEEP  48 (mode "deep"):  6 axes (OD/SR/PN/WT/BG/AC), same 16 + 32 more —
//   OD/SR/PN/WT +4 each, BG +4, AC +4 (32 TYPE questions total), plus 7
//   STATE questions ("오늘의 피부 컨디션") and 1 validation-only multi-select
//   self-check question -> type64.
//
// Question text and options are FINAL/CONFIRMED — do not reword or reorder
// options. The only two questions that differ from the very first draft the
// user reviewed are q21/q22 (SR: 각질 제거제 / 고기능성 성분 반응, replacing
// a deleted "향이 강한 화장품" question and a since-split combined question)
// and q27/q28 (PN, reworded per the user's final revision pass).
//
// `id` is the ONLY stable identifier (matches src/questions.js's own
// id-not-text convention) — diagnosis_answers.question_id and
// question_definitions.question_id both key off this, never off `text`.
//
// Field meanings mirror src/questions.js's data model exactly:
//   axis            OD/SR/PN/WT/BG/AC for TYPE questions; one of
//                   hydration/pore/texture/tone/heat_redness/
//                   current_sensitivity/current_acne for STATE questions;
//                   'self_awareness' for the validation-only question.
//   state           true for the 7 STATE questions (scored separately from
//                   TYPE, never folded into type16/type64) — same meaning
//                   as v4.0's `state` flag.
//   modes           QD = asked in both quick and deep; D = deep-only.
//   scale_type      'likert_5' | 'ordinal_4' | 'numeric_0_10' | 'multi_select'
//                   — see src/scoringV1.js for the exact normalization each
//                   maps to.
//   type_weight     1 for every TYPE question in this initial version — no
//                   anchor gets extra weight yet (see requirement: "V1.0
//                   초기 TYPE 가중치는 전부 1.0"). `anchor: true` below is
//                   metadata only, preserved for a future statistically-
//                   validated weighting pass; it does not affect scoring.
//   state_weight    1 for every STATE question; null on TYPE/validation.
//   validation_only true only for q48 — excluded from both TYPE and STATE
//                   scoring entirely (see scoringV1.js).
//   multiSelectMax  only set on q48 — caps how many options chooseMulti()
//                   in App.jsx will let a visitor pick.
//
// Each option is `{ label, score }`; an option that represents "사용 경험
// 없음" / "잘 모르겠어요" also carries `na: true` — src/scoringV1.js
// excludes an na option from BOTH numerator and denominator for its axis
// (never treated as a 0/worst-case answer). `score` is the raw ordinal
// value the option represents (1..5 for likert_5, 1..4 for ordinal_4, 0..10
// for numeric_0_10) — normalization into 0..100 happens in scoringV1.js,
// never here.
// ---------------------------------------------------------------------------

export const QUESTION_VERSION_V1 = 'skin_v1.0'
export const ALGORITHM_VERSION_V1 = 'skin_v1.0'

export const TYPE_AXES_V1 = ['OD', 'SR', 'PN', 'WT', 'BG', 'AC']
export const STATE_AXES_V1 = ['hydration', 'pore', 'texture', 'tone', 'heat_redness', 'current_sensitivity', 'current_acne']

export const chaptersV1 = [
  { id: 'v1_od', title: '피지와 유분', label: 'OD · 유분 성향', emoji: '💧', accent: '#B9D6F2', soft: '#F0F7FF', deep: '#5E93C7', intro: '평소 유분이 얼마나, 얼마나 빨리 올라오는지 살펴봐요.' },
  { id: 'v1_sr', title: '민감·반응성', label: 'SR · 자극에 반응하는 정도', emoji: '🌿', accent: '#F2C9C2', soft: '#FFF3F1', deep: '#C97F72', intro: '새 성분이나 환경 변화에 피부가 얼마나 쉽게 반응하는지 봐요.' },
  { id: 'v1_pn', title: '색소와 흔적', label: 'PN · 흔적이 남는 성향', emoji: '🌗', accent: '#E3C6EA', soft: '#FAF3FC', deep: '#9C6FB0', intro: '자극이나 햇빛 뒤 흔적·톤 변화가 얼마나 오래가는지 확인해요.' },
  { id: 'v1_wt', title: '탄력과 주름', label: 'WT · 잔선·탄력 변화', emoji: '🍃', accent: '#CBDFC0', soft: '#F5FAF2', deep: '#7FA468', intro: '표정을 짓지 않을 때도 남는 잔선과 탄력 변화를 살펴봐요.' },
  { id: 'v1_bg', title: '자극 후 회복', label: 'BG · 자극 후 유지·회복', emoji: '⏳', accent: '#F2DDA6', soft: '#FFF9EC', deep: '#B98F3E', intro: '한 번 자극을 받은 뒤 원래 상태로 돌아오는 속도를 봐요.' },
  { id: 'v1_ac', title: '트러블 반복', label: 'AC · 반복 트러블 성향', emoji: '🔁', accent: '#F2B8C4', soft: '#FFF0F4', deep: '#C15E76', intro: '같은 자리에 트러블이 얼마나 자주 되풀이되는지 확인해요.' },
  { id: 'v1_state', title: '오늘의 피부 컨디션', label: 'STATE · 최근 컨디션', emoji: '📍', accent: '#C7D3EE', soft: '#F3F6FC', deep: '#6E7FB0', intro: '타입과 별개로, 최근 며칠의 컨디션을 따로 기록해둘게요.' },
  { id: 'v1_validation', title: '마지막 확인', label: '자기 인식 체크', emoji: '✔️', accent: '#D9D3EE', soft: '#F7F5FC', deep: '#8A7DB8', intro: '마지막으로 요즘 가장 신경 쓰이는 고민을 알려주세요.' }
]

const QD = ['quick', 'deep']
const D = ['deep']

export const questionsV1 = [
  // ================= OD — QUICK 4 + DEEP 4 =================
  {
    id: 'skin_v1_q01', chapter: 'v1_od', axis: 'OD', state: false, modes: QD,
    scale_type: 'likert_5', time_reference: 'recent_1m', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '세안 후 아무것도 바르지 않고 10분이 지나면, T존(이마·코)에 유분이 다시 느껴지기 시작하나요?',
    options: [
      { label: '거의 느껴지지 않는다', score: 1 },
      { label: '드물게 느껴진다', score: 2 },
      { label: '가끔 느껴진다', score: 3 },
      { label: '자주 느껴진다', score: 4 },
      { label: '세안 직후부터 금방 느껴진다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q02', chapter: 'v1_od', axis: 'OD', state: false, modes: QD,
    scale_type: 'likert_5', time_reference: 'recent_1m', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '오후가 되면 화장이 밀리거나 유분막이 느껴져 기름종이·블러팅이 필요한 편인가요?',
    options: [
      { label: '거의 없다', score: 1 },
      { label: '드물게 있다', score: 2 },
      { label: '가끔 있다', score: 3 },
      { label: '자주 있다', score: 4 },
      { label: '매일 필요하다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q03', chapter: 'v1_od', axis: 'OD', state: false, modes: QD,
    scale_type: 'likert_5', time_reference: 'recent_1m', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '이마·코뿐 아니라 볼(뺨)에서도 기름기가 쉽게 올라오는 편인가요?',
    options: [
      { label: '거의 없다', score: 1 },
      { label: '드물게 있다', score: 2 },
      { label: '가끔 있다', score: 3 },
      { label: '자주 있다', score: 4 },
      { label: '항상 그렇다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q04', chapter: 'v1_od', axis: 'OD', state: false, modes: QD,
    scale_type: 'likert_5', time_reference: 'recent_1m', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '세안 후 아무 제품도 바르지 않았을 때, 얼마나 빨리 번들거리기 시작하나요?',
    options: [
      { label: '4시간 이상 지나야', score: 1 },
      { label: '2~4시간 후', score: 2 },
      { label: '1~2시간 후', score: 3 },
      { label: '30분~1시간 후', score: 4 },
      { label: '30분 이내', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q17', chapter: 'v1_od', axis: 'OD', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'hot_humid', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '덥고 습한 날에는 평소보다 얼굴 유분이 얼마나 증가하나요?',
    options: [
      { label: '거의 변하지 않는다', score: 1 },
      { label: '약간 늘어난다', score: 2 },
      { label: '어느 정도 늘어난다', score: 3 },
      { label: '확실히 늘어난다', score: 4 },
      { label: '매우 크게 늘어난다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q18', chapter: 'v1_od', axis: 'OD', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '볼보다 코·이마의 유분이 더 많은 편인가요?',
    options: [
      { label: '거의 차이가 없다', score: 1 },
      { label: '약간 차이가 있다', score: 2 },
      { label: '어느 정도 차이가 있다', score: 3 },
      { label: '확실히 차이가 난다', score: 4 },
      { label: 'T존과 볼의 차이가 매우 크다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q19', chapter: 'v1_od', axis: 'OD', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'sunscreen_day', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: '메이크업 여부와 관계없이 평소 선크림을 사용한 날을 기준으로 답해주세요.',
    text: '선크림이나 가벼운 기초제품을 바른 날 오후에 번들거림이 증가하나요?',
    options: [
      { label: '거의 없다', score: 1 },
      { label: '약간 있다', score: 2 },
      { label: '어느 정도 있다', score: 3 },
      { label: '자주 있다', score: 4 },
      { label: '매우 쉽게 번들거린다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q20', chapter: 'v1_od', axis: 'OD', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '세안 후 시간이 지나면서 유분이 다시 올라오는 속도는 어떤가요?',
    options: [
      { label: '매우 느리다', score: 1 },
      { label: '느린 편이다', score: 2 },
      { label: '보통이다', score: 3 },
      { label: '빠른 편이다', score: 4 },
      { label: '매우 빠르다', score: 5 }
    ]
  },

  // ================= SR — QUICK 4 + DEEP 4 =================
  {
    id: 'skin_v1_q05', chapter: 'v1_sr', axis: 'SR', state: false, modes: QD,
    scale_type: 'likert_5', time_reference: 'recent_3m', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '새로운 화장품을 사용한 뒤 따갑거나 화끈거리거나 붉어진 경험은 얼마나 자주 있나요?',
    options: [
      { label: '거의 없다', score: 1 },
      { label: '드물게 있다', score: 2 },
      { label: '가끔 있다', score: 3 },
      { label: '자주 있다', score: 4 },
      { label: '새로운 제품을 사용할 때 매우 자주 있다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q06', chapter: 'v1_sr', axis: 'SR', state: false, modes: QD,
    scale_type: 'likert_5', time_reference: 'friction', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: '피부를 문지르거나 닦은 직후의 반응을 떠올려주세요.',
    text: '마스크·수건·화장솜처럼 피부에 마찰이 생긴 뒤 붉거나 따가워지는 경우가 있나요?',
    options: [
      { label: '거의 없다', score: 1 },
      { label: '드물게 있다', score: 2 },
      { label: '가끔 있다', score: 3 },
      { label: '자주 있다', score: 4 },
      { label: '가벼운 마찰에도 쉽게 반응한다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q07', chapter: 'v1_sr', axis: 'SR', state: false, modes: QD,
    scale_type: 'likert_5', time_reference: 'temperature_change', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '추운 곳에서 따뜻한 실내로 들어가거나, 더운 곳에 있을 때 얼굴이 쉽게 붉어지거나 화끈거리나요?',
    options: [
      { label: '거의 없다', score: 1 },
      { label: '드물게 있다', score: 2 },
      { label: '가끔 있다', score: 3 },
      { label: '자주 있다', score: 4 },
      { label: '매우 쉽게 반응한다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q08', chapter: 'v1_sr', axis: 'SR', state: false, modes: QD,
    scale_type: 'likert_5', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: '평소 사용하는 세안 방법을 기준으로 답해주세요.',
    text: '세안 직후 얼굴이 붉어지거나 따갑게 느껴지는 경우가 있나요?',
    options: [
      { label: '거의 없다', score: 1 },
      { label: '드물다', score: 2 },
      { label: '가끔 있다', score: 3 },
      { label: '자주 있다', score: 4 },
      { label: '거의 매번 있다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q21', chapter: 'v1_sr', axis: 'SR', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'exfoliant_use', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: "해당 제품을 사용해본 적이 없다면 '사용 경험 없음'을 선택해주세요.",
    text: '스크럽·필링젤·AHA·BHA 같은 각질 제거제를 사용한 뒤, 피부에 따가움·화끈거림·붉어짐이 나타난 경험이 있나요?',
    options: [
      { label: '거의 없다', score: 1 },
      { label: '드물게 있다', score: 2 },
      { label: '가끔 있다', score: 3 },
      { label: '자주 있다', score: 4 },
      { label: '사용할 때마다 쉽게 나타나는 편이다', score: 5 },
      { label: '사용 경험 없음', score: null, na: true }
    ]
  },
  {
    id: 'skin_v1_q22', chapter: 'v1_sr', axis: 'SR', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'actives_use', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: "해당 제품을 사용해본 적이 없다면 '사용 경험 없음'을 선택해주세요.",
    text: '레티놀·비타민 C·고함량 나이아신아마이드 같은 고기능성 성분이 함유된 화장품을 사용한 뒤, 피부에 따가움·화끈거림·붉어짐이 나타난 경험이 있나요?',
    options: [
      { label: '거의 없다', score: 1 },
      { label: '드물게 있다', score: 2 },
      { label: '가끔 있다', score: 3 },
      { label: '자주 있다', score: 4 },
      { label: '사용할 때마다 쉽게 나타나는 편이다', score: 5 },
      { label: '사용 경험 없음', score: null, na: true }
    ]
  },
  {
    id: 'skin_v1_q23', chapter: 'v1_sr', axis: 'SR', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'cold_wind_aircon', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '찬바람이나 강한 에어컨 바람을 맞으면 피부가 따갑거나 붉어지는 경우가 있나요?',
    options: [
      { label: '거의 없다', score: 1 },
      { label: '드물다', score: 2 },
      { label: '가끔 있다', score: 3 },
      { label: '자주 있다', score: 4 },
      { label: '매우 쉽게 나타난다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q24', chapter: 'v1_sr', axis: 'SR', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'low_condition', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '피부 컨디션이 좋지 않은 날에는 평소 잘 사용하던 제품도 따갑게 느껴지나요?',
    options: [
      { label: '거의 없다', score: 1 },
      { label: '드물다', score: 2 },
      { label: '가끔 있다', score: 3 },
      { label: '자주 있다', score: 4 },
      { label: '거의 항상 그렇다', score: 5 }
    ]
  },

  // ================= PN — QUICK 4 + DEEP 4 =================
  {
    id: 'skin_v1_q09', chapter: 'v1_pn', axis: 'PN', state: false, modes: QD,
    scale_type: 'likert_5', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '트러블이 가라앉은 뒤 갈색 또는 어두운 흔적이 남는 편인가요?',
    options: [
      { label: '거의 남지 않는다', score: 1 },
      { label: '드물게 남는다', score: 2 },
      { label: '가끔 남는다', score: 3 },
      { label: '자주 남고 오래간다', score: 4 },
      { label: '대부분 진하게 남고 매우 오래간다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q10', chapter: 'v1_pn', axis: 'PN', state: false, modes: QD,
    scale_type: 'likert_5', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '벌레에 물리거나 긁힌 자리도 갈색 또는 어두운 흔적으로 남는 편인가요?',
    options: [
      { label: '거의 아니다', score: 1 },
      { label: '드물다', score: 2 },
      { label: '가끔 그렇다', score: 3 },
      { label: '자주 그렇다', score: 4 },
      { label: '매우 쉽게 오래 남는다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q11', chapter: 'v1_pn', axis: 'PN', state: false, modes: QD,
    scale_type: 'ordinal_4', time_reference: 'strong_uv_exposure', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '햇빛을 많이 받은 뒤 피부는 어느 쪽에 더 가까운가요?',
    options: [
      { label: '붉어졌다가 비교적 빨리 원래 색으로 돌아온다', score: 1 },
      { label: '붉어짐이 주로 나타나고 색 변화는 적다', score: 2 },
      { label: '붉어짐과 피부색 변화가 모두 나타난다', score: 3 },
      { label: '피부색이 쉽게 진해지고 오래간다', score: 4 }
    ]
  },
  {
    id: 'skin_v1_q12', chapter: 'v1_pn', axis: 'PN', state: false, modes: QD,
    scale_type: 'likert_5', time_reference: 'seasonal_change', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '여름이나 야외활동이 많은 시기가 지나면 잡티나 색소 흔적이 더 눈에 띄는 편인가요?',
    options: [
      { label: '거의 변화 없다', score: 1 },
      { label: '약간 그렇다', score: 2 },
      { label: '어느 정도 그렇다', score: 3 },
      { label: '확실히 그렇다', score: 4 },
      { label: '매우 뚜렷해진다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q25', chapter: 'v1_pn', axis: 'PN', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '트러블 자국이 주변 피부색과 비슷해질 때까지 오래 걸리는 편인가요?',
    options: [
      { label: '비교적 빨리 돌아온다', score: 1 },
      { label: '약간 오래 걸린다', score: 2 },
      { label: '보통이다', score: 3 },
      { label: '오래 걸린다', score: 4 },
      { label: '매우 오래 남는다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q26', chapter: 'v1_pn', axis: 'PN', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '광대나 볼처럼 햇빛을 많이 받는 부위에 갈색 흔적이나 잡티가 반복적으로 생기나요?',
    options: [
      { label: '거의 없다', score: 1 },
      { label: '드물다', score: 2 },
      { label: '가끔 있다', score: 3 },
      { label: '자주 있다', score: 4 },
      { label: '매우 쉽게 반복된다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q27', chapter: 'v1_pn', axis: 'PN', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'recent_months', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: '최근 몇 달 동안 긁힘, 작은 상처, 뾰루지가 아문 뒤 남은 색 변화를 기준으로 선택해주세요.',
    text: '가볍게 긁히거나 작은 뾰루지가 생긴 뒤, 피부가 아문 후에도 갈색 또는 어두운 흔적이 남는 경우가 있나요?',
    options: [
      { label: '거의 남지 않는다', score: 1 },
      { label: '드물게 남는다', score: 2 },
      { label: '가끔 남는다', score: 3 },
      { label: '자주 남고 오래간다', score: 4 },
      { label: '작은 자극에도 흔적이 진하고 오래 남는다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q28', chapter: 'v1_pn', axis: 'PN', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'after_sun_exposure', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: '최근 야외활동이나 햇빛 노출 후 피부톤이나 잡티 변화가 얼마나 오래 지속됐는지 떠올려 선택해주세요.',
    text: '햇빛을 많이 받은 뒤, 피부톤이 어두워지거나 잡티가 진해진 상태가 오래가는 편인가요?',
    options: [
      { label: '거의 변화가 없다', score: 1 },
      { label: '약간 변하지만 금방 돌아온다', score: 2 },
      { label: '어느 정도 진해지고 며칠간 남는다', score: 3 },
      { label: '눈에 띄게 진해지고 꽤 오래 남는다', score: 4 },
      { label: '피부톤 변화나 잡티가 매우 뚜렷하고 오래 지속된다', score: 5 }
    ]
  },

  // ================= WT — QUICK 4 + DEEP 4 =================
  {
    id: 'skin_v1_q13', chapter: 'v1_wt', axis: 'WT', state: false, modes: QD,
    scale_type: 'likert_5', time_reference: 'neutral_expression', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '표정을 짓지 않고 있을 때도 눈가나 입가에 가는 선이 보이나요?',
    options: [
      { label: '거의 없다', score: 1 },
      { label: '자세히 보면 약간 보인다', score: 2 },
      { label: '어느 정도 보인다', score: 3 },
      { label: '쉽게 눈에 띈다', score: 4 },
      { label: '선명하게 보인다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q14', chapter: 'v1_wt', axis: 'WT', state: false, modes: QD,
    scale_type: 'likert_5', time_reference: 'vs_2_3_years_ago', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: "비교가 어렵다면 '잘 모르겠어요'를 선택해주세요.",
    text: '2~3년 전과 비교해 볼이나 턱선이 덜 탄탄해졌다고 느끼나요?',
    options: [
      { label: '거의 변화 없다', score: 1 },
      { label: '약간 느껴진다', score: 2 },
      { label: '어느 정도 느껴진다', score: 3 },
      { label: '확실히 느껴진다', score: 4 },
      { label: '매우 크게 느껴진다', score: 5 },
      { label: '잘 모르겠어요', score: null, na: true }
    ]
  },
  {
    id: 'skin_v1_q15', chapter: 'v1_wt', axis: 'WT', state: false, modes: QD,
    scale_type: 'likert_5', time_reference: 'after_expression', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: '표정을 풀고 난 뒤의 피부를 기준으로 답해주세요.',
    text: '웃거나 표정을 지은 뒤 눈가나 입가의 선이 얼마나 오래 남아 있나요?',
    options: [
      { label: '거의 바로 사라진다', score: 1 },
      { label: '잠시 보이다 사라진다', score: 2 },
      { label: '어느 정도 남는다', score: 3 },
      { label: '꽤 오래 남는다', score: 4 },
      { label: '평소에도 선이 남아 있다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q16', chapter: 'v1_wt', axis: 'WT', state: false, modes: QD,
    scale_type: 'likert_5', time_reference: 'moisturized', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: '피부가 건조한 날이 아닌, 평소 보습한 상태를 기준으로 선택해주세요.',
    text: '충분히 보습한 상태에서도 눈가나 입가의 잔선이 눈에 띄나요?',
    options: [
      { label: '거의 없다', score: 1 },
      { label: '약간 보인다', score: 2 },
      { label: '어느 정도 보인다', score: 3 },
      { label: '꽤 눈에 띈다', score: 4 },
      { label: '매우 뚜렷하다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q29', chapter: 'v1_wt', axis: 'WT', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'vs_years_ago', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '팔자나 입가의 선이 몇 년 전보다 더 눈에 띄나요?',
    options: [
      { label: '거의 변화 없다', score: 1 },
      { label: '약간 그렇다', score: 2 },
      { label: '어느 정도 그렇다', score: 3 },
      { label: '확실히 그렇다', score: 4 },
      { label: '매우 크게 느껴진다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q30', chapter: 'v1_wt', axis: 'WT', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'vs_before', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '눈가에 가는 선이 보이는 범위가 예전보다 넓어진 것 같나요?',
    options: [
      { label: '거의 변화 없다', score: 1 },
      { label: '약간 그렇다', score: 2 },
      { label: '어느 정도 그렇다', score: 3 },
      { label: '확실히 그렇다', score: 4 },
      { label: '매우 그렇다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q31', chapter: 'v1_wt', axis: 'WT', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'morning_vs_evening', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: '하루 컨디션에 따른 변화가 아니라 반복적으로 느끼는 경우를 기준으로 답해주세요.',
    text: '아침과 저녁을 비교했을 때 저녁에 얼굴선이 더 처져 보이는 편인가요?',
    options: [
      { label: '거의 차이 없다', score: 1 },
      { label: '약간 차이 있다', score: 2 },
      { label: '어느 정도 차이 있다', score: 3 },
      { label: '확실히 차이 난다', score: 4 },
      { label: '매우 크게 차이 난다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q32', chapter: 'v1_wt', axis: 'WT', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'recent_years', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '최근 몇 년 사이 피부가 탄탄하게 받쳐주는 느낌이 줄었다고 느끼나요?',
    options: [
      { label: '거의 아니다', score: 1 },
      { label: '약간 그렇다', score: 2 },
      { label: '어느 정도 그렇다', score: 3 },
      { label: '확실히 그렇다', score: 4 },
      { label: '매우 그렇다', score: 5 }
    ]
  },

  // ================= BG — DEEP only, 4 questions (anchor: q33) =================
  {
    id: 'skin_v1_q33', chapter: 'v1_bg', axis: 'BG', state: false, modes: D, anchor: true,
    scale_type: 'likert_5', time_reference: 'recent_months', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: '최근 몇 달 동안 피부가 예민해졌던 경험을 떠올려주세요.',
    text: '피부 컨디션이 한 번 나빠지면 평소 편안한 상태로 돌아오는 데 얼마나 걸리나요?',
    options: [
      { label: '몇 시간 이내', score: 1 },
      { label: '하루 정도', score: 2 },
      { label: '2~3일', score: 3 },
      { label: '4~7일', score: 4 },
      { label: '일주일 이상 지속되는 경우가 있다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q34', chapter: 'v1_bg', axis: 'BG', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'after_moisturizer', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '보습제를 충분히 발라도 1~2시간 뒤 다시 피부가 당기거나 거칠게 느껴지나요?',
    options: [
      { label: '거의 없다', score: 1 },
      { label: '드물다', score: 2 },
      { label: '가끔 있다', score: 3 },
      { label: '자주 있다', score: 4 },
      { label: '거의 항상 그렇다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q35', chapter: 'v1_bg', axis: 'BG', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'after_cleansing', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '평소 사용하는 세안 후 피부가 거칠어지거나 하얗게 일어나는 경우가 있나요?',
    options: [
      { label: '거의 없다', score: 1 },
      { label: '드물다', score: 2 },
      { label: '가끔 있다', score: 3 },
      { label: '자주 있다', score: 4 },
      { label: '거의 매번 그렇다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q36', chapter: 'v1_bg', axis: 'BG', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'after_peeling', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: "해당 경험이 없다면 '경험 없음'을 선택해주세요.",
    text: '각질제거·필링·강한 세안 후 피부 불편감이 며칠 이상 지속되는 경우가 있나요?',
    options: [
      { label: '거의 없다', score: 1 },
      { label: '드물다', score: 2 },
      { label: '가끔 있다', score: 3 },
      { label: '자주 있다', score: 4 },
      { label: '자극 후 회복이 매우 느리다', score: 5 },
      { label: '경험 없음', score: null, na: true }
    ]
  },

  // ================= AC — DEEP only, 4 questions (anchor: q37) =================
  {
    id: 'skin_v1_q37', chapter: 'v1_ac', axis: 'AC', state: false, modes: D, anchor: true,
    scale_type: 'likert_5', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '화이트헤드나 좁쌀 같은 막힌 형태의 트러블이 반복적으로 생기나요?',
    options: [
      { label: '거의 없다', score: 1 },
      { label: '드물다', score: 2 },
      { label: '가끔 있다', score: 3 },
      { label: '자주 있다', score: 4 },
      { label: '관리해도 빠르게 다시 생긴다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q38', chapter: 'v1_ac', axis: 'AC', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '트러블이 한 번 생긴 부위에 비슷한 트러블이 반복해서 생기나요?',
    options: [
      { label: '거의 없다', score: 1 },
      { label: '드물다', score: 2 },
      { label: '가끔 있다', score: 3 },
      { label: '자주 있다', score: 4 },
      { label: '매우 자주 반복된다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q39', chapter: 'v1_ac', axis: 'AC', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'after_heavy_cream', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '유분감이 높은 크림이나 오일을 사용한 뒤 좁쌀이나 막힘이 생기는 경우가 있나요?',
    options: [
      { label: '거의 없다', score: 1 },
      { label: '드물다', score: 2 },
      { label: '가끔 있다', score: 3 },
      { label: '자주 있다', score: 4 },
      { label: '매우 쉽게 생긴다', score: 5 },
      { label: '사용 경험 없음', score: null, na: true }
    ]
  },
  {
    id: 'skin_v1_q40', chapter: 'v1_ac', axis: 'AC', state: false, modes: D,
    scale_type: 'likert_5', time_reference: 'recent_3m', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: '최근 며칠이 아니라 최근 3개월 전체를 기준으로 선택해주세요.',
    text: '최근 3개월 동안 트러블 없이 지내는 기간은 어느 정도였나요?',
    options: [
      { label: '대부분의 기간 동안 깨끗했다', score: 1 },
      { label: '가끔 트러블이 생겼다', score: 2 },
      { label: '트러블이 생겼다 없어지기를 반복했다', score: 3 },
      { label: '대부분의 기간에 트러블이 있었다', score: 4 },
      { label: '거의 항상 새로운 트러블이 있었다', score: 5 }
    ]
  },

  // ================= STATE — DEEP only, 7 questions =================
  {
    id: 'skin_v1_q41', chapter: 'v1_state', axis: 'hydration', state: true, modes: D,
    scale_type: 'numeric_0_10', time_reference: 'recent_1w', type_weight: null, state_weight: 1, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: '최근 1주일 평균 상태를 선택해주세요.',
    text: '최근 1주일 평균 피부 당김·속건조는 어느 정도였나요?',
    options: Array.from({ length: 11 }, (_, v) => ({ label: String(v), score: v }))
  },
  {
    id: 'skin_v1_q42', chapter: 'v1_state', axis: 'pore', state: true, modes: D,
    scale_type: 'likert_5', time_reference: 'recent_1w', type_weight: null, state_weight: 1, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '최근 1주일 동안 모공이 얼마나 도드라져 보였나요?',
    options: [
      { label: '거의 눈에 띄지 않았다', score: 1 },
      { label: '약간 보였다', score: 2 },
      { label: '보통 정도였다', score: 3 },
      { label: '꽤 눈에 띄었다', score: 4 },
      { label: '매우 뚜렷했다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q43', chapter: 'v1_state', axis: 'texture', state: true, modes: D,
    scale_type: 'numeric_0_10', time_reference: 'recent_1w', type_weight: null, state_weight: 1, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '최근 1주일 동안 피부 표면의 거칠기나 까칠함은 어느 정도였나요?',
    options: Array.from({ length: 11 }, (_, v) => ({ label: String(v), score: v }))
  },
  {
    id: 'skin_v1_q44', chapter: 'v1_state', axis: 'tone', state: true, modes: D,
    scale_type: 'likert_5', time_reference: 'recent_2w', type_weight: null, state_weight: 1, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '최근 2주 동안 피부톤이 고르지 않거나 칙칙하게 느껴진 정도는?',
    options: [
      { label: '거의 느끼지 않았다', score: 1 },
      { label: '약간 느꼈다', score: 2 },
      { label: '보통이었다', score: 3 },
      { label: '꽤 느꼈다', score: 4 },
      { label: '매우 신경 쓰였다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q45', chapter: 'v1_state', axis: 'heat_redness', state: true, modes: D,
    scale_type: 'numeric_0_10', time_reference: 'recent_3d', type_weight: null, state_weight: 1, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '최근 3일 동안 얼굴 열감이나 붉은기는 평균적으로 어느 정도였나요?',
    options: Array.from({ length: 11 }, (_, v) => ({ label: String(v), score: v }))
  },
  {
    id: 'skin_v1_q46', chapter: 'v1_state', axis: 'current_sensitivity', state: true, modes: D,
    scale_type: 'likert_5', time_reference: 'recent_3d', type_weight: null, state_weight: 1, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: null,
    text: '최근 3일 동안 피부 따가움·화끈거림 같은 민감 반응은 얼마나 자주 있었나요?',
    options: [
      { label: '전혀 없었다', score: 1 },
      { label: '한두 번 있었다', score: 2 },
      { label: '가끔 있었다', score: 3 },
      { label: '자주 있었다', score: 4 },
      { label: '거의 매일 있었다', score: 5 }
    ]
  },
  {
    id: 'skin_v1_q47', chapter: 'v1_state', axis: 'current_acne', state: true, modes: D,
    scale_type: 'likert_5', time_reference: 'recent_1w', type_weight: null, state_weight: 1, reverse_scored: false, validation_only: false, question_version: QUESTION_VERSION_V1, helper_text: '정확한 개수가 기억나지 않으면 가장 가까운 범위를 선택해주세요.',
    text: '최근 1주일 동안 새로 생긴 뾰루지는 몇 개 정도였나요?',
    options: [
      { label: '없음', score: 1 },
      { label: '1~2개', score: 2 },
      { label: '3~5개', score: 3 },
      { label: '6~10개', score: 4 },
      { label: '11개 이상 또는 계속 새로 생김', score: 5 }
    ]
  },

  // ================= validation-only — DEEP only, 1 question =================
  {
    id: 'skin_v1_q48', chapter: 'v1_validation', axis: 'self_awareness', state: false, modes: D,
    scale_type: 'multi_select', time_reference: 'current', type_weight: 0, state_weight: 0, reverse_scored: false, validation_only: true, question_version: QUESTION_VERSION_V1, helper_text: '최대 2개까지 선택할 수 있어요.', multiSelectMax: 2,
    text: '요즘 가장 신경 쓰이는 피부 고민을 최대 2개 선택해주세요.',
    options: [
      { label: '유분·번들거림', score: null },
      { label: '건조·속당김', score: null },
      { label: '민감·자극', score: null },
      { label: '색소·잡티', score: null },
      { label: '탄력·주름', score: null },
      { label: '트러블·좁쌀', score: null },
      { label: '모공', score: null },
      { label: '칙칙함·톤 불균일', score: null },
      { label: '피부결', score: null },
      { label: '특별한 고민 없음', score: null }
    ]
  }
]
