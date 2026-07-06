package com.bank.mapper;

import com.bank.dto.MasterAccountDto;
import com.bank.dto.MasterTransactionDto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface MasterMapper {
    List<MasterAccountDto> selectAllAccounts();

    List<MasterTransactionDto> selectAllTransactions(@Param("limit") int limit);

    String selectPasswordHash(@Param("adminId") String adminId);

    int updateLastLoginAt(@Param("adminId") String adminId);
}
