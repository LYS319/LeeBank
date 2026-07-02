import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountApi } from '../api';
import { authApi } from '../api';
import { useAuthStore } from '../stores/authStore';
import { useWebAuthn } from '../hooks/useWebAuthn';
import PageHeader from '../components/layout/PageHeader';

export default function Login() {
    const navigate = useNavigate();
    const login = useAuthStore((s) => s.login);
    const {
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

            login(memberId.trim(), [{
                accountNo,
                balance: accountData.balance ?? 0,
                holdAmount: accountData.holdAmount ?? 0,
                bankCode: accountData.bankCode ?? '999',
            }], ownerName);
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

    // ── 생체인증 로그인 — ID 입력 없이 동작 ──────────
    const handleWebAuthnLogin = async () => {
        setError('');
        setWebAuthnError('');

        // memberId 옵셔널 — 없으면 서버가 credentialId로 역조회
        const result = await authenticate(memberId.trim() || undefined);
        if (!result.success || !result.memberId) return;

        try {
            const resolvedMemberId = result.memberId;
            const accountRes = await accountApi.getAccountByMember(resolvedMemberId);
            const accountData = Array.isArray(accountRes.data) ? accountRes.data[0] : accountRes.data;
            const accountNo = accountData.accountNo;
            const ownerName = accountData.ownerName ?? resolvedMemberId;

            login(resolvedMemberId, [{
                accountNo,
                balance: accountData.balance ?? 0,
                holdAmount: accountData.holdAmount ?? 0,
                bankCode: accountData.bankCode ?? '999',
            }], ownerName);
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

            {/* 생체인증 로그인 — ID 입력 없이 바로 가능 */}
            <div className="login__biometric">
                <p className="login__biometric-label">등록된 생체인증으로 로그인</p>
                <button
                    className="login__biometric-btn"
                    type="button"
                    onClick={handleWebAuthnLogin}
                    disabled={webAuthnLoading}
                >
                    {webAuthnLoading ? '인증 중…' : '🔐 지문/Face ID 로그인'}
                </button>
            </div>
        </div>
    );
}