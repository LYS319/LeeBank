package com.bank.service;

import com.bank.security.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final EncryptionUtil encryptionUtil;

    // ── MyBatis Mapper 대신 임시 하드코딩 (추후 MemberMapper로 교체)
    // DB MEMBER 테이블의 member_id / password(SHA-256) 값과 동일하게 맞춰야 함
    private static final Map<String, String> MEMBER_PASSWORD_MAP = Map.of(
        "user001", "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"  // "123" SHA-256
    );

    /**
     * SHA-256 비밀번호 검증
     *
     * @param memberId  회원 ID
     * @param inputHash 프론트에서 넘어온 SHA-256 해시값
     * @return 검증 성공 여부
     */
    public boolean verify(String memberId, String inputHash) {
        String storedHash = MEMBER_PASSWORD_MAP.get(memberId);
        if (storedHash == null) {
            return false;
        }
        return storedHash.equalsIgnoreCase(inputHash);
    }
}