/**
 * TeamBadge — exibe bandeira + nome de uma seleção.
 * Garante que o nome nunca estoure o container (truncado com ellipsis).
 * Props:
 *   team    — objeto { flag, name }
 *   reverse — inverte a ordem (nome à esquerda, bandeira à direita)
 *   small   — variante menor para tabelas/sidebars
 */
export default function TeamBadge({ team, small, reverse }) {
  const flagStyle = {
    fontSize: small ? "1rem" : "1.4rem",
    lineHeight: 1,
    flexShrink: 0,          // bandeira NUNCA encolhe
    display: "block",
  };

  const nameStyle = {
    color: "#ffffff",
    fontSize: small ? "0.72rem" : "0.82rem",
    fontFamily: "Arial, sans-serif",
    fontWeight: 500,
    // Truncagem — essencial para mobile
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,            // permite que flex encolha abaixo do conteúdo
    textAlign: reverse ? "right" : "left",
  };

  const wrapStyle = {
    display: "flex",
    alignItems: "center",
    flexDirection: reverse ? "row-reverse" : "row",
    gap: small ? "0.25rem" : "0.35rem",
    minWidth: 0,            // permite que o badge em si encolha dentro do flex pai
    overflow: "hidden",
  };

  if (!team) {
    return (
      <div style={wrapStyle}>
        <span style={{ ...flagStyle, fontSize: small ? "0.9rem" : "1.2rem",
          background:"rgba(255,255,255,0.08)", borderRadius:"3px",
          width:"1.4em", height:"1.1em", display:"flex", alignItems:"center",
          justifyContent:"center", color:"rgba(255,255,255,0.35)" }}>?</span>
        <span style={nameStyle}>TBD</span>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <span style={flagStyle}>{team.flag}</span>
      <span style={nameStyle}>{team.name}</span>
    </div>
  );
}
