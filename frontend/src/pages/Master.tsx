import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { masterApi } from "../api";

interface MasterAccount {
  accountNo: string;
  memberId: string;
  ownerName?: string;
  bankCode: string;
  bankName?: string;
  balance: number;
  holdAmount: number;
  accountStatus: string;
  createdAt?: string;
}

interface MasterTransaction {
  transactionId: string;
  txType: "TRANSFER" | "ADMIN_DEPOSIT" | string;
  fromAccount?: string | null;
  toAccount?: string | null;
  amount: number;
  memo?: string | null;
  balanceAfter?: number | null;
  createdAt: string;
  transferId?: string | null;
  transferType?: string | null;
  status?: string | null;
}

function formatMoney(value?: number | null) {
  return `${(value ?? 0).toLocaleString("ko-KR")}원`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Master() {
  const [masterToken, setMasterToken] = useState(() => sessionStorage.getItem("masterToken") || "");
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [accounts, setAccounts] = useState<MasterAccount[]>([]);
  const [transactions, setTransactions] = useState<MasterTransaction[]>([]);
  const [selectedAccountNo, setSelectedAccountNo] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("테스트 입금");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.accountNo === selectedAccountNo),
    [accounts, selectedAccountNo],
  );

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (!adminId.trim() || !password.trim()) return;

    setMessage("");
    try {
      const res = await masterApi.login(adminId.trim(), password);
      const token = res.data.masterToken;
      sessionStorage.setItem("masterToken", token);
      setMasterToken(token);
      setPassword("");
    } catch {
      setMessage("관리자 인증에 실패했습니다.");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("masterToken");
    setMasterToken("");
    setAccounts([]);
    setTransactions([]);
    setSelectedAccountNo("");
  };

  const load = async () => {
    setLoading(true);
    try {
      const [accountRes, txRes] = await Promise.all([
        masterApi.getAccounts(),
        masterApi.getTransactions(100),
      ]);
      const nextAccounts = Array.isArray(accountRes.data) ? accountRes.data : [];
      setAccounts(nextAccounts);
      setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
      setSelectedAccountNo((current) => current || nextAccounts[0]?.accountNo || "");
    } catch {
      sessionStorage.removeItem("masterToken");
      setMasterToken("");
      setMessage("관리자 인증이 만료되었습니다. 다시 로그인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (masterToken) {
      load();
    } else {
      setLoading(false);
    }
  }, [masterToken]);

  const handleDeposit = async () => {
    const amountValue = Number(amount.replace(/[^0-9]/g, ""));
    if (!selectedAccountNo || amountValue <= 0 || saving) return;

    setSaving(true);
    setMessage("");
    try {
      const res = await masterApi.deposit({
        accountNo: selectedAccountNo,
        amount: amountValue,
        memo: memo.trim() || "테스트 입금",
      });
      setMessage(`입금 완료: 거래번호 ${res.data.transactionId}`);
      setAmount("");
      await load();
    } catch {
      setMessage("입금 처리에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!masterToken) {
    return (
      <div className="master master--login">
        <form className="master-login" onSubmit={handleLogin}>
          <p className="master__eyebrow">LeeBank Admin</p>
          <h1 className="master__title">Master Login</h1>

          <label className="master__label">
            관리자 ID
            <input
              value={adminId}
              onChange={(event) => setAdminId(event.target.value)}
              placeholder="master"
              autoComplete="username"
            />
          </label>

          <label className="master__label">
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="관리자 비밀번호"
              autoComplete="current-password"
            />
          </label>

          <button className="master__submit" type="submit" disabled={!adminId.trim() || !password.trim()}>
            로그인
          </button>
          {message && <p className="master__message master__message--error">{message}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="master">
      <header className="master__header">
        <div>
          <p className="master__eyebrow">LeeBank Admin</p>
          <h1 className="master__title">Master</h1>
        </div>
        <div className="master__header-actions">
          <button className="master__refresh" onClick={load} disabled={loading}>
            새로고침
          </button>
          <button className="master__refresh master__refresh--ghost" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </header>

      <main className="master__grid">
        <section className="master__panel">
          <div className="master__section-head">
            <h2>계좌 목록</h2>
            <span>{accounts.length}개</span>
          </div>

          {loading ? (
            <p className="master__empty">불러오는 중입니다.</p>
          ) : accounts.length === 0 ? (
            <p className="master__empty">등록된 계좌가 없습니다.</p>
          ) : (
            <div className="master__account-list">
              {accounts.map((account) => (
                <button
                  key={account.accountNo}
                  className={`master__account${account.accountNo === selectedAccountNo ? " active" : ""}`}
                  onClick={() => setSelectedAccountNo(account.accountNo)}
                >
                  <span>
                    <strong>{account.ownerName || account.memberId}</strong>
                    <small>{account.accountNo}</small>
                  </span>
                  <span className="num-display">{formatMoney(account.balance)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="master__panel">
          <div className="master__section-head">
            <h2>테스트 입금</h2>
            <span>{selectedAccount?.accountStatus || "-"}</span>
          </div>

          <div className="master__selected">
            <p>{selectedAccount?.ownerName || selectedAccount?.memberId || "계좌 선택"}</p>
            <strong>{selectedAccount?.accountNo || "-"}</strong>
            <span>현재 잔액 {formatMoney(selectedAccount?.balance)}</span>
          </div>

          <label className="master__label">
            입금 금액
            <input
              value={amount ? Number(amount).toLocaleString("ko-KR") : ""}
              onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ""))}
              placeholder="0"
              inputMode="numeric"
            />
          </label>

          <label className="master__label">
            메모
            <input
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="입금 사유"
            />
          </label>

          <button
            className="master__submit"
            onClick={handleDeposit}
            disabled={!selectedAccountNo || !amount || saving}
          >
            {saving ? "입금 처리 중" : "입금하기"}
          </button>
          {message && <p className="master__message">{message}</p>}
        </section>

        <section className="master__panel master__panel--wide">
          <div className="master__section-head">
            <h2>전체 거래내역</h2>
            <span>최근 {transactions.length}건</span>
          </div>

          {transactions.length === 0 ? (
            <p className="master__empty">거래내역이 없습니다.</p>
          ) : (
            <div className="master__tx-list">
              {transactions.map((tx) => (
                <div className="master__tx" key={tx.transactionId}>
                  <div>
                    <p className="master__tx-id">{tx.transactionId}</p>
                    <p className="master__tx-meta">
                      {tx.txType} · {formatDate(tx.createdAt)}
                    </p>
                  </div>
                  <div className="master__tx-accounts">
                    <span>{tx.fromAccount || "BANK"}</span>
                    <span>{tx.toAccount || "-"}</span>
                  </div>
                  <div className="master__tx-amount">
                    <strong className="num-display">{formatMoney(tx.amount)}</strong>
                    <small>잔액 {formatMoney(tx.balanceAfter)}</small>
                  </div>
                  <p className="master__tx-memo">{tx.memo || "-"}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
