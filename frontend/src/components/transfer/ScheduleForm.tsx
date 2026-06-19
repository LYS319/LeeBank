import TransferForm from "./TransferForm";

/**
 * 예약이체 폼은 즉시이체 폼과 입력 항목이 동일하고
 * scheduledAt 필드만 추가되므로 TransferForm을 mode="schedule"로 재사용한다.
 */
export default function ScheduleForm() {
  return <TransferForm mode="schedule" />;
}
