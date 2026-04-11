import { useState, useEffect, useMemo } from "react";
import { useApp } from "../App";
import { getAllPredictions, deleteSession, deletePredictionsForSession, upsertPredictions, upsertPredictorSession } from "../lib/supabase";
import { buildBracket } from "../lib/bracket";
import { scoreGroupMatch, scoreKnockoutMatch, getKnockoutWinnerSide, getMatchPhase } from "../lib/scoring";

// ── Score colour ──────────────────────────────────────────────
function resultColor(pred, real, isKO) {
  if (!pred || pred.home_goals == null) return "rgba(255,255,255,0.25)";
  if (!real || real.home_goals == null) return "#ffffff";
  if (isKO) {
    const rs = getKnockoutWinnerSide(real);
    const ps = getKnockoutWinnerSide(pred);
    if (pred.home_goals === real.home_goals && pred.away_goals === real.away_goals) return "#10b981";
    if (ps && rs && ps === rs) return "#f0c040";
    return "#ef4444";
  }
  const pRes = Math.sign(pred.home_goals - pred.away_goals);
  const rRes = Math.sign(real.home_goals - real.away_goals);
  if (pred.home_goals === real.home_goals && pred.away_goals === real.away_goals) return "#10b981";
  if (pRes === rRes) return "#f0c040";
  return "#ef4444";
}

function ScoreDisplay({ pred, real, matchId }) {
  if (!pred || pred.home_goals == null) return <span style={{ color:"rgba(255,255,255,0.2)" }}>—</span>;
  const isKO = matchId && !matchId.startsWith("group_");
  const col = resultColor(pred, real, isKO);
  let pts = null;
  if (real && real.home_goals != null) {
    const phase = getMatchPhase(matchId);
    pts = isKO ? scoreKnockoutMatch(pred, real, phase) : scoreGroupMatch(pred, real);
  }
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:"4px" }}>
      <span style={{ color: col, fontFamily:"'Bebas Neue',sans-serif", fontSize:"1rem" }}>
        {pred.home_goals}×{pred.away_goals}
        {pred.extra_time && <span style={{ fontSize:"0.6rem", opacity:0.7 }}> EP</span>}
        {pred.penalties  && <span style={{ fontSize:"0.6rem", opacity:0.7 }}> P</span>}
        {pred.penalty_winner && <span style={{ fontSize:"0.6rem", opacity:0.6 }}> ({pred.penalty_winner === "home" ? "⬅" : "➡"})</span>}
      </span>
      {pts != null && (
        <span style={{ fontSize:"0.65rem", color: pts > 0 ? "#10b981" : "rgba(255,255,255,0.3)",
          fontFamily:"Arial,sans-serif", background:"rgba(0,0,0,0.3)", borderRadius:"4px", padding:"0 3px" }}>
          +{pts}
        </span>
      )}
    </span>
  );
}

function RealDisplay({ real }) {
  if (!real || real.home_goals == null) return <span style={{ color:"rgba(255,255,255,0.2)", fontFamily:"Arial,sans-serif", fontSize:"0.75rem" }}>—</span>;
  return (
    <span style={{ color:"rgba(255,255,255,0.45)", fontFamily:"'Bebas Neue',sans-serif", fontSize:"0.9rem" }}>
      [{real.home_goals}×{real.away_goals}
      {real.extra_time && <span style={{ fontSize:"0.55rem" }}> EP</span>}
      {real.penalties  && <span style={{ fontSize:"0.55rem" }}> P</span>}]
    </span>
  );
}

export default function ViewPredictionsPage() {
  // Use ONLY context sessions — App.jsx is the single source of truth
  const { sessions, setSessions, matches, teams, realResults, setPage, getTeamById, isAdmin } = useApp();
  const [allPreds, setAllPreds] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhase, setActivePhase] = useState("groups");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  // Load predictions whenever sessions change (catches new additions)
  useEffect(() => { loadPreds(); }, [sessions]);

  async function loadPreds() {
    setLoading(true);
    let preds = [];
    try { preds = await getAllPredictions() || []; } catch {}
    // Always merge with localStorage (localStorage may have more recent data)
    const lsPreds = JSON.parse(localStorage.getItem("wc2026_preds") || "[]");
    const lsMap = {};
    lsPreds.forEach(p => { lsMap[`${p.session_id}__${p.match_id}`] = p; });
    preds.forEach(p => { lsMap[`${p.session_id}__${p.match_id}`] = p; }); // Supabase overrides for same key
    preds = Object.values(lsMap);
    setAllPreds(preds);
    setLoading(false);
  }

  // Filter predictions to only sessions that still exist in context
  const validSessionIds = useMemo(() => new Set(sessions.map(s => s.session_id)), [sessions]);

  // If selected session was deleted, clear selection
  useEffect(() => {
    if (selectedSession && !validSessionIds.has(selectedSession)) {
      setSelectedSession(null);
    }
  }, [validSessionIds, selectedSession]);

  const sessionPredMap = useMemo(() => {
    if (!selectedSession) return {};
    const map = {};
    allPreds.filter(p => p.session_id === selectedSession).forEach(p => { map[p.match_id] = p; });
    return map;
  }, [selectedSession, allPreds]);

  const sessionBracket = useMemo(() => {
    if (!selectedSession || Object.keys(sessionPredMap).length === 0) return null;
    return buildBracket(teams, matches, sessionPredMap);
  }, [sessionPredMap, teams, matches]);

  const groupMatches = matches.filter(m => m.phase === "group");

  const totalScore = useMemo(() => {
    if (!selectedSession) return 0;
    let pts = 0;
    groupMatches.forEach(m => {
      const pred = sessionPredMap[m.id];
      const real = realResults[m.id];
      if (pred && real && real.home_goals != null) pts += scoreGroupMatch(pred, real);
    });
    if (sessionBracket) {
      const allKO = [
        ...(sessionBracket.r32||[]), ...(sessionBracket.r16||[]),
        ...(sessionBracket.qf||[]),  ...(sessionBracket.sf||[]),
        ...(sessionBracket.final||[]),...(sessionBracket.third||[]),
      ];
      allKO.forEach(m => {
        const pred = sessionPredMap[m.id];
        const real = realResults[m.id];
        if (pred && real && real.home_goals != null)
          pts += scoreKnockoutMatch(pred, real, getMatchPhase(m.id));
      });
    }
    return pts;
  }, [sessionPredMap, sessionBracket, realResults, groupMatches]);

  // ── Delete ──────────────────────────────────────────────────
  async function handleDeleteSession(sessionId) {
    if (!confirm("Remover este palpiteiro e todos os seus palpites?")) return;
    setSaving(true);
    // Supabase
    try { await deleteSession(sessionId); } catch {}
    // localStorage — wipe both preds and session
    const lp = JSON.parse(localStorage.getItem("wc2026_preds") || "[]").filter(p => p.session_id !== sessionId);
    localStorage.setItem("wc2026_preds", JSON.stringify(lp));
    const ls = JSON.parse(localStorage.getItem("wc2026_sessions") || "[]").filter(s => s.session_id !== sessionId);
    localStorage.setItem("wc2026_sessions", JSON.stringify(ls));
    // Update context (App.jsx setSessions wrapper also writes LS)
    setSessions(prev => prev.filter(s => s.session_id !== sessionId));
    // Update local pred state
    setAllPreds(prev => prev.filter(p => p.session_id !== sessionId));
    if (selectedSession === sessionId) setSelectedSession(null);
    setSaving(false);
    showToast("🗑️ Palpiteiro removido!");
  }

  const koPhases = [
    { key:"r32",   label:"16-avos", matches: sessionBracket?.r32 },
    { key:"r16",   label:"Oitavas", matches: sessionBracket?.r16 },
    { key:"qf",    label:"Quartas", matches: sessionBracket?.qf },
    { key:"sf",    label:"Semis",   matches: sessionBracket?.sf },
    { key:"final", label:"Final",   matches: [...(sessionBracket?.final||[]),...(sessionBracket?.third||[])] },
  ];

  const sessionName = sessions.find(s => s.session_id === selectedSession)?.name;

  return (
    <div style={S.container}>
      {toast && <div style={S.toast}>{toast}</div>}

      <div style={S.header}>
        <button style={S.backBtn} onClick={() => setPage("home")}>← Início</button>
        <h1 style={S.title}>👁️ PALPITES</h1>
        <div style={S.headerSpacer} />
      </div>

      <div style={S.content}>
        {loading ? (
          <div style={S.loading}>Carregando...</div>
        ) : sessions.length === 0 ? (
          <div style={S.empty}>Nenhum palpiteiro ainda.</div>
        ) : (
          <>
            <p style={S.sectionLabel}>ESCOLHA O PALPITEIRO</p>
            <div style={S.sessionList}>
              {sessions.map(s => (
                <div key={s.session_id} style={S.sessionRow}>
                  <button
                    style={{ ...S.sessionBtn, ...(selectedSession === s.session_id ? S.sessionBtnActive : {}) }}
                    onClick={() => { setSelectedSession(selectedSession === s.session_id ? null : s.session_id); setActivePhase("groups"); }}
                  >
                    {s.name}
                  </button>
                  {isAdmin && (
                    <button style={S.deleteBtn} onClick={() => handleDeleteSession(s.session_id)} disabled={saving} title="Remover palpiteiro">
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>

            {selectedSession && sessionName && (
              <div style={S.predsView}>
                <div style={S.predsHeader}>
                  <div>
                    <h2 style={S.predsTitle}>{sessionName}</h2>
                    <span style={{ color:"rgba(255,255,255,0.5)", fontSize:"0.8rem", fontFamily:"Arial,sans-serif" }}>
                      Total: <strong style={{ color:"#10b981" }}>{totalScore} pts</strong>
                    </span>
                  </div>
                </div>

                {/* Phase tabs */}
                <div style={S.phaseTabs}>
                  <button style={{ ...S.phaseBtn, ...(activePhase==="groups"?S.phaseBtnActive:{}) }} onClick={()=>setActivePhase("groups")}>Grupos</button>
                  {koPhases.map(p => (
                    <button key={p.key} style={{ ...S.phaseBtn, ...(activePhase===p.key?S.phaseBtnActive:{}) }} onClick={()=>setActivePhase(p.key)}>{p.label}</button>
                  ))}
                </div>

                {/* Group matches */}
                {activePhase === "groups" && (
                  <div style={S.matchTable}>
                    {groupMatches.map(m => {
                      const ht = getTeamById(m.home_team_id);
                      const at = getTeamById(m.away_team_id);
                      const pred = sessionPredMap[m.id];
                      const real = realResults[m.id];
                      return (
                        <div key={m.id} style={{ ...S.matchRow, background: pred ? "rgba(255,255,255,0.03)" : "rgba(255,30,30,0.04)" }}>
                          <span style={S.groupLabel}>Gr.{m.group_letter}</span>
                          <span style={S.teamName}>{ht?.flag} {ht?.name}</span>
                          <span style={S.scoreCell}><ScoreDisplay pred={pred} real={real} matchId={m.id} /></span>
                          <span style={S.teamNameR}>{at?.name} {at?.flag}</span>
                          <span style={S.realScoreCell}><RealDisplay real={real} /></span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* KO phases */}
                {activePhase !== "groups" && (() => {
                  const phase = koPhases.find(p => p.key === activePhase);
                  const pm = phase?.matches || [];
                  if (!pm.length) return (
                    <p style={{ color:"rgba(255,255,255,0.3)", fontFamily:"Arial,sans-serif", fontSize:"0.85rem", padding:"1.5rem 0" }}>
                      {sessionBracket ? "Nenhuma partida ainda (fases anteriores incompletas)." : "Este palpite não tem dados de mata-mata."}
                    </p>
                  );
                  return (
                    <div style={S.matchTable}>
                      {pm.map(m => {
                        const homeId = m.home || m.home_team_id;
                        const awayId = m.away || m.away_team_id;
                        if (!homeId || !awayId) return (
                          <div key={m.id} style={{ ...S.matchRow, opacity:0.3 }}>
                            <span style={{ fontFamily:"Arial,sans-serif", fontSize:"0.8rem", color:"rgba(255,255,255,0.4)" }}>A definir — {m.id}</span>
                          </div>
                        );
                        const ht = getTeamById(homeId);
                        const at = getTeamById(awayId);
                        const pred = sessionPredMap[m.id];
                        const real = realResults[m.id];
                        return (
                          <div key={m.id} style={{ ...S.matchRow, background: pred ? "rgba(255,255,255,0.03)" : "rgba(255,30,30,0.04)" }}>
                            <span style={S.koLabel}>{m.id}</span>
                            <span style={S.teamName}>{ht?.flag} {ht?.name || homeId}</span>
                            <span style={S.scoreCell}><ScoreDisplay pred={pred} real={real} matchId={m.id} /></span>
                            <span style={S.teamNameR}>{at?.name || awayId} {at?.flag}</span>
                            <span style={S.realScoreCell}><RealDisplay real={real} /></span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const S = {
  container: { minHeight:"100vh", background:"linear-gradient(135deg,#0a0f1e,#0d1f3c)", fontFamily:"'Bebas Neue','Impact','Arial Narrow',sans-serif", color:"#fff" },
  header: { display:"flex", alignItems:"center", padding:"1rem 1.5rem", borderBottom:"1px solid rgba(240,192,64,0.15)", background:"rgba(0,0,0,0.3)" },
  backBtn: { background:"transparent", border:"1px solid rgba(255,255,255,0.2)", color:"rgba(255,255,255,0.7)", padding:"0.4rem 0.8rem", borderRadius:"6px", cursor:"pointer", fontSize:"0.85rem", fontFamily:"Arial,sans-serif" },
  title: { flex:1, textAlign:"center", fontSize:"1.8rem", color:"#f0c040", letterSpacing:"0.15em", margin:0 },
  headerSpacer: { width:"80px" },
  content: { maxWidth:"860px", margin:"0 auto", padding:"1.5rem 1rem" },
  loading: { textAlign:"center", color:"rgba(255,255,255,0.5)", fontFamily:"Arial,sans-serif", padding:"3rem" },
  empty: { textAlign:"center", color:"rgba(255,255,255,0.4)", fontFamily:"Arial,sans-serif", padding:"3rem" },
  sectionLabel: { fontSize:"0.7rem", letterSpacing:"0.2em", color:"rgba(240,192,64,0.7)", marginBottom:"0.75rem", fontFamily:"Arial,sans-serif" },
  sessionList: { display:"flex", flexDirection:"column", gap:"0.4rem", marginBottom:"1.5rem" },
  sessionRow: { display:"flex", alignItems:"center", gap:"0.5rem" },
  sessionBtn: { flex:1, padding:"0.5rem 1rem", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"8px", color:"rgba(255,255,255,0.7)", cursor:"pointer", fontSize:"0.85rem", fontFamily:"Arial,sans-serif", textAlign:"left" },
  sessionBtnActive: { background:"rgba(240,192,64,0.12)", borderColor:"#f0c040", color:"#f0c040" },
  deleteBtn: { background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:"6px", padding:"0.35rem 0.6rem", cursor:"pointer", fontSize:"0.9rem", flexShrink:0 },
  predsView: { marginTop:"0.5rem" },
  predsHeader: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1rem" },
  predsTitle: { fontSize:"1.3rem", color:"#f0c040", letterSpacing:"0.1em", margin:"0 0 0.2rem" },
  phaseTabs: { display:"flex", gap:"0.4rem", flexWrap:"wrap", marginBottom:"1rem" },
  phaseBtn: { padding:"0.35rem 0.85rem", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"20px", color:"rgba(255,255,255,0.6)", cursor:"pointer", fontSize:"0.78rem", fontFamily:"Arial,sans-serif" },
  phaseBtnActive: { background:"rgba(240,192,64,0.15)", borderColor:"#f0c040", color:"#f0c040" },
  matchTable: { display:"flex", flexDirection:"column", gap:"0.25rem" },
  matchRow: { display:"flex", alignItems:"center", gap:"0.5rem", padding:"0.4rem 0.6rem", borderRadius:"6px", minHeight:"36px" },
  groupLabel: { color:"rgba(240,192,64,0.6)", fontSize:"0.68rem", flexShrink:0, width:"32px", fontFamily:"Arial,sans-serif" },
  koLabel: { color:"rgba(240,192,64,0.5)", fontSize:"0.62rem", flexShrink:0, width:"55px", fontFamily:"'Bebas Neue',sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  teamName: { flex:1, color:"#fff", fontSize:"0.78rem", fontFamily:"Arial,sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  teamNameR: { flex:1, color:"#fff", fontSize:"0.78rem", fontFamily:"Arial,sans-serif", textAlign:"right", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  scoreCell: { flexShrink:0, textAlign:"center", minWidth:"90px" },
  realScoreCell: { flexShrink:0, minWidth:"55px", textAlign:"right" },
  toast: { position:"fixed", bottom:"1.5rem", right:"1.5rem", zIndex:9999, padding:"0.65rem 1.1rem", background:"rgba(16,185,129,0.95)", borderRadius:"8px", color:"#fff", fontFamily:"Arial,sans-serif", fontSize:"0.85rem", boxShadow:"0 4px 20px rgba(0,0,0,0.4)", pointerEvents:"none" },
};
