package com.bank.mapper;

import com.bank.dto.MemberDto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MemberMapper {

    // 회원 ID로 회원 조회
    MemberDto selectByMemberId(@Param("memberId") String memberId);
}