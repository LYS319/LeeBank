import { useNavigate } from "react-router-dom";

function SendIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M7 7h12M19 7l-3.5-3.5M19 7l-3.5 3.5M17 17H5M5 17l3.5-3.5M5 17l3.5 3.5"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" fill="currentColor" />
    </svg>
  );
}

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* ── 상단 네비 (데스크탑에서만 보임) ── */}
      <header className="landing__nav">
        <div className="landing__nav-brand">
          <span className="landing__nav-mark">B</span>
          <span className="landing__nav-name">LeeBank</span>
        </div>
        <div className="landing__nav-actions">
          <button className="landing__nav-link" onClick={() => navigate("/login")}>
            로그인
          </button>
          <button className="landing__nav-cta" onClick={() => navigate("/signup")}>
            계좌 만들기
          </button>
        </div>
      </header>

      {/* ── 히어로: 채팅으로 보여주는 핵심 가치 ── */}
      <section className="landing__hero">
        <div className="landing__hero-copy">
          <p className="landing__eyebrow">대화로 끝내는 은행 업무</p>
          <h1 className="landing__headline">
            계좌번호 누르지 말고,<br />그냥 말하세요
          </h1>
          <p className="landing__sub">
            "엄마한테 5만원 보내줘" 한마디면 끝.
            <br className="landing__sub-break" />
            LeeBank는 말로 시키는 은행입니다.
          </p>
          <div className="landing__hero-actions">
            <button className="landing__cta-primary" onClick={() => navigate("/signup")}>
              지금 시작하기
            </button>
            <button className="landing__cta-secondary" onClick={() => navigate("/login")}>
              로그인
            </button>
          </div>
        </div>

        {/* 미니 채팅 데모 — 정적 목업 */}
        <div className="landing__hero-demo" aria-hidden="true">
          <div className="landing__demo-window">
            <div className="landing__demo-bar">
              <span /><span /><span />
            </div>
            <div className="landing__demo-body">
              <div className="landing__demo-bubble landing__demo-bubble--user">
                엄마한테 5만원 보내줘
              </div>
              <div className="landing__demo-bubble landing__demo-bubble--ai">
                엄마(004-12-345678)님께 50,000원을 보낼게요.
                비밀번호를 입력해주세요.
              </div>
              <div className="landing__demo-pin">
                <span className="landing__demo-dot landing__demo-dot--filled" />
                <span className="landing__demo-dot landing__demo-dot--filled" />
                <span className="landing__demo-dot landing__demo-dot--filled" />
                <span className="landing__demo-dot landing__demo-dot--filled" />
                <span className="landing__demo-dot" />
                <span className="landing__demo-dot" />
              </div>
              <div className="landing__demo-bubble landing__demo-bubble--ai">
                이체 완료! 남은 잔액은 92,000원이에요.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 핵심 가치 3가지 ── */}
      <section className="landing__features">
        <div className="landing__feature">
          <span className="landing__feature-icon"><SendIcon /></span>
          <h3 className="landing__feature-title">말로 보내는 이체</h3>
          <p className="landing__feature-desc">
            받는 사람, 금액, 시간을 말하면 AI가 알아듣고 바로 처리해요.
          </p>
        </div>
        <div className="landing__feature">
          <span className="landing__feature-icon"><ShieldIcon /></span>
          <h3 className="landing__feature-title">안전한 인증</h3>
          <p className="landing__feature-desc">
            모든 거래는 비밀번호 확인을 거쳐요. 개인정보는 암호화해 보관해요.
          </p>
        </div>
        <div className="landing__feature">
          <span className="landing__feature-icon"><SparkleIcon /></span>
          <h3 className="landing__feature-title">AI 소비 분석</h3>
          <p className="landing__feature-desc">
            쌓인 거래내역을 AI가 분석해서 이번 달 소비 패턴을 알려줘요.
          </p>
        </div>
      </section>

      {/* ── 하단 CTA ── */}
      <section className="landing__footer-cta">
        <h2 className="landing__footer-title">1분이면 계좌가 만들어져요</h2>
        <button className="landing__cta-primary" onClick={() => navigate("/signup")}>
          계좌 만들고 시작하기
        </button>
      </section>

      <footer className="landing__footer">
        <p>LeeBank — 포트폴리오 프로젝트입니다. 실제 금융 서비스가 아닙니다.</p>
      </footer>
    </div>
  );
}