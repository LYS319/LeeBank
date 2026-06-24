import { useNavigate } from "react-router-dom";
import TransferForm from "../components/transfer/TransferForm";

interface Props {
  /** "immediate"면 즉시이체 화면만, "schedule"이면 예약이체 화면만 보여준다.
   *  Dashboard의 "이체"/"예약이체" 버튼이 각각 다른 경로(/transfer, /transfer/schedule)로
   *  연결되어 있으므로, 같은 페이지 안에서 토글로 전환할 필요가 없다. */
  mode: "immediate" | "schedule";
}

export default function Transfer({ mode }: Props) {
  const navigate = useNavigate();
  const title = mode === "immediate" ? "이체" : "예약이체";

  return (
    <div className="page">
      <header className="page__header">
        <button className="page__back" onClick={() => navigate("/home")} aria-label="홈으로">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="page__title">{title}</h1>
      </header>

      <TransferForm mode={mode} />
    </div>
  );
}