import { useState, useEffect, useMemo } from "react";
import { useApp } from "../App";
import { GROUPS } from "../lib/teamsData";
import { calcGroupStandings } from "../lib/scoring";
import { buildBracket } from "../lib/bracket";
import GroupMatchCard from "../components/GroupMatchCard";
import KnockoutMatchCard from "../components/KnockoutMatchCard";
import TeamBadge from "../components/TeamBadge";

const PHASES = ["Grupos", "16-avos", "Oitavas", "Quartas", "Semis", "Final"];

export default function PredictorPage() {
  const { teams, matches, handleSavePredictions, setPage, predictorName } = useApp();
  const [phase, setPhase] = useState(0);
  const [activeGroup, setActiveGroup] = useState("A");
  const [showThirds, setShowThirds] = useState(false);
  const [preds, setPreds] = useState({});
  const [errors, setErrors] = useState([]);
  // "locked" = group phase fully confirmed; null = not started KO
  const [groupsLocked, setGroupsLocked] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null); // "proceed" | "edit"

  // Build bracket from predictions (always up to date)
  const knockoutMatches = useMemo(() => buildBracket(teams, matches, preds), [preds, teams, matches]);

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

  function setPred(matchId, value) {
    setPreds(prev => ({ ...prev, [matchId]: { ...prev[matchId], ...value } }));
  }

  // Check if all group matches are filled
  const groupMatches = matches.filter(m => m.phase === "group");
  const groupMatchesFilled = groupMatches.every(m => {
    const p = preds[m.id];
    return p && p.home_goals != null && p.away_goals != null;
  });

  // Tab click handler — intercept KO tabs
  function handlePhaseClick(idx) {
    if (idx === 0) {
      if (groupsLocked) {
        // Trying to go back to groups — warn about losing KO preds
        const hasKOPreds = Object.keys(preds).some(id => !id.startsWith("group_"));
        if (hasKOPreds) {
          setConfirmModal("edit");
          return;
        }
      }
      setPhase(0);
      return;
    }
    // Going to KO phase
    if (!groupsLocked) {
      if (!groupMatchesFilled) {
        setErrors(["Preencha todos os palpites da fase de grupos antes de prosseguir!"]);
        return;
      }
      setConfirmModal("proceed");
      return;
    }
    setPhase(idx);
    setErrors([]);
  }

  function confirmProceedToKO() {
    setGroupsLocked(true);
    setConfirmModal(null);
    setPhase(1);
    setErrors([]);
  }

  function confirmEditGroups() {
    // Wipe all KO predictions
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
      ...(knockoutMatches.qf||[]), ...(knockoutMatches.sf||[]),
      ...(knockoutMatches.final||[]), ...(knockoutMatches.third||[]),
    ];
    allKO.forEach(m => {
      if (!m.home || !m.away) return;
      const p = preds[m.id];
      if (!p || p.home_goals == null || p.away_goals == null)
        errs.push(`Mata-mata: ${m.id} sem palpite`);
      else if (p.home_goals === p.away_goals && !p.penalty_winner)
        errs.push(`Mata-mata: ${m.id} empatado sem vencedor nos pênaltis`);
    });
    if (errs.length) { setErrors([...new Set(errs)]); return; }

    setErrors([]);
    const predArray = Object.entries(preds).map(([match_id, p]) => ({ match_id, ...p }));
    handleSavePredictions(predArray);
  }

  // Best 8 thirds from current preds
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
      {/* Confirm modals */}
      {confirmModal === "proceed" && (
        <Modal
          title="Confirmar palpites de grupos"
          body="Você preencheu todos os 72 jogos da fase de grupos. Quer prosseguir para o mata-mata? Você ainda pode voltar, mas todos os palpites de mata-mata serão apagados."
          confirmLabel="✅ Ir para o Mata-Mata"
          cancelLabel="← Revisar Grupos"
          onConfirm={confirmProceedToKO}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      {confirmModal === "edit" && (
        <Modal
          title="⚠ Editar fase de grupos"
          body="Se você voltar para editar os grupos, TODOS os palpites de mata-mata serão apagados (pois os classificados podem mudar). Deseja continuar?"
          confirmLabel="🗑️ Apagar mata-mata e editar grupos"
          cancelLabel="← Manter mata-mata"
          onConfirm={confirmEditGroups}
          onCancel={() => setConfirmModal(null)}
          danger
        />
      )}

      <div style={S.header}>
        <button style={S.backBtn} onClick={() => setPage("home")}>← Início</button>
        <div style={S.headerTitle}>
          <span>⚽</span>
          <span>PALPITES DE {predictorName.toUpperCase()}</span>
        </div>
        <div style={S.headerSpacer} />
      </div>

      {/* Phase tabs */}
      <div style={S.phaseTabs}>
        {PHASES.map((p, i) => (
          <button key={p} style={{ ...S.phaseTab, ...(phase === i ? S.phaseTabActive : {}), ...(i > 0 && !groupsLocked ? S.phaseTabLocked : {}) }}
            onClick={() => handlePhaseClick(i)}>
            {i > 0 && !groupsLocked ? "🔒" : ""}{p}
          </button>
        ))}
      </div>

      {errors.length > 0 && (
        <div style={S.errorBox}>
          <strong>⚠ Atenção:</strong>
          <ul style={{ margin:"0.5rem 0 0", paddingLeft:"1.5rem" }}>
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* GROUP PHASE */}
      {phase === 0 && (
        <div style={S.content}>
          {/* Group / Thirds view toggle */}
          <div style={{ display:"flex", gap:"0.5rem", justifyContent:"center", marginBottom:"1rem", flexWrap:"wrap" }}>
            <button style={{ ...S.viewToggle, ...(showThirds ? {} : S.viewToggleActive) }} onClick={() => setShowThirds(false)}>
              Grupos A–L
            </button>
            <button style={{ ...S.viewToggle, ...(showThirds ? S.viewToggleActive : {}) }} onClick={() => setShowThirds(true)}>
              🏅 Tabela de 3ºs Colocados
            </button>
          </div>

          {!showThirds ? (
            <>
              <div style={S.groupTabs}>
                {GROUPS.map(g => {
                  const gm = matches.filter(m => m.phase === "group" && m.group_letter === g);
                  const filled = gm.every(m => { const p = preds[m.id]; return p && p.home_goals != null && p.away_goals != null; });
                  return (
                    <button key={g} style={{ ...S.groupTab, ...(activeGroup === g ? S.groupTabActive : {}), ...(filled ? S.groupTabFilled : {}) }}
                      onClick={() => setActiveGroup(g)}>
                      {g}{filled ? "✓" : ""}
                    </button>
                  );
                })}
              </div>

              <div style={S.groupContent}>
                <h3 style={S.groupTitle}>GRUPO {activeGroup}</h3>
                <StandingsTable standings={getGroupStandings(activeGroup)} teams={teams} />
                <div style={S.matchList}>
                  {activeGroupMatches.map(m => (
                    <GroupMatchCard key={m.id} match={m} prediction={preds[m.id] || {}} onUpdate={val => setPred(m.id, val)} />
                  ))}
                </div>
                <div style={S.groupNav}>
                  {GROUPS.indexOf(activeGroup) > 0 && (
                    <button style={S.navBtn} onClick={() => setActiveGroup(GROUPS[GROUPS.indexOf(activeGroup) - 1])}>
                      ← Grupo {GROUPS[GROUPS.indexOf(activeGroup) - 1]}
                    </button>
                  )}
                  {GROUPS.indexOf(activeGroup) < GROUPS.length - 1 ? (
                    <button style={{ ...S.navBtn, ...S.navBtnRight }} onClick={() => setActiveGroup(GROUPS[GROUPS.indexOf(activeGroup) + 1])}>
                      Grupo {GROUPS[GROUPS.indexOf(activeGroup) + 1]} →
                    </button>
                  ) : (
                    <button style={{ ...S.navBtn, ...S.navBtnRight, background:"rgba(240,192,64,0.2)", borderColor:"rgba(240,192,64,0.5)", color:"#f0c040" }}
                      onClick={() => handlePhaseClick(1)}>
                      {groupMatchesFilled ? "Ir para 16-avos →" : "⚠ Preencha todos os jogos"}
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <ThirdsTable thirdsRanking={thirdsRanking} teams={teams} />
          )}
        </div>
      )}

      {/* KNOCKOUT */}
      {phase >= 1 && knockoutMatches && (
        <KnockoutPhase phase={phase} knockoutMatches={knockoutMatches} preds={preds} setPred={setPred} setPhase={setPhase} onSave={validateAndSave} handlePhaseClick={handlePhaseClick} />
      )}
    </div>
  );
}

// ── Standings table component ────────────────────────────────
function StandingsTable({ standings, teams }) {
  return (
    <div style={S.standingsPreview}>
      <div style={{ display:"flex", alignItems:"center", gap:"0.4rem", padding:"0 0.5rem 0.3rem", borderBottom:"1px solid rgba(255,255,255,0.07)", marginBottom:"0.25rem" }}>
        <span style={{ width:"18px" }} />
        <span style={{ flex:1, fontSize:"0.65rem", color:"rgba(255,255,255,0.3)", fontFamily:"Arial,sans-serif" }}>TIME</span>
        {["P","J","GD","GP","GC"].map(h => (
          <span key={h} style={{ width:"28px", textAlign:"center", fontSize:"0.65rem", color:"rgba(255,255,255,0.3)", fontFamily:"Arial,sans-serif" }}>{h}</span>
        ))}
      </div>
      {standings.map((row, idx) => {
        const t = teams.find(t => t.id === row.id);
        const isQ = idx < 2, is3 = idx === 2;
        return (
          <div key={row.id} style={{ ...S.standingRow, ...(isQ ? S.standingRowQ : is3 ? S.standingRow3 : {}) }}>
            <span style={S.standingPos}>{idx + 1}</span>
            <span style={{ flex:1, minWidth:0 }}><TeamBadge team={t} small /></span>
            <span style={{ ...S.standingStat, color:"#f0c040", fontWeight:"bold" }}>{row.pts || 0}</span>
            <span style={S.standingStat}>{row.mp || 0}</span>
            <span style={{ ...S.standingStat, color:(row.gd||0)>0?"#10b981":(row.gd||0)<0?"#f87171":"rgba(255,255,255,0.5)" }}>
              {(row.gd||0) >= 0 ? "+" : ""}{row.gd || 0}
            </span>
            <span style={S.standingStat}>{row.gf || 0}</span>
            <span style={S.standingStat}>{row.ga || 0}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Thirds ranking table ─────────────────────────────────────
function ThirdsTable({ thirdsRanking, teams }) {
  return (
    <div style={{ ...S.standingsPreview, marginTop:"0.5rem" }}>
      <p style={{ color:"rgba(240,192,64,0.8)", fontSize:"0.7rem", letterSpacing:"0.15em", fontFamily:"Arial,sans-serif", marginBottom:"0.75rem" }}>
        MELHORES 3ºS COLOCADOS — os 8 primeiros avançam
      </p>
      <div style={{ display:"flex", alignItems:"center", gap:"0.4rem", padding:"0 0.5rem 0.3rem", borderBottom:"1px solid rgba(255,255,255,0.07)", marginBottom:"0.25rem" }}>
        <span style={{ width:"22px", fontSize:"0.65rem", color:"rgba(255,255,255,0.3)", fontFamily:"Arial,sans-serif" }}>#</span>
        <span style={{ width:"28px", fontSize:"0.65rem", color:"rgba(255,255,255,0.3)", fontFamily:"Arial,sans-serif" }}>GR</span>
        <span style={{ flex:1, fontSize:"0.65rem", color:"rgba(255,255,255,0.3)", fontFamily:"Arial,sans-serif" }}>TIME</span>
        {["P","J","GD","GP","GC"].map(h => (
          <span key={h} style={{ width:"28px", textAlign:"center", fontSize:"0.65rem", color:"rgba(255,255,255,0.3)", fontFamily:"Arial,sans-serif" }}>{h}</span>
        ))}
      </div>
      {thirdsRanking.map((row, idx) => {
        const t = teams.find(t => t.id === row.id);
        const advances = idx < 8;
        return (
          <div key={row.id || idx} style={{ ...S.standingRow, ...(advances ? S.standingRowQ : {}), opacity: row.id ? 1 : 0.4 }}>
            <span style={{ ...S.standingPos, width:"22px" }}>{idx + 1}</span>
            <span style={{ width:"28px", fontSize:"0.75rem", color:"#f0c040", fontFamily:"'Bebas Neue',sans-serif" }}>GR.{row.group}</span>
            <span style={{ flex:1, minWidth:0 }}>{t ? <TeamBadge team={t} small /> : <span style={{ fontFamily:"Arial,sans-serif", fontSize:"0.8rem", color:"rgba(255,255,255,0.4)" }}>—</span>}</span>
            <span style={{ ...S.standingStat, color:"#f0c040", fontWeight:"bold" }}>{row.pts || 0}</span>
            <span style={S.standingStat}>{row.mp || 0}</span>
            <span style={{ ...S.standingStat, color:(row.gd||0)>0?"#10b981":(row.gd||0)<0?"#f87171":"rgba(255,255,255,0.5)" }}>
              {(row.gd||0) >= 0 ? "+" : ""}{row.gd || 0}
            </span>
            <span style={S.standingStat}>{row.gf || 0}</span>
            <span style={S.standingStat}>{row.ga || 0}</span>
          </div>
        );
      })}
      {thirdsRanking.length === 0 && (
        <p style={{ color:"rgba(255,255,255,0.3)", fontFamily:"Arial,sans-serif", fontSize:"0.85rem", textAlign:"center", padding:"1rem" }}>
          Preencha palpites nos grupos para ver a tabela de 3ºs colocados.
        </p>
      )}
    </div>
  );
}

// ── Confirmation modal ───────────────────────────────────────
function Modal({ title, body, confirmLabel, cancelLabel, onConfirm, onCancel, danger }) {
  return (
    <div style={S.modalOverlay}>
      <div style={S.modalBox}>
        <h3 style={{ color: danger ? "#f87171" : "#f0c040", fontSize:"1.1rem", letterSpacing:"0.05em", marginBottom:"0.75rem" }}>{title}</h3>
        <p style={{ color:"rgba(255,255,255,0.8)", fontFamily:"Arial,sans-serif", fontSize:"0.9rem", lineHeight:1.5, marginBottom:"1.5rem" }}>{body}</p>
        <div style={{ display:"flex", gap:"0.75rem", justifyContent:"flex-end" }}>
          <button style={S.modalCancelBtn} onClick={onCancel}>{cancelLabel}</button>
          <button style={{ ...S.modalConfirmBtn, background: danger ? "rgba(239,68,68,0.8)" : "linear-gradient(135deg,#f0c040,#e6a800)", color: danger ? "#fff" : "#0a0f1e" }} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── KO phase view ────────────────────────────────────────────
function KnockoutPhase({ phase, knockoutMatches, preds, setPred, setPhase, onSave, handlePhaseClick }) {
  const phaseMatchesMap = {
    1: knockoutMatches.r32 || [],
    2: knockoutMatches.r16 || [],
    3: knockoutMatches.qf || [],
    4: knockoutMatches.sf || [],
    5: knockoutMatches.final || [],
  };
  const phaseMatches = phaseMatchesMap[phase] || [];
  const phaseLabel = { 1:"16-AVOS DE FINAL", 2:"OITAVAS DE FINAL", 3:"QUARTAS DE FINAL", 4:"SEMIFINAIS", 5:"FINAL" }[phase];
  const isFinalPhase = phase === 5;
  const thirdMatch = knockoutMatches.third?.[0];

  return (
    <div style={S.content}>
      <h3 style={S.groupTitle}>{phaseLabel}</h3>
      {isFinalPhase && thirdMatch && (
        <>
          <p style={{ color:"rgba(255,255,255,0.5)", textAlign:"center", marginBottom:"0.5rem", fontSize:"0.85rem" }}>Disputa de 3º lugar</p>
          <KnockoutMatchCard match={thirdMatch} prediction={preds[thirdMatch.id] || {}} onUpdate={val => setPred(thirdMatch.id, val)} />
          <p style={{ color:"rgba(255,255,255,0.5)", textAlign:"center", margin:"1.25rem 0 0.5rem", fontSize:"0.85rem" }}>🏆 Grande Final</p>
        </>
      )}
      {phaseMatches.map(m => (
        <KnockoutMatchCard key={m.id} match={m} prediction={preds[m.id] || {}} onUpdate={val => setPred(m.id, val)} />
      ))}
      <div style={S.groupNav}>
        <button style={S.navBtn} onClick={() => handlePhaseClick(phase - 1)}>← Fase anterior</button>
        {!isFinalPhase ? (
          <button style={{ ...S.navBtn, ...S.navBtnRight }} onClick={() => setPhase(phase + 1)}>Próxima fase →</button>
        ) : (
          <button style={{ ...S.navBtn, ...S.navBtnRight, background:"linear-gradient(135deg,#f0c040,#e6a800)", color:"#0a0f1e", borderColor:"transparent", fontWeight:"bold" }} onClick={onSave}>
            ✅ SALVAR PALPITES
          </button>
        )}
      </div>
    </div>
  );
}

const S = {
  container: { minHeight:"100vh", background:"linear-gradient(135deg,#0a0f1e,#0d1f3c)", fontFamily:"'Bebas Neue','Impact','Arial Narrow',sans-serif", color:"#fff" },
  header: { display:"flex", alignItems:"center", padding:"1rem 1.5rem", borderBottom:"1px solid rgba(240,192,64,0.15)", background:"rgba(0,0,0,0.3)" },
  backBtn: { background:"transparent", border:"1px solid rgba(255,255,255,0.2)", color:"rgba(255,255,255,0.7)", padding:"0.4rem 0.8rem", borderRadius:"6px", cursor:"pointer", fontSize:"0.85rem", fontFamily:"Arial,sans-serif" },
  headerTitle: { flex:1, textAlign:"center", fontSize:"1.1rem", letterSpacing:"0.15em", color:"#f0c040", display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem" },
  headerSpacer: { width:"80px" },
  phaseTabs: { display:"flex", overflowX:"auto", borderBottom:"1px solid rgba(255,255,255,0.1)", background:"rgba(0,0,0,0.2)", padding:"0 1rem" },
  phaseTab: { padding:"0.75rem 1.1rem", background:"transparent", border:"none", color:"rgba(255,255,255,0.5)", fontSize:"0.85rem", cursor:"pointer", whiteSpace:"nowrap", borderBottom:"3px solid transparent", letterSpacing:"0.04em", fontFamily:"'Bebas Neue','Impact',sans-serif" },
  phaseTabActive: { color:"#f0c040", borderBottomColor:"#f0c040" },
  phaseTabLocked: { color:"rgba(255,255,255,0.25)", cursor:"not-allowed" },
  errorBox: { margin:"1rem", padding:"1rem", background:"rgba(255,80,80,0.15)", border:"1px solid rgba(255,80,80,0.4)", borderRadius:"8px", fontSize:"0.85rem", fontFamily:"Arial,sans-serif", color:"#ff9999" },
  content: { maxWidth:"700px", margin:"0 auto", padding:"1.5rem 1rem" },
  viewToggle: { padding:"0.4rem 1rem", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"20px", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:"0.8rem", fontFamily:"Arial,sans-serif" },
  viewToggleActive: { background:"rgba(240,192,64,0.15)", borderColor:"#f0c040", color:"#f0c040" },
  groupTabs: { display:"flex", flexWrap:"wrap", gap:"0.4rem", marginBottom:"1.25rem", justifyContent:"center" },
  groupTab: { width:"42px", height:"42px", borderRadius:"50%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.7)", cursor:"pointer", fontSize:"0.75rem", fontFamily:"'Bebas Neue',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"0", lineHeight:1 },
  groupTabActive: { background:"rgba(240,192,64,0.2)", borderColor:"#f0c040", color:"#f0c040" },
  groupTabFilled: { borderColor:"rgba(16,185,129,0.5)", color:"#10b981" },
  groupContent: {},
  groupTitle: { textAlign:"center", fontSize:"1.5rem", letterSpacing:"0.2em", color:"#f0c040", marginBottom:"0.75rem" },
  standingsPreview: { background:"rgba(0,0,0,0.3)", borderRadius:"10px", padding:"0.75rem", marginBottom:"1.25rem", border:"1px solid rgba(255,255,255,0.08)" },
  standingRow: { display:"flex", alignItems:"center", gap:"0.4rem", padding:"0.4rem 0.5rem", borderRadius:"6px", marginBottom:"0.2rem" },
  standingRowQ: { background:"rgba(16,185,129,0.1)", borderLeft:"2px solid rgba(16,185,129,0.5)" },
  standingRow3: { background:"rgba(240,192,64,0.08)", borderLeft:"2px solid rgba(240,192,64,0.3)" },
  standingPos: { width:"18px", textAlign:"center", color:"rgba(255,255,255,0.5)", fontSize:"0.85rem" },
  standingStat: { width:"28px", textAlign:"center", fontSize:"0.75rem", fontFamily:"Arial,sans-serif", color:"rgba(255,255,255,0.65)", flexShrink:0 },
  matchList: { display:"flex", flexDirection:"column", gap:"0.75rem" },
  groupNav: { display:"flex", justifyContent:"space-between", marginTop:"2rem", gap:"1rem" },
  navBtn: { flex:1, padding:"0.75rem 1rem", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"8px", color:"rgba(255,255,255,0.8)", cursor:"pointer", fontFamily:"Arial,sans-serif", fontSize:"0.9rem", maxWidth:"50%" },
  navBtnRight: { textAlign:"right" },
  modalOverlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, padding:"1rem" },
  modalBox: { background:"#0d1f3c", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"14px", padding:"2rem", maxWidth:"480px", width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.6)" },
  modalCancelBtn: { padding:"0.6rem 1.2rem", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"8px", color:"rgba(255,255,255,0.7)", cursor:"pointer", fontFamily:"Arial,sans-serif" },
  modalConfirmBtn: { padding:"0.6rem 1.4rem", border:"none", borderRadius:"8px", cursor:"pointer", fontFamily:"Arial,sans-serif", fontWeight:"bold", fontSize:"0.95rem" },
};
