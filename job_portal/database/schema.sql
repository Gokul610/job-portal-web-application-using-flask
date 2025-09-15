
CREATE DATABASE IF NOT EXISTS `job_portal_db1` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `job_portal_db1`;

CREATE TABLE IF NOT EXISTS `Users` (
  `user_id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `user_type` INT NOT NULL COMMENT '1=Admin, 2=Employer, 3=Job Seeker',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC) VISIBLE)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `JobSeekerProfiles` (
  `profile_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `first_name` VARCHAR(255) NULL,
  `last_name` VARCHAR(255) NULL,
  `date_of_birth` DATE NULL,
  `educational_qualification` TEXT NULL,
  `resume_url` VARCHAR(255) NULL,
  `skills` TEXT NULL,
  PRIMARY KEY (`profile_id`),
  UNIQUE INDEX `user_id_UNIQUE` (`user_id` ASC) VISIBLE,
  CONSTRAINT `fk_jobseeker_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `Users` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `EmployerProfiles` (
  `profile_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `contact_first_name` VARCHAR(255) NULL,
  `contact_last_name` VARCHAR(255) NULL,
  `company_name` VARCHAR(255) NULL,
  `company_website` VARCHAR(255) NULL,
  `company_description` TEXT NULL,
  PRIMARY KEY (`profile_id`),
  UNIQUE INDEX `user_id_UNIQUE` (`user_id` ASC) VISIBLE,
  CONSTRAINT `fk_employer_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `Users` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `Jobs` (
  `job_id` INT NOT NULL AUTO_INCREMENT,
  `employer_id` INT NOT NULL,
  `job_title` VARCHAR(255) NOT NULL,
  `location` VARCHAR(255) NULL,
  `description` TEXT NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'pending' COMMENT 'e.g., \'pending\', \'approved\', \'rejected\'',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`job_id`),
  INDEX `fk_job_employer_idx` (`employer_id` ASC) VISIBLE,
  CONSTRAINT `fk_job_employer`
    FOREIGN KEY (`employer_id`)
    REFERENCES `Users` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `Applications` (
  `application_id` INT NOT NULL AUTO_INCREMENT,
  `job_id` INT NOT NULL,
  `job_seeker_id` INT NOT NULL,
  `application_date` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(50) NOT NULL DEFAULT 'submitted' COMMENT 'e.g., \'submitted\', \'viewed\', \'shortlisted\'',
  PRIMARY KEY (`application_id`),
  INDEX `fk_app_job_idx` (`job_id` ASC) VISIBLE,
  INDEX `fk_app_jobseeker_idx` (`job_seeker_id` ASC) VISIBLE,
  CONSTRAINT `fk_app_job`
    FOREIGN KEY (`job_id`)
    REFERENCES `Jobs` (`job_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_app_jobseeker`
    FOREIGN KEY (`job_seeker_id`)
    REFERENCES `Users` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;
ALTER TABLE `JobSeekerProfiles`
ADD COLUMN `phone_number` VARCHAR(20) NULL AFTER `last_name`,
ADD COLUMN `gender` ENUM('Male', 'Female', 'Other') NULL AFTER `date_of_birth`,
ADD COLUMN `preferred_location` VARCHAR(255) NULL AFTER `skills`;

ALTER TABLE `EmployerProfiles`
ADD COLUMN `company_location` VARCHAR(255) NULL AFTER `company_name`;


ALTER TABLE `Jobs`
ADD COLUMN `job_type` ENUM('Full-time', 'Part-time', 'Remote', 'Onsite') NULL AFTER `location`,
ADD COLUMN `salary_range` VARCHAR(255) NULL AFTER `job_type`,
ADD COLUMN `openings` INT NULL COMMENT 'Number of openings' AFTER `salary_range`,
ADD COLUMN `education_required` TEXT NULL AFTER `openings`,
ADD COLUMN `skills_required` TEXT NULL AFTER `education_required`,
ADD COLUMN `application_deadline` DATE NULL AFTER `created_at`;

ALTER TABLE `Applications`
ADD COLUMN `expected_salary` VARCHAR(255) NULL AFTER `status`;


CREATE TABLE IF NOT EXISTS `JobSeekerPreferences` (
  `preference_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `preferred_job_role` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`preference_id`),
  INDEX `fk_preference_user_idx` (`user_id` ASC) VISIBLE,
  CONSTRAINT `fk_jobseeker_preference_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `Users` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB
COMMENT = 'Stores one preferred job role per row for a job seeker.';


/*CREATE TABLE IF NOT EXISTS `TokenBlacklist` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `jti` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `jti_UNIQUE` (`jti` ASC) VISIBLE)
ENGINE = InnoDB;*/

ALTER TABLE `Users` ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE Users
ADD COLUMN status_flag VARCHAR(20) NOT NULL DEFAULT 'pending';
UPDATE Users SET status_flag = 'active' WHERE user_id > 0;

CREATE TABLE company_employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    employee_name VARCHAR(255)
);