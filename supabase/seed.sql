-- ============================================================
-- Seed completo: usuário admin + categorias + contas + transações
-- Roda automaticamente em `supabase start` (1ª vez) ou `supabase db reset`
-- Transações sempre do mês atual
-- ============================================================

-- Garante extensão pgcrypto para hash da senha
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ── 1. Usuário admin ─────────────────────────────────────────
WITH admin AS (
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    last_sign_in_at,
    created_at,
    updated_at,
    role,
    aud,
    raw_app_meta_data,
    raw_user_meta_data,
    is_sso_user,
    is_anonymous
  ) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '00000000-0000-0000-0000-000000000000',
    'admin@admin.com',
    extensions.crypt('123456', extensions.gen_salt('bf')),
    now(),
    '',
    now(),
    '',
    now(),
    '',
    '',
    now(),
    '',
    0,
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    false
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
  RETURNING id
),

-- ── 1b. Identity do admin ─────────────────────────────────────
ident AS (
  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '{"sub":"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11","email":"admin@admin.com","email_verified":true,"phone_verified":false}'::jsonb,
    'email',
    now(), now(), now()
  )
  ON CONFLICT (provider_id, provider) DO NOTHING
  RETURNING user_id
),

-- ── 2. Categorias ────────────────────────────────────────────
cats AS (
  INSERT INTO categories (user_id, name, type, color, icon) VALUES
    -- Receita
    ((SELECT id FROM admin), 'Salario',       'receita',  '#10b981', 'wallet'),
    ((SELECT id FROM admin), 'Freelance',     'receita',  '#3b82f6', 'laptop'),
    ((SELECT id FROM admin), 'Investimentos', 'receita',  '#8b5cf6', 'trending-up'),
    ((SELECT id FROM admin), 'Cashback',      'receita',  '#14b8a6', 'percent'),
    ((SELECT id FROM admin), 'Transferencia', 'receita',  '#6366f1', 'repeat'),
    -- Despesa
    ((SELECT id FROM admin), 'Aluguel',       'despesa',  '#ef4444', 'home'),
    ((SELECT id FROM admin), 'Supermercado',  'despesa',  '#f59e0b', 'shopping-cart'),
    ((SELECT id FROM admin), 'Contas',        'despesa',  '#ec4899', 'file-text'),
    ((SELECT id FROM admin), 'Transporte',    'despesa',  '#6366f1', 'car'),
    ((SELECT id FROM admin), 'Lazer',         'despesa',  '#06b6d4', 'coffee'),
    ((SELECT id FROM admin), 'Saude',         'despesa',  '#10b981', 'heart'),
    ((SELECT id FROM admin), 'Educacao',      'despesa',  '#3b82f6', 'book-open'),
    ((SELECT id FROM admin), 'Roupas',        'despesa',  '#ec4899', 'shirt'),
    ((SELECT id FROM admin), 'Streaming',     'despesa',  '#8b5cf6', 'tv'),
    ((SELECT id FROM admin), 'Pets',          'despesa',  '#14b8a6', 'paw-print'),
    ((SELECT id FROM admin), 'Presentes',     'despesa',  '#f59e0b', 'gift')
  ON CONFLICT DO NOTHING
  RETURNING id, name, type
),

-- ── 3. Contas ────────────────────────────────────────────────
accs AS (
  INSERT INTO accounts (user_id, name, type, balance, color) VALUES
    ((SELECT id FROM admin), 'Nubank',   'checking', 2500.00,  '#6366f1'),
    ((SELECT id FROM admin), 'Poupanca', 'savings',  15000.00, '#10b981'),
    ((SELECT id FROM admin), 'Carteira', 'cash',     350.00,   '#f59e0b'),
    ((SELECT id FROM admin), 'Inter',    'credit',   -800.00,  '#ef4444')
  ON CONFLICT DO NOTHING
  RETURNING id, name, type
)

-- ── 4. Transações do mês atual ───────────────────────────────
INSERT INTO transactions (user_id, account_id, category_id, amount, type, description, date)
SELECT
  (SELECT id FROM admin),
  a.id,
  c.id,
  v.amount,
  CASE WHEN v.amount >= 0 THEN 'receita' ELSE 'despesa' END,
  v.description,
  (date_trunc('month', current_date) + (v.day || ' days')::interval)::date
FROM (VALUES
  (1,  'Salario',       'Nubank',    5500.00, 'Salario mensal'),
  (3,  'Aluguel',       'Nubank',   -1800.00, 'Aluguel apartamento'),
  (5,  'Contas',        'Nubank',    -450.00, 'Luz, agua, gas, internet'),
  (7,  'Supermercado',  'Nubank',    -620.00, 'Compras do mes'),
  (8,  'Transporte',    'Nubank',    -200.00, 'Combustivel / Uber'),
  (10, 'Saude',         'Nubank',    -150.00, 'Plano de saude'),
  (12, 'Streaming',     'Inter',      -80.00, 'Netflix + Spotify'),
  (14, 'Educacao',      'Nubank',    -200.00, 'Curso online'),
  (15, 'Freelance',     'Nubank',    1200.00, 'Projeto site institucional'),
  (16, 'Supermercado',  'Carteira',  -180.00, 'Compras semanais'),
  (18, 'Lazer',         'Inter',     -120.00, 'Cinema + jantar'),
  (20, 'Contas',        'Inter',     -350.00, 'Telefone + academia'),
  (22, 'Roupas',        'Inter',     -250.00, 'Compras vestuario'),
  (23, 'Pets',          'Nubank',     -90.00, 'Racao + veterinario'),
  (25, 'Transporte',    'Carteira',  -100.00, 'Recarga transporte publico'),
  (26, 'Cashback',      'Nubank',      45.00, 'Cashback compras'),
  (27, 'Presentes',     'Inter',     -150.00, 'Aniversario amigo'),
  (28, 'Investimentos', 'Poupanca',   500.00, 'Rendimento CDB')
) AS v(day, cat_name, acc_name, amount, description)
JOIN cats c ON c.name = v.cat_name
JOIN accs a ON a.name = v.acc_name
ON CONFLICT DO NOTHING;
