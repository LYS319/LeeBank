import type { ResultCardData } from "../../types/index.ts";

interface Props {
  data: ResultCardData;
  message: string;
}

const TITLE_MAP: Record<ResultCardData["kind"], string> = {
  balance: "현재 잔액",
  transfer: "이체 완료",
  schedule: "예약 완료",
  history: "거래내역",
};

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function ResultCard({ data, message }: Props) {
  const isPending = data.kind === "schedule";

  return (
    <div className="result-card">
      <div className="result-card__head">
        <span
          className={`result-card__badge ${
            isPending ? "result-card__badge--pending" : "result-card__badge--success"
          }`}
        >
          {isPending ? <ClockIcon /> : <CheckIcon />}
        </span>
        <span className="result-card__title">{TITLE_MAP[data.kind]}</span>
      </div>

      {data.amount !== undefined && (
        <div className="result-card__amount-row">
          <span className="result-card__amount num-display">
            {data.amount.toLocaleString("ko-KR")}
          </span>
          <span className="result-card__amount-unit">원</span>
        </div>
      )}

      {data.rows.length > 0 && (
        <div className="result-card__rows">
          {data.rows.map((row) => (
            <div className="result-card__row" key={row.label}>
              <span className="result-card__row-label">{row.label}</span>
              <span className="result-card__row-value num-display">{row.value}</span>
            </div>
          ))}
        </div>
      )}

      {data.amount === undefined && data.rows.length === 0 && (
        <div className="result-card__rows" style={{ borderTop: "none", paddingTop: 0 }}>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-soft)", textAlign: "left" }}>
            {message}
          </p>
        </div>
      )}
    </div>
  );
}
