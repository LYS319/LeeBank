package com.bank.mapper;

import com.bank.dto.TransactionDto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TransferMapper {

	// ── 기존 메서드 (TRANSACTION_LOG가 테이블이던 시절의 코드, 더 이상 호출하지 않음) ──
	// TRANSACTION_LOG가 v2.0부터 VIEW로 전환되어 더 이상 INSERT 대상이 아니다.
	// 호환을 위해 인터페이스만 남겨두고 TransferService에서는 사용하지 않는다.
	int insertTransaction(TransactionDto transaction);

	// 계좌번호로 거래내역 조회 (VIEW를 그대로 조회하므로 변경 없음)
	List<TransactionDto> selectByAccountNo(@Param("accountNo") String accountNo,
										   @Param("limit") int limit);

	// ── v2.0 입출금 원장 분리 구조 ──

	// 출금 원장 INSERT — 반환값으로 생성된 withdrawal_id를 돌려받는다 (param 객체에 채워짐)
	int insertWithdrawal(@Param("withdrawalId") String withdrawalId,
						 @Param("accountNo") String accountNo,
						 @Param("amount") Long amount,
						 @Param("balanceAfter") Long balanceAfter,
						 @Param("withdrawalType") String withdrawalType,
						 @Param("transferId") String transferId,
						 @Param("memo") String memo);

	// 입금 원장 INSERT
	int insertDeposit(@Param("depositId") String depositId,
					  @Param("accountNo") String accountNo,
					  @Param("amount") Long amount,
					  @Param("balanceAfter") Long balanceAfter,
					  @Param("depositType") String depositType,
					  @Param("transferId") String transferId,
					  @Param("memo") String memo);

	// 이체 거래 원장 INSERT — 위 출금/입금 1건씩을 연결한다
	int insertTransfer(@Param("transferId") String transferId,
					   @Param("fromAccount") String fromAccount,
					   @Param("toAccount") String toAccount,
					   @Param("amount") Long amount,
					   @Param("memo") String memo,
					   @Param("transferType") String transferType,
					   @Param("status") String status,
					   @Param("withdrawalId") String withdrawalId,
					   @Param("depositId") String depositId);

	// 채번용 시퀀스 NEXTVAL 조회
	String nextWithdrawalId();
	String nextDepositId();
	String nextTransferId();
}