package com.bank.mapper;

import com.bank.dto.MemberDto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MemberMapper {

    // 회원 ID로 회원 조회
    MemberDto selectByMemberId(@Param("memberId") String memberId);

    // 아이디 중복 체크용 — 존재하는 회원 수 반환 (0이면 사용 가능)
    int countByMemberId(@Param("memberId") String memberId);

    // 회원가입 — 신규 회원 INSERT
    int insert(MemberDto member);
}