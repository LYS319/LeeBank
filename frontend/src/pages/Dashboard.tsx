import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { accountApi } from "../api";
import { useAuthStore } from "../stores/authStore";
import type { Account, Transaction } from "../types/index.ts";

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M7 7h12M19 7l-3.5-3.5M19 7l-3.5 3.5M17 17H5M5 17l3.5-3.5M5 17l3.5 3.5"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 12h10M4 18h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"
        fill="currentColor" />
    </svg>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { accountNo, ownerName, logout } = useAuthStore();

  const [account, setAccount] = useState<Account | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!accountNo) return;
      try {
        const [accRes, histRes] = await Promise.all([
          accountApi.getAccount(accountNo),
          accountApi.getHistory(accountNo, 3),
        ]);
        if (!mounted) return;
        setAccount(accRes.data);
        const list = Array.isArray(histRes.data) ? histRes.data : histRes.data?.content ?? [];
        setRecent(list);
      } catch {
        // 대시보드는 조회 실패해도 화면은 유지하고 조용히 넘어간다
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [accountNo]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="dash">
      <header className="dash__header">
        <p className="dash__greeting">
          <span>{ownerName ?? "고객"}</span>님, 안녕하세요
        </p>
        <button className="dash__logout" onClick={handleLogout}>로그아웃</button>
      </header>

      <div className="dash__body">
        <div className="balance-hero" style={{ marginTop: 14 }}>
          <p className="balance-hero__label">{ownerName ?? "내"} 계좌 잔액</p>
          <div className="balance-hero__amount num-display">
            {loading ? "···" : `${(account?.balance ?? 0).toLocaleString("ko-KR")}원`}
          </div>
          <p className="balance-hero__account">{account?.accountNo ?? accountNo}</p>
        </div>

        <div className="dash__quick-grid">
          <button className="dash__quick-item" onClick={() => navigate("/transfer")}>
            <span className="dash__quick-icon"><SendIcon /></span>
            <span className="dash__quick-label">이체</span>
          </button>
          <button className="dash__quick-item" onClick={() => navigate("/transfer")}>
            <span className="dash__quick-icon"><ClockIcon /></span>
            <span className="dash__quick-label">예약이체</span>
          </button>
          <button className="dash__quick-item" onClick={() => navigate("/history")}>
            <span className="dash__quick-icon"><HistoryIcon /></span>
            <span className="dash__quick-label">거래내역</span>
          </button>
          <button className="dash__quick-item" onClick={() => navigate("/chat")}>
            <span className="dash__quick-icon"><ChatIcon /></span>
            <span className="dash__quick-label">AI 채팅</span>
          </button>
        </div>

        <div className="dash__ai-banner" onClick={() => navigate("/chat")}>
          <span className="dash__ai-banner-icon"><SparkleIcon /></span>
          <div>
            <p className="dash__ai-banner-title">AI한테 말로 시켜보세요</p>
            <p className="dash__ai-banner-desc">"5만원 보내줘" 한마디면 충분해요</p>
          </div>
        </div>

        <div className="dash__section-head">
          <p className="history-section-label" style={{ margin: 0 }}>최근 거래</p>
          <button className="dash__section-link" onClick={() => navigate("/history")}>
            전체보기
          </button>
        </div>

        {recent.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-faint)", padding: "8px 2px" }}>
            아직 거래내역이 없어요
          </p>
        ) : (
          <div className="history-list">
            {recent.map((t) => {
              const isOut = t.type === "TRANSFER_OUT";
              return (
                <div className="history-item" key={t.transactionId}>
                  <span className={`history-item__icon history-item__icon--${isOut ? "out" : "in"}`}>
                    {isOut ? "↑" : "↓"}
                  </span>
                  <div className="history-item__main">
                    <p className="history-item__name">{t.counterpartName || t.memo || "거래"}</p>
                  </div>
                  <div className="history-item__amount-block">
                    <div className={`history-item__amount num-display history-item__amount--${isOut ? "out" : "in"}`}>
                      {isOut ? "-" : "+"}{t.amount.toLocaleString("ko-KR")}원
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
