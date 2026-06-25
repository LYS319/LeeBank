package com.bank.service;

import com.bank.dto.ReservationDto;
import com.bank.mapper.AccountMapper;
import com.bank.mapper.ReservationMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SchedulerService {

    private final ReservationMapper reservationMapper;
    private final AccountMapper accountMapper;
    // 출금/입금/이체 원장 기록 로직(recordLedgerTransfer)을 TransferService와 공유한다.
    // (정합성 규칙이 한 군데에만 존재해야 즉시이체/예약이체가 서로 다르게 깨질 위험이 없다)
    private final TransferService transferService;

    // 1분마다 실행 — 예약 시간이 된 건들을 처리
    @Scheduled(fixedDelay = 60000)
    public void runReservationBatch() {
        log.info("=== 예약이체 배치 시작 ===");

        // 1. 실행 대기 중인 예약 목록 조회
        // (scheduled_at <= SYSDATE AND status = 'PENDING')
        List<ReservationDto> pendingList = reservationMapper.selectPendingReservations();

        if (pendingList.isEmpty()) {
            log.info("처리할 예약이체 없음");
            return;
        }

        log.info("처리 대상 예약이체 건수: {}", pendingList.size());

        // 2. 건별로 처리
        // 트랜잭션 경계는 processReservation 내부에서 잡고, 여기서는 try/catch로
        // 1건의 실패가 다른 건 처리에 영향을 주지 않도록만 막는다.
        // (processReservation 메서드 자체에서 예외를 잡지 않아야
        //  Spring이 트랜잭션을 정확히 롤백할 수 있다)
        for (ReservationDto reservation : pendingList) {
            try {
                processReservation(reservation);
            } catch (Exception e) {
                // 여기서 잡았을 때는 이미 processReservation의 트랜잭션이 롤백된 뒤이므로
                // (즉 입금/출금/원장 INSERT가 전부 취소된 상태) FAILED 마킹만 별도 트랜잭션으로 남긴다.
                log.error("예약이체 처리 실패 — reservationId: {}, error: {}",
                        reservation.getReservationId(), e.getMessage());
                markFailed(reservation.getReservationId(), safeMessage(e));
            }
        }

        log.info("=== 예약이체 배치 완료 ===");
    }

    // 건별 처리 — 각각 독립 트랜잭션으로 처리
    // 중요: 이 메서드 안에서는 예외를 절대 잡지 않는다(catch 금지).
    //       예외를 여기서 잡아버리면 Spring이 "정상 종료"로 판단해
    //       이미 실행된 입금/출금/원장 INSERT까지 그대로 커밋해버린다.
    //       (실제로 이 문제 때문에 같은 예약이 반복 처리되는 사고가 있었음)
    @Transactional
    public void processReservation(ReservationDto reservation) {
        String reservationId = reservation.getReservationId();
        log.info("예약이체 처리 시작 — reservationId: {}, amount: {}",
                reservationId, reservation.getAmount());

        // 1. 입금 계좌 존재 여부 확인
        var toAccount = accountMapper.selectByAccountNo(reservation.getToAccount());
        if (toAccount == null) {
            throw new IllegalStateException("입금 계좌를 찾을 수 없습니다: " + reservation.getToAccount());
        }

        // 2. 입금 계좌 잔액 증가
        int added = accountMapper.addBalance(reservation.getToAccount(), reservation.getAmount());
        if (added == 0) {
            throw new IllegalStateException("입금 처리에 실패했습니다: " + reservation.getToAccount());
        }

        // 3. 출금 계좌 hold_amount 감소
        // (예약 등록 시 이미 balance는 차감됐으므로 hold만 해제)
        accountMapper.decreaseHold(reservation.getFromAccount(), reservation.getAmount());

        // 4. 출금/입금/이체 원장 INSERT (v2.0)
        // 이 시점이 바로 실제 돈이 움직인 시점이므로, 여기서 처음으로 원장이 생성된다.
        var fromAccount = accountMapper.selectByAccountNo(reservation.getFromAccount());
        Long fromBalanceAfter = fromAccount != null ? fromAccount.getBalance() : 0L;
        Long toBalanceAfter   = toAccount.getBalance() + reservation.getAmount();

        transferService.recordLedgerTransfer(
                reservation.getFromAccount(), reservation.getToAccount(),
                reservation.getAmount(), reservation.getMemo(),
                fromBalanceAfter, toBalanceAfter,
                "SCHEDULED"
        );

        // 5. 예약 상태 COMPLETED로 업데이트 (failReason은 성공이므로 null)
        reservationMapper.updateStatus(reservationId, "COMPLETED", null);

        log.info("예약이체 처리 완료 — reservationId: {}", reservationId);
    }

    // FAILED 마킹 전용 — 항상 새 트랜잭션에서 실행한다.
    // (롤백된 트랜잭션 컨텍스트에 끼어 들어가면 이 UPDATE도 같이 무효화될 수 있으므로
    //  REQUIRES_NEW로 완전히 분리된 트랜잭션을 새로 연다)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(String reservationId, String reason) {
        reservationMapper.updateStatus(reservationId, "FAILED", reason);
    }

    private String safeMessage(Exception e) {
        String msg = e.getMessage();
        return (msg == null || msg.isBlank()) ? e.getClass().getSimpleName() : msg;
    }
}