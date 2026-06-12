package com.bank.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TransferRequest {

    @NotBlank(message = "From account is required.")
    private String fromAccount;

    @NotBlank(message = "To account is required.")
    private String toAccount;

    @NotNull
    @Min(value = 1, message = "Transfer amount must be at least 1.")
    private Long amount;

    private String memo;

    @NotBlank(message = "Auth token is required.")
    private String authToken;

    private String scheduledAt;
}
