package com.demo.upimesh.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DriverManager;

@Configuration
public class DataSourceConfig {

    private static final Logger log = LoggerFactory.getLogger(DataSourceConfig.class);

    @Value("${spring.datasource.url}")
    private String pgUrl;

    @Value("${spring.datasource.username}")
    private String pgUsername;

    @Value("${spring.datasource.password}")
    private String pgPassword;

    @Value("${spring.datasource.driver-class-name}")
    private String pgDriver;

    @Bean
    @Primary
    public DataSource dataSource() {
        log.info("Checking PostgreSQL database connection availability at {}...", pgUrl);
        try {
            Class.forName(pgDriver);
            DriverManager.setLoginTimeout(2);
            try (Connection conn = DriverManager.getConnection(pgUrl, pgUsername, pgPassword)) {
                log.info("Successfully connected to PostgreSQL database! Using PostgreSQL.");
                return DataSourceBuilder.create()
                        .url(pgUrl)
                        .username(pgUsername)
                        .password(pgPassword)
                        .driverClassName(pgDriver)
                        .build();
            }
        } catch (Exception e) {
            log.warn("PostgreSQL connection failed. Falling back to in-memory H2 database: {}", e.getMessage());
            return DataSourceBuilder.create()
                    .url("jdbc:h2:mem:upimesh;DB_CLOSE_DELAY=-1;MODE=PostgreSQL")
                    .username("sa")
                    .password("")
                    .driverClassName("org.h2.Driver")
                    .build();
        }
    }
}
