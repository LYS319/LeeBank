package com.bank.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
public class ChatConfirmRequest {
    private String sessionId;
    private String authToken;
    private Map<String, Object> pendingAction;
}
