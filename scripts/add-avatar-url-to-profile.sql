-- Add avatar_url column to user_profile table
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add comment for documentation
COMMENT ON COLUMN user_profile.avatar_url IS 'URL to the user profile picture stored in Supabase Storage';
