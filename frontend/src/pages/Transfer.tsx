import { useState } from "react";
import TransferForm from "../components/transfer/TransferForm";
import ScheduleForm from "../components/transfer/ScheduleForm";

export default function Transfer() {
  const [mode, setMode] = useState<"immediate" | "schedule">("immediate");

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">이체</h1>
      </header>

      <div style={{ padding: "16px 20px 0" }}>
        <div className="form-toggle">
          <button
            className={`form-toggle__btn${mode === "immediate" ? " active" : ""}`}
            onClick={() => setMode("immediate")}
          >
            바로 보내기
          </button>
          <button
            className={`form-toggle__btn${mode === "schedule" ? " active" : ""}`}
            onClick={() => setMode("schedule")}
          >
            예약 보내기
          </button>
        </div>
      </div>

      {mode === "immediate" ? <TransferForm mode="immediate" /> : <ScheduleForm />}
    </div>
  );
}
