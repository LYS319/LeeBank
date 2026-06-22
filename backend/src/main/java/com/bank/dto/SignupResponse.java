package com.bank.dto;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class SignupResponse {
    private boolean success;
    private String memberId;
    private String accountNo;     // 발급된 계좌번호
    private String errorCode;
    private String message;
}