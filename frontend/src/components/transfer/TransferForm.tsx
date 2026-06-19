import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { chatApi } from "../../api";
import { useAuthStore } from "../../stores/authStore";
import { useChatStore } from "../../stores/chatStore";
import { parseBankCode } from "../../utils/bankCode";
import PinPad from "../auth/PinPad";

const QUICK_AMOUNTS = [10000, 50000, 100000];

type Mode = "immediate" | "schedule";

interface Props {
  mode: Mode;
}

export default function TransferForm({ mode }: Props) {
  const navigate = useNavigate();
  const { accountNo, memberId } = useAuthStore();
  const { sessionId } = useChatStore();

  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [step, setStep] = useState<"form" | "pin">("form");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const bank = toAccount.length >= 3 ? parseBankCode(toAccount) : null;
  const amountNum = Number(amount.replace(/[^0-9]/g, ""));

  const canSubmit =
    toAccount.trim().length > 5 &&
    amountNum > 0 &&
    (mode === "immediate" || scheduledAt.length > 0);

  const handleAmountQuick = (value: number) => {
    setAmount(String(amountNum + value));
  };

  const goToPin = () => {
    if (!canSubmit) return;
    setError("");
    setStep("pin");
  };

  const submit = async () => {
    if (pin.length < 4) {
      setError("비밀번호를 입력해주세요.");
      return;
    }
    if (!accountNo || !memberId) {
      setError("로그인 정보가 만료됐어요. 다시 로그인해주세요.");
      return;
    }
    setIsLoading(true);
    setError("");

    const tool = mode === "immediate" ? "immediate_transfer" : "schedule_transfer";
    const params: Record<string, unknown> = {
      fromAccount: accountNo,
      toAccount: toAccount.trim(),
      amount: amountNum,
      memo: memo.trim() || undefined,
    };
    if (mode === "schedule") {
      params.scheduledAt = scheduledAt;
    }

    try {
      const res = await chatApi.confirm(sessionId, pin, memberId, {
        tool,
        params,
      });
      setDone(res.data.message);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: { message?: string } } } };
      setError(e.response?.data?.detail?.message || "이체에 실패했어요. 다시 시도해주세요.");
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  if (done) {
    return (
      <div className="state-block" style={{ paddingTop: 64 }}>
        <div
          className="result-card__badge result-card__badge--success"
          style={{ width: 52, height: 52 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="state-block__title" style={{ fontSize: 16, marginTop: 8 }}>
          {mode === "immediate" ? "이체 완료" : "예약 완료"}
        </p>
        <p className="state-block__desc">{done}</p>
        <button
          className="form-submit"
          style={{ marginTop: 20, maxWidth: 200 }}
          onClick={() => navigate("/history")}
        >
          거래내역 보기
        </button>
      </div>
    );
  }

  if (step === "pin") {
    return (
      <div className="page__body">
        <p className="form-label" style={{ textAlign: "center", marginBottom: 20 }}>
          비밀번호 6자리를 입력해주세요
        </p>
        {error && <p className="auth-sheet__error">{error}</p>}
        <PinPad value={pin} onChange={setPin} maxLength={6} />
        <button
          className="form-submit"
          disabled={pin.length < 4 || isLoading}
          onClick={submit}
        >
          {isLoading ? "처리 중…" : `${amountNum.toLocaleString("ko-KR")}원 보내기`}
        </button>
        <button
          className="auth-sheet__cancel"
          onClick={() => {
            setStep("form");
            setPin("");
            setError("");
          }}
        >
          이전으로
        </button>
      </div>
    );
  }

  return (
    <div className="page__body">
      <div className="form-group">
        <label className="form-label">받는 계좌</label>
        <input
          className="form-input"
          placeholder="계좌번호를 입력하세요"
          value={toAccount}
          onChange={(e) => setToAccount(e.target.value)}
          inputMode="numeric"
        />
        {bank && (
          <span className="form-bank-tag">
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: bank.color }} />
            {bank.name}
          </span>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">보낼 금액</label>
        <input
          className="form-input form-input--amount"
          placeholder="0"
          value={amount ? Number(amount).toLocaleString("ko-KR") : ""}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
        />
        <div className="form-quick-amounts">
          {QUICK_AMOUNTS.map((v) => (
            <button key={v} onClick={() => handleAmountQuick(v)}>
              +{(v / 10000).toLocaleString()}만
            </button>
          ))}
          <button onClick={() => setAmount("")}>지우기</button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">메모 (선택)</label>
        <input
          className="form-input"
          placeholder="예: 생일선물"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={30}
        />
      </div>

      {mode === "schedule" && (
        <div className="form-group">
          <label className="form-label">보낼 시각</label>
          <input
            className="form-input"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>
      )}

      <button className="form-submit" disabled={!canSubmit} onClick={goToPin}>
        다음
      </button>
    </div>
  );
}
