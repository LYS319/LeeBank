import { useState } from 'react';
import { chatApi } from '../../api';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { parseResultCard } from '../../utils/resultCard';
import PinPad from './PinPad';

export default function AuthModal() {
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { sessionId, pendingAction, addMessage, setPendingAction } = useChatStore();
    const { accountNo, memberId, isAuthModalOpen, closeAuthModal } = useAuthStore();

    if (!isAuthModalOpen) return null;

    const handleConfirm = async () => {
        if (pin.length < 4) {
            setError('비밀번호를 입력해주세요.');
            return;
        }
        if (!pendingAction || !memberId || !accountNo) return;

        setIsLoading(true);
        setError('');

        try {
            // 평문 비밀번호를 그대로 전송 — HTTPS가 전송 구간을 보호하고,
            // 해싱은 Spring Boot(백엔드) 한 곳에서만 수행한다.
            const res = await chatApi.confirm(
                sessionId,
                pin,
                memberId,
                {
                    tool: pendingAction.tool,
                    params: {
                        ...pendingAction.params,
                        fromAccount: accountNo,
                    },
                },
            );

            const card = parseResultCard(res.data.message, pendingAction.tool);
            addMessage('assistant', res.data.message, card ?? undefined);
            setPendingAction(null);
            closeAuthModal();
            setPin('');
        } catch (err: unknown) {
            const error = err as { response?: { data?: { detail?: { message?: string } } } };
            const msg = error.response?.data?.detail?.message || '비밀번호가 일치하지 않아요. 다시 시도해주세요.';
            setError(msg);
            setPin('');
        } finally {
            setIsLoading(false);
        }
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

                <h2 className="auth-sheet__title">비밀번호 입력</h2>
                <p className="auth-sheet__desc">거래 비밀번호 6자리를 입력해주세요</p>

                {error && <p className="auth-sheet__error">{error}</p>}

                <PinPad value={pin} onChange={setPin} maxLength={6} />

                <button
                    className="auth-sheet__confirm"
                    onClick={handleConfirm}
                    disabled={pin.length < 4 || isLoading}
                >
                    {isLoading ? '확인하는 중…' : '확인'}
                </button>

                <button className="auth-sheet__cancel" onClick={handleClose}>
                    취소
                </button>
            </div>
        </div>
    );
}
