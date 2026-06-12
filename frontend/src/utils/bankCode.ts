export interface BankInfo {
    code: string;
    name: string;
    color: string;
}

const BANK_MAP: Record<string, BankInfo> = {
    '110': { code: '110', name: '신한은행', color: '#0046FF' },
    '088': { code: '088', name: '신한은행(구)', color: '#0046FF' },
    '020': { code: '020', name: '우리은행', color: '#0078D4' },
    '004': { code: '004', name: 'KB국민은행', color: '#FFB81C' },
    '081': { code: '081', name: '하나은행', color: '#009B77' },
    '003': { code: '003', name: 'IBK기업은행', color: '#004A97' },
};

export function parseBankCode(accountNo: string): BankInfo | null {
    const code = accountNo.split('-')[0];
    return BANK_MAP[code] ?? null;
}
