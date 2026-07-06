package com.bank.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class MasterAccountDto {
    private String accountNo;
    private String memberId;
    private String ownerName;
    private String bankCode;
    private String bankName;
    private Long balance;
    private Long holdAmount;
    private String accountStatus;
    private LocalDateTime createdAt;
}
