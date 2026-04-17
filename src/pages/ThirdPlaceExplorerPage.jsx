import { useState, useMemo } from "react";
import { useApp } from "../App";
import { THIRD_PLACE_TABLE, getThirdPlaceMatchups } from "../lib/thirdPlaceTable";
import { buildBracket } from "../lib/bracket";

// Generate all C(12,8) = 495 combinations of 8 groups from 12
function combinations(arr, k) {
  const result = [];
  function helper(start, combo) {
    if (combo.length === k) { result.push([...combo]); return; }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }
  helper(0, []);
  return result;
}

const ALL_GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];
const SEED_SLOTS = ["1A","1B","1D","1E","1G","1I","1K","1L"];

// Pre-compute all 495 combinations
const ALL_COMBOS = combinations(ALL_GROUPS, 8).map(combo => {
  const key = combo.join(""); // already sorted since combinations() preserves order
  const matchups = getThirdPlaceMatchups(combo);
  const inTable = !!THIRD_PLACE_TABLE[key];
  return { key, groups: combo, matchups, inTable };
});

export default function ThirdPlaceExplorerPage() {
  const { setPage, realResults, matches, teams } = useApp();
  const [search, setSearch] = useState("");
  const [highlightSlot, setHighlightSlot] = useState(null);
  const [page, setPageNum] = useState(1);
  const PER_PAGE = 50;

  // Derive the current active combination from real results (group standings)
  const activeCombination = useMemo(() => deriveActiveCombination(teams, matches, realResults), [teams, matches, realResults]);
  const activeKey = activeCombination ? [...activeCombination].sort().join("") : null;

  // Filter
  const filtered = useMemo(() => {
    const q = search.toUpperCase().trim();
    if (!q) return ALL_COMBOS;
    return ALL_COMBOS.filter(c => {
      if (c.key.includes(q)) return true;
      // Also filter by matchup value e.g. "3E"
      return Object.values(c.matchups).some(v => v && v.toUpperCase().includes(q));
    });
  }, [search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageData = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Find active combo index
  const activeIdx = activeKey ? ALL_COMBOS.findIndex(c => c.key === activeKey) : -1;

  return (
    <div style={S.container}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => setPage("admin")}>← Admin</button>
        <h1 style={S.title}>🔍 EXPLORADOR DE CRUZAMENTOS</h1>
        <div style={S.headerSpacer} />
      </div>

      <div style={S.content}>
        {/* Info banner */}
        <div style={S.infoBanner}>
          <div style={S.infoLeft}>
            <p style={S.infoTitle}>495 COMBINAÇÕES POSSÍVEIS</p>
            <p style={S.infoSub}>8 de 12 grupos classificam seu 3º colocado. Esta tabela mostra qual 3º enfrenta cada 1º colocado.</p>
          </div>
          {activeKey && (
            <div style={S.activeBadge}>
              <p style={S.activeBadgeLabel}>COMBINAÇÃO ATUAL</p>
              <div style={S.activeBadgeGroups}>
                {(activeCombination||[]).map(g => (
                  <span key={g} style={S.groupPill}>{g}</span>
                ))}
              </div>
              <p style={S.activeBadgeIdx}>#{activeIdx + 1} de 495</p>
            </div>
          )}
        </div>

        {/* Active combination result */}
        {activeKey && (
          <div style={S.activeResult}>
            <p style={S.activeResultTitle}>CONFRONTOS DOS 3ºS COLOCADOS (RESULTADO ATUAL)</p>
            <div style={S.matchupGrid}>
              {SEED_SLOTS.map(slot => {
                const combo = ALL_COMBOS.find(c => c.key === activeKey);
                const opponent = combo?.matchups[slot];
                const opponentGroup = opponent?.replace("3","");
                const firstTeam = getFirstOfGroup(slot.replace("1",""), teams, matches, realResults);
                const thirdTeam = opponentGroup ? getThirdOfGroup(opponentGroup, teams, matches, realResults) : null;
                return (
                  <div key={slot} style={S.matchupCard}>
                    <div style={S.matchupSlot}>{slot}</div>
                    <div style={S.matchupTeam}>
                      {firstTeam ? <span>{firstTeam.flag} {firstTeam.name}</span> : <span style={{ opacity:0.4 }}>{slot}</span>}
                    </div>
                    <div style={S.matchupVs}>vs</div>
                    <div style={{ ...S.matchupSlot, background:"rgba(240,192,64,0.15)", color:"#f0c040" }}>{opponent||"?"}</div>
                    <div style={S.matchupTeam}>
                      {thirdTeam ? <span>{thirdTeam.flag} {thirdTeam.name}</span> : <span style={{ opacity:0.4 }}>{opponent||"?"}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search & filter */}
        <div style={S.searchRow}>
          <input
            style={S.searchInput}
            placeholder="Filtrar por grupos (ex: ABCDEFGH) ou confronto (ex: 3E)…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPageNum(1); }}
          />
          <span style={S.searchCount}>{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Slot filter buttons */}
        <div style={S.slotFilterRow}>
          <span style={S.slotFilterLabel}>Filtrar por slot:</span>
          {SEED_SLOTS.map(s => (
            <button key={s} style={{ ...S.slotBtn, ...(highlightSlot === s ? S.slotBtnActive : {}) }}
              onClick={() => setHighlightSlot(highlightSlot === s ? null : s)}>
              {s}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>#</th>
                <th style={S.th}>Grupos 3º classificados</th>
                {SEED_SLOTS.map(s => (
                  <th key={s} style={{ ...S.th, ...(highlightSlot === s ? S.thHighlight : {}), cursor:"pointer" }}
                    onClick={() => setHighlightSlot(highlightSlot === s ? null : s)}>
                    {s}
                  </th>
                ))}
                <th style={S.th}>Fonte</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((combo, i) => {
                const globalIdx = (page - 1) * PER_PAGE + i;
                const isActive = combo.key === activeKey;
                return (
                  <tr key={combo.key} style={{ ...S.tr, ...(isActive ? S.trActive : globalIdx % 2 === 0 ? {} : S.trAlt) }}>
                    <td style={S.td}>{globalIdx + 1}</td>
                    <td style={S.td}>
                      <div style={S.groupPills}>
                        {combo.groups.map(g => (
                          <span key={g} style={{ ...S.groupPill, ...(isActive ? S.groupPillActive : {}) }}>{g}</span>
                        ))}
                      </div>
                    </td>
                    {SEED_SLOTS.map(s => {
                      const val = combo.matchups[s] || "–";
                      const isHL = highlightSlot === s;
                      return (
                        <td key={s} style={{ ...S.td, ...(isHL ? S.tdHighlight : {}), fontFamily:"'Bebas Neue',sans-serif", fontSize:"0.95rem", color: isActive ? "#f0c040" : "rgba(255,255,255,0.85)" }}>
                          {val}
                        </td>
                      );
                    })}
                    <td style={{ ...S.td, fontSize:"0.65rem", color: combo.inTable ? "#10b981" : "rgba(255,255,255,0.25)" }}>
                      {combo.inTable ? "✓ FIFA" : "calc"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={S.pagination}>
            <button style={S.pageBtn} onClick={() => setPageNum(1)} disabled={page === 1}>«</button>
            <button style={S.pageBtn} onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            <span style={S.pageInfo}>{page} / {totalPages}</span>
            <button style={S.pageBtn} onClick={() => setPageNum(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
            <button style={S.pageBtn} onClick={() => setPageNum(totalPages)} disabled={page === totalPages}>»</button>
          </div>
        )}

        {/* Legend */}
        <div style={S.legend}>
          <div style={S.legendItem}><span style={{ ...S.legendDot, background:"rgba(240,192,64,0.3)" }} />Combinação ativa (baseada nos resultados atuais)</div>
          <div style={S.legendItem}><span style={{ ...S.legendDot, background:"rgba(16,185,129,0.3)" }} />✓ FIFA — entrada explícita na tabela oficial</div>
          <div style={S.legendItem}><span style={{ ...S.legendDot, background:"rgba(255,255,255,0.1)" }} />calc — calculado pelo algoritmo de fallback</div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function getStandingsForGroup(group, teams, matches, realResults) {
  const groupTeams = teams
    .filter(t => (t.group || t.group_letter) === group)
    .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
  const groupMatches = matches.filter(m => m.phase === "group" && m.group_letter === group);
  const table = {};
  groupTeams.forEach(t => { table[t.id] = { id: t.id, pts: 0, gf: 0, ga: 0, gd: 0, mp: 0 }; });
  groupMatches.forEach(m => {
    const r = realResults[m.id];
    if (!r || r.home_goals == null || r.away_goals == null) return;
    const h = m.home_team_id, a = m.away_team_id;
    if (!table[h] || !table[a]) return;
    const hg = Number(r.home_goals), ag = Number(r.away_goals);
    table[h].mp++; table[a].mp++;
    table[h].gf += hg; table[h].ga += ag; table[h].gd = table[h].gf - table[h].ga;
    table[a].gf += ag; table[a].ga += hg; table[a].gd = table[a].gf - table[a].ga;
    if (hg > ag) { table[h].pts += 3; } else if (ag > hg) { table[a].pts += 3; } else { table[h].pts++; table[a].pts++; }
  });
  return Object.values(table).sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : b.gd !== a.gd ? b.gd - a.gd : b.gf - a.gf);
}

function getFirstOfGroup(group, teams, matches, realResults) {
  const standings = getStandingsForGroup(group, teams, matches, realResults);
  const id = standings[0]?.id;
  return id ? teams.find(t => t.id === id) : null;
}

function getThirdOfGroup(group, teams, matches, realResults) {
  const standings = getStandingsForGroup(group, teams, matches, realResults);
  const id = standings[2]?.id;
  return id ? teams.find(t => t.id === id) : null;
}

function deriveActiveCombination(teams, matches, realResults) {
  const groupMatches = matches.filter(m => m.phase === "group");
  const allFilled = groupMatches.length > 0 && groupMatches.every(m => {
    const r = realResults[m.id];
    return r && r.home_goals != null && r.away_goals != null;
  });
  if (!allFilled) return null;
  const bracket = buildBracket(teams, matches, realResults);
  const best8 = bracket.qualGroups;
  return best8 && best8.length === 8 ? [...best8].sort() : null;
}

const S = {
  container: { minHeight:"100vh", background:"linear-gradient(135deg,#0a0f1e,#0d1f3c)", fontFamily:"'Bebas Neue','Impact','Arial Narrow',sans-serif", color:"#fff" },
  header: { display:"flex", alignItems:"center", padding:"1rem 1.5rem", borderBottom:"1px solid rgba(240,192,64,0.15)", background:"rgba(0,0,0,0.3)" },
  backBtn: { background:"transparent", border:"1px solid rgba(255,255,255,0.2)", color:"rgba(255,255,255,0.7)", padding:"0.4rem 0.8rem", borderRadius:"6px", cursor:"pointer", fontSize:"0.85rem", fontFamily:"Arial,sans-serif" },
  title: { flex:1, textAlign:"center", fontSize:"clamp(1rem,3vw,1.5rem)", color:"#f0c040", letterSpacing:"0.1em", margin:0 },
  headerSpacer: { width:"80px" },
  content: { maxWidth:"1100px", margin:"0 auto", padding:"1.5rem 1rem" },
  infoBanner: { display:"flex", gap:"1.5rem", marginBottom:"1.5rem", flexWrap:"wrap", alignItems:"flex-start" },
  infoLeft: { flex:1, minWidth:"200px" },
  infoTitle: { color:"#f0c040", fontSize:"1rem", letterSpacing:"0.1em", marginBottom:"0.25rem" },
  infoSub: { color:"rgba(255,255,255,0.5)", fontSize:"0.8rem", fontFamily:"Arial,sans-serif", lineHeight:1.5 },
  activeBadge: { background:"rgba(240,192,64,0.1)", border:"1px solid rgba(240,192,64,0.3)", borderRadius:"10px", padding:"0.75rem 1rem", minWidth:"200px" },
  activeBadgeLabel: { color:"rgba(240,192,64,0.7)", fontSize:"0.65rem", letterSpacing:"0.15em", fontFamily:"Arial,sans-serif", marginBottom:"0.5rem" },
  activeBadgeGroups: { display:"flex", flexWrap:"wrap", gap:"0.25rem", marginBottom:"0.5rem" },
  activeBadgeIdx: { color:"rgba(255,255,255,0.4)", fontSize:"0.75rem", fontFamily:"Arial,sans-serif" },
  activeResult: { background:"rgba(240,192,64,0.05)", border:"1px solid rgba(240,192,64,0.2)", borderRadius:"12px", padding:"1.25rem", marginBottom:"1.5rem" },
  activeResultTitle: { color:"rgba(240,192,64,0.8)", fontSize:"0.7rem", letterSpacing:"0.15em", fontFamily:"Arial,sans-serif", marginBottom:"1rem" },
  matchupGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:"0.5rem" },
  matchupCard: { display:"flex", alignItems:"center", gap:"0.4rem", padding:"0.5rem 0.6rem", background:"rgba(0,0,0,0.25)", borderRadius:"8px" },
  matchupSlot: { padding:"0.2rem 0.4rem", background:"rgba(255,255,255,0.08)", borderRadius:"4px", fontSize:"0.75rem", letterSpacing:"0.05em", flexShrink:0, minWidth:"2.5rem", textAlign:"center" },
  matchupTeam: { flex:1, fontSize:"0.75rem", fontFamily:"Arial,sans-serif", color:"rgba(255,255,255,0.8)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  matchupVs: { color:"rgba(255,255,255,0.3)", fontSize:"0.7rem", fontFamily:"Arial,sans-serif", flexShrink:0 },
  searchRow: { display:"flex", alignItems:"center", gap:"1rem", marginBottom:"0.75rem" },
  searchInput: { flex:1, padding:"0.6rem 1rem", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"8px", color:"#fff", fontSize:"0.85rem", fontFamily:"Arial,sans-serif", outline:"none" },
  searchCount: { color:"rgba(255,255,255,0.4)", fontSize:"0.8rem", fontFamily:"Arial,sans-serif", flexShrink:0 },
  slotFilterRow: { display:"flex", alignItems:"center", gap:"0.4rem", flexWrap:"wrap", marginBottom:"0.75rem" },
  slotFilterLabel: { color:"rgba(255,255,255,0.4)", fontSize:"0.75rem", fontFamily:"Arial,sans-serif", marginRight:"0.25rem" },
  slotBtn: { padding:"0.25rem 0.6rem", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"4px", color:"rgba(255,255,255,0.6)", cursor:"pointer", fontSize:"0.75rem", fontFamily:"'Bebas Neue',sans-serif" },
  slotBtnActive: { background:"rgba(240,192,64,0.2)", borderColor:"#f0c040", color:"#f0c040" },
  tableWrap: { overflowX:"auto", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.08)" },
  table: { width:"100%", borderCollapse:"collapse", fontSize:"0.82rem" },
  th: { padding:"0.6rem 0.5rem", background:"rgba(0,0,0,0.4)", color:"rgba(240,192,64,0.8)", textAlign:"center", letterSpacing:"0.05em", borderBottom:"1px solid rgba(255,255,255,0.1)", whiteSpace:"nowrap", userSelect:"none" },
  thHighlight: { background:"rgba(240,192,64,0.15)", color:"#f0c040" },
  tr: { borderBottom:"1px solid rgba(255,255,255,0.04)" },
  trAlt: { background:"rgba(255,255,255,0.02)" },
  trActive: { background:"rgba(240,192,64,0.12)", outline:"1px solid rgba(240,192,64,0.3)" },
  td: { padding:"0.45rem 0.5rem", textAlign:"center", fontFamily:"Arial,sans-serif", color:"rgba(255,255,255,0.7)", fontSize:"0.8rem" },
  tdHighlight: { background:"rgba(240,192,64,0.08)" },
  groupPills: { display:"flex", flexWrap:"wrap", gap:"2px", justifyContent:"center" },
  groupPill: { padding:"1px 5px", background:"rgba(255,255,255,0.1)", borderRadius:"3px", fontSize:"0.7rem", fontFamily:"'Bebas Neue',sans-serif", color:"rgba(255,255,255,0.7)" },
  groupPillActive: { background:"rgba(240,192,64,0.2)", color:"#f0c040" },
  pagination: { display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem", marginTop:"1.5rem" },
  pageBtn: { padding:"0.4rem 0.75rem", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"6px", color:"rgba(255,255,255,0.7)", cursor:"pointer", fontFamily:"Arial,sans-serif" },
  pageInfo: { color:"rgba(255,255,255,0.5)", fontFamily:"Arial,sans-serif", fontSize:"0.85rem", padding:"0 0.5rem" },
  legend: { marginTop:"1.5rem", display:"flex", flexWrap:"wrap", gap:"1rem" },
  legendItem: { display:"flex", alignItems:"center", gap:"0.4rem", color:"rgba(255,255,255,0.4)", fontSize:"0.75rem", fontFamily:"Arial,sans-serif" },
  legendDot: { width:"10px", height:"10px", borderRadius:"50%", flexShrink:0 },
};
