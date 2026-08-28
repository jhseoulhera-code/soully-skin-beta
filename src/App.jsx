import React, { useEffect, useMemo, useRef, useState } from 'react'
import { chapters, questions } from './questions'
import { saveLead } from './supabase'
import { AuthProvider, useAuth } from './auth'
import AuthPanel from './AuthPanel'
import SkinHistory from './SkinHistory'
import {
  ensureVisitorRecord,
  createDiagnosisSession,
  recordAnswer,
  completeSession,
  saveDiagnosisResult,
  markVisitorAsMember
} from './diagnosisTracking'

const AXIS = {
  OD:['유분','건조'],
  SR:['민감','저민감'],
  PN:['색소흔적','비색소'],
  WT:['노화징후','탄력안정'],
  CB:['모공막힘','밸런스'],
  HQ:['열반응','안정']
}

const chunk = (arr, size=2) => arr.reduce((acc,_,i)=>(i%size?acc: [...acc, arr.slice(i,i+size)]),[])

// weightTotal is the sum of each answered question's weight (default 1), not
// a plain count — a weight-1.5 "anchor" question counts for 1.5x as much of
// the axis's -3..+3 range on both sides of the average.
function pct(weightedSum,weightTotal){
  if(!weightTotal) return 50
  const max=weightTotal*3
  return Math.max(0,Math.min(100,Math.round(((weightedSum+max)/(max*2))*100)))
}

const AXIS_META = {
  OD: ['유분', '#B9A7F3'],
  SR: ['민감', '#F1DFA7'],
  PN: ['색소', '#E8C1D1'],
  WT: ['노화', '#C4D3EA'],
  CB: ['모공', '#F2C1B5'],
  HQ: ['열반응', '#F2CE9E']
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

// Wraps the diagnosis flow with auth state (Supabase Auth — the auth
// system this project already has connected via src/supabase.js). Nothing
// inside DiagnosisApp's existing questions/scoring/result design changes;
// this only makes `useAuth()` available to it.
export default function App(){
  return <AuthProvider><DiagnosisApp/></AuthProvider>
}

function DiagnosisApp(){
  const { user, isMember } = useAuth()
  const [screen,setScreen]=useState('landing')
  const [mode,setMode]=useState(null) // 'quick' (16, 4-axis) | 'deep' (64, 6-axis)
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
  const [show64Gate,setShow64Gate]=useState(false)
  const [showDetailed64Type,setShowDetailed64Type]=useState(false)
  const [submitting,setSubmitting]=useState(false)
  // A ref (not the `submitting` state) is the actual double-submit guard:
  // it's mutated synchronously, so two clicks fired in the same tick — before
  // React has re-rendered the disabled button — still can't both pass it.
  const submittingRef=useRef(false)

  // --- anonymous diagnosis tracking (visitor/session/answers/result) ---
  const [sessionId,setSessionId]=useState(null)
  const [showAuthPanel,setShowAuthPanel]=useState(false)
  const [savedToAccount,setSavedToAccount]=useState(false)
  // Guards saveDiagnosisResult against firing twice for the same session
  // (re-renders, React StrictMode's double-invoke in dev).
  const resultSavedForRef=useRef(null)
  // Reset when the current question changes, so response_time_ms measures
  // time-on-question rather than time-since-app-open.
  const questionShownAtRef=useRef(Date.now())
  // Synchronous mutex for startDiagnosis (see below): the "처음부터
  // 시작하기" button awaits session creation before navigating, so without
  // this a fast double-click could still fire two createDiagnosisSession
  // calls before the first one disables the button via re-render.
  const startingSessionRef=useRef(false)
  const [startingDiagnosis,setStartingDiagnosis]=useState(false)

  useEffect(()=>{ ensureVisitorRecord() },[])

  useEffect(()=>{
    questionShownAtRef.current=Date.now()
  },[chapterIndex,batchIndex,screen])

  useEffect(()=>{
    if(screen!=='result' || !sessionId) return
    if(resultSavedForRef.current===sessionId) return
    resultSavedForRef.current=sessionId
    ;(async()=>{
      await completeSession(sessionId)
      await saveDiagnosisResult(sessionId, analysis, mode)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[screen,sessionId])

  // Single entry point into the quiz: every path that leads to the first
  // question (currently just the journey screen's "처음부터 시작하기"
  // button, including the QUICK result screen's "DEEP 64 정밀진단
  // 받아보기" path, which routes back through this same journey screen)
  // goes through here, so exactly one diagnosis_session is ever created per
  // attempt and it always exists before the first question is shown.
  const startDiagnosis=async()=>{
    if(startingSessionRef.current || !mode) return
    startingSessionRef.current=true
    setStartingDiagnosis(true)
    try{
      const { sessionId: newSessionId } = await createDiagnosisSession(mode.toUpperCase())
      setChapterIndex(0);setBatchIndex(0);setShowInsight(false)
      resultSavedForRef.current=null
      setSavedToAccount(false)
      setSessionId(newSessionId)
      setScreen('test')
    }finally{
      startingSessionRef.current=false
      setStartingDiagnosis(false)
    }
  }

  const toggleMethod=(key)=>setRecommendMethods(v=>v.includes(key)?v.filter(x=>x!==key):[...v,key])

  // Answers/progress state is untouched here — only the scroll position resets
  // whenever the visible "page" (screen/chapter/batch/insight) changes, so a
  // new question always opens at the top instead of wherever the last page
  // happened to be scrolled to.
  useEffect(()=>{
    window.scrollTo(0,0)
  },[screen,chapterIndex,batchIndex,showInsight])

  // The question bank is filtered once per mode: QUICK 16 only ever sees its
  // 18 four-axis questions; DEEP 64 sees the same 18 plus the 20 more
  // (including all of CB/HQ, which QUICK never asks) that make up its 38
  // type questions, plus the 6-question "최근의 내 피부" state chapter.
  // Chapters with no question in the active mode (e.g. 모공/열반응/최근의
  // 내 피부 chapters under QUICK) simply don't appear — nothing else needs
  // to special-case chapter visibility.
  const activeQuestions = useMemo(
    () => mode ? questions.filter(q=>q.modes.includes(mode)) : [],
    [mode]
  )
  const activeChapters = useMemo(
    () => chapters.filter(c=>activeQuestions.some(q=>q.chapter===c.id)),
    [activeQuestions]
  )

  const chapter=activeChapters[chapterIndex]
  const chapterQs=chapter ? activeQuestions.filter(q=>q.chapter===chapter.id) : []
  // One question per screen: every diagnosis question here is single-choice,
  // so picking an answer auto-advances (see `choose` below) instead of
  // waiting for a manual "다음" click.
  const batches=chunk(chapterQs,1)
  const currentBatch=batches[batchIndex] || []

  const answeredCount = Object.keys(answers).length
  const totalQuestions = activeQuestions.length
  const overallPercent = totalQuestions ? Math.min(100, Math.round((answeredCount / totalQuestions) * 100)) : 0

  const analysis=useMemo(()=>{
    const sums={OD:0,SR:0,PN:0,WT:0,CB:0,HQ:0}
    const weights={OD:0,SR:0,PN:0,WT:0,CB:0,HQ:0}
    const weather={}
    const tags={}
    activeQuestions.forEach(q=>{
      const picked=answers[q.text]
      if(picked===undefined) return
      const opt=q.options[picked]
      if(q.state) weather[q.axis]=opt.score
      else if(sums[q.axis]!==undefined){
        const w=q.weight||1
        sums[q.axis]+=opt.score*w; weights[q.axis]+=w
        if(q.tag) tags[q.tag]=opt.score
      }
    })
    const p={}
    Object.keys(sums).forEach(k=>p[k]=pct(sums[k],weights[k]))
    const type16=(p.OD>=50?'O':'D')+(p.SR>=50?'S':'R')+(p.PN>=50?'P':'N')+(p.WT>=50?'W':'T')
    // type64 only exists once CB/HQ were actually asked (DEEP mode) — QUICK
    // never measures those two axes, so it never gets a real 64-code.
    const hasDeepAxes = weights.CB>0 && weights.HQ>0
    const type64 = hasDeepAxes ? type16+(p.CB>=50?'C':'B')+(p.HQ>=50?'H':'Q') : null
    // Per policy: a user who has both a 16 and a 64 result uses the 64
    // result as their representative code.
    const primaryType = type64 || type16
    return {p,type16,type64,primaryType,weather,tags}
  },[answers,activeQuestions])

  // Holds the pending "advance to next question" timer. Re-selecting an
  // answer (or picking a different one) before it fires cancels and
  // reschedules it, so a fast double-tap on an answer — or changing one's
  // mind within the delay window — can never fire two advances for one
  // question; only the last selection before the delay elapses counts.
  const advanceTimerRef=useRef(null)

  const choose=(q,i)=>{
    setAnswers(v=>({...v,[q.text]:i}))
    if(sessionId){
      const responseTimeMs=Date.now()-questionShownAtRef.current
      recordAnswer(sessionId,{
        questionId: q.tag,
        answerValue: q.options[i].score,
        answerLabel: q.options[i].label,
        optionIndex: i,
        responseTimeMs
      })
    }
    if(advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    // Long enough to see the answer highlight before the screen changes,
    // short enough not to feel like a delay.
    advanceTimerRef.current=setTimeout(()=>{
      advanceTimerRef.current=null
      nextBatch()
    },200)
  }

  const nextBatch=()=>{
    if(batchIndex < batches.length-1){
      setBatchIndex(i=>i+1)
    }else{
      setShowInsight(true)
    }
  }

  const nextChapter=()=>{
    setShowInsight(false)
    if(chapterIndex < activeChapters.length-1){
      setChapterIndex(i=>i+1); setBatchIndex(0)
    }else setScreen('result')
  }

  const prev=()=>{
    // A manual "이전" click always wins over a still-pending auto-advance —
    // otherwise the stale timer could fire moments later and shove the user
    // forward again right after they navigated back.
    if(advanceTimerRef.current){clearTimeout(advanceTimerRef.current);advanceTimerRef.current=null}
    if(showInsight){setShowInsight(false); return}
    if(batchIndex>0){setBatchIndex(i=>i-1); return}
    if(chapterIndex>0){
      const pi=chapterIndex-1
      const prevQs=activeQuestions.filter(q=>q.chapter===activeChapters[pi].id)
      setChapterIndex(pi); setBatchIndex(Math.max(0,chunk(prevQs,1).length-1))
    }
  }

  const submitLead = async () => {
    // Guards against a double click (or any duplicate call in the same
    // click event) inserting the same registration twice — once a save is
    // in flight, or has already succeeded, this is a no-op.
    if(submittingRef.current || showDetailed64Type) return
    const value = contactValue.trim()
    if(!value || !consent){
      setLeadStatus('연락처와 동의 항목을 확인해주세요.')
      return
    }
    submittingRef.current=true
    setSubmitting(true)
    setLeadStatus('')
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
        source: 'beta-web'
      })
      if(res?.success){
        // Only a confirmed save unlocks the detailed 64-type reveal.
        setShowDetailed64Type(true)
      }else{
        setLeadStatus('정보 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.')
      }
    }catch(e){
      console.error(e)
      setLeadStatus('정보 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.')
    }finally{
      submittingRef.current=false
      setSubmitting(false)
    }
  }

  // authMode 'signup' converted the current anonymous session (same
  // auth.uid() throughout), so existing rows just need their `user_id`
  // marker backfilled via markVisitorAsMember(). authMode 'signin' switched
  // to a different, pre-existing account — nothing to do here for that case:
  // signInExistingMember() in src/auth.jsx already minted and redeemed a
  // handoff claim around the identity switch itself, so by the time this
  // runs every completed diagnosis this browser owned is already reassigned.
  const handleAuthSuccess = async (authUser, authMode) => {
    setShowAuthPanel(false)
    if(!authUser) return // email-confirmation-pending signup: no session yet
    if(authMode==='signup'){
      await markVisitorAsMember()
    }
    setSavedToAccount(true)
  }

  const theme={'--accent':chapter?.accent,'--soft':chapter?.soft,'--deep':chapter?.deep}

  if(screen==='history') return <SkinHistory userId={user?.id} onClose={()=>setScreen('landing')}/>

  if(screen==='landing') return <main className="screen landing">
    <div className="orb orb1"/><div className="orb orb2"/>
    <section className="phone-card intro-card">
      <div className="brand">SOULLY</div>
      <div className="spark">✦</div>
      <h1>나를 가장 잘 아는<br/>피부 탐색</h1>
      <div className="kicker">SKIN TYPE BETA</div>
      <p>피부의 일상 반응을 따라가며<br/>나만의 피부 성향을 섬세하게 분석해요.</p>
      <div className="meta"><span>회원가입 없음</span><span>무료</span></div>
      {isMember && <button className="text-btn" onClick={()=>setScreen('history')}>MY SKIN HISTORY 보기</button>}

      <div className="mode-picker">
        <button className="mode-card mode-card--quick" onClick={()=>{setMode('quick');setScreen('journey')}}>
          <span className="mode-card-title">QUICK 16</span>
          <span className="mode-card-desc">18문항 · 1~2분 · 4축 기본 진단</span>
        </button>
        <button className="mode-card mode-card--deep" onClick={()=>{setMode('deep');setScreen('journey')}}>
          <span className="mode-card-title">DEEP 64</span>
          <span className="mode-card-desc">38문항 내외 · 4~5분 · 6축 정밀 진단</span>
        </button>
      </div>
      <small>회원가입 없이 바로 시작할 수 있어요.</small>
    </section>
  </main>

  if(screen==='journey') return <main className="screen">
    <section className="phone-card journey-card">
      <div className="journey-head">
        <div>
          <div className="brand">SOULLY</div>
          <h2>{mode==='deep'?'피부 정밀 탐색 여정':'피부 빠른 탐색 여정'}</h2>
          <p>{activeChapters.length}개의 장면을 따라가며 피부를 살펴봐요 · 약 {mode==='deep'?'4~5':'1~2'}분</p>
        </div>
      </div>
      <div className="journey-list">
        {activeChapters.map((c,i)=><div key={c.id} className="journey-row static">
          <div className="hexnum" style={{background:c.soft,color:c.deep,borderColor:c.accent}}>{i+1}</div>
          <div><strong>{c.title}</strong><span>{c.label}</span></div>
          <i>{i===0?'START':'•'}</i>
        </div>)}
      </div>
      <button className="cta purple" onClick={startDiagnosis} disabled={startingDiagnosis}>
        {startingDiagnosis?'준비 중...':'처음부터 시작하기'}
      </button>
    </section>
  </main>

  if(screen==='result'){
    const activeAxisKeys = mode==='deep' ? ['OD','SR','PN','WT','CB','HQ'] : ['OD','SR','PN','WT']
    const vals = activeAxisKeys.map(k=>[AXIS_META[k][0], analysis.p[k], AXIS_META[k][1]])
    return <main className="screen result-screen">
      <section className="phone-card result-card">
        <div className="brand">SOULLY SKIN TYPE</div>
        <div className="mode-badge">{mode==='deep'?'DEEP 64':'QUICK 16'}</div>
        <p className="muted">당신의 Skin Type</p>
        <h1 className="type">{analysis.primaryType}</h1>
        {analysis.type64 && <p className="type-sub">Skin16 기준 · {analysis.type16}</p>}
        <h3>나만의 피부 성향 프로필</h3>

        <HexRadar data={vals.map(([label,value])=>({label,value}))} />

        <div className="polygon-grid">
          {vals.map(([l,v,c])=><div className="result-poly" key={l} style={{'--pc':c}}>
            <strong>{v}</strong><span>{l}</span>
          </div>)}
        </div>

        <div className="score-box">
          {activeAxisKeys.map(k=><div className="score-line" key={k}>
            <div><b>{AXIS[k][0]} {analysis.p[k]}</b><span>{AXIS[k][1]} {100-analysis.p[k]}</span></div>
            <div className="track"><i style={{width:`${analysis.p[k]}%`}}/></div>
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

        {mode==='quick' && <div className="lead-card unlock-teaser">
          <div className="lead-kicker">SOULLY SKIN 64</div>
          <h3>64가지 세부 피부 MBTI가 궁금하다면?</h3>
          <p>지금 결과는 4축 기반 QUICK 16이에요. 모공(CB)·열반응(HQ)까지 더한 DEEP 64 정밀진단을 받아보면 64타입 세부 결과를 확인할 수 있어요.</p>
          <button className="cta purple" onClick={()=>{
            setAnswers({});setChapterIndex(0);setBatchIndex(0);setMode('deep');setScreen('journey')
          }}>DEEP 64 정밀진단 받아보기</button>
        </div>}

        {mode==='deep' && !showDetailed64Type && !show64Gate && <div className="lead-card unlock-teaser">
          <div className="lead-kicker">SOULLY SKIN 64</div>
          <h3>내 피부 MBTI를 더 자세히 알고 싶나요?</h3>
          <p>카카오톡 또는 이메일을 남기면 64가지 세부 피부 MBTI 결과를 확인할 수 있어요.</p>
          <button className="cta purple" onClick={()=>setShow64Gate(true)}>64타입 상세 결과 보기</button>
        </div>}

        {mode==='deep' && !showDetailed64Type && show64Gate && <div className="lead-card">
          <div className="lead-kicker">SOULLY SKIN 64</div>
          <h3>64타입 피부 MBTI 결과를 받아보세요</h3>
          <p>카카오톡 또는 이메일을 남기고 개인정보 수집에 동의하면 상세 결과를 바로 확인할 수 있어요.</p>

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
            <span>개인정보 수집 및 이용에 동의합니다. (연락처, 피부진단 결과 — 64타입 결과 제공 및 안내 목적)</span>
          </label>

          <button className="cta lead-submit" onClick={submitLead} disabled={submitting}>
            {submitting?'등록 중...':'내 64타입 결과 확인하기'}
          </button>
          {leadStatus && <div className="lead-status">{leadStatus}</div>}
        </div>}

        {mode==='deep' && showDetailed64Type && <div className="lead-card detail64-card">
          <div className="lead-kicker">SOULLY SKIN 64</div>
          <h3>64타입 피부 MBTI 상세 결과</h3>
          <p>등록이 완료됐어요! 64타입 세부 분석 알고리즘과 콘텐츠는 곧 이 화면에 채워질 예정이에요.</p>
          <div className="coming"><span>PREPARING</span><b>Skin 64 · {analysis.type64}</b></div>
        </div>}

        <div className="lead-card save-history-card">
          {isMember ? <>
            <h3>{savedToAccount ? '오늘의 결과가 저장되었어요' : '이 결과는 내 계정에 저장돼요'}</h3>
            <p>MY SKIN HISTORY에서 이전 결과와 비교해볼 수 있어요.</p>
            <button className="cta purple" onClick={()=>setScreen('history')}>MY SKIN HISTORY 보기</button>
          </> : <>
            <h3>내 피부 변화 저장하기</h3>
            <p>오늘의 결과를 저장하면 다음 진단에서 내 피부가 어떻게 달라졌는지 비교할 수 있어요.</p>
            <button className="cta purple" onClick={()=>setShowAuthPanel(true)}>내 피부 변화 저장하기</button>
          </>}
        </div>

        <button className="cta purple" onClick={()=>{
          setAnswers({});setChapterIndex(0);setBatchIndex(0);setScreen('landing');setMode(null)
          setContactValue('');setConsent(false);setLeadStatus('')
          setShow64Gate(false);setShowDetailed64Type(false);setSubmitting(false);submittingRef.current=false
          setSessionId(null);setSavedToAccount(false);resultSavedForRef.current=null
        }}>처음부터 다시 하기</button>
      </section>
      {showAuthPanel && <AuthPanel onSuccess={handleAuthSuccess} onClose={()=>setShowAuthPanel(false)}/>}
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
      <button className="cta themed-btn" onClick={nextChapter}>{chapterIndex===activeChapters.length-1?'결과 보기':'다음 챕터'}</button>
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
        {activeChapters.map((c,i)=><div className="hex-step" key={c.id}>
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
        <button className="back back-solo" onClick={prev} disabled={chapterIndex===0&&batchIndex===0}>← 이전</button>
      </footer>
    </section>
  </main>
}
