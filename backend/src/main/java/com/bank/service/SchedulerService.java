package com.bank.service;

import com.bank.dto.ReservationDto;
import com.bank.mapper.AccountMapper;
import com.bank.mapper.ReservationMapper;
import com.bank.mapper.TransferMapper;
import com.bank.dto.TransactionDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SchedulerService {

    private final ReservationMapper reservationMapper;
    private final AccountMapper accountMapper;
    private final TransferMapper transferMapper;

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
        for (ReservationDto reservation : pendingList) {
            processReservation(reservation);
        }

        log.info("=== 예약이체 배치 완료 ===");
    }

    // 건별 처리 — 각각 독립 트랜잭션으로 처리
    // 1건 실패해도 다른 건에 영향 없도록 @Transactional 분리
    @Transactional
    public void processReservation(ReservationDto reservation) {
        String reservationId = reservation.getReservationId();
        log.info("예약이체 처리 시작 — reservationId: {}, amount: {}",
                reservationId, reservation.getAmount());

        try {
            // 1. 입금 계좌 존재 여부 확인
            var toAccount = accountMapper.selectByAccountNo(reservation.getToAccount());
            if (toAccount == null) {
                log.error("입금 계좌 없음 — toAccount: {}", reservation.getToAccount());
                reservationMapper.updateStatus(reservationId, "FAILED", "입금 계좌를 찾을 수 없습니다.");
                return;
            }

            // 2. 입금 계좌 잔액 증가
            int added = accountMapper.addBalance(reservation.getToAccount(), reservation.getAmount());
            if (added == 0) {
                log.error("입금 처리 실패 — toAccount: {}", reservation.getToAccount());
                reservationMapper.updateStatus(reservationId, "FAILED", "입금 처리에 실패했습니다.");
                return;
            }

            // 3. 출금 계좌 hold_amount 감소
            // (예약 등록 시 이미 balance는 차감됐으므로 hold만 해제)
            accountMapper.decreaseHold(reservation.getFromAccount(), reservation.getAmount());

            // 4. 출금 거래내역 Insert
            transferMapper.insertTransaction(TransactionDto.builder()
                    .fromAccount(reservation.getFromAccount())
                    .toAccount(reservation.getToAccount())
                    .amount(reservation.getAmount())
                    .txType("TRANSFER_OUT")
                    .memo(reservation.getMemo())
                    .balanceAfter(0L)  // 실시간 잔액 조회 생략
                    .build());

            // 5. 입금 거래내역 Insert
            transferMapper.insertTransaction(TransactionDto.builder()
                    .fromAccount(reservation.getFromAccount())
                    .toAccount(reservation.getToAccount())
                    .amount(reservation.getAmount())
                    .txType("TRANSFER_IN")
                    .memo(reservation.getMemo())
                    .balanceAfter(toAccount.getBalance() + reservation.getAmount())
                    .build());

            // 6. 예약 상태 COMPLETED로 업데이트
            reservationMapper.updateStatus(reservationId, "COMPLETED", null);

            log.info("예약이체 처리 완료 — reservationId: {}", reservationId);

        } catch (Exception e) {
            // 예외 발생 시 FAILED 처리 후 다음 건 계속 진행
            log.error("예약이체 처리 중 오류 — reservationId: {}, error: {}",
                    reservationId, e.getMessage());
            reservationMapper.updateStatus(reservationId, "FAILED", e.getMessage());
        }
    }
}