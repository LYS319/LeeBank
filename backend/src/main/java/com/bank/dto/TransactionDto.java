package com.bank.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Getter @Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionDto {
    private String transactionId;
    private String fromAccount;
    private String toAccount;
    private Long amount;
    private String txType;       // TRANSFER_IN | TRANSFER_OUT
    private String memo;
    private Long balanceAfter;
    private LocalDateTime createdAt;
}