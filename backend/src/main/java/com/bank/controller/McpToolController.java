package com.bank.controller;

import com.bank.dto.TransferRequest;
import com.bank.dto.TransferResponse;
import com.bank.service.TransferService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/mcp")
@RequiredArgsConstructor
public class McpToolController {

    private final TransferService transferService;

    // MCP 도구 목록 반환
    @GetMapping("/tools")
    public ResponseEntity<?> getTools() {
        return ResponseEntity.ok(Map.of(
                "tools", new String[]{
                        "immediate_transfer",
                        "schedule_transfer",
                        "get_balance",
                        "get_history"
                }
        ));
    }

    // immediate_transfer 도구 실행
    @PostMapping("/tools/immediate_transfer")
    public ResponseEntity<TransferResponse> immediateTransfer(
            @RequestBody TransferRequest request) {
        log.info("MCP immediate_transfer 호출 — from: {}, to: {}, amount: {}",
                request.getFromAccount(), request.getToAccount(), request.getAmount());
        TransferResponse response = transferService.immediateTransfer(request);
        return ResponseEntity.ok(response);
    }

    // schedule_transfer 도구 실행
    @PostMapping("/tools/schedule_transfer")
    public ResponseEntity<TransferResponse> scheduleTransfer(
            @RequestBody TransferRequest request) {
        log.info("MCP schedule_transfer 호출 — from: {}, to: {}, amount: {}",
                request.getFromAccount(), request.getToAccount(), request.getAmount());
        TransferResponse response = transferService.scheduleTransfer(request);
        return ResponseEntity.ok(response);
    }
}