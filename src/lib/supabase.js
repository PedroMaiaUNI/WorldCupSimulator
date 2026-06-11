import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =============================================
// DATA ACCESS FUNCTIONS
// =============================================

export async function getTeams() {
  // Order by sort_order (insertion order), fallback to created_at
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('sort_order', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function upsertTeam(team) {
  const { data, error } = await supabase
    .from('teams')
    .upsert(team, { onConflict: 'id' })
    .select();
  if (error) throw error;
  return data[0];
}

export async function deleteTeam(teamId) {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);
  if (error) throw error;
}

export async function getMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('match_order');
  if (error) throw error;
  return data;
}

export async function upsertMatch(match) {
  const { data, error } = await supabase
    .from('matches')
    .upsert(match, { onConflict: 'id' })
    .select();
  if (error) throw error;
  return data[0];
}

export async function getRealResults() {
  const { data, error } = await supabase
    .from('real_results')
    .select('*');
  if (error) throw error;
  return data;
}

export async function upsertRealResult(result) {
  const { data, error } = await supabase
    .from('real_results')
    .upsert(result, { onConflict: 'match_id' })
    .select();
  if (error) throw error;
  return data[0];
}

export async function upsertRealResults(results) {
  const { data, error } = await supabase
    .from('real_results')
    .upsert(results, { onConflict: 'match_id' })
    .select();
  if (error) throw error;
  return data;
}

export async function deleteRealResult(matchId) {
  const { error } = await supabase
    .from('real_results')
    .delete()
    .eq('match_id', matchId);
  if (error) throw error;
}

export async function deleteAllRealResults() {
  const { error } = await supabase
    .from('real_results')
    .delete()
    .neq('match_id', '___none___'); // delete all rows
  if (error) throw error;
}

export async function getPredictions(sessionId) {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('session_id', sessionId);
  if (error) throw error;
  return data;
}

export async function getAllPredictions() {
  const { data, error } = await supabase
    .from('predictions')
    .select('*');
  if (error) throw error;
  return data;
}

export async function upsertPrediction(prediction) {
  const { data, error } = await supabase
    .from('predictions')
    .upsert(prediction, { onConflict: 'session_id,match_id' })
    .select();
  if (error) throw error;
  return data[0];
}

export async function upsertPredictions(predictions) {
  const { data, error } = await supabase
    .from('predictions')
    .upsert(predictions, { onConflict: 'session_id,match_id' })
    .select();
  if (error) throw error;
  return data;
}

export async function deleteSession(sessionId) {
  // Delete predictions first (FK constraint)
  await supabase.from('predictions').delete().eq('session_id', sessionId);
  const { error } = await supabase.from('predictor_sessions').delete().eq('session_id', sessionId);
  if (error) throw error;
}

export async function deletePredictionsForSession(sessionId) {
  const { error } = await supabase.from('predictions').delete().eq('session_id', sessionId);
  if (error) throw error;
}

export async function getPredictorSessions() {
  // Paginar por segurança (muitos palpiteiros no futuro)
  const PAGE = 1000;
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('predictor_sessions')
      .select('*')
      .order('score', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

export async function upsertPredictorSession(session) {
  const { data, error } = await supabase
    .from('predictor_sessions')
    .upsert(session, { onConflict: 'session_id' })
    .select();
  if (error) throw error;
  return data[0];
}

export async function getAppConfig(key) {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', key)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data?.value;
}

export async function setAppConfig(key, value) {
  const { error } = await supabase
    .from('app_config')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}
