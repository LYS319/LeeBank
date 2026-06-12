package com.bank.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TransferResponse {
    private boolean success;
    private String transactionId;
    private String reservationId;
    private Long remainingBalance;
    private String scheduledAt;
    private String completedAt;
    private String errorCode;
    private String message;
}
