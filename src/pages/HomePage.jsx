import { useState } from "react";
import { useApp } from "../App";

export default function HomePage() {
  const { handleStartPredictor, setPage, checkAdmin, nameExists, palpitesAbertos } = useApp();
  const [name, setName] = useState("");
  const [adminInput, setAdminInput] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [nameError, setNameError] = useState("");

  function handleStart() {
    if (!palpitesAbertos) return;
    if (!name.trim()) { setNameError("Digite seu nome para continuar!"); return; }
    if (name.trim().length < 2) { setNameError("Nome muito curto."); return; }
    if (nameExists(name)) { setNameError(`O nome "${name.trim()}" já foi usado. Escolha outro.`); return; }
    handleStartPredictor(name);
  }

  function handleAdminLogin() {
    const ok = checkAdmin(adminInput);
    if (!ok) setAdminError("Senha incorreta!");
    else setAdminError("");
  }

  return (
    <div style={S.container}>
      <div style={S.bgOverlay} />
      <header style={S.header}>
        <div style={S.trophy}>🏆</div>
        <h1 style={S.title}>COPA DO MUNDO</h1>
        <h2 style={S.subtitle}>PALPITES 2026</h2>
        <div style={S.flags}>🇺🇸 🇨🇦 🇲🇽</div>
        <p style={S.hosted}>USA · CANADA · MEXICO</p>
      </header>

      <main style={S.card}>
        <div style={S.cardInner}>

          {/* Banner de encerramento — visível apenas quando fechado */}
          {!palpitesAbertos && (
            <div style={S.closedBanner}>
              <span style={S.closedIcon}>🔒</span>
              <div>
                <p style={S.closedTitle}>PALPITES ENCERRADOS</p>
                <p style={S.closedSub}>A fase de palpites foi encerrada pelo administrador.</p>
              </div>
            </div>
          )}

          <p style={S.cardLabel}>SEU NOME DE PALPITEIRO</p>
          <input
            style={{ ...S.input, ...(palpitesAbertos ? {} : S.inputDisabled) }}
            type="text" placeholder="Ex: Zé do Futebol" value={name}
            disabled={!palpitesAbertos}
            onChange={e => { setName(e.target.value); setNameError(""); }}
            onKeyDown={e => e.key === "Enter" && handleStart()}
            maxLength={30}
          />
          {nameError && <p style={S.error}>{nameError}</p>}

          <button
            style={{ ...S.startBtn, ...(palpitesAbertos ? {} : S.startBtnDisabled) }}
            onClick={handleStart}
            disabled={!palpitesAbertos}
          >
            <span>{palpitesAbertos ? "⚽" : "🔒"}</span>
            {palpitesAbertos ? "FAZER PALPITES" : "PALPITES ENCERRADOS"}
          </button>

          <div style={S.divider}>
            <span style={S.dividerLine} /><span style={S.dividerText}>ou</span><span style={S.dividerLine} />
          </div>
          <div style={S.navRow}>
            <button style={S.navBtn} onClick={() => setPage("leaderboard")}>🥇 Leaderboard</button>
            <button style={S.navBtn} onClick={() => setPage("viewpredictions")}>👁️ Ver Palpites</button>
          </div>
          <div style={S.adminArea}>
            {!adminMode ? (
              <button style={S.adminLink} onClick={() => setAdminMode(true)} title="Acesso restrito">⚙</button>
            ) : (
              <div style={S.adminPanel}>
                <p style={S.adminLabel}>Painel Administrativo</p>
                <div style={S.adminRow}>
                  <input style={S.adminInput} type="password" placeholder="Senha" value={adminInput}
                    onChange={e => { setAdminInput(e.target.value); setAdminError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleAdminLogin()} />
                  <button style={S.adminBtn} onClick={handleAdminLogin}>→</button>
                </div>
                {adminError && <p style={S.error}>{adminError}</p>}
                <button style={S.adminLink} onClick={() => setAdminMode(false)}>✕ fechar</button>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer style={S.footer}>
        <p>48 SELEÇÕES · 12 GRUPOS · FASE DE GRUPOS + MATA-MATA</p>
      </footer>
    </div>
  );
}

const S = {
  container: { minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#0a0f1e 0%,#0d1f3c 50%,#0a1628 100%)", fontFamily:"'Bebas Neue','Impact','Arial Narrow',sans-serif", position:"relative", overflow:"hidden", padding:"2rem 1rem" },
  bgOverlay: { position:"absolute", inset:0, background:"radial-gradient(ellipse at 20% 50%,rgba(240,192,64,0.08) 0%,transparent 60%),radial-gradient(ellipse at 80% 50%,rgba(16,185,129,0.06) 0%,transparent 60%)", pointerEvents:"none" },
  header: { textAlign:"center", marginBottom:"2.5rem", position:"relative", zIndex:1 },
  trophy: { fontSize:"4rem", display:"block", marginBottom:"0.5rem", filter:"drop-shadow(0 0 20px rgba(240,192,64,0.5))" },
  title: { fontSize:"clamp(2.5rem,8vw,5rem)", color:"#f0c040", margin:0, letterSpacing:"0.1em", textShadow:"0 0 40px rgba(240,192,64,0.3)", lineHeight:1 },
  subtitle: { fontSize:"clamp(1.2rem,4vw,2.5rem)", color:"#fff", margin:"0.25rem 0", letterSpacing:"0.3em", fontWeight:400 },
  flags: { fontSize:"2rem", margin:"0.75rem 0 0.25rem", letterSpacing:"0.5rem" },
  hosted: { color:"rgba(255,255,255,0.4)", fontSize:"0.8rem", letterSpacing:"0.3em", fontFamily:"Arial,sans-serif", margin:0 },
  card: { width:"100%", maxWidth:"480px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(240,192,64,0.2)", borderRadius:"16px", backdropFilter:"blur(20px)", boxShadow:"0 20px 60px rgba(0,0,0,0.5)", position:"relative", zIndex:1 },
  cardInner: { padding:"2.5rem 2rem" },
  closedBanner: { display:"flex", alignItems:"center", gap:"0.75rem", background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"10px", padding:"0.85rem 1rem", marginBottom:"1.25rem" },
  closedIcon: { fontSize:"1.5rem", flexShrink:0 },
  closedTitle: { color:"#f87171", fontSize:"0.95rem", letterSpacing:"0.1em", margin:"0 0 0.15rem", fontFamily:"'Bebas Neue',sans-serif" },
  closedSub: { color:"rgba(255,255,255,0.5)", fontSize:"0.75rem", fontFamily:"Arial,sans-serif", margin:0 },
  cardLabel: { color:"rgba(240,192,64,0.8)", fontSize:"0.75rem", letterSpacing:"0.2em", textAlign:"center", marginBottom:"1rem", fontFamily:"Arial,sans-serif" },
  input: { width:"100%", padding:"1rem 1.25rem", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(240,192,64,0.3)", borderRadius:"10px", color:"#fff", fontSize:"1.1rem", fontFamily:"Arial,sans-serif", outline:"none", boxSizing:"border-box", marginBottom:"0.5rem" },
  inputDisabled: { opacity:0.35, cursor:"not-allowed" },
  error: { color:"#ff6b6b", fontSize:"0.8rem", fontFamily:"Arial,sans-serif", margin:"0.25rem 0 0.75rem", textAlign:"center" },
  startBtn: { width:"100%", padding:"1rem", background:"linear-gradient(135deg,#f0c040,#e6a800)", border:"none", borderRadius:"10px", color:"#0a0f1e", fontSize:"1.4rem", letterSpacing:"0.15em", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem", marginTop:"1rem", fontFamily:"'Bebas Neue','Impact',sans-serif", boxShadow:"0 4px 20px rgba(240,192,64,0.3)" },
  startBtnDisabled: { background:"rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.3)", boxShadow:"none", cursor:"not-allowed" },
  divider: { display:"flex", alignItems:"center", gap:"1rem", margin:"1.5rem 0" },
  dividerLine: { flex:1, height:"1px", background:"rgba(255,255,255,0.1)" },
  dividerText: { color:"rgba(255,255,255,0.3)", fontSize:"0.8rem", fontFamily:"Arial,sans-serif" },
  navRow: { display:"flex", gap:"1rem" },
  navBtn: { flex:1, padding:"0.75rem", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"8px", color:"#fff", fontSize:"0.85rem", cursor:"pointer", fontFamily:"Arial,sans-serif" },
  adminArea: { textAlign:"center", marginTop:"2rem" },
  adminLink: { background:"transparent", border:"none", color:"rgba(255,255,255,0.15)", cursor:"pointer", fontSize:"0.85rem", fontFamily:"Arial,sans-serif" },
  adminPanel: { background:"rgba(0,0,0,0.3)", borderRadius:"8px", padding:"1rem", border:"1px solid rgba(255,255,255,0.1)" },
  adminLabel: { color:"rgba(255,255,255,0.5)", fontSize:"0.75rem", fontFamily:"Arial,sans-serif", marginBottom:"0.75rem", letterSpacing:"0.1em" },
  adminRow: { display:"flex", gap:"0.5rem", marginBottom:"0.5rem" },
  adminInput: { flex:1, padding:"0.5rem 0.75rem", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"6px", color:"#fff", fontSize:"0.9rem", fontFamily:"Arial,sans-serif", outline:"none" },
  adminBtn: { padding:"0.5rem 1rem", background:"rgba(240,192,64,0.2)", border:"1px solid rgba(240,192,64,0.4)", borderRadius:"6px", color:"#f0c040", cursor:"pointer", fontSize:"1rem" },
  footer: { marginTop:"2rem", color:"rgba(255,255,255,0.2)", fontSize:"0.7rem", letterSpacing:"0.2em", textAlign:"center", fontFamily:"Arial,sans-serif", position:"relative", zIndex:1 },
};
