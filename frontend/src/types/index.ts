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
}
