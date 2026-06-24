package com.bank.controller;

import com.bank.dto.ReservationDto;
import com.bank.mapper.ReservationMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/reservation")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationMapper reservationMapper;

    // 계좌의 예약이체 목록 조회 (대기중/완료/실패 상태 모두 포함)
    // 거래내역 화면의 "예약 이체" 탭에서 사용한다.
    @GetMapping("/{accountNo}")
    public ResponseEntity<List<ReservationDto>> getReservations(
            @PathVariable String accountNo,
            @RequestParam(defaultValue = "20") int limit) {
        List<ReservationDto> reservations = reservationMapper.selectByAccountNo(accountNo, limit);
        return ResponseEntity.ok(reservations);
    }
}