import React, { useEffect, useMemo, useRef, useState } from 'react'
import { chapters, questions } from './questions'
import { saveLead, saveDiagnosis, getOrCreateAnonymousId } from './supabase'

const AXIS = {
  OD:['유분','건조'],
  SR:['민감','저민감'],
  PN:['색소흔적','비색소'],
  WT:['노화징후','탄력안정'],
  CB:['모공막힘','밸런스'],
  HQ:['열반응','안정']
}

const chunk = (arr, size=2) => arr.reduce((acc,_,i)=>(i%size?acc: [...acc, arr.slice(i,i+size)]),[])

function pct(sum,count){
  if(!count) return 50
  const max=count*3
  return Math.max(0,Math.min(100,Math.round(((sum+max)/(max*2))*100)))
}

const INTENT_OPTIONS = [
  { key: 'very', label: '매우 받고 싶다' },
  { key: 'interested', label: '관심 있다' },
  { key: 'unsure', label: '아직 잘 모르겠다' },
  { key: 'no', label: '필요하지 않다' }
]

const METHOD_OPTIONS = [
  { key: 'skin_type', label: '피부타입 기반' },
  { key: 'current_state', label: '현재 피부상태 기반' },
  { key: 'routine', label: '아침/저녁 루틴' },
  { key: 'season', label: '계절/날씨 기반' },
  { key: 'concern', label: '고민별 집중 추천' },
  { key: 'subscription', label: '세트/구독 추천' }
]

function HexRadar({ data }) {
  const cx = 110, cy = 140, R = 82
  const LABEL_R = R + 26
  const angleFor = i => (Math.PI * 2 * i) / data.length - Math.PI / 2
  const pointFor = (i, r) => {
    const a = angleFor(i)
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }
  const dataPoints = data.map((d, i) => pointFor(i, R * Math.max(0.06, d.value / 100)))
  const dataPath = dataPoints.map(p => p.join(',')).join(' ')
  return (
    <svg viewBox={`0 0 220 ${cy + LABEL_R + 24}`} className="hex-radar" style={{ overflow: 'visible' }} role="img" aria-label="6축 피부 성향 그래프">
      {[0.25, 0.5, 0.75, 1].map((lv, li) => (
        <polygon key={li} points={data.map((_, i) => pointFor(i, R * lv).join(',')).join(' ')} className="hex-radar-grid" />
      ))}
      {data.map((_, i) => {
        const [x, y] = pointFor(i, R)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className="hex-radar-axis" />
      })}
      <polygon points={dataPath} className="hex-radar-shape" />
      {data.map((d, i) => {
        const [x, y] = pointFor(i, R)
        return <circle key={d.label} cx={x} cy={y} r="3.5" className="hex-radar-dot" />
      })}
      {data.map((d, i) => {
        const [x, y] = pointFor(i, R + 26)
        return (
          <text key={d.label} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="hex-radar-label">
            {d.label} {d.value}
          </text>
        )
      })}
    </svg>
  )
}

export default function App(){
  const [screen,setScreen]=useState('landing')
  const [chapterIndex,setChapterIndex]=useState(0)
  const [batchIndex,setBatchIndex]=useState(0)
  const [answers,setAnswers]=useState({})
  const [showInsight,setShowInsight]=useState(false)
  const [contactMethod,setContactMethod]=useState('kakao')
  const [contactValue,setContactValue]=useState('')
  const [consent,setConsent]=useState(false)
  const [leadStatus,setLeadStatus]=useState('')
  const [recommendIntent,setRecommendIntent]=useState('')
  const [recommendMethods,setRecommendMethods]=useState([])

  // Guards the auto-save-on-result effect below: true once this run's
  // diagnosis row has been (or is being) written, so a StrictMode double
  // effect-fire or an unrelated re-render on the result screen can never
  // insert a second row for the same completed diagnosis. Cleared only
  // when a fresh run starts (entering the journey screen), so doing the
  // test again from scratch still creates a new row.
  const diagnosisSavedRef=useRef(false)
  const diagnosisIdRef=useRef(null)

  const toggleMethod=(key)=>setRecommendMethods(v=>v.includes(key)?v.filter(x=>x!==key):[...v,key])

  // Answers/progress state is untouched here — only the scroll position resets
  // whenever the visible "page" (screen/chapter/batch/insight) changes, so a
  // new question always opens at the top instead of wherever the last page
  // happened to be scrolled to.
  useEffect(()=>{
    window.scrollTo(0,0)
  },[screen,chapterIndex,batchIndex,showInsight])

  useEffect(()=>{
    if(screen==='journey'){
      diagnosisSavedRef.current=false
      diagnosisIdRef.current=null
    }
  },[screen])

  const chapter=chapters[chapterIndex]
  const chapterQs=questions.filter(q=>q.chapter===chapter.id)
  const batches=chunk(chapterQs,2)
  const currentBatch=batches[batchIndex] || []
  const batchDone=currentBatch.every(q=>answers[q.text]!==undefined)

  const answeredCount = Object.keys(answers).length
  const totalQuestions = questions.length
  const overallPercent = Math.min(100, Math.round((answeredCount / totalQuestions) * 100))

  const analysis=useMemo(()=>{
    const sums={OD:0,SR:0,PN:0,WT:0,CB:0,HQ:0}
    const counts={OD:0,SR:0,PN:0,WT:0,CB:0,HQ:0}
    const weather={}
    const tags={}
    questions.forEach(q=>{
      const picked=answers[q.text]
      if(picked===undefined) return
      const opt=q.options[picked]
      if(q.state) weather[q.axis]=opt.score
      else if(sums[q.axis]!==undefined){
        sums[q.axis]+=opt.score; counts[q.axis]++
        if(q.tag) tags[q.tag]=opt.score
      }
    })
    const p={}
    Object.keys(sums).forEach(k=>p[k]=pct(sums[k],counts[k]))
    const type16=(p.OD>=50?'O':'D')+(p.SR>=50?'S':'R')+(p.PN>=50?'P':'N')+(p.WT>=50?'W':'T')
    const type64=type16+(p.CB>=50?'C':'B')+(p.HQ>=50?'H':'Q')
    return {p,type16,type64,weather,tags}
  },[answers])

  // Every completed diagnosis is saved as soon as the result screen is
  // reached — with or without the visitor ever registering a contact —
  // so this data accumulates for every anonymous visitor, not only the
  // ones who fill in the lead form further down this screen. A failed
  // save is only logged: it must never block or blank out the result UI.
  useEffect(()=>{
    if(screen!=='result') return
    if(diagnosisSavedRef.current) return
    diagnosisSavedRef.current=true
    saveDiagnosis({
      anonymous_id: getOrCreateAnonymousId(),
      skin_type: analysis.type16,
      skin64_candidate: analysis.type64,
      oil_score: analysis.p.OD,
      sensitivity_score: analysis.p.SR,
      pigmentation_score: analysis.p.PN,
      aging_score: analysis.p.WT,
      congestion_score: analysis.p.CB,
      heat_score: analysis.p.HQ,
      answers,
      skin_version: 'v3.3'
    }).then(res=>{
      if(res?.ok) diagnosisIdRef.current=res.id
    }).catch(e=>{
      console.error('진단 자동 저장 실패 (결과 화면에는 영향 없음):', e)
    })
  },[screen])

  const choose=(q,i)=>setAnswers(v=>({...v,[q.text]:i}))

  const nextBatch=()=>{
    if(batchIndex < batches.length-1){
      setBatchIndex(i=>i+1)
    }else{
      setShowInsight(true)
    }
  }

  const nextChapter=()=>{
    setShowInsight(false)
    if(chapterIndex < chapters.length-1){
      setChapterIndex(i=>i+1); setBatchIndex(0)
    }else setScreen('result')
  }

  const prev=()=>{
    if(showInsight){setShowInsight(false); return}
    if(batchIndex>0){setBatchIndex(i=>i-1); return}
    if(chapterIndex>0){
      const pi=chapterIndex-1
      const prevQs=questions.filter(q=>q.chapter===chapters[pi].id)
      setChapterIndex(pi); setBatchIndex(Math.max(0,chunk(prevQs,2).length-1))
    }
  }

  const submitLead = async () => {
    const value = contactValue.trim()
    if(!value || !consent){
      setLeadStatus('연락처와 동의 항목을 확인해주세요.')
      return
    }
    try{
      const res = await saveLead({
        contact_method: contactMethod,
        contact_value: value,
        consent,
        skin16: analysis.type16,
        skin64_candidate: analysis.type64,
        oil_score: analysis.p.OD,
        sensitivity_score: analysis.p.SR,
        pigmentation_score: analysis.p.PN,
        aging_score: analysis.p.WT,
        congestion_score: analysis.p.CB,
        heat_score: analysis.p.HQ,
        recommend_intent: recommendIntent || null,
        recommend_methods: recommendMethods,
        answers,
        skin_version: 'v3.3',
        diagnosis_id: diagnosisIdRef.current,
        source: 'beta-web'
      })
      setLeadStatus(res.mode === 'supabase'
        ? '등록됐어요. 정식 버전 소식을 보내드릴게요.'
        : '이 PC에 임시 저장됐어요. Supabase를 연결하면 회사 전체 응답을 한곳에 모을 수 있어요.')
    }catch(e){
      console.error(e)
      setLeadStatus('저장 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  const theme={'--accent':chapter?.accent,'--soft':chapter?.soft,'--deep':chapter?.deep}

  if(screen==='landing') return <main className="screen landing">
    <div className="orb orb1"/><div className="orb orb2"/>
    <section className="phone-card intro-card">
      <div className="brand">SOULLY</div>
      <div className="spark">✦</div>
      <h1>나를 가장 잘 아는<br/>피부 탐색</h1>
      <div className="kicker">SKIN TYPE BETA</div>
      <p>피부의 일상 반응을 따라가며<br/>나만의 피부 성향을 섬세하게 분석해요.</p>
      <div className="meta"><span>약 5–7분</span><span>8개 챕터</span><span>무료</span></div>
      <button className="cta purple" onClick={()=>setScreen('journey')}>테스트 시작하기</button>
      <small>회원가입 없이 바로 시작할 수 있어요.</small>
    </section>
  </main>

  if(screen==='journey') return <main className="screen">
    <section className="phone-card journey-card">
      <div className="journey-head">
        <div><div className="brand">SOULLY</div><h2>피부 탐색 여정</h2><p>8개의 장면을 따라가며 피부를 살펴봐요.</p></div>
      </div>
      <div className="journey-list">
        {chapters.map((c,i)=><div key={c.id} className="journey-row static">
          <div className="hexnum" style={{background:c.soft,color:c.deep,borderColor:c.accent}}>{i+1}</div>
          <div><strong>{c.title}</strong><span>{c.label}</span></div>
          <i>{i===0?'START':'•'}</i>
        </div>)}
      </div>
      <button className="cta purple" onClick={()=>{setChapterIndex(0);setBatchIndex(0);setShowInsight(false);setScreen('test')}}>처음부터 시작하기</button>
    </section>
  </main>

  if(screen==='result'){
    const vals=[
      ['유분',analysis.p.OD,'#B9A7F3'],['민감',analysis.p.SR,'#F1DFA7'],
      ['색소',analysis.p.PN,'#E8C1D1'],['노화',analysis.p.WT,'#C4D3EA'],
      ['모공',analysis.p.CB,'#F2C1B5'],['열반응',analysis.p.HQ,'#F2CE9E']
    ]
    return <main className="screen result-screen">
      <section className="phone-card result-card">
        <div className="brand">SOULLY SKIN TYPE</div>
        <p className="muted">당신의 Skin Type</p>
        <h1 className="type">{analysis.type16}</h1>
        <h3>나만의 피부 성향 프로필</h3>

        <HexRadar data={vals.map(([label,value])=>({label,value}))} />

        <div className="polygon-grid">
          {vals.map(([l,v,c])=><div className="result-poly" key={l} style={{'--pc':c}}>
            <strong>{v}</strong><span>{l}</span>
          </div>)}
        </div>

        <div className="score-box">
          {[
            ['OD',analysis.p.OD],['SR',analysis.p.SR],['PN',analysis.p.PN],
            ['WT',analysis.p.WT],['CB',analysis.p.CB],['HQ',analysis.p.HQ]
          ].map(([k,v])=><div className="score-line" key={k}>
            <div><b>{AXIS[k][0]} {v}</b><span>{AXIS[k][1]} {100-v}</span></div>
            <div className="track"><i style={{width:`${v}%`}}/></div>
          </div>)}
        </div>

        {analysis.tags.fragrance >= 2 && <div className="insight-card">
          <b>향 민감 반응이 보여요</b>
          <p>향이 강한 제품이나 향료·에센셜오일이 포함된 제품은 제품 선택 시 우선 확인하는 것이 좋아요.</p>
        </div>}

        <div className="recommend-card">
          <div className="lead-kicker">맞춤 추천 의향</div>
          <h3>추후 내 피부에 맞는 제품 추천을 받고 싶나요?</h3>
          <div className="intent-options">
            {INTENT_OPTIONS.map(o=>
              <button
                key={o.key}
                className={`intent-btn ${recommendIntent===o.key?'selected':''}`}
                onClick={()=>setRecommendIntent(o.key)}
              >{o.label}</button>
            )}
          </div>
          {recommendIntent && recommendIntent!=='no' && <>
            <p className="recommend-sub">원하는 추천 방식을 골라주세요 (복수 선택 가능)</p>
            <div className="method-options">
              {METHOD_OPTIONS.map(o=>
                <button
                  key={o.key}
                  className={`method-chip ${recommendMethods.includes(o.key)?'selected':''}`}
                  onClick={()=>toggleMethod(o.key)}
                >{o.label}</button>
              )}
            </div>
          </>}
        </div>

        <div className="lead-card">
          <div className="lead-kicker">SOULLY 64 사전 등록</div>
          <h3>내 결과를 다시 받아보고 싶나요?</h3>
          <p>정식 Skin 64 오픈 소식과 내 피부 결과 업데이트를 받아볼 연락처를 남겨주세요.</p>

          <div className="method-tabs">
            <button
              className={contactMethod==='kakao'?'active':''}
              onClick={()=>{setContactMethod('kakao');setLeadStatus('')}}
            >카카오톡</button>
            <button
              className={contactMethod==='email'?'active':''}
              onClick={()=>{setContactMethod('email');setLeadStatus('')}}
            >이메일</button>
          </div>

          <input
            className="contact-input"
            type={contactMethod==='email'?'email':'text'}
            value={contactValue}
            onChange={e=>setContactValue(e.target.value)}
            placeholder={contactMethod==='email'?'example@company.com':'카카오톡 ID 또는 연락 가능한 번호'}
          />

          <label className="consent-row">
            <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} />
            <span>SOULLY Skin 64 오픈 및 피부 결과 안내를 위한 연락처 저장에 동의합니다.</span>
          </label>

          <button className="cta lead-submit" onClick={submitLead}>등록하기</button>
          {leadStatus && <div className="lead-status">{leadStatus}</div>}
        </div>

        <div className="coming"><span>COMING SOON</span><b>Skin 64 · {analysis.type64}</b></div>
        <button className="cta purple" onClick={()=>{setAnswers({});setChapterIndex(0);setBatchIndex(0);setScreen('landing');setContactValue('');setConsent(false);setLeadStatus('')}}>처음부터 다시 하기</button>
      </section>
    </main>
  }

  if(showInsight) return <main className="screen themed" style={theme}>
    <section className="phone-card insight-screen">
      <div className="brand">SOULLY</div>
      <div className="insight-progress">
        <span>전체 진행률</span><strong>{overallPercent}%</strong>
      </div>
      <div className="big-hex" style={{background:chapter.soft,color:chapter.deep}}>{chapter.emoji}</div>
      <h2>{chapter.title}</h2>
      <p>{chapter.intro}</p>
      <div className="mini-note">이 챕터의 피부 신호를 확인했어요.</div>
      <button className="cta themed-btn" onClick={nextChapter}>{chapterIndex===chapters.length-1?'결과 보기':'다음 챕터'}</button>
      <button className="text-btn" onClick={prev}>이전으로</button>
    </section>
  </main>

  return <main className="screen themed" style={theme}>
    <section className="phone-card test-card">
      <header className="test-head">
        <div><div className="brand">SOULLY</div><h2>{chapter.emoji} {chapter.title}</h2></div>
        <span>{overallPercent}%</span>
      </header>

      <div className="overall-progress">
        <div className="overall-progress-top">
          <span>전체 피부 탐색 진행률</span>
          <strong>{overallPercent}%</strong>
        </div>
        <div className="overall-track"><i style={{width:`${overallPercent}%`}} /></div>
      </div>

      <div className="hex-progress">
        {chapters.map((c,i)=><div className="hex-step" key={c.id}>
          <div className={`hex ${i===chapterIndex?'current':i<chapterIndex?'done':''}`} style={{'--hc':c.accent,'--hs':c.soft,'--hd':c.deep}}>{i+1}</div>
          <small>{c.title}</small>
        </div>)}
      </div>

      <div className="category">{chapter.label}</div>

      <div className="question-panel">
        {currentBatch.map(q=><article className="question" key={q.text}>
          <h3>{q.text}</h3>
          <div className="answers">
            {q.options.map((o,i)=><button key={o.label} className={`answer ${answers[q.text]===i?'selected':''}`} onClick={()=>choose(q,i)}>
              <span className="mini-check">{answers[q.text]===i?'✓':''}</span><span>{o.label}</span>
            </button>)}
          </div>
        </article>)}
      </div>

      <footer className="nav">
        <button className="back" onClick={prev} disabled={chapterIndex===0&&batchIndex===0}>← 이전</button>
        <button className="next themed-btn" disabled={!batchDone} onClick={nextBatch}>{batchIndex===batches.length-1?'챕터 마치기':'다음 →'}</button>
      </footer>
    </section>
  </main>
}
