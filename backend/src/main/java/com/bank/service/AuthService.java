package com.bank.service;

import com.bank.dto.AccountDto;
import com.bank.dto.AuthRequest;
import com.bank.dto.AuthResponse;
import com.bank.dto.MemberDto;
import com.bank.dto.SignupRequest;
import com.bank.dto.SignupResponse;
import com.bank.mapper.AccountMapper;
import com.bank.mapper.MemberMapper;
import com.bank.security.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final MemberMapper memberMapper;
    private final AccountMapper accountMapper;
    private final EncryptionUtil encryptionUtil;

    // LeeBank 자체 발급 계좌의 은행 코드 (db/schema.sql v1.1 참고)
    private static final String LEEBANK_BANK_CODE = "999";

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
        String authToken = encryptionUtil.sha256(request.getMemberId() + System.currentTimeMillis());

        log.info("인증 성공 — memberId: {}", request.getMemberId());
        return AuthResponse.builder()
                .success(true)
                .authToken(authToken)
                .message("인증이 완료되었습니다.")
                .build();
    }

    /**
     * 아이디 중복 체크
     * @return true면 사용 가능(중복 없음), false면 이미 사용 중
     */
    public boolean isIdAvailable(String memberId) {
        int count = memberMapper.countByMemberId(memberId);
        return count == 0;
    }

    /**
     * 회원가입 + 계좌개설(첫 계좌)
     * 회원 INSERT와 계좌 INSERT를 하나의 트랜잭션으로 묶는다.
     * 둘 중 하나라도 실패하면 전체 롤백되어, "회원은 만들어졌는데 계좌가 없는" 상황을 방지한다.
     */
    @Transactional
    public SignupResponse signup(SignupRequest request) {

        // 1. 아이디 중복 재검증 (프론트에서 중복확인을 거쳤어도 동시 가입 레이스 컨디션 방지)
        if (!isIdAvailable(request.getMemberId())) {
            log.warn("회원가입 실패 — 이미 존재하는 아이디: {}", request.getMemberId());
            return SignupResponse.builder()
                    .success(false)
                    .errorCode("DUPLICATE_ID")
                    .message("이미 사용 중인 아이디입니다.")
                    .build();
        }

        // 2. 회원 INSERT — password는 SHA-256, phone은 AES-256 암호화
        MemberDto member = new MemberDto();
        member.setMemberId(request.getMemberId());
        member.setName(request.getName());
        member.setPassword(encryptionUtil.sha256(request.getPassword()));
        member.setPhone(encryptionUtil.encrypt(request.getPhone()));
        memberMapper.insert(member);

        // 3. 계좌 생성 (회원가입 시 첫 계좌) — createAccountFor를 공통으로 재사용
        String accountNo = createAccountFor(request.getMemberId());

        log.info("회원가입 + 계좌개설 완료 — memberId: {}, accountNo: {}", request.getMemberId(), accountNo);

        return SignupResponse.builder()
                .success(true)
                .memberId(request.getMemberId())
                .accountNo(accountNo)
                .message("회원가입이 완료되었습니다.")
                .build();
    }

    /**
     * 계좌 생성 공통 로직 — 회원가입 시 첫 계좌, 추가 계좌개설 시 모두 이 메서드를 사용한다.
     * 계좌번호는 999-100-XXXXXX 형식으로, 시퀀스(SEQ_ACCOUNT_NO)를 통해 중복 없이 채번된다.
     * 호출하는 쪽(signup, AccountController.openAccount)이 트랜잭션을 가지고 있어야 한다.
     */
    public String createAccountFor(String memberId) {
        Long seq = accountMapper.nextAccountSeq();
        String accountNo = LEEBANK_BANK_CODE + "-100-" + String.format("%06d", seq);

        AccountDto account = new AccountDto();
        account.setAccountNo(accountNo);
        account.setMemberId(memberId);
        account.setBankCode(LEEBANK_BANK_CODE);
        accountMapper.insert(account);

        return accountNo;
    }
}