package com.bank.mapper;

import com.bank.dto.AccountDto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface AccountMapper {

    // 계좌번호로 계좌 조회
    AccountDto selectByAccountNo(@Param("accountNo") String accountNo);

    // 회원ID로 계좌 조회 (해당 회원의 가장 오래된 계좌 1건)
    // v2.1부터는 여러 계좌를 지원하므로 신규 코드에서는 selectAllByMemberId를 사용한다.
    // 다른 곳에서 이미 이 메서드를 참조 중일 수 있어 호환을 위해 남겨둔다.
    AccountDto selectByMemberId(@Param("memberId") String memberId);

    // 회원ID로 보유한 모든 계좌 목록 조회 (개설일 오래된 순)
    // 로그인 시 "이 회원이 가진 계좌들" 전체를 보여줄 때 사용한다.
    List<AccountDto> selectAllByMemberId(@Param("memberId") String memberId);

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

    // 계좌번호 채번용 시퀀스 다음 값 조회 (회원가입 시 / 계좌 추가개설 시 공통 사용)
    Long nextAccountSeq();

    // 신규 계좌 INSERT (회원가입 시 + 추가 계좌개설 시 공통 사용)
    int insert(AccountDto account);
}