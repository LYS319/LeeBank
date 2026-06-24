package com.bank.mapper;

import com.bank.dto.ReservationDto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ReservationMapper {

    // 예약이체 등록
    int insertReservation(ReservationDto reservation);

    // 실행 대기 중인 예약 조회 (Scheduler용)
    List<ReservationDto> selectPendingReservations();

    // 예약 상태 업데이트 (PENDING → COMPLETED / FAILED)
    int updateStatus(@Param("reservationId") String reservationId,
                     @Param("status") String status,
                     @Param("failReason") String failReason);

    // 계좌의 예약이체 목록 조회 — 본인이 보낸 건 + 받을 건 모두 포함, 최신순
    // (거래내역 화면의 "예약 이체" 탭에서 사용)
    List<ReservationDto> selectByAccountNo(@Param("accountNo") String accountNo,
                                           @Param("limit") int limit);
}