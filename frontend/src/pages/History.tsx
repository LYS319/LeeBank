import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { accountApi } from "../api";
import { useAuthStore } from "../stores/authStore";
import type { Account, Transaction } from "../types/index.ts";

function ArrowUpIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function History() {
  const navigate = useNavigate();
  const { accountNo } = useAuthStore();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const targetAccount = accountNo;

  useEffect(() => {
    if (!targetAccount) {
      setStatus("error");
      return;
    }
    // targetAccount가 string임이 확정된 시점의 값을 별도로 캡처한다.
    // (async function 내부에서는 TypeScript가 위의 null 체크를 좁혀 추론하지 못하기 때문)
    const account: string = targetAccount;
    let mounted = true;

    async function load() {
      setStatus("loading");
      try {
        const [accountRes, historyRes] = await Promise.all([
          accountApi.getAccount(account),
          accountApi.getHistory(account, 20),
        ]);
        if (!mounted) return;
        setAccount(accountRes.data);
        const list = Array.isArray(historyRes.data)
          ? historyRes.data
          : historyRes.data?.content ?? [];
        setTransactions(list);
        setStatus("ready");
      } catch {
        if (mounted) setStatus("error");
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [targetAccount]);

  return (
    <div className="page">
      <header className="page__header">
        <button className="page__back" onClick={() => navigate("/home")} aria-label="홈으로">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="page__title">거래내역</h1>
      </header>

      <div className="page__body">
        {status === "loading" && (
          <div className="state-block">
            <div className="spinner" />
            <p className="state-block__desc">불러오는 중이에요</p>
          </div>
        )}

        {status === "error" && (
          <div className="state-block">
            <div className="state-block__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </div>
            <p className="state-block__title">내역을 불러오지 못했어요</p>
            <p className="state-block__desc">잠시 후 다시 시도해주세요</p>
          </div>
        )}

        {status === "ready" && (
          <>
            <div className="balance-hero">
              <p className="balance-hero__label">{account?.ownerName ?? "내"} 계좌 잔액</p>
              <div className="balance-hero__amount num-display">
                {(account?.balance ?? 0).toLocaleString("ko-KR")}원
              </div>
              <p className="balance-hero__account">{account?.accountNo}</p>
            </div>

            <p className="history-section-label">최근 거래</p>

            {transactions.length === 0 ? (
              <div className="state-block">
                <div className="state-block__icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M4 6h16M4 12h10M4 18h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="state-block__title">아직 거래내역이 없어요</p>
              </div>
            ) : (
              <div className="history-list">
                {transactions.map((t) => {
                  const isOut = t.type === "TRANSFER_OUT";
                  return (
                    <div className="history-item" key={t.transactionId}>
                      <span className={`history-item__icon history-item__icon--${isOut ? "out" : "in"}`}>
                        {isOut ? <ArrowUpIcon /> : <ArrowDownIcon />}
                      </span>
                      <div className="history-item__main">
                        <p className="history-item__name">
                          {t.counterpartName || t.memo || (isOut ? "이체" : "입금")}
                        </p>
                        <p className="history-item__meta">{formatDate(t.createdAt)}</p>
                      </div>
                      <div className="history-item__amount-block">
                        <div className={`history-item__amount num-display history-item__amount--${isOut ? "out" : "in"}`}>
                          {isOut ? "-" : "+"}
                          {t.amount.toLocaleString("ko-KR")}원
                        </div>
                        <div className="history-item__balance num-display">
                          잔액 {t.balanceAfter.toLocaleString("ko-KR")}원
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}