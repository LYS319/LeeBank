import { useState } from 'react';
import { chatApi } from '../../api';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import PinPad from './PinPad';

// 비밀번호 SHA-256 해시
async function sha256(plain: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function AuthModal() {
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { sessionId, pendingAction, addMessage, setPendingAction } = useChatStore();
    const { accountNo, isAuthModalOpen, closeAuthModal } = useAuthStore();

    if (!isAuthModalOpen) return null;

    const handleConfirm = async () => {
        if (pin.length < 4) {
            setError('비밀번호를 입력해주세요.');
            return;
        }
        if (!pendingAction) return;

        setIsLoading(true);
        setError('');

        try {
            // SHA-256 해시 후 전송
            const authToken = await sha256(pin);

            const res = await chatApi.confirm(sessionId, authToken, {
                tool: pendingAction.tool,
                params: {
                    ...pendingAction.params,
                    fromAccount: accountNo || '110-123-456789',
                },
            });

            addMessage('assistant', res.data.message);
            setPendingAction(null);
            closeAuthModal();
            setPin('');
        } catch (err: unknown) {
            const error = err as { response?: { data?: { detail?: { message?: string } } } };
            const msg = error.response?.data?.detail?.message || '오류가 발생했습니다. 다시 시도해주세요.';
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
        // 배경 오버레이
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                zIndex: 1000,
            }}
            onClick={handleClose}
        >
            {/* 모달 본체 */}
            <div
                style={{
                    width: '100%',
                    maxWidth: '480px',
                    background: 'white',
                    borderRadius: '24px 24px 0 0',
                    padding: '24px 24px 40px',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 핸들 바 */}
                <div
                    style={{
                        width: '40px',
                        height: '4px',
                        borderRadius: '2px',
                        background: '#e0e0e0',
                        margin: '0 auto 20px',
                    }}
                />

                {/* 제목 */}
                <h2
                    style={{
                        textAlign: 'center',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#202124',
                        marginBottom: '8px',
                    }}
                >
                    비밀번호 입력
                </h2>

                {/* 안내 문구 */}
                <p
                    style={{
                        textAlign: 'center',
                        fontSize: '13px',
                        color: '#757575',
                        marginBottom: '24px',
                    }}
                >
                    거래 비밀번호 6자리를 입력해주세요
                </p>

                {/* 에러 메시지 */}
                {error && (
                    <p
                        style={{
                            textAlign: 'center',
                            fontSize: '13px',
                            color: '#e53935',
                            marginBottom: '16px',
                        }}
                    >
                        {error}
                    </p>
                )}

                {/* 핀패드 */}
                <PinPad value={pin} onChange={setPin} maxLength={6} />

                {/* 확인 버튼 */}
                <button
                    onClick={handleConfirm}
                    disabled={pin.length < 4 || isLoading}
                    style={{
                        width: '100%',
                        padding: '16px',
                        marginTop: '20px',
                        borderRadius: '12px',
                        border: 'none',
                        background: pin.length < 4 || isLoading ? '#e0e0e0' : '#1a73e8',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: pin.length < 4 || isLoading ? 'not-allowed' : 'pointer',
                    }}
                >
                    {isLoading ? '처리 중...' : '확인'}
                </button>

                {/* 취소 */}
                <button
                    onClick={handleClose}
                    style={{
                        width: '100%',
                        padding: '12px',
                        marginTop: '8px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'transparent',
                        color: '#757575',
                        fontSize: '14px',
                        cursor: 'pointer',
                    }}
                >
                    취소
                </button>
            </div>
        </div>
    );
}
