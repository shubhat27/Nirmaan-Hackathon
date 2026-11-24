CREATE DATABASE IF NOT EXISTS nirmaan_hackathon
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nirmaan_hackathon;

CREATE TABLE IF NOT EXISTS student_registrations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  registration_id VARCHAR(32) NOT NULL,
  student_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone_number VARCHAR(24) NOT NULL,
  usn VARCHAR(40) NOT NULL,
  department VARCHAR(100) NOT NULL,
  college_name VARCHAR(180) NOT NULL,
  project_title VARCHAR(160) NOT NULL,
  project_description TEXT NOT NULL,
  technologies_used VARCHAR(500) NOT NULL,
  github_url VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_registrations_registration_id UNIQUE (registration_id),
  CONSTRAINT uq_registrations_email UNIQUE (email),
  CONSTRAINT uq_registrations_usn UNIQUE (usn),
  KEY idx_registrations_student_name (student_name),
  KEY idx_registrations_college_name (college_name),
  KEY idx_registrations_department (department)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_admin_users_username UNIQUE (username)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
