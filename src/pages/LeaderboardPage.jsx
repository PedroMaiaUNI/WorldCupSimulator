import { useEffect, useState } from "react";
import { useApp } from "../App";
import { calcTotalScore } from "../lib/scoring";
import { getAllPredictions } from "../lib/supabase";

export default function LeaderboardPage() {
  const { sessions, matches, realResults, setPage, predictorName } = useApp();
  const [ranked, setRanked] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAndRank(); }, [sessions, realResults]);

  async function loadAndRank() {
    setLoading(true);
    let preds = [];
    try {
      preds = await getAllPredictions();
    } catch {
      preds = JSON.parse(localStorage.getItem("wc2026_preds") || "[]");
    }
    if (!preds || preds.length === 0) {
      preds = JSON.parse(localStorage.getItem("wc2026_preds") || "[]");
    }

    // Also pull sessions from localStorage in case Supabase isn't connected
    const localSessions = JSON.parse(localStorage.getItem("wc2026_sessions") || "[]");
    const allSessions = [...sessions];
    localSessions.forEach(ls => {
      if (!allSessions.some(s => s.session_id === ls.session_id)) allSessions.push(ls);
    });

    const scoredSessions = allSessions.map(s => {
      const sessionPreds = preds.filter(p => p.session_id === s.session_id);
      const score = calcTotalScore(sessionPreds, realResults, matches);
      return { ...s, computed_score: score };
    });
    scoredSessions.sort((a, b) => b.computed_score - a.computed_score);
    setRanked(scoredSessions);
    setLoading(false);
  }

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div style={S.container}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => setPage("home")}>← Início</button>
        <h1 style={S.title}>🏆 LEADERBOARD</h1>
        <div style={S.headerSpacer} />
      </div>

      <div style={S.content}>
        {loading ? (
          <div style={S.loading}>Carregando...</div>
        ) : ranked.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚽</div>
            <p>Nenhum palpiteiro ainda. Seja o primeiro!</p>
            <button style={S.startBtn} onClick={() => setPage("home")}>
              Fazer Palpites
            </button>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            {ranked.length >= 3 && (
              <div style={S.podium}>
                {[ranked[1], ranked[0], ranked[2]].map((s, i) => {
                  const realIdx = i === 0 ? 1 : i === 1 ? 0 : 2;
                  return s ? (
                    <div key={s.session_id} style={{ ...S.podiumItem, ...(realIdx === 0 ? S.podiumFirst : {}) }}>
                      <div style={S.podiumMedal}>{medals[realIdx]}</div>
                      <div style={S.podiumName}>{s.name}</div>
                      <div style={S.podiumScore}>{s.computed_score}<span style={S.podiumPts}>pts</span></div>
                      <div style={{ ...S.podiumBar, height: realIdx === 0 ? "80px" : realIdx === 1 ? "50px" : "35px" }} />
                    </div>
                  ) : null;
                })}
              </div>
            )}

            {/* Full table */}
            <div style={S.table}>
              {ranked.map((s, idx) => {
                const isMe = s.name === predictorName;
                return (
                  <div key={s.session_id} style={{ ...S.row, ...(isMe ? S.rowMe : {}), ...(idx < 3 ? S.rowTop : {}) }}>
                    <span style={S.rank}>
                      {idx < 3 ? medals[idx] : `${idx + 1}°`}
                    </span>
                    <span style={S.rowName}>{s.name}{isMe && <span style={S.youBadge}> (você)</span>}</span>
                    <span style={S.rowScore}>{s.computed_score} <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>pts</span></span>
                    <button style={S.viewBtn} onClick={() => setPage("viewpredictions")}>ver</button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div style={S.actions}>
          <button style={S.actionBtn} onClick={() => setPage("viewpredictions")}>
            👁️ Ver Palpites Detalhados
          </button>
        </div>
      </div>
    </div>
  );
}

const S = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a0f1e 0%, #0d1f3c 100%)",
    fontFamily: "'Bebas Neue','Impact','Arial Narrow',sans-serif",
    color: "#ffffff",
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "1rem 1.5rem",
    borderBottom: "1px solid rgba(240,192,64,0.15)",
    background: "rgba(0,0,0,0.3)",
  },
  backBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "rgba(255,255,255,0.7)",
    padding: "0.4rem 0.8rem",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontFamily: "Arial,sans-serif",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: "1.8rem",
    color: "#f0c040",
    letterSpacing: "0.15em",
    margin: 0,
  },
  headerSpacer: { width: "80px" },
  content: {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "2rem 1rem",
  },
  loading: {
    textAlign: "center",
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Arial,sans-serif",
    padding: "3rem",
  },
  empty: {
    textAlign: "center",
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Arial,sans-serif",
    padding: "3rem 1rem",
  },
  startBtn: {
    marginTop: "1rem",
    padding: "0.75rem 2rem",
    background: "linear-gradient(135deg,#f0c040,#e6a800)",
    border: "none",
    borderRadius: "8px",
    color: "#0a0f1e",
    cursor: "pointer",
    fontSize: "1rem",
    fontFamily: "'Bebas Neue',sans-serif",
    letterSpacing: "0.1em",
  },
  podium: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: "1rem",
    marginBottom: "2.5rem",
    padding: "1rem",
  },
  podiumItem: {
    flex: 1,
    maxWidth: "150px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
  },
  podiumFirst: {
    transform: "translateY(-10px)",
  },
  podiumMedal: { fontSize: "2rem" },
  podiumName: {
    fontSize: "0.9rem",
    textAlign: "center",
    color: "#ffffff",
    lineHeight: 1.2,
    maxWidth: "120px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  podiumScore: {
    fontSize: "1.5rem",
    color: "#f0c040",
    lineHeight: 1,
  },
  podiumPts: {
    fontSize: "0.7rem",
    color: "rgba(240,192,64,0.6)",
    marginLeft: "2px",
  },
  podiumBar: {
    width: "100%",
    background: "linear-gradient(180deg,rgba(240,192,64,0.3),rgba(240,192,64,0.1))",
    borderRadius: "4px 4px 0 0",
    marginTop: "0.5rem",
    border: "1px solid rgba(240,192,64,0.2)",
  },
  table: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.75rem 1rem",
    background: "rgba(255,255,255,0.04)",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.07)",
  },
  rowMe: {
    background: "rgba(240,192,64,0.08)",
    border: "1px solid rgba(240,192,64,0.25)",
  },
  rowTop: {},
  rank: {
    width: "2.5rem",
    textAlign: "center",
    fontSize: "1rem",
    color: "rgba(255,255,255,0.6)",
    flexShrink: 0,
  },
  rowName: {
    flex: 1,
    fontSize: "1rem",
    letterSpacing: "0.05em",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  youBadge: {
    fontSize: "0.65rem",
    color: "#f0c040",
    fontFamily: "Arial,sans-serif",
  },
  rowScore: {
    color: "#f0c040",
    fontSize: "1.2rem",
    flexShrink: 0,
  },
  viewBtn: {
    padding: "0.3rem 0.6rem",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "5px",
    color: "rgba(255,255,255,0.6)",
    cursor: "pointer",
    fontSize: "0.75rem",
    fontFamily: "Arial,sans-serif",
    flexShrink: 0,
  },
  actions: {
    marginTop: "2rem",
    textAlign: "center",
  },
  actionBtn: {
    padding: "0.75rem 2rem",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "8px",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontFamily: "Arial,sans-serif",
  },
};
