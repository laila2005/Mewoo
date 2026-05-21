-- Migration: Add phone support to public.users and create password recovery tracking table

-- Step 1: Add phone column to custom users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) UNIQUE;

-- Step 2: Create password recoveries schema table
CREATE TABLE IF NOT EXISTS password_recoveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    verification_type VARCHAR(20) NOT NULL, -- 'email_code', 'email_link', 'phone_code'
    recipient VARCHAR(255) NOT NULL,        -- Email address or phone number
    otp_code_hash VARCHAR(255),             -- SHA-256 hash of the 6-digit OTP code
    reset_token_hash VARCHAR(255),          -- SHA-256 hash of the email link reset token
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Add indexing for performance and safety
CREATE INDEX IF NOT EXISTS idx_password_recoveries_token ON password_recoveries(reset_token_hash);
CREATE INDEX IF NOT EXISTS idx_password_recoveries_recipient ON password_recoveries(recipient, is_used);
