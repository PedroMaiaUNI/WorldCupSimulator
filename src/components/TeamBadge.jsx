export default function TeamBadge({ team, small, reverse }) {
  if (!team) {
    return (
      <div style={{ ...S.badge, ...(reverse ? S.reverse : {}), ...(small ? S.small : {}) }}>
        <span style={S.unknownFlag}>?</span>
        <span style={{ ...S.name, ...(small ? S.nameSmall : {}) }}>TBD</span>
      </div>
    );
  }

  return (
    <div style={{ ...S.badge, ...(reverse ? S.reverse : {}), ...(small ? S.small : {}) }}>
      <span style={{ ...S.flag, ...(small ? S.flagSmall : {}) }} title={team.name}>
        {team.flag}
      </span>
      <span style={{ ...S.name, ...(small ? S.nameSmall : {}), ...(reverse ? S.nameReverse : {}) }}>
        {team.name}
      </span>
    </div>
  );
}

const S = {
  badge: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    minWidth: 0,
  },
  reverse: {
    flexDirection: "row-reverse",
  },
  small: {
    gap: "0.3rem",
  },
  flag: {
    fontSize: "1.6rem",
    lineHeight: 1,
    flexShrink: 0,
  },
  flagSmall: {
    fontSize: "1.1rem",
  },
  unknownFlag: {
    width: "1.6rem",
    height: "1.2rem",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.1)",
    borderRadius: "3px",
    fontSize: "0.9rem",
    color: "rgba(255,255,255,0.4)",
    flexShrink: 0,
  },
  name: {
    color: "#ffffff",
    fontSize: "0.85rem",
    fontFamily: "Arial,sans-serif",
    fontWeight: "500",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "110px",
  },
  nameSmall: {
    fontSize: "0.75rem",
    maxWidth: "90px",
  },
  nameReverse: {
    textAlign: "right",
  },
};
