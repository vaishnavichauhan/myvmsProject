-- ============================================================================
-- MYVMS: Complete Residential Society Management System Database Schema
-- Database: myVms
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `myVms`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `myVms`;

-- Disable foreign key checks during schema creation/migration
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. SOCIETIES
-- Core entity representing a residential society, gated community, or apartment complex.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `societies`;
CREATE TABLE `societies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique society code e.g. EMERALD-01',
  `registration_number` VARCHAR(100) NULL,
  `society_type` ENUM('BUNGALOW', 'FLAT') NOT NULL DEFAULT 'FLAT',
  `property_configuration` VARCHAR(50) DEFAULT '2BHK',
  `total_homes` INT NOT NULL DEFAULT 0,
  `address` TEXT NULL,
  `address_line1` VARCHAR(255) NULL,
  `address_line2` VARCHAR(255) NULL,
  `city` VARCHAR(100) NULL,
  `state` VARCHAR(100) NULL,
  `pincode` VARCHAR(20) NULL,
  `country` VARCHAR(100) NOT NULL DEFAULT 'India',
  `contact_number` VARCHAR(20) NULL,
  `emergency_number` VARCHAR(20) NULL,
  `contact_email` VARCHAR(150) NULL,
  `contact_phone` VARCHAR(20) NULL,
  `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_societies_status` (`status`),
  INDEX `idx_societies_type` (`society_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. USERS
-- Central user identity table for authentication and credentials.
-- Important: Phone number belongs to a user account, password stored as bcrypt hash.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `society_id` INT NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(150) NULL UNIQUE,
  `phone` VARCHAR(20) NOT NULL UNIQUE COMMENT 'Phone number belongs to user account',
  `password` VARCHAR(255) NOT NULL COMMENT 'Bcrypt salted hash; never plain text',
  `role` ENUM(
    'ADMIN',
    'OWNER',
    'TENANT',
    'FAMILY_MEMBER',
    'SECURITY',
    'COMMITTEE_MEMBER'
  ) NOT NULL DEFAULT 'OWNER',
  `avatar_url` VARCHAR(255) NULL,
  `flat_number` VARCHAR(50) NULL COMMENT 'Convenience reference for primary unit',
  `block_or_tower` VARCHAR(50) NULL,
  `status` ENUM('ACTIVE', 'INACTIVE', 'PENDING_APPROVAL', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_users_society` FOREIGN KEY (`society_id`) REFERENCES `societies` (`id`) ON DELETE SET NULL,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_phone` (`phone`),
  INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. HOMES
-- Residential units, flats, villas, or apartments within a society.
-- Society └── Homes
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `homes`;
CREATE TABLE `homes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `society_id` INT NOT NULL,
  `home_number` VARCHAR(50) NOT NULL COMMENT 'e.g. Home 1, Home 2, Home 100, 10, 402',
  `flat_number` VARCHAR(50) NULL COMMENT 'Alternative flat label',
  `building_or_wing` VARCHAR(50) NULL COMMENT 'Building/Wing if applicable e.g. Wing A',
  `block_or_tower` VARCHAR(50) NULL COMMENT 'Tower/Block if applicable',
  `floor` INT NULL COMMENT 'Floor number if applicable',
  `floor_number` INT NULL,
  `home_type` ENUM('1BHK', '2BHK', '3BHK', '4BHK', 'VILLA', 'BUNGALOW', 'PENTHOUSE', 'STUDIO', 'OTHER') NOT NULL DEFAULT '2BHK',
  `area_sqft` DECIMAL(10,2) NULL,
  `occupancy_status` ENUM('OCCUPIED_BY_OWNER', 'OCCUPIED_BY_TENANT', 'VACANT') NOT NULL DEFAULT 'VACANT',
  `intercom_number` VARCHAR(20) NULL,
  `status` ENUM('ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_homes_society` FOREIGN KEY (`society_id`) REFERENCES `societies` (`id`) ON DELETE CASCADE,
  INDEX `idx_homes_society` (`society_id`),
  INDEX `idx_homes_occupancy` (`occupancy_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. RESIDENTS
-- Primary resident association (Owner or Tenant) linked to a home.
-- Home └── Owner/Tenant
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `residents`;
CREATE TABLE `residents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `home_id` INT NOT NULL,
  `resident_type` ENUM('OWNER', 'TENANT') NOT NULL,
  `is_primary_contact` BOOLEAN NOT NULL DEFAULT FALSE,
  `move_in_date` DATE NOT NULL,
  `move_out_date` DATE NULL,
  `lease_expiry_date` DATE NULL COMMENT 'Applicable for tenants',
  `status` ENUM('ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_residents_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_residents_home` FOREIGN KEY (`home_id`) REFERENCES `homes` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_user_home_resident_type` (`user_id`, `home_id`, `resident_type`),
  INDEX `idx_residents_home_status` (`home_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. FAMILY_MEMBERS
-- Household family members associated with a home and primary resident.
-- Home └── Family Members
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `family_members`;
CREATE TABLE `family_members` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `home_id` INT NOT NULL,
  `resident_id` INT NOT NULL COMMENT 'Primary resident who added this family member',
  `user_id` INT NULL COMMENT 'Linked user account if family member has app access',
  `full_name` VARCHAR(120) NOT NULL,
  `relationship` VARCHAR(50) NOT NULL COMMENT 'Spouse, Son, Daughter, Mother, Father, etc.',
  `phone` VARCHAR(20) NULL,
  `is_minor` BOOLEAN NOT NULL DEFAULT FALSE,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_family_home` FOREIGN KEY (`home_id`) REFERENCES `homes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_family_resident` FOREIGN KEY (`resident_id`) REFERENCES `residents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_family_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_family_home` (`home_id`),
  INDEX `idx_family_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. WORKERS
-- Daily helpers, drivers, maids, cooks, cleaners, plumbers, electricians, etc.
-- Master table for workers: Do NOT create duplicate worker records.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `workers`;
CREATE TABLE `workers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `society_id` INT NOT NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `worker_type` ENUM(
    'DRIVER',
    'MAID',
    'COOK',
    'CLEANER',
    'GARDENER',
    'PLUMBER',
    'ELECTRICIAN',
    'CARPENTER',
    'NANNY',
    'OTHER'
  ) NOT NULL,
  `pass_code` VARCHAR(50) NULL UNIQUE COMMENT 'Unique gate RFID, badge ID, or pass code',
  `photo_url` VARCHAR(255) NULL,
  `address` VARCHAR(255) NULL,
  `government_id_type` ENUM('AADHAAR', 'VOTER_ID', 'DRIVING_LICENSE', 'PASSPORT', 'PAN') NULL,
  `government_id_number` VARCHAR(100) NULL,
  `police_verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `status` ENUM('ACTIVE', 'BLOCKED', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_workers_society` FOREIGN KEY (`society_id`) REFERENCES `societies` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_worker_society_phone` (`society_id`, `phone`),
  INDEX `idx_workers_type` (`worker_type`),
  INDEX `idx_workers_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. WORKER_HOME
-- Many-to-many relationship linking a single worker to multiple homes.
-- Example: Driver Ramesh -> Home 10, Home 25, Home 42.
-- Home └── Workers
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `worker_home`;
CREATE TABLE `worker_home` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `worker_id` INT NOT NULL,
  `home_id` INT NOT NULL,
  `assigned_by_resident_id` INT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NULL,
  `expected_time_in` TIME NULL,
  `expected_time_out` TIME NULL,
  `status` ENUM('ACTIVE', 'INACTIVE', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_worker_home_worker` FOREIGN KEY (`worker_id`) REFERENCES `workers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_worker_home_home` FOREIGN KEY (`home_id`) REFERENCES `homes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_worker_home_resident` FOREIGN KEY (`assigned_by_resident_id`) REFERENCES `residents` (`id`) ON DELETE SET NULL,
  UNIQUE KEY `uq_worker_home` (`worker_id`, `home_id`),
  INDEX `idx_worker_home_home` (`home_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. SECURITY_STAFF
-- Security personnel employed by the society.
-- Society └── Security Staff
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `security_staff`;
CREATE TABLE `security_staff` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `society_id` INT NOT NULL,
  `user_id` INT NOT NULL UNIQUE COMMENT '1-to-1 login user account for security staff',
  `badge_number` VARCHAR(50) NOT NULL,
  `employee_id` VARCHAR(50) NULL COMMENT 'Security Employee ID e.g. SEC-001',
  `agency_name` VARCHAR(150) NULL COMMENT 'Security agency name e.g. SIS, G4S',
  `shift` ENUM('MORNING', 'EVENING', 'NIGHT', 'ROTATIONAL') NOT NULL DEFAULT 'ROTATIONAL',
  `status` ENUM('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sec_staff_society` FOREIGN KEY (`society_id`) REFERENCES `societies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sec_staff_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_society_badge` (`society_id`, `badge_number`),
  INDEX `idx_sec_staff_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. GATES
-- Physical entry/exit security checkpoints and gates in a society.
-- Society └── Gates
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `gates`;
CREATE TABLE `gates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `society_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL COMMENT 'e.g. Main Gate, Gate 2, Service Gate, Parking Gate',
  `gate_number` VARCHAR(50) NULL COMMENT 'e.g. 1, 2, 3, GATE-01',
  `location` VARCHAR(150) NULL COMMENT 'e.g. Front Boulevard, North Perimeter, Parking Basement',
  `gate_type` ENUM('MAIN_ENTRY', 'RESIDENT_ONLY', 'SERVICE_DELIVERY', 'PEDESTRIAN', 'EMERGENCY_EXIT') NOT NULL DEFAULT 'MAIN_ENTRY',
  `is_automated_barrier` BOOLEAN NOT NULL DEFAULT FALSE,
  `allows_entry_registration` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Whether security guards stationed at this gate can register new entries',
  `status` ENUM('ACTIVE', 'CLOSED', 'UNDER_MAINTENANCE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_gates_society` FOREIGN KEY (`society_id`) REFERENCES `societies` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_society_gate_name` (`society_id`, `name`),
  INDEX `idx_gates_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. SECURITY_GATE
-- Duty roster and assignment of security guards to specific gates.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `security_gate`;
CREATE TABLE `security_gate` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `security_staff_id` INT NOT NULL,
  `gate_id` INT NOT NULL,
  `assigned_date` DATE NOT NULL,
  `shift` ENUM('MORNING', 'EVENING', 'NIGHT') NOT NULL,
  `check_in_time` TIMESTAMP NULL,
  `check_out_time` TIMESTAMP NULL,
  `status` ENUM('ASSIGNED', 'ON_DUTY', 'COMPLETED', 'ABSENT') NOT NULL DEFAULT 'ASSIGNED',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sec_gate_staff` FOREIGN KEY (`security_staff_id`) REFERENCES `security_staff` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sec_gate_gate` FOREIGN KEY (`gate_id`) REFERENCES `gates` (`id`) ON DELETE CASCADE,
  INDEX `idx_sec_gate_lookup` (`gate_id`, `assigned_date`, `shift`),
  INDEX `idx_sec_gate_staff_date` (`security_staff_id`, `assigned_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 11. COMMITTEES
-- Society functional committees (e.g., Festival, Electricity, Security, Water)
-- Society └── Committees
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `committees`;
CREATE TABLE `committees` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `society_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_committees_society` FOREIGN KEY (`society_id`) REFERENCES `societies` (`id`) ON DELETE CASCADE,
  INDEX `idx_committees_society_status` (`society_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 12. COMMITTEE_MEMBERS
-- Society governing body and elected committee members.
-- Society └── Committee Members
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `committee_members`;
CREATE TABLE `committee_members` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `society_id` INT NOT NULL,
  `committee_id` INT NULL,
  `committee_name` VARCHAR(150) NULL,
  `home_id` INT NULL,
  `user_id` INT NULL,
  `name` VARCHAR(150) NULL,
  `phone` VARCHAR(30) NULL,
  `designation` VARCHAR(100) NOT NULL,
  `home_number` VARCHAR(50) NULL,
  `photo_url` VARCHAR(255) NULL,
  `term_start` DATE NULL DEFAULT (CURRENT_DATE),
  `term_end` DATE NULL,
  `responsibilities` TEXT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE', 'TENURE_COMPLETED', 'RESIGNED') NOT NULL DEFAULT 'ACTIVE',
  `can_create_announcements` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_comm_society` FOREIGN KEY (`society_id`) REFERENCES `societies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comm_committee` FOREIGN KEY (`committee_id`) REFERENCES `committees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_comm_home` FOREIGN KEY (`home_id`) REFERENCES `homes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_comm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_comm_society_status` (`society_id`, `status`),
  INDEX `idx_comm_committee` (`committee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 12. ANNOUNCEMENTS
-- Official circulars, notifications, alerts published for residents.
-- Society └── Announcements
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `announcements`;
CREATE TABLE `announcements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `society_id` INT NOT NULL,
  `created_by_user_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `type` ENUM('GENERAL', 'FESTIVAL', 'EMERGENCY', 'MAINTENANCE', 'MEETING', 'IMPORTANT') NOT NULL DEFAULT 'GENERAL',
  `description` TEXT NULL,
  `date` DATE NULL DEFAULT (CURRENT_DATE),
  `content` TEXT NULL,
  `category` ENUM('GENERAL', 'MAINTENANCE', 'EVENT', 'EMERGENCY', 'BILLING', 'RULES') NOT NULL DEFAULT 'GENERAL',
  `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
  `attachment_url` VARCHAR(255) NULL,
  `valid_until` DATE NULL,
  `status` ENUM('ACTIVE', 'PUBLISHED', 'DRAFT', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ann_society` FOREIGN KEY (`society_id`) REFERENCES `societies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ann_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_ann_society_created` (`society_id`, `status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 13. RESIDENT_PERMISSIONS
-- Granular resident permissions for home management and actions.
-- Home └── Resident Permissions
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `resident_permissions`;
CREATE TABLE `resident_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `home_id` INT NOT NULL,
  `user_id` INT NULL,
  `courier_permission` BOOLEAN NOT NULL DEFAULT TRUE,
  `delivery_permission` BOOLEAN NOT NULL DEFAULT TRUE,
  `visitor_permission` BOOLEAN NOT NULL DEFAULT TRUE,
  `worker_permission` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_res_perm_home` FOREIGN KEY (`home_id`) REFERENCES `homes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_res_perm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  UNIQUE KEY `uq_home_permission` (`home_id`),
  INDEX `idx_res_perm_home` (`home_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 14. VISITORS
-- Visitor directory master table to track repeat guests, drivers, technicians.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `visitors`;
CREATE TABLE `visitors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `society_id` INT NOT NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `visitor_type` ENUM('GUEST', 'DELIVERY', 'CAB_TAXIS', 'SERVICE_TECHNICIAN', 'CONTRACTOR', 'OTHER') NOT NULL DEFAULT 'GUEST',
  `vehicle_number` VARCHAR(50) NULL,
  `photo_url` VARCHAR(255) NULL,
  `is_frequent_visitor` BOOLEAN NOT NULL DEFAULT FALSE,
  `status` ENUM('ACTIVE', 'BLACKLISTED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_visitors_society` FOREIGN KEY (`society_id`) REFERENCES `societies` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_society_visitor_phone` (`society_id`, `phone`),
  INDEX `idx_visitors_phone` (`phone`),
  INDEX `idx_visitors_vehicle` (`vehicle_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 15. VISITOR_ENTRIES
-- Specific visit logs to a home with resident approval and security verification.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `visitor_entries`;
CREATE TABLE `visitor_entries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `visitor_id` INT NOT NULL,
  `home_id` INT NOT NULL,
  `gate_id` INT NULL,
  `security_staff_id` INT NULL,
  `resident_user_id` INT NULL,
  `approved_by_user_id` INT NULL,
  `purpose` VARCHAR(255) NOT NULL,
  `entry_type` ENUM('PRE_APPROVED', 'GATE_REQUESTED') NOT NULL DEFAULT 'GATE_REQUESTED',
  `otp_code` VARCHAR(10) NULL,
  `approval_status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'AUTO_APPROVED') NOT NULL DEFAULT 'PENDING',
  `check_in_time` TIMESTAMP NULL DEFAULT NULL COMMENT 'Entry Time',
  `check_out_time` TIMESTAMP NULL DEFAULT NULL COMMENT 'Exit Time',
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'ENTERED', 'EXITED', 'INSIDE', 'CHECKED_OUT', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_vis_entry_visitor` FOREIGN KEY (`visitor_id`) REFERENCES `visitors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_vis_entry_home` FOREIGN KEY (`home_id`) REFERENCES `homes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_vis_entry_gate` FOREIGN KEY (`gate_id`) REFERENCES `gates` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_vis_entry_sec` FOREIGN KEY (`security_staff_id`) REFERENCES `security_staff` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_vis_entry_resident` FOREIGN KEY (`resident_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_vis_entry_user` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_vis_entry_home_time` (`home_id`, `check_in_time`),
  INDEX `idx_vis_entry_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 16. DELIVERIES
-- Real-time delivery logs (Amazon, Swiggy, Zomato, etc.) to homes.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `deliveries`;
CREATE TABLE `deliveries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `society_id` INT NOT NULL,
  `home_id` INT NOT NULL,
  `gate_id` INT NOT NULL,
  `security_staff_id` INT NOT NULL,
  `delivery_company` VARCHAR(100) NOT NULL COMMENT 'e.g. Amazon, Swiggy, Blinkit, Zomato',
  `delivery_person_name` VARCHAR(120) NULL,
  `delivery_person_phone` VARCHAR(20) NULL,
  `entry_code` VARCHAR(20) NULL,
  `approval_status` ENUM('PENDING', 'APPROVED', 'LEAVE_AT_GATE', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `approved_by_user_id` INT NULL,
  `check_in_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `check_out_time` TIMESTAMP NULL,
  `status` ENUM('IN_TRANSIT_INSIDE', 'DELIVERED', 'STORED_AT_GATE', 'COLLECTED_BY_RESIDENT', 'REJECTED') NOT NULL DEFAULT 'IN_TRANSIT_INSIDE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_deliv_society` FOREIGN KEY (`society_id`) REFERENCES `societies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deliv_home` FOREIGN KEY (`home_id`) REFERENCES `homes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deliv_gate` FOREIGN KEY (`gate_id`) REFERENCES `gates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deliv_sec` FOREIGN KEY (`security_staff_id`) REFERENCES `security_staff` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deliv_user` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_deliv_home_status` (`home_id`, `status`),
  INDEX `idx_deliv_company` (`delivery_company`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 17. COURIERS
-- Parcels and shipments physically accepted/held at the security gate for homes.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `couriers`;
CREATE TABLE `couriers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `society_id` INT NOT NULL,
  `home_id` INT NOT NULL,
  `gate_id` INT NOT NULL,
  `received_by_security_id` INT NOT NULL,
  `courier_company` VARCHAR(100) NOT NULL COMMENT 'e.g. BlueDart, FedEx, India Post, Delhivery',
  `tracking_number` VARCHAR(100) NULL,
  `recipient_name` VARCHAR(120) NOT NULL,
  `number_of_parcels` INT NOT NULL DEFAULT 1,
  `storage_location` VARCHAR(100) NULL COMMENT 'e.g. Shelf A-4, Locker Box 12',
  `handed_over_to_user_id` INT NULL,
  `handed_over_at` TIMESTAMP NULL,
  `status` ENUM('RECEIVED_AT_GATE', 'NOTIFIED', 'HANDED_OVER', 'RETURNED_TO_COURIER') NOT NULL DEFAULT 'RECEIVED_AT_GATE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_courier_society` FOREIGN KEY (`society_id`) REFERENCES `societies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_courier_home` FOREIGN KEY (`home_id`) REFERENCES `homes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_courier_gate` FOREIGN KEY (`gate_id`) REFERENCES `gates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_courier_sec` FOREIGN KEY (`received_by_security_id`) REFERENCES `security_staff` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_courier_user` FOREIGN KEY (`handed_over_to_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_couriers_home_status` (`home_id`, `status`),
  INDEX `idx_couriers_tracking` (`tracking_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 17B. COURIER_DELIVERIES
-- Unified Courier and Delivery Management with Permission Scoping & Gate Audit
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `courier_deliveries`;
CREATE TABLE `courier_deliveries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `society_id` INT NOT NULL,
  `home_id` INT NOT NULL,
  `gate_id` INT NULL,
  `security_staff_id` INT NULL,
  `type` ENUM('COURIER', 'DELIVERY') NOT NULL,
  `company_or_person_name` VARCHAR(150) NOT NULL COMMENT 'Person or company name (e.g. Swiggy, Amazon, BlueDart)',
  `phone` VARCHAR(25) NOT NULL,
  `vehicle_number` VARCHAR(50) NULL,
  `entry_time` TIMESTAMP NULL DEFAULT NULL,
  `exit_time` TIMESTAMP NULL DEFAULT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'ENTERED', 'EXITED') NOT NULL DEFAULT 'PENDING',
  `resident_user_id` INT NULL,
  `approved_by_user_id` INT NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_cd_society` FOREIGN KEY (`society_id`) REFERENCES `societies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cd_home` FOREIGN KEY (`home_id`) REFERENCES `homes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cd_gate` FOREIGN KEY (`gate_id`) REFERENCES `gates` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cd_sec` FOREIGN KEY (`security_staff_id`) REFERENCES `security_staff` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cd_resident` FOREIGN KEY (`resident_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cd_approver` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_cd_home_status` (`home_id`, `status`),
  INDEX `idx_cd_type` (`type`),
  INDEX `idx_cd_time` (`society_id`, `entry_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 18. GATE_ENTRIES
-- Master gate movement audit log (Residents, Visitors, Workers, Vehicles, Cabs, Couriers, Deliveries).
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `gate_entries`;
CREATE TABLE `gate_entries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `society_id` INT NOT NULL,
  `gate_id` INT NOT NULL,
  `security_staff_id` INT NULL,
  `entry_person_type` ENUM('RESIDENT', 'FAMILY_MEMBER', 'WORKER', 'VISITOR', 'DELIVERY', 'COURIER', 'STAFF', 'UNKNOWN') NOT NULL,
  `person_name` VARCHAR(120) NOT NULL,
  `person_phone` VARCHAR(20) NULL,
  `target_home_id` INT NULL,
  `vehicle_type` ENUM('NONE', 'TWO_WHEELER', 'FOUR_WHEELER', 'AUTO_TAXI', 'TRUCK_COMMERCIAL', 'OTHER') NOT NULL DEFAULT 'NONE',
  `vehicle_number` VARCHAR(50) NULL,
  `entry_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `exit_time` TIMESTAMP NULL,
  `direction` ENUM('IN', 'OUT') NOT NULL DEFAULT 'IN',
  `reference_id` INT NULL COMMENT 'Pointer to visitor_entries, deliveries, or worker_home',
  `status` ENUM('APPROVED', 'DENIED', 'AUTO_LOGGED', 'FLAGGED', 'PENDING', 'ENTERED', 'EXITED') NOT NULL DEFAULT 'APPROVED',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_gate_entries_soc` FOREIGN KEY (`society_id`) REFERENCES `societies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gate_entries_gate` FOREIGN KEY (`gate_id`) REFERENCES `gates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gate_entries_sec` FOREIGN KEY (`security_staff_id`) REFERENCES `security_staff` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_gate_entries_home` FOREIGN KEY (`target_home_id`) REFERENCES `homes` (`id`) ON DELETE SET NULL,
  INDEX `idx_gate_entries_time` (`society_id`, `entry_time`),
  INDEX `idx_gate_entries_vehicle` (`vehicle_number`),
  INDEX `idx_gate_entries_person_type` (`entry_person_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 19. NOTIFICATIONS
-- In-app and push notification alerts for residents, security, and admins.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `society_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM(
    'VISITOR_APPROVAL',
    'DELIVERY_ALERT',
    'COURIER_ARRIVAL',
    'ANNOUNCEMENT',
    'MAINTENANCE_DUE',
    'SECURITY_ALERT',
    'GENERAL'
  ) NOT NULL DEFAULT 'GENERAL',
  `reference_table` VARCHAR(50) NULL COMMENT 'e.g. visitor_entries, deliveries, announcements',
  `reference_id` INT NULL,
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `read_at` TIMESTAMP NULL,
  `status` ENUM('UNREAD', 'READ', 'ARCHIVED') NOT NULL DEFAULT 'UNREAD',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_notif_society` FOREIGN KEY (`society_id`) REFERENCES `societies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_notif_user_read` (`user_id`, `is_read`, `created_at`),
  INDEX `idx_notif_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 23. MAINTENANCE PLANS
-- Society-wide maintenance fee configurations by BHK/property type & period
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `maintenance_plans`;
CREATE TABLE `maintenance_plans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `society_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `applicable_type` ENUM('1BHK', '2BHK', '3BHK', '4BHK', 'VILLA', 'BUNGALOW', 'PENTHOUSE', 'STUDIO', 'ALL') NOT NULL DEFAULT 'ALL',
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `billing_cycle` ENUM('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY') NOT NULL DEFAULT 'MONTHLY',
  `due_day` INT NOT NULL DEFAULT 5,
  `grace_period_days` INT NOT NULL DEFAULT 5,
  `penalty_type` ENUM('FIXED', 'PERCENTAGE') NOT NULL DEFAULT 'FIXED',
  `penalty_rate` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `description` TEXT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_plan_society` FOREIGN KEY (`society_id`) REFERENCES `societies` (`id`) ON DELETE CASCADE,
  INDEX `idx_plan_society` (`society_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 24. MAINTENANCE BILLS (INVOICES)
-- Invoices issued to individual homes for maintenance periods
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `maintenance_bills`;
CREATE TABLE `maintenance_bills` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `bill_number` VARCHAR(50) NOT NULL UNIQUE,
  `society_id` INT NOT NULL,
  `home_id` INT NOT NULL,
  `resident_id` INT NULL,
  `plan_id` INT NULL,
  `title` VARCHAR(200) NOT NULL,
  `billing_period` VARCHAR(50) NOT NULL,
  `billing_cycle` ENUM('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY') NOT NULL DEFAULT 'MONTHLY',
  `base_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `penalty_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `balance_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `due_date` DATE NOT NULL,
  `status` ENUM('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_bill_society` FOREIGN KEY (`society_id`) REFERENCES `societies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bill_home` FOREIGN KEY (`home_id`) REFERENCES `homes` (`id`) ON DELETE CASCADE,
  INDEX `idx_bill_society_status` (`society_id`, `status`),
  INDEX `idx_bill_home` (`home_id`),
  INDEX `idx_bill_period` (`billing_period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 25. MAINTENANCE PAYMENTS
-- Payments recorded against maintenance bills
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `maintenance_payments`;
CREATE TABLE `maintenance_payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `receipt_number` VARCHAR(50) NOT NULL UNIQUE,
  `bill_id` INT NOT NULL,
  `society_id` INT NOT NULL,
  `home_id` INT NOT NULL,
  `paid_by_user_id` INT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `payment_method` ENUM('CASH', 'UPI', 'NET_BANKING', 'CHEQUE', 'CARD') NOT NULL DEFAULT 'UPI',
  `transaction_reference` VARCHAR(100) NULL,
  `payment_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `collected_by_user_id` INT NULL,
  `remarks` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_pay_bill` FOREIGN KEY (`bill_id`) REFERENCES `maintenance_bills` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pay_society` FOREIGN KEY (`society_id`) REFERENCES `societies` (`id`) ON DELETE CASCADE,
  INDEX `idx_pay_bill` (`bill_id`),
  INDEX `idx_pay_society` (`society_id`),
  INDEX `idx_pay_home` (`home_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

