-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'system_alert',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(512) DEFAULT '/messages',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE notifications TO petpulse_app;

-- Add bio column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
