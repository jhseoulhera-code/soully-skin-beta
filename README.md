# SOULLY Skin Type Beta v3.2

## Skin Diagnosis V1.0 (48문항, question_version/algorithm_version = `skin_v1.0`)
- 완전히 새로운, 확정된 48문항 세트를 기존 v4.0(44문항, CB/HQ 축)과 나란히 추가.
  `src/questions.js`/`src/scoring.js`(v4.0)는 한 글자도 변경하지 않음 —
  새 문항/채점은 `src/questionsV1.js`/`src/scoringV1.js`에 완전히 분리
- 구조: QUICK 16 (OD4·SR4·PN4·WT4 → type16) / DEEP 48 (QUICK 16 포함 +
  OD·SR·PN·WT 각 +4, BG +4, AC +4, STATE 7, 자기인식 검증(다중선택) 1 →
  type64). BG/AC는 v4.0의 CB/HQ와 무관한 새 축 — v4.0 데이터·계산에는
  전혀 관여하지 않음
- scale_type: `likert_5`(1→0/2→25/3→50/4→75/5→100), `ordinal_4`
  (1→0/2→33.333/3→66.667/4→100, Q11만 해당), `numeric_0_10`(value×10,
  Q41/Q43/Q45만 해당), `multi_select`(Q48, 최대 2개, validation_only —
  TYPE/STATE 어느 점수에도 반영되지 않음)
- N/A('사용 경험 없음'/'잘 모르겠어요', Q14·Q21·Q22·Q36·Q39)는 DB에는
  그대로 저장하되 numerator·denominator 모두에서 제외 — 0점으로 계산하지
  않음 (`src/scoringV1.js`, `scripts/testSkinV1.mjs`로 검증)
- TYPE 6축(OD/SR/PN/WT/BG/AC)과 STATE 7축(hydration/pore/texture/tone/
  heat_redness/current_sensitivity/current_acne)은 완전히 분리 계산 —
  STATE는 type16/type64 문자 판정에 전혀 사용되지 않음
- 저장은 기존 anonymous diagnosis tracking 인프라를 그대로 재사용
  (visitors/diagnosis_sessions/diagnosis_answers/diagnosis_results, RLS,
  handoff, MY SKIN HISTORY 모두 v1.0에도 동일하게 적용) —
  `createDiagnosisSession`에 버전 오버라이드를 추가하고,
  `saveDiagnosisResultV1`(신규, v4.0의 `saveDiagnosisResult`는 미변경)만
  추가로 도입. `supabase-migration-skin-v1-questions.sql` 실행 시
  `diagnosis_results`에 5개 nullable 컬럼(pore_visibility_score/
  texture_score/heat_redness_score/current_sensitivity_score/
  current_acne_score)만 추가되고, `question_definitions`에 skin_v1.0
  48행이 추가됨(기존 v4.0 44행은 유지) — 전부 additive, 컬럼/행 삭제 없음
- 검증: `npm run test:skin-v1`(구조·정규화·N/A 제외·type16/64 생성 단위
  테스트), `npm run test:e2e`(Playwright — V1.0 QUICK/DEEP 전체 플로우,
  다중선택 2개 제한, v4.0 QUICK 회귀 스모크 테스트)

## 질문 데이터 모델 안정화 (algorithm V1.0 prep)
- 질문/문항/점수식/타입판정 내용은 이번 작업에서 변경 없음 — `src/questions.js`
  각 질문에 `id`(기존 `tag` 승격, 답변 상태·DB 저장 키로 사용)와
  `scale_type/time_reference/type_weight/state_weight/reverse_scored/
  validation_only/question_version/helper_text` 메타데이터만 추가
- 점수 계산은 `src/scoring.js`로 분리(순수 함수, App.jsx 밖에서 단위테스트 가능).
  리팩터링 전/후 44문항 전체 응답 기준 `analysis.p`/`type16`/`type64` 완전 동일함을
  자동 비교 테스트로 검증(리포트 참고)
- `supabase-migration-question-data-model.sql` 실행 시(`diagnosis-tracking.sql` 이후)
  `diagnosis_answers.answer_values`(다중선택용, nullable) 컬럼과
  `question_definitions`(질문 버전 스냅샷, 관리자 전용 조회) 테이블 추가.
  둘 다 additive — 기존 row/컬럼 변경·삭제 없음
- multi_select/numeric_0_10/likert_5 스케일은 구조만 준비되어 있고 실제 문항에는
  아직 적용 안 됨 (`src/questions.js` 상단 데이터 모델 주석 참고)

## v4.0 익명 진단 추적 + MY SKIN HISTORY
- 비회원도 로그인 없이 끝까지 진단 가능 (기존과 동일)
- **필수 설정**: Supabase 대시보드 Authentication > Sign In / Providers >
  Anonymous 에서 "Allow anonymous sign-ins"를 켜야 함. 방문자 식별자
  (visitor_id)가 브라우저가 지어낸 값이 아니라 실제 Supabase Auth
  익명 세션의 auth.uid()이기 때문 — RLS가 "자기 세션만 쓰기 가능"을
  실제로 보장하는 근거. 자세한 이유는 `supabase-migration-diagnosis-tracking.sql`
  상단 "v2 security rewrite" 주석 참고
- `supabase-migration-diagnosis-tracking.sql`을 Supabase SQL 에디터에서 실행하면
  visitors / diagnosis_sessions / diagnosis_answers / diagnosis_results / admins
  테이블과 RLS가 추가됨 (`supabase-schema.sql`의 기존 테이블은 그대로 유지)
- 결과 화면 하단 "내 피부 변화 저장하기"로 이메일 회원가입 시 같은
  auth.uid()가 그대로 유지되며(익명→정회원 전환) 기존 진단 기록이
  자동으로 계정에 연결되고 MY SKIN HISTORY에서 이전 결과와 비교 가능
- 카카오 로그인은 Supabase 대시보드에서 Provider를 켜기 전까지는 버튼만
  존재하는 준비 상태

## v3.2 변경
- 중간 챕터를 선택해서 건너뛰는 기능 제거
- 항상 1번 챕터부터 시작
- 챕터가 끝나면 다음 챕터로 계속 이어짐
- 전체 질문 기준 진행률 % 표시
- 중간 피드백 화면에도 전체 진행률 표시
- 기존 카카오톡/이메일 사전등록 및 Supabase 구조 유지

## 실행
```bash
npm install
npm run dev -- --host 0.0.0.0
```

## 같은 네트워크에서 접속
현재 PC IPv4가 `192.168.219.47`이면 동료는:
`http://192.168.219.47:5173`

접속이 안 되면 Windows 방화벽 또는 회사 네트워크에서 PC 간 통신을 막고 있을 가능성이 큽니다.
