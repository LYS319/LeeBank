import { create } from 'zustand';

interface AuthState {
    // 상태
    isAuthenticated: boolean;
    authToken: string | null;
    memberId: string | null;
    accountNo: string | null;
    isAuthModalOpen: boolean; // 비밀번호 입력 모달 표시 여부

    // 액션
    setAuth: (memberId: string, accountNo: string) => void;
    setAuthToken: (token: string) => void;
    openAuthModal: () => void;
    closeAuthModal: () => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    // 초기 상태
    isAuthenticated: false,
    authToken: null,
    memberId: null,
    accountNo: null,
    isAuthModalOpen: false,

    // 로그인 (회원 ID + 계좌번호 설정)
    setAuth: (memberId, accountNo) =>
        set({
            isAuthenticated: true,
            memberId,
            accountNo,
        }),

    // 인증 토큰 저장 (비밀번호 검증 완료 후)
    setAuthToken: (token) => set({ authToken: token }),

    // 비밀번호 입력 모달 열기 (ELICITATION 발생 시)
    openAuthModal: () => set({ isAuthModalOpen: true }),

    // 비밀번호 입력 모달 닫기
    closeAuthModal: () => set({ isAuthModalOpen: false }),

    // 로그아웃
    logout: () =>
        set({
            isAuthenticated: false,
            authToken: null,
            memberId: null,
            accountNo: null,
            isAuthModalOpen: false,
        }),
}));
