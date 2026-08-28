-- ============================================================================
-- Skin Diagnosis V1.0 — 48-question set (question_version / algorithm_version
-- 'skin_v1.0')
-- ============================================================================
-- Additive only. Run this after supabase-schema.sql,
-- supabase-migration-diagnosis-tracking.sql, and
-- supabase-migration-question-data-model.sql.
--
-- Does NOT touch:
--   - any existing table's existing columns or rows
--   - the v4.0 question_definitions rows (question_id + question_version is
--     the table's unique key, so 'v4.0' rows are untouched — this file only
--     adds new 'skin_v1.0' rows)
--   - the v4.0 CB/HQ axes anywhere (skin_v1.0 uses BG/AC instead; CB/HQ stay
--     exactly as they are for v4.0 backward compatibility)
--
-- src/questionsV1.js's 48 questions (id/text/scale_type/axis/options — all
-- final/confirmed, not reworded here or anywhere else) are the source of
-- truth; the INSERT below is generated directly from that file via
-- scripts/generateSkinV1QuestionDefinitionsSql.mjs, not hand-transcribed —
-- same pattern supabase-migration-question-data-model.sql already
-- established for the v4.0 seed.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. diagnosis_results — 5 new nullable columns for the STATE axes that have
--    no existing column to reuse. Every other skin_v1.0 score reuses an
--    existing column (see src/diagnosisTracking.js's saveDiagnosisResultV1
--    for the exact mapping and the reasoning already written into this
--    table's original comment in supabase-migration-diagnosis-tracking.sql:
--    "hydration/barrier/acne/tone ... left null until a new scoring
--    algorithm is wired up to fill them" — this is that algorithm):
--      oil/sensitivity/pigmentation/aging_score <- OD/SR/PN/WT (TYPE)
--      barrier_score <- BG (TYPE, skin_v1.0-only)
--      acne_score    <- AC (TYPE, skin_v1.0-only)
--      hydration_score <- STATE hydration
--      tone_score      <- STATE tone
--      skin_type_16 / skin_type_64 <- type16 / type64
--      result_version <- 'skin_v1.0'
--    pore_score and heat_score are NOT reused for skin_v1.0's STATE
--    pore/heat_redness — v4.0 already writes CB into pore_score and HQ into
--    heat_score (see saveDiagnosisResult), and skin_v1.0 must not read or
--    write CB/HQ at all, so STATE's "pore" gets its own new
--    pore_visibility_score column. texture/heat_redness/
--    current_sensitivity/current_acne have no existing column at all.
--    Hence 5 new columns, all nullable, all additive.
-- ----------------------------------------------------------------------------
alter table public.diagnosis_results add column if not exists pore_visibility_score numeric;
alter table public.diagnosis_results add column if not exists texture_score numeric;
alter table public.diagnosis_results add column if not exists heat_redness_score numeric;
alter table public.diagnosis_results add column if not exists current_sensitivity_score numeric;
alter table public.diagnosis_results add column if not exists current_acne_score numeric;

-- No new columns needed on diagnosis_sessions (algorithm_version /
-- question_set_version already exist and are simply set to 'skin_v1.0' by
-- createDiagnosisSession's versionOverrides — see src/App.jsx/
-- src/diagnosisTracking.js) or on question_definitions (its existing
-- question_id/question_version/text/scale_type/axis/type_weight/
-- state_weight/reverse_scored/options_json columns already cover every
-- field skin_v1.0's questions need to record).

-- ----------------------------------------------------------------------------
-- 2. question_definitions seed — the 48 skin_v1.0 questions.
--    question_id + question_version is the table's unique key, so this can
--    be re-run safely (on conflict do nothing) and never overwrites the
--    existing 'v4.0' rows from supabase-migration-question-data-model.sql.
-- ----------------------------------------------------------------------------
insert into public.question_definitions
  (question_id, question_version, text, scale_type, axis, type_weight, state_weight, reverse_scored, options_json)
values
  ('skin_v1_q01', 'skin_v1.0', '세안 후 아무것도 바르지 않고 10분이 지나면, T존(이마·코)에 유분이 다시 느껴지기 시작하나요?', 'likert_5', 'OD', 1, null, false, '[{"label":"거의 느껴지지 않는다","score":1},{"label":"드물게 느껴진다","score":2},{"label":"가끔 느껴진다","score":3},{"label":"자주 느껴진다","score":4},{"label":"세안 직후부터 금방 느껴진다","score":5}]'::jsonb),
  ('skin_v1_q02', 'skin_v1.0', '오후가 되면 화장이 밀리거나 유분막이 느껴져 기름종이·블러팅이 필요한 편인가요?', 'likert_5', 'OD', 1, null, false, '[{"label":"거의 없다","score":1},{"label":"드물게 있다","score":2},{"label":"가끔 있다","score":3},{"label":"자주 있다","score":4},{"label":"매일 필요하다","score":5}]'::jsonb),
  ('skin_v1_q03', 'skin_v1.0', '이마·코뿐 아니라 볼(뺨)에서도 기름기가 쉽게 올라오는 편인가요?', 'likert_5', 'OD', 1, null, false, '[{"label":"거의 없다","score":1},{"label":"드물게 있다","score":2},{"label":"가끔 있다","score":3},{"label":"자주 있다","score":4},{"label":"항상 그렇다","score":5}]'::jsonb),
  ('skin_v1_q04', 'skin_v1.0', '세안 후 아무 제품도 바르지 않았을 때, 얼마나 빨리 번들거리기 시작하나요?', 'likert_5', 'OD', 1, null, false, '[{"label":"4시간 이상 지나야","score":1},{"label":"2~4시간 후","score":2},{"label":"1~2시간 후","score":3},{"label":"30분~1시간 후","score":4},{"label":"30분 이내","score":5}]'::jsonb),
  ('skin_v1_q17', 'skin_v1.0', '덥고 습한 날에는 평소보다 얼굴 유분이 얼마나 증가하나요?', 'likert_5', 'OD', 1, null, false, '[{"label":"거의 변하지 않는다","score":1},{"label":"약간 늘어난다","score":2},{"label":"어느 정도 늘어난다","score":3},{"label":"확실히 늘어난다","score":4},{"label":"매우 크게 늘어난다","score":5}]'::jsonb),
  ('skin_v1_q18', 'skin_v1.0', '볼보다 코·이마의 유분이 더 많은 편인가요?', 'likert_5', 'OD', 1, null, false, '[{"label":"거의 차이가 없다","score":1},{"label":"약간 차이가 있다","score":2},{"label":"어느 정도 차이가 있다","score":3},{"label":"확실히 차이가 난다","score":4},{"label":"T존과 볼의 차이가 매우 크다","score":5}]'::jsonb),
  ('skin_v1_q19', 'skin_v1.0', '선크림이나 가벼운 기초제품을 바른 날 오후에 번들거림이 증가하나요?', 'likert_5', 'OD', 1, null, false, '[{"label":"거의 없다","score":1},{"label":"약간 있다","score":2},{"label":"어느 정도 있다","score":3},{"label":"자주 있다","score":4},{"label":"매우 쉽게 번들거린다","score":5}]'::jsonb),
  ('skin_v1_q20', 'skin_v1.0', '세안 후 시간이 지나면서 유분이 다시 올라오는 속도는 어떤가요?', 'likert_5', 'OD', 1, null, false, '[{"label":"매우 느리다","score":1},{"label":"느린 편이다","score":2},{"label":"보통이다","score":3},{"label":"빠른 편이다","score":4},{"label":"매우 빠르다","score":5}]'::jsonb),
  ('skin_v1_q05', 'skin_v1.0', '새로운 화장품을 사용한 뒤 따갑거나 화끈거리거나 붉어진 경험은 얼마나 자주 있나요?', 'likert_5', 'SR', 1, null, false, '[{"label":"거의 없다","score":1},{"label":"드물게 있다","score":2},{"label":"가끔 있다","score":3},{"label":"자주 있다","score":4},{"label":"새로운 제품을 사용할 때 매우 자주 있다","score":5}]'::jsonb),
  ('skin_v1_q06', 'skin_v1.0', '마스크·수건·화장솜처럼 피부에 마찰이 생긴 뒤 붉거나 따가워지는 경우가 있나요?', 'likert_5', 'SR', 1, null, false, '[{"label":"거의 없다","score":1},{"label":"드물게 있다","score":2},{"label":"가끔 있다","score":3},{"label":"자주 있다","score":4},{"label":"가벼운 마찰에도 쉽게 반응한다","score":5}]'::jsonb),
  ('skin_v1_q07', 'skin_v1.0', '추운 곳에서 따뜻한 실내로 들어가거나, 더운 곳에 있을 때 얼굴이 쉽게 붉어지거나 화끈거리나요?', 'likert_5', 'SR', 1, null, false, '[{"label":"거의 없다","score":1},{"label":"드물게 있다","score":2},{"label":"가끔 있다","score":3},{"label":"자주 있다","score":4},{"label":"매우 쉽게 반응한다","score":5}]'::jsonb),
  ('skin_v1_q08', 'skin_v1.0', '세안 직후 얼굴이 붉어지거나 따갑게 느껴지는 경우가 있나요?', 'likert_5', 'SR', 1, null, false, '[{"label":"거의 없다","score":1},{"label":"드물다","score":2},{"label":"가끔 있다","score":3},{"label":"자주 있다","score":4},{"label":"거의 매번 있다","score":5}]'::jsonb),
  ('skin_v1_q21', 'skin_v1.0', '스크럽·필링젤·AHA·BHA 같은 각질 제거제를 사용한 뒤, 피부에 따가움·화끈거림·붉어짐이 나타난 경험이 있나요?', 'likert_5', 'SR', 1, null, false, '[{"label":"거의 없다","score":1},{"label":"드물게 있다","score":2},{"label":"가끔 있다","score":3},{"label":"자주 있다","score":4},{"label":"사용할 때마다 쉽게 나타나는 편이다","score":5},{"label":"사용 경험 없음","score":null,"na":true}]'::jsonb),
  ('skin_v1_q22', 'skin_v1.0', '레티놀·비타민 C·고함량 나이아신아마이드 같은 고기능성 성분이 함유된 화장품을 사용한 뒤, 피부에 따가움·화끈거림·붉어짐이 나타난 경험이 있나요?', 'likert_5', 'SR', 1, null, false, '[{"label":"거의 없다","score":1},{"label":"드물게 있다","score":2},{"label":"가끔 있다","score":3},{"label":"자주 있다","score":4},{"label":"사용할 때마다 쉽게 나타나는 편이다","score":5},{"label":"사용 경험 없음","score":null,"na":true}]'::jsonb),
  ('skin_v1_q23', 'skin_v1.0', '찬바람이나 강한 에어컨 바람을 맞으면 피부가 따갑거나 붉어지는 경우가 있나요?', 'likert_5', 'SR', 1, null, false, '[{"label":"거의 없다","score":1},{"label":"드물다","score":2},{"label":"가끔 있다","score":3},{"label":"자주 있다","score":4},{"label":"매우 쉽게 나타난다","score":5}]'::jsonb),
  ('skin_v1_q24', 'skin_v1.0', '피부 컨디션이 좋지 않은 날에는 평소 잘 사용하던 제품도 따갑게 느껴지나요?', 'likert_5', 'SR', 1, null, false, '[{"label":"거의 없다","score":1},{"label":"드물다","score":2},{"label":"가끔 있다","score":3},{"label":"자주 있다","score":4},{"label":"거의 항상 그렇다","score":5}]'::jsonb),
  ('skin_v1_q09', 'skin_v1.0', '트러블이 가라앉은 뒤 갈색 또는 어두운 흔적이 남는 편인가요?', 'likert_5', 'PN', 1, null, false, '[{"label":"거의 남지 않는다","score":1},{"label":"드물게 남는다","score":2},{"label":"가끔 남는다","score":3},{"label":"자주 남고 오래간다","score":4},{"label":"대부분 진하게 남고 매우 오래간다","score":5}]'::jsonb),
  ('skin_v1_q10', 'skin_v1.0', '벌레에 물리거나 긁힌 자리도 갈색 또는 어두운 흔적으로 남는 편인가요?', 'likert_5', 'PN', 1, null, false, '[{"label":"거의 아니다","score":1},{"label":"드물다","score":2},{"label":"가끔 그렇다","score":3},{"label":"자주 그렇다","score":4},{"label":"매우 쉽게 오래 남는다","score":5}]'::jsonb),
  ('skin_v1_q11', 'skin_v1.0', '햇빛을 많이 받은 뒤 피부는 어느 쪽에 더 가까운가요?', 'ordinal_4', 'PN', 1, null, false, '[{"label":"붉어졌다가 비교적 빨리 원래 색으로 돌아온다","score":1},{"label":"붉어짐이 주로 나타나고 색 변화는 적다","score":2},{"label":"붉어짐과 피부색 변화가 모두 나타난다","score":3},{"label":"피부색이 쉽게 진해지고 오래간다","score":4}]'::jsonb),
  ('skin_v1_q12', 'skin_v1.0', '여름이나 야외활동이 많은 시기가 지나면 잡티나 색소 흔적이 더 눈에 띄는 편인가요?', 'likert_5', 'PN', 1, null, false, '[{"label":"거의 변화 없다","score":1},{"label":"약간 그렇다","score":2},{"label":"어느 정도 그렇다","score":3},{"label":"확실히 그렇다","score":4},{"label":"매우 뚜렷해진다","score":5}]'::jsonb),
  ('skin_v1_q25', 'skin_v1.0', '트러블 자국이 주변 피부색과 비슷해질 때까지 오래 걸리는 편인가요?', 'likert_5', 'PN', 1, null, false, '[{"label":"비교적 빨리 돌아온다","score":1},{"label":"약간 오래 걸린다","score":2},{"label":"보통이다","score":3},{"label":"오래 걸린다","score":4},{"label":"매우 오래 남는다","score":5}]'::jsonb),
  ('skin_v1_q26', 'skin_v1.0', '광대나 볼처럼 햇빛을 많이 받는 부위에 갈색 흔적이나 잡티가 반복적으로 생기나요?', 'likert_5', 'PN', 1, null, false, '[{"label":"거의 없다","score":1},{"label":"드물다","score":2},{"label":"가끔 있다","score":3},{"label":"자주 있다","score":4},{"label":"매우 쉽게 반복된다","score":5}]'::jsonb),
  ('skin_v1_q27', 'skin_v1.0', '가볍게 긁히거나 작은 뾰루지가 생긴 뒤, 피부가 아문 후에도 갈색 또는 어두운 흔적이 남는 경우가 있나요?', 'likert_5', 'PN', 1, null, false, '[{"label":"거의 남지 않는다","score":1},{"label":"드물게 남는다","score":2},{"label":"가끔 남는다","score":3},{"label":"자주 남고 오래간다","score":4},{"label":"작은 자극에도 흔적이 진하고 오래 남는다","score":5}]'::jsonb),
  ('skin_v1_q28', 'skin_v1.0', '햇빛을 많이 받은 뒤, 피부톤이 어두워지거나 잡티가 진해진 상태가 오래가는 편인가요?', 'likert_5', 'PN', 1, null, false, '[{"label":"거의 변화가 없다","score":1},{"label":"약간 변하지만 금방 돌아온다","score":2},{"label":"어느 정도 진해지고 며칠간 남는다","score":3},{"label":"눈에 띄게 진해지고 꽤 오래 남는다","score":4},{"label":"피부톤 변화나 잡티가 매우 뚜렷하고 오래 지속된다","score":5}]'::jsonb),
  ('skin_v1_q13', 'skin_v1.0', '표정을 짓지 않고 있을 때도 눈가나 입가에 가는 선이 보이나요?', 'likert_5', 'WT', 1, null, false, '[{"label":"거의 없다","score":1},{"label":"자세히 보면 약간 보인다","score":2},{"label":"어느 정도 보인다","score":3},{"label":"쉽게 눈에 띈다","score":4},{"label":"선명하게 보인다","score":5}]'::jsonb),
  ('skin_v1_q14', 'skin_v1.0', '2~3년 전과 비교해 볼이나 턱선이 덜 탄탄해졌다고 느끼나요?', 'likert_5', 'WT', 1, null, false, '[{"label":"거의 변화 없다","score":1},{"label":"약간 느껴진다","score":2},{"label":"어느 정도 느껴진다","score":3},{"label":"확실히 느껴진다","score":4},{"label":"매우 크게 느껴진다","score":5},{"label":"잘 모르겠어요","score":null,"na":true}]'::jsonb),
  ('skin_v1_q15', 'skin_v1.0', '웃거나 표정을 지은 뒤 눈가나 입가의 선이 얼마나 오래 남아 있나요?', 'likert_5', 'WT', 1, null, false, '[{"label":"거의 바로 사라진다","score":1},{"label":"잠시 보이다 사라진다","score":2},{"label":"어느 정도 남는다","score":3},{"label":"꽤 오래 남는다","score":4},{"label":"평소에도 선이 남아 있다","score":5}]'::jsonb),
  ('skin_v1_q16', 'skin_v1.0', '충분히 보습한 상태에서도 눈가나 입가의 잔선이 눈에 띄나요?', 'likert_5', 'WT', 1, null, false, '[{"label":"거의 없다","score":1},{"label":"약간 보인다","score":2},{"label":"어느 정도 보인다","score":3},{"label":"꽤 눈에 띈다","score":4},{"label":"매우 뚜렷하다","score":5}]'::jsonb),
  ('skin_v1_q29', 'skin_v1.0', '팔자나 입가의 선이 몇 년 전보다 더 눈에 띄나요?', 'likert_5', 'WT', 1, null, false, '[{"label":"거의 변화 없다","score":1},{"label":"약간 그렇다","score":2},{"label":"어느 정도 그렇다","score":3},{"label":"확실히 그렇다","score":4},{"label":"매우 크게 느껴진다","score":5}]'::jsonb),
  ('skin_v1_q30', 'skin_v1.0', '눈가에 가는 선이 보이는 범위가 예전보다 넓어진 것 같나요?', 'likert_5', 'WT', 1, null, false, '[{"label":"거의 변화 없다","score":1},{"label":"약간 그렇다","score":2},{"label":"어느 정도 그렇다","score":3},{"label":"확실히 그렇다","score":4},{"label":"매우 그렇다","score":5}]'::jsonb),
  ('skin_v1_q31', 'skin_v1.0', '아침과 저녁을 비교했을 때 저녁에 얼굴선이 더 처져 보이는 편인가요?', 'likert_5', 'WT', 1, null, false, '[{"label":"거의 차이 없다","score":1},{"label":"약간 차이 있다","score":2},{"label":"어느 정도 차이 있다","score":3},{"label":"확실히 차이 난다","score":4},{"label":"매우 크게 차이 난다","score":5}]'::jsonb),
  ('skin_v1_q32', 'skin_v1.0', '최근 몇 년 사이 피부가 탄탄하게 받쳐주는 느낌이 줄었다고 느끼나요?', 'likert_5', 'WT', 1, null, false, '[{"label":"거의 아니다","score":1},{"label":"약간 그렇다","score":2},{"label":"어느 정도 그렇다","score":3},{"label":"확실히 그렇다","score":4},{"label":"매우 그렇다","score":5}]'::jsonb),
  ('skin_v1_q33', 'skin_v1.0', '피부 컨디션이 한 번 나빠지면 평소 편안한 상태로 돌아오는 데 얼마나 걸리나요?', 'likert_5', 'BG', 1, null, false, '[{"label":"몇 시간 이내","score":1},{"label":"하루 정도","score":2},{"label":"2~3일","score":3},{"label":"4~7일","score":4},{"label":"일주일 이상 지속되는 경우가 있다","score":5}]'::jsonb),
  ('skin_v1_q34', 'skin_v1.0', '보습제를 충분히 발라도 1~2시간 뒤 다시 피부가 당기거나 거칠게 느껴지나요?', 'likert_5', 'BG', 1, null, false, '[{"label":"거의 없다","score":1},{"label":"드물다","score":2},{"label":"가끔 있다","score":3},{"label":"자주 있다","score":4},{"label":"거의 항상 그렇다","score":5}]'::jsonb),
  ('skin_v1_q35', 'skin_v1.0', '평소 사용하는 세안 후 피부가 거칠어지거나 하얗게 일어나는 경우가 있나요?', 'likert_5', 'BG', 1, null, false, '[{"label":"거의 없다","score":1},{"label":"드물다","score":2},{"label":"가끔 있다","score":3},{"label":"자주 있다","score":4},{"label":"거의 매번 그렇다","score":5}]'::jsonb),
  ('skin_v1_q36', 'skin_v1.0', '각질제거·필링·강한 세안 후 피부 불편감이 며칠 이상 지속되는 경우가 있나요?', 'likert_5', 'BG', 1, null, false, '[{"label":"거의 없다","score":1},{"label":"드물다","score":2},{"label":"가끔 있다","score":3},{"label":"자주 있다","score":4},{"label":"자극 후 회복이 매우 느리다","score":5},{"label":"경험 없음","score":null,"na":true}]'::jsonb),
  ('skin_v1_q37', 'skin_v1.0', '화이트헤드나 좁쌀 같은 막힌 형태의 트러블이 반복적으로 생기나요?', 'likert_5', 'AC', 1, null, false, '[{"label":"거의 없다","score":1},{"label":"드물다","score":2},{"label":"가끔 있다","score":3},{"label":"자주 있다","score":4},{"label":"관리해도 빠르게 다시 생긴다","score":5}]'::jsonb),
  ('skin_v1_q38', 'skin_v1.0', '트러블이 한 번 생긴 부위에 비슷한 트러블이 반복해서 생기나요?', 'likert_5', 'AC', 1, null, false, '[{"label":"거의 없다","score":1},{"label":"드물다","score":2},{"label":"가끔 있다","score":3},{"label":"자주 있다","score":4},{"label":"매우 자주 반복된다","score":5}]'::jsonb),
  ('skin_v1_q39', 'skin_v1.0', '유분감이 높은 크림이나 오일을 사용한 뒤 좁쌀이나 막힘이 생기는 경우가 있나요?', 'likert_5', 'AC', 1, null, false, '[{"label":"거의 없다","score":1},{"label":"드물다","score":2},{"label":"가끔 있다","score":3},{"label":"자주 있다","score":4},{"label":"매우 쉽게 생긴다","score":5},{"label":"사용 경험 없음","score":null,"na":true}]'::jsonb),
  ('skin_v1_q40', 'skin_v1.0', '최근 3개월 동안 트러블 없이 지내는 기간은 어느 정도였나요?', 'likert_5', 'AC', 1, null, false, '[{"label":"대부분의 기간 동안 깨끗했다","score":1},{"label":"가끔 트러블이 생겼다","score":2},{"label":"트러블이 생겼다 없어지기를 반복했다","score":3},{"label":"대부분의 기간에 트러블이 있었다","score":4},{"label":"거의 항상 새로운 트러블이 있었다","score":5}]'::jsonb),
  ('skin_v1_q41', 'skin_v1.0', '최근 1주일 평균 피부 당김·속건조는 어느 정도였나요?', 'numeric_0_10', 'hydration', null, 1, false, '[{"label":"0","score":0},{"label":"1","score":1},{"label":"2","score":2},{"label":"3","score":3},{"label":"4","score":4},{"label":"5","score":5},{"label":"6","score":6},{"label":"7","score":7},{"label":"8","score":8},{"label":"9","score":9},{"label":"10","score":10}]'::jsonb),
  ('skin_v1_q42', 'skin_v1.0', '최근 1주일 동안 모공이 얼마나 도드라져 보였나요?', 'likert_5', 'pore', null, 1, false, '[{"label":"거의 눈에 띄지 않았다","score":1},{"label":"약간 보였다","score":2},{"label":"보통 정도였다","score":3},{"label":"꽤 눈에 띄었다","score":4},{"label":"매우 뚜렷했다","score":5}]'::jsonb),
  ('skin_v1_q43', 'skin_v1.0', '최근 1주일 동안 피부 표면의 거칠기나 까칠함은 어느 정도였나요?', 'numeric_0_10', 'texture', null, 1, false, '[{"label":"0","score":0},{"label":"1","score":1},{"label":"2","score":2},{"label":"3","score":3},{"label":"4","score":4},{"label":"5","score":5},{"label":"6","score":6},{"label":"7","score":7},{"label":"8","score":8},{"label":"9","score":9},{"label":"10","score":10}]'::jsonb),
  ('skin_v1_q44', 'skin_v1.0', '최근 2주 동안 피부톤이 고르지 않거나 칙칙하게 느껴진 정도는?', 'likert_5', 'tone', null, 1, false, '[{"label":"거의 느끼지 않았다","score":1},{"label":"약간 느꼈다","score":2},{"label":"보통이었다","score":3},{"label":"꽤 느꼈다","score":4},{"label":"매우 신경 쓰였다","score":5}]'::jsonb),
  ('skin_v1_q45', 'skin_v1.0', '최근 3일 동안 얼굴 열감이나 붉은기는 평균적으로 어느 정도였나요?', 'numeric_0_10', 'heat_redness', null, 1, false, '[{"label":"0","score":0},{"label":"1","score":1},{"label":"2","score":2},{"label":"3","score":3},{"label":"4","score":4},{"label":"5","score":5},{"label":"6","score":6},{"label":"7","score":7},{"label":"8","score":8},{"label":"9","score":9},{"label":"10","score":10}]'::jsonb),
  ('skin_v1_q46', 'skin_v1.0', '최근 3일 동안 피부 따가움·화끈거림 같은 민감 반응은 얼마나 자주 있었나요?', 'likert_5', 'current_sensitivity', null, 1, false, '[{"label":"전혀 없었다","score":1},{"label":"한두 번 있었다","score":2},{"label":"가끔 있었다","score":3},{"label":"자주 있었다","score":4},{"label":"거의 매일 있었다","score":5}]'::jsonb),
  ('skin_v1_q47', 'skin_v1.0', '최근 1주일 동안 새로 생긴 뾰루지는 몇 개 정도였나요?', 'likert_5', 'current_acne', null, 1, false, '[{"label":"없음","score":1},{"label":"1~2개","score":2},{"label":"3~5개","score":3},{"label":"6~10개","score":4},{"label":"11개 이상 또는 계속 새로 생김","score":5}]'::jsonb),
  ('skin_v1_q48', 'skin_v1.0', '요즘 가장 신경 쓰이는 피부 고민을 최대 2개 선택해주세요.', 'multi_select', 'self_awareness', 0, 0, false, '[{"label":"유분·번들거림","score":null},{"label":"건조·속당김","score":null},{"label":"민감·자극","score":null},{"label":"색소·잡티","score":null},{"label":"탄력·주름","score":null},{"label":"트러블·좁쌀","score":null},{"label":"모공","score":null},{"label":"칙칙함·톤 불균일","score":null},{"label":"피부결","score":null},{"label":"특별한 고민 없음","score":null}]'::jsonb)
on conflict (question_id, question_version) do nothing;
