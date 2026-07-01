package com.bank.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class CredentialDto {
    private String credentialId;
    private String memberId;
    private byte[] publicKeyCose;   // AttestedCredentialData 직렬화 바이트 (Java Serialization)
    private long signCount;
    private String aaguid;
    private LocalDateTime createdAt;
}