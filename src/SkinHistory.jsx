import React, { useEffect, useState } from 'react'
import { fetchSkinHistory, getRepresentativeResult } from './diagnosisTracking'

const AXIS_ROWS = [
  ['oil_score', '유분'],
  ['sensitivity_score', '민감도'],
  ['pigmentation_score', '색소'],
  ['aging_score', '노화'],
  ['pore_score', '모공'],
  ['heat_score', '열반응']
]

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// Two results are only safe to compare score-for-score if they were scored
// by the same algorithm against the same question set — otherwise a score
// delta could just reflect a changed scoring formula or question bank, not
// an actual skin change.
function sameVersion(a, b) {
  return !!a && !!b &&
    a.session?.algorithm_version === b.session?.algorithm_version &&
    a.session?.question_set_version === b.session?.question_set_version
}

// Members-only screen: past diagnosis_results for this user, newest first,
// each preserved as its own row (no overwriting), plus a latest-vs-previous
// comparison. Reuses phone-card/lead-kicker/mode-badge/muted styling from
// styles.css so it reads as part of the same app.
export default function SkinHistory({ userId, onClose }) {
  const [items, setItems] = useState(null)

  useEffect(() => {
    let alive = true
    fetchSkinHistory(userId).then(data => { if (alive) setItems(data) })
    return () => { alive = false }
  }, [userId])

  if (items === null) {
    return <main className="screen">
      <section className="phone-card history-card">
        <div className="brand">SOULLY</div>
        <p className="muted">불러오는 중...</p>
      </section>
    </main>
  }

  const latest = items[0]
  const previous = items[1]
  const comparable = sameVersion(latest, previous)
  const representative = getRepresentativeResult(items)

  return <main className="screen">
    <section className="phone-card history-card">
      <div className="brand">SOULLY</div>
      <h2>MY SKIN HISTORY</h2>
      <p className="muted">내 피부 변화를 기록하고 비교해요.</p>

      {items.length === 0 && <div className="insight-card">
        <b>아직 저장된 진단이 없어요</b>
        <p>진단을 완료하고 결과를 저장하면 여기에서 변화를 확인할 수 있어요.</p>
      </div>}

      {latest && previous && <div className="history-block">
        <h3>최근 변화</h3>
        {comparable ? AXIS_ROWS.map(([key, label]) => {
          const cur = latest[key]
          const prev = previous[key]
          if (cur == null || prev == null) return null
          return <div className="history-compare-row" key={key}>
            <span>{label}</span>
            <b>{prev} → {cur}</b>
          </div>
        }) : <div className="insight-card">
          <b>진단 기준이 변경되어 직접 비교가 제한됩니다</b>
          <p>이전 진단과 알고리즘 또는 문항 구성이 달라 점수를 그대로 비교할 수 없어요. 두 결과 모두 아래 기록에는 그대로 남아있어요.</p>
        </div>}
      </div>}

      {representative && <div className="history-block">
        <h3>현재 대표 결과{representative.session?.test_type ? ` · ${representative.session.test_type}` : ''}</h3>
        <div className="history-compare-row"><span>피부타입</span><b>{representative.skin_type}</b></div>
      </div>}

      {items.length > 0 && <div className="history-block">
        <h3>전체 진단 기록</h3>
        <div className="history-list">
          {items.map(r => <div className="history-list-item" key={r.id}>
            <div className="history-list-top">
              {r.session?.test_type && <span className="mode-badge">{r.session.test_type}</span>}
              <span className="muted">{formatDate(r.created_at)}</span>
            </div>
            <div className="history-list-type">{r.skin_type}</div>
            <div className="history-list-scores">
              {AXIS_ROWS.map(([key, label]) => r[key] != null && (
                <span key={key}>{label} {r[key]}</span>
              ))}
            </div>
          </div>)}
        </div>
      </div>}

      <button className="cta purple" onClick={onClose}>돌아가기</button>
    </section>
  </main>
}
