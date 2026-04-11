import { useState, useEffect } from "react";
import { useApp } from "../App";
import TeamBadge from "./TeamBadge";

function parseGoals(raw) {
  if (raw === "" || raw == null) return null;
  const n = Math.floor(Number(raw));
  return (!isNaN(n) && n >= 0) ? n : null;
}

export default function KnockoutMatchCard({ match, prediction, onUpdate }) {
  const { getTeamById } = useApp();
  const homeTeam = getTeamById(match.home);
  const awayTeam = getTeamById(match.away);

  const [homeVal, setHomeVal] = useState(prediction.home_goals != null ? String(prediction.home_goals) : "");
  const [awayVal, setAwayVal] = useState(prediction.away_goals != null ? String(prediction.away_goals) : "");

  useEffect(() => { setHomeVal(prediction.home_goals != null ? String(prediction.home_goals) : ""); }, [prediction.home_goals]);
  useEffect(() => { setAwayVal(prediction.away_goals != null ? String(prediction.away_goals) : ""); }, [prediction.away_goals]);

  if (!match.home || !match.away) {
    return (
      <div style={S.card}>
        <div style={S.placeholder}>A definir (aguardando resultados anteriores)</div>
      </div>
    );
  }

  function handleChange(side, raw) {
    const clean = raw.replace(/[^0-9]/g, "");
    if (side === "home") setHomeVal(clean);
    else setAwayVal(clean);
  }

  function commit(side, raw) {
    const n = parseGoals(raw);
    if (n != null) onUpdate({ [side === "home" ? "home_goals" : "away_goals"]: n });
  }

  const hg = prediction.home_goals;
  const ag = prediction.away_goals;
  const et = prediction.extra_time;
  const pens = prediction.penalties;
  const pw = prediction.penalty_winner;
  const isDrawInRegulation = hg != null && ag != null && hg === ag;

  let winner = null;
  if (hg != null && ag != null) {
    if (hg > ag) winner = "home";
    else if (ag > hg) winner = "away";
    else if (pens && pw) winner = pw;
  }

  return (
    <div style={{ ...S.card, borderColor: winner ? "rgba(240,192,64,0.25)" : "rgba(255,255,255,0.08)" }}>
      <div style={S.teams}>
        <div style={S.teamSide}>
          <TeamBadge team={homeTeam} />
          {winner === "home" && <span style={S.winnerBadge}>✓ AVANÇA</span>}
        </div>
        <div style={S.scoreArea}>
          <input
            style={{ ...S.scoreInput, borderColor: hg != null ? "rgba(240,192,64,0.5)" : "rgba(255,255,255,0.15)" }}
            type="text" inputMode="numeric" pattern="[0-9]*"
            value={homeVal}
            onChange={e => handleChange("home", e.target.value)}
            onBlur={e => commit("home", e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commit("home", homeVal); }}
            placeholder="–" maxLength={2}
          />
          <span style={S.vs}>×</span>
          <input
            style={{ ...S.scoreInput, borderColor: ag != null ? "rgba(240,192,64,0.5)" : "rgba(255,255,255,0.15)" }}
            type="text" inputMode="numeric" pattern="[0-9]*"
            value={awayVal}
            onChange={e => handleChange("away", e.target.value)}
            onBlur={e => commit("away", e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commit("away", awayVal); }}
            placeholder="–" maxLength={2}
          />
        </div>
        <div style={{ ...S.teamSide, alignItems: "flex-end" }}>
          <TeamBadge team={awayTeam} reverse />
          {winner === "away" && <span style={S.winnerBadge}>✓ AVANÇA</span>}
        </div>
      </div>

      <div style={S.extras}>
        <label style={S.checkLabel}>
          <input type="checkbox" checked={!!et} style={{ accentColor:"#f0c040" }}
            onChange={e => { onUpdate({ extra_time: e.target.checked, penalties: e.target.checked ? pens : false, penalty_winner: e.target.checked ? pw : null }); }} />
          Prorrogação
        </label>
        {et && (
          <label style={S.checkLabel}>
            <input type="checkbox" checked={!!pens} style={{ accentColor:"#f0c040" }}
              onChange={e => { onUpdate({ penalties: e.target.checked, penalty_winner: e.target.checked ? pw : null }); }} />
            Pênaltis
          </label>
        )}
      </div>

      {isDrawInRegulation && pens && (
        <div style={S.penaltySection}>
          <p style={S.penaltyLabel}>Vencedor nos pênaltis:</p>
          <div style={S.penaltyBtns}>
            <button style={{ ...S.penaltyBtn, ...(pw === "home" ? S.penaltyBtnActive : {}) }} onClick={() => onUpdate({ penalty_winner:"home" })}>
              {homeTeam?.flag} {homeTeam?.name}
            </button>
            <button style={{ ...S.penaltyBtn, ...(pw === "away" ? S.penaltyBtnActive : {}) }} onClick={() => onUpdate({ penalty_winner:"away" })}>
              {awayTeam?.flag} {awayTeam?.name}
            </button>
          </div>
        </div>
      )}

      {isDrawInRegulation && !pens && (
        <div style={S.drawWarning}>⚠ Empate no mata-mata: marque prorrogação e, se necessário, pênaltis</div>
      )}
    </div>
  );
}

const S = {
  card: { borderRadius:"10px", border:"1px solid rgba(255,255,255,0.08)", padding:"1rem", marginBottom:"0.75rem", background:"rgba(255,255,255,0.03)", transition:"border-color 0.2s" },
  placeholder: { textAlign:"center", color:"rgba(255,255,255,0.3)", fontFamily:"Arial,sans-serif", fontSize:"0.85rem", padding:"1rem" },
  teams: { display:"flex", alignItems:"center", gap:"0.75rem" },
  teamSide: { flex:1, display:"flex", flexDirection:"column", alignItems:"flex-start", gap:"0.25rem" },
  scoreArea: { display:"flex", alignItems:"center", gap:"0.5rem", flexShrink:0 },
  scoreInput: {
    width:"52px", height:"52px", textAlign:"center",
    background:"rgba(0,0,0,0.4)", border:"2px solid rgba(255,255,255,0.15)",
    borderRadius:"8px", color:"#ffffff", fontSize:"1.5rem",
    fontFamily:"'Bebas Neue','Impact',sans-serif", outline:"none",
  },
  vs: { color:"rgba(255,255,255,0.3)", fontSize:"1rem", fontFamily:"Arial,sans-serif" },
  winnerBadge: { fontSize:"0.65rem", color:"#10b981", fontFamily:"Arial,sans-serif", letterSpacing:"0.05em" },
  extras: { display:"flex", gap:"1.5rem", marginTop:"0.75rem", paddingTop:"0.75rem", borderTop:"1px solid rgba(255,255,255,0.06)" },
  checkLabel: { display:"flex", alignItems:"center", gap:"0.4rem", cursor:"pointer", color:"rgba(255,255,255,0.6)", fontSize:"0.8rem", fontFamily:"Arial,sans-serif" },
  penaltySection: { marginTop:"0.75rem", paddingTop:"0.75rem", borderTop:"1px solid rgba(255,255,255,0.06)" },
  penaltyLabel: { color:"rgba(255,255,255,0.5)", fontSize:"0.75rem", fontFamily:"Arial,sans-serif", marginBottom:"0.5rem", letterSpacing:"0.05em" },
  penaltyBtns: { display:"flex", gap:"0.75rem" },
  penaltyBtn: { flex:1, padding:"0.6rem", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"8px", color:"rgba(255,255,255,0.7)", cursor:"pointer", fontSize:"0.85rem", fontFamily:"Arial,sans-serif" },
  penaltyBtnActive: { background:"rgba(240,192,64,0.2)", borderColor:"#f0c040", color:"#f0c040" },
  drawWarning: { marginTop:"0.75rem", color:"rgba(255,150,50,0.8)", fontSize:"0.75rem", fontFamily:"Arial,sans-serif", textAlign:"center" },
};
