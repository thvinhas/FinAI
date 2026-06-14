-- Categorias de Receitas e Despesas para importação
-- Faça login no Supabase Studio (http://127.0.0.1:54323)
-- No SQL Editor, substitua 'SUA_USER_ID_AQUI' pelo seu user_id e execute

-- Para descobrir seu user_id:
-- 1. Vá em Authentication > Users no Studio
-- 2. Copie o UUID do seu usuário (ex: e739b38b-ce2f-4479-b0a0-cacd3add266a)

with user_id as (
  select 'SUA_USER_ID_AQUI'::uuid as id
)
insert into categories (id, user_id, name, type, color, icon)
values
  -- ── Receitas ──────────────────────────────────────
  (gen_random_uuid(), (select id from user_id), 'Salário',            'receita', '#10b981', 'briefcase'),
  (gen_random_uuid(), (select id from user_id), 'Freelance',          'receita', '#14b8a6', 'code'),
  (gen_random_uuid(), (select id from user_id), 'Investimentos',      'receita', '#3b82f6', 'trending-up'),
  (gen_random_uuid(), (select id from user_id), 'Renda Extra',        'receita', '#8b5cf6', 'plus-circle'),
  (gen_random_uuid(), (select id from user_id), 'Vendas',             'receita', '#ec4899', 'shopping-cart'),
  (gen_random_uuid(), (select id from user_id), 'Presente',           'receita', '#f59e0b', 'gift'),
  (gen_random_uuid(), (select id from user_id), 'Reembolso',          'receita', '#06b6d4', 'rotate-ccw'),
  (gen_random_uuid(), (select id from user_id), 'Aluguel Recebido',   'receita', '#6366f1', 'home'),
  (gen_random_uuid(), (select id from user_id), 'Bônus / Prêmio',     'receita', '#eab308', 'award'),
  (gen_random_uuid(), (select id from user_id), 'Outras Receitas',    'receita', '#6b7280', 'plus'),

  -- ── Despesas ──────────────────────────────────────
  (gen_random_uuid(), (select id from user_id), 'Moradia / Aluguel',  'despesa', '#e11d48', 'home'),
  (gen_random_uuid(), (select id from user_id), 'Condomínio',         'despesa', '#fb7185', 'building'),
  (gen_random_uuid(), (select id from user_id), 'Supermercado',       'despesa', '#ef4444', 'shopping-cart'),
  (gen_random_uuid(), (select id from user_id), 'Restaurante',        'despesa', '#f97316', 'utensils-crossed'),
  (gen_random_uuid(), (select id from user_id), 'Fast Food',          'despesa', '#fdba74', 'coffee'),
  (gen_random_uuid(), (select id from user_id), 'Café / Padaria',     'despesa', '#d97706', 'coffee'),
  (gen_random_uuid(), (select id from user_id), 'Transporte',         'despesa', '#f97316', 'bus'),
  (gen_random_uuid(), (select id from user_id), 'Gasolina',           'despesa', '#ea580c', 'fuel'),
  (gen_random_uuid(), (select id from user_id), 'Uber / Táxi',        'despesa', '#fb923c', 'navigation'),
  (gen_random_uuid(), (select id from user_id), 'Saúde / Farmácia',   'despesa', '#10b981', 'heart-pulse'),
  (gen_random_uuid(), (select id from user_id), 'Plano de Saúde',     'despesa', '#34d399', 'stethoscope'),
  (gen_random_uuid(), (select id from user_id), 'Educação',           'despesa', '#8b5cf6', 'book-open'),
  (gen_random_uuid(), (select id from user_id), 'Curso / Online',     'despesa', '#a78bfa', 'monitor'),
  (gen_random_uuid(), (select id from user_id), 'Streaming',          'despesa', '#a855f7', 'tv'),
  (gen_random_uuid(), (select id from user_id), 'Assinaturas',        'despesa', '#c084fc', 'repeat'),
  (gen_random_uuid(), (select id from user_id), 'Tecnologia',         'despesa', '#3b82f6', 'smartphone'),
  (gen_random_uuid(), (select id from user_id), 'Internet / Celular', 'despesa', '#60a5fa', 'wifi'),
  (gen_random_uuid(), (select id from user_id), 'Roupas',             'despesa', '#ec4899', 'shirt'),
  (gen_random_uuid(), (select id from user_id), 'Beleza / Cuidados',  'despesa', '#f472b6', 'sparkles'),
  (gen_random_uuid(), (select id from user_id), 'Academia / Fitness', 'despesa', '#22c55e', 'dumbbell'),
  (gen_random_uuid(), (select id from user_id), 'Lazer',              'despesa', '#f59e0b', 'gamepad-2'),
  (gen_random_uuid(), (select id from user_id), 'Cinema / Shows',     'despesa', '#fbbf24', 'clapperboard'),
  (gen_random_uuid(), (select id from user_id), 'Viagem',             'despesa', '#14b8a6', 'plane'),
  (gen_random_uuid(), (select id from user_id), 'Hospedagem',         'despesa', '#2dd4bf', 'bed'),
  (gen_random_uuid(), (select id from user_id), 'Compras Online',     'despesa', '#d946ef', 'shopping-bag'),
  (gen_random_uuid(), (select id from user_id), 'Pets',               'despesa', '#f43f5e', 'paw-print'),
  (gen_random_uuid(), (select id from user_id), 'Energia',            'despesa', '#f59e0b', 'zap'),
  (gen_random_uuid(), (select id from user_id), 'Água / Esgoto',      'despesa', '#0ea5e9', 'droplets'),
  (gen_random_uuid(), (select id from user_id), 'Seguros',            'despesa', '#64748b', 'shield'),
  (gen_random_uuid(), (select id from user_id), 'Impostos',           'despesa', '#475569', 'receipt'),
  (gen_random_uuid(), (select id from user_id), 'Outras Despesas',    'despesa', '#6b7280', 'minus')
on conflict (id) do nothing;

-- Para aplicar direto via CLI (substitua o UUID):
-- docker exec -i supabase_db_fin psql -U postgres -d postgres -c "
--   insert into categories (id, user_id, name, type, color, icon)
--   ...
-- "
