package com.fsapps.pfmg.features.salutation;

import java.util.function.Function;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.fsapps.pfmg.features.salutation.user.UserEntity;
import com.fsapps.pfmg.features.salutation.user.UserRepository;{PROJECT_ID}.features.salutation.user.UserRepository;

@Component
public class UserSalutationLogic implements Function<UserEntity, String> {

  private final UserRepository userRepository;

  @Autowired
  public UserSalutationLogic(
      UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Override
  public String apply(UserEntity user) {
    // Only query DB if user has an ID
    UserEntity dbUser = null;
    if (user.id != null) {
      dbUser = userRepository.fnUser_Get(user.id);
    }
    
    if (user != null && user.id != null && !user.id.isEmpty()) {
      if (dbUser != null) {
        user = dbUser;
      }
    }

    String name = (user != null && user.strEmail != null) ? user.strEmail : "world";
    return ("Hello, " + name + "!");
  }
}
