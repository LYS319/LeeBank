package com.bank.mapper;

import com.bank.dto.TransactionDto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
@Mapper
public interface TransferMapper {
	
	// 거래내역 Insert
	int insertTransaction(TransactionDto transaction);
	
	// 계좌번호로 거래내역 조회
	List<TransactionDto> selectByAccountNo(@Param("accountNo") String accountNo,
										   @Param("limit") int limit);
}
