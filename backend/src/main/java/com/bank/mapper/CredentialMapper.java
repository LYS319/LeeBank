package com.bank.mapper;

import com.bank.dto.CredentialDto;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface CredentialMapper {
    void insert(CredentialDto credential);
    CredentialDto selectByCredentialId(String credentialId);
    void updateSignCount(CredentialDto credential);
}