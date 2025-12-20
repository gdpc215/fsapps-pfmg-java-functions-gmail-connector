package com.fsapps.pfmg.features.salutation.user;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import com.fsapps.pfmg.utils.database.CustomRowMapper;{PROJECT_ID}.utils.database.CustomRowMapper;

@Repository
public class UserRepository {

  private final JdbcTemplate jdbcTemplate;

  public UserRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public UserEntity fnUser_Get(String userId) {
    String sql = "EXEC spUser_Get ?, ?";
    System.out.println("=== Executing DB Query ===");
    System.out.println("SQL: " + sql);
    System.out.println("userId parameter: " + userId);
    
    try {
      UserEntity result = jdbcTemplate.queryForObject(sql, CustomRowMapper.forClass(UserEntity.class), userId, null);
      System.out.println("Query Result:");
      if (result != null) {
        System.out.println("  id: " + result.id);
        System.out.println("  strName: " + result.strName);
        System.out.println("  strEmail: " + result.strEmail);
      } else {
        System.out.println("  Result is NULL");
      }
      return result;
    } catch (Exception e) {
      System.err.println("Query execution error: " + e.getMessage());
      e.printStackTrace();
      throw e;
    }
  }

  public String fnUser_Create(UserEntity entity) {
    String sql = "DECLARE @outId VARCHAR(36); EXEC spUser_Create_ReturnId ?, ?, @outId OUTPUT; SELECT @outId";
    return jdbcTemplate.queryForObject(sql, String.class,
        entity.strName,
        entity.strEmail);
  }

  public void fnUser_Update(UserEntity entity, String sessionId) {
    String sql = "EXEC spUser_Update ?, ?, ?";
    jdbcTemplate.update(sql,
        entity.id,
        entity.strName,
        entity.strEmail);
  }
}
