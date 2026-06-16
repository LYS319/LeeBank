package com.bank.controller;

import com.bank.dto.AccountDto;
import com.bank.dto.TransactionDto;
import com.bank.mapper.AccountMapper;
import com.bank.mapper.TransferMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
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

    // 거래내역 조회
    @GetMapping("/history/{accountNo}")
    public ResponseEntity<List<TransactionDto>> getHistory(
            @PathVariable String accountNo,
            @RequestParam(defaultValue = "10") int limit) {
        List<TransactionDto> history = transferMapper.selectByAccountNo(accountNo, limit);
        return ResponseEntity.ok(history);
    }
}