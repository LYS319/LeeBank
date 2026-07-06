package com.bank.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class MasterTransactionDto {
    private String transactionId;
    private String txType;
    private String fromAccount;
    private String toAccount;
    private Long amount;
    private String memo;
    private Long balanceAfter;
    private LocalDateTime createdAt;
    private String transferId;
    private String transferType;
    private String status;
}
