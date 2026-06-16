package com.bank.service;

import com.bank.dto.AccountDto;
import com.bank.dto.ReservationDto;
import com.bank.dto.TransactionDto;
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
	public TransferResponse immediateTransfer(TransferRequest request) {
		
		// 1. 출금 계좌 조회
		AccountDto fromAccount = accountMapper.selectByAccountNo(request.getFromAccount());
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
		// 6. 출금 거래내역 Insert
		Long remainingBalance = fromAccount.getBalance() - request.getAmount();
		
		transferMapper.insertTransaction(TransactionDto.builder()
				.fromAccount(request.getFromAccount())
				.toAccount(request.getToAccount())
				.amount(request.getAmount())
				.txType("TRANSFER_OUT")
				.memo(request.getMemo())
				.balanceAfter(remainingBalance)
				.build());
		
		// 7. 입금 거래내역 Insert
		transferMapper.insertTransaction(TransactionDto.builder()
				.fromAccount(request.getFromAccount())
				.toAccount(request.getToAccount())
				.amount(request.getAmount())
				.txType("TRANSFER_IN")
				.memo(request.getMemo())
				.balanceAfter(toAccount.getBalance() + request.getAmount())
				.build());
		
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
}
