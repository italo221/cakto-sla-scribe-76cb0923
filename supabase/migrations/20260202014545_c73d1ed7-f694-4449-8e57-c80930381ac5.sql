-- Popular allowlist com TODOS os usuários existentes
INSERT INTO email_allowlist (email, status, approved_by, approved_at)
SELECT 
  DISTINCT email,
  'approved',
  (SELECT user_id FROM profiles WHERE user_type = 'administrador_master' LIMIT 1),
  now()
FROM profiles
WHERE email IS NOT NULL
ON CONFLICT (email) DO NOTHING;