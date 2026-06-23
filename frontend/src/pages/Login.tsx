import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, accountApi } from "../api";
import { useAuthStore } from "../stores/authStore";
import PageHeader from "../components/layout/PageHeader";

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [memberId, setMemberId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = memberId.trim() && password.trim();

  // 거래 비밀번호는 회원가입 때와 동일하게 숫자 6자리로 통일한다.
  // (이체 시 사용하는 핀패드 입력 형식과 일치시켜야 한다)
  const handlePasswordChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 6);
    setPassword(digitsOnly);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      // 1. 회원ID + 비밀번호 검증 (Spring이 SHA-256 해시 후 DB 비교)
      const verifyRes = await authApi.verify(memberId.trim(), password);
      if (!verifyRes.data.success) {
        setError(verifyRes.data.message || "로그인에 실패했어요.");
        return;
      }

      // 2. 로그인한 회원의 계좌 정보를 자동으로 조회
      //    (사용자가 계좌번호를 직접 입력하지 않아도 되도록)
      const accountRes = await accountApi.getAccountByMember(memberId.trim());
      const ownerName = accountRes.data.ownerName ?? memberId.trim();
      const accountNo = accountRes.data.accountNo;

      login(memberId.trim(), accountNo, ownerName);
      navigate("/home", { replace: true });
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      if (e.response?.status === 401) {
        setError("회원 ID 또는 비밀번호가 일치하지 않아요.");
      } else if (e.response?.status === 404) {
        setError("계좌 정보를 찾을 수 없어요. 관리자에게 문의해주세요.");
      } else {
        setError(e.response?.data?.message || "로그인 중 문제가 발생했어요.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="login__header-area">
        <PageHeader />
      </div>

      <div className="login__brand">
        <div className="login__brand-mark">B</div>
        <h1 className="login__brand-name">LeeBank</h1>
        <p className="login__brand-tagline">대화로 끝내는 가장 쉬운 은행</p>
      </div>

      <form className="login__form" onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">회원 ID</label>
          <input
            className="form-input"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            placeholder="아이디를 입력하세요"
            autoComplete="username"
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">비밀번호</label>
          <input
            className="form-input"
            type="password"
            inputMode="numeric"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            placeholder="숫자 6자리"
            autoComplete="current-password"
            maxLength={6}
          />
        </div>

        {error && <p className="auth-sheet__error" style={{ margin: 0 }}>{error}</p>}

        <button className="login__submit" type="submit" disabled={!canSubmit || isLoading}>
          {isLoading ? "확인하는 중…" : "로그인"}
        </button>
      </form>
    </div>
  );
}