import { create } from 'zustand';
import type { Message, PendingAction } from "../types/index.ts";

interface ChatState {
    // 상태
    messages: Message[];
    isLoading: boolean;
    sessionId: string;
    pendingAction: PendingAction | null; // ELICITATION 발생 시 보류 중인 도구

    // 액션
    addMessage: (role: 'user' | 'assistant', content: string) => void;
    setLoading: (loading: boolean) => void;
    setPendingAction: (action: PendingAction | null) => void;
    clearMessages: () => void;
}

// 세션 ID 생성 (탭 단위 유지)
const generateSessionId = () => {
    const stored = sessionStorage.getItem('sessionId');
    if (stored) return stored;
    const newId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('sessionId', newId);
    return newId;
};

export const useChatStore = create<ChatState>((set) => ({
    // 초기 상태
    messages: [
        {
            id: 'welcome',
            role: 'assistant',
            content: '안녕하세요! LeeBank AI 도우미입니다. 송금, 잔액 조회, 거래내역 조회를 도와드릴게요.',
            timestamp: new Date(),
        },
    ],
    isLoading: false,
    sessionId: generateSessionId(),
    pendingAction: null,

    // 메시지 추가
    addMessage: (role, content) =>
        set((state) => ({
            messages: [
                ...state.messages,
                {
                    id: `msg-${Date.now()}`,
                    role,
                    content,
                    timestamp: new Date(),
                },
            ],
        })),

    // 로딩 상태
    setLoading: (loading) => set({ isLoading: loading }),

    // 보류 중인 도구 (ELICITATION)
    setPendingAction: (action) => set({ pendingAction: action }),

    // 메시지 초기화
    clearMessages: () =>
        set({
            messages: [
                {
                    id: 'welcome',
                    role: 'assistant',
                    content: '안녕하세요! LeeBank AI 도우미입니다. 송금, 잔액 조회, 거래내역 조회를 도와드릴게요.',
                    timestamp: new Date(),
                },
            ],
            pendingAction: null,
        }),
}));
