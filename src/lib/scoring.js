// ============================================================
// SCORING ENGINE — Sistema de pontuação por fase
// ============================================================

// Retorna "home" ou "away" — funciona para palpites e resultados reais
export function getKnockoutWinnerSide(result) {
  if (!result) return null;
  const h = Number(result.home_goals);
  const a = Number(result.away_goals);
  if (h > a) return "home";
  if (a > h) return "away";
  if (result.penalties && result.penalty_winner) return result.penalty_winner;
  return null;
}

export function getKnockoutWinner(result, homeId, awayId) {
  const side = getKnockoutWinnerSide(result);
  if (!side) return null;
  return side === "home" ? homeId : awayId;
}

// ── Fase de Grupos ────────────────────────────────────────────
// Acertar vencedor/empate: 3 | Gols A: 1 | Gols B: 1 | Placar exato: +2
export function scoreGroupMatch(prediction, realResult) {
  if (!realResult || realResult.home_goals == null || realResult.away_goals == null) return 0;
  if (!prediction || prediction.home_goals == null || prediction.away_goals == null) return 0;
  let pts = 0;
  const pH = Number(prediction.home_goals), pA = Number(prediction.away_goals);
  const rH = Number(realResult.home_goals),  rA = Number(realResult.away_goals);
  const pRes = Math.sign(pH - pA), rRes = Math.sign(rH - rA);

  if (pRes === rRes) pts += 3;          // acertou vencedor ou empate
  if (pH === rH)     pts += 1;          // gols time A
  if (pA === rA)     pts += 1;          // gols time B
  if (pH === rH && pA === rA) pts += 2; // placar exato (bônus adicional)
  return pts;
}

// ── Classificação nos Grupos ──────────────────────────────────
// Avaliada após todos os jogos do grupo.
// predStandings e realStandings = arrays de IDs na ordem da tabela [1º, 2º, 3º, 4º]
// qualifiedThirds = Set de IDs de 3ºs colocados que avançaram
export function scoreGroupStandings(predStandings, realStandings, qualifiedThirds) {
  let pts = 0;
  // realStandings[0..3] = classificação real; predStandings[0..3] = palpite
  for (let pos = 0; pos < 4; pos++) {
    const teamId = realStandings[pos];
    const predPos = predStandings.indexOf(teamId);
    if (predPos === -1) continue;

    // Time classificado (top 2 ou 3º que avançou)
    const realAdvances = pos < 2 || qualifiedThirds.has(teamId);
    const predAdvances = predPos < 2 || qualifiedThirds.has(teamId);
    if (realAdvances && predAdvances) pts += 4;

    // Posição correta
    if (predPos === pos) pts += 2;
  }
  return pts;
}

// ── Saldo e Gols nos Grupos ───────────────────────────────────
// saldo correto: 1 | gols feitos correto: 1
export function scoreGroupStats(predRow, realRow) {
  let pts = 0;
  if (predRow && realRow) {
    if ((predRow.gd ?? null) === (realRow.gd ?? null) && realRow.gd != null) pts += 1;
    if ((predRow.gf ?? null) === (realRow.gf ?? null) && realRow.gf != null) pts += 1;
  }
  return pts;
}

// ── Mata-Mata por fase ────────────────────────────────────────
// phase: "r32" | "r16" | "qf" | "sf" | "third" | "final"
export function scoreKnockoutMatch(prediction, realResult, phase) {
  if (!realResult || realResult.home_goals == null || realResult.away_goals == null) return 0;
  if (!prediction || prediction.home_goals == null || prediction.away_goals == null) return 0;

  const pH = Number(prediction.home_goals), pA = Number(prediction.away_goals);
  const rH = Number(realResult.home_goals),  rA = Number(realResult.away_goals);

  const realWinner = getKnockoutWinnerSide(realResult);
  const predWinner = getKnockoutWinnerSide(prediction);
  const predDraw   = pH === pA;
  const realDraw   = rH === rA;
  const predET     = !!prediction.extra_time;
  const realET     = !!realResult.extra_time;

  let pts = 0;

  // Tabela de pontos por fase
  const P = PHASE_POINTS[phase] || PHASE_POINTS["r32"];

  // Vencedor (inclui pênaltis)
  if (predWinner && realWinner && predWinner === realWinner) pts += P.winner;

  // Gols A e B
  if (pH === rH) pts += P.goalsA;
  if (pA === rA) pts += P.goalsB;

  // Placar exato (em 90min)
  if (pH === rH && pA === rA) pts += P.exact;

  // Acertou empate em 90min
  if (predDraw && realDraw) pts += P.draw;

  // Prorrogação correta
  if (predET === realET) pts += P.et;

  // Bônus campeão (apenas na final)
  if (phase === "final" && predWinner && realWinner && predWinner === realWinner) pts += P.champion;

  return pts;
}

// Configuração de pontos por fase
const PHASE_POINTS = {
  r32:   { winner:5,  goalsA:1, goalsB:1, exact:3, draw:2, et:1, champion:0 },
  r16:   { winner:6,  goalsA:1, goalsB:1, exact:3, draw:2, et:1, champion:0 },
  qf:    { winner:7,  goalsA:1, goalsB:1, exact:3, draw:2, et:1, champion:0 },
  sf:    { winner:8,  goalsA:1, goalsB:1, exact:4, draw:2, et:1, champion:0 },
  third: { winner:5,  goalsA:1, goalsB:1, exact:3, draw:2, et:1, champion:0 },
  final: { winner:10, goalsA:2, goalsB:2, exact:5, draw:3, et:2, champion:15 },
};

// Mapa de ID de partida → fase
export function getMatchPhase(matchId) {
  if (matchId.startsWith("group_")) return "group";
  if (matchId.startsWith("r32_"))   return "r32";
  if (matchId.startsWith("r16_"))   return "r16";
  if (matchId.startsWith("qf_"))    return "qf";
  if (matchId.startsWith("sf_"))    return "sf";
  if (matchId === "third")          return "third";
  if (matchId === "final")          return "final";
  return "r32"; // fallback
}

// ── Score total ───────────────────────────────────────────────
export function calcTotalScore(predictions, realResults, matches) {
  let total = 0;
  const predMap = {};
  predictions.forEach(p => { predMap[p.match_id] = p; });

  const allMatchIds = new Set([
    ...matches.map(m => m.id),
    ...Object.keys(realResults),
  ]);

  for (const matchId of allMatchIds) {
    const pred = predMap[matchId];
    const real = realResults[matchId];
    if (!pred || !real || real.home_goals == null) continue;
    const phase = getMatchPhase(matchId);
    if (phase === "group") {
      total += scoreGroupMatch(pred, real);
    } else {
      total += scoreKnockoutMatch(pred, real, phase);
    }
  }
  return total;
}

// ── Classificação de grupos ───────────────────────────────────
export function calcGroupStandings(teamIds, matches, results) {
  if (!teamIds || teamIds.length === 0) return [];

  const table = {};
  teamIds.forEach(id => {
    if (id) table[id] = { id, pts: 0, gf: 0, ga: 0, gd: 0, mp: 0, w: 0, d: 0, l: 0 };
  });

  for (const match of matches) {
    const r = results[match.id];
    if (!r || r.home_goals == null || r.away_goals == null) continue;
    const h = match.home_team_id, a = match.away_team_id;
    if (!table[h] || !table[a]) continue;
    const hg = Number(r.home_goals), ag = Number(r.away_goals);
    table[h].mp++; table[a].mp++;
    table[h].gf += hg; table[h].ga += ag; table[h].gd = table[h].gf - table[h].ga;
    table[a].gf += ag; table[a].ga += hg; table[a].gd = table[a].gf - table[a].ga;
    if (hg > ag) { table[h].pts += 3; table[h].w++; table[a].l++; }
    else if (ag > hg) { table[a].pts += 3; table[a].w++; table[h].l++; }
    else { table[h].pts++; table[h].d++; table[a].pts++; table[a].d++; }
  }

  const rows = Object.values(table);

  function h2hStats(ids) {
    const h2h = {};
    ids.forEach(id => { h2h[id] = { pts: 0, gf: 0, ga: 0, gd: 0 }; });
    for (const match of matches) {
      const r = results[match.id];
      if (!r || r.home_goals == null || r.away_goals == null) continue;
      const h = match.home_team_id, a = match.away_team_id;
      if (!h2h[h] || !h2h[a]) continue;
      const hg = Number(r.home_goals), ag = Number(r.away_goals);
      h2h[h].gf += hg; h2h[h].ga += ag; h2h[h].gd = h2h[h].gf - h2h[h].ga;
      h2h[a].gf += ag; h2h[a].ga += hg; h2h[a].gd = h2h[a].gf - h2h[a].ga;
      if (hg > ag) h2h[h].pts += 3;
      else if (ag > hg) h2h[a].pts += 3;
      else { h2h[h].pts++; h2h[a].pts++; }
    }
    return h2h;
  }

  rows.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const tiedIds = rows.filter(r => r.pts === a.pts).map(r => r.id);
    if (tiedIds.length > 1) {
      const h2h = h2hStats(tiedIds);
      if (h2h[b.id].pts !== h2h[a.id].pts) return h2h[b.id].pts - h2h[a.id].pts;
      if (h2h[b.id].gd  !== h2h[a.id].gd)  return h2h[b.id].gd  - h2h[a.id].gd;
      if (h2h[b.id].gf  !== h2h[a.id].gf)  return h2h[b.id].gf  - h2h[a.id].gf;
    }
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return 0;
  });

  return rows;
}

export function generateGroupMatches(group, teams) {
  const [X, Y, Z, W] = teams;
  return [
    { home: X, away: Y }, { home: Z, away: W },
    { home: X, away: Z }, { home: Y, away: W },
    { home: Y, away: Z }, { home: W, away: X },
  ].map((m, i) => ({
    id: `group_${group}_${i + 1}`,
    phase: 'group',
    group_letter: group,
    home_team_id: m.home,
    away_team_id: m.away,
    match_order: i,
  }));
}
