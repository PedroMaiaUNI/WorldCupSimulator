/**
 * Shared bracket builder.
 *
 * Official FIFA 2026 bracket (corrected):
 *
 * 16-avos (m1..m16):
 *   m1:  1E × 3ABCDF      m2:  1I × 3CDFGH
 *   m3:  2A × 2B          m4:  1F × 2C
 *   m5:  2K × 2L          m6:  1H × 2J
 *   m7:  1D × 3BEFIJ      m8:  1G × 3AEHIJ
 *   m9:  1C × 2F          m10: 2E × 2I
 *   m11: 1A × 3CEFHI      m12: 1L × 3EHIJK
 *   m13: 1J × 2H          m14: 2D × 2G
 *   m15: 1B × 3EFGIJ      m16: 1K × 3DEIJL
 *
 * Oitavas (o1..o8): o1=m1xm2, o2=m3xm4, o3=m5xm6, o4=m7xm8,
 *                   o5=m9xm10, o6=m11xm12, o7=m13xm14, o8=m15xm16
 *
 * Quartas (q1..q4): q1=o1xo2, q2=o3xo4, q3=o5xo6, q4=o7xo8
 *
 * Semis (s1,s2): s1=q1xq2, s2=q3xq4
 *
 * Final: winner(s1) × winner(s2)
 * 3º:   loser(s1) × loser(s2)
 *
 * Bracket separation ensures ESP/FRA/ARG/ENG can only meet in semis:
 *   - ESP (Grupo B, 1B) → m15 → o8 → q4 → s2
 *   - ENG (Grupo F, 1F) → m4 → o2 → q1 → s1
 *   - ARG (Grupo C, 1C) → m9 → o5 → q3 → s2
 *   - FRA (Grupo D, 1D) → m7 → o4 → q2 → s1
 *   Left semi (s1): ENG+FRA side (q1+q2)
 *   Right semi (s2): ESP+ARG side (q3+q4)
 */

import { calcGroupStandings } from "./scoring.js";
import { getThirdPlaceMatchups } from "./thirdPlaceTable.js";

const GROUPS_LIST = ["A","B","C","D","E","F","G","H","I","J","K","L"];

export function buildBracket(teams, matches, results) {
  // ── Group standings ──
  function getStandings(group) {
    const groupTeams = teams
      .filter(t => (t.group || t.group_letter) === group)
      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
      .map(t => t.id);
    if (!groupTeams.length) return [];
    const gm = matches.filter(m => m.phase === "group" && m.group_letter === group);
    return calcGroupStandings(groupTeams, gm, results);
  }

  const gr = {};
  for (const g of GROUPS_LIST) {
    const s = getStandings(g);
    gr[g] = {
      first:  s[0]?.id,
      second: s[1]?.id,
      third:  s[2]?.id,
      thirdStats: { ...(s[2] || {}), group: g },
    };
  }

  // ── Best 8 third-placed ──
  const thirds = GROUPS_LIST
    .map(g => gr[g].thirdStats)
    .filter(t => t && t.id)
    .sort((a, b) =>
      b.pts !== a.pts ? b.pts - a.pts :
      b.gd  !== a.gd  ? b.gd  - a.gd  :
      b.gf  !== a.gf  ? b.gf  - a.gf  :
      a.group.localeCompare(b.group)
    )
    .slice(0, 8);

  const qualGroups = thirds.map(t => t.group);
  const thirdMap = {};
  thirds.forEach(t => { thirdMap[`3${t.group}`] = t.id; });
  const tm = qualGroups.length === 8 ? getThirdPlaceMatchups(qualGroups) : {};

  // ── Winner resolver ──
  function winnerOf(matchId, home, away) {
    const r = results[matchId];
    if (!r || r.home_goals == null || r.away_goals == null) return null;
    const h = Number(r.home_goals), a = Number(r.away_goals);
    if (h > a) return home;
    if (a > h) return away;
    if (r.penalties && r.penalty_winner)
      return r.penalty_winner === "home" ? home : away;
    return null;
  }

  function loserOf(matchId, home, away) {
    const w = winnerOf(matchId, home, away);
    if (w == null) return null;
    return w === home ? away : home;
  }

  // ── Round of 32 (16-avos) — official FIFA 2026 bracket ──
  // Third-place slot keys follow the thirdPlaceTable format (e.g. "1E" -> opponent slot)
  // The third team that plays each 1st-place side comes from getThirdPlaceMatchups.
  const r32 = [
    // m1:  1E × 3ABCDF
    { id:"r32_m1",  home: gr["E"]?.first,  away: thirdMap[tm["1E"]]  },
    // m2:  1I × 3CDFGH
    { id:"r32_m2",  home: gr["I"]?.first,  away: thirdMap[tm["1I"]]  },
    // m3:  2A × 2B
    { id:"r32_m3",  home: gr["A"]?.second, away: gr["B"]?.second      },
    // m4:  1F × 2C
    { id:"r32_m4",  home: gr["F"]?.first,  away: gr["C"]?.second      },
    // m5:  2K × 2L
    { id:"r32_m5",  home: gr["K"]?.second, away: gr["L"]?.second      },
    // m6:  1H × 2J
    { id:"r32_m6",  home: gr["H"]?.first,  away: gr["J"]?.second      },
    // m7:  1D × 3BEFIJ
    { id:"r32_m7",  home: gr["D"]?.first,  away: thirdMap[tm["1D"]]  },
    // m8:  1G × 3AEHIJ
    { id:"r32_m8",  home: gr["G"]?.first,  away: thirdMap[tm["1G"]]  },
    // m9:  1C × 2F
    { id:"r32_m9",  home: gr["C"]?.first,  away: gr["F"]?.second      },
    // m10: 2E × 2I
    { id:"r32_m10", home: gr["E"]?.second, away: gr["I"]?.second      },
    // m11: 1A × 3CEFHI
    { id:"r32_m11", home: gr["A"]?.first,  away: thirdMap[tm["1A"]]  },
    // m12: 1L × 3EHIJK
    { id:"r32_m12", home: gr["L"]?.first,  away: thirdMap[tm["1L"]]  },
    // m13: 1J × 2H
    { id:"r32_m13", home: gr["J"]?.first,  away: gr["H"]?.second      },
    // m14: 2D × 2G
    { id:"r32_m14", home: gr["D"]?.second, away: gr["G"]?.second      },
    // m15: 1B × 3EFGIJ
    { id:"r32_m15", home: gr["B"]?.first,  away: thirdMap[tm["1B"]]  },
    // m16: 1K × 3DEIJL
    { id:"r32_m16", home: gr["K"]?.first,  away: thirdMap[tm["1K"]]  },
  ];

  // ── Oitavas (Round of 16) ──
  // o1=m1xm2, o2=m3xm4, o3=m5xm6, o4=m7xm8
  // o5=m9xm10, o6=m11xm12, o7=m13xm14, o8=m15xm16
  const r16 = [
    { id:"r16_o1", home: winnerOf("r32_m1", r32[0].home, r32[0].away),  away: winnerOf("r32_m2", r32[1].home, r32[1].away)  },
    { id:"r16_o2", home: winnerOf("r32_m3", r32[2].home, r32[2].away),  away: winnerOf("r32_m4", r32[3].home, r32[3].away)  },
    { id:"r16_o3", home: winnerOf("r32_m5", r32[4].home, r32[4].away),  away: winnerOf("r32_m6", r32[5].home, r32[5].away)  },
    { id:"r16_o4", home: winnerOf("r32_m7", r32[6].home, r32[6].away),  away: winnerOf("r32_m8", r32[7].home, r32[7].away)  },
    { id:"r16_o5", home: winnerOf("r32_m9", r32[8].home, r32[8].away),  away: winnerOf("r32_m10",r32[9].home, r32[9].away)  },
    { id:"r16_o6", home: winnerOf("r32_m11",r32[10].home,r32[10].away), away: winnerOf("r32_m12",r32[11].home,r32[11].away) },
    { id:"r16_o7", home: winnerOf("r32_m13",r32[12].home,r32[12].away), away: winnerOf("r32_m14",r32[13].home,r32[13].away) },
    { id:"r16_o8", home: winnerOf("r32_m15",r32[14].home,r32[14].away), away: winnerOf("r32_m16",r32[15].home,r32[15].away) },
  ];

  // ── Quartas (Quarter finals) ──
  // q1=o1xo2, q2=o3xo4, q3=o5xo6, q4=o7xo8
  const qf = [
    { id:"qf_q1", home: winnerOf("r16_o1",r16[0].home,r16[0].away), away: winnerOf("r16_o2",r16[1].home,r16[1].away) },
    { id:"qf_q2", home: winnerOf("r16_o3",r16[2].home,r16[2].away), away: winnerOf("r16_o4",r16[3].home,r16[3].away) },
    { id:"qf_q3", home: winnerOf("r16_o5",r16[4].home,r16[4].away), away: winnerOf("r16_o6",r16[5].home,r16[5].away) },
    { id:"qf_q4", home: winnerOf("r16_o7",r16[6].home,r16[6].away), away: winnerOf("r16_o8",r16[7].home,r16[7].away) },
  ];

  // ── Semis ──
  // s1=q1xq2, s2=q3xq4
  const sf = [
    { id:"sf_s1", home: winnerOf("qf_q1",qf[0].home,qf[0].away), away: winnerOf("qf_q2",qf[1].home,qf[1].away) },
    { id:"sf_s2", home: winnerOf("qf_q3",qf[2].home,qf[2].away), away: winnerOf("qf_q4",qf[3].home,qf[3].away) },
  ];

  // ── Final & 3rd place ──
  const sf1w = winnerOf("sf_s1", sf[0].home, sf[0].away);
  const sf2w = winnerOf("sf_s2", sf[1].home, sf[1].away);
  const sf1l = sf1w != null ? (sf1w === sf[0].home ? sf[0].away : sf[0].home) : null;
  const sf2l = sf2w != null ? (sf2w === sf[1].home ? sf[1].away : sf[1].home) : null;

  return {
    r32, r16, qf, sf,
    final: [{ id:"final",  home: sf1w, away: sf2w }],
    third: [{ id:"third",  home: sf1l, away: sf2l }],
    groupResults: gr,
    qualGroups,
    thirdMap,
    tm,
  };
}

/** Random result for a KO match (0-3 goals each side, resolves draws). */
export function randomKOResult() {
  const rand = () => Math.floor(Math.random() * 4);
  let hg = rand(), ag = rand();
  let extra_time = false, penalties = false, penalty_winner = null;
  if (hg === ag) {
    extra_time = true;
    if (Math.random() < 0.6) {
      penalties = true;
      penalty_winner = Math.random() < 0.5 ? "home" : "away";
    } else {
      if (Math.random() < 0.5) hg++; else ag++;
    }
  }
  return { home_goals: hg, away_goals: ag, extra_time, penalties, penalty_winner };
}

/** Generate random real results for all matches (iterative round-by-round). */
export function generateRandomResults(teams, matches) {
  const rand = () => Math.floor(Math.random() * 4);
  const results = {};
  matches.filter(m => m.phase === "group").forEach(m => {
    results[m.id] = { match_id: m.id, home_team_id: m.home_team_id, away_team_id: m.away_team_id, home_goals: rand(), away_goals: rand() };
  });
  for (const round of ["r32","r16","qf","sf","final","third"]) {
    const bracket = buildBracket(teams, matches, results);
    for (const m of (bracket[round] || [])) {
      if (!m.home || !m.away) continue;
      const res = randomKOResult();
      results[m.id] = { match_id: m.id, home_team_id: m.home, away_team_id: m.away, ...res };
    }
  }
  return results;
}

/** Generate random predictions for all matches (iterative round-by-round). */
export function generateRandomPredictions(teams, matches) {
  const rand = () => Math.floor(Math.random() * 4);
  const preds = {};
  matches.filter(m => m.phase === "group").forEach(m => {
    preds[m.id] = { match_id: m.id, home_goals: rand(), away_goals: rand() };
  });
  for (const round of ["r32","r16","qf","sf","final","third"]) {
    const bracket = buildBracket(teams, matches, preds);
    for (const m of (bracket[round] || [])) {
      if (!m.home || !m.away) continue;
      const res = randomKOResult();
      preds[m.id] = { match_id: m.id, home_goals: res.home_goals, away_goals: res.away_goals, extra_time: res.extra_time, penalties: res.penalties, penalty_winner: res.penalty_winner };
    }
  }
  return preds;
}
