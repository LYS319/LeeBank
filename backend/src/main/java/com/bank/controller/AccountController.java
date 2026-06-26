package com.bank.controller;

import com.bank.dto.AccountDto;
import com.bank.dto.TransactionDto;
import com.bank.mapper.AccountMapper;
import com.bank.mapper.TransferMapper;
import com.bank.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
public class AccountController {

    private final AccountMapper accountMapper;
    private final TransferMapper transferMapper;
    // 계좌 생성 공통 로직(createAccountFor)을 회원가입과 공유하기 위해 AuthService를 사용한다.
    private final AuthService authService;

    // 계좌 조회
    @GetMapping("/{accountNo}")
    public ResponseEntity<?> getAccount(@PathVariable String accountNo) {
        AccountDto account = accountMapper.selectByAccountNo(accountNo);
        if (account == null) {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "errorCode", "ACCOUNT_NOT_FOUND",
                    "message", "존재하지 않는 계좌번호입니다."
            ));
        }
        return ResponseEntity.ok(account);
    }

    // 회원ID로 보유한 모든 계좌 목록 조회 (로그인 후 계좌 선택/전환에 사용)
    // v2.1부터 한 회원이 여러 계좌를 가질 수 있으므로 배열로 반환한다.
    @GetMapping("/by-member/{memberId}")
    public ResponseEntity<?> getAccountsByMember(@PathVariable String memberId) {
        List<AccountDto> accounts = accountMapper.selectAllByMemberId(memberId);
        if (accounts.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "errorCode", "ACCOUNT_NOT_FOUND",
                    "message", "해당 회원의 계좌를 찾을 수 없습니다."
            ));
        }
        return ResponseEntity.ok(accounts);
    }

    // 계좌 추가 개설 — 이미 가입된 회원이 새 입출금 계좌를 하나 더 만든다.
    // 회원가입 때 첫 계좌를 만드는 로직(AuthService.createAccountFor)을 그대로 재사용한다.
    @PostMapping("/open")
    @Transactional
    public ResponseEntity<?> openAccount(@RequestBody Map<String, String> body) {
        String memberId = body.get("memberId");
        if (memberId == null || memberId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "errorCode", "MISSING_MEMBER_ID",
                    "message", "memberId는 필수입니다."
            ));
        }

        String accountNo = authService.createAccountFor(memberId);
        log.info("계좌 추가 개설 완료 — memberId: {}, accountNo: {}", memberId, accountNo);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "accountNo", accountNo,
                "message", "새 계좌가 개설되었습니다."
        ));
    }

    // 거래내역 조회
    @GetMapping("/history/{accountNo}")
    public ResponseEntity<List<TransactionDto>> getHistory(
            @PathVariable String accountNo,
            @RequestParam(defaultValue = "10") int limit) {
        List<TransactionDto> history = transferMapper.selectByAccountNo(accountNo, limit);
        return ResponseEntity.ok(history);
    }
}