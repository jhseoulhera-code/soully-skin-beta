-- ============================================================================
-- Question data model stabilization (algorithm V1.0 prep)
-- ============================================================================
-- Additive only. Run this after both supabase-schema.sql and
-- supabase-migration-diagnosis-tracking.sql. Does not touch any existing
-- table's existing columns/rows/policies — see each section for exactly
-- what's added.
--
-- Context: src/questions.js's 44 questions were given a stable `id` (was
-- `tag` — already unique across all 44, promoted in place, no value
-- changed) plus explicit per-question metadata (scale_type, time_reference,
-- type_weight, state_weight, reverse_scored, validation_only,
-- question_version, helper_text). No question text, scoring formula, or
-- type-determination logic changed — see src/scoring.js's extracted
-- computeAnalysis() and the before/after comparison test run against it
-- (documented in the completion report) for the equivalence proof.
--
-- Because `id` is a straight rename of the already-unique `tag` value (same
-- strings, not new ones), every diagnosis_answers.question_id row written
-- before this change already contains the correct value — NO BACKFILL is
-- needed for existing answer rows.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. diagnosis_answers.answer_values — multi-select support.
--    Nullable, additive column. Existing single-select rows are completely
--    unaffected: they continue to use answer_value/answer_label/
--    option_index exactly as before and simply leave this new column null.
--    A multi_select question (none exist yet — see src/questions.js's data
--    model comment) instead leaves answer_value/answer_label/option_index
--    null and stores its selected option labels here as a JSON array, e.g.
--    '["유분","민감"]'::jsonb. See chooseMulti()/recordAnswer() in
--    src/App.jsx and src/diagnosisTracking.js.
-- ----------------------------------------------------------------------------
alter table public.diagnosis_answers add column if not exists answer_values jsonb;

-- ----------------------------------------------------------------------------
-- 2. question_definitions — versioned snapshot of question metadata.
--    Preserves what a question_id + question_version actually meant at the
--    time it was answered (text/scale_type/axis/weights/options), so a
--    future algorithm change can still correctly reinterpret historical
--    diagnosis_answers rows instead of relying on git history for
--    src/questions.js. Reference/audit data, not something the running app
--    reads from or writes to at request time — see the RLS note below.
-- ----------------------------------------------------------------------------
create table if not exists public.question_definitions (
  id uuid primary key default gen_random_uuid(),
  question_id text not null,
  question_version text not null,
  text text not null,
  scale_type text not null,
  axis text,
  type_weight numeric,
  state_weight numeric,
  reverse_scored boolean not null default false,
  options_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (question_id, question_version)
);

create index if not exists idx_question_definitions_question_id on public.question_definitions (question_id);

alter table public.question_definitions enable row level security;

-- Admin-only read, same pattern as the "admin can view all ..." policies in
-- supabase-migration-diagnosis-tracking.sql (uses the same public.is_admin()
-- helper). No insert/update/delete policy for anon or authenticated: this
-- table is meant to be seeded/maintained via the Supabase SQL editor (or a
-- future CI step) whenever src/questions.js changes, not written to by the
-- running app.
create policy "admin can view question definitions"
on public.question_definitions
for select
to authenticated
using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. Seed: the current 44-question v4.0 bank, generated directly from
--    src/questions.js (not hand-transcribed) so text/options/weights here
--    are byte-identical to what actually shipped. Establishes the pattern:
--    the next time src/questions.js changes meaningfully, insert a new
--    batch here under the new question_version (or updated rows for
--    existing ids under a new version — question_id + question_version
--    together are unique, so old versions are never overwritten).
-- ----------------------------------------------------------------------------
insert into public.question_definitions
  (question_id, question_version, text, scale_type, axis, type_weight, state_weight, reverse_scored, options_json)
values
  ('post_cleanse', 'v4.0', '세안 후 아무것도 바르지 않고 10분이 지나면 가장 가까운 상태는?', 'bipolar_4', 'OD', 1.5, null, false, '[{"label":"얼굴 전체가 많이 당긴다","score":-3},{"label":"볼이나 입 주변이 당긴다","score":-1},{"label":"크게 불편하지 않다","score":1},{"label":"코·이마부터 유분이 느껴진다","score":3}]'::jsonb),
  ('morning_surface', 'v4.0', '아침에 일어났을 때 피부 표면은 어떤가요?', 'bipolar_4', 'OD', 1, null, false, '[{"label":"건조하고 푸석하다","score":-3},{"label":"볼은 건조하지만 T존은 괜찮다","score":-1},{"label":"편안한 편이다","score":1},{"label":"코·이마 또는 얼굴 전체에 유분이 있다","score":3}]'::jsonb),
  ('afternoon_change', 'v4.0', '오후가 되면 가장 먼저 느껴지는 변화는?', 'bipolar_4', 'OD', 1, null, false, '[{"label":"전체적으로 푸석해진다","score":-3},{"label":"볼은 건조하고 T존만 번들거린다","score":0},{"label":"아침과 크게 다르지 않다","score":1},{"label":"T존이나 얼굴 전체가 번들거린다","score":3}]'::jsonb),
  ('oil_management', 'v4.0', '오후가 되면 코 주변 유분을 닦아내거나 수정 화장을 자주 하나요?', 'bipolar_4', 'OD', 1, null, false, '[{"label":"거의 하지 않는다","score":-2},{"label":"가끔 한다","score":0},{"label":"하루 1번 정도","score":2},{"label":"하루 여러 번 한다","score":3}]'::jsonb),
  ('combo_skin', 'v4.0', '코와 이마는 번들거리는데 볼은 당기는 경우가 있나요?', 'bipolar_4', 'OD', 1, null, false, '[{"label":"거의 없다","score":-1},{"label":"가끔 있다","score":1},{"label":"자주 있다","score":2},{"label":"매우 자주 있다","score":3}]'::jsonb),
  ('makeup_wear', 'v4.0', '메이크업이나 선크림을 바른 날 시간이 지나면?', 'bipolar_4', 'OD', 1, null, false, '[{"label":"들뜨거나 갈라진다","score":-3},{"label":"볼·입 주변만 건조해진다","score":-1},{"label":"큰 변화가 없다","score":1},{"label":"유분 때문에 쉽게 무너진다","score":3}]'::jsonb),
  ('fragrance', 'v4.0', '향이 강한 스킨케어 제품을 사용했을 때 피부가 불편해진 적이 있나요?', 'bipolar_4', 'SR', 1.5, null, false, '[{"label":"거의 없다","score":-3},{"label":"향은 느껴지지만 피부 반응은 없다","score":-1},{"label":"가끔 따갑거나 붉어진다","score":2},{"label":"향이 강하면 피부가 쉽게 불편해진다","score":3}]'::jsonb),
  ('fragrance_avoid', 'v4.0', '향료나 에센셜오일이 들어간 제품을 피부 때문에 일부러 피하는 편인가요?', 'bipolar_4', 'SR', 1.5, null, false, '[{"label":"전혀 아니다","score":-3},{"label":"거의 아니다","score":-1},{"label":"가끔 피한다","score":2},{"label":"가능하면 피하는 편이다","score":3}]'::jsonb),
  ('alcohol', 'v4.0', '알코올감이 강한 토너나 선제품을 사용하면 따갑거나 건조해지나요?', 'bipolar_4', 'SR', 1, null, false, '[{"label":"거의 없다","score":-3},{"label":"가끔","score":-1},{"label":"자주","score":2},{"label":"매우 자주","score":3}]'::jsonb),
  ('cleansing_sensitivity', 'v4.0', '세안 직후 얼굴이 붉어지거나 화끈거리는 편인가요?', 'bipolar_4', 'SR', 1, null, false, '[{"label":"거의 없다","score":-3},{"label":"가끔 그렇다","score":-1},{"label":"자주 그렇다","score":2},{"label":"거의 항상 그렇다","score":3}]'::jsonb),
  ('recovery', 'v4.0', '새 화장품 사용 후 불편함이 생겼다면 보통 얼마나 오래 지속되나요?', 'bipolar_4', 'SR', 1, null, false, '[{"label":"10분 이내","score":-3},{"label":"몇 시간","score":-1},{"label":"하루 정도","score":2},{"label":"2일 이상","score":3}]'::jsonb),
  ('friction', 'v4.0', '마스크·수건·화장솜처럼 피부에 마찰이 생긴 뒤 쉽게 붉어지나요?', 'bipolar_4', 'SR', 1, null, false, '[{"label":"거의 아니다","score":-3},{"label":"가끔","score":-1},{"label":"자주","score":2},{"label":"매우 자주","score":3}]'::jsonb),
  ('environment', 'v4.0', '냉난방이 강한 공간이나 건조한 바람에 피부가 쉽게 불편해지나요?', 'bipolar_4', 'SR', 1, null, false, '[{"label":"거의 아니다","score":-3},{"label":"가끔","score":-1},{"label":"자주","score":2},{"label":"매우 자주","score":3}]'::jsonb),
  ('behavior', 'v4.0', '처음 쓰는 제품을 바로 얼굴 전체에 바르는 것이 부담스럽나요?', 'bipolar_4', 'SR', 1, null, false, '[{"label":"전혀 아니다","score":-3},{"label":"크게 부담 없다","score":-1},{"label":"작은 부위부터 써본다","score":2},{"label":"새 제품 자체가 부담스럽다","score":3}]'::jsonb),
  ('trouble_mark', 'v4.0', '트러블이 가라앉은 뒤 갈색이나 어두운 흔적이 남나요?', 'bipolar_4', 'PN', 1.5, null, false, '[{"label":"거의 남지 않는다","score":-3},{"label":"가끔 남는다","score":-1},{"label":"자주 남는다","score":2},{"label":"거의 항상 오래 남는다","score":3}]'::jsonb),
  ('bug_bite_mark', 'v4.0', '벌레에 물리거나 긁힌 자리가 어둡게 남는 편인가요?', 'bipolar_4', 'PN', 1, null, false, '[{"label":"거의 아니다","score":-3},{"label":"가끔","score":-1},{"label":"자주","score":2},{"label":"매우 잘 남는다","score":3}]'::jsonb),
  ('sun_darkening', 'v4.0', '햇빛을 많이 받은 뒤 내 피부는?', 'bipolar_4', 'PN', 1, null, false, '[{"label":"붉었다가 비교적 빨리 돌아온다","score":-3},{"label":"약간 어두워진다","score":-1},{"label":"쉽게 탄다","score":2},{"label":"어두워진 상태가 오래간다","score":3}]'::jsonb),
  ('fade_speed', 'v4.0', '잡티나 흔적이 생긴 뒤 색이 옅어지는 속도는 어떤가요?', 'bipolar_4', 'PN', 1, null, false, '[{"label":"비교적 빨리 옅어진다","score":-3},{"label":"조금 오래 걸린다","score":-1},{"label":"꽤 오래 걸린다","score":2},{"label":"매우 오래 남는 편이다","score":3}]'::jsonb),
  ('wound_discoloration', 'v4.0', '작은 상처가 아문 뒤에도 색 변화가 남나요?', 'bipolar_4', 'PN', 1, null, false, '[{"label":"거의 없다","score":-3},{"label":"약간 남는다","score":-1},{"label":"꽤 오래 남는다","score":2},{"label":"오래 지속된다","score":3}]'::jsonb),
  ('uneven_tone', 'v4.0', '얼굴에 피부톤이 고르지 않은 부분이 눈에 띄나요?', 'bipolar_4', 'PN', 1, null, false, '[{"label":"거의 없다","score":-3},{"label":"약간 있다","score":-1},{"label":"꽤 눈에 띈다","score":2},{"label":"가장 큰 고민 중 하나다","score":3}]'::jsonb),
  ('fine_lines_static', 'v4.0', '표정을 짓지 않아도 눈가나 입가에 잔선이 보이나요?', 'bipolar_4', 'WT', 1, null, false, '[{"label":"거의 없다","score":-3},{"label":"아주 약간","score":-1},{"label":"눈에 띈다","score":2},{"label":"확실히 보인다","score":3}]'::jsonb),
  ('less_firm_vs_past', 'v4.0', '몇 년 전보다 피부가 덜 탱탱해졌다고 느끼나요?', 'bipolar_4', 'WT', 1.5, null, false, '[{"label":"거의 변화 없다","score":-3},{"label":"약간","score":-1},{"label":"꽤 그렇다","score":2},{"label":"확실히 그렇다","score":3}]'::jsonb),
  ('sagging', 'v4.0', '볼이나 턱선이 예전보다 처져 보인다고 느끼나요?', 'bipolar_4', 'WT', 1, null, false, '[{"label":"전혀 아니다","score":-3},{"label":"약간","score":-1},{"label":"꽤 그렇다","score":2},{"label":"많이 그렇다","score":3}]'::jsonb),
  ('elasticity_press_test', 'v4.0', '피부를 눌렀을 때 예전보다 탄성이 덜하다고 느끼나요?', 'bipolar_4', 'WT', 1, null, false, '[{"label":"거의 아니다","score":-3},{"label":"약간","score":-1},{"label":"꽤 그렇다","score":2},{"label":"확실히 그렇다","score":3}]'::jsonb),
  ('sleep_deprived_dullness', 'v4.0', '수면이 부족한 날 피부가 유난히 푸석하고 힘없어 보이나요?', 'bipolar_4', 'WT', 1, null, false, '[{"label":"거의 변화 없다","score":-3},{"label":"약간","score":-1},{"label":"꽤 그렇다","score":2},{"label":"매우 그렇다","score":3}]'::jsonb),
  ('recovery_speed', 'v4.0', '피부가 피곤해 보인 뒤 원래 컨디션으로 돌아오는 속도는?', 'bipolar_4', 'WT', 1, null, false, '[{"label":"빠른 편","score":-3},{"label":"하루 정도","score":-1},{"label":"이틀 이상","score":2},{"label":"쉽게 회복되지 않는다","score":3}]'::jsonb),
  ('comedone_touch', 'v4.0', '코나 턱을 만졌을 때 오돌토돌한 느낌이 있나요?', 'bipolar_4', 'CB', 1, null, false, '[{"label":"거의 없다","score":-3},{"label":"가끔","score":-1},{"label":"자주","score":2},{"label":"거의 항상","score":3}]'::jsonb),
  ('whiteheads', 'v4.0', '화이트헤드나 좁쌀이 생기는 편인가요?', 'bipolar_4', 'CB', 1.5, null, false, '[{"label":"거의 없다","score":-3},{"label":"가끔","score":-1},{"label":"자주","score":2},{"label":"매우 자주","score":3}]'::jsonb),
  ('blackhead_recurrence', 'v4.0', '블랙헤드를 관리해도 쉽게 다시 눈에 띄나요?', 'bipolar_4', 'CB', 1, null, false, '[{"label":"거의 아니다","score":-3},{"label":"가끔","score":-1},{"label":"자주","score":2},{"label":"매우 빠르게 다시 생긴다","score":3}]'::jsonb),
  ('heavy_cream_reaction', 'v4.0', '무거운 크림이나 오일을 충분히 바르면?', 'bipolar_4', 'CB', 1, null, false, '[{"label":"피부가 더 편안하다","score":-3},{"label":"별 차이 없다","score":-1},{"label":"답답할 때가 있다","score":2},{"label":"좁쌀이나 트러블이 잘 생긴다","score":3}]'::jsonb),
  ('makeup_days_pore_clog', 'v4.0', '선크림이나 메이크업을 며칠 연속 사용하면?', 'bipolar_4', 'CB', 1, null, false, '[{"label":"특별한 변화 없다","score":-3},{"label":"약간 답답하다","score":-1},{"label":"모공이 막히는 느낌이 든다","score":2},{"label":"트러블이 쉽게 생긴다","score":3}]'::jsonb),
  ('stress_sleep_breakout', 'v4.0', '스트레스나 수면 부족 후 모공막힘이나 트러블이 늘어나나요?', 'bipolar_4', 'CB', 1, null, false, '[{"label":"거의 변화 없다","score":-3},{"label":"약간 늘어난다","score":-1},{"label":"확실히 늘어난다","score":2},{"label":"매우 심해진다","score":3}]'::jsonb),
  ('heat_face_flush', 'v4.0', '더운 곳에 오래 있으면 얼굴이 쉽게 뜨거워지나요?', 'bipolar_4', 'HQ', 1.5, null, false, '[{"label":"거의 없다","score":-3},{"label":"가끔","score":-1},{"label":"자주","score":2},{"label":"매우 자주","score":3}]'::jsonb),
  ('exercise_flush_duration', 'v4.0', '운동 후 얼굴의 열감이나 붉음은 얼마나 지속되나요?', 'bipolar_4', 'HQ', 1, null, false, '[{"label":"거의 없다","score":-3},{"label":"10분 이내","score":-1},{"label":"10~30분","score":2},{"label":"30분 이상","score":3}]'::jsonb),
  ('sun_heat_discomfort', 'v4.0', '강한 햇빛을 받은 뒤 피부가 뜨겁거나 불편하게 느껴지나요?', 'bipolar_4', 'HQ', 1, null, false, '[{"label":"거의 아니다","score":-3},{"label":"약간","score":-1},{"label":"꽤 그렇다","score":2},{"label":"매우 그렇다","score":3}]'::jsonb),
  ('humid_weather_response', 'v4.0', '덥고 습한 날 피부는?', 'bipolar_4', 'HQ', 1, null, false, '[{"label":"오히려 편안하다","score":-3},{"label":"큰 변화 없다","score":-1},{"label":"유분과 답답함이 늘어난다","score":2},{"label":"열감·붉음·트러블이 확실히 늘어난다","score":3}]'::jsonb),
  ('spicy_food_flush', 'v4.0', '매운 음식이나 뜨거운 음식을 먹으면 얼굴이 붉어지나요?', 'bipolar_4', 'HQ', 1, null, false, '[{"label":"거의 없다","score":-3},{"label":"가끔","score":-1},{"label":"자주","score":2},{"label":"매우 자주","score":3}]'::jsonb),
  ('mask_ventilation_discomfort', 'v4.0', '마스크를 오래 쓰거나 환기가 안 되는 곳에 있으면?', 'bipolar_4', 'HQ', 1, null, false, '[{"label":"거의 변화 없다","score":-3},{"label":"조금 불편하다","score":-1},{"label":"뜨겁고 답답하다","score":2},{"label":"피부 컨디션이 확실히 나빠진다","score":3}]'::jsonb),
  ('sleep', 'v4.0', '최근 3일 동안 수면은 어땠나요?', 'ordinal_3', 'sleep', null, 1, false, '[{"label":"충분했다","score":0},{"label":"조금 부족했다","score":1},{"label":"많이 부족했다","score":2}]'::jsonb),
  ('dehydration', 'v4.0', '최근 1주일 피부 당김은?', 'ordinal_3', 'dehydration', null, 1, false, '[{"label":"평소와 비슷하다","score":0},{"label":"조금 심해졌다","score":1},{"label":"많이 심해졌다","score":2}]'::jsonb),
  ('trouble', 'v4.0', '최근 1주일 트러블은?', 'ordinal_3', 'trouble', null, 1, false, '[{"label":"평소와 비슷하다","score":0},{"label":"조금 늘었다","score":1},{"label":"많이 늘었다","score":2}]'::jsonb),
  ('heat', 'v4.0', '오늘 얼굴의 열감은?', 'ordinal_4', 'heat', null, 1, false, '[{"label":"편안하다","score":0},{"label":"약간 따뜻하다","score":1},{"label":"꽤 뜨겁다","score":2},{"label":"화끈거리고 불편하다","score":3}]'::jsonb),
  ('stress', 'v4.0', '최근 스트레스 정도는?', 'ordinal_4', 'stress', null, 1, false, '[{"label":"낮다","score":0},{"label":"보통","score":1},{"label":"높다","score":2},{"label":"매우 높다","score":3}]'::jsonb),
  ('new_product', 'v4.0', '최근 2주 안에 새로운 화장품을 사용했나요?', 'ordinal_4', 'new_product', null, 1, false, '[{"label":"아니다","score":0},{"label":"1개 정도","score":1},{"label":"2~3개","score":2},{"label":"여러 제품을 바꿨다","score":3}]'::jsonb)
on conflict (question_id, question_version) do nothing;
