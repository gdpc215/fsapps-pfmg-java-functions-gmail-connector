package com.fsapps.pfmg.utils.database;

import java.lang.reflect.Field;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.UUID;

import javax.swing.tree.RowMapper;

import org.springframework.lang.NonNull;

/**
 * Custom RowMapper that maps ResultSet columns to entity fields
 * Supports UUID to String conversion and direct field mapping (no setters
 * required)
 */
public class CustomRowMapper<T> implements RowMapper<T> {

  private final Class<T> mappedClass;

  public CustomRowMapper(Class<T> mappedClass) {
    this.mappedClass = mappedClass;
  }

  @Override
  public T mapRow(@NonNull ResultSet rs, int rowNum) throws SQLException {
    try {
      T instance = mappedClass.getDeclaredConstructor().newInstance();
      ResultSetMetaData metaData = rs.getMetaData();
      int columnCount = metaData.getColumnCount();

      for (int i = 1; i <= columnCount; i++) {
        String columnName = metaData.getColumnName(i);
        Object value = rs.getObject(i);

        try {
          Field field = mappedClass.getField(columnName);

          if (value != null) {
            // Handle UUID to String conversion
            if (value instanceof UUID && field.getType().equals(String.class)) {
              value = value.toString();
            }
            // Handle SQL Timestamp to LocalDateTime
            if (value instanceof java.sql.Timestamp && field.getType().equals(LocalDateTime.class)) {
              value = ((java.sql.Timestamp) value).toLocalDateTime();
            }
            // Handle SQL Decimal to Number types
            if (value instanceof java.math.BigDecimal) {
              java.math.BigDecimal decimal = (java.math.BigDecimal) value;
              Class<?> fieldType = field.getType();

              if (fieldType.equals(Double.class) || fieldType.equals(double.class)) {
                value = decimal.doubleValue();
              } else if (fieldType.equals(Float.class) || fieldType.equals(float.class)) {
                value = decimal.floatValue();
              } else if (fieldType.equals(Integer.class) || fieldType.equals(int.class)) {
                value = decimal.intValue();
              } else if (fieldType.equals(Long.class) || fieldType.equals(long.class)) {
                value = decimal.longValue();
              }
            }

            field.set(instance, value);
          }
        } catch (NoSuchFieldException e) {
          // Field doesn't exist in entity - skip it (e.g., computed columns)
        }
      }

      return instance;
    } catch (Exception e) {
      throw new SQLException("Failed to map row to " + mappedClass.getName(), e);
    }
  }

  /**
   * Factory method for convenient usage
   */
  @NonNull
  public static <T> CustomRowMapper<T> forClass(@NonNull Class<T> mappedClass) {
    return new CustomRowMapper<>(mappedClass);
  }
}
