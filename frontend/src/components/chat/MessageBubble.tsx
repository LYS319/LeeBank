import type { Message } from "../../types/index.ts";
import ResultCard from "./ResultCard";

interface Props {
    message: Message;
}

export default function MessageBubble({ message }: Props) {
    const isUser = message.role === 'user';

    return (
        <div className={`msg-row msg-row--${isUser ? 'user' : 'assistant'}`}>
            {!isUser && <div className="msg-avatar">B</div>}

            {message.card ? (
                <ResultCard data={message.card} message={message.content} />
            ) : (
                <div className={`msg-bubble msg-bubble--${isUser ? 'user' : 'assistant'}`}>
                    {message.content}
                </div>
            )}
        </div>
    );
}
