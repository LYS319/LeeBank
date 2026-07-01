import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, accountApi } from '../api';
import { useAuthStore } from '../stores/authStore';
import { useWebAuthn } from '../hooks/useWebAuthn';
import PageHeader from '../components/layout/PageHeader';

export default function Login() {
    const navigate = useNavigate();
    const login = useAuthStore((s) => s.login);
    const {
        register,
        authenticate,
        loading: webAuthnLoading,
        error: webAuthnError,
        setError: setWebAuthnError,
    } = useWebAuthn();

    const [memberId, setMemberId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const canSubmit = memberId.trim() && password.trim();

    const handlePasswordChange = (value: string) => {
        const digitsOnly = value.replace(/\D/g, '').slice(0, 6);
        setPassword(digitsOnly);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit || isLoading) return;

        setIsLoading(true);
        setError('');

        try {
            const verifyRes = await authApi.verify(memberId.trim(), password);
            if (!verifyRes.data.success) {
                setError(verifyRes.data.message || '로그인에 실패했어요.');
                return;
            }

            const accountRes = await accountApi.getAccountByMember(memberId.trim());
            const accountData = Array.isArray(accountRes.data) ? accountRes.data[0] : accountRes.data;
            const ownerName = accountData.ownerName ?? memberId.trim();
            const accountNo = accountData.accountNo;

            login(memberId.trim(), accountNo, ownerName);
            navigate('/home', { replace: true });
        } catch (err: unknown) {
            const e = err as { response?: { status?: number; data?: { message?: string } } };
            if (e.response?.status === 401) {
                setError('회원 ID 또는 비밀번호가 일치하지 않아요.');
            } else if (e.response?.status === 404) {
                setError('계좌 정보를 찾을 수 없어요. 관리자에게 문의해주세요.');
            } else {
                setError(e.response?.data?.message || '로그인 중 문제가 발생했어요.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // ── 생체인증 등록 ──────────────────────────────
    const handleWebAuthnRegister = async () => {
        if (!memberId.trim()) {
            setError('먼저 회원 ID를 입력해주세요.');
            return;
        }
        setWebAuthnError('');
        const ok = await register(memberId.trim());
        if (ok) {
            setError('');
            alert('생체인증 등록이 완료되었어요! 다음부터 지문/Face ID로 로그인하세요.');
        }
    };

    // ── 생체인증 로그인 ──────────────────────────────
    const handleWebAuthnLogin = async () => {
        if (!memberId.trim()) {
            setError('먼저 회원 ID를 입력해주세요.');
            return;
        }
        setError('');
        setWebAuthnError('');

        const ok = await authenticate(memberId.trim());
        if (!ok) return;

        try {
            const accountRes = await accountApi.getAccountByMember(memberId.trim());
            const accountData = Array.isArray(accountRes.data) ? accountRes.data[0] : accountRes.data;
            const ownerName = accountData.ownerName ?? memberId.trim();
            const accountNo = accountData.accountNo;
            login(memberId.trim(), accountNo, ownerName);
            navigate('/home', { replace: true });
        } catch {
            setError('계좌 정보를 불러오는 데 실패했어요.');
        }
    };

    const combinedError = error || webAuthnError;

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

                {combinedError && (
                    <p className="auth-sheet__error" style={{ margin: 0 }}>
                        {combinedError}
                    </p>
                )}

                <button className="login__submit" type="submit" disabled={!canSubmit || isLoading}>
                    {isLoading ? '확인하는 중…' : '로그인'}
                </button>
            </form>

            {/* 생체인증 영역 */}
            <div className="login__biometric">
                <p className="login__biometric-label">생체인증</p>
                <div className="login__biometric-buttons">
                    <button
                        className="login__biometric-btn"
                        type="button"
                        onClick={handleWebAuthnLogin}
                        disabled={webAuthnLoading || !memberId.trim()}
                    >
                        {webAuthnLoading ? '인증 중…' : '🔐 지문/Face ID 로그인'}
                    </button>
                    <button
                        className="login__biometric-btn login__biometric-btn--secondary"
                        type="button"
                        onClick={handleWebAuthnRegister}
                        disabled={webAuthnLoading || !memberId.trim()}
                    >
                        생체인증 등록
                    </button>
                </div>
            </div>
        </div>
    );
}
