-- ================================================================
-- COPA DO MUNDO 2026 - PALPITES
-- Schema completo para Supabase
-- Execute este SQL no editor SQL do Supabase (SQL Editor > New query)
-- ================================================================

-- ───────────────────────────────────────────────────────────────
-- 1. TABELAS
-- ───────────────────────────────────────────────────────────────

-- Times participantes
CREATE TABLE IF NOT EXISTS teams (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  flag        TEXT NOT NULL DEFAULT '🏳️',
  group_letter TEXT NOT NULL CHECK (group_letter IN ('A','B','C','D','E','F','G','H','I','J','K','L')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Partidas (grupos + mata-mata)
CREATE TABLE IF NOT EXISTS matches (
  id           TEXT PRIMARY KEY,
  phase        TEXT NOT NULL CHECK (phase IN ('group','r32','r16','qf','sf','final','3rd')),
  group_letter TEXT,
  home_team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  away_team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  home_slot    TEXT,   -- ex: '1A', '2B', '3C' — para slots de mata-mata
  away_slot    TEXT,
  match_order  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Resultados reais (inseridos pelo admin)
CREATE TABLE IF NOT EXISTS real_results (
  match_id       TEXT PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
  home_team_id   TEXT,
  away_team_id   TEXT,
  home_goals     INTEGER CHECK (home_goals >= 0),
  away_goals     INTEGER CHECK (away_goals >= 0),
  extra_time     BOOLEAN DEFAULT FALSE,
  penalties      BOOLEAN DEFAULT FALSE,
  penalty_winner TEXT,   -- 'home' ou 'away'
  entered_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Sessões de palpiteiros
CREATE TABLE IF NOT EXISTS predictor_sessions (
  session_id TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  is_complete BOOLEAN DEFAULT FALSE,
  score      INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Palpites individuais por partida
CREATE TABLE IF NOT EXISTS predictions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       TEXT NOT NULL REFERENCES predictor_sessions(session_id) ON DELETE CASCADE,
  predictor_name   TEXT NOT NULL,
  match_id         TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  home_goals       INTEGER NOT NULL CHECK (home_goals >= 0),
  away_goals       INTEGER NOT NULL CHECK (away_goals >= 0),
  extra_time       BOOLEAN DEFAULT FALSE,
  penalties        BOOLEAN DEFAULT FALSE,
  penalty_winner   TEXT,   -- 'home' ou 'away'
  tie_break_order  TEXT[], -- ordem em caso de empate total no grupo
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, match_id)
);

-- Configurações do app (admin)
CREATE TABLE IF NOT EXISTS app_config (
  key        TEXT PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────
-- 2. ÍNDICES
-- ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_teams_group ON teams(group_letter);
CREATE INDEX IF NOT EXISTS idx_matches_phase ON matches(phase);
CREATE INDEX IF NOT EXISTS idx_matches_group ON matches(group_letter);
CREATE INDEX IF NOT EXISTS idx_predictions_session ON predictions(session_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id);

-- ───────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────────

ALTER TABLE teams               ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches             ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_results        ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictor_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config          ENABLE ROW LEVEL SECURITY;

-- Leitura pública (todos podem ver tudo)
CREATE POLICY "public_read_teams"     ON teams            FOR SELECT USING (true);
CREATE POLICY "public_read_matches"   ON matches          FOR SELECT USING (true);
CREATE POLICY "public_read_results"   ON real_results     FOR SELECT USING (true);
CREATE POLICY "public_read_sessions"  ON predictor_sessions FOR SELECT USING (true);
CREATE POLICY "public_read_preds"     ON predictions      FOR SELECT USING (true);
CREATE POLICY "public_read_config"    ON app_config       FOR SELECT USING (true);

-- Escrita de palpites: qualquer pessoa pode inserir/atualizar
CREATE POLICY "insert_predictions"    ON predictions      FOR INSERT WITH CHECK (true);
CREATE POLICY "update_predictions"    ON predictions      FOR UPDATE USING (true);
CREATE POLICY "insert_sessions"       ON predictor_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "update_sessions"       ON predictor_sessions FOR UPDATE USING (true);

-- Admin usa service role key no backend — essas políticas são para anon key
-- Para operações de admin (inserir resultados, editar times), use a service_role key
-- OU crie policies com verificação de token se quiser manter tudo no front-end:

-- Política de escrita admin via service_role (automática, sem policy necessária)
-- Se quiser escrita via anon key também (menos seguro, só em dev):
-- CREATE POLICY "admin_write_teams"    ON teams         FOR ALL USING (true);
-- CREATE POLICY "admin_write_matches"  ON matches       FOR ALL USING (true);
-- CREATE POLICY "admin_write_results"  ON real_results  FOR ALL USING (true);
-- CREATE POLICY "admin_write_config"   ON app_config    FOR ALL USING (true);

-- Para produção com admin no front-end usando anon key, descomente as 4 linhas acima
-- ou use a service_role key apenas no servidor (recomendado).

-- ───────────────────────────────────────────────────────────────
-- 4. FUNÇÕES AUXILIARES
-- ───────────────────────────────────────────────────────────────

-- Função para recalcular scores de todos os palpiteiros
CREATE OR REPLACE FUNCTION recalc_all_scores()
RETURNS void AS $$
DECLARE
  sess RECORD;
  total_score INTEGER;
BEGIN
  FOR sess IN SELECT DISTINCT session_id FROM predictions LOOP
    total_score := 0;
    -- Cálculo simplificado: pontos por resultado correto
    SELECT COALESCE(SUM(
      CASE
        WHEN p.home_goals = r.home_goals AND p.away_goals = r.away_goals THEN 8  -- placar exato
        WHEN SIGN(p.home_goals - p.away_goals) = SIGN(r.home_goals - r.away_goals) THEN 5 -- resultado correto
        ELSE 0
      END
    ), 0) INTO total_score
    FROM predictions p
    JOIN real_results r ON p.match_id = r.match_id
    WHERE p.session_id = sess.session_id
      AND r.home_goals IS NOT NULL;

    UPDATE predictor_sessions
    SET score = total_score, updated_at = NOW()
    WHERE session_id = sess.session_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────────────────────────
-- 5. SEED INICIAL (48 TIMES PADRÃO)
-- ───────────────────────────────────────────────────────────────
-- Opcional: execute para popular o banco com os times padrão.
-- A aplicação também funciona sem esses dados (usa defaults locais).

INSERT INTO teams (id, name, flag, group_letter) VALUES
  ('MEX', 'México',          '🇲🇽', 'A'),
  ('RSA', 'África do Sul',   '🇿🇦', 'A'),
  ('KOR', 'Coreia do Sul',   '🇰🇷', 'A'),
  ('CZE', 'República Tcheca','🇨🇿', 'A'),

  -- GRUPO B
  ('CAN', 'Canadá',          '🇨🇦', 'B'),
  ('BIH', 'Bósnia',          '🇧🇦', 'B'),
  ('QAT', 'Catar',           '🇶🇦', 'B'),
  ('SUI', 'Suíça',           '🇨🇭', 'B'),

  -- GRUPO C
  ('BRA', 'Brasil',          '🇧🇷', 'C'),
  ('MAR', 'Marrocos',        '🇲🇦', 'C'),
  ('HAI', 'Haiti',           '🇭🇹', 'C'),
  ('SCO', 'Escócia',         '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'C'),

  -- GRUPO D
  ('USA', 'Estados Unidos',  '🇺🇸', 'D'),
  ('PAR', 'Paraguai',        '🇵🇾', 'D'),
  ('AUS', 'Austrália',       '🇦🇺', 'D'),
  ('TUR', 'Turquia',         '🇹🇷', 'D'),

  -- GRUPO E
  ('GER', 'Alemanha',        '🇩🇪', 'E'),
  ('CUW', 'Curaçao',         '🇨🇼', 'E'),
  ('CIV', 'Costa do Marfim', '🇨🇮', 'E'),
  ('ECU', 'Equador',         '🇪🇨', 'E'),

  -- GRUPO F
  ('NED', 'Holanda',         '🇳🇱', 'F'),
  ('JPN', 'Japão',           '🇯🇵', 'F'),
  ('SWE', 'Suécia',          '🇸🇪', 'F'),
  ('TUN', 'Tunísia',         '🇹🇳', 'F'),

  -- GRUPO G
  ('BEL', 'Bélgica',         '🇧🇪', 'G'),
  ('EGY', 'Egito',           '🇪🇬', 'G'),
  ('IRN', 'Irã',             '🇮🇷', 'G'),
  ('NZL', 'Nova Zelândia',   '🇳🇿', 'G'),

  -- GRUPO H
  ('ESP', 'Espanha',         '🇪🇸', 'H'),
  ('CPV', 'Cabo Verde',      '🇨🇻', 'H'),
  ('KSA', 'Arábia Saudita',  '🇸🇦', 'H'),
  ('URU', 'Uruguai',         '🇺🇾', 'H'),

  -- GRUPO I
  ('FRA', 'França',          '🇫🇷', 'I'),
  ('SEN', 'Senegal',         '🇸🇳', 'I'),
  ('IRQ', 'Iraque',          '🇮🇶', 'I'),
  ('NOR', 'Noruega',         '🇳🇴', 'I'),

  -- GRUPO J
  ('ARG', 'Argentina',       '🇦🇷', 'J'),
  ('ALG', 'Argélia',         '🇩🇿', 'J'),
  ('AUT', 'Áustria',         '🇦🇹', 'J'),
  ('JOR', 'Jordânia',        '🇯🇴', 'J'),

  -- GRUPO K
  ('POR', 'Portugal',        '🇵🇹', 'K'),
  ('COD', 'RD Congo',        '🇨🇩', 'K'),
  ('UZB', 'Uzbequistão',     '🇺🇿', 'K'),
  ('COL', 'Colômbia',        '🇨🇴', 'K'),

  -- GRUPO L
  ('ENG', 'Inglaterra',      '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'L'),
  ('CRO', 'Croácia',         '🇭🇷', 'L'),
  ('GHA', 'Gana',            '🇬🇭', 'L'),
  ('PAN', 'Panamá',          '🇵🇦', 'L')
ON CONFLICT (id) DO NOTHING;
