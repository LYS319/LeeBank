import { useState } from 'react';
import { chatApi } from '../../api';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { parseResultCard } from '../../utils/resultCard';
import { useWebAuthn } from '../../hooks/useWebAuthn';
import PinPad from './PinPad';

export default function AuthModal() {
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { sessionId, pendingAction, addMessage, setPendingAction } = useChatStore();
    const { accountNo, memberId, isAuthModalOpen, closeAuthModal, password } = useAuthStore();
    const { authenticate, loading: webAuthnLoading } = useWebAuthn();

    if (!isAuthModalOpen) return null;

    const confirmWithPassword = async (pw: string) => {
        if (!pendingAction || !memberId || !accountNo) return;
        setIsLoading(true);
        setError('');
        try {
            const res = await chatApi.confirm(
                sessionId, pw, memberId,
                {
                    tool: pendingAction.tool,
                    params: { ...pendingAction.params, fromAccount: accountNo },
                },
            );
            const card = parseResultCard(res.data.message, pendingAction.tool);
            addMessage('assistant', res.data.message, card ?? undefined);
            setPendingAction(null);
            closeAuthModal();
            setPin('');
        } catch (err: unknown) {
            const e = err as { response?: { data?: { detail?: { message?: string } } } };
            const msg = e.response?.data?.detail?.message || '비밀번호가 일치하지 않아요. 다시 시도해주세요.';
            setError(msg);
            setPin('');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (pin.length < 4) {
            setError('비밀번호를 입력해주세요.');
            return;
        }
        await confirmWithPassword(pin);
    };

    const handleBiometric = async () => {
        setError('');
        if (!password) {
            setError('생체인증 이체는 비밀번호 로그인 후 사용할 수 있어요.');
            return;
        }
        const result = await authenticate();
        if (!result.success) {
            setError('생체인증에 실패했어요. 비밀번호로 다시 시도해주세요.');
            return;
        }
        await confirmWithPassword(password);
    };

    const handleClose = () => {
        closeAuthModal();
        setPendingAction(null);
        setPin('');
        setError('');
    };

    return (
        <div className="auth-overlay" onClick={handleClose}>
            <div className="auth-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="auth-sheet__handle" />

                <h2 className="auth-sheet__title">거래 인증</h2>
                <p className="auth-sheet__desc">비밀번호 또는 생체인증으로 확인해주세요</p>

                {error && <p className="auth-sheet__error">{error}</p>}

                <PinPad value={pin} onChange={setPin} maxLength={6} />

                <button
                    className="auth-sheet__confirm"
                    onClick={handleConfirm}
                    disabled={pin.length < 4 || isLoading || webAuthnLoading}
                >
                    {isLoading ? '확인하는 중...' : '비밀번호로 확인'}
                </button>

                <button
                    className="auth-sheet__confirm"
                    style={{ background: 'white', color: '#3654FF', border: '1.5px solid #3654FF', marginTop: 8 }}
                    onClick={handleBiometric}
                    disabled={isLoading || webAuthnLoading}
                >
                    {webAuthnLoading ? '인증 중...' : '생체인증으로 확인'}
                </button>

                <button className="auth-sheet__cancel" onClick={handleClose}>
                    취소
                </button>
            </div>
        </div>
    );
}