package com.bank.controller;

import com.bank.dto.TransferRequest;
import com.bank.dto.TransferResponse;
import com.bank.service.TransferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/transfer")
@RequiredArgsConstructor
public class TransferController {

    private final TransferService transferService;

    // 즉시이체
    @PostMapping("/immediate")
    public ResponseEntity<TransferResponse> immediate(@Valid @RequestBody TransferRequest request) {
        log.info("즉시이체 요청 — from: {}, to: {}, amount: {}",
                request.getFromAccount(), request.getToAccount(), request.getAmount());
        TransferResponse response = transferService.immediateTransfer(request);
        return ResponseEntity.ok(response);
    }

    // 예약이체
    @PostMapping("/schedule")
    public ResponseEntity<TransferResponse> schedule(@Valid @RequestBody TransferRequest request) {
        log.info("예약이체 요청 — from: {}, to: {}, amount: {}, scheduledAt: {}",
                request.getFromAccount(), request.getToAccount(),
                request.getAmount(), request.getScheduledAt());
        TransferResponse response = transferService.scheduleTransfer(request);
        return ResponseEntity.ok(response);
    }
}