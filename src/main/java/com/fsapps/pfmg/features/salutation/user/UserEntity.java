package com.fsapps.pfmg.features.salutation.user;

public class UserEntity {

  public String id;
  public String strName;
  public String strEmail;

  public UserEntity() {
  }

  public UserEntity(String id, String strName, String strEmail) {
    this.id = id;
    this.strName = strName;
    this.strEmail = strEmail;
  }
}
