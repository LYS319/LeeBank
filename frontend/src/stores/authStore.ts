import { create } from 'zustand';

interface AuthState {
    // 상태
    isAuthenticated: boolean;
    authToken: string | null;
    memberId: string | null;
    accountNo: string | null;
    ownerName: string | null;
    isAuthModalOpen: boolean; // 비밀번호 입력 모달 표시 여부 (채팅 중 Elicitation)

    // 액션
    login: (memberId: string, accountNo: string, ownerName: string) => void;
    setAuth: (memberId: string, accountNo: string) => void;
    setAuthToken: (token: string) => void;
    openAuthModal: () => void;
    closeAuthModal: () => void;
    logout: () => void;
}

// 로그인 상태는 탭을 새로고침해도 유지되도록 sessionStorage에 보관한다.
// (브라우저를 완전히 닫으면 사라지는 것이 보안상 적절하여 localStorage 대신 사용)
const STORAGE_KEY = 'leebank_session';

function loadSession() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as { memberId: string; accountNo: string; ownerName: string };
    } catch {
        return null;
    }
}

function saveSession(memberId: string, accountNo: string, ownerName: string) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ memberId, accountNo, ownerName }));
}

function clearSession() {
    sessionStorage.removeItem(STORAGE_KEY);
}

const restored = loadSession();

export const useAuthStore = create<AuthState>((set) => ({
    isAuthenticated: !!restored,
    authToken: null,
    memberId: restored?.memberId ?? null,
    accountNo: restored?.accountNo ?? null,
    ownerName: restored?.ownerName ?? null,
    isAuthModalOpen: false,

    // 로그인 성공 시 호출 — 회원ID/계좌번호/이름 저장
    login: (memberId, accountNo, ownerName) => {
        saveSession(memberId, accountNo, ownerName);
        set({ isAuthenticated: true, memberId, accountNo, ownerName });
    },

    // (구) 호환용 — 기존 컴포넌트에서 사용 중이면 login과 동일하게 동작
    setAuth: (memberId, accountNo) =>
        set((state) => {
            saveSession(memberId, accountNo, state.ownerName ?? '');
            return { isAuthenticated: true, memberId, accountNo };
        }),

    // 인증 토큰 저장 (비밀번호 검증 완료 후, 채팅/이체 시 사용)
    setAuthToken: (token) => set({ authToken: token }),

    openAuthModal: () => set({ isAuthModalOpen: true }),
    closeAuthModal: () => set({ isAuthModalOpen: false }),

    logout: () => {
        clearSession();
        set({
            isAuthenticated: false,
            authToken: null,
            memberId: null,
            accountNo: null,
            ownerName: null,
            isAuthModalOpen: false,
        });
    },
}));
