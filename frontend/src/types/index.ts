export type ChatResponseType = 'MESSAGE' | 'ELICITATION';

export interface ChatResponse {
    type: ChatResponseType;
    message: string;
    pendingAction?: PendingAction;
}

export interface PendingAction {
    tool: 'immediate_transfer' | 'schedule_transfer' | 'get_balance' | 'get_history';
    params: Record<string, unknown>;
}

export interface Account {
    accountNo: string;
    ownerName: string;
    balance: number;
    bankCode: string;
    bankName: string;
}

export interface Transaction {
    transactionId: string;
    type: 'TRANSFER_IN' | 'TRANSFER_OUT';
    amount: number;
    counterpartAccount: string;
    counterpartName: string;
    memo: string;
    balanceAfter: number;
    createdAt: string;
}

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    /** AI 응답이 거래 결과일 때 영수증 카드로 렌더링하기 위한 메타 정보 */
    card?: ResultCardData;
}

export type ResultCardKind = 'balance' | 'transfer' | 'schedule' | 'history';

export interface ResultCardData {
    kind: ResultCardKind;
    amount?: number;
    rows: { label: string; value: string }[];
}
