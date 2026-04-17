import { useState, useEffect, createContext, useContext } from "react";
import {
  getTeams, getMatches, getRealResults, getPredictorSessions,
  upsertPredictorSession, upsertPredictions, getAllPredictions,
  deleteSession as sbDeleteSession, deletePredictionsForSession,
  upsertRealResults, deleteAllRealResults
} from "./lib/supabase";
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

export default function App() {
  // Restaurar sessão do tab (sessionStorage = só dura enquanto a aba estiver aberta)
  const _storedPage    = sessionStorage.getItem("wc2026_page")    || "home";
  const _storedName    = sessionStorage.getItem("wc2026_name")    || "";
  const _storedSid     = sessionStorage.getItem("wc2026_sid")     || null;

  const [page,          setPageState]     = useState(_storedPage);
  const [predictorName, setPredictorName] = useState(_storedName);
  const [sessionId,     setSessionId]     = useState(_storedSid);

  function setPage(p) {
    setPageState(p);
    sessionStorage.setItem("wc2026_page", p);
  }
  const [teams,         setTeams]         = useState([]);
  const [matches,       setMatches]       = useState([]);
  const [realResults,   setRealResults]   = useState({});  // { matchId: resultObj }
  const [sessions,      setSessions]      = useState([]);  // predictor_sessions rows
  const [isAdmin,       setIsAdmin]       = useState(false);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => { initApp(); }, []);

  async function initApp() {
    setLoading(true);
    try {
      const [teamsData, matchesData, resultsData, sessionsData] = await Promise.all([
        getTeams(),
        getMatches(),
        getRealResults(),
        getPredictorSessions(),
      ]);

      // Teams
      if (teamsData && teamsData.length > 0) {
        const normalized = teamsData
          .map(t => ({ ...t, group: t.group || t.group_letter }))
          .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
        setTeams(normalized);
        if (matchesData && matchesData.length > 0) {
          setMatches(matchesData);
        } else {
          setMatches(generateAllGroupMatches(normalized));
        }
      } else {
        setTeams(DEFAULT_TEAMS);
        setMatches(generateAllGroupMatches(DEFAULT_TEAMS));
      }

      // Real results → map by match_id
      const resultsMap = {};
      (resultsData || []).forEach(r => { resultsMap[r.match_id] = r; });
      setRealResults(resultsMap);

      // Sessions
      setSessions(sessionsData || []);
    } catch (err) {
      console.error("Supabase initApp error:", err);
      // Graceful degradation — show teams from defaults
      setTeams(DEFAULT_TEAMS);
      setMatches(generateAllGroupMatches(DEFAULT_TEAMS));
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

  // ── Palpites ─────────────────────────────────────────────────
  function handleStartPredictor(name) {
    const sid = `${name.trim().replace(/\s+/g, "_")}_${Date.now()}`;
    setPredictorName(name.trim());
    setSessionId(sid);
    sessionStorage.setItem("wc2026_name", name.trim());
    sessionStorage.setItem("wc2026_sid",  sid);
    setPage("predict");
  }

  async function handleSavePredictions(preds) {
    const sessionPayload = {
      session_id: sessionId,
      name: predictorName,
      is_complete: true,
      score: 0,
      updated_at: new Date().toISOString(),
    };
    const predPayload = preds.map(p => ({
      ...p,
      session_id: sessionId,
      predictor_name: predictorName,
    }));

    try {
      await upsertPredictorSession(sessionPayload);
      await upsertPredictions(predPayload);
      // Refresh sessions list
      const updated = await getPredictorSessions();
      setSessions(updated || []);
    } catch (err) {
      console.error("handleSavePredictions error:", err);
      alert("Erro ao salvar palpites: " + err.message);
      return;
    }
    sessionStorage.setItem("wc2026_page", "leaderboard");
    setPageState("leaderboard");
  }

  // ── Resultados reais ─────────────────────────────────────────
  async function saveRealResults(resultsArray) {
    await upsertRealResults(resultsArray);
    // Reload from Supabase to keep state consistent
    const fresh = await getRealResults();
    const map = {};
    (fresh || []).forEach(r => { map[r.match_id] = r; });
    setRealResults(map);
  }

  async function clearRealResults() {
    await deleteAllRealResults();
    setRealResults({});
  }

  // ── Sessões (admin) ──────────────────────────────────────────
  async function deleteSessionById(sid) {
    await sbDeleteSession(sid); // deletes predictions + session in Supabase
    setSessions(prev => prev.filter(s => s.session_id !== sid));
  }

  async function saveSessionPredictions(sid, name, predArray) {
    const payload = predArray.map(p => ({ ...p, session_id: sid, predictor_name: name }));
    await deletePredictionsForSession(sid);
    await upsertPredictions(payload);
  }

  async function refreshSessions() {
    const data = await getPredictorSessions();
    setSessions(data || []);
  }

  // ── Admin auth ───────────────────────────────────────────────
  function checkAdmin(secret) {
    if (secret === ADMIN_SECRET) { setIsAdmin(true); setPage("admin"); return true; }
    return false;
  }

  // ── Helpers ──────────────────────────────────────────────────
  function getTeamById(id) { return teams.find(t => t.id === id); }
  function getGroupTeams(grp) {
    return teams.filter(t => (t.group || t.group_letter) === grp)
      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
  }
  function getGroupMatches(grp) {
    return matches.filter(m => m.phase === "group" && m.group_letter === grp);
  }
  function nameExists(name) {
    const norm = name.trim().toLowerCase();
    return sessions.some(s => s.name.trim().toLowerCase() === norm);
  }

  const ctx = {
    page, setPage,
    predictorName, sessionId,
    teams, setTeams,
    matches, setMatches,
    realResults, setRealResults,
    sessions, setSessions,
    isAdmin, setIsAdmin,
    handleStartPredictor,
    handleSavePredictions,
    saveRealResults,
    clearRealResults,
    deleteSessionById,
    saveSessionPredictions,
    refreshSessions,
    checkAdmin,
    getTeamById, getGroupTeams, getGroupMatches,
    generateAllGroupMatches,
    nameExists,
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
        {page === "home"             && <HomePage />}
        {page === "predict"          && <PredictorPage />}
        {page === "leaderboard"      && <LeaderboardPage />}
        {page === "admin" && isAdmin && <AdminPage />}
        {page === "viewpredictions"  && <ViewPredictionsPage />}
        {page === "explorer"         && <ThirdPlaceExplorerPage />}
      </div>
    </AppContext.Provider>
  );
}
