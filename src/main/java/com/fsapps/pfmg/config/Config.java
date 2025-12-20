package com.fsapps.pfmg.config;

import java.util.function.Function;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fsapps.pfmg.features.salutation.UserSalutationLogic;
import com.fsapps.pfmg.features.salutation.user.UserEntity;{PROJECT_ID}.features.salutation.user.UserEntity;

@Configuration
public class Config {

  // Simple test functions
  @Bean
  public Function<String, String> echo() {
    return payload -> payload;
  }

  @Bean
  public Function<String, String> uppercase() {
    return payload -> payload.toUpperCase();
  }

  // Your business function
  @Bean
  public Function<UserEntity, String> userSalutation(UserSalutationLogic logic) {
    return logic;
  }
}
