import { create } from 'zustand';

export interface AccountSummary {
    accountNo: string;
    balance: number;
    holdAmount: number;
    bankCode: string;
}

interface AuthState {
    // 상태
    isAuthenticated: boolean;
    authToken: string | null;
    memberId: string | null;
    ownerName: string | null;

    // 보유 계좌 목록과, 그중 현재 화면에서 선택된 계좌번호.
    // 한 회원이 여러 계좌를 가질 수 있으므로 accountNo 단일 필드 대신 배열로 관리한다.
    accounts: AccountSummary[];
    selectedAccountNo: string | null;

    // (구) 호환용 — 기존 컴포넌트들이 accountNo로 단일 계좌를 참조하던 코드가 많아서,
    // selectedAccountNo와 항상 동일한 값으로 동기화되는 일반 필드로 같이 둔다.
    // (zustand getter는 구독 갱신이 불안정할 수 있어 실제 필드로 둔다)
    accountNo: string | null;

    isAuthModalOpen: boolean; // 비밀번호 입력 모달 표시 여부 (채팅 중 Elicitation)

    // 액션
    login: (memberId: string, accounts: AccountSummary[], ownerName: string) => void;
    selectAccount: (accountNo: string) => void;
    addAccount: (account: AccountSummary) => void;
    setAuthToken: (token: string) => void;
    openAuthModal: () => void;
    closeAuthModal: () => void;
    logout: () => void;
}

// 로그인 상태는 탭을 새로고침해도 유지되도록 sessionStorage에 보관한다.
const STORAGE_KEY = 'leebank_session';

interface StoredSession {
    memberId: string;
    accounts: AccountSummary[];
    selectedAccountNo: string;
    ownerName: string;
}

function loadSession(): StoredSession | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as StoredSession;
    } catch {
        return null;
    }
}

function saveSession(session: StoredSession) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function clearSession() {
    sessionStorage.removeItem(STORAGE_KEY);
}

const restored = loadSession();

export const useAuthStore = create<AuthState>((set, get) => ({
    isAuthenticated: !!restored,
    authToken: null,
    memberId: restored?.memberId ?? null,
    ownerName: restored?.ownerName ?? null,
    accounts: restored?.accounts ?? [],
    selectedAccountNo: restored?.selectedAccountNo ?? null,
    accountNo: restored?.selectedAccountNo ?? null,
    isAuthModalOpen: false,

    // 로그인 성공 시 호출 — 회원ID/보유 계좌 목록/이름 저장.
    // 계좌가 1개면 자동으로 그 계좌가 선택되고, 여러 개면 첫 번째 계좌가 기본 선택된다.
    login: (memberId, accounts, ownerName) => {
        const selectedAccountNo = accounts[0]?.accountNo ?? null;
        saveSession({ memberId, accounts, selectedAccountNo: selectedAccountNo ?? '', ownerName });
        set({
            isAuthenticated: true,
            memberId,
            accounts,
            selectedAccountNo,
            accountNo: selectedAccountNo,
            ownerName,
        });
    },

    // 화면에서 보고 있는 계좌를 전환한다 (Dashboard 상단 계좌 탭/드롭다운에서 사용)
    selectAccount: (accountNo) => {
        const state = get();
        set({ selectedAccountNo: accountNo, accountNo });
        saveSession({
            memberId: state.memberId ?? '',
            accounts: state.accounts,
            selectedAccountNo: accountNo,
            ownerName: state.ownerName ?? '',
        });
    },

    // 새로 개설한 계좌를 목록에 추가하고, 그 계좌로 바로 전환한다.
    addAccount: (account) => {
        const state = get();
        const accounts = [...state.accounts, account];
        set({ accounts, selectedAccountNo: account.accountNo, accountNo: account.accountNo });
        saveSession({
            memberId: state.memberId ?? '',
            accounts,
            selectedAccountNo: account.accountNo,
            ownerName: state.ownerName ?? '',
        });
    },

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
            ownerName: null,
            accounts: [],
            selectedAccountNo: null,
            accountNo: null,
            isAuthModalOpen: false,
        });
    },
}));
