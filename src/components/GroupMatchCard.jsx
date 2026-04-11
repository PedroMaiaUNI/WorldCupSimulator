import { useState, useEffect } from "react";
import { useApp } from "../App";
import TeamBadge from "./TeamBadge";

// Only allow non-negative integers
function parseGoals(raw) {
  if (raw === "" || raw == null) return null;
  const n = Math.floor(Number(raw));
  return (!isNaN(n) && n >= 0) ? n : null;
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
    // Strip anything that isn't a digit
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

  let bgColor = "rgba(255,255,255,0.03)";
  if (filled) {
    if (hg > ag) bgColor = "rgba(16,185,129,0.10)";
    else if (ag > hg) bgColor = "rgba(239,68,68,0.08)";
    else bgColor = "rgba(240,192,64,0.07)";
  }

  return (
    <div style={{ ...S.card, background: bgColor }}>
      <div style={S.teams}>
        <div style={S.teamSide}><TeamBadge team={homeTeam} /></div>
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
        <div style={{ ...S.teamSide, alignItems: "flex-end" }}><TeamBadge team={awayTeam} reverse /></div>
      </div>
    </div>
  );
}

const S = {
  card: { borderRadius:"10px", border:"1px solid rgba(255,255,255,0.08)", padding:"1rem", transition:"background 0.2s" },
  teams: { display:"flex", alignItems:"center", gap:"0.75rem" },
  teamSide: { flex:1, display:"flex", flexDirection:"column", alignItems:"flex-start" },
  scoreArea: { display:"flex", alignItems:"center", gap:"0.5rem", flexShrink:0 },
  scoreInput: {
    width:"52px", height:"52px", textAlign:"center",
    background:"rgba(0,0,0,0.4)", border:"2px solid rgba(255,255,255,0.15)",
    borderRadius:"8px", color:"#ffffff", fontSize:"1.5rem",
    fontFamily:"'Bebas Neue','Impact',sans-serif", outline:"none",
  },
  vs: { color:"rgba(255,255,255,0.3)", fontSize:"1rem", fontFamily:"Arial,sans-serif" },
};
