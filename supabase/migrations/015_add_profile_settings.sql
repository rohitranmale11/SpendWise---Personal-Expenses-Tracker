-- Add avatar_emoji and settings fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_emoji TEXT,
ADD COLUMN IF NOT EXISTS dark_mode_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS budget_alerts_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS expense_reminders_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Add comment
COMMENT ON COLUMN profiles.avatar_emoji IS 'User avatar emoji (👨 or 👩)';
COMMENT ON COLUMN profiles.dark_mode_enabled IS 'Dark mode preference';
COMMENT ON COLUMN profiles.budget_alerts_enabled IS 'Budget alerts notification preference';
COMMENT ON COLUMN profiles.expense_reminders_enabled IS 'Expense reminders notification preference';
COMMENT ON COLUMN profiles.email_notifications_enabled IS 'Email notifications preference';
COMMENT ON COLUMN profiles.push_notifications_enabled IS 'Push/browser notifications preference';
COMMENT ON COLUMN profiles.timezone IS 'User timezone preference';
