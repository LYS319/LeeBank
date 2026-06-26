package com.bank.service;

import com.bank.dto.AccountDto;
import com.bank.dto.ReservationDto;
import com.bank.dto.TransferRequest;
import com.bank.dto.TransferResponse;
import com.bank.mapper.AccountMapper;
import com.bank.mapper.TransferMapper;
import com.bank.mapper.ReservationMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Slf4j
@Service
@RequiredArgsConstructor
public class TransferService {

	private final AccountMapper accountMapper;
	private final TransferMapper transferMapper;
	private final ReservationMapper reservationMapper;

	// =====================================
	// 즉시이체
	// =====================================
	@Transactional
	(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
	public TransferResponse immediateTransfer(TransferRequest request) {

		// 1. 출금 계좌 조회
		AccountDto fromAccount = accountMapper.selectByAccountNoForUpdate(request.getFromAccount());
		if (fromAccount == null) {
			return TransferResponse.builder()
					.success(false)
					.errorCode("ACCOUNT_NOT_FOUND")
					.message("출금 계좌를 찾을 수 없습니다.")
					.build();
		}
		// 2. 입금 계좌 조회
		AccountDto toAccount = accountMapper.selectByAccountNo(request.getToAccount());
		if (toAccount == null) {
			return TransferResponse.builder()
					.success(false)
					.errorCode("ACCOUNT_NOT_FOUND")
					.message("입금 계좌를 찾을 수 없습니다.")
					.build();
		}
		// 3. 잔액 확인
		if (fromAccount.getBalance() < request.getAmount()) {
			return TransferResponse.builder()
					.success(false)
					.errorCode("INSUFFICIENT_BALACE")
					.message("잔액이 부족합니다.")
					.build();
		}
		// 4. 출금 계좌 잔액 차감
		int deducted = accountMapper.deductBalance(request.getFromAccount(), request.getAmount());
		if (deducted == 0) {
			throw new RuntimeException("잔액 차감 실패 - Rollback");
		}
		// 5. 입금 계좌 잔액 증가
		int added = accountMapper.addBalance(request.getToAccount(), request.getAmount());
		if (added == 0) {
			throw new RuntimeException("잔액 입금 실패 - Rollback");
		}

		Long remainingBalance = fromAccount.getBalance() - request.getAmount();
		Long updatedToBalance  = toAccount.getBalance() + request.getAmount();

		// 6. 출금/입금/이체 원장 INSERT (v2.0 — 정합성을 위해 셋이 항상 같은 트랜잭션에서 생성된다)
		recordLedgerTransfer(
				request.getFromAccount(), request.getToAccount(),
				request.getAmount(), request.getMemo(),
				remainingBalance, updatedToBalance,
				"IMMEDIATE"
		);

		log.info("즉시이체 완료 - from: {}, to: {}, amount: {}",
				request.getFromAccount(), request.getToAccount(), request.getAmount());

		return TransferResponse.builder()
				.success(true)
				.remainingBalance(remainingBalance)
				.message("이체가 완료되었습니다.")
				.build();
	}
	// =============================================
    // 예약이체 등록 (선차감 Hold)
    // =============================================
	@Transactional
	public TransferResponse scheduleTransfer(TransferRequest request) {

		//1. 출금 계좌 조회
		AccountDto fromAccount = accountMapper.selectByAccountNo(request.getFromAccount());
		if (fromAccount == null) {
			return TransferResponse.builder()
					.success(false)
					.errorCode("ACCOUNT_NOT_FOUND")
					.message("출금 계좌를 찾을 수 없습니다.")
					.build();
		}
		//2. 계좌 잔액 확인 (hold_amount 포함 가용 잔액 기준)
		long availableBalance = fromAccount.getBalance() - fromAccount.getHoldAmount();
		if (availableBalance < request.getAmount()) {
			return TransferResponse.builder()
					.success(false)
					.errorCode("INSUFFICIENT_BALANCE")
					.message("에약 금액만큼의 잔액이 부족합니다.")
					.build();
		}

		// 3. 선차감 (balance 차감)
		int deducted = accountMapper.deductBalance(request.getFromAccount(),request.getAmount());
		if (deducted == 0) {
			throw new RuntimeException("선차감 실패 - Rollback");
		}

		// 4. hold_amount 증가
		int held = accountMapper.increaseHold(request.getFromAccount(), request.getAmount());
		if (held == 0) {
			throw new RuntimeException("Hold 처리 실패 - Rollback");
		}

		// 5. 예약대기 테이블 Insert
		// 주의: 이 시점에는 아직 실제로 입금이 일어나지 않았으므로
		//       WITHDRAWAL_LEDGER/DEPOSIT_LEDGER/TRANSFER에는 아무것도 기록하지 않는다.
		//       (선차감은 hold_amount로만 표현되고, 실제 거래 원장은
		//        SchedulerService가 예약을 실행하는 시점에 비로소 생성된다)
		reservationMapper.insertReservation(ReservationDto.builder()
				.fromAccount(request.getFromAccount())
				.toAccount(request.getToAccount())
				.amount(request.getAmount())
				.memo(request.getMemo())
				.scheduledAt(request.getScheduledAt())
				.build());

		long remainingBalance = fromAccount.getBalance() - request.getAmount();

		log.info("예약이체 등록 완료 - from: {}, to: {}, amount: {}, scheduledAt: {}",
				request.getFromAccount(), request.getToAccount(),
				request.getAmount(), request.getScheduledAt());

		return TransferResponse.builder()
				.success(true)
				.remainingBalance(remainingBalance)
				.scheduledAt(request.getScheduledAt())
				.message("예약이 완료되었습니다.")
				.build();
	}

	// =============================================
	// 출금/입금/이체 원장 기록 (v2.0)
	// 정합성 원칙: TRANSFER 1건 = WITHDRAWAL_LEDGER 1건 + DEPOSIT_LEDGER 1건이
	// 반드시 같은 트랜잭션 안에서 함께 생성되어야 한다.
	// 즉시이체와 예약이체 실행(SchedulerService) 양쪽에서 공통으로 사용한다.
	// =============================================
	public void recordLedgerTransfer(String fromAccount, String toAccount,
									  Long amount, String memo,
									  Long fromBalanceAfter, Long toBalanceAfter,
									  String transferType) {

		String withdrawalId = transferMapper.nextWithdrawalId();
		String depositId    = transferMapper.nextDepositId();
		String transferId   = transferMapper.nextTransferId();

		transferMapper.insertWithdrawal(
				withdrawalId, fromAccount, amount, fromBalanceAfter,
				"TRANSFER", transferId, memo
		);

		transferMapper.insertDeposit(
				depositId, toAccount, amount, toBalanceAfter,
				"TRANSFER", transferId, memo
		);

		transferMapper.insertTransfer(
				transferId, fromAccount, toAccount, amount, memo,
				transferType, "COMPLETED", withdrawalId, depositId
		);
	}
}