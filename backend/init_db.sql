-- ARIA Voice Agent Database Initialization Script
-- Run this script to set up the MySQL database

-- Create database
CREATE DATABASE IF NOT EXISTS aria_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE aria_crm;

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS compliance_logs;
DROP TABLE IF EXISTS call_logs;
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS plots;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS lead_stages;
DROP TABLE IF EXISTS lead_statuses;
DROP TABLE IF EXISTS platforms;

-- Create platforms table
CREATE TABLE platforms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(255),
    icon VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create lead_stages table
CREATE TABLE lead_stages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(255),
    order_index INT DEFAULT 0,
    color VARCHAR(20) DEFAULT '#6B7280',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create lead_statuses table
CREATE TABLE lead_statuses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(255),
    color VARCHAR(20) DEFAULT '#6B7280',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('admin', 'manager', 'sales_rep', 'compliance') DEFAULT 'sales_rep',
    is_active BOOLEAN DEFAULT TRUE,
    is_on_leave BOOLEAN DEFAULT FALSE,
    phone VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create plots table
CREATE TABLE plots (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    plot_number VARCHAR(50),
    property_type VARCHAR(50),
    area_sqft INT,
    price DECIMAL(12, 2),
    location VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(100),
    description TEXT,
    amenities TEXT,
    status VARCHAR(50) DEFAULT 'available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create leads table (matching the user's schema)
CREATE TABLE leads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    platformId INT,
    assignedTo INT,
    plotId INT,
    leadStatusId INT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    city VARCHAR(100),
    state VARCHAR(100),
    leadStageId INT,
    tracker INT DEFAULT 0,
    interestStatus ENUM('interested', 'not interested'),
    other JSON DEFAULT (JSON_OBJECT()),

    FOREIGN KEY (platformId) REFERENCES platforms(id),
    FOREIGN KEY (assignedTo) REFERENCES users(id),
    FOREIGN KEY (plotId) REFERENCES plots(id),
    FOREIGN KEY (leadStatusId) REFERENCES lead_statuses(id),
    FOREIGN KEY (leadStageId) REFERENCES lead_stages(id),

    INDEX idx_campaign_query (leadStageId, city, interestStatus, tracker),
    INDEX idx_assignment (assignedTo, leadStatusId),
    INDEX idx_platform (platformId, createdAt)
);

-- Create campaigns table
CREATE TABLE campaigns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    status ENUM('draft', 'active', 'paused', 'completed') DEFAULT 'draft',
    filters JSON,
    daily_call_limit INT DEFAULT 500,
    calling_hours_start TIME DEFAULT '09:00:00',
    calling_hours_end TIME DEFAULT '21:00:00',
    max_attempts_per_lead INT DEFAULT 3,
    retry_interval_hours INT DEFAULT 4,
    priority VARCHAR(20) DEFAULT 'medium',
    script_id INT,
    total_leads INT DEFAULT 0,
    completed_leads INT DEFAULT 0,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Create call_logs table
CREATE TABLE call_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lead_id INT NOT NULL,
    call_id VARCHAR(100) UNIQUE,
    campaign_id INT,
    status ENUM('initiated', 'ringing', 'answered', 'completed', 'failed', 'no_answer', 'busy'),
    duration INT,
    recording_url VARCHAR(500),
    transcript_url VARCHAR(500),
    transcript_text TEXT,
    classification ENUM('cold', 'warm', 'hot'),
    sentiment_score DECIMAL(3, 2),
    call_outcome VARCHAR(100),
    call_summary VARCHAR(2000),
    started_at DATETIME,
    ended_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (lead_id) REFERENCES leads(id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    INDEX idx_lead_history (lead_id, created_at),
    INDEX idx_campaign_stats (campaign_id, classification)
);

-- Create compliance_logs table
CREATE TABLE compliance_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_type ENUM('consent_captured', 'opt_out_requested', 'dlt_check', 'time_window_violation', 'data_erasure_request', 'data_erasure_completed') NOT NULL,
    lead_id INT,
    call_id VARCHAR(100),
    details JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (lead_id) REFERENCES leads(id),
    INDEX idx_event_type (event_type, created_at),
    INDEX idx_lead_compliance (lead_id)
);

-- Insert sample data

-- Platforms
INSERT INTO platforms (name, description, icon) VALUES
('Facebook Ads', 'Leads from Facebook advertising campaigns', 'facebook'),
('Google Ads', 'Leads from Google advertising campaigns', 'google'),
('Website', 'Leads from website contact forms', 'globe'),
('Referral', 'Leads from customer referrals', 'users'),
('Walk-in', 'Leads from walk-in visitors', 'building');

-- Lead Stages
INSERT INTO lead_stages (name, description, order_index, color) VALUES
('New', 'Newly added lead, not yet contacted', 1, '#6B7280'),
('Contacted', 'Initial contact has been made', 2, '#3B82F6'),
('Qualified', 'Lead has been qualified through discovery', 3, '#F59E0B'),
('Hot Lead', 'High intent, ready for human follow-up', 4, '#EF4444'),
('Meeting Scheduled', 'Site visit or meeting scheduled', 5, '#10B981'),
('Negotiation', 'In price negotiation phase', 6, '#8B5CF6'),
('Closed Won', 'Deal completed successfully', 7, '#059669'),
('Closed Lost', 'Deal lost or lead not interested', 8, '#DC2626');

-- Lead Statuses
INSERT INTO lead_statuses (name, description, color) VALUES
('Active', 'Lead is actively being pursued', '#10B981'),
('On Hold', 'Lead is temporarily on hold', '#F59E0B'),
('Nurturing', 'Lead requires long-term nurturing', '#3B82F6'),
('Closed', 'Lead has been closed (won or lost)', '#6B7280'),
('Invalid', 'Lead information is invalid', '#DC2626');

-- Users (password is 'password123' hashed)
INSERT INTO users (email, hashed_password, full_name, role, phone) VALUES
('admin@aria.ai', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.rV.U0YfY0Y3Y3.', 'Admin User', 'admin', '+91-98765-00001'),
('manager@aria.ai', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.rV.U0YfY0Y3Y3.', 'Sales Manager', 'manager', '+91-98765-00002'),
('amit.patel@aria.ai', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.rV.U0YfY0Y3Y3.', 'Amit Patel', 'sales_rep', '+91-98765-00003'),
('ravi.singh@aria.ai', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.rV.U0YfY0Y3Y3.', 'Ravi Singh', 'sales_rep', '+91-98765-00004'),
('priya.mehta@aria.ai', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.rV.U0YfY0Y3Y3.', 'Priya Mehta', 'sales_rep', '+91-98765-00005'),
('compliance@aria.ai', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.rV.U0YfY0Y3Y3.', 'Compliance Officer', 'compliance', '+91-98765-00006');

-- Plots
INSERT INTO plots (name, plot_number, property_type, area_sqft, price, location, city, state, description, status) VALUES
('Green Valley Phase 2', '#127', 'Residential', 1200, 2450000, 'Panvel, Near Highway', 'Navi Mumbai', 'Maharashtra', 'Premium residential plot with all amenities', 'available'),
('Green Valley Phase 2', '#128', 'Residential', 1500, 3050000, 'Panvel, Near Highway', 'Navi Mumbai', 'Maharashtra', 'Corner plot with extra space', 'available'),
('Sunrise Apartments', '#A-401', 'Residential', 950, 1800000, 'Thane West', 'Thane', 'Maharashtra', '2 BHK apartment in prime location', 'available'),
('Commercial Plaza', '#G-12', 'Commercial', 2000, 5500000, 'Vashi', 'Navi Mumbai', 'Maharashtra', 'Ground floor commercial space', 'available'),
('Industrial Hub', '#I-05', 'Industrial', 5000, 12000000, 'Chakan', 'Pune', 'Maharashtra', 'Industrial land near MIDC', 'available');

-- Sample Leads
INSERT INTO leads (name, email, phone, platformId, assignedTo, plotId, leadStatusId, city, state, leadStageId, tracker, interestStatus, other) VALUES
('Rajesh Kumar', 'rajesh.kumar@email.com', '+91-98765-43210', 1, 3, 1, 1, 'Mumbai', 'Maharashtra', 4, 1, 'interested', '{"budget_min": 2000000, "budget_max": 3000000, "preferred_location": "Panvel", "property_type": "Residential", "timeline": "3 months", "intent_score": 9, "consent": {"timestamp": "2026-01-20T10:30:00Z", "source": "facebook_lead_form"}}'),
('Priya Sharma', 'priya.sharma@email.com', '+91-91234-56789', 3, 4, 3, 1, 'Pune', 'Maharashtra', 3, 2, 'interested', '{"budget_min": 1500000, "budget_max": 2000000, "preferred_location": "Thane", "property_type": "Residential", "timeline": "6 months", "intent_score": 7}'),
('Amit Verma', 'amit.verma@email.com', '+91-88888-77777', 2, NULL, NULL, 1, 'Thane', 'Maharashtra', 1, 0, NULL, '{}'),
('Neha Gupta', 'neha.gupta@email.com', '+91-77777-66666', 1, 5, 4, 1, 'Mumbai', 'Maharashtra', 2, 1, 'interested', '{"budget_min": 3500000, "budget_max": 4500000, "preferred_location": "Vashi", "property_type": "Commercial", "timeline": "1 year", "intent_score": 3}'),
('Vikram Singh', 'vikram.singh@email.com', '+91-99999-88888', 4, 3, 2, 1, 'Navi Mumbai', 'Maharashtra', 5, 3, 'interested', '{"budget_min": 2500000, "budget_max": 3500000, "preferred_location": "Panvel", "property_type": "Residential", "timeline": "2 months", "intent_score": 8}');

-- Sample Campaigns
INSERT INTO campaigns (name, status, filters, daily_call_limit, calling_hours_start, calling_hours_end, max_attempts_per_lead, total_leads, completed_leads, created_by) VALUES
('Q1 2026 - Mumbai Residential Plots', 'active', '{"leadStageIds": [1, 2], "cities": ["Mumbai", "Navi Mumbai"], "platformIds": [1, 2, 3], "maxTracker": 3}', 500, '10:00:00', '20:00:00', 3, 1247, 811, 2),
('Industrial Land - Pune & Nashik', 'paused', '{"leadStageIds": [1], "cities": ["Pune", "Nashik"], "maxTracker": 3}', 300, '10:00:00', '18:00:00', 3, 543, 228, 2),
('Commercial Properties - Thane', 'draft', '{"leadStageIds": [1, 2, 3], "cities": ["Thane"], "maxTracker": 2}', 200, '09:00:00', '21:00:00', 2, 320, 0, 2);

-- Sample Call Logs
INSERT INTO call_logs (lead_id, call_id, campaign_id, status, duration, classification, sentiment_score, call_outcome, call_summary, started_at, ended_at) VALUES
(1, 'call_001', 1, 'completed', 263, 'hot', 0.85, 'Qualified', 'Budget: 20-30L confirmed. Location: Prefers Panvel. Timeline: 3 months. Next: Site visit scheduled', '2026-01-25 15:45:00', '2026-01-25 15:49:23'),
(2, 'call_002', 2, 'completed', 407, 'warm', 0.65, 'Callback Requested', 'Location too far from office. Requested callback in 2 weeks after discussing with family.', '2026-01-25 14:15:00', '2026-01-25 14:21:47'),
(4, 'call_003', 1, 'completed', 125, 'cold', 0.35, 'Not Interested', 'Already purchased property elsewhere. Marked as not interested.', '2026-01-25 11:30:00', '2026-01-25 11:32:05'),
(5, 'call_004', 1, 'completed', 312, 'hot', 0.92, 'Meeting Scheduled', 'Very interested. Site visit scheduled for next week. Budget confirmed.', '2026-01-24 16:20:00', '2026-01-24 16:25:12');

-- Sample Compliance Logs
INSERT INTO compliance_logs (event_type, lead_id, call_id, details) VALUES
('consent_captured', 1, NULL, '{"source": "facebook_lead_form", "text": "I agree to be contacted for real estate information"}'),
('consent_captured', 2, NULL, '{"source": "website_form", "text": "I consent to receiving calls and messages"}'),
('opt_out_requested', 4, 'call_003', '{"reason": "Already purchased elsewhere", "processed_at": "2026-01-25T11:32:05Z"}');

-- Verify data
SELECT 'Platforms' as table_name, COUNT(*) as count FROM platforms
UNION ALL SELECT 'Lead Stages', COUNT(*) FROM lead_stages
UNION ALL SELECT 'Lead Statuses', COUNT(*) FROM lead_statuses
UNION ALL SELECT 'Users', COUNT(*) FROM users
UNION ALL SELECT 'Plots', COUNT(*) FROM plots
UNION ALL SELECT 'Leads', COUNT(*) FROM leads
UNION ALL SELECT 'Campaigns', COUNT(*) FROM campaigns
UNION ALL SELECT 'Call Logs', COUNT(*) FROM call_logs
UNION ALL SELECT 'Compliance Logs', COUNT(*) FROM compliance_logs;
