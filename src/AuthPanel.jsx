import React, { useState } from 'react'
import { convertAnonymousToMember, signInExistingMember, linkKakaoIdentity } from './auth'

// Signup/login modal used from the result screen's "내 피부 변화 저장하기" CTA.
// Deliberately reuses existing lead-card/contact-input/method-tabs styling
// from styles.css so it looks native to the app instead of introducing a
// second visual language.
export default function AuthPanel({ onSuccess, onClose }) {
  const [mode, setMode] = useState('signup') // 'signup' | 'signin'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const value = email.trim()
    if (!value || password.length < 6) {
      setStatus('이메일과 6자 이상 비밀번호를 입력해주세요.')
      return
    }
    setBusy(true)
    setStatus('')
    const fn = mode === 'signup' ? convertAnonymousToMember : signInExistingMember
    const { data, error } = await fn(value, password)
    setBusy(false)
    if (error) {
      setStatus(error.message || '처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.')
      return
    }
    // Converting an anonymous session (signup) sends a confirmation email
    // when the project requires one — until it's confirmed the session is
    // still anonymous (is_anonymous stays true), so treat that as pending
    // rather than success.
    if (mode === 'signup' && data?.user?.is_anonymous !== false) {
      setStatus('가입 확인 메일을 보냈어요. 메일함을 확인한 뒤 다시 로그인해주세요.')
      return
    }
    onSuccess?.(data?.user ?? null, mode)
  }

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true">
      <div className="phone-card auth-panel">
        <button type="button" className="auth-close" onClick={onClose} aria-label="닫기">×</button>
        <div className="lead-kicker">MY SKIN HISTORY</div>
        <h3>{mode === 'signup' ? '내 피부 변화 저장하기' : '로그인하고 이어보기'}</h3>
        <p>오늘의 결과를 저장하면 다음 진단에서 내 피부가 어떻게 달라졌는지 비교할 수 있어요.</p>

        <div className="method-tabs">
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setStatus('') }}>회원가입</button>
          <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setStatus('') }}>로그인</button>
        </div>

        <form onSubmit={submit}>
          <input
            className="contact-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="이메일"
          />
          <input
            className="contact-input auth-password-input"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호 (6자 이상)"
          />
          <button className="cta lead-submit" type="submit" disabled={busy}>
            {busy ? '처리 중...' : mode === 'signup' ? '가입하고 저장하기' : '로그인'}
          </button>
        </form>

        <button
          type="button"
          className="auth-kakao"
          disabled
          title="카카오 로그인은 아직 준비 중이에요"
          onClick={linkKakaoIdentity}
        >
          카카오로 시작하기 (준비중)
        </button>

        {status && <div className="lead-status">{status}</div>}
      </div>
    </div>
  )
}
