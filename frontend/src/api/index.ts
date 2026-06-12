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
        if (error.response?.status === 401) {
            sessionStorage.removeItem('sessionId');
            window.location.href = '/';
        }
        return Promise.reject(error);
    },
);

export const chatApi = {
    sendMessage: (message: string, sessionId: string, accountNo: string) =>
        apiClient.post('/ai/chat', { message, sessionId, accountNo }),

    confirm: (sessionId: string, authToken: string, pendingAction: object) =>
        apiClient.post('/ai/chat/confirm', { sessionId, authToken, pendingAction }),
};
