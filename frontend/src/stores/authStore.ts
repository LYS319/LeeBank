import { create } from 'zustand';

export interface AccountSummary {
    accountNo: string;
    balance: number;
    holdAmount: number;
    bankCode: string;
}

interface AuthState {
    isAuthenticated: boolean;
    authToken: string | null;
    memberId: string | null;
    ownerName: string | null;
    accounts: AccountSummary[];
    selectedAccountNo: string | null;
    accountNo: string | null;
    isAuthModalOpen: boolean;
    // 생체인증 이체용 임시 비밀번호 (세션 메모리에만 저장, sessionStorage 제외)
    password: string | null;

    login: (memberId: string, accounts: AccountSummary[], ownerName: string) => void;
    selectAccount: (accountNo: string) => void;
    addAccount: (account: AccountSummary) => void;
    setAuthToken: (token: string) => void;
    setPassword: (password: string) => void;
    openAuthModal: () => void;
    closeAuthModal: () => void;
    logout: () => void;
}

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
    password: null,

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

    setAuthToken: (token) => set({ authToken: token }),

    // 생체인증 이체용 — 메모리에만 저장 (페이지 새로고침 시 사라짐)
    setPassword: (password) => set({ password }),

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
            password: null,
        });
    },
}));