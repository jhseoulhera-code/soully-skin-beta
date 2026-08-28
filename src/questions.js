// Question bank v4.0 — redesigned for two test lengths sharing one axis system.
//
// QUICK 16 (mode "quick"): 4 axes (OD/SR/PN/WT), 18 questions, ~1-2 min.
// DEEP  64 (mode "deep"):  6 axes (OD/SR/PN/WT/CB/HQ), 38 type questions
//   (the same 18 used by QUICK, plus 20 more — including all of CB/HQ,
//   which QUICK never asks) + 6 bonus STATE questions ("최근의 내 피부"),
//   44 questions total, ~4-5 min.
//
// Each question carries `modes` (which test length(s) it appears in) and a
// `type_weight` (default 1) — a small number of especially discriminative
// "anchor" questions per axis carry type_weight 1.5 so they count for more
// in that axis's score without needing a separate scoring path.
//
// Selection criteria applied when narrowing the old ~57-question bank down to
// this set: prefer concrete, timed, or behavior-based questions ("세안 후
// 10분이 지나면...", "하루에 몇 번 수정 화장을 하나요") over vague
// self-assessment ("피부가 민감한가요?", "탄력 관리가 중요한가요?") — the
// latter measure how a person *thinks* about their skin, not what it
// actually does. Cut items were either near-duplicates of a kept question,
// purely attitudinal/priority questions, or lower-signal edge cases.
//
// ---------------------------------------------------------------------------
// Data model (stabilized for algorithm V1.0 prep — see the branch's
// "질문 데이터 모델 안정화" work; no question text, scoring, or type logic
// was changed as part of that pass, only this shape):
//
//   id               stable identifier — was `tag` before this pass (already
//                    unique across all 44 questions, so it was promoted
//                    in-place rather than replacing it with a new value).
//                    This is the ONLY key used to track an answered state
//                    and to store diagnosis_answers.question_id — editing
//                    `text` never breaks that matching.
//   chapter, axis     unchanged from before.
//   state             unchanged from before: true = STATE ("최근의 내
//                    피부") question, scored into `weather` and excluded
//                    from the TYPE sums; false = TYPE question.
//   modes             unchanged from before (QD / D).
//   scale_type        descriptive only — does not change how a question is
//                    scored yet. 'bipolar_4' = the existing 4-option
//                    -3/-1/1/3-ish TYPE scale. 'ordinal_3' / 'ordinal_4' =
//                    the existing 3- or 4-option 0..2 / 0..3 STATE scale.
//                    Reserved for future use: 'likert_5', 'numeric_0_10',
//                    'categorical', 'multi_select' — see src/scoring.js for
//                    how those are (not yet) handled.
//   time_reference     descriptive only. 'general' for TYPE questions;
//                    STATE questions get the recency window implied by
//                    their existing wording (e.g. dehydration/trouble ask
//                    about "최근 1주일" -> 'recent_1w').
//   type_weight        was `weight`. Same meaning, same values (default 1,
//                    1.5 on anchor questions) — only used for TYPE
//                    questions; null on STATE questions (weight was never
//                    read for those before either).
//   state_weight       reserved for future use. Every current STATE
//                    question is written as 1 (neutral) since
//                    src/scoring.js still assigns the latest STATE answer
//                    directly (`weather[axis] = opt.score`) with no
//                    weighting — unchanged behavior. null on TYPE questions.
//   reverse_scored     reserved for future use; false on every current
//                    question (each question's options already encode
//                    direction explicitly via their own `score` values).
//   validation_only    reserved for future use (e.g. attention-check
//                    questions excluded from scoring); false on every
//                    current question.
//   question_version   per-question version tag; 'v4.0' on every current
//                    question (matches QUESTION_SET_VERSION in
//                    src/types.js). Lets a future single-question wording
//                    change be versioned without bumping the whole set.
//   helper_text        reserved for future use (sub-copy under a question);
//                    null on every current question.
// ---------------------------------------------------------------------------

export const chapters = [
  {
    "id": "morning",
    "title": "아침의 내 피부",
    "label": "유수분 · 기본 반응",
    "emoji": "🌤️",
    "accent": "#B9A7F3",
    "soft": "#F4F0FF",
    "deep": "#8067D7",
    "intro": "하루를 시작할 때 가장 먼저 느껴지는 피부 신호를 살펴봐요."
  },
  {
    "id": "afternoon",
    "title": "오후가 되면",
    "label": "유분 · 속당김 · 메이크업 변화",
    "emoji": "🕒",
    "accent": "#B6DDD0",
    "soft": "#F1FAF7",
    "deep": "#6FB49E",
    "intro": "시간이 지나면서 달라지는 피부의 균형을 확인해볼게요."
  },
  {
    "id": "newproduct",
    "title": "새로운 화장품",
    "label": "민감 반응 · 향 · 회복 속도",
    "emoji": "🧴",
    "accent": "#F1DFA7",
    "soft": "#FFFAEC",
    "deep": "#C7AA54",
    "intro": "처음 만나는 성분과 향에 내 피부가 어떻게 반응하는지 봐요."
  },
  {
    "id": "pores",
    "title": "모공과 트러블",
    "label": "블랙헤드 · 좁쌀 · 막힘",
    "emoji": "🫧",
    "accent": "#F2C1B5",
    "soft": "#FFF5F1",
    "deep": "#D78F7D",
    "intro": "겉으로 보이는 모공보다 반복되는 막힘과 트러블 패턴을 살펴봐요."
  },
  {
    "id": "marks",
    "title": "흔적과 피부톤",
    "label": "색소 · 흔적 · 피부톤",
    "emoji": "✨",
    "accent": "#E8C1D1",
    "soft": "#FFF5F9",
    "deep": "#B88399",
    "intro": "트러블이 지나간 뒤 남는 흔적과 피부톤 변화를 확인해요."
  },
  {
    "id": "heat",
    "title": "햇빛과 더위",
    "label": "열감 · 습도 · 환경 반응",
    "emoji": "☀️",
    "accent": "#F2CE9E",
    "soft": "#FFF8EE",
    "deep": "#D6A362",
    "intro": "더위와 햇빛, 습도에 피부가 얼마나 반응하는지 살펴봐요."
  },
  {
    "id": "tired",
    "title": "탄력과 피로",
    "label": "탄력 · 잔선 · 회복력",
    "emoji": "🌙",
    "accent": "#C4D3EA",
    "soft": "#F3F7FC",
    "deep": "#819DC5",
    "intro": "피곤한 날 드러나는 피부 회복력과 탄력 신호를 살펴봐요."
  },
  {
    "id": "recent",
    "title": "최근의 내 피부",
    "label": "현재 컨디션 · Skin Weather",
    "emoji": "💧",
    "accent": "#CBDDC7",
    "soft": "#F4FAF2",
    "deep": "#8BA884",
    "intro": "마지막으로 요즘 피부 컨디션을 따로 기록해둘게요."
  }
];

const QD = ['quick', 'deep']; // asked in both test lengths
const D = ['deep'];           // deep-only addition

export const questions = [
  // ---- OD (oil/dry) — DEEP 6 / QUICK 5, anchor: post_cleanse (x1.5) ----
  {
    id: 'post_cleanse', chapter: 'morning', axis: 'OD', state: false, modes: QD,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1.5, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '세안 후 아무것도 바르지 않고 10분이 지나면 가장 가까운 상태는?',
    options: [
      { label: '얼굴 전체가 많이 당긴다', score: -3 },
      { label: '볼이나 입 주변이 당긴다', score: -1 },
      { label: '크게 불편하지 않다', score: 1 },
      { label: '코·이마부터 유분이 느껴진다', score: 3 }
    ]
  },
  {
    id: 'morning_surface', chapter: 'morning', axis: 'OD', state: false, modes: QD,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '아침에 일어났을 때 피부 표면은 어떤가요?',
    options: [
      { label: '건조하고 푸석하다', score: -3 },
      { label: '볼은 건조하지만 T존은 괜찮다', score: -1 },
      { label: '편안한 편이다', score: 1 },
      { label: '코·이마 또는 얼굴 전체에 유분이 있다', score: 3 }
    ]
  },
  {
    id: 'afternoon_change', chapter: 'afternoon', axis: 'OD', state: false, modes: QD,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '오후가 되면 가장 먼저 느껴지는 변화는?',
    options: [
      { label: '전체적으로 푸석해진다', score: -3 },
      { label: '볼은 건조하고 T존만 번들거린다', score: 0 },
      { label: '아침과 크게 다르지 않다', score: 1 },
      { label: 'T존이나 얼굴 전체가 번들거린다', score: 3 }
    ]
  },
  {
    id: 'oil_management', chapter: 'afternoon', axis: 'OD', state: false, modes: QD,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '오후가 되면 코 주변 유분을 닦아내거나 수정 화장을 자주 하나요?',
    options: [
      { label: '거의 하지 않는다', score: -2 },
      { label: '가끔 한다', score: 0 },
      { label: '하루 1번 정도', score: 2 },
      { label: '하루 여러 번 한다', score: 3 }
    ]
  },
  {
    id: 'combo_skin', chapter: 'afternoon', axis: 'OD', state: false, modes: QD,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '코와 이마는 번들거리는데 볼은 당기는 경우가 있나요?',
    options: [
      { label: '거의 없다', score: -1 },
      { label: '가끔 있다', score: 1 },
      { label: '자주 있다', score: 2 },
      { label: '매우 자주 있다', score: 3 }
    ]
  },
  {
    id: 'makeup_wear', chapter: 'afternoon', axis: 'OD', state: false, modes: D,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '메이크업이나 선크림을 바른 날 시간이 지나면?',
    options: [
      { label: '들뜨거나 갈라진다', score: -3 },
      { label: '볼·입 주변만 건조해진다', score: -1 },
      { label: '큰 변화가 없다', score: 1 },
      { label: '유분 때문에 쉽게 무너진다', score: 3 }
    ]
  },

  // ---- SR (sensitive/resistant) — DEEP 8 / QUICK 5, anchors: fragrance, fragrance_avoid (x1.5) ----
  {
    id: 'fragrance', chapter: 'newproduct', axis: 'SR', state: false, modes: QD,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1.5, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '향이 강한 스킨케어 제품을 사용했을 때 피부가 불편해진 적이 있나요?',
    options: [
      { label: '거의 없다', score: -3 },
      { label: '향은 느껴지지만 피부 반응은 없다', score: -1 },
      { label: '가끔 따갑거나 붉어진다', score: 2 },
      { label: '향이 강하면 피부가 쉽게 불편해진다', score: 3 }
    ]
  },
  {
    id: 'fragrance_avoid', chapter: 'newproduct', axis: 'SR', state: false, modes: QD,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1.5, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '향료나 에센셜오일이 들어간 제품을 피부 때문에 일부러 피하는 편인가요?',
    options: [
      { label: '전혀 아니다', score: -3 },
      { label: '거의 아니다', score: -1 },
      { label: '가끔 피한다', score: 2 },
      { label: '가능하면 피하는 편이다', score: 3 }
    ]
  },
  {
    id: 'alcohol', chapter: 'newproduct', axis: 'SR', state: false, modes: QD,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '알코올감이 강한 토너나 선제품을 사용하면 따갑거나 건조해지나요?',
    options: [
      { label: '거의 없다', score: -3 },
      { label: '가끔', score: -1 },
      { label: '자주', score: 2 },
      { label: '매우 자주', score: 3 }
    ]
  },
  {
    id: 'cleansing_sensitivity', chapter: 'morning', axis: 'SR', state: false, modes: QD,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '세안 직후 얼굴이 붉어지거나 화끈거리는 편인가요?',
    options: [
      { label: '거의 없다', score: -3 },
      { label: '가끔 그렇다', score: -1 },
      { label: '자주 그렇다', score: 2 },
      { label: '거의 항상 그렇다', score: 3 }
    ]
  },
  {
    id: 'recovery', chapter: 'newproduct', axis: 'SR', state: false, modes: QD,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '새 화장품 사용 후 불편함이 생겼다면 보통 얼마나 오래 지속되나요?',
    options: [
      { label: '10분 이내', score: -3 },
      { label: '몇 시간', score: -1 },
      { label: '하루 정도', score: 2 },
      { label: '2일 이상', score: 3 }
    ]
  },
  {
    id: 'friction', chapter: 'newproduct', axis: 'SR', state: false, modes: D,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '마스크·수건·화장솜처럼 피부에 마찰이 생긴 뒤 쉽게 붉어지나요?',
    options: [
      { label: '거의 아니다', score: -3 },
      { label: '가끔', score: -1 },
      { label: '자주', score: 2 },
      { label: '매우 자주', score: 3 }
    ]
  },
  {
    id: 'environment', chapter: 'newproduct', axis: 'SR', state: false, modes: D,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '냉난방이 강한 공간이나 건조한 바람에 피부가 쉽게 불편해지나요?',
    options: [
      { label: '거의 아니다', score: -3 },
      { label: '가끔', score: -1 },
      { label: '자주', score: 2 },
      { label: '매우 자주', score: 3 }
    ]
  },
  {
    id: 'behavior', chapter: 'newproduct', axis: 'SR', state: false, modes: D,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '처음 쓰는 제품을 바로 얼굴 전체에 바르는 것이 부담스럽나요?',
    options: [
      { label: '전혀 아니다', score: -3 },
      { label: '크게 부담 없다', score: -1 },
      { label: '작은 부위부터 써본다', score: 2 },
      { label: '새 제품 자체가 부담스럽다', score: 3 }
    ]
  },

  // ---- PN (pigmentation) — DEEP 6 / QUICK 4, anchor: trouble_mark (x1.5) ----
  {
    id: 'trouble_mark', chapter: 'marks', axis: 'PN', state: false, modes: QD,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1.5, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '트러블이 가라앉은 뒤 갈색이나 어두운 흔적이 남나요?',
    options: [
      { label: '거의 남지 않는다', score: -3 },
      { label: '가끔 남는다', score: -1 },
      { label: '자주 남는다', score: 2 },
      { label: '거의 항상 오래 남는다', score: 3 }
    ]
  },
  {
    id: 'bug_bite_mark', chapter: 'marks', axis: 'PN', state: false, modes: QD,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '벌레에 물리거나 긁힌 자리가 어둡게 남는 편인가요?',
    options: [
      { label: '거의 아니다', score: -3 },
      { label: '가끔', score: -1 },
      { label: '자주', score: 2 },
      { label: '매우 잘 남는다', score: 3 }
    ]
  },
  {
    id: 'sun_darkening', chapter: 'marks', axis: 'PN', state: false, modes: QD,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '햇빛을 많이 받은 뒤 내 피부는?',
    options: [
      { label: '붉었다가 비교적 빨리 돌아온다', score: -3 },
      { label: '약간 어두워진다', score: -1 },
      { label: '쉽게 탄다', score: 2 },
      { label: '어두워진 상태가 오래간다', score: 3 }
    ]
  },
  {
    id: 'fade_speed', chapter: 'marks', axis: 'PN', state: false, modes: QD,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '잡티나 흔적이 생긴 뒤 색이 옅어지는 속도는 어떤가요?',
    options: [
      { label: '비교적 빨리 옅어진다', score: -3 },
      { label: '조금 오래 걸린다', score: -1 },
      { label: '꽤 오래 걸린다', score: 2 },
      { label: '매우 오래 남는 편이다', score: 3 }
    ]
  },
  {
    id: 'wound_discoloration', chapter: 'marks', axis: 'PN', state: false, modes: D,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '작은 상처가 아문 뒤에도 색 변화가 남나요?',
    options: [
      { label: '거의 없다', score: -3 },
      { label: '약간 남는다', score: -1 },
      { label: '꽤 오래 남는다', score: 2 },
      { label: '오래 지속된다', score: 3 }
    ]
  },
  {
    id: 'uneven_tone', chapter: 'marks', axis: 'PN', state: false, modes: D,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '얼굴에 피부톤이 고르지 않은 부분이 눈에 띄나요?',
    options: [
      { label: '거의 없다', score: -3 },
      { label: '약간 있다', score: -1 },
      { label: '꽤 눈에 띈다', score: 2 },
      { label: '가장 큰 고민 중 하나다', score: 3 }
    ]
  },

  // ---- WT (aging/wrinkle) — DEEP 6 / QUICK 4, anchor: less_firm_vs_past (x1.5) ----
  {
    id: 'fine_lines_static', chapter: 'tired', axis: 'WT', state: false, modes: QD,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '표정을 짓지 않아도 눈가나 입가에 잔선이 보이나요?',
    options: [
      { label: '거의 없다', score: -3 },
      { label: '아주 약간', score: -1 },
      { label: '눈에 띈다', score: 2 },
      { label: '확실히 보인다', score: 3 }
    ]
  },
  {
    id: 'less_firm_vs_past', chapter: 'tired', axis: 'WT', state: false, modes: QD,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1.5, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '몇 년 전보다 피부가 덜 탱탱해졌다고 느끼나요?',
    options: [
      { label: '거의 변화 없다', score: -3 },
      { label: '약간', score: -1 },
      { label: '꽤 그렇다', score: 2 },
      { label: '확실히 그렇다', score: 3 }
    ]
  },
  {
    id: 'sagging', chapter: 'tired', axis: 'WT', state: false, modes: QD,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '볼이나 턱선이 예전보다 처져 보인다고 느끼나요?',
    options: [
      { label: '전혀 아니다', score: -3 },
      { label: '약간', score: -1 },
      { label: '꽤 그렇다', score: 2 },
      { label: '많이 그렇다', score: 3 }
    ]
  },
  {
    id: 'elasticity_press_test', chapter: 'tired', axis: 'WT', state: false, modes: QD,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '피부를 눌렀을 때 예전보다 탄성이 덜하다고 느끼나요?',
    options: [
      { label: '거의 아니다', score: -3 },
      { label: '약간', score: -1 },
      { label: '꽤 그렇다', score: 2 },
      { label: '확실히 그렇다', score: 3 }
    ]
  },
  {
    id: 'sleep_deprived_dullness', chapter: 'tired', axis: 'WT', state: false, modes: D,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '수면이 부족한 날 피부가 유난히 푸석하고 힘없어 보이나요?',
    options: [
      { label: '거의 변화 없다', score: -3 },
      { label: '약간', score: -1 },
      { label: '꽤 그렇다', score: 2 },
      { label: '매우 그렇다', score: 3 }
    ]
  },
  {
    id: 'recovery_speed', chapter: 'tired', axis: 'WT', state: false, modes: D,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '피부가 피곤해 보인 뒤 원래 컨디션으로 돌아오는 속도는?',
    options: [
      { label: '빠른 편', score: -3 },
      { label: '하루 정도', score: -1 },
      { label: '이틀 이상', score: 2 },
      { label: '쉽게 회복되지 않는다', score: 3 }
    ]
  },

  // ---- CB (congested/balanced) — DEEP-only, 6 questions, anchor: whiteheads (x1.5) ----
  {
    id: 'comedone_touch', chapter: 'pores', axis: 'CB', state: false, modes: D,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '코나 턱을 만졌을 때 오돌토돌한 느낌이 있나요?',
    options: [
      { label: '거의 없다', score: -3 },
      { label: '가끔', score: -1 },
      { label: '자주', score: 2 },
      { label: '거의 항상', score: 3 }
    ]
  },
  {
    id: 'whiteheads', chapter: 'pores', axis: 'CB', state: false, modes: D,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1.5, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '화이트헤드나 좁쌀이 생기는 편인가요?',
    options: [
      { label: '거의 없다', score: -3 },
      { label: '가끔', score: -1 },
      { label: '자주', score: 2 },
      { label: '매우 자주', score: 3 }
    ]
  },
  {
    id: 'blackhead_recurrence', chapter: 'pores', axis: 'CB', state: false, modes: D,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '블랙헤드를 관리해도 쉽게 다시 눈에 띄나요?',
    options: [
      { label: '거의 아니다', score: -3 },
      { label: '가끔', score: -1 },
      { label: '자주', score: 2 },
      { label: '매우 빠르게 다시 생긴다', score: 3 }
    ]
  },
  {
    id: 'heavy_cream_reaction', chapter: 'pores', axis: 'CB', state: false, modes: D,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '무거운 크림이나 오일을 충분히 바르면?',
    options: [
      { label: '피부가 더 편안하다', score: -3 },
      { label: '별 차이 없다', score: -1 },
      { label: '답답할 때가 있다', score: 2 },
      { label: '좁쌀이나 트러블이 잘 생긴다', score: 3 }
    ]
  },
  {
    id: 'makeup_days_pore_clog', chapter: 'pores', axis: 'CB', state: false, modes: D,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '선크림이나 메이크업을 며칠 연속 사용하면?',
    options: [
      { label: '특별한 변화 없다', score: -3 },
      { label: '약간 답답하다', score: -1 },
      { label: '모공이 막히는 느낌이 든다', score: 2 },
      { label: '트러블이 쉽게 생긴다', score: 3 }
    ]
  },
  {
    id: 'stress_sleep_breakout', chapter: 'pores', axis: 'CB', state: false, modes: D,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '스트레스나 수면 부족 후 모공막힘이나 트러블이 늘어나나요?',
    options: [
      { label: '거의 변화 없다', score: -3 },
      { label: '약간 늘어난다', score: -1 },
      { label: '확실히 늘어난다', score: 2 },
      { label: '매우 심해진다', score: 3 }
    ]
  },

  // ---- HQ (heat-reactive/quiet) — DEEP-only, 6 questions, anchor: heat_face_flush (x1.5) ----
  {
    id: 'heat_face_flush', chapter: 'heat', axis: 'HQ', state: false, modes: D,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1.5, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '더운 곳에 오래 있으면 얼굴이 쉽게 뜨거워지나요?',
    options: [
      { label: '거의 없다', score: -3 },
      { label: '가끔', score: -1 },
      { label: '자주', score: 2 },
      { label: '매우 자주', score: 3 }
    ]
  },
  {
    id: 'exercise_flush_duration', chapter: 'heat', axis: 'HQ', state: false, modes: D,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '운동 후 얼굴의 열감이나 붉음은 얼마나 지속되나요?',
    options: [
      { label: '거의 없다', score: -3 },
      { label: '10분 이내', score: -1 },
      { label: '10~30분', score: 2 },
      { label: '30분 이상', score: 3 }
    ]
  },
  {
    id: 'sun_heat_discomfort', chapter: 'heat', axis: 'HQ', state: false, modes: D,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '강한 햇빛을 받은 뒤 피부가 뜨겁거나 불편하게 느껴지나요?',
    options: [
      { label: '거의 아니다', score: -3 },
      { label: '약간', score: -1 },
      { label: '꽤 그렇다', score: 2 },
      { label: '매우 그렇다', score: 3 }
    ]
  },
  {
    id: 'humid_weather_response', chapter: 'heat', axis: 'HQ', state: false, modes: D,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '덥고 습한 날 피부는?',
    options: [
      { label: '오히려 편안하다', score: -3 },
      { label: '큰 변화 없다', score: -1 },
      { label: '유분과 답답함이 늘어난다', score: 2 },
      { label: '열감·붉음·트러블이 확실히 늘어난다', score: 3 }
    ]
  },
  {
    id: 'spicy_food_flush', chapter: 'heat', axis: 'HQ', state: false, modes: D,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '매운 음식이나 뜨거운 음식을 먹으면 얼굴이 붉어지나요?',
    options: [
      { label: '거의 없다', score: -3 },
      { label: '가끔', score: -1 },
      { label: '자주', score: 2 },
      { label: '매우 자주', score: 3 }
    ]
  },
  {
    id: 'mask_ventilation_discomfort', chapter: 'heat', axis: 'HQ', state: false, modes: D,
    scale_type: 'bipolar_4', time_reference: 'general', type_weight: 1, state_weight: null, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '마스크를 오래 쓰거나 환기가 안 되는 곳에 있으면?',
    options: [
      { label: '거의 변화 없다', score: -3 },
      { label: '조금 불편하다', score: -1 },
      { label: '뜨겁고 답답하다', score: 2 },
      { label: '피부 컨디션이 확실히 나빠진다', score: 3 }
    ]
  },

  // ---- STATE (recent condition, not part of TYPE scoring) — DEEP-only bonus chapter ----
  {
    id: 'sleep', chapter: 'recent', axis: 'sleep', state: true, modes: D,
    scale_type: 'ordinal_3', time_reference: 'recent_3d', type_weight: null, state_weight: 1, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '최근 3일 동안 수면은 어땠나요?',
    options: [
      { label: '충분했다', score: 0 },
      { label: '조금 부족했다', score: 1 },
      { label: '많이 부족했다', score: 2 }
    ]
  },
  {
    id: 'dehydration', chapter: 'recent', axis: 'dehydration', state: true, modes: D,
    scale_type: 'ordinal_3', time_reference: 'recent_1w', type_weight: null, state_weight: 1, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '최근 1주일 피부 당김은?',
    options: [
      { label: '평소와 비슷하다', score: 0 },
      { label: '조금 심해졌다', score: 1 },
      { label: '많이 심해졌다', score: 2 }
    ]
  },
  {
    id: 'trouble', chapter: 'recent', axis: 'trouble', state: true, modes: D,
    scale_type: 'ordinal_3', time_reference: 'recent_1w', type_weight: null, state_weight: 1, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '최근 1주일 트러블은?',
    options: [
      { label: '평소와 비슷하다', score: 0 },
      { label: '조금 늘었다', score: 1 },
      { label: '많이 늘었다', score: 2 }
    ]
  },
  {
    id: 'heat', chapter: 'recent', axis: 'heat', state: true, modes: D,
    scale_type: 'ordinal_4', time_reference: 'today', type_weight: null, state_weight: 1, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '오늘 얼굴의 열감은?',
    options: [
      { label: '편안하다', score: 0 },
      { label: '약간 따뜻하다', score: 1 },
      { label: '꽤 뜨겁다', score: 2 },
      { label: '화끈거리고 불편하다', score: 3 }
    ]
  },
  {
    id: 'stress', chapter: 'recent', axis: 'stress', state: true, modes: D,
    scale_type: 'ordinal_4', time_reference: 'recent', type_weight: null, state_weight: 1, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '최근 스트레스 정도는?',
    options: [
      { label: '낮다', score: 0 },
      { label: '보통', score: 1 },
      { label: '높다', score: 2 },
      { label: '매우 높다', score: 3 }
    ]
  },
  {
    id: 'new_product', chapter: 'recent', axis: 'new_product', state: true, modes: D,
    scale_type: 'ordinal_4', time_reference: 'recent_2w', type_weight: null, state_weight: 1, reverse_scored: false, validation_only: false, question_version: 'v4.0', helper_text: null,
    text: '최근 2주 안에 새로운 화장품을 사용했나요?',
    options: [
      { label: '아니다', score: 0 },
      { label: '1개 정도', score: 1 },
      { label: '2~3개', score: 2 },
      { label: '여러 제품을 바꿨다', score: 3 }
    ]
  }
];

// The 6 axes TYPE questions score into, in first-appearance order — derived
// from the question data itself (state:false questions' `axis` values, deduped)
// instead of being duplicated as a separate literal list. src/scoring.js and
// src/App.jsx's AXIS/AXIS_META (result-screen labels/colors, which stay as
// literal maps since they carry hand-authored copy the data can't derive)
// both key off this single source instead of re-typing the same 6 codes.
export const TYPE_AXES = [...new Set(questions.filter(q => !q.state).map(q => q.axis))];
