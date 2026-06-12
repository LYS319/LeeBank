package com.bank.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class SchedulerService {

    @Scheduled(fixedDelay = 60000)
    public void runReservationBatch() {
    }
}
