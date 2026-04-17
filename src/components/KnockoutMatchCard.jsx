import { useState, useEffect } from "react";
import { useApp } from "../App";

function parseGoals(raw) {
  if (raw === "" || raw == null) return null;
  const n = Math.floor(Number(raw));
  return (!isNaN(n) && n >= 0) ? n : null;
}

function TeamBlock({ team, reverse, isWinner }) {
  return (
    <div style={{
      display:"flex", flexDirection:"column",
      alignItems: reverse ? "flex-end" : "flex-start",
      minWidth: 0, overflow:"hidden", flex:1,
    }}>
      <span style={{ fontSize:"1.5rem", lineHeight:1 }}>{team?.flag ?? "🏳️"}</span>
      <span style={{
        color: isWinner ? "#10b981" : "#fff",
        fontSize:"0.78rem", fontFamily:"Arial,sans-serif", fontWeight:500,
        marginTop:"0.15rem",
        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
        maxWidth:"100%", textAlign: reverse ? "right" : "left",
      }}>
        {team?.name ?? "TBD"}
      </span>
      {isWinner && (
        <span style={{ fontSize:"0.6rem", color:"#10b981", fontFamily:"Arial,sans-serif", letterSpacing:"0.05em", marginTop:"0.1rem" }}>
          ✓ AVANÇA
        </span>
      )}
    </div>
  );
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
      <div style={{ borderRadius:"10px", border:"1px solid rgba(255,255,255,0.06)", padding:"1rem", marginBottom:"0.75rem", background:"rgba(255,255,255,0.02)" }}>
        <p style={{ textAlign:"center", color:"rgba(255,255,255,0.3)", fontFamily:"Arial,sans-serif", fontSize:"0.85rem", margin:0 }}>
          A definir — aguardando fases anteriores
        </p>
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
  const isDrawReg = hg != null && ag != null && hg === ag;

  let winner = null;
  if (hg != null && ag != null) {
    if (hg > ag) winner = "home";
    else if (ag > hg) winner = "away";
    else if (pens && pw) winner = pw;
  }

  const inputStyle = (val) => ({
    width:"48px", height:"48px", textAlign:"center",
    background:"rgba(0,0,0,0.4)",
    border:`2px solid ${val != null ? "rgba(240,192,64,0.5)" : "rgba(255,255,255,0.15)"}`,
    borderRadius:"8px", color:"#fff", fontSize:"1.4rem",
    fontFamily:"'Bebas Neue','Impact',sans-serif", outline:"none", flexShrink:0,
  });

  return (
    <div style={{ borderRadius:"10px", border:`1px solid ${winner ? "rgba(240,192,64,0.25)" : "rgba(255,255,255,0.08)"}`, padding:"0.85rem", marginBottom:"0.75rem", background:"rgba(255,255,255,0.03)" }}>
      {/* Teams + score */}
      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
        <TeamBlock team={homeTeam} isWinner={winner === "home"} />
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
        <TeamBlock team={awayTeam} reverse isWinner={winner === "away"} />
      </div>

      {/* Extra time / penalties */}
      <div style={{ display:"flex", gap:"1.25rem", marginTop:"0.65rem", paddingTop:"0.65rem", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
        <label style={{ display:"flex", alignItems:"center", gap:"0.35rem", cursor:"pointer", color:"rgba(255,255,255,0.6)", fontSize:"0.8rem", fontFamily:"Arial,sans-serif" }}>
          <input type="checkbox" checked={!!et} style={{ accentColor:"#f0c040" }}
            onChange={e => onUpdate({ extra_time:e.target.checked, penalties:e.target.checked?pens:false, penalty_winner:e.target.checked?pw:null })} />
          Prorrogação
        </label>
        {et && (
          <label style={{ display:"flex", alignItems:"center", gap:"0.35rem", cursor:"pointer", color:"rgba(255,255,255,0.6)", fontSize:"0.8rem", fontFamily:"Arial,sans-serif" }}>
            <input type="checkbox" checked={!!pens} style={{ accentColor:"#f0c040" }}
              onChange={e => onUpdate({ penalties:e.target.checked, penalty_winner:e.target.checked?pw:null })} />
            Pênaltis
          </label>
        )}
      </div>

      {/* Penalty winner */}
      {isDrawReg && pens && (
        <div style={{ marginTop:"0.65rem" }}>
          <p style={{ color:"rgba(255,255,255,0.5)", fontSize:"0.75rem", fontFamily:"Arial,sans-serif", marginBottom:"0.4rem" }}>
            Vencedor nos pênaltis:
          </p>
          <div style={{ display:"flex", gap:"0.6rem" }}>
            <button style={{ flex:1, padding:"0.55rem 0.4rem", background: pw==="home"?"rgba(240,192,64,0.2)":"rgba(255,255,255,0.05)", border:`1px solid ${pw==="home"?"#f0c040":"rgba(255,255,255,0.12)"}`, borderRadius:"8px", color: pw==="home"?"#f0c040":"rgba(255,255,255,0.7)", cursor:"pointer", fontSize:"0.82rem", fontFamily:"Arial,sans-serif", minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}
              onClick={() => onUpdate({ penalty_winner:"home" })}>
              {homeTeam?.flag} {homeTeam?.name}
            </button>
            <button style={{ flex:1, padding:"0.55rem 0.4rem", background: pw==="away"?"rgba(240,192,64,0.2)":"rgba(255,255,255,0.05)", border:`1px solid ${pw==="away"?"#f0c040":"rgba(255,255,255,0.12)"}`, borderRadius:"8px", color: pw==="away"?"#f0c040":"rgba(255,255,255,0.7)", cursor:"pointer", fontSize:"0.82rem", fontFamily:"Arial,sans-serif", minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}
              onClick={() => onUpdate({ penalty_winner:"away" })}>
              {awayTeam?.flag} {awayTeam?.name}
            </button>
          </div>
        </div>
      )}

      {isDrawReg && !pens && (
        <p style={{ marginTop:"0.65rem", color:"rgba(255,150,50,0.85)", fontSize:"0.75rem", fontFamily:"Arial,sans-serif", textAlign:"center", margin:"0.65rem 0 0" }}>
          ⚠ Empate no mata-mata — marque prorrogação e, se necessário, pênaltis
        </p>
      )}
    </div>
  );
}
