package com.bank.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class AccountDto {
    private String accountNo;
    private String memberId;
    private String bankCode;
    private Long balance;
    private Long holdAmount;
    private String accountStatus;
}