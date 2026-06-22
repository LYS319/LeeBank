import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api";

type Step = 1 | 2 | 3 | 4 | 5;

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 1단계: 아이디
  const [memberId, setMemberId] = useState("");
  const [idChecked, setIdChecked] = useState(false);

  // 2단계: 비밀번호
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // 3단계: 이름 / 전화번호
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // 5단계: 발급된 계좌번호
  const [issuedAccountNo, setIssuedAccountNo] = useState("");

  const goNext = () => setStep((s) => (Math.min(s + 1, 5) as Step));
  const goBack = () => setStep((s) => (Math.max(s - 1, 1) as Step));

  // ── 1단계: 아이디 중복 체크 ──
  const handleCheckId = async () => {
    if (!memberId.trim()) {
      setError("아이디를 입력해주세요.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const res = await authApi.checkMemberId(memberId.trim());
      if (res.data.available) {
        setIdChecked(true);
      } else {
        setError("이미 사용 중인 아이디예요.");
        setIdChecked(false);
      }
    } catch {
      setError("중복 확인 중 문제가 발생했어요. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── 2단계 → 3단계 ──
  const handlePasswordNext = () => {
    if (password.length < 4) {
      setError("비밀번호는 4자 이상으로 입력해주세요.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않아요.");
      return;
    }
    setError("");
    goNext();
  };

  // ── 3단계 → 4단계 ──
  const handleProfileNext = () => {
    if (!name.trim() || !phone.trim()) {
      setError("이름과 전화번호를 모두 입력해주세요.");
      return;
    }
    setError("");
    goNext();
  };

  // ── 4단계: 계좌개설 동의 → 회원가입 + 계좌개설 요청 ──
  const handleCreateAccount = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await authApi.signup({
        memberId: memberId.trim(),
        password,
        name: name.trim(),
        phone: phone.trim(),
      });
      setIssuedAccountNo(res.data.accountNo);
      goNext();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || "계좌 개설 중 문제가 발생했어요. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup">
      {/* 상단 바: 뒤로가기 + 진행률 */}
      <div className="signup__topbar">
        {step > 1 && step < 5 ? (
          <button className="signup__back" onClick={goBack} aria-label="이전 단계">
            ←
          </button>
        ) : (
          <span />
        )}
        {step < 5 && (
          <div className="signup__progress">
            <div className="signup__progress-bar" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        )}
        <span />
      </div>

      <div className="signup__body">
        {/* 1단계: 아이디 */}
        {step === 1 && (
          <>
            <h1 className="signup__title">아이디를 입력해주세요</h1>
            <p className="signup__desc">로그인할 때 사용할 아이디예요.</p>
            <div className="form-group" style={{ marginTop: 24 }}>
              <input
                className="form-input"
                value={memberId}
                onChange={(e) => {
                  setMemberId(e.target.value);
                  setIdChecked(false);
                }}
                placeholder="아이디 (영문, 숫자)"
                autoFocus
              />
            </div>
            {idChecked && <p className="signup__success">사용할 수 있는 아이디예요</p>}
            {error && <p className="auth-sheet__error">{error}</p>}

            <div className="signup__actions">
              {!idChecked ? (
                <button className="login__submit" onClick={handleCheckId} disabled={isLoading || !memberId.trim()}>
                  {isLoading ? "확인하는 중…" : "중복 확인"}
                </button>
              ) : (
                <button className="login__submit" onClick={goNext}>
                  다음
                </button>
              )}
            </div>
          </>
        )}

        {/* 2단계: 비밀번호 */}
        {step === 2 && (
          <>
            <h1 className="signup__title">비밀번호를 만들어주세요</h1>
            <p className="signup__desc">거래할 때도 이 비밀번호를 사용해요.</p>
            <div className="signup__field-stack">
              <div className="form-group">
                <input
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <input
                  className="form-input"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호 확인"
                />
              </div>
            </div>
            {error && <p className="auth-sheet__error">{error}</p>}
            <div className="signup__actions">
              <button className="login__submit" onClick={handlePasswordNext} disabled={!password || !passwordConfirm}>
                다음
              </button>
            </div>
          </>
        )}

        {/* 3단계: 이름 / 전화번호 */}
        {step === 3 && (
          <>
            <h1 className="signup__title">본인 확인을 할게요</h1>
            <p className="signup__desc">이름과 전화번호는 안전하게 암호화해서 보관해요.</p>
            <div className="signup__field-stack">
              <div className="form-group">
                <input
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <input
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="전화번호 (01012345678)"
                  inputMode="numeric"
                />
              </div>
            </div>
            {error && <p className="auth-sheet__error">{error}</p>}
            <div className="signup__actions">
              <button className="login__submit" onClick={handleProfileNext} disabled={!name.trim() || !phone.trim()}>
                다음
              </button>
            </div>
          </>
        )}

        {/* 4단계: 계좌개설 동의 */}
        {step === 4 && (
          <>
            <h1 className="signup__title">LeeBank 계좌를 만들까요?</h1>
            <p className="signup__desc">
              {name.trim() || "고객"}님 명의의 입출금 계좌가 새로 만들어져요.
              이 계좌로 이체, 조회, AI 채팅 서비스를 이용할 수 있어요.
            </p>
            <div className="signup__consent-card">
              <p className="signup__consent-row">
                <span>계좌 종류</span>
                <span>입출금 계좌</span>
              </p>
              <p className="signup__consent-row">
                <span>예금주</span>
                <span>{name.trim() || "-"}</span>
              </p>
            </div>
            {error && <p className="auth-sheet__error">{error}</p>}
            <div className="signup__actions">
              <button className="login__submit" onClick={handleCreateAccount} disabled={isLoading}>
                {isLoading ? "계좌를 만드는 중…" : "동의하고 계좌 만들기"}
              </button>
            </div>
          </>
        )}

        {/* 5단계: 완료 */}
        {step === 5 && (
          <div className="signup__done">
            <div className="signup__done-badge">✓</div>
            <h1 className="signup__title" style={{ textAlign: "center" }}>
              계좌 개설이 완료됐어요
            </h1>
            <p className="signup__desc" style={{ textAlign: "center" }}>
              아래 계좌번호로 첫 거래를 시작해보세요.
            </p>
            <div className="signup__account-card">
              <p className="signup__account-label">내 계좌번호</p>
              <p className="signup__account-no num-display">{issuedAccountNo || "발급 중…"}</p>
            </div>
            <div className="signup__actions">
              <button className="login__submit" onClick={() => navigate("/login", { replace: true })}>
                로그인하러 가기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}