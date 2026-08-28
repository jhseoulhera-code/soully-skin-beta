# SOULLY Skin Type Beta v3.2

## v4.0 익명 진단 추적 + MY SKIN HISTORY
- 비회원도 로그인 없이 끝까지 진단 가능 (기존과 동일)
- `supabase-migration-diagnosis-tracking.sql`을 Supabase SQL 에디터에서 실행하면
  visitors / diagnosis_sessions / diagnosis_answers / diagnosis_results / admins
  테이블과 RLS가 추가됨 (`supabase-schema.sql`의 기존 테이블은 그대로 유지)
- 결과 화면 하단 "내 피부 변화 저장하기"로 이메일 회원가입/로그인 시
  해당 브라우저의 익명 진단 기록이 계정에 연결되고 MY SKIN HISTORY에서
  이전 결과와 비교 가능
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
