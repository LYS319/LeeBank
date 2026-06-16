package com.bank.service;

import com.bank.dto.AuthRequest;
import com.bank.dto.AuthResponse;
import com.bank.dto.MemberDto;
import com.bank.mapper.MemberMapper;
import com.bank.security.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final MemberMapper memberMapper;
    private final EncryptionUtil encryptionUtil;

    public AuthResponse verify(AuthRequest request) {

        // 1. 회원 조회
        MemberDto member = memberMapper.selectByMemberId(request.getMemberId());
        if (member == null) {
            log.warn("존재하지 않는 회원 — memberId: {}", request.getMemberId());
            return AuthResponse.builder()
                    .success(false)
                    .errorCode("MEMBER_NOT_FOUND")
                    .message("존재하지 않는 회원입니다.")
                    .build();
        }

        // 2. 비밀번호 검증
        // 입력받은 비밀번호를 SHA-256 해시 후 DB 저장값과 비교
        String hashedInput = encryptionUtil.sha256(request.getPassword());
        if (!hashedInput.equals(member.getPassword())) {
            log.warn("비밀번호 불일치 — memberId: {}", request.getMemberId());
            return AuthResponse.builder()
                    .success(false)
                    .errorCode("INVALID_CREDENTIALS")
                    .message("비밀번호가 일치하지 않습니다.")
                    .build();
        }

        // 3. 인증 성공 — 세션 토큰 발급
        // 실제 운영에서는 JWT를 사용하지만 현 프로젝트는
        // 단순 SHA-256 토큰으로 세션 식별
        String authToken = encryptionUtil.sha256(request.getMemberId() + System.currentTimeMillis());

        log.info("인증 성공 — memberId: {}", request.getMemberId());
        return AuthResponse.builder()
                .success(true)
                .authToken(authToken)
                .message("인증이 완료되었습니다.")
                .build();
    }
}