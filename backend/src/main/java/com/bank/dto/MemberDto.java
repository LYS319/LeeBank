package com.bank.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class MemberDto {
    private String memberId;
    private String name;
    private String password;  // SHA-256 해시값
    private String phone;     // AES-256 암호화값
}