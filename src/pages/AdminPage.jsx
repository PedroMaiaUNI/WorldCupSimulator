import { useState, useMemo, useEffect } from "react";
import { useApp } from "../App";
import { GROUPS } from "../lib/teamsData";
import { upsertTeam, deleteTeam, upsertRealResults, deleteAllRealResults, upsertPredictions, upsertPredictorSession, deleteSession, deletePredictionsForSession, getAllPredictions } from "../lib/supabase";
import { calcGroupStandings, scoreGroupMatch, scoreKnockoutMatch, getKnockoutWinnerSide, getMatchPhase } from "../lib/scoring";
import { buildBracket, generateRandomResults, generateRandomPredictions } from "../lib/bracket";
import TeamBadge from "../components/TeamBadge";

const TABS = ["Times", "Grupos", "Resultados", "Palpites", "Config"];

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ position:"fixed", bottom:"1.5rem", right:"1.5rem", zIndex:9999,
      padding:"0.65rem 1.1rem", background:"rgba(16,185,129,0.95)", borderRadius:"8px",
      color:"#fff", fontFamily:"Arial,sans-serif", fontSize:"0.85rem",
      boxShadow:"0 4px 20px rgba(0,0,0,0.4)", pointerEvents:"none",
      animation:"fadeInUp 0.2s ease" }}>{msg}</div>
  );
}

export default function AdminPage() {
  const { setPage } = useApp();
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState("");

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  return (
    <div style={S.container}>
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <Toast msg={toast} />
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => setPage("home")}>← Sair</button>
        <h1 style={S.title}>⚙ PAINEL ADMIN</h1>
        <div style={S.headerSpacer} />
      </div>
      <div style={S.tabs}>
        {TABS.map((t, i) => (
          <button key={t} style={{ ...S.tab, ...(tab === i ? S.tabActive : {}) }} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>
      <div style={S.content}>
        {tab === 0 && <TeamsTab showToast={showToast} />}
        {tab === 1 && <GroupsTab showToast={showToast} />}
        {tab === 2 && <ResultsTab showToast={showToast} />}
        {tab === 3 && <PalpitesTab showToast={showToast} />}
        {tab === 4 && <ConfigTab showToast={showToast} />}
      </div>
    </div>
  );
}

// ── TEAMS TAB ──────────────────────────────────────────────
function TeamsTab({ showToast }) {
  const { teams, setTeams } = useApp();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ id:"", name:"", flag:"🏳️", group:"A" });
  const [saving, setSaving] = useState(false);

  function startEdit(t) { setEditing(t.id); setForm({ ...t }); }
  function startNew() { setEditing("__new__"); setForm({ id:"", name:"", flag:"🏳️", group:"A" }); }

  async function saveTeam() {
    if (!form.id || !form.name || !form.flag || !form.group) { showToast("⚠ Preencha todos os campos!"); return; }
    setSaving(true);
    const maxOrder = Math.max(0, ...teams.map(t => t.sort_order || 0));
    const localTeam = { ...form, sort_order: editing === "__new__" ? maxOrder + 1 : (form.sort_order || maxOrder + 1) };
    const dbTeam = { id:localTeam.id, name:localTeam.name, flag:localTeam.flag, group_letter:localTeam.group, sort_order:localTeam.sort_order };
    try { await upsertTeam(dbTeam); } catch {}
    if (editing === "__new__") setTeams(prev => [...prev, localTeam]);
    else setTeams(prev => prev.map(t => t.id === form.id ? localTeam : t));
    setEditing(null); setSaving(false); showToast("✅ Time salvo!");
  }

  async function removeTeam(id) {
    if (!confirm("Remover este time?")) return;
    try { await deleteTeam(id); } catch {}
    setTeams(prev => prev.filter(t => t.id !== id));
    showToast("🗑️ Time removido");
  }

  const sorted = [...teams].sort((a,b) => (a.sort_order??999)-(b.sort_order??999));
  return (
    <div>
      <div style={S.sectionHeader}>
        <p style={S.sectionTitle}>TIMES ({teams.length}/48)</p>
        <button style={S.addBtn} onClick={startNew}>+ Adicionar</button>
      </div>
      {editing && (
        <div style={S.editForm}>
          <h3 style={S.formTitle}>{editing==="__new__"?"Novo Time":"Editar Time"}</h3>
          <div style={S.formGrid}>
            <div style={S.formField}><label style={S.formLabel}>ID</label><input style={S.formInput} value={form.id} onChange={e=>setForm(f=>({...f,id:e.target.value.toUpperCase()}))} disabled={editing!=="__new__"} placeholder="BRA" maxLength={6}/></div>
            <div style={S.formField}><label style={S.formLabel}>Nome</label><input style={S.formInput} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Brasil" maxLength={40}/></div>
            <div style={S.formField}><label style={S.formLabel}>Bandeira</label><input style={S.formInput} value={form.flag} onChange={e=>setForm(f=>({...f,flag:e.target.value}))} placeholder="🇧🇷" maxLength={10}/></div>
            <div style={S.formField}><label style={S.formLabel}>Grupo</label><select style={S.formInput} value={form.group} onChange={e=>setForm(f=>({...f,group:e.target.value}))}>{GROUPS.map(g=><option key={g} value={g}>Grupo {g}</option>)}</select></div>
          </div>
          <div style={S.formActions}>
            <button style={S.cancelBtn} onClick={()=>setEditing(null)}>Cancelar</button>
            <button style={S.saveBtn} onClick={saveTeam} disabled={saving}>{saving?"Salvando...":"✅ Salvar"}</button>
          </div>
        </div>
      )}
      {GROUPS.map(g => {
        const gt = sorted.filter(t=>(t.group||t.group_letter)===g);
        return (
          <div key={g} style={S.groupSection}>
            <h4 style={S.groupSectionTitle}>GRUPO {g} ({gt.length}/4)</h4>
            {gt.map(t=>(
              <div key={t.id} style={S.teamRow}>
                <TeamBadge team={t} small/>
                <div style={S.teamActions}><button style={S.editBtn} onClick={()=>startEdit(t)}>✏️</button><button style={S.deleteBtn} onClick={()=>removeTeam(t.id)}>🗑️</button></div>
              </div>
            ))}
            {gt.length<4&&<div style={S.warningRow}>⚠ Grupo incompleto ({4-gt.length} vagas)</div>}
          </div>
        );
      })}
    </div>
  );
}

// ── GROUPS TAB ──────────────────────────────────────────────
function GroupsTab({ showToast }) {
  const { teams, setTeams } = useApp();
  const [dragging, setDragging] = useState(null);
  const sorted = [...teams].sort((a,b)=>(a.sort_order??999)-(b.sort_order??999));
  return (
    <div>
      <p style={S.sectionTitle}>EDITAR GRUPOS</p>
      <p style={{color:"rgba(255,255,255,0.4)",fontSize:"0.8rem",fontFamily:"Arial,sans-serif",marginBottom:"1rem"}}>Arraste ou use os botões.</p>
      <div style={S.groupsGrid}>
        {GROUPS.map(g=>{
          const gt=sorted.filter(t=>(t.group||t.group_letter)===g);
          return (
            <div key={g} style={S.groupCard} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(dragging){setTeams(prev=>prev.map(t=>t.id===dragging?{...t,group:g,group_letter:g}:t));showToast(`→ Grupo ${g}`);}}}>
              <h4 style={S.groupCardTitle}>GRUPO {g}</h4>
              {gt.map(t=>(
                <div key={t.id} style={S.draggableTeam} draggable onDragStart={()=>setDragging(t.id)} onDragEnd={()=>setDragging(null)}>
                  <span>{t.flag}</span>
                  <span style={{fontSize:"0.75rem",fontFamily:"Arial,sans-serif",color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{t.name}</span>
                  <div style={S.moveBtns}>{GROUPS.filter(g2=>g2!==g).map(g2=><button key={g2} style={S.moveBtn} onClick={()=>{setTeams(prev=>prev.map(t2=>t2.id===t.id?{...t2,group:g2,group_letter:g2}:t2));showToast(`→ Grupo ${g2}`);}} title={`→ ${g2}`}>{g2}</button>)}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── RESULTS TAB ──────────────────────────────────────────────
function ResultsTab({ showToast }) {
  const { teams, matches, realResults, setRealResults, getTeamById, sessions, setSessions, useFallback } = useApp();
  const [activePhase, setActivePhase] = useState("groups");
  const [activeGroup, setActiveGroup] = useState("A");
  const [localVals, setLocalVals] = useState({});
  const [saving, setSaving] = useState(false);
  const [fakeName, setFakeName] = useState("");
  const [genLoading, setGenLoading] = useState(false);

  const bracket = useMemo(() => buildBracket(teams, matches, realResults), [teams, matches, realResults]);

  // Live standings (merge real + local)
  const groupStandings = useMemo(() => {
    const groupTeams = teams.filter(t=>(t.group||t.group_letter)===activeGroup).sort((a,b)=>(a.sort_order??999)-(b.sort_order??999)).map(t=>t.id);
    const gm = matches.filter(m=>m.phase==="group"&&m.group_letter===activeGroup);
    const merged = {};
    gm.forEach(m => {
      const real = realResults[m.id]||{};
      const loc = localVals[m.id]||{};
      const hg = loc.home!==undefined&&loc.home!==""?parseInt(loc.home,10):real.home_goals;
      const ag = loc.away!==undefined&&loc.away!==""?parseInt(loc.away,10):real.away_goals;
      if (hg!=null&&!isNaN(hg)&&ag!=null&&!isNaN(ag)) merged[m.id]={home_goals:hg,away_goals:ag};
    });
    return calcGroupStandings(groupTeams, gm, merged);
  }, [teams, matches, realResults, localVals, activeGroup]);

  function getVal(matchId, field) {
    const loc = localVals[matchId];
    if (loc&&loc[field]!==undefined) return loc[field];
    const r = realResults[matchId];
    if (!r) return (field==="home"||field==="away") ? "" : false;
    if (field==="home") return r.home_goals??"";
    if (field==="away") return r.away_goals??"";
    return r[field]??false;
  }

  function setVal(matchId, field, v) {
    setLocalVals(prev=>({...prev,[matchId]:{...prev[matchId],[field]:v}}));
  }

  async function commitMatch(matchId, homeId, awayId, isKO) {
    const loc = localVals[matchId]||{};
    const prev = realResults[matchId]||{};
    const hgRaw = loc.home!==undefined?loc.home:prev.home_goals;
    const agRaw = loc.away!==undefined?loc.away:prev.away_goals;
    const hg = hgRaw!==""&&hgRaw!=null?parseInt(hgRaw,10):undefined;
    const ag = agRaw!==""&&agRaw!=null?parseInt(agRaw,10):undefined;
    if (hg==null||isNaN(hg)||ag==null||isNaN(ag)) return;
    const result = {match_id:matchId,home_team_id:homeId,away_team_id:awayId,home_goals:hg,away_goals:ag};
    if (isKO) {
      result.extra_time = !!(loc.extra_time??prev.extra_time);
      result.penalties = !!(loc.penalties??prev.penalties);
      result.penalty_winner = loc.penalty_winner??prev.penalty_winner??null;
    }
    setRealResults(prev=>({...prev,[matchId]:result}));
    try { await upsertRealResults([result]); showToast("✅ Salvo!"); }
    catch { showToast("✅ Salvo localmente"); }
  }

  async function randomizeAll() {
    if (!confirm("Gerar resultados aleatórios para TODOS os jogos?")) return;
    setSaving(true);
    const newResults = generateRandomResults(teams, matches);
    const toSave = Object.values(newResults);
    setRealResults(prev=>({...prev,...newResults}));
    setLocalVals({});
    try { await upsertRealResults(toSave); showToast(`✅ ${toSave.length} resultados gerados!`); }
    catch { showToast(`✅ ${toSave.length} gerados localmente!`); }
    setSaving(false);
  }

  async function clearAll() {
    if (!confirm("Apagar TODOS os resultados reais?")) return;
    setSaving(true);
    setRealResults({}); setLocalVals({});
    try { await deleteAllRealResults(); showToast("🗑️ Resultados apagados!"); }
    catch { showToast("🗑️ Apagados localmente!"); }
    setSaving(false);
  }

  // ── Duplicate name check ──────────────────────────────────
  function nameExists(name) {
    const norm = name.trim().toLowerCase();
    const localSessions = JSON.parse(localStorage.getItem("wc2026_sessions")||"[]");
    const allSessions = [...sessions, ...localSessions];
    return allSessions.some(s => s.name.trim().toLowerCase() === norm);
  }

  // ── Random predictor ──────────────────────────────────────
  async function generateRandomPredictor() {
    const name = fakeName.trim();
    if (!name) { showToast("⚠ Digite um nome!"); return; }
    if (nameExists(name)) { showToast(`⚠ "${name}" já existe!`); return; }
    setGenLoading(true);
    const sessionId = `${name.replace(/\s+/g,"_")}_${Date.now()}`;

    // Generate all preds iteratively (round by round)
    const predMap = generateRandomPredictions(teams, matches);
    const predArray = Object.values(predMap).map(p=>({...p,session_id:sessionId,predictor_name:name}));
    const sessionPayload = {session_id:sessionId,name,is_complete:true,score:0};

    const existingPreds = JSON.parse(localStorage.getItem("wc2026_preds")||"[]");
    localStorage.setItem("wc2026_preds",JSON.stringify([...existingPreds,...predArray]));
    const existingSessions = JSON.parse(localStorage.getItem("wc2026_sessions")||"[]");
    localStorage.setItem("wc2026_sessions",JSON.stringify([...existingSessions,sessionPayload]));
    setSessions(prev=>[...prev,sessionPayload]);

    if (!useFallback) {
      try { await upsertPredictorSession(sessionPayload); await upsertPredictions(predArray); } catch {}
    }
    setFakeName(""); setGenLoading(false);
    showToast(`✅ "${name}" gerado! (${predArray.length} palpites)`);
  }

  const groupMatchesList = matches.filter(m=>m.phase==="group"&&m.group_letter===activeGroup);
  const koPhases = [
    {key:"r32",label:"16-avos",matches:bracket.r32},
    {key:"r16",label:"Oitavas",matches:bracket.r16},
    {key:"qf", label:"Quartas",matches:bracket.qf},
    {key:"sf", label:"Semis",  matches:bracket.sf},
    {key:"final",label:"Final",matches:[...(bracket.final||[]),...(bracket.third||[])]},
  ];

  return (
    <div>
      <div style={S.sectionHeader}>
        <p style={S.sectionTitle}>RESULTADOS REAIS</p>
        <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
          <button style={{...S.addBtn,background:"rgba(240,192,64,0.15)",borderColor:"rgba(240,192,64,0.4)",color:"#f0c040"}} onClick={randomizeAll} disabled={saving}>🎲 Randomizar tudo</button>
          <button style={{...S.addBtn,background:"rgba(239,68,68,0.15)",borderColor:"rgba(239,68,68,0.4)",color:"#f87171"}} onClick={clearAll} disabled={saving}>🗑️ Limpar tudo</button>
        </div>
      </div>

      {/* Random predictor */}
      <div style={S.fakePredBox}>
        <span style={S.fakePredLabel}>🎯 GERAR PALPITEIRO ALEATÓRIO</span>
        <div style={{display:"flex",gap:"0.5rem",marginTop:"0.5rem"}}>
          <input style={S.fakeInput} placeholder="Nome único do palpiteiro" value={fakeName}
            onChange={e=>setFakeName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&generateRandomPredictor()}/>
          <button style={{...S.addBtn,flexShrink:0}} onClick={generateRandomPredictor} disabled={genLoading}>
            {genLoading?"...":"Gerar"}
          </button>
        </div>
        <p style={{color:"rgba(255,255,255,0.3)",fontSize:"0.7rem",fontFamily:"Arial,sans-serif",margin:"0.3rem 0 0"}}>
          Gera palpites aleatórios completos (grupos + todas as fases de mata-mata). Nome deve ser único.
        </p>
      </div>

      {/* Phase tabs */}
      <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:"1rem"}}>
        <button style={{...S.phaseBtn,...(activePhase==="groups"?S.phaseBtnActive:{})}} onClick={()=>setActivePhase("groups")}>Grupos</button>
        {koPhases.map(p=>(
          <button key={p.key} style={{...S.phaseBtn,...(activePhase===p.key?S.phaseBtnActive:{})}} onClick={()=>setActivePhase(p.key)}>{p.label}</button>
        ))}
      </div>

      {/* Groups */}
      {activePhase==="groups"&&(
        <div style={S.groupLayout}>
          <div style={S.groupMatchesCol}>
            <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem",marginBottom:"0.75rem"}}>
              {GROUPS.map(g=><button key={g} style={{...S.groupTabBtn,...(activeGroup===g?S.groupTabBtnActive:{})}} onClick={()=>setActiveGroup(g)}>{g}</button>)}
            </div>
            <h3 style={{color:"#f0c040",fontSize:"1rem",letterSpacing:"0.1em",marginBottom:"0.6rem"}}>GRUPO {activeGroup} — PARTIDAS</h3>
            {groupMatchesList.map(m=>{
              const ht=getTeamById(m.home_team_id), at=getTeamById(m.away_team_id);
              return <ResultRow key={m.id} matchId={m.id} homeId={m.home_team_id} awayId={m.away_team_id}
                homeLabel={`${ht?.flag||""} ${ht?.name||m.home_team_id}`} awayLabel={`${at?.name||m.away_team_id} ${at?.flag||""}`}
                homeVal={getVal(m.id,"home")} awayVal={getVal(m.id,"away")}
                onChange={(f,v)=>setVal(m.id,f,v)} onBlur={()=>commitMatch(m.id,m.home_team_id,m.away_team_id,false)}/>;
            })}
          </div>
          {/* Live standings sidebar */}
          <div style={S.standingsSidebar}>
            <h3 style={{color:"#f0c040",fontSize:"0.85rem",letterSpacing:"0.15em",marginBottom:"0.6rem"}}>CLASSIFICAÇÃO</h3>
            <div style={{fontSize:"0.72rem",display:"flex",alignItems:"center",gap:"0.25rem",padding:"0.15rem 0.3rem",color:"rgba(255,255,255,0.3)",fontFamily:"Arial,sans-serif",borderBottom:"1px solid rgba(255,255,255,0.08)",marginBottom:"0.25rem"}}>
              <span style={{width:"14px"}}>#</span><span style={{flex:1}}>TIME</span>
              <span style={{width:"20px",textAlign:"center"}}>P</span><span style={{width:"24px",textAlign:"center"}}>GD</span>
              <span style={{width:"20px",textAlign:"center"}}>GP</span><span style={{width:"20px",textAlign:"center"}}>GC</span>
            </div>
            {groupStandings.map((row,idx)=>{
              const t=teams.find(t=>t.id===row.id);
              return (
                <div key={row.id} style={{display:"flex",alignItems:"center",gap:"0.25rem",padding:"0.3rem 0.3rem",borderRadius:"4px",marginBottom:"2px",fontFamily:"Arial,sans-serif",
                  background:idx<2?"rgba(16,185,129,0.1)":idx===2?"rgba(240,192,64,0.07)":undefined,
                  borderLeft:idx<2?"2px solid rgba(16,185,129,0.5)":idx===2?"2px solid rgba(240,192,64,0.3)":"2px solid transparent"}}>
                  <span style={{width:"14px",textAlign:"center",color:"rgba(255,255,255,0.4)",fontSize:"0.7rem"}}>{idx+1}</span>
                  <span style={{flex:1,display:"flex",alignItems:"center",gap:"0.25rem",overflow:"hidden",fontSize:"0.72rem"}}>
                    <span>{t?.flag||"?"}</span>
                    <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#fff"}}>{t?.name||row.id}</span>
                  </span>
                  <span style={{width:"20px",textAlign:"center",color:"#f0c040",fontWeight:"bold",fontSize:"0.72rem"}}>{row.pts||0}</span>
                  <span style={{width:"24px",textAlign:"center",fontSize:"0.72rem",color:(row.gd||0)>0?"#10b981":(row.gd||0)<0?"#f87171":"rgba(255,255,255,0.5)"}}>
                    {(row.gd||0)>=0?"+":""}{row.gd||0}
                  </span>
                  <span style={{width:"20px",textAlign:"center",fontSize:"0.72rem",color:"rgba(255,255,255,0.6)"}}>{row.gf||0}</span>
                  <span style={{width:"20px",textAlign:"center",fontSize:"0.72rem",color:"rgba(255,255,255,0.4)"}}>{row.ga||0}</span>
                </div>
              );
            })}
            <div style={{marginTop:"0.5rem",fontSize:"0.62rem",fontFamily:"Arial,sans-serif",color:"rgba(255,255,255,0.25)",display:"flex",gap:"0.5rem"}}>
              <span style={{color:"rgba(16,185,129,0.6)"}}>■</span>classificados
              <span style={{color:"rgba(240,192,64,0.5)"}}>■</span>possível 3º
            </div>
          </div>
        </div>
      )}

      {/* KO phases */}
      {activePhase!=="groups"&&(()=>{
        const phase=koPhases.find(p=>p.key===activePhase);
        if(!phase) return null;
        const pm=phase.matches||[];
        return (
          <>
            <h3 style={{color:"#f0c040",fontSize:"1rem",letterSpacing:"0.1em",marginBottom:"0.6rem"}}>{phase.label.toUpperCase()}</h3>
            {pm.length===0&&<p style={{color:"rgba(255,255,255,0.3)",fontFamily:"Arial,sans-serif",fontSize:"0.85rem"}}>Complete os resultados das fases anteriores primeiro.</p>}
            {pm.map(m=>{
              const homeId=m.home_team_id||m.home, awayId=m.away_team_id||m.away;
              if(!homeId||!awayId) return <div key={m.id} style={{...S.resultCard,opacity:0.3,fontFamily:"Arial,sans-serif",fontSize:"0.8rem",padding:"0.6rem",color:"rgba(255,255,255,0.4)"}}>A definir — {m.id}</div>;
              const ht=getTeamById(homeId), at=getTeamById(awayId);
              return <ResultRow key={m.id} matchId={m.id} homeId={homeId} awayId={awayId}
                homeLabel={`${ht?.flag||""} ${ht?.name||homeId}`} awayLabel={`${at?.name||awayId} ${at?.flag||""}`}
                homeVal={getVal(m.id,"home")} awayVal={getVal(m.id,"away")}
                extraTime={getVal(m.id,"extra_time")} penalties={getVal(m.id,"penalties")} penaltyWinner={getVal(m.id,"penalty_winner")}
                onChange={(f,v)=>setVal(m.id,f,v)} onBlur={()=>commitMatch(m.id,homeId,awayId,true)} isKO/>;
            })}
          </>
        );
      })()}
    </div>
  );
}

function ResultRow({ matchId, homeId, awayId, homeLabel, awayLabel, homeVal, awayVal, extraTime, penalties, penaltyWinner, onChange, onBlur, isKO }) {
  function handleInput(side, raw) { onChange(side, raw.replace(/[^0-9]/g, "")); }
  const filled = homeVal !== "" && awayVal !== "";
  const hg = filled ? Number(homeVal) : null;
  const ag = filled ? Number(awayVal) : null;
  const isDraw = filled && hg === ag;
  return (
    <div style={{ ...S.resultCard, borderColor: filled ? "rgba(240,192,64,0.2)" : "rgba(255,255,255,0.07)" }}>
      <div style={S.resultTeams}>
        <span style={S.resultTeamName}>{homeLabel}</span>
        <div style={S.resultScoreArea}>
          <input style={S.resultInput} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
            value={homeVal} onChange={e => handleInput("home", e.target.value)} onBlur={onBlur} placeholder="–" />
          <span style={{ color:"rgba(255,255,255,0.3)", fontFamily:"Arial", flexShrink:0 }}>×</span>
          <input style={S.resultInput} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
            value={awayVal} onChange={e => handleInput("away", e.target.value)} onBlur={onBlur} placeholder="–" />
        </div>
        <span style={{ ...S.resultTeamName, textAlign:"right" }}>{awayLabel}</span>
      </div>
      {isKO && filled && (
        <div style={S.koExtras}>
          <label style={S.koCheckLabel}><input type="checkbox" style={{accentColor:"#f0c040"}} checked={!!extraTime} onChange={e=>{onChange("extra_time",e.target.checked);if(!e.target.checked){onChange("penalties",false);onChange("penalty_winner",null);}setTimeout(onBlur,0);}}/> Prorrogação</label>
          {extraTime&&<label style={S.koCheckLabel}><input type="checkbox" style={{accentColor:"#f0c040"}} checked={!!penalties} onChange={e=>{onChange("penalties",e.target.checked);if(!e.target.checked)onChange("penalty_winner",null);setTimeout(onBlur,0);}}/> Pênaltis</label>}
          {isDraw&&penalties&&(<div style={S.penRow}><span style={S.penLabel}>Vencedor:</span>
            <button style={{...S.penBtn,...(penaltyWinner==="home"?S.penBtnActive:{})}} onClick={()=>{onChange("penalty_winner","home");setTimeout(onBlur,0);}}>{homeLabel.slice(0,18)}</button>
            <button style={{...S.penBtn,...(penaltyWinner==="away"?S.penBtnActive:{})}} onClick={()=>{onChange("penalty_winner","away");setTimeout(onBlur,0);}}>{awayLabel.slice(-18)}</button>
          </div>)}
          {isDraw&&!penalties&&<span style={{color:"rgba(255,150,50,0.7)",fontSize:"0.7rem",fontFamily:"Arial"}}>⚠ Empate: marque prorrogação/pênaltis</span>}
        </div>
      )}
    </div>
  );
}

function PalpitesTab({ showToast }) {
  const { sessions, setSessions, teams, matches, realResults, getTeamById } = useApp();
  const [allPreds, setAllPreds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [editPreds, setEditPreds] = useState(null);
  const [activePhase, setActivePhase] = useState("groups");
  const [saving, setSaving] = useState(false);

  const allSessions = useMemo(() => {
    const lsS = JSON.parse(localStorage.getItem("wc2026_sessions") || "[]");
    const merged = [...sessions];
    lsS.forEach(ls => { if (!merged.some(s => s.session_id === ls.session_id)) merged.push(ls); });
    return merged;
  }, [sessions]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let preds = [];
      try { preds = await getAllPredictions() || []; } catch {}
      if (!preds.length) preds = JSON.parse(localStorage.getItem("wc2026_preds") || "[]");
      setAllPreds(preds);
      setLoading(false);
    })();
  }, []);

  const sessionPredMap = useMemo(() => {
    if (!selectedSession || !allPreds) return {};
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

  async function handleDelete(sessionId) {
    if (!confirm("Remover este palpiteiro e todos os seus palpites?")) return;
    setSaving(true);
    try { await deleteSession(sessionId); } catch {}
    const lp = JSON.parse(localStorage.getItem("wc2026_preds") || "[]").filter(p => p.session_id !== sessionId);
    localStorage.setItem("wc2026_preds", JSON.stringify(lp));
    const ls = JSON.parse(localStorage.getItem("wc2026_sessions") || "[]").filter(s => s.session_id !== sessionId);
    localStorage.setItem("wc2026_sessions", JSON.stringify(ls));
    setSessions(prev => prev.filter(s => s.session_id !== sessionId));
    setAllPreds(prev => prev ? prev.filter(p => p.session_id !== sessionId) : prev);
    if (selectedSession === sessionId) { setSelectedSession(null); setEditPreds(null); }
    setSaving(false);
    showToast("🗑️ Palpiteiro removido!");
  }

  function startEdit(s) {
    const m = {};
    (allPreds || []).filter(p => p.session_id === s.session_id).forEach(p => { m[p.match_id] = { ...p }; });
    setEditPreds(m);
    setSelectedSession(s.session_id);
    setActivePhase("groups");
  }

  async function saveEdit() {
    if (!selectedSession || !editPreds) return;
    setSaving(true);
    const name = allSessions.find(s => s.session_id === selectedSession)?.name || "";
    const predArray = Object.values(editPreds).map(p => ({ ...p, session_id: selectedSession, predictor_name: name }));
    try { await deletePredictionsForSession(selectedSession); await upsertPredictions(predArray); } catch {}
    const lp = JSON.parse(localStorage.getItem("wc2026_preds") || "[]").filter(p => p.session_id !== selectedSession);
    localStorage.setItem("wc2026_preds", JSON.stringify([...lp, ...predArray]));
    setAllPreds(prev => [...(prev || []).filter(p => p.session_id !== selectedSession), ...predArray]);
    setEditPreds(null); setSaving(false);
    showToast("✅ Palpites atualizados!");
  }

  function setEditVal(matchId, field, val) {
    setEditPreds(prev => ({ ...prev, [matchId]: { ...(prev?.[matchId] || {}), match_id: matchId, [field]: val } }));
  }

  const predMap = editPreds || sessionPredMap;
  const bracket = editPreds ? editBracket : sessionBracket;
  const groupMatches = matches.filter(m => m.phase === "group");
  const koPhases = [
    { key:"r32",   label:"16-avos", matches: bracket?.r32 },
    { key:"r16",   label:"Oitavas", matches: bracket?.r16 },
    { key:"qf",    label:"Quartas", matches: bracket?.qf },
    { key:"sf",    label:"Semis",   matches: bracket?.sf },
    { key:"final", label:"Final",   matches: [...(bracket?.final||[]),...(bracket?.third||[])] },
  ];
  const sessionName = allSessions.find(s => s.session_id === selectedSession)?.name;

  return (
    <div>
      <p style={S.sectionTitle}>PALPITES ({allSessions.length} palpiteiros)</p>
      {loading ? <p style={{ color:"rgba(255,255,255,0.4)", fontFamily:"Arial,sans-serif" }}>Carregando...</p> : (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.4rem", marginBottom:"1.5rem" }}>
          {allSessions.map(s => (
            <div key={s.session_id} style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
              <button style={{ ...S.phaseBtn, flex:1, textAlign:"left", borderRadius:"8px", padding:"0.5rem 0.85rem",
                ...(selectedSession===s.session_id&&!editPreds?S.phaseBtnActive:{}) }}
                onClick={() => { if (editPreds) return; setSelectedSession(s.session_id===selectedSession?null:s.session_id); setActivePhase("groups"); }}>
                {s.name}
              </button>
              <button style={{ ...S.addBtn }} onClick={() => startEdit(s)}>✏️ Editar</button>
              <button style={{ ...S.addBtn, background:"rgba(239,68,68,0.15)", borderColor:"rgba(239,68,68,0.4)", color:"#f87171" }}
                onClick={() => handleDelete(s.session_id)} disabled={saving}>🗑️</button>
            </div>
          ))}
        </div>
      )}
      {selectedSession && (
        <div style={{ background:"rgba(0,0,0,0.2)", borderRadius:"12px", padding:"1rem", border:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.75rem" }}>
            <h3 style={{ color:"#f0c040", fontSize:"1rem", letterSpacing:"0.08em", margin:0 }}>{editPreds?"✏️ Editando: ":""}{sessionName}</h3>
            {editPreds && <div style={{ display:"flex", gap:"0.5rem" }}>
              <button style={S.cancelBtn} onClick={() => setEditPreds(null)}>Cancelar</button>
              <button style={S.saveBtn} onClick={saveEdit} disabled={saving}>{saving?"...":"✅ Salvar"}</button>
            </div>}
          </div>
          <div style={{ display:"flex", gap:"0.4rem", flexWrap:"wrap", marginBottom:"0.75rem" }}>
            <button style={{ ...S.phaseBtn, ...(activePhase==="groups"?S.phaseBtnActive:{}) }} onClick={()=>setActivePhase("groups")}>Grupos</button>
            {koPhases.map(p=><button key={p.key} style={{ ...S.phaseBtn, ...(activePhase===p.key?S.phaseBtnActive:{}) }} onClick={()=>setActivePhase(p.key)}>{p.label}</button>)}
          </div>
          {activePhase==="groups"&&groupMatches.map(m=>{
            const ht=getTeamById(m.home_team_id),at=getTeamById(m.away_team_id),p=predMap[m.id],real=realResults[m.id];
            if (!editPreds) {
              const pRes=p?Math.sign(p.home_goals-p.away_goals):null,rRes=real?.home_goals!=null?Math.sign(real.home_goals-real.away_goals):null;
              const col=p&&real?.home_goals!=null?(p.home_goals===real.home_goals&&p.away_goals===real.away_goals?"#10b981":pRes===rRes?"#f0c040":"#ef4444"):"#fff";
              return <div key={m.id} style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.3rem 0.25rem",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <span style={{width:"32px",fontSize:"0.65rem",color:"rgba(240,192,64,0.6)",fontFamily:"Arial,sans-serif"}}>Gr.{m.group_letter}</span>
                <span style={{flex:1,fontSize:"0.75rem",fontFamily:"Arial,sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ht?.flag} {ht?.name}</span>
                <span style={{color:col,fontFamily:"Bebas Neue,sans-serif",fontSize:"1rem",minWidth:"50px",textAlign:"center"}}>{p?`${p.home_goals}×${p.away_goals}`:"–"}</span>
                <span style={{flex:1,fontSize:"0.75rem",fontFamily:"Arial,sans-serif",textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{at?.name} {at?.flag}</span>
                {real?.home_goals!=null&&<span style={{color:"rgba(255,255,255,0.3)",fontSize:"0.7rem",fontFamily:"Bebas Neue,sans-serif",minWidth:"45px"}}>[{real.home_goals}×{real.away_goals}]</span>}
              </div>;
            }
            const ep=editPreds?.[m.id]||{};
            return <div key={m.id} style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.3rem 0.25rem",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
              <span style={{flex:1,fontSize:"0.75rem",fontFamily:"Arial,sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ht?.flag} {ht?.name}</span>
              <div style={{display:"flex",gap:"0.3rem",alignItems:"center",flexShrink:0}}>
                <input style={S.editInput} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} value={ep.home_goals??""} onChange={e=>{const c=e.target.value.replace(/[^0-9]/g,"");setEditVal(m.id,"home_goals",c===""?undefined:parseInt(c,10));}} placeholder="–"/>
                <span style={{color:"rgba(255,255,255,0.3)",fontFamily:"Arial"}}>×</span>
                <input style={S.editInput} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} value={ep.away_goals??""} onChange={e=>{const c=e.target.value.replace(/[^0-9]/g,"");setEditVal(m.id,"away_goals",c===""?undefined:parseInt(c,10));}} placeholder="–"/>
              </div>
              <span style={{flex:1,fontSize:"0.75rem",fontFamily:"Arial,sans-serif",textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{at?.name} {at?.flag}</span>
            </div>;
          })}
          {activePhase!=="groups"&&(()=>{
            const phase=koPhases.find(p=>p.key===activePhase),pm=phase?.matches||[];
            if(!pm.length) return <p style={{color:"rgba(255,255,255,0.3)",fontFamily:"Arial,sans-serif",fontSize:"0.85rem",padding:"1rem 0"}}>Fases anteriores incompletas.</p>;
            return pm.map(m=>{
              const homeId=m.home||m.home_team_id,awayId=m.away||m.away_team_id;
              if(!homeId||!awayId) return <div key={m.id} style={{padding:"0.3rem",opacity:0.3,fontFamily:"Arial,sans-serif",fontSize:"0.8rem"}}>A definir</div>;
              const ht=getTeamById(homeId),at=getTeamById(awayId),p=predMap[m.id],real=realResults[m.id];
              if(!editPreds){
                const rs=real?.home_goals!=null?getKnockoutWinnerSide(real):null,ps=p?getKnockoutWinnerSide(p):null;
                const col=p&&real?.home_goals!=null?(p.home_goals===real.home_goals&&p.away_goals===real.away_goals?"#10b981":ps&&rs&&ps===rs?"#f0c040":"#ef4444"):"#fff";
                return <div key={m.id} style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.3rem 0.25rem",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <span style={{width:"52px",fontSize:"0.65rem",color:"rgba(240,192,64,0.5)",fontFamily:"Bebas Neue,sans-serif"}}>{m.id}</span>
                  <span style={{flex:1,fontSize:"0.75rem",fontFamily:"Arial,sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ht?.flag} {ht?.name||homeId}</span>
                  <span style={{color:col,fontFamily:"Bebas Neue,sans-serif",fontSize:"1rem",minWidth:"60px",textAlign:"center"}}>{p?`${p.home_goals}×${p.away_goals}`:"–"}{p?.penalties?<span style={{fontSize:"0.55rem",opacity:0.7}}> P</span>:null}</span>
                  <span style={{flex:1,fontSize:"0.75rem",fontFamily:"Arial,sans-serif",textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{at?.name||awayId} {at?.flag}</span>
                  {real?.home_goals!=null&&<span style={{color:"rgba(255,255,255,0.3)",fontSize:"0.7rem",fontFamily:"Bebas Neue,sans-serif",minWidth:"50px"}}>[{real.home_goals}×{real.away_goals}]</span>}
                </div>;
              }
              const ep=editPreds?.[m.id]||{},hg=ep.home_goals,ag=ep.away_goals,isDraw=hg!=null&&ag!=null&&hg===ag;
              return <div key={m.id} style={{padding:"0.35rem 0.25rem",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                  <span style={{flex:1,fontSize:"0.75rem",fontFamily:"Arial,sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ht?.flag} {ht?.name||homeId}</span>
                  <div style={{display:"flex",gap:"0.3rem",alignItems:"center",flexShrink:0}}>
                    <input style={S.editInput} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} value={hg??""} onChange={e=>{const c=e.target.value.replace(/[^0-9]/g,"");setEditVal(m.id,"home_goals",c===""?undefined:parseInt(c,10));}} placeholder="–"/>
                    <span style={{color:"rgba(255,255,255,0.3)",fontFamily:"Arial"}}>×</span>
                    <input style={S.editInput} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} value={ag??""} onChange={e=>{const c=e.target.value.replace(/[^0-9]/g,"");setEditVal(m.id,"away_goals",c===""?undefined:parseInt(c,10));}} placeholder="–"/>
                  </div>
                  <span style={{flex:1,fontSize:"0.75rem",fontFamily:"Arial,sans-serif",textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{at?.name||awayId} {at?.flag}</span>
                </div>
                <div style={{display:"flex",gap:"0.6rem",marginTop:"0.2rem"}}>
                  <label style={S.koCheckLabel}><input type="checkbox" style={{accentColor:"#f0c040"}} checked={!!ep.extra_time} onChange={e=>setEditVal(m.id,"extra_time",e.target.checked)}/> Prorr.</label>
                  {ep.extra_time&&<label style={S.koCheckLabel}><input type="checkbox" style={{accentColor:"#f0c040"}} checked={!!ep.penalties} onChange={e=>setEditVal(m.id,"penalties",e.target.checked)}/> Pênaltis</label>}
                  {isDraw&&ep.penalties&&<>
                    <button style={{...S.penBtn,...(ep.penalty_winner==="home"?S.penBtnActive:{})}} onClick={()=>setEditVal(m.id,"penalty_winner","home")}>{ht?.flag} {(ht?.name||homeId).slice(0,10)}</button>
                    <button style={{...S.penBtn,...(ep.penalty_winner==="away"?S.penBtnActive:{})}} onClick={()=>setEditVal(m.id,"penalty_winner","away")}>{at?.flag} {(at?.name||awayId).slice(0,10)}</button>
                  </>}
                </div>
              </div>;
            });
          })()}
        </div>
      )}
    </div>
  );
}

function ConfigTab({ showToast }) {
  const { initApp, useFallback, setPage } = useApp();
  return (
    <div>
      <p style={S.sectionTitle}>CONFIGURAÇÕES</p>
      <div style={S.configCard}><p style={S.configLabel}>Armazenamento</p><p style={{color:useFallback?"#f0c040":"#10b981",fontFamily:"Arial,sans-serif",fontSize:"0.9rem"}}>{useFallback?"⚠ Local":"✅ Supabase"}</p></div>
      <div style={S.configCard}><p style={S.configLabel}>Explorador de Cruzamentos</p><button style={S.saveBtn} onClick={()=>setPage("explorer")}>🔍 Abrir</button></div>
      <div style={S.configCard}><p style={S.configLabel}>Recarregar dados</p><button style={S.saveBtn} onClick={()=>{initApp();showToast("🔄 Recarregado!");}}>🔄 Recarregar</button></div>
    </div>
  );
}

const S = {
  container:{minHeight:"100vh",background:"linear-gradient(135deg,#0a0f1e,#0d1f3c)",fontFamily:"'Bebas Neue','Impact','Arial Narrow',sans-serif",color:"#fff"},
  header:{display:"flex",alignItems:"center",padding:"1rem 1.5rem",borderBottom:"1px solid rgba(240,192,64,0.15)",background:"rgba(0,0,0,0.3)"},
  backBtn:{background:"transparent",border:"1px solid rgba(255,255,255,0.2)",color:"rgba(255,255,255,0.7)",padding:"0.4rem 0.8rem",borderRadius:"6px",cursor:"pointer",fontSize:"0.85rem",fontFamily:"Arial,sans-serif"},
  title:{flex:1,textAlign:"center",fontSize:"1.6rem",color:"#f0c040",letterSpacing:"0.15em",margin:0},
  headerSpacer:{width:"80px"},
  tabs:{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.1)",background:"rgba(0,0,0,0.2)",padding:"0 1rem",overflowX:"auto"},
  tab:{padding:"0.75rem 1.5rem",background:"transparent",border:"none",color:"rgba(255,255,255,0.5)",fontSize:"0.95rem",cursor:"pointer",letterSpacing:"0.05em",borderBottom:"3px solid transparent",fontFamily:"'Bebas Neue',sans-serif",whiteSpace:"nowrap"},
  tabActive:{color:"#f0c040",borderBottomColor:"#f0c040"},
  content:{maxWidth:"900px",margin:"0 auto",padding:"1.5rem 1rem"},
  sectionHeader:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:"0.5rem"},
  sectionTitle:{color:"rgba(240,192,64,0.7)",fontSize:"0.75rem",letterSpacing:"0.2em",fontFamily:"Arial,sans-serif",margin:0},
  addBtn:{padding:"0.5rem 0.9rem",background:"rgba(16,185,129,0.2)",border:"1px solid rgba(16,185,129,0.4)",borderRadius:"6px",color:"#10b981",cursor:"pointer",fontSize:"0.8rem",fontFamily:"Arial,sans-serif"},
  editForm:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(240,192,64,0.2)",borderRadius:"12px",padding:"1.5rem",marginBottom:"1.5rem"},
  formTitle:{color:"#f0c040",fontSize:"1rem",letterSpacing:"0.1em",marginBottom:"1rem"},
  formGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"},
  formField:{display:"flex",flexDirection:"column",gap:"0.4rem"},
  formLabel:{color:"rgba(255,255,255,0.5)",fontSize:"0.7rem",letterSpacing:"0.1em",fontFamily:"Arial,sans-serif"},
  formInput:{padding:"0.6rem 0.75rem",background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"6px",color:"#fff",fontSize:"0.9rem",fontFamily:"Arial,sans-serif",outline:"none"},
  formActions:{display:"flex",gap:"0.75rem",marginTop:"1rem",justifyContent:"flex-end"},
  cancelBtn:{padding:"0.5rem 1rem",background:"transparent",border:"1px solid rgba(255,255,255,0.2)",borderRadius:"6px",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontFamily:"Arial,sans-serif"},
  saveBtn:{padding:"0.5rem 1.25rem",background:"linear-gradient(135deg,#f0c040,#e6a800)",border:"none",borderRadius:"6px",color:"#0a0f1e",cursor:"pointer",fontFamily:"Arial,sans-serif",fontWeight:"bold"},
  groupSection:{marginBottom:"1.5rem"},
  groupSectionTitle:{color:"#f0c040",fontSize:"0.9rem",letterSpacing:"0.1em",marginBottom:"0.5rem"},
  teamRow:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.5rem 0.75rem",background:"rgba(255,255,255,0.03)",borderRadius:"6px",marginBottom:"0.25rem"},
  teamActions:{display:"flex",gap:"0.25rem"},
  editBtn:{background:"transparent",border:"none",cursor:"pointer",fontSize:"1rem"},
  deleteBtn:{background:"transparent",border:"none",cursor:"pointer",fontSize:"1rem"},
  warningRow:{color:"#f0c040",fontSize:"0.75rem",fontFamily:"Arial,sans-serif",padding:"0.4rem 0.75rem"},
  groupsGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"1rem"},
  groupCard:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"10px",padding:"0.75rem",minHeight:"120px"},
  groupCardTitle:{color:"#f0c040",fontSize:"0.9rem",letterSpacing:"0.1em",marginBottom:"0.5rem"},
  draggableTeam:{display:"flex",alignItems:"center",gap:"0.4rem",padding:"0.35rem 0.5rem",background:"rgba(255,255,255,0.04)",borderRadius:"6px",marginBottom:"0.25rem",cursor:"grab",overflow:"hidden"},
  moveBtns:{display:"flex",gap:"2px",marginLeft:"auto",flexShrink:0},
  moveBtn:{width:"18px",height:"18px",background:"rgba(255,255,255,0.1)",border:"none",borderRadius:"3px",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:"0.6rem"},
  phaseBtn:{padding:"0.4rem 0.9rem",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"20px",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:"0.8rem",fontFamily:"Arial,sans-serif"},
  phaseBtnActive:{background:"rgba(240,192,64,0.15)",borderColor:"#f0c040",color:"#f0c040"},
  groupTabBtn:{width:"32px",height:"32px",borderRadius:"50%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:"0.8rem",fontFamily:"'Bebas Neue',sans-serif"},
  groupTabBtnActive:{background:"rgba(240,192,64,0.2)",borderColor:"#f0c040",color:"#f0c040"},
  groupLayout:{display:"grid",gridTemplateColumns:"minmax(0,1fr) 200px",gap:"1.25rem",alignItems:"start"},
  groupMatchesCol:{},
  standingsSidebar:{background:"rgba(0,0,0,0.25)",borderRadius:"10px",padding:"0.75rem",border:"1px solid rgba(255,255,255,0.07)",position:"sticky",top:"1rem"},
  fakePredBox:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"10px",padding:"0.75rem 1rem",marginBottom:"1rem"},
  fakePredLabel:{color:"rgba(240,192,64,0.7)",fontSize:"0.7rem",letterSpacing:"0.1em",fontFamily:"'Bebas Neue',sans-serif"},
  fakeInput:{flex:1,padding:"0.5rem 0.75rem",background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"6px",color:"#fff",fontSize:"0.85rem",fontFamily:"Arial,sans-serif",outline:"none"},
  resultCard:{padding:"0.6rem 0.75rem",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",marginBottom:"0.4rem"},
  resultTeams:{display:"flex",alignItems:"center",gap:"0.5rem"},
  resultTeamName:{flex:1,color:"#fff",fontSize:"0.8rem",fontFamily:"Arial,sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  resultScoreArea:{display:"flex",alignItems:"center",gap:"0.4rem",flexShrink:0},
  resultInput:{width:"44px",height:"40px",textAlign:"center",background:"rgba(0,0,0,0.4)",border:"2px solid rgba(240,192,64,0.3)",borderRadius:"6px",color:"#fff",fontSize:"1.2rem",fontFamily:"'Bebas Neue',sans-serif",outline:"none"},
  koExtras:{display:"flex",alignItems:"center",flexWrap:"wrap",gap:"0.75rem",marginTop:"0.4rem",paddingTop:"0.4rem",borderTop:"1px solid rgba(255,255,255,0.05)"},
  koCheckLabel:{display:"flex",alignItems:"center",gap:"0.3rem",cursor:"pointer",color:"rgba(255,255,255,0.55)",fontSize:"0.75rem",fontFamily:"Arial,sans-serif"},
  penRow:{display:"flex",alignItems:"center",gap:"0.4rem",flexWrap:"wrap"},
  penLabel:{color:"rgba(255,255,255,0.4)",fontSize:"0.7rem",fontFamily:"Arial,sans-serif"},
  penBtn:{padding:"0.2rem 0.5rem",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"4px",color:"rgba(255,255,255,0.7)",cursor:"pointer",fontSize:"0.72rem",fontFamily:"Arial,sans-serif",maxWidth:"130px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  penBtnActive:{background:"rgba(240,192,64,0.2)",borderColor:"#f0c040",color:"#f0c040"},
  configCard:{padding:"1rem 1.25rem",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"10px",marginBottom:"1rem"},
  configLabel:{color:"rgba(255,255,255,0.5)",fontSize:"0.75rem",letterSpacing:"0.1em",fontFamily:"Arial,sans-serif",marginBottom:"0.5rem"},
};
