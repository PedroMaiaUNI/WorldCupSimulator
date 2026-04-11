-- ================================================================
-- PATCH: adicionar sort_order na tabela teams
-- Execute no Supabase SQL Editor
-- ================================================================

-- 1. Adicionar coluna sort_order
ALTER TABLE teams ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- 2. Preencher sort_order pelos times já inseridos (ordem de criação)
UPDATE teams SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY group_letter, created_at) AS rn
  FROM teams
) sub
WHERE teams.id = sub.id;

-- 3. Índice para ordenação eficiente
CREATE INDEX IF NOT EXISTS idx_teams_sort_order ON teams(sort_order);
