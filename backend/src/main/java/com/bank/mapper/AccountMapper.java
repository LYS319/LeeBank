package com.bank.mapper;

import com.bank.dto.AccountDto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AccountMapper {

    // 계좌번호로 계좌 조회
    AccountDto selectByAccountNo(@Param("accountNo") String accountNo);

    // 잔액 차감 (즉시이체 / 예약이체 선차감)
    int deductBalance(@Param("accountNo") String accountNo,
                      @Param("amount") Long amount);

    // 잔액 입금
    int addBalance(@Param("accountNo") String accountNo,
                   @Param("amount") Long amount);

    // hold_amount 증가 (예약이체 선차감 시)
    int increaseHold(@Param("accountNo") String accountNo,
                     @Param("amount") Long amount);

    // hold_amount 감소 (예약이체 실행 완료 시)
    int decreaseHold(@Param("accountNo") String accountNo,
                     @Param("amount") Long amount);
}