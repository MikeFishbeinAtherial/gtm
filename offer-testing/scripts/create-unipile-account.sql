-- Create a placeholder account record for Unipile email sending
-- Run this in Supabase SQL editor first

INSERT INTO accounts (id, provider)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'unipile')
ON CONFLICT (id) DO NOTHING;

-- Verify it was created
SELECT * FROM accounts WHERE id = '00000000-0000-0000-0000-000000000001';
