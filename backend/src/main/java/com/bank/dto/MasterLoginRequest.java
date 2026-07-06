package com.bank.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MasterLoginRequest {

    @NotBlank(message = "Admin ID is required.")
    private String adminId;

    @NotBlank(message = "Password is required.")
    private String password;
}
