import axios from 'axios';

const BASE_URL = import.meta.env.VITE_AI_AGENT_URL;

export const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use((config) => {
    const sessionId = sessionStorage.getItem('sessionId');
    if (sessionId) {
        config.headers['X-Session-Id'] = sessionId;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // 거래 비밀번호 검증(confirm)에서 발생한 401은
        // 거래 인증 실패일 뿐, 로그인 세션 만료가 아니므로 자동 로그아웃 대상에서 제외한다.
        const isConfirmRequest = error.config?.url?.includes('/ai/chat/confirm');

        if (error.response?.status === 401 && !isConfirmRequest) {
            sessionStorage.removeItem('sessionId');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    },
);

export const chatApi = {
    sendMessage: (message: string, sessionId: string, accountNo: string) =>
        apiClient.post('/ai/chat', { message, sessionId, accountNo }),

    confirm: (sessionId: string, authToken: string, memberId: string, pendingAction: object) =>
        apiClient.post('/ai/chat/confirm', { sessionId, authToken, memberId, pendingAction }),
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || BASE_URL;

export const backendClient = axios.create({
    baseURL: BACKEND_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
});

export const accountApi = {
    getAccount: (accountNo: string) => backendClient.get(`/api/account/${accountNo}`),

    // 회원ID로 본인 계좌 조회 (로그인 시 계좌번호 입력 없이 자동 조회)
    getAccountByMember: (memberId: string) => backendClient.get(`/api/account/by-member/${memberId}`),

    getHistory: (accountNo: string, limit = 20) =>
        backendClient.get(`/api/account/history/${accountNo}`, { params: { limit } }),

    // 계좌의 예약이체 목록 조회 (대기중/완료/실패 상태 모두 포함)
    // Spring에 GET /api/reservation/{accountNo} 신규 구현 필요
    getReservations: (accountNo: string, limit = 20) =>
        backendClient.get(`/api/reservation/${accountNo}`, { params: { limit } }),
};

export const authApi = {
    // 로그인 — Spring AuthController POST /api/auth/verify 호출
    // 평문 비밀번호를 그대로 전달하고 해싱은 Spring(백엔드)에서 1회만 수행한다.
    verify: (memberId: string, password: string) =>
        backendClient.post('/api/auth/verify', { memberId, password }),
};