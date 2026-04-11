import { useState, useEffect, createContext, useContext } from "react";
import { getTeams, getMatches, getRealResults, getPredictorSessions, upsertPredictorSession, upsertPredictions } from "./lib/supabase";
import { DEFAULT_TEAMS, GROUPS } from "./lib/teamsData";
import { generateGroupMatches } from "./lib/scoring";
import HomePage from "./pages/HomePage";
import PredictorPage from "./pages/PredictorPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import AdminPage from "./pages/AdminPage";
import ViewPredictionsPage from "./pages/ViewPredictionsPage";
import ThirdPlaceExplorerPage from "./pages/ThirdPlaceExplorerPage";

export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || "copa2026admin";

// ── LocalStorage helpers ──────────────────────────────────────
const LS_SESSIONS  = "wc2026_sessions";
const LS_PREDS     = "wc2026_preds";
const LS_RESULTS   = "wc2026_results";
const LS_TEAMS     = "wc2026_teams";

function lsGet(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export default function App() {
  const [page, setPage] = useState("home");
  const [predictorName, setPredictorName] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [teams, setTeamsState] = useState([]);
  const [matches, setMatches] = useState([]);
  const [realResults, setRealResultsState] = useState({});
  const [predictions, setPredictions] = useState([]);
  const [sessions, setSessionsState] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  // Wrappers that always sync to localStorage
  function setTeams(val) {
    const next = typeof val === "function" ? val(teams) : val;
    setTeamsState(next);
    lsSet(LS_TEAMS, next);
  }
  function setRealResults(val) {
    const next = typeof val === "function" ? val(realResults) : val;
    setRealResultsState(next);
    lsSet(LS_RESULTS, next);
  }
  function setSessions(val) {
    const next = typeof val === "function" ? val(sessions) : val;
    setSessionsState(next);
    lsSet(LS_SESSIONS, next);
  }

  useEffect(() => { initApp(); }, []);

  async function initApp() {
    setLoading(true);

    // Always start from localStorage (instant, no network)
    const lsTeams    = lsGet(LS_TEAMS);
    const lsResults  = lsGet(LS_RESULTS, {});
    const lsSessions = lsGet(LS_SESSIONS, []);

    if (lsTeams && lsTeams.length > 0) {
      const normalized = lsTeams.map(t => ({ ...t, group: t.group || t.group_letter }))
        .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
      setTeamsState(normalized);
      setMatches(generateAllGroupMatches(normalized));
    } else {
      setTeamsState(DEFAULT_TEAMS);
      setMatches(generateAllGroupMatches(DEFAULT_TEAMS));
    }
    setRealResultsState(lsResults);
    setSessionsState(lsSessions);

    // Then try to sync with Supabase (non-blocking)
    try {
      const [teamsData, matchesData, resultsData, sessionsData] = await Promise.all([
        getTeams(), getMatches(), getRealResults(), getPredictorSessions(),
      ]);

      if (teamsData && teamsData.length > 0) {
        const normalized = teamsData
          .map(t => ({ ...t, group: t.group || t.group_letter }))
          .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
        setTeamsState(normalized);
        lsSet(LS_TEAMS, normalized);
        if (matchesData && matchesData.length > 0) {
          setMatches(matchesData);
        } else {
          setMatches(generateAllGroupMatches(normalized));
        }
      }

      // Merge Supabase results WITH localStorage results (localStorage wins for KO results not in Supabase matches table)
      const supabaseResults = {};
      (resultsData || []).forEach(r => { supabaseResults[r.match_id] = r; });
      const merged = { ...supabaseResults, ...lsResults }; // localStorage overrides (more recent)
      setRealResultsState(merged);
      lsSet(LS_RESULTS, merged);

      // Merge sessions: Supabase is authoritative for sessions that exist there,
      // but keep any localStorage-only sessions too
      const sbSessionIds = new Set((sessionsData || []).map(s => s.session_id));
      const lsOnlySessions = lsSessions.filter(s => !sbSessionIds.has(s.session_id));
      const mergedSessions = [...(sessionsData || []), ...lsOnlySessions];
      setSessionsState(mergedSessions);
      lsSet(LS_SESSIONS, mergedSessions);

      setUseFallback(false);
    } catch (err) {
      console.warn("Supabase offline, using localStorage:", err.message);
      setUseFallback(true);
    }

    setLoading(false);
  }

  function generateAllGroupMatches(teamsList) {
    const allMatches = [];
    let order = 0;
    for (const group of GROUPS) {
      const groupTeams = teamsList
        .filter(t => (t.group || t.group_letter) === group)
        .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
        .map(t => t.id);
      if (groupTeams.length === 4) {
        const gm = generateGroupMatches(group, groupTeams).map(m => ({ ...m, match_order: order++ }));
        allMatches.push(...gm);
      }
    }
    return allMatches;
  }

  function handleStartPredictor(name) {
    const sid = `${name.trim().replace(/\s+/g, "_")}_${Date.now()}`;
    setPredictorName(name.trim());
    setSessionId(sid);
    setPage("predict");
  }

  async function handleSavePredictions(preds) {
    setPredictions(preds);
    const sessionPayload = { session_id: sessionId, name: predictorName, is_complete: true, score: 0 };
    const predPayload = preds.map(p => ({ ...p, session_id: sessionId, predictor_name: predictorName }));

    // Save to localStorage first (always)
    const existingPreds = lsGet(LS_PREDS, []);
    lsSet(LS_PREDS, [...existingPreds.filter(p => p.session_id !== sessionId), ...predPayload]);
    setSessions(prev => {
      const f = prev.filter(s => s.session_id !== sessionId);
      return [...f, sessionPayload];
    });

    // Try Supabase
    if (!useFallback) {
      try {
        await upsertPredictorSession(sessionPayload);
        await upsertPredictions(predPayload);
      } catch (err) { console.warn("Supabase save failed:", err.message); }
    }
    setPage("leaderboard");
  }

  function checkAdmin(secret) {
    if (secret === ADMIN_SECRET) { setIsAdmin(true); setPage("admin"); return true; }
    return false;
  }

  function getTeamById(id) { return teams.find(t => t.id === id); }
  function getGroupTeams(group) {
    return teams.filter(t => (t.group || t.group_letter) === group)
      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
  }
  function getGroupMatches(group) {
    return matches.filter(m => m.phase === "group" && m.group_letter === group);
  }

  const ctx = {
    page, setPage,
    predictorName, sessionId,
    teams, setTeams,
    matches, setMatches,
    realResults, setRealResults,
    predictions, setPredictions,
    sessions, setSessions,
    isAdmin, setIsAdmin,
    useFallback,
    handleStartPredictor,
    handleSavePredictions,
    checkAdmin,
    getTeamById, getGroupTeams, getGroupMatches,
    generateAllGroupMatches,
    initApp,
  };

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        background:"#0a0f1e", fontFamily:"'Bebas Neue','Impact',sans-serif", color:"#f0c040",
        fontSize:"2rem", letterSpacing:"0.2em" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:"4rem", marginBottom:"1rem" }}>⚽</div>
          <div>CARREGANDO...</div>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={ctx}>
      <div>
        {page === "home"            && <HomePage />}
        {page === "predict"         && <PredictorPage />}
        {page === "leaderboard"     && <LeaderboardPage />}
        {page === "admin" && isAdmin && <AdminPage />}
        {page === "viewpredictions" && <ViewPredictionsPage />}
        {page === "explorer"        && <ThirdPlaceExplorerPage />}
      </div>
    </AppContext.Provider>
  );
}
