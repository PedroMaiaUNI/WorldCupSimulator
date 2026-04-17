import { useState, useEffect, useMemo, useCallback } from "react";
import { useApp } from "../App";
import { GROUPS } from "../lib/teamsData";
import { calcGroupStandings } from "../lib/scoring";
import { buildBracket } from "../lib/bracket";
import GroupMatchCard from "../components/GroupMatchCard";
import KnockoutMatchCard from "../components/KnockoutMatchCard";

// ── Rascunho em localStorage ──────────────────────────────────
// Chave: "wc2026_draft_<session_id>"
// Estrutura: { preds, phase, activeGroup, groupsLocked, savedAt }

function draftKey(sessionId) { return `wc2026_draft_${sessionId}`; }

function loadDraft(sessionId) {
  try {
    const raw = localStorage.getItem(draftKey(sessionId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveDraft(sessionId, data) {
  try {
    localStorage.setItem(draftKey(sessionId), JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {}
}

function clearDraft(sessionId) {
  try { localStorage.removeItem(draftKey(sessionId)); } catch {}
}

const PHASES = ["Grupos", "16-avos", "Oitavas", "Quartas", "Semis", "Final"];

export default function PredictorPage() {
  const { teams, matches, handleSavePredictions, setPage, predictorName, sessionId } = useApp();

  // Restaurar rascunho salvo, se existir
  const draft = sessionId ? loadDraft(sessionId) : null;

  const [phase,        setPhaseState]   = useState(draft?.phase        ?? 0);
  const [activeGroup,  setGroupState]   = useState(draft?.activeGroup  ?? "A");
  const [groupsLocked, setLockedState]  = useState(draft?.groupsLocked ?? false);
  const [preds,        setPredsState]   = useState(draft?.preds        ?? {});
  const [showThirds,   setShowThirds]   = useState(false);
  const [errors,       setErrors]       = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);

  // Wrappers que auto-salvam o rascunho
  function setPhase(v)        { setPhaseState(v);   persistDraft({ phase: v }); }
  function setActiveGroup(v)  { setGroupState(v);   persistDraft({ activeGroup: v }); }
  function setGroupsLocked(v) { setLockedState(v);  persistDraft({ groupsLocked: v }); }
  function setPreds(updater) {
    setPredsState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persistDraft({ preds: next });
      return next;
    });
  }

  // Persiste o rascunho com os valores actuais + override
  function persistDraft(override = {}) {
    if (!sessionId) return;
    // Lemos os refs mais actuais via closure — para evitar state stale usamos
    // a abordagem de passar os campos explicitamente no override.
    setPredsState(currentPreds => {
      setPhaseState(currentPhase => {
        setGroupState(currentGroup => {
          setLockedState(currentLocked => {
            saveDraft(sessionId, {
              preds:        override.preds        ?? currentPreds,
              phase:        override.phase        ?? currentPhase,
              activeGroup:  override.activeGroup  ?? currentGroup,
              groupsLocked: override.groupsLocked ?? currentLocked,
            });
            return currentLocked;
          });
          return currentGroup;
        });
        return currentPhase;
      });
      return currentPreds;
    });
  }

  function setPred(matchId, value) {
    setPreds(prev => ({ ...prev, [matchId]: { ...prev[matchId], ...value } }));
  }

  const knockoutMatches = useMemo(() => buildBracket(teams, matches, preds), [preds, teams, matches]);

  const groupMatches = matches.filter(m => m.phase === "group");
  const groupMatchesFilled = groupMatches.every(m => {
    const p = preds[m.id];
    return p && p.home_goals != null && p.away_goals != null;
  });

  function getGroupStandings(group) {
    const groupTeams = teams
      .filter(t => (t.group || t.group_letter) === group)
      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
      .map(t => t.id);
    if (!groupTeams.length) return [];
    const gm = matches.filter(m => m.phase === "group" && m.group_letter === group);
    const predResults = {};
    gm.forEach(m => {
      const p = preds[m.id];
      if (p && p.home_goals != null && p.away_goals != null) predResults[m.id] = p;
    });
    return calcGroupStandings(groupTeams, gm, predResults);
  }

  // Phase tabs
  function handlePhaseClick(idx) {
    if (idx === 0) {
      if (groupsLocked) {
        const hasKO = Object.keys(preds).some(id => !id.startsWith("group_"));
        if (hasKO) { setConfirmModal("edit"); return; }
      }
      setPhase(0); return;
    }
    if (!groupsLocked) {
      if (!groupMatchesFilled) { setErrors(["Preencha todos os palpites da fase de grupos antes de prosseguir!"]); return; }
      setConfirmModal("proceed"); return;
    }
    setPhase(idx); setErrors([]);
  }

  function confirmProceedToKO() {
    setGroupsLocked(true);
    setConfirmModal(null);
    setPhase(1);
    setErrors([]);
  }

  function confirmEditGroups() {
    setPreds(prev => {
      const fresh = {};
      Object.entries(prev).forEach(([k, v]) => { if (k.startsWith("group_")) fresh[k] = v; });
      return fresh;
    });
    setGroupsLocked(false);
    setConfirmModal(null);
    setPhase(0);
  }

  function validateAndSave() {
    const errs = [];
    groupMatches.forEach(m => {
      const p = preds[m.id];
      if (!p || p.home_goals == null || p.away_goals == null)
        errs.push(`Grupo ${m.group_letter}: partida sem palpite`);
    });
    if (errs.length) { setErrors([...new Set(errs)]); setPhase(0); return; }

    const allKO = [
      ...(knockoutMatches.r32||[]), ...(knockoutMatches.r16||[]),
      ...(knockoutMatches.qf||[]),  ...(knockoutMatches.sf||[]),
      ...(knockoutMatches.final||[]),...(knockoutMatches.third||[]),
    ];
    allKO.forEach(m => {
      if (!m.home || !m.away) return;
      const p = preds[m.id];
      if (!p || p.home_goals == null || p.away_goals == null)
        errs.push(`${m.id}: sem palpite`);
      else if (p.home_goals === p.away_goals && !p.penalty_winner)
        errs.push(`${m.id}: empate sem vencedor nos pênaltis`);
    });
    if (errs.length) { setErrors([...new Set(errs)]); return; }

    setErrors([]);
    clearDraft(sessionId); // apaga rascunho ao submeter
    const predArray = Object.entries(preds).map(([match_id, p]) => ({ match_id, ...p }));
    handleSavePredictions(predArray);
  }

  const thirdsRanking = useMemo(() => {
    return GROUPS.map(g => {
      const s = getGroupStandings(g);
      return s[2] ? { ...s[2], group: g } : null;
    }).filter(Boolean)
      .sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : b.gd !== a.gd ? b.gd - a.gd : b.gf !== a.gf ? b.gf - a.gf : a.group.localeCompare(b.group));
  }, [preds, teams, matches]);

  const activeGroupMatches = matches.filter(m => m.phase === "group" && m.group_letter === activeGroup);

  return (
    <div style={S.container}>
      {/* Modais de confirmação */}
      {confirmModal === "proceed" && (
        <Modal title="Confirmar fase de grupos"
          body="Você preencheu todos os 72 jogos! Quer prosseguir para o mata-mata? Ainda dá para voltar, mas os palpites de mata-mata serão apagados."
          confirmLabel="✅ Ir para o Mata-Mata" cancelLabel="← Revisar Grupos"
          onConfirm={confirmProceedToKO} onCancel={() => setConfirmModal(null)} />
      )}
      {confirmModal === "edit" && (
        <Modal title="⚠ Editar fase de grupos"
          body="Se você voltar para os grupos, TODOS os palpites de mata-mata serão apagados. Deseja continuar?"
          confirmLabel="🗑️ Apagar mata-mata e editar grupos" cancelLabel="← Manter mata-mata"
          onConfirm={confirmEditGroups} onCancel={() => setConfirmModal(null)} danger />
      )}

      {/* Cabeçalho */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => setPage("home")}>← Início</button>
        <div style={S.headerTitle}>
          <span style={{ flexShrink:0 }}>⚽</span>
          <span style={S.headerName}>{predictorName.toUpperCase()}</span>
        </div>
        <div style={S.headerSpacer} />
      </div>

      {/* Indicador de rascunho */}
      {draft && (
        <div style={S.draftBanner}>
          💾 Rascunho restaurado — {new Date(draft.savedAt).toLocaleString("pt-BR", { hour:"2-digit", minute:"2-digit", day:"2-digit", month:"2-digit" })}
        </div>
      )}

      {/* Abas de fase */}
      <div style={S.phaseTabs}>
        {PHASES.map((p, i) => (
          <button key={p}
            style={{ ...S.phaseTab, ...(phase===i?S.phaseTabActive:{}), ...(i>0&&!groupsLocked?S.phaseTabLocked:{}) }}
            onClick={() => handlePhaseClick(i)}>
            {i > 0 && !groupsLocked ? "🔒 " : ""}{p}
          </button>
        ))}
      </div>

      {errors.length > 0 && (
        <div style={S.errorBox}>
          <strong>⚠ Atenção:</strong>
          <ul style={{ margin:"0.4rem 0 0", paddingLeft:"1.4rem" }}>
            {errors.map((e, i) => <li key={i} style={{ fontFamily:"Arial,sans-serif", fontSize:"0.82rem" }}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* FASE DE GRUPOS */}
      {phase === 0 && (
        <div style={S.content}>
          {/* Toggle grupos / 3ºs */}
          <div style={{ display:"flex", gap:"0.5rem", justifyContent:"center", marginBottom:"1rem" }}>
            <button style={{ ...S.viewToggle, ...(showThirds?{}:S.viewToggleActive) }} onClick={() => setShowThirds(false)}>Grupos A–L</button>
            <button style={{ ...S.viewToggle, ...(showThirds?S.viewToggleActive:{}) }} onClick={() => setShowThirds(true)}>🏅 3ºs Colocados</button>
          </div>

          {!showThirds ? (
            <>
              {/* Seletores de grupo */}
              <div style={S.groupTabs}>
                {GROUPS.map(g => {
                  const gm = matches.filter(m => m.phase==="group"&&m.group_letter===g);
                  const filled = gm.every(m => { const p=preds[m.id]; return p&&p.home_goals!=null&&p.away_goals!=null; });
                  return (
                    <button key={g}
                      style={{ ...S.groupTab, ...(activeGroup===g?S.groupTabActive:{}), ...(filled?S.groupTabFilled:{}) }}
                      onClick={() => setActiveGroup(g)}>
                      {g}{filled?"✓":""}
                    </button>
                  );
                })}
              </div>

              <h3 style={S.groupTitle}>GRUPO {activeGroup}</h3>
              <StandingsTable standings={getGroupStandings(activeGroup)} teams={teams} />

              <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem", marginBottom:"1.5rem" }}>
                {activeGroupMatches.map(m => (
                  <GroupMatchCard key={m.id} match={m} prediction={preds[m.id]||{}} onUpdate={val => setPred(m.id, val)} />
                ))}
              </div>

              {/* Navegação entre grupos */}
              <div style={S.groupNav}>
                {GROUPS.indexOf(activeGroup) > 0 && (
                  <button style={S.navBtn} onClick={() => setActiveGroup(GROUPS[GROUPS.indexOf(activeGroup)-1])}>
                    ← Grupo {GROUPS[GROUPS.indexOf(activeGroup)-1]}
                  </button>
                )}
                <div style={{ flex:1 }} />
                {GROUPS.indexOf(activeGroup) < GROUPS.length - 1 ? (
                  <button style={S.navBtn} onClick={() => setActiveGroup(GROUPS[GROUPS.indexOf(activeGroup)+1])}>
                    Grupo {GROUPS[GROUPS.indexOf(activeGroup)+1]} →
                  </button>
                ) : (
                  <button style={{ ...S.navBtn, ...S.navBtnHighlight }}
                    onClick={() => handlePhaseClick(1)}>
                    {groupMatchesFilled ? "Ir para 16-avos →" : "⚠ Preencha todos os jogos"}
                  </button>
                )}
              </div>
            </>
          ) : (
            <ThirdsTable thirdsRanking={thirdsRanking} teams={teams} />
          )}
        </div>
      )}

      {/* MATA-MATA */}
      {phase >= 1 && (
        <KnockoutPhase phase={phase} knockoutMatches={knockoutMatches}
          preds={preds} setPred={setPred} setPhase={setPhase}
          onSave={validateAndSave} handlePhaseClick={handlePhaseClick} />
      )}
    </div>
  );
}

// ── Tabela de classificação do grupo ─────────────────────────
function StandingsTable({ standings, teams }) {
  const cols = ["P","J","GD","GP","GC"];
  return (
    <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:"10px", padding:"0.6rem 0.75rem", marginBottom:"1rem", border:"1px solid rgba(255,255,255,0.07)", overflowX:"auto" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"0.3rem", borderBottom:"1px solid rgba(255,255,255,0.07)", paddingBottom:"0.25rem", marginBottom:"0.25rem" }}>
        <span style={{ width:"18px", flexShrink:0 }} />
        <span style={{ flex:1, fontSize:"0.62rem", color:"rgba(255,255,255,0.3)", fontFamily:"Arial,sans-serif" }}>TIME</span>
        {cols.map(c => <span key={c} style={{ width:"26px", textAlign:"center", fontSize:"0.62rem", color:"rgba(255,255,255,0.3)", fontFamily:"Arial,sans-serif", flexShrink:0 }}>{c}</span>)}
      </div>
      {standings.map((row, idx) => {
        const t = teams.find(t => t.id===row.id);
        const isQ = idx<2, is3 = idx===2;
        return (
          <div key={row.id} style={{ display:"flex", alignItems:"center", gap:"0.3rem", padding:"0.3rem 0", borderRadius:"5px",
            background: isQ?"rgba(16,185,129,0.08)":is3?"rgba(240,192,64,0.06)":"transparent",
            borderLeft: isQ?"2px solid rgba(16,185,129,0.5)":is3?"2px solid rgba(240,192,64,0.3)":"2px solid transparent",
            paddingLeft:"0.25rem" }}>
            <span style={{ width:"18px", textAlign:"center", color:"rgba(255,255,255,0.4)", fontSize:"0.8rem", flexShrink:0 }}>{idx+1}</span>
            <span style={{ flex:1, minWidth:0, display:"flex", alignItems:"center", gap:"0.25rem", overflow:"hidden" }}>
              <span style={{ flexShrink:0, fontSize:"1rem" }}>{t?.flag}</span>
              <span style={{ fontSize:"0.73rem", fontFamily:"Arial,sans-serif", color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t?.name||row.id}</span>
            </span>
            <span style={{ width:"26px", textAlign:"center", color:"#f0c040", fontWeight:"bold", fontSize:"0.73rem", fontFamily:"Arial,sans-serif", flexShrink:0 }}>{row.pts||0}</span>
            <span style={{ width:"26px", textAlign:"center", fontSize:"0.73rem", fontFamily:"Arial,sans-serif", flexShrink:0 }}>{row.mp||0}</span>
            <span style={{ width:"26px", textAlign:"center", fontSize:"0.73rem", fontFamily:"Arial,sans-serif", color:(row.gd||0)>0?"#10b981":(row.gd||0)<0?"#f87171":"rgba(255,255,255,0.5)", flexShrink:0 }}>
              {(row.gd||0)>=0?"+":""}{row.gd||0}
            </span>
            <span style={{ width:"26px", textAlign:"center", fontSize:"0.73rem", fontFamily:"Arial,sans-serif", color:"rgba(255,255,255,0.6)", flexShrink:0 }}>{row.gf||0}</span>
            <span style={{ width:"26px", textAlign:"center", fontSize:"0.73rem", fontFamily:"Arial,sans-serif", color:"rgba(255,255,255,0.4)", flexShrink:0 }}>{row.ga||0}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Tabela de 3ºs colocados ──────────────────────────────────
function ThirdsTable({ thirdsRanking, teams }) {
  return (
    <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:"10px", padding:"0.75rem", border:"1px solid rgba(255,255,255,0.07)", overflowX:"auto" }}>
      <p style={{ color:"rgba(240,192,64,0.8)", fontSize:"0.7rem", letterSpacing:"0.15em", fontFamily:"Arial,sans-serif", marginBottom:"0.75rem" }}>
        MELHORES 3ºS COLOCADOS — os 8 primeiros avançam
      </p>
      {thirdsRanking.length === 0 && (
        <p style={{ color:"rgba(255,255,255,0.3)", fontFamily:"Arial,sans-serif", fontSize:"0.85rem", textAlign:"center", padding:"1rem" }}>
          Preencha palpites nos grupos para ver a tabela.
        </p>
      )}
      {thirdsRanking.map((row, idx) => {
        const t = teams.find(t => t.id===row.id);
        const advances = idx < 8;
        return (
          <div key={row.id||idx} style={{ display:"flex", alignItems:"center", gap:"0.3rem", padding:"0.3rem 0.25rem", borderRadius:"5px",
            background:advances?"rgba(16,185,129,0.07)":"transparent",
            borderLeft:advances?"2px solid rgba(16,185,129,0.4)":"2px solid transparent",
            paddingLeft:"0.3rem", marginBottom:"2px" }}>
            <span style={{ width:"18px", textAlign:"center", color:"rgba(255,255,255,0.4)", fontSize:"0.8rem", flexShrink:0 }}>{idx+1}</span>
            <span style={{ width:"28px", fontSize:"0.72rem", color:"#f0c040", fontFamily:"'Bebas Neue',sans-serif", flexShrink:0 }}>GR.{row.group}</span>
            <span style={{ flex:1, minWidth:0, display:"flex", alignItems:"center", gap:"0.25rem", overflow:"hidden" }}>
              <span style={{ flexShrink:0, fontSize:"1rem" }}>{t?.flag}</span>
              <span style={{ fontSize:"0.73rem", fontFamily:"Arial,sans-serif", color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t?.name||row.id}</span>
            </span>
            <span style={{ width:"24px", textAlign:"center", color:"#f0c040", fontWeight:"bold", fontSize:"0.73rem", fontFamily:"Arial,sans-serif", flexShrink:0 }}>{row.pts||0}</span>
            <span style={{ width:"24px", textAlign:"center", fontSize:"0.73rem", fontFamily:"Arial,sans-serif", color:(row.gd||0)>0?"#10b981":(row.gd||0)<0?"#f87171":"rgba(255,255,255,0.5)", flexShrink:0 }}>
              {(row.gd||0)>=0?"+":""}{row.gd||0}
            </span>
            <span style={{ width:"24px", textAlign:"center", fontSize:"0.73rem", fontFamily:"Arial,sans-serif", color:"rgba(255,255,255,0.6)", flexShrink:0 }}>{row.gf||0}</span>
            <span style={{ width:"24px", textAlign:"center", fontSize:"0.73rem", fontFamily:"Arial,sans-serif", color:"rgba(255,255,255,0.4)", flexShrink:0 }}>{row.ga||0}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Modal de confirmação ─────────────────────────────────────
function Modal({ title, body, confirmLabel, cancelLabel, onConfirm, onCancel, danger }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.78)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, padding:"1rem" }}>
      <div style={{ background:"#0d1f3c", border:"1px solid rgba(255,255,255,0.14)", borderRadius:"14px", padding:"1.75rem 1.5rem", maxWidth:"440px", width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.6)" }}>
        <h3 style={{ color:danger?"#f87171":"#f0c040", fontSize:"1.05rem", letterSpacing:"0.04em", marginBottom:"0.75rem" }}>{title}</h3>
        <p style={{ color:"rgba(255,255,255,0.8)", fontFamily:"Arial,sans-serif", fontSize:"0.88rem", lineHeight:1.55, marginBottom:"1.5rem" }}>{body}</p>
        <div style={{ display:"flex", gap:"0.75rem", justifyContent:"flex-end" }}>
          <button style={{ padding:"0.55rem 1rem", background:"transparent", border:"1px solid rgba(255,255,255,0.2)", borderRadius:"8px", color:"rgba(255,255,255,0.6)", cursor:"pointer", fontFamily:"Arial,sans-serif" }} onClick={onCancel}>{cancelLabel}</button>
          <button style={{ padding:"0.55rem 1.25rem", border:"none", borderRadius:"8px", cursor:"pointer", fontFamily:"Arial,sans-serif", fontWeight:"bold", fontSize:"0.92rem",
            background:danger?"rgba(239,68,68,0.85)":"linear-gradient(135deg,#f0c040,#e6a800)",
            color:danger?"#fff":"#0a0f1e" }} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Fase de mata-mata ─────────────────────────────────────────
function KnockoutPhase({ phase, knockoutMatches, preds, setPred, setPhase, onSave, handlePhaseClick }) {
  const phaseMatchesMap = {
    1: knockoutMatches.r32  || [],
    2: knockoutMatches.r16  || [],
    3: knockoutMatches.qf   || [],
    4: knockoutMatches.sf   || [],
    5: knockoutMatches.final|| [],
  };
  const phaseLabel = { 1:"16-AVOS DE FINAL", 2:"OITAVAS DE FINAL", 3:"QUARTAS DE FINAL", 4:"SEMIFINAIS", 5:"FINAL" }[phase];
  const phaseMatches = phaseMatchesMap[phase] || [];
  const isFinal = phase === 5;
  const thirdMatch = knockoutMatches.third?.[0];

  return (
    <div style={S.content}>
      <h3 style={S.groupTitle}>{phaseLabel}</h3>
      {isFinal && thirdMatch && (
        <>
          <p style={{ color:"rgba(255,255,255,0.5)", textAlign:"center", marginBottom:"0.5rem", fontSize:"0.82rem", fontFamily:"Arial,sans-serif" }}>Disputa de 3º lugar</p>
          <KnockoutMatchCard match={thirdMatch} prediction={preds[thirdMatch.id]||{}} onUpdate={val => setPred(thirdMatch.id, val)} />
          <p style={{ color:"rgba(255,255,255,0.5)", textAlign:"center", margin:"1.25rem 0 0.5rem", fontSize:"0.82rem", fontFamily:"Arial,sans-serif" }}>🏆 Grande Final</p>
        </>
      )}
      {phaseMatches.map(m => (
        <KnockoutMatchCard key={m.id} match={m} prediction={preds[m.id]||{}} onUpdate={val => setPred(m.id, val)} />
      ))}
      <div style={S.groupNav}>
        <button style={S.navBtn} onClick={() => handlePhaseClick(phase-1)}>← Fase anterior</button>
        <div style={{ flex:1 }} />
        {!isFinal ? (
          <button style={S.navBtn} onClick={() => setPhase(phase+1)}>Próxima fase →</button>
        ) : (
          <button style={{ ...S.navBtn, ...S.navBtnHighlight }} onClick={onSave}>✅ SALVAR PALPITES</button>
        )}
      </div>
    </div>
  );
}

const S = {
  container: { minHeight:"100vh", background:"linear-gradient(135deg,#0a0f1e,#0d1f3c)", fontFamily:"'Bebas Neue','Impact','Arial Narrow',sans-serif", color:"#fff" },
  header: { display:"flex", alignItems:"center", padding:"0.75rem 1rem", borderBottom:"1px solid rgba(240,192,64,0.15)", background:"rgba(0,0,0,0.3)", gap:"0.5rem" },
  backBtn: { background:"transparent", border:"1px solid rgba(255,255,255,0.2)", color:"rgba(255,255,255,0.7)", padding:"0.4rem 0.75rem", borderRadius:"6px", cursor:"pointer", fontSize:"0.82rem", fontFamily:"Arial,sans-serif", flexShrink:0 },
  headerTitle: { flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"0.4rem", fontSize:"0.95rem", letterSpacing:"0.12em", color:"#f0c040", minWidth:0, overflow:"hidden" },
  headerName: { overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", minWidth:0 },
  headerSpacer: { width:"72px", flexShrink:0 },
  draftBanner: { background:"rgba(240,192,64,0.12)", borderBottom:"1px solid rgba(240,192,64,0.2)", padding:"0.4rem 1rem", textAlign:"center", color:"rgba(240,192,64,0.85)", fontSize:"0.75rem", fontFamily:"Arial,sans-serif" },
  phaseTabs: { display:"flex", overflowX:"auto", borderBottom:"1px solid rgba(255,255,255,0.1)", background:"rgba(0,0,0,0.2)", padding:"0 0.5rem" },
  phaseTab: { padding:"0.7rem 0.9rem", background:"transparent", border:"none", color:"rgba(255,255,255,0.5)", fontSize:"0.8rem", cursor:"pointer", whiteSpace:"nowrap", borderBottom:"3px solid transparent", letterSpacing:"0.04em", fontFamily:"'Bebas Neue','Impact',sans-serif", flexShrink:0 },
  phaseTabActive: { color:"#f0c040", borderBottomColor:"#f0c040" },
  phaseTabLocked: { color:"rgba(255,255,255,0.22)", cursor:"not-allowed" },
  errorBox: { margin:"0.75rem 1rem", padding:"0.75rem 1rem", background:"rgba(255,80,80,0.14)", border:"1px solid rgba(255,80,80,0.35)", borderRadius:"8px", color:"#ff9999" },
  content: { maxWidth:"680px", margin:"0 auto", padding:"1.25rem 0.85rem" },
  viewToggle: { padding:"0.4rem 0.9rem", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"20px", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:"0.78rem", fontFamily:"Arial,sans-serif" },
  viewToggleActive: { background:"rgba(240,192,64,0.15)", borderColor:"#f0c040", color:"#f0c040" },
  groupTabs: { display:"flex", flexWrap:"wrap", gap:"0.35rem", marginBottom:"1rem", justifyContent:"center" },
  groupTab: { width:"40px", height:"40px", borderRadius:"50%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.14)", color:"rgba(255,255,255,0.7)", cursor:"pointer", fontSize:"0.73rem", fontFamily:"'Bebas Neue',sans-serif", display:"flex", alignItems:"center", justifyContent:"center" },
  groupTabActive: { background:"rgba(240,192,64,0.2)", borderColor:"#f0c040", color:"#f0c040" },
  groupTabFilled: { borderColor:"rgba(16,185,129,0.5)", color:"#10b981" },
  groupTitle: { textAlign:"center", fontSize:"1.4rem", letterSpacing:"0.2em", color:"#f0c040", marginBottom:"0.65rem" },
  groupNav: { display:"flex", alignItems:"center", marginTop:"1.5rem", gap:"0.75rem" },
  navBtn: { padding:"0.65rem 1rem", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:"8px", color:"rgba(255,255,255,0.8)", cursor:"pointer", fontFamily:"Arial,sans-serif", fontSize:"0.88rem" },
  navBtnHighlight: { background:"rgba(240,192,64,0.18)", borderColor:"rgba(240,192,64,0.45)", color:"#f0c040", fontWeight:"bold" },
};
