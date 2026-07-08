package com.bank.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MasterDepositRequest {

    @NotBlank(message = "Account number is required.")
    private String accountNo;

    @NotNull(message = "Amount is required.")
    @Min(value = 1, message = "Amount must be at least 1.")
    private Long amount;

    private String memo;
}
