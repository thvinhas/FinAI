-- Reassigna cores de contas e categorias ativas para evitar repetição por usuário.
-- Usa distribuição round-robin baseada no palette definido no frontend.

-- Contas (8 cores)
with numbered as (
  select id, user_id,
    row_number() over (partition by user_id order by created_at) - 1 as idx
  from accounts
  where archived_at is null
)
update accounts a
set color = (
  array['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#8b5cf6','#14b8a6']
)[1 + (n.idx % 8)]
from numbered n
where a.id = n.id;

-- Categorias (24 cores) — separado por tipo (receita vs despesa)
with numbered as (
  select id, user_id, type,
    row_number() over (partition by user_id, type order by created_at) - 1 as idx
  from categories
  where archived_at is null
)
update categories c
set color = (
  array['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316','#06b6d4','#22c55e','#a855f7','#e11d48','#0ea5e9','#d946ef','#84cc16','#f43f5e','#64748b','#fb923c','#2dd4bf','#eab308','#475569','#a78bfa','#34d399']
)[1 + (n.idx % 24)]
from numbered n
where c.id = n.id;
