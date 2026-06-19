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
}