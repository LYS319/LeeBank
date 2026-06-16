import type { Message } from "../../types/index.ts";

interface Props {
    message: Message;
}

export default function MessageBubble({ message }: Props) {
    const isUser = message.role === 'user';

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                marginBottom: '12px',
            }}
        >
            {/* AI 아바타 */}
            {!isUser && (
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
                        marginRight: '8px',
                        flexShrink: 0,
                    }}
                >
                    AI
                </div>
            )}

            {/* 말풍선 */}
            <div
                style={{
                    maxWidth: '75%',
                    padding: '10px 14px',
                    borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isUser ? '#1a73e8' : '#f1f3f4',
                    color: isUser ? 'white' : '#202124',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                }}
            >
                {message.content}
            </div>
        </div>
    );
}
