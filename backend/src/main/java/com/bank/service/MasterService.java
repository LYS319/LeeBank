package com.bank.service;

import com.bank.dto.AccountDto;
import com.bank.dto.MasterAccountDto;
import com.bank.dto.MasterDepositRequest;
import com.bank.dto.MasterLoginRequest;
import com.bank.dto.MasterTransactionDto;
import com.bank.mapper.AccountMapper;
import com.bank.mapper.MasterMapper;
import com.bank.mapper.TransferMapper;
import com.bank.security.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class MasterService {

    private final MasterMapper masterMapper;
    private final AccountMapper accountMapper;
    private final TransferMapper transferMapper;
    private final EncryptionUtil encryptionUtil;

    private final Map<String, String> tokenStore = new ConcurrentHashMap<>();

    public Map<String, Object> login(MasterLoginRequest request) {
        String storedHash = masterMapper.selectPasswordHash(request.getAdminId());
        String inputHash = encryptionUtil.sha256(request.getPassword());

        if (storedHash == null || !storedHash.equals(inputHash)) {
            throw new IllegalArgumentException("Invalid admin credentials.");
        }

        String token = UUID.randomUUID().toString();
        tokenStore.put(token, request.getAdminId());
        masterMapper.updateLastLoginAt(request.getAdminId());

        return Map.of(
                "success", true,
                "adminId", request.getAdminId(),
                "masterToken", token
        );
    }

    public boolean isValidToken(String token) {
        return token != null && !token.isBlank() && tokenStore.containsKey(token);
    }

    public List<MasterAccountDto> getAccounts() {
        return masterMapper.selectAllAccounts();
    }

    public List<MasterTransactionDto> getTransactions(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 200));
        return masterMapper.selectAllTransactions(safeLimit);
    }

    @Transactional
    public Map<String, Object> deposit(MasterDepositRequest request) {
        AccountDto account = accountMapper.selectByAccountNoForUpdate(request.getAccountNo());
        if (account == null) {
            throw new IllegalArgumentException("Account not found.");
        }

        int updated = accountMapper.addBalance(request.getAccountNo(), request.getAmount());
        if (updated == 0) {
            throw new IllegalStateException("Deposit failed.");
        }

        long balanceAfter = account.getBalance() + request.getAmount();
        String depositId = transferMapper.nextDepositId();
        String memo = request.getMemo() == null || request.getMemo().isBlank()
                ? "Master deposit"
                : request.getMemo();

        transferMapper.insertDeposit(
                depositId,
                request.getAccountNo(),
                request.getAmount(),
                balanceAfter,
                "DEPOSIT",
                null,
                memo
        );

        return Map.of(
                "success", true,
                "transactionId", depositId,
                "accountNo", request.getAccountNo(),
                "amount", request.getAmount(),
                "balanceAfter", balanceAfter
        );
    }
}
