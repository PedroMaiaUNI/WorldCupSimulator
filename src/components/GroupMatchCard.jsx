import { useState, useEffect } from "react";
import { useApp } from "../App";

function parseGoals(raw) {
  if (raw === "" || raw == null) return null;
  const n = Math.floor(Number(raw));
  return (!isNaN(n) && n >= 0) ? n : null;
}

// Exibe apenas a bandeira numa linha dedicada acima do nome — funciona bem em mobile
function TeamBlock({ team, reverse }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: reverse ? "flex-end" : "flex-start",
      minWidth: 0, overflow: "hidden", flex: 1,
    }}>
      <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>{team?.flag ?? "🏳️"}</span>
      <span style={{
        color: "#fff", fontSize: "0.78rem", fontFamily: "Arial,sans-serif",
        fontWeight: 500, marginTop: "0.15rem",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        maxWidth: "100%", textAlign: reverse ? "right" : "left",
      }}>
        {team?.name ?? "TBD"}
      </span>
    </div>
  );
}

export default function GroupMatchCard({ match, prediction, onUpdate }) {
  const { getTeamById } = useApp();
  const homeTeam = getTeamById(match.home_team_id);
  const awayTeam = getTeamById(match.away_team_id);

  const [homeVal, setHomeVal] = useState(prediction.home_goals != null ? String(prediction.home_goals) : "");
  const [awayVal, setAwayVal] = useState(prediction.away_goals != null ? String(prediction.away_goals) : "");

  useEffect(() => { setHomeVal(prediction.home_goals != null ? String(prediction.home_goals) : ""); }, [prediction.home_goals]);
  useEffect(() => { setAwayVal(prediction.away_goals != null ? String(prediction.away_goals) : ""); }, [prediction.away_goals]);

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
  const filled = hg != null && ag != null;

  let bg = "rgba(255,255,255,0.03)";
  if (filled) {
    if (hg > ag)      bg = "rgba(16,185,129,0.10)";
    else if (ag > hg) bg = "rgba(239,68,68,0.08)";
    else              bg = "rgba(240,192,64,0.07)";
  }

  const inputStyle = (val) => ({
    width: "48px", height: "48px", textAlign: "center",
    background: "rgba(0,0,0,0.4)",
    border: `2px solid ${val != null ? "rgba(240,192,64,0.5)" : "rgba(255,255,255,0.15)"}`,
    borderRadius: "8px", color: "#fff", fontSize: "1.4rem",
    fontFamily: "'Bebas Neue','Impact',sans-serif", outline: "none",
    flexShrink: 0,
  });

  return (
    <div style={{ borderRadius:"10px", border:"1px solid rgba(255,255,255,0.08)", padding:"0.75rem", background: bg, transition:"background 0.2s" }}>
      {/* Layout: [time casa] [gol] × [gol] [time visitante]
          As colunas dos times têm flex:1 com overflow hidden.
          A coluna do placar tem largura fixa e nunca encolhe. */}
      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
        <TeamBlock team={homeTeam} />
        {/* Score area — tamanho fixo, nunca encolhe */}
        <div style={{ display:"flex", alignItems:"center", gap:"0.4rem", flexShrink:0 }}>
          <input style={inputStyle(hg)} type="text" inputMode="numeric" pattern="[0-9]*"
            value={homeVal} onChange={e => handleChange("home", e.target.value)}
            onBlur={e => commit("home", e.target.value)}
            onKeyDown={e => e.key === "Enter" && commit("home", homeVal)}
            placeholder="–" maxLength={2} />
          <span style={{ color:"rgba(255,255,255,0.3)", fontSize:"0.9rem", fontFamily:"Arial,sans-serif", flexShrink:0 }}>×</span>
          <input style={inputStyle(ag)} type="text" inputMode="numeric" pattern="[0-9]*"
            value={awayVal} onChange={e => handleChange("away", e.target.value)}
            onBlur={e => commit("away", e.target.value)}
            onKeyDown={e => e.key === "Enter" && commit("away", awayVal)}
            placeholder="–" maxLength={2} />
        </div>
        <TeamBlock team={awayTeam} reverse />
      </div>
    </div>
  );
}
