package com.bank.dto;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class AuthResponse {
    private boolean success;
    private String authToken;
    private String errorCode;
    private String message;
}