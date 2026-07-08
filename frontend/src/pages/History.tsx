import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { accountApi } from "../api";
import { useAuthStore } from "../stores/authStore";
import type { Account, Transaction, Reservation } from "../types/index.ts";

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

function ClockIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

function reservationStatusInfo(status: Reservation["status"]) {
  switch (status) {
    case "PENDING":   return { label: "대기중",  variant: "pending"   as const };
    case "COMPLETED": return { label: "완료",    variant: "completed" as const };
    case "FAILED":    return { label: "실패",    variant: "failed"    as const };
    case "CANCELLED": return { label: "취소됨",  variant: "failed"    as const };
    default:          return { label: status,   variant: "pending"   as const };
  }
}

type Tab      = "transactions" | "reservations";
type TypeFilter = "all" | "in" | "out";
type Period   = "all" | "7d" | "30d" | "90d";
type SortKey  = "newest" | "oldest" | "amount_desc" | "amount_asc";

const PERIOD_LABELS: Record<Period, string>  = { all: "전체", "7d": "1주일", "30d": "1달", "90d": "3달" };
const TYPE_LABELS:   Record<TypeFilter, string> = { all: "전체", in: "입금", out: "출금" };
const SORT_LABELS:   Record<SortKey, string> = {
  newest: "최신순", oldest: "오래된순", amount_desc: "금액 큰순", amount_asc: "금액 작은순"
};

function filterByPeriod(date: string, period: Period): boolean {
  if (period === "all") return true;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return new Date(date) >= cutoff;
}

export default function History() {
  const navigate  = useNavigate();
  const { accountNo } = useAuthStore();
  const [tab, setTab] = useState<Tab>("transactions");

  const [account,      setAccount]      = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [status,       setStatus]       = useState<"loading" | "ready" | "error">("loading");

  // 필터/정렬 상태
  const [period,     setPeriod]     = useState<Period>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortKey,    setSortKey]    = useState<SortKey>("newest");
  const [showFilter, setShowFilter] = useState(false);

  const targetAccount = accountNo;

  useEffect(() => {
    if (!targetAccount) { setStatus("error"); return; }
    const account: string = targetAccount;
    let mounted = true;

    async function load() {
      setStatus("loading");
      try {
        const [accountRes, historyRes, reservationRes] = await Promise.all([
          accountApi.getAccount(account),
          accountApi.getHistory(account, 50),
          accountApi.getReservations(account, 50),
        ]);
        if (!mounted) return;
        setAccount(accountRes.data);
        setTransactions(Array.isArray(historyRes.data) ? historyRes.data : historyRes.data?.content ?? []);
        setReservations(Array.isArray(reservationRes.data) ? reservationRes.data : reservationRes.data?.content ?? []);
        setStatus("ready");
      } catch {
        if (mounted) setStatus("error");
      }
    }
    load();
    return () => { mounted = false; };
  }, [targetAccount]);

  // 필터 + 정렬 적용
  const filteredTx = useMemo(() => {
    let list = [...transactions];
    // 기간 필터
    list = list.filter(t => filterByPeriod(t.createdAt, period));
    // 타입 필터
    if (typeFilter !== "all") {
      list = list.filter(t => {
        const isOut = (t.txType ?? t.type) === "TRANSFER_OUT";
        return typeFilter === "out" ? isOut : !isOut;
      });
    }
    // 정렬
    list.sort((a, b) => {
      if (sortKey === "newest")      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortKey === "oldest")      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortKey === "amount_desc") return b.amount - a.amount;
      if (sortKey === "amount_asc")  return a.amount - b.amount;
      return 0;
    });
    return list;
  }, [transactions, period, typeFilter, sortKey]);

  const activeFilterCount = (period !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0) + (sortKey !== "newest" ? 1 : 0);

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

            {/* 탭 */}
            <div className="form-toggle" style={{ margin: "16px 0 12px" }}>
              <button className={`form-toggle__btn${tab === "transactions" ? " active" : ""}`} onClick={() => setTab("transactions")}>일반 이체</button>
              <button className={`form-toggle__btn${tab === "reservations" ? " active" : ""}`} onClick={() => setTab("reservations")}>예약 이체</button>
            </div>

            {/* 필터/정렬 (일반 이체 탭에서만) */}
            {tab === "transactions" && (
              <div style={{ marginBottom: 12 }}>
                <button
                  onClick={() => setShowFilter(v => !v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    border: "1.5px solid var(--border)", borderRadius: 10,
                    background: activeFilterCount > 0 ? "var(--primary-bg)" : "var(--surface)",
                    color: activeFilterCount > 0 ? "var(--primary)" : "var(--ink-soft)",
                    padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  필터/정렬
                  {activeFilterCount > 0 && (
                    <span style={{
                      background: "var(--primary)", color: "white",
                      borderRadius: "50%", width: 18, height: 18,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700,
                    }}>{activeFilterCount}</span>
                  )}
                </button>

                {showFilter && (
                  <div style={{
                    marginTop: 10, background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 14,
                  }}>
                    {/* 기간 */}
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-faint)", margin: "0 0 8px" }}>기간</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {(["all", "7d", "30d", "90d"] as Period[]).map(p => (
                          <button key={p} onClick={() => setPeriod(p)} style={{
                            padding: "6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                            border: "1.5px solid", borderColor: period === p ? "var(--primary)" : "var(--border)",
                            background: period === p ? "var(--primary)" : "var(--surface)",
                            color: period === p ? "white" : "var(--ink-soft)",
                          }}>{PERIOD_LABELS[p]}</button>
                        ))}
                      </div>
                    </div>

                    {/* 타입 */}
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-faint)", margin: "0 0 8px" }}>거래 유형</p>
                      <div style={{ display: "flex", gap: 6 }}>
                        {(["all", "in", "out"] as TypeFilter[]).map(t => (
                          <button key={t} onClick={() => setTypeFilter(t)} style={{
                            padding: "6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                            border: "1.5px solid", borderColor: typeFilter === t ? "var(--primary)" : "var(--border)",
                            background: typeFilter === t ? "var(--primary)" : "var(--surface)",
                            color: typeFilter === t ? "white" : "var(--ink-soft)",
                          }}>{TYPE_LABELS[t]}</button>
                        ))}
                      </div>
                    </div>

                    {/* 정렬 */}
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-faint)", margin: "0 0 8px" }}>정렬</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {(["newest", "oldest", "amount_desc", "amount_asc"] as SortKey[]).map(s => (
                          <button key={s} onClick={() => setSortKey(s)} style={{
                            padding: "6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                            border: "1.5px solid", borderColor: sortKey === s ? "var(--primary)" : "var(--border)",
                            background: sortKey === s ? "var(--primary)" : "var(--surface)",
                            color: sortKey === s ? "white" : "var(--ink-soft)",
                          }}>{SORT_LABELS[s]}</button>
                        ))}
                      </div>
                    </div>

                    {/* 초기화 */}
                    {activeFilterCount > 0 && (
                      <button onClick={() => { setPeriod("all"); setTypeFilter("all"); setSortKey("newest"); }} style={{
                        alignSelf: "flex-start", border: "none", background: "none",
                        color: "var(--danger)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0,
                      }}>초기화</button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 일반 이체 탭 */}
            {tab === "transactions" && (
              filteredTx.length === 0 ? (
                <div className="state-block">
                  <p className="state-block__title">해당하는 거래내역이 없어요</p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 8 }}>
                    총 {filteredTx.length}건
                  </p>
                  <div className="history-list">
                    {filteredTx.map((t) => {
                      const isOut = (t.txType ?? t.type) === "TRANSFER_OUT";
                      return (
                        <div className="history-item" key={t.transactionId}>
                          <span className={`history-item__icon history-item__icon--${isOut ? "out" : "in"}`}>
                            {isOut ? <ArrowUpIcon /> : <ArrowDownIcon />}
                          </span>
                          <div className="history-item__main">
                            <p className="history-item__name">{t.counterpartName || t.memo || (isOut ? "이체" : "입금")}</p>
                            <p className="history-item__meta">{formatDate(t.createdAt)}</p>
                          </div>
                          <div className="history-item__amount-block">
                            <div className={`history-item__amount num-display history-item__amount--${isOut ? "out" : "in"}`}>
                              {isOut ? "-" : "+"}{t.amount.toLocaleString("ko-KR")}원
                            </div>
                            <div className="history-item__balance num-display">
                              잔액 {t.balanceAfter.toLocaleString("ko-KR")}원
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )
            )}

            {/* 예약 이체 탭 */}
            {tab === "reservations" && (
              reservations.length === 0 ? (
                <div className="state-block">
                  <div className="state-block__icon"><ClockIcon /></div>
                  <p className="state-block__title">등록된 예약이체가 없어요</p>
                </div>
              ) : (
                <div className="history-list">
                  {reservations.map((r) => {
                    const isOut = r.fromAccount === account?.accountNo;
                    const { label, variant } = reservationStatusInfo(r.status);
                    return (
                      <div className="history-item" key={r.reservationId}>
                        <span className={`history-item__icon history-item__icon--${isOut ? "out" : "in"}`}>
                          {isOut ? <ArrowUpIcon /> : <ArrowDownIcon />}
                        </span>
                        <div className="history-item__main">
                          <p className="history-item__name">{r.memo || (isOut ? "예약이체" : "예약입금")}</p>
                          <p className="history-item__meta">{formatDate(r.scheduledAt)} 실행 예정</p>
                        </div>
                        <div className="history-item__amount-block">
                          <div className={`history-item__amount num-display history-item__amount--${isOut ? "out" : "in"}`}>
                            {isOut ? "-" : "+"}{r.amount.toLocaleString("ko-KR")}원
                          </div>
                          <span className={`reservation-badge reservation-badge--${variant}`}>{label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}