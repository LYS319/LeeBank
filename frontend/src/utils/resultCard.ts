import type { PendingAction, ResultCardData } from "../types";

/**
 * AI(Python) 응답 메시지와 직전에 실행된 도구(tool)를 기반으로
 * 채팅 말풍선 대신 "결과 카드"로 보여줄 데이터를 추출한다.
 *
 * 백엔드는 사람이 읽는 한국어 문장만 내려주기 때문에,
 * 정규식으로 금액·거래번호 등을 뽑아 카드 형태로 재구성한다.
 */
export function parseResultCard(
  message: string,
  tool?: PendingAction["tool"],
): ResultCardData | null {
  const amountMatch = message.match(/([\d,]+)\s*원/);
  const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : undefined;

  if (tool === "get_balance" || /현재\s*잔액/.test(message)) {
    if (amount === undefined) return null;
    return { kind: "balance", amount, rows: [] };
  }

  if (tool === "immediate_transfer" || /이체가\s*완료/.test(message)) {
    const txnMatch = message.match(/거래번호[:\s]*([A-Za-z0-9-]+)/);
    const balanceMatch = message.match(/잔액[:\s]*([\d,]+)\s*원/);
    return {
      kind: "transfer",
      amount,
      rows: [
        ...(txnMatch ? [{ label: "거래번호", value: txnMatch[1] }] : []),
        ...(balanceMatch
          ? [{ label: "남은 잔액", value: `${balanceMatch[1]}원` }]
          : []),
      ],
    };
  }

  if (tool === "schedule_transfer" || /예약이\s*완료/.test(message)) {
    const rsvMatch = message.match(/예약번호[:\s]*([A-Za-z0-9-]+)/);
    const timeMatch = message.match(/실행\s*시각[:\s]*([\d\-T:]+)/);
    const balanceMatch = message.match(/잔액[:\s]*([\d,]+)\s*원/);
    return {
      kind: "schedule",
      amount,
      rows: [
        ...(rsvMatch ? [{ label: "예약번호", value: rsvMatch[1] }] : []),
        ...(timeMatch ? [{ label: "실행 시각", value: formatDateTime(timeMatch[1]) }] : []),
        ...(balanceMatch
          ? [{ label: "남은 잔액", value: `${balanceMatch[1]}원` }]
          : []),
      ],
    };
  }

  return null;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
