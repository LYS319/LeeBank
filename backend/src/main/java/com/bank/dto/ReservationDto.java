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
public class ReservationDto {
    private String reservationId;
    private String fromAccount;
    private String toAccount;
    private Long amount;
    private String memo;
    private String scheduledAt;
    private String status;          // PENDING | COMPLETED | FAILED | CANCELLED
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private String failReason;
}