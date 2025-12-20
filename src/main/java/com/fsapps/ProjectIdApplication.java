package com.fsapps;

import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class PfmgApplication {
  private static final Logger logger = LoggerFactory.getLogger(PfmgApplication.class);

  public static void main(String[] args) {
    logger.info("Starting PfmgApplication...");
    SpringApplication.run(PfmgApplication.class, args);
  }
}
