import { useState, useRef, useEffect } from 'react';
import { chatApi } from '../../api';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import type { ChatResponse } from '../../types/index.ts';
import MessageBubble from './MessageBubble';

export default function ChatWindow() {
    const [input, setInput] = useState('');

    const { messages, isLoading, sessionId, pendingAction, addMessage, setLoading, setPendingAction } = useChatStore();
    const { accountNo, openAuthModal } = useAuthStore();

    const bottomRef = useRef<HTMLDivElement>(null);

    // 새 메시지 올 때마다 스크롤 맨 아래로
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const message = input.trim();
        setInput('');
        addMessage('user', message);
        setLoading(true);

        try {
            const res = await chatApi.sendMessage(
                message,
                sessionId,
                accountNo || '110-123-456789', // 기본 계좌번호 (추후 로그인 연동)
            );
            const data: ChatResponse = res.data;

            addMessage('assistant', data.message);

            // ELICITATION: 비밀번호 입력 모달 열기
            if (data.type === 'ELICITATION' && data.pendingAction) {
                setPendingAction(data.pendingAction);
                openAuthModal();
            }
        } catch (error) {
            addMessage('assistant', '오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    // Enter 키로 전송
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                maxWidth: '480px',
                margin: '0 auto',
                background: 'white',
            }}
        >
            {/* 헤더 */}
            <div
                style={{
                    padding: '16px',
                    borderBottom: '1px solid #e0e0e0',
                    background: '#1a73e8',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    textAlign: 'center',
                }}
            >
                LeeBank AI 도우미
            </div>

            {/* 메시지 목록 */}
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                    background: '#fafafa',
                }}
            >
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}

                {/* 로딩 인디케이터 */}
                {isLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: '#1a73e8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '14px',
                                flexShrink: 0,
                            }}
                        >
                            AI
                        </div>
                        <div
                            style={{
                                padding: '10px 14px',
                                borderRadius: '18px 18px 18px 4px',
                                background: '#f1f3f4',
                                color: '#9e9e9e',
                                fontSize: '14px',
                            }}
                        >
                            입력 중...
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* 입력창 */}
            <div
                style={{
                    padding: '12px 16px',
                    borderTop: '1px solid #e0e0e0',
                    display: 'flex',
                    gap: '8px',
                    background: 'white',
                }}
            >
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="메시지를 입력하세요..."
                    disabled={isLoading}
                    style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '24px',
                        border: '1px solid #e0e0e0',
                        outline: 'none',
                        fontSize: '14px',
                        color: '#202124',
                        background: isLoading ? '#f5f5f5' : 'white',
                    }}
                />
                <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '24px',
                        border: 'none',
                        background: isLoading || !input.trim() ? '#e0e0e0' : '#1a73e8',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                    }}
                >
                    전송
                </button>
            </div>
        </div>
    );
}
