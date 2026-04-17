import { useState, useEffect, useMemo } from "react";
import { useApp } from "../App";
import { getAllPredictions, upsertPredictions } from "../lib/supabase";
import { buildBracket } from "../lib/bracket";
import { scoreGroupMatch, scoreKnockoutMatch, getKnockoutWinnerSide, getMatchPhase } from "../lib/scoring";

function resultColor(pred, real, isKO) {
  if (!pred || pred.home_goals == null) return "rgba(255,255,255,0.25)";
  if (!real || real.home_goals == null) return "#ffffff";
  if (isKO) {
    const rs = getKnockoutWinnerSide(real), ps = getKnockoutWinnerSide(pred);
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
      <span style={{ color:col, fontFamily:"'Bebas Neue',sans-serif", fontSize:"1rem" }}>
        {pred.home_goals}×{pred.away_goals}
        {pred.extra_time && <span style={{ fontSize:"0.6rem", opacity:0.7 }}> EP</span>}
        {pred.penalties  && <span style={{ fontSize:"0.6rem", opacity:0.7 }}> P</span>}
        {pred.penalty_winner && <span style={{ fontSize:"0.6rem", opacity:0.6 }}> ({pred.penalty_winner === "home" ? "⬅" : "➡"})</span>}
      </span>
      {pts != null && (
        <span style={{ fontSize:"0.65rem", color:pts>0?"#10b981":"rgba(255,255,255,0.3)", fontFamily:"Arial,sans-serif", background:"rgba(0,0,0,0.3)", borderRadius:"4px", padding:"0 3px" }}>
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
  const { sessions, setSessions, matches, teams, realResults, setPage, getTeamById, isAdmin,
          deleteSessionById, saveSessionPredictions, refreshSessions } = useApp();
  const [allPreds, setAllPreds] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhase, setActivePhase] = useState("groups");
  const [editPreds, setEditPreds] = useState(null); // null = view mode
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  useEffect(() => { loadPreds(); }, [sessions]);

  async function loadPreds() {
    setLoading(true);
    try {
      const data = await getAllPredictions() || [];
      setAllPreds(data);
    } catch (err) { console.error("loadPreds error:", err); }
    setLoading(false);
  }

  // Clear selected if session was deleted
  useEffect(() => {
    if (selectedSession && !sessions.some(s => s.session_id === selectedSession)) {
      setSelectedSession(null); setEditPreds(null);
    }
  }, [sessions, selectedSession]);

  const sessionPredMap = useMemo(() => {
    if (!selectedSession) return {};
    const m = {};
    allPreds.filter(p => p.session_id === selectedSession).forEach(p => { m[p.match_id] = p; });
    return m;
  }, [selectedSession, allPreds]);

  const sessionBracket = useMemo(() => {
    if (!selectedSession || !Object.keys(sessionPredMap).length) return null;
    return buildBracket(teams, matches, sessionPredMap);
  }, [sessionPredMap, teams, matches]);

  const editBracket = useMemo(() => {
    if (!editPreds) return null;
    return buildBracket(teams, matches, editPreds);
  }, [editPreds, teams, matches]);

  const groupMatches = matches.filter(m => m.phase === "group");

  const totalScore = useMemo(() => {
    if (!selectedSession) return 0;
    let pts = 0;
    const predMap = editPreds || sessionPredMap;
    groupMatches.forEach(m => {
      const pred = predMap[m.id], real = realResults[m.id];
      if (pred && real && real.home_goals != null) pts += scoreGroupMatch(pred, real);
    });
    const b = editPreds ? editBracket : sessionBracket;
    if (b) {
      [...(b.r32||[]),...(b.r16||[]),...(b.qf||[]),...(b.sf||[]),...(b.final||[]),...(b.third||[])].forEach(m => {
        const pred = predMap[m.id], real = realResults[m.id];
        if (pred && real && real.home_goals != null)
          pts += scoreKnockoutMatch(pred, real, getMatchPhase(m.id));
      });
    }
    return pts;
  }, [sessionPredMap, editPreds, sessionBracket, editBracket, realResults, groupMatches]);

  async function handleDelete(sid) {
    if (!confirm("Remover este palpiteiro e todos os seus palpites?")) return;
    setSaving(true);
    try {
      await deleteSessionById(sid);
      setAllPreds(prev => prev.filter(p => p.session_id !== sid));
      if (selectedSession === sid) { setSelectedSession(null); setEditPreds(null); }
      showToast("🗑️ Removido!");
    } catch (err) { showToast("Erro: " + err.message); }
    setSaving(false);
  }

  function startEdit(session) {
    const m = {};
    allPreds.filter(p => p.session_id === session.session_id).forEach(p => { m[p.match_id] = { ...p }; });
    setEditPreds(m);
    setSelectedSession(session.session_id);
    setActivePhase("groups");
  }

  async function saveEdit() {
    if (!selectedSession || !editPreds) return;
    setSaving(true);
    const name = sessions.find(s => s.session_id === selectedSession)?.name || "";
    const predArray = Object.values(editPreds);
    try {
      await saveSessionPredictions(selectedSession, name, predArray);
      setAllPreds(prev => [...prev.filter(p => p.session_id !== selectedSession), ...predArray.map(p => ({ ...p, session_id: selectedSession, predictor_name: name }))]);
      setEditPreds(null);
      showToast("✅ Palpites atualizados!");
    } catch (err) { showToast("Erro: " + err.message); }
    setSaving(false);
  }

  function setEditVal(matchId, field, val) {
    setEditPreds(prev => ({ ...prev, [matchId]: { ...(prev?.[matchId] || {}), match_id: matchId, [field]: val } }));
  }

  const predMap = editPreds || sessionPredMap;
  const bracket = editPreds ? editBracket : sessionBracket;
  const sessionName = sessions.find(s => s.session_id === selectedSession)?.name;

  const koPhases = [
    { key:"r32",   label:"16-avos", matches: bracket?.r32 },
    { key:"r16",   label:"Oitavas", matches: bracket?.r16 },
    { key:"qf",    label:"Quartas", matches: bracket?.qf },
    { key:"sf",    label:"Semis",   matches: bracket?.sf },
    { key:"final", label:"Final",   matches: [...(bracket?.final||[]),...(bracket?.third||[])] },
  ];

  return (
    <div style={S.container}>
      {toast && <div style={S.toast}>{toast}</div>}
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => setPage("home")}>← Início</button>
        <h1 style={S.title}>👁️ PALPITES</h1>
        <div style={S.headerSpacer} />
      </div>

      <div style={S.content}>
        {loading ? <div style={S.loading}>Carregando...</div>
          : sessions.length === 0 ? <div style={S.empty}>Nenhum palpiteiro ainda.</div>
          : (
          <>
            <p style={S.sectionLabel}>ESCOLHA O PALPITEIRO</p>
            <div style={S.sessionList}>
              {sessions.map(s => (
                <div key={s.session_id} style={S.sessionRow}>
                  <button
                    style={{ ...S.sessionBtn, ...(selectedSession===s.session_id ? S.sessionBtnActive : {}) }}
                    onClick={() => { setSelectedSession(s.session_id===selectedSession?null:s.session_id); setEditPreds(null); setActivePhase("groups"); }}
                  >{s.name}</button>
                  {isAdmin && <>
                    <button style={S.editBtn} onClick={() => startEdit(s)} title="Editar">✏️</button>
                    <button style={S.deleteBtn} onClick={() => handleDelete(s.session_id)} disabled={saving} title="Remover">🗑️</button>
                  </>}
                </div>
              ))}
            </div>

            {selectedSession && sessionName && (
              <div style={S.predsView}>
                <div style={S.predsHeader}>
                  <div>
                    <h2 style={S.predsTitle}>{editPreds ? "✏️ Editando: " : ""}{sessionName}</h2>
                    <span style={{ color:"rgba(255,255,255,0.5)", fontSize:"0.8rem", fontFamily:"Arial,sans-serif" }}>
                      Total: <strong style={{ color:"#10b981" }}>{totalScore} pts</strong>
                    </span>
                  </div>
                  {editPreds && (
                    <div style={{ display:"flex", gap:"0.5rem" }}>
                      <button style={S.cancelBtn} onClick={() => setEditPreds(null)}>Cancelar</button>
                      <button style={S.saveBtn} onClick={saveEdit} disabled={saving}>{saving ? "..." : "✅ Salvar"}</button>
                    </div>
                  )}
                </div>

                {/* Phase tabs */}
                <div style={S.phaseTabs}>
                  <button style={{ ...S.phaseBtn, ...(activePhase==="groups"?S.phaseBtnActive:{}) }} onClick={()=>setActivePhase("groups")}>Grupos</button>
                  {koPhases.map(p=>(
                    <button key={p.key} style={{ ...S.phaseBtn, ...(activePhase===p.key?S.phaseBtnActive:{}) }} onClick={()=>setActivePhase(p.key)}>{p.label}</button>
                  ))}
                </div>

                {/* Group matches */}
                {activePhase==="groups" && (
                  <div style={S.matchTable}>
                    {groupMatches.map(m => {
                      const ht=getTeamById(m.home_team_id), at=getTeamById(m.away_team_id);
                      const pred=predMap[m.id], real=realResults[m.id];
                      if (editPreds) {
                        const ep=editPreds[m.id]||{};
                        return (
                          <div key={m.id} style={S.editRow}>
                            <span style={S.teamNameEdit}>{ht?.flag} {ht?.name}</span>
                            <div style={S.editScoreArea}>
                              <input style={S.editInput} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
                                value={ep.home_goals??""} onChange={e=>{const c=e.target.value.replace(/[^0-9]/g,"");setEditVal(m.id,"home_goals",c===""?undefined:parseInt(c,10));}} placeholder="–"/>
                              <span style={{color:"rgba(255,255,255,0.3)",fontFamily:"Arial"}}>×</span>
                              <input style={S.editInput} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
                                value={ep.away_goals??""} onChange={e=>{const c=e.target.value.replace(/[^0-9]/g,"");setEditVal(m.id,"away_goals",c===""?undefined:parseInt(c,10));}} placeholder="–"/>
                            </div>
                            <span style={{...S.teamNameEdit,textAlign:"right"}}>{at?.name} {at?.flag}</span>
                          </div>
                        );
                      }
                      return (
                        <div key={m.id} style={{ ...S.matchRow, background:pred?"rgba(255,255,255,0.03)":"rgba(255,30,30,0.04)" }}>
                          <span style={S.groupLabel}>Gr.{m.group_letter}</span>
                          <span style={S.teamName}>{ht?.flag} {ht?.name}</span>
                          <span style={S.scoreCell}><ScoreDisplay pred={pred} real={real} matchId={m.id}/></span>
                          <span style={S.teamNameR}>{at?.name} {at?.flag}</span>
                          <span style={S.realScoreCell}><RealDisplay real={real}/></span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* KO phases */}
                {activePhase!=="groups" && (() => {
                  const phase=koPhases.find(p=>p.key===activePhase);
                  const pm=phase?.matches||[];
                  if (!pm.length) return <p style={{color:"rgba(255,255,255,0.3)",fontFamily:"Arial,sans-serif",fontSize:"0.85rem",padding:"1.5rem 0"}}>{bracket?"Fase anterior incompleta.":"Sem dados de mata-mata."}</p>;
                  return (
                    <div style={S.matchTable}>
                      {pm.map(m => {
                        const homeId=m.home||m.home_team_id, awayId=m.away||m.away_team_id;
                        if (!homeId||!awayId) return <div key={m.id} style={{...S.matchRow,opacity:0.3}}><span style={{fontFamily:"Arial,sans-serif",fontSize:"0.8rem",color:"rgba(255,255,255,0.4)"}}>A definir</span></div>;
                        const ht=getTeamById(homeId), at=getTeamById(awayId);
                        const pred=predMap[m.id], real=realResults[m.id];
                        if (editPreds) {
                          const ep=editPreds[m.id]||{};
                          const hg=ep.home_goals, ag=ep.away_goals, isDraw=hg!=null&&ag!=null&&hg===ag;
                          return (
                            <div key={m.id} style={{...S.editRow,flexDirection:"column",alignItems:"stretch",gap:"0.3rem"}}>
                              <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                                <span style={S.teamNameEdit}>{ht?.flag} {ht?.name||homeId}</span>
                                <div style={S.editScoreArea}>
                                  <input style={S.editInput} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} value={hg??""} onChange={e=>{const c=e.target.value.replace(/[^0-9]/g,"");setEditVal(m.id,"home_goals",c===""?undefined:parseInt(c,10));}} placeholder="–"/>
                                  <span style={{color:"rgba(255,255,255,0.3)",fontFamily:"Arial"}}>×</span>
                                  <input style={S.editInput} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} value={ag??""} onChange={e=>{const c=e.target.value.replace(/[^0-9]/g,"");setEditVal(m.id,"away_goals",c===""?undefined:parseInt(c,10));}} placeholder="–"/>
                                </div>
                                <span style={{...S.teamNameEdit,textAlign:"right"}}>{at?.name||awayId} {at?.flag}</span>
                              </div>
                              <div style={{display:"flex",gap:"0.75rem",paddingLeft:"0.25rem"}}>
                                <label style={S.koCheck}><input type="checkbox" style={{accentColor:"#f0c040"}} checked={!!ep.extra_time} onChange={e=>setEditVal(m.id,"extra_time",e.target.checked)}/> Prorr.</label>
                                {ep.extra_time&&<label style={S.koCheck}><input type="checkbox" style={{accentColor:"#f0c040"}} checked={!!ep.penalties} onChange={e=>setEditVal(m.id,"penalties",e.target.checked)}/> Pênaltis</label>}
                                {isDraw&&ep.penalties&&<>
                                  <button style={{...S.penBtn,...(ep.penalty_winner==="home"?S.penBtnA:{})}} onClick={()=>setEditVal(m.id,"penalty_winner","home")}>{ht?.flag} {(ht?.name||homeId).slice(0,10)}</button>
                                  <button style={{...S.penBtn,...(ep.penalty_winner==="away"?S.penBtnA:{})}} onClick={()=>setEditVal(m.id,"penalty_winner","away")}>{at?.flag} {(at?.name||awayId).slice(0,10)}</button>
                                </>}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key={m.id} style={{...S.matchRow,background:pred?"rgba(255,255,255,0.03)":"rgba(255,30,30,0.04)"}}>
                            <span style={S.koLabel}>{m.id}</span>
                            <span style={S.teamName}>{ht?.flag} {ht?.name||homeId}</span>
                            <span style={S.scoreCell}><ScoreDisplay pred={pred} real={real} matchId={m.id}/></span>
                            <span style={S.teamNameR}>{at?.name||awayId} {at?.flag}</span>
                            <span style={S.realScoreCell}><RealDisplay real={real}/></span>
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
  container:{minHeight:"100vh",background:"linear-gradient(135deg,#0a0f1e,#0d1f3c)",fontFamily:"'Bebas Neue','Impact','Arial Narrow',sans-serif",color:"#fff"},
  header:{display:"flex",alignItems:"center",padding:"1rem 1.5rem",borderBottom:"1px solid rgba(240,192,64,0.15)",background:"rgba(0,0,0,0.3)"},
  backBtn:{background:"transparent",border:"1px solid rgba(255,255,255,0.2)",color:"rgba(255,255,255,0.7)",padding:"0.4rem 0.8rem",borderRadius:"6px",cursor:"pointer",fontSize:"0.85rem",fontFamily:"Arial,sans-serif"},
  title:{flex:1,textAlign:"center",fontSize:"1.8rem",color:"#f0c040",letterSpacing:"0.15em",margin:0},
  headerSpacer:{width:"80px"},
  content:{maxWidth:"860px",margin:"0 auto",padding:"1.5rem 1rem"},
  loading:{textAlign:"center",color:"rgba(255,255,255,0.5)",fontFamily:"Arial,sans-serif",padding:"3rem"},
  empty:{textAlign:"center",color:"rgba(255,255,255,0.4)",fontFamily:"Arial,sans-serif",padding:"3rem"},
  sectionLabel:{fontSize:"0.7rem",letterSpacing:"0.2em",color:"rgba(240,192,64,0.7)",marginBottom:"0.75rem",fontFamily:"Arial,sans-serif"},
  sessionList:{display:"flex",flexDirection:"column",gap:"0.4rem",marginBottom:"1.5rem"},
  sessionRow:{display:"flex",alignItems:"center",gap:"0.5rem"},
  sessionBtn:{flex:1,padding:"0.5rem 1rem",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"8px",color:"rgba(255,255,255,0.7)",cursor:"pointer",fontSize:"0.85rem",fontFamily:"Arial,sans-serif",textAlign:"left"},
  sessionBtnActive:{background:"rgba(240,192,64,0.12)",borderColor:"#f0c040",color:"#f0c040"},
  editBtn:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"6px",padding:"0.3rem 0.5rem",cursor:"pointer",fontSize:"0.85rem"},
  deleteBtn:{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:"6px",padding:"0.3rem 0.5rem",cursor:"pointer",fontSize:"0.85rem"},
  predsView:{marginTop:"0.5rem"},
  predsHeader:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem"},
  predsTitle:{fontSize:"1.3rem",color:"#f0c040",letterSpacing:"0.1em",margin:"0 0 0.2rem"},
  cancelBtn:{padding:"0.5rem 1rem",background:"transparent",border:"1px solid rgba(255,255,255,0.2)",borderRadius:"6px",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontFamily:"Arial,sans-serif"},
  saveBtn:{padding:"0.5rem 1.25rem",background:"linear-gradient(135deg,#f0c040,#e6a800)",border:"none",borderRadius:"6px",color:"#0a0f1e",cursor:"pointer",fontFamily:"Arial,sans-serif",fontWeight:"bold"},
  phaseTabs:{display:"flex",gap:"0.4rem",flexWrap:"wrap",marginBottom:"1rem"},
  phaseBtn:{padding:"0.35rem 0.85rem",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"20px",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:"0.78rem",fontFamily:"Arial,sans-serif"},
  phaseBtnActive:{background:"rgba(240,192,64,0.15)",borderColor:"#f0c040",color:"#f0c040"},
  matchTable:{display:"flex",flexDirection:"column",gap:"0.25rem"},
  matchRow:{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.4rem 0.6rem",borderRadius:"6px",minHeight:"36px"},
  groupLabel:{color:"rgba(240,192,64,0.6)",fontSize:"0.68rem",flexShrink:0,width:"32px",fontFamily:"Arial,sans-serif"},
  koLabel:{color:"rgba(240,192,64,0.5)",fontSize:"0.62rem",flexShrink:0,width:"60px",fontFamily:"'Bebas Neue',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  teamName:{flex:1,color:"#fff",fontSize:"0.78rem",fontFamily:"Arial,sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  teamNameR:{flex:1,color:"#fff",fontSize:"0.78rem",fontFamily:"Arial,sans-serif",textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  scoreCell:{flexShrink:0,textAlign:"center",minWidth:"90px"},
  realScoreCell:{flexShrink:0,minWidth:"55px",textAlign:"right"},
  editRow:{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.3rem 0.25rem",borderBottom:"1px solid rgba(255,255,255,0.04)"},
  teamNameEdit:{flex:1,fontSize:"0.75rem",fontFamily:"Arial,sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#fff"},
  editScoreArea:{display:"flex",gap:"0.3rem",alignItems:"center",flexShrink:0},
  editInput:{width:"40px",height:"36px",textAlign:"center",background:"rgba(0,0,0,0.4)",border:"1px solid rgba(240,192,64,0.3)",borderRadius:"6px",color:"#fff",fontSize:"1.1rem",fontFamily:"'Bebas Neue',sans-serif",outline:"none"},
  koCheck:{display:"flex",alignItems:"center",gap:"0.25rem",cursor:"pointer",color:"rgba(255,255,255,0.5)",fontSize:"0.72rem",fontFamily:"Arial,sans-serif"},
  penBtn:{padding:"0.2rem 0.45rem",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"4px",color:"rgba(255,255,255,0.7)",cursor:"pointer",fontSize:"0.7rem",fontFamily:"Arial,sans-serif"},
  penBtnA:{background:"rgba(240,192,64,0.2)",borderColor:"#f0c040",color:"#f0c040"},
  toast:{position:"fixed",bottom:"1.5rem",right:"1.5rem",zIndex:9999,padding:"0.65rem 1.1rem",background:"rgba(16,185,129,0.95)",borderRadius:"8px",color:"#fff",fontFamily:"Arial,sans-serif",fontSize:"0.85rem",boxShadow:"0 4px 20px rgba(0,0,0,0.4)",pointerEvents:"none"},
};
