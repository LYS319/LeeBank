import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '../../api';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import type { ChatResponse } from '../../types/index.ts';
import MessageBubble from './MessageBubble';
import { parseResultCard } from '../../utils/resultCard';

const SUGGESTIONS = ['잔액 알려줘', '5만원 보내줘', '거래내역 보여줘', '예약송금 하고 싶어'];

export default function ChatWindow() {
    const navigate = useNavigate();
    const [input, setInput] = useState('');

    const { messages, isLoading, sessionId, pendingAction, addMessage, setLoading, setPendingAction } = useChatStore();
    const { accountNo, openAuthModal } = useAuthStore();

    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const sendText = async (text: string) => {
        if (!text.trim() || isLoading) return;

        addMessage('user', text.trim());
        setLoading(true);

        try {
            const res = await chatApi.sendMessage(
                text.trim(),
                sessionId,
                accountNo ?? '',
            );
            const data: ChatResponse = res.data;

            if (data.type === 'ELICITATION' && data.pendingAction) {
                addMessage('assistant', data.message);
                setPendingAction(data.pendingAction);
                openAuthModal();
            } else {
                const card = parseResultCard(data.message);
                addMessage('assistant', data.message, card ?? undefined);
            }
        } catch {
            addMessage('assistant', '연결에 문제가 생겼어요. 잠시 후 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    const handleSend = () => {
        const text = input;
        setInput('');
        sendText(text);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSuggestion = (text: string) => {
        sendText(text);
    };

    // pendingAction의 tool 정보를 결과 카드 파싱에 활용하기 위해 유지
    void pendingAction;

    return (
        <div className="chat">
            <header className="chat__header">
                <div className="chat__header-row">
                    <button
                        className="chat__back"
                        onClick={() => navigate('/')}
                        aria-label="홈으로"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <div className="chat__brand">
                        <span className="chat__brand-mark">B</span>
                        <span className="chat__brand-name">LeeBank</span>
                    </div>
                    <span style={{ width: 32 }} />
                </div>
            </header>

            <div className="chat__messages">
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}

                {isLoading && (
                    <div className="msg-row msg-row--assistant">
                        <div className="msg-avatar">B</div>
                        <div className="msg-bubble msg-bubble--assistant">
                            <div className="msg-typing">
                                <span />
                                <span />
                                <span />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {messages.length <= 1 && (
                <div className="chat__suggestions">
                    {SUGGESTIONS.map((s) => (
                        <button
                            key={s}
                            className="chat__suggestion-chip"
                            onClick={() => handleSuggestion(s)}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}

            <div className="chat__input-bar">
                <textarea
                    ref={textareaRef}
                    rows={1}
                    className="chat__input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="메시지를 입력하세요"
                    disabled={isLoading}
                />
                <button
                    className="chat__send"
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    aria-label="전송"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M4 12L20 4L13 20L11 13L4 12Z"
                            fill="currentColor"
                        />
                    </svg>
                </button>
            </div>
        </div>
    );
}
