"use client";
// components/ExploraApp.jsx — v3: careers.md + panel orientadores completo

import { useState, useEffect, useRef, useCallback } from "react";
import { SESSIONS_CONFIG } from "@/lib/systemPrompt";

export default function ExploraApp() {
  // ── screens: loading | choose | register | login | chat | admin
  const [screen, setScreen]           = useState("loading");
  const [authError, setAuthError]     = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // register
  const [regNick, setRegNick]   = useState("");
  const [regId, setRegId]       = useState("");
  const [regPass, setRegPass]   = useState("");
  const [regPass2, setRegPass2] = useState("");

  // login
  const [loginId, setLoginId]     = useState("");
  const [loginPass, setLoginPass] = useState("");

  // session
  const [userId, setUserId]       = useState("");
  const [userName, setUserName]   = useState("");
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [isTyping, setIsTyping]   = useState(false);
  const [userProfile, setUserProfile]             = useState(null);
  const [currentSession, setCurrentSession]       = useState(1);
  const [completedSessions, setCompletedSessions] = useState([]);

  // admin
  const [adminUnlocked, setAdminUnlocked]   = useState(false);
  const [adminPass, setAdminPass]           = useState("");
  const [adminTab, setAdminTab]             = useState("students"); // students | careers
  const [students, setStudents]             = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [careersContent, setCareersContent] = useState("");
  const [careersStatus, setCareersStatus]   = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const chatEndRef  = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("explora_session");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.userId) { restoreSession(p); return; }
      } catch {}
    }
    setScreen("choose");
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const restoreSession = (s) => {
    setUserId(s.userId); setUserName(s.userName);
    setMessages(s.messages || []); setUserProfile(s.profile || null);
    setCurrentSession(s.currentSession || 1);
    setCompletedSessions(s.completedSessions || []);
    setScreen("chat");
  };

  const saveLocal = (data) => localStorage.setItem("explora_session", JSON.stringify(data));

  // ── REGISTER
  const handleRegister = async () => {
    setAuthError("");
    if (!regNick.trim())         return setAuthError("¿Cómo te gustaría que te llamemos?");
    if (!/^\d{10}$/.test(regId)) return setAuthError("El ID debe tener exactamente 10 dígitos (ej: 0000123456)");
    if (regPass.length < 6)      return setAuthError("La contraseña debe tener al menos 6 caracteres");
    if (regPass !== regPass2)    return setAuthError("Las contraseñas no coinciden");
    setAuthLoading(true);
    try {
      const res  = await fetch("/api/auth/register", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ studentId:regId, nickname:regNick.trim(), password:regPass }) });
      const data = await res.json();
      if (!res.ok) return setAuthError(data.error);
      setUserId(data.studentId); setUserName(data.nickname);
      setCurrentSession(1); setCompletedSessions([]); setMessages([]);
      setScreen("chat");
      setTimeout(() => sendWelcomeMessage(data.nickname, data.studentId), 300);
    } catch { setAuthError("Error de conexión. Intenta de nuevo."); }
    finally { setAuthLoading(false); }
  };

  // ── LOGIN
  const handleLogin = async () => {
    setAuthError("");
    if (!/^\d{10}$/.test(loginId)) return setAuthError("El ID debe tener 10 dígitos");
    if (!loginPass)                return setAuthError("Ingresa tu contraseña");
    setAuthLoading(true);
    try {
      const res  = await fetch("/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ studentId:loginId, password:loginPass }) });
      const data = await res.json();
      if (!res.ok) return setAuthError(data.error);
      setUserId(data.studentId); setUserName(data.nickname);
      setMessages(data.messages || []); setUserProfile(data.profile);
      setCurrentSession(data.currentSession); setCompletedSessions(data.completedSessions);
      saveLocal({ userId:data.studentId, userName:data.nickname, messages:data.messages||[], profile:data.profile, currentSession:data.currentSession, completedSessions:data.completedSessions });
      setScreen("chat");
    } catch { setAuthError("Error de conexión. Intenta de nuevo."); }
    finally { setAuthLoading(false); }
  };

  // ── WELCOME
  const sendWelcomeMessage = async (name, uid) => {
    setIsTyping(true);
    const initMsgs = [{ role:"user", content:`Hola, me llamo ${name} y quiero empezar el proceso Explora Tu Carrera.` }];
    try {
      const res  = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ messages:initMsgs, userProfile:null, studentId:uid, sessionNumber:1 }) });
      const data = await res.json();
      const reply = data.content || `¡Hola ${name}! Soy Explora. ¿Qué te trajo hoy aquí?`;
      const newMsgs = [{ role:"user", content:initMsgs[0].content }, { role:"assistant", content:reply }];
      setMessages(newMsgs);
      saveLocal({ userId:uid, userName:name, messages:newMsgs, profile:null, currentSession:1, completedSessions:[] });
    } catch {
      setMessages([{ role:"assistant", content:`¡Hola ${name}! Soy Explora. ¿Qué te trajo hoy aquí?` }]);
    }
    setIsTyping(false);
  };

  // ── SEND MESSAGE
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isTyping) return;
    const userMsg     = { role:"user", content:input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages); setInput(""); setIsTyping(true);
    try {
      const res  = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ messages:newMessages, userProfile, studentId:userId, sessionNumber:currentSession }) });
      const data = await res.json();
      const reply = data.content || "Error al responder. Intenta de nuevo.";
      const finalMsgs = [...newMessages, { role:"assistant", content:reply }];
      setMessages(finalMsgs);

      let newSession = currentSession, newCompleted = [...completedSessions];
      const match = reply.match(/Has completado la Sesión (\d)/);
      if (match) {
        const num = parseInt(match[1]);
        newCompleted = [...new Set([...completedSessions, num])];
        newSession   = Math.min(num + 1, 3);
        setCompletedSessions(newCompleted); setCurrentSession(newSession);
        await fetch("/api/progress", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ studentId:userId, currentSession:newSession, completedSessions:newCompleted }) });
      }

      saveLocal({ userId, userName, messages:finalMsgs, profile:userProfile, currentSession:newSession, completedSessions:newCompleted });
      if (finalMsgs.length % 6 === 0) updateProfile(finalMsgs);
    } catch {
      setMessages([...newMessages, { role:"assistant", content:"Error de conexión. Recarga e intenta de nuevo." }]);
    }
    setIsTyping(false);
  }, [input, messages, isTyping, userId, userName, userProfile, currentSession, completedSessions]);

  const updateProfile = async (msgs) => {
    try {
      const res  = await fetch("/api/profile", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ messages:msgs, currentProfile:userProfile, studentId:userId }) });
      const data = await res.json();
      if (data.profile) {
        setUserProfile(data.profile);
        const saved = JSON.parse(localStorage.getItem("explora_session") || "{}");
        saveLocal({ ...saved, profile:data.profile });
      }
    } catch {}
  };

  const handleKeyDown = (e) => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const logout = () => {
    if (!confirm("¿Cerrar sesión? Tu progreso está guardado.")) return;
    localStorage.removeItem("explora_session");
    setUserId(""); setUserName(""); setMessages([]); setUserProfile(null);
    setCurrentSession(1); setCompletedSessions([]);
    setScreen("choose");
  };

  // ── ADMIN AUTH
  const unlockAdmin = async () => {
    const res = await fetch("/api/admin", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ password:adminPass }) });
    if (res.ok) {
      setAdminUnlocked(true);
      loadStudents();
      loadCareers();
    } else {
      alert("Contraseña incorrecta");
    }
  };

  const loadStudents = async () => {
    setStudentsLoading(true);
    try {
      const res  = await fetch("/api/admin/students", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ password:adminPass }) });
      const data = await res.json();
      if (data.students) setStudents(data.students);
    } catch {}
    setStudentsLoading(false);
  };

  const loadCareers = async () => {
    try {
      const res  = await fetch("/api/careers");
      const data = await res.json();
      setCareersContent(data.content || "");
    } catch {}
  };

  // ── PDF EXPORT
  const exportPDF = (student) => {
    const profile = student.profile || {};
    const sessionLabel = ["", "Sesión 1: Autoconocimiento", "Sesión 2: Exploración Vocacional", "Sesión 3: Toma de Decisiones"];
    const completed = student.completedSessions || [];

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte Vocacional — ${student.nickname}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Cormorant+Garamond:wght@400;600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'DM Sans', sans-serif; color:#1a2e1a; background:#fff; padding:48px; max-width:800px; margin:0 auto; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #2D6A4F; padding-bottom:24px; margin-bottom:32px; }
    .logo { font-family:'Cormorant Garamond', serif; font-size:22px; color:#1B4332; }
    .logo span { display:block; font-family:'DM Sans', sans-serif; font-size:11px; color:#52B788; letter-spacing:1px; text-transform:uppercase; margin-top:4px; }
    .date { font-size:12px; color:#74C69D; text-align:right; }
    h1 { font-family:'Cormorant Garamond', serif; font-size:36px; font-weight:400; color:#1B4332; margin-bottom:4px; }
    .student-id { font-size:13px; color:#52B788; margin-bottom:32px; }
    .section { margin-bottom:28px; }
    .section-title { font-size:11px; font-weight:500; text-transform:uppercase; letter-spacing:1.5px; color:#2D6A4F; border-bottom:1px solid #D8F3DC; padding-bottom:6px; margin-bottom:14px; }
    .progress-bar { display:flex; gap:8px; margin-bottom:8px; }
    .session-chip { padding:6px 14px; border-radius:20px; font-size:12px; }
    .session-done { background:#D8F3DC; color:#1B4332; }
    .session-pending { background:#f0f0f0; color:#999; }
    .session-active { background:#2D6A4F; color:white; }
    .tags { display:flex; flex-wrap:wrap; gap:6px; }
    .tag { background:#D8F3DC; color:#1B4332; padding:4px 12px; border-radius:20px; font-size:12px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .info-box { background:#f8fdf8; border:1px solid #D8F3DC; border-radius:8px; padding:14px; }
    .info-label { font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#52B788; margin-bottom:4px; }
    .info-value { font-size:13px; color:#1a2e1a; line-height:1.5; }
    .stats { display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; }
    .stat { text-align:center; background:#f8fdf8; border-radius:8px; padding:16px; }
    .stat-num { font-family:'Cormorant Garamond', serif; font-size:32px; color:#2D6A4F; }
    .stat-label { font-size:11px; color:#74C69D; }
    .footer { margin-top:48px; padding-top:16px; border-top:1px solid #D8F3DC; font-size:11px; color:#74C69D; display:flex; justify-content:space-between; }
    @media print { body { padding:32px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Universidad de La Sabana<span>Bienestar y Experiencia del Estudiante</span></div>
    </div>
    <div class="date">Reporte generado<br>${new Date().toLocaleDateString("es-CO", { year:"numeric", month:"long", day:"numeric" })}</div>
  </div>

  <h1>${student.nickname}</h1>
  <div class="student-id">ID Institucional: ${student.id} &nbsp;·&nbsp; En proceso desde: ${new Date(student.createdAt).toLocaleDateString("es-CO")}</div>

  <div class="section">
    <div class="section-title">Progreso en el programa</div>
    <div class="progress-bar">
      ${[1,2,3].map(n => `<div class="session-chip ${completed.includes(n) ? "session-done" : student.currentSession===n ? "session-active" : "session-pending"}">${completed.includes(n) ? "✓ " : ""}${sessionLabel[n]}</div>`).join("")}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Estadísticas</div>
    <div class="stats">
      <div class="stat"><div class="stat-num">${student.messageCount}</div><div class="stat-label">Mensajes intercambiados</div></div>
      <div class="stat"><div class="stat-num">${completed.length}/3</div><div class="stat-label">Sesiones completadas</div></div>
      <div class="stat"><div class="stat-num">${student.currentSession}</div><div class="stat-label">Sesión actual</div></div>
    </div>
  </div>

  ${profile ? `
  <div class="section">
    <div class="section-title">Perfil vocacional construido por el sistema</div>
    <div class="info-grid">
      ${profile.huellaVocacional ? `<div class="info-box"><div class="info-label">Huella vocacional</div><div class="info-value">${profile.huellaVocacional}</div></div>` : ""}
      ${profile.proyeccionFuturo ? `<div class="info-box"><div class="info-label">Proyección a 10 años</div><div class="info-value">${profile.proyeccionFuturo}</div></div>` : ""}
      ${profile.entornoFamiliar ? `<div class="info-box"><div class="info-label">Entorno familiar</div><div class="info-value">${profile.entornoFamiliar}</div></div>` : ""}
      ${profile.notas ? `<div class="info-box"><div class="info-label">Notas del sistema</div><div class="info-value">${profile.notas}</div></div>` : ""}
    </div>
  </div>

  ${profile.intereses?.length ? `<div class="section"><div class="section-title">Intereses y motivaciones</div><div class="tags">${profile.intereses.map(i => `<span class="tag">${i}</span>`).join("")}</div></div>` : ""}
  ${profile.aptitudes?.length ? `<div class="section"><div class="section-title">Aptitudes identificadas</div><div class="tags">${profile.aptitudes.map(a => `<span class="tag">${a}</span>`).join("")}</div></div>` : ""}
  ${profile.dificultades?.length ? `<div class="section"><div class="section-title">Oportunidades de mejora</div><div class="tags">${profile.dificultades.map(d => `<span class="tag">${d}</span>`).join("")}</div></div>` : ""}
  ${profile.carrerasInteres?.length ? `<div class="section"><div class="section-title">Carreras exploradas</div><div class="tags">${profile.carrerasInteres.map(c => `<span class="tag">◈ ${c}</span>`).join("")}</div></div>` : ""}
  ` : `<div class="section"><div class="section-title">Perfil vocacional</div><p style="color:#74C69D;font-size:13px;">El perfil se construye automáticamente a medida que el estudiante avanza en las sesiones.</p></div>`}

  <div class="footer">
    <span>Programa Explora Tu Carrera — Orientación Vocacional</span>
    <span>Dirección de Bienestar y Experiencia del Estudiante</span>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  // ─────────────── RENDERS ───────────────────────────────────────────────────

  if (screen === "loading") return (
    <div style={S.center}>
      <style>{`@keyframes pulse{0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}`}</style>
      <div style={S.dot} />
    </div>
  );

  // ── CHOOSE
  if (screen === "choose") return (
    <div style={S.authWrap}>
      <GS />
      <div style={S.authBg} />
      <div style={S.authCard}>
        <div style={S.logoRow}>
          <span style={{fontSize:22,color:"#52B788"}}>◈</span>
          <div><div style={S.logoU}>Universidad de La Sabana</div><div style={S.logoSub}>Orientación Vocacional</div></div>
        </div>
        <h1 style={S.authH1}>Explora<br/>Tu Carrera</h1>
        <p style={S.authP}>Un espacio de orientación personalizado, a tu ritmo y en tus tiempos.</p>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:8}}>
          <button className="choice-btn primary" onClick={() => setScreen("register")}>
            <span style={{fontSize:20,color:"#52B788",flexShrink:0}}>✦</span>
            <div><div style={{fontSize:14,fontWeight:500,color:"#D8F3DC"}}>Es mi primera vez</div><div style={{fontSize:12,color:"#52B78877",marginTop:2}}>Quiero crear mi cuenta y empezar</div></div>
          </button>
          <button className="choice-btn secondary" onClick={() => setScreen("login")}>
            <span style={{fontSize:20,color:"#52B788",flexShrink:0}}>→</span>
            <div><div style={{fontSize:14,fontWeight:500,color:"#D8F3DC"}}>Ya tengo un proceso</div><div style={{fontSize:12,color:"#52B78877",marginTop:2}}>Quiero retomar desde donde quedé</div></div>
          </button>
        </div>
        <button style={S.adminLink} onClick={() => setScreen("admin")}>Acceso orientadores</button>
      </div>
    </div>
  );

  // ── REGISTER
  if (screen === "register") return (
    <div style={S.authWrap}>
      <GS />
      <div style={S.authBg} />
      <div style={S.authCard}>
        <button style={S.backBtn} onClick={() => { setScreen("choose"); setAuthError(""); }}>← Volver</button>
        <h2 style={S.formTitle}>Crear mi cuenta</h2>
        <p style={S.formSub}>Tus datos se guardan de forma segura para que puedas retomar tu proceso en cualquier momento.</p>
        {[
          ["¿Cómo te gustaría que te llamemos?", "text", "Ej: Laura, Juancho, Sofi...", regNick, setRegNick, {}],
          ["ID institucional (10 dígitos con ceros)", "text", "Ej: 0000123456", regId, (v) => setRegId(v.replace(/\D/g,"")), {maxLength:10}],
          ["Contraseña", "password", "Mínimo 6 caracteres", regPass, setRegPass, {}],
          ["Confirmar contraseña", "password", "Repite tu contraseña", regPass2, setRegPass2, {}],
        ].map(([label, type, ph, val, setter, extra]) => (
          <div key={label} style={S.formGroup}>
            <label style={S.label}>{label}</label>
            <input className="auth-input" style={S.input} type={type} placeholder={ph} value={val} onChange={e => setter(e.target.value)} {...extra} onKeyDown={label.includes("Confirmar") ? e => e.key==="Enter"&&handleRegister() : undefined} />
          </div>
        ))}
        {authError && <div style={S.errorBox}>{authError}</div>}
        <button className="primary-btn" style={S.primaryBtn} onClick={handleRegister} disabled={authLoading}>{authLoading ? "Creando cuenta..." : "Comenzar mi proceso →"}</button>
        <p style={S.switchText}>¿Ya tienes cuenta? <button style={S.switchLink} onClick={() => { setScreen("login"); setAuthError(""); }}>Ingresa aquí</button></p>
      </div>
    </div>
  );

  // ── LOGIN
  if (screen === "login") return (
    <div style={S.authWrap}>
      <GS />
      <div style={S.authBg} />
      <div style={S.authCard}>
        <button style={S.backBtn} onClick={() => { setScreen("choose"); setAuthError(""); }}>← Volver</button>
        <h2 style={S.formTitle}>Retomar mi proceso</h2>
        <p style={S.formSub}>Tu historial y progreso están guardados. Continúa donde lo dejaste.</p>
        <div style={S.formGroup}>
          <label style={S.label}>ID institucional (10 dígitos)</label>
          <input className="auth-input" style={S.input} type="text" placeholder="Ej: 0000123456" maxLength={10} value={loginId} onChange={e => setLoginId(e.target.value.replace(/\D/g,""))} autoFocus />
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>Contraseña</label>
          <input className="auth-input" style={S.input} type="password" placeholder="Tu contraseña" value={loginPass} onChange={e => setLoginPass(e.target.value)} onKeyDown={e => e.key==="Enter"&&handleLogin()} />
        </div>
        {authError && <div style={S.errorBox}>{authError}</div>}
        <button className="primary-btn" style={S.primaryBtn} onClick={handleLogin} disabled={authLoading}>{authLoading ? "Ingresando..." : "Retomar proceso →"}</button>
        <p style={S.switchText}>¿Primera vez? <button style={S.switchLink} onClick={() => { setScreen("register"); setAuthError(""); }}>Crea tu cuenta</button></p>
      </div>
    </div>
  );

  // ── ADMIN
  if (screen === "admin") return (
    <div style={S.adminWrap}>
      <GS />
      <div style={S.adminHeader}>
        <button style={S.backBtn} onClick={() => setScreen(userId ? "chat" : "choose")}>← Volver</button>
        <h2 style={{fontSize:22,fontWeight:400,color:"#D8F3DC"}}>Panel de Orientadores</h2>
      </div>
      {!adminUnlocked ? (
        <div style={{maxWidth:340,display:"flex",flexDirection:"column",gap:12}}>
          <label style={S.label}>Contraseña de acceso</label>
          <input className="auth-input" style={S.input} type="password" placeholder="Contraseña" value={adminPass} onChange={e => setAdminPass(e.target.value)} onKeyDown={e => e.key==="Enter"&&unlockAdmin()} autoFocus />
          <button className="primary-btn" style={S.primaryBtn} onClick={unlockAdmin}>Ingresar</button>
        </div>
      ) : (
        <div style={{maxWidth:1000}}>
          {/* TABS */}
          <div style={{display:"flex",gap:0,marginBottom:24,borderBottom:"1px solid #2D6A4F44"}}>
            {[["students","👥 Estudiantes"],["careers","📚 Carreras"]].map(([t,label]) => (
              <button key={t} className="tab-btn" style={{...S.tabBtn, ...(adminTab===t?S.tabBtnActive:{})}} onClick={() => setAdminTab(t)}>{label}</button>
            ))}
          </div>

          {/* TAB: ESTUDIANTES */}
          {adminTab === "students" && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <div>
                  <h3 style={{fontSize:18,fontWeight:400,color:"#D8F3DC"}}>Estudiantes en proceso</h3>
                  <p style={{fontSize:13,color:"#74C69D",marginTop:4}}>{students.length} estudiante{students.length!==1?"s":""} registrado{students.length!==1?"s":""}</p>
                </div>
                <button className="primary-btn" style={{...S.primaryBtn,padding:"8px 16px",fontSize:12}} onClick={loadStudents} disabled={studentsLoading}>{studentsLoading?"Cargando...":"↻ Actualizar"}</button>
              </div>

              {studentsLoading ? (
                <div style={{textAlign:"center",padding:48,color:"#52B78877"}}>Cargando estudiantes...</div>
              ) : students.length === 0 ? (
                <div style={{textAlign:"center",padding:48,color:"#52B78877"}}>Aún no hay estudiantes registrados.</div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {students.map(s => (
                    <div key={s.id} style={S.studentCard}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                          <div style={{width:36,height:36,borderRadius:"50%",background:"#2D6A4F",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#D8F3DC",fontWeight:500,flexShrink:0}}>{s.nickname[0].toUpperCase()}</div>
                          <div>
                            <div style={{fontSize:15,fontWeight:500,color:"#D8F3DC"}}>{s.nickname}</div>
                            <div style={{fontSize:11,color:"#52B78877"}}>ID: {s.id}</div>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
                          {[1,2,3].map(n => (
                            <span key={n} style={{fontSize:10,padding:"3px 10px",borderRadius:20,background: s.completedSessions?.includes(n)?"#2D6A4F": s.currentSession===n?"#1B4332":"#0d2218", color: s.completedSessions?.includes(n)?"#52B788":s.currentSession===n?"#74C69D":"#2D6A4F44", border:`1px solid ${s.completedSessions?.includes(n)?"#52B78866":s.currentSession===n?"#2D6A4F":"#2D6A4F22"}`}}>
                              {s.completedSessions?.includes(n)?"✓ ":""}Sesión {n}
                            </span>
                          ))}
                        </div>
                        <div style={{display:"flex",gap:20,fontSize:11,color:"#52B78877"}}>
                          <span>💬 {s.messageCount} mensajes</span>
                          <span>📅 Última actividad: {new Date(s.lastActivity).toLocaleDateString("es-CO")}</span>
                          {s.profile?.carrerasInteres?.length>0 && <span>🎓 Explora: {s.profile.carrerasInteres.slice(0,2).join(", ")}</span>}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8,flexShrink:0}}>
                        <button className="outline-btn" style={S.outlineBtn} onClick={() => setSelectedStudent(selectedStudent?.id===s.id ? null : s)}>
                          {selectedStudent?.id===s.id ? "Ocultar perfil" : "Ver perfil"}
                        </button>
                        <button className="outline-btn" style={{...S.outlineBtn,color:"#52B788",borderColor:"#52B78844"}} onClick={() => exportPDF(s)}>
                          Exportar PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PERFIL EXPANDIDO */}
              {selectedStudent && (
                <div style={S.profileExpanded}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <h4 style={{fontSize:16,fontWeight:500,color:"#D8F3DC"}}>Perfil vocacional — {selectedStudent.nickname}</h4>
                    <button style={{background:"none",border:"none",color:"#52B78877",cursor:"pointer",fontSize:18}} onClick={() => setSelectedStudent(null)}>✕</button>
                  </div>
                  {!selectedStudent.profile ? (
                    <p style={{color:"#52B78877",fontSize:13}}>El perfil se construye automáticamente a medida que el estudiante avanza en las sesiones.</p>
                  ) : (
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                      {[
                        ["Huella vocacional", selectedStudent.profile.huellaVocacional],
                        ["Proyección a 10 años", selectedStudent.profile.proyeccionFuturo],
                        ["Entorno familiar", selectedStudent.profile.entornoFamiliar],
                        ["Notas del orientador virtual", selectedStudent.profile.notas],
                      ].filter(([,v]) => v).map(([label, value]) => (
                        <div key={label} style={S.profileField}>
                          <div style={S.fieldLabel}>{label}</div>
                          <div style={S.fieldValue}>{value}</div>
                        </div>
                      ))}
                      {[
                        ["Intereses", selectedStudent.profile.intereses],
                        ["Aptitudes", selectedStudent.profile.aptitudes],
                        ["Oportunidades de mejora", selectedStudent.profile.dificultades],
                        ["Carreras de interés", selectedStudent.profile.carrerasInteres],
                      ].filter(([,v]) => v?.length).map(([label, values]) => (
                        <div key={label} style={{...S.profileField,gridColumn:"span 2"}}>
                          <div style={S.fieldLabel}>{label}</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
                            {values.map(v => <span key={v} style={{background:"#2D6A4F22",border:"1px solid #2D6A4F44",borderRadius:20,padding:"3px 12px",fontSize:12,color:"#B7E4C7"}}>{v}</span>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: CARRERAS */}
          {adminTab === "careers" && (
            <div>
              <h3 style={{fontSize:18,fontWeight:400,color:"#D8F3DC",marginBottom:8}}>Datos de Carreras</h3>
              <p style={{fontSize:13,color:"#74C69D",lineHeight:1.6,marginBottom:8}}>
                Esta información vive en el archivo <code style={{background:"#0d2218",padding:"2px 8px",borderRadius:4,color:"#52B788"}}>data/careers.md</code> de tu repositorio en GitHub.
              </p>
              <p style={{fontSize:13,color:"#52B78877",lineHeight:1.6,marginBottom:20}}>
                Para actualizar la información: ve a <strong style={{color:"#74C69D"}}>github.com/Aguacate20/Explora</strong> → carpeta <code style={{background:"#0d2218",padding:"2px 6px",borderRadius:4,color:"#52B788"}}>data</code> → archivo <code style={{background:"#0d2218",padding:"2px 6px",borderRadius:4,color:"#52B788"}}>careers.md</code> → edita con el lápiz ✏️ → Commit changes. Los cambios se aplican con el próximo deploy de Vercel.
              </p>
              <div style={{background:"#0d2218",border:"1px solid #2D6A4F33",borderRadius:12,padding:20,maxHeight:400,overflowY:"auto"}}>
                <pre style={{fontSize:12,color:"#74C69D",lineHeight:1.6,whiteSpace:"pre-wrap",fontFamily:"monospace"}}>{careersContent || "Sin datos cargados."}</pre>
              </div>
              <p style={{fontSize:11,color:"#2D6A4F",marginTop:8}}>Vista de solo lectura — {careersContent.length.toLocaleString()} caracteres cargados</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── CHAT
  const sessionDone = (n) => completedSessions.includes(n);

  return (
    <div style={S.chatWrap}>
      <GS />
      <div onClick={() => setSidebarOpen(false)} className={`sidebar-overlay${sidebarOpen?" open":""}`}/>
      <div className={`sidebar-mobile${sidebarOpen?" open":""}`} style={S.sidebar}>
        <div style={S.sidebarTop}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:16,color:"#52B788"}}>◈</span>
            <span style={{fontSize:15,fontFamily:"'Cormorant Garamond',serif",color:"#D8F3DC"}}>Explora</span>
          </div>
          <div style={{fontSize:13,color:"#74C69D"}}>{userName}</div>
          <div style={{fontSize:10,color:"#2D6A4F77",marginTop:2}}>ID: {userId}</div>
        </div>
        <div style={{padding:"16px 12px",flex:1}}>
          <div style={S.sidebarLabel}>TU PROCESO</div>
          {SESSIONS_CONFIG.map(s => (
            <div key={s.id} className="ss" style={{...S.sidebarSession,...(currentSession===s.id&&!sessionDone(s.id)?S.sessionActive:{}),...(sessionDone(s.id)?{opacity:.5}:{})}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:sessionDone(s.id)||currentSession===s.id?"#52B788":"#2D6A4F44",boxShadow:currentSession===s.id&&!sessionDone(s.id)?"0 0 8px #52B78866":"none"}}/>
                <div>
                  <div style={{fontSize:12,fontWeight:500,color:"#B7E4C7"}}>Sesión {s.id}: {s.title}</div>
                  <div style={{fontSize:10,color:"#52B78877"}}>{s.subtitle}</div>
                </div>
              </div>
              {sessionDone(s.id) && <span style={{color:"#52B788",fontSize:12}}>✓</span>}
            </div>
          ))}
        </div>
        {userProfile && (
          <div style={S.profileCard}>
            <div style={S.sidebarLabel}>MI PERFIL</div>
            {userProfile.intereses?.length>0 && <div style={S.pRow}><span style={S.pKey}>Intereses:</span><span style={S.pVal}>{userProfile.intereses.slice(0,3).join(", ")}</span></div>}
            {userProfile.carrerasInteres?.length>0 && <div style={S.pRow}><span style={S.pKey}>Explora:</span><span style={S.pVal}>{userProfile.carrerasInteres.slice(0,2).join(", ")}</span></div>}
          </div>
        )}
        <div style={{padding:"12px",borderTop:"1px solid #2D6A4F22",display:"flex",flexDirection:"column",gap:6}}>
          <button style={S.sideTabBtn} onClick={() => setScreen("admin")}>⚙ Panel orientadores</button>
          <button style={{background:"none",border:"none",color:"#2D6A4F",fontSize:11,cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans',sans-serif",padding:"4px 12px"}} onClick={logout}>Cerrar sesión</button>
        </div>
      </div>

      <div style={S.chatArea}>
        <div style={S.chatHeader}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)} style={{background:"none",border:"1px solid #2D6A4F44",borderRadius:8,color:"#52B788",fontSize:18,cursor:"pointer",padding:"4px 10px",lineHeight:1,alignItems:"center",justifyContent:"center",flexShrink:0}}>☰</button>
            <div>
              <div style={{fontSize:16,fontWeight:500,color:"#D8F3DC"}}>Sesión {currentSession}: {SESSIONS_CONFIG[currentSession-1]?.title}</div>
              <div style={{fontSize:12,color:"#52B78877",marginTop:2}}>{SESSIONS_CONFIG[currentSession-1]?.subtitle}</div>
            </div>
          </div>
          <div className="hide-mobile" style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end",maxWidth:380}}>
            {SESSIONS_CONFIG[currentSession-1]?.activities.map((a,i) => <div key={i} style={S.activityPill}>{a}</div>)}
          </div>
        </div>
        <div style={S.messages}>
          {messages.length===0 && <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,opacity:.3,marginTop:80}}><div style={{fontSize:32,color:"#52B788"}}>◈</div><div style={{fontSize:14,color:"#74C69D",textAlign:"center"}}>Tu orientador vocacional está listo</div></div>}
          {messages.map((msg,i) => (
            <div key={i} className={msg.role==="user"?"msg-u":"msg-a"} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start",alignItems:"flex-end",gap:10}}>
              {msg.role==="assistant" && <div style={{fontSize:14,color:"#52B788",marginBottom:4,flexShrink:0}}>◈</div>}
              <div style={{...S.bubble,...(msg.role==="user"?S.bubbleU:S.bubbleA)}}>
                {msg.content.split("\n").map((l,j,arr) => <span key={j}>{l}{j<arr.length-1&&<br/>}</span>)}
              </div>
            </div>
          ))}
          {isTyping && (
            <div style={{display:"flex",alignItems:"flex-end",gap:10}}>
              <div style={{fontSize:14,color:"#52B788",marginBottom:4}}>◈</div>
              <div style={{...S.bubble,...S.bubbleA,display:"flex",gap:5,alignItems:"center"}}>
                {[0,.2,.4].map((d,i) => <span key={i} style={{fontSize:7,color:"#52B788",animation:`blink 1.2s ${d}s infinite`}}>●</span>)}
              </div>
            </div>
          )}
          <div ref={chatEndRef}/>
        </div>
        <div style={S.inputArea}>
          <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
            <textarea ref={textareaRef} style={S.textarea} value={input}
              onChange={e => { setInput(e.target.value); e.target.style.height="auto"; e.target.style.height=Math.min(e.target.scrollHeight,120)+"px"; }}
              onKeyDown={handleKeyDown} placeholder="Escribe tu respuesta... (Enter para enviar)" rows={1}/>
            <button className="send-btn" style={{...S.sendBtn,opacity:(!input.trim()||isTyping)?.4:1}} onClick={sendMessage} disabled={!input.trim()||isTyping}>↑</button>
          </div>
          <div style={{fontSize:11,color:"#2D6A4F",marginTop:6}}>Shift + Enter para nueva línea</div>
        </div>
      </div>
    </div>
  );
}

function GS() {
  return <style>{`
    @keyframes pulse{0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
    @keyframes blink{0%,100%{opacity:.2}50%{opacity:1}}
    @keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    *{box-sizing:border-box;margin:0;padding:0}
    ::-webkit-scrollbar{width:4px}
    ::-webkit-scrollbar-thumb{background:#2D6A4F44;border-radius:2px}
    .msg-u{animation:slideIn .2s ease}.msg-a{animation:fadeUp .3s ease}
    .auth-input:focus{outline:none;border-color:#52B788!important}
    textarea:focus{outline:none}
    .choice-btn{display:flex;align-items:center;gap:16;padding:18px 20px;border-radius:14px;cursor:pointer;border:1px solid;text-align:left;width:100%;transition:all .2s;font-family:'DM Sans',sans-serif}
    .choice-btn.primary{background:#1B4332;border-color:#52B78866;color:#D8F3DC}.choice-btn.primary:hover{background:#2D6A4F}
    .choice-btn.secondary{background:transparent;border-color:#2D6A4F44;color:#B7E4C7}.choice-btn.secondary:hover{background:#0d2218;border-color:#2D6A4F}
    .primary-btn:hover:not(:disabled){background:#1B4332!important}.primary-btn:disabled{opacity:.5;cursor:not-allowed}
    .send-btn:hover:not(:disabled){background:#1B4332!important}
    .ss:hover{background:rgba(82,183,136,.08)!important}
    @media(max-width:640px){
      .sidebar-mobile{position:fixed!important;left:0!important;top:0!important;bottom:0!important;z-index:100!important;transform:translateX(-100%);transition:transform .3s ease;width:280px!important;min-width:280px!important}
      .sidebar-mobile.open{transform:translateX(0)!important}
      .sidebar-overlay{display:none;position:fixed;inset:0;background:#00000088;z-index:99}
      .sidebar-overlay.open{display:block}
      .menu-btn{display:flex!important}
      .hide-mobile{display:none!important}
    }
    @media(min-width:641px){.menu-btn{display:none!important}}
    .tab-btn{padding:10px 20px;background:none;border:none;border-bottom:2px solid transparent;color:#52B78877;cursor:pointer;font-size:13px;font-family:'DM Sans',sans-serif;transition:all .2s}
    .tab-btn:hover{color:#74C69D}
    .outline-btn:hover{background:#0d2218!important}
  `}</style>;
}

const S = {
  center:       {display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0a1a0f"},
  dot:          {width:16,height:16,borderRadius:"50%",background:"#52B788",animation:"pulse 1.2s infinite"},
  authWrap:     {minHeight:"100vh",background:"#0a1a0f",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'DM Sans',sans-serif"},
  authBg:       {position:"fixed",inset:0,background:"radial-gradient(ellipse at 20% 50%, #1B4332 0%, transparent 60%)",pointerEvents:"none"},
  authCard:     {position:"relative",maxWidth:480,width:"100%",zIndex:1,display:"flex",flexDirection:"column",gap:16},
  logoRow:      {display:"flex",alignItems:"center",gap:12},
  logoU:        {fontSize:13,fontWeight:500,color:"#D8F3DC"},
  logoSub:      {fontSize:11,color:"#52B78877"},
  authH1:       {fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(48px,9vw,76px)",fontWeight:300,color:"#D8F3DC",lineHeight:1,letterSpacing:-2,marginTop:16},
  authP:        {fontSize:14,color:"#74C69D",lineHeight:1.7,fontWeight:300},
  adminLink:    {background:"none",border:"none",color:"#2D6A4F",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",alignSelf:"center",marginTop:4},
  backBtn:      {background:"none",border:"none",color:"#74C69D",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",alignSelf:"flex-start",padding:0,marginBottom:8},
  formTitle:    {fontFamily:"'Cormorant Garamond',serif",fontSize:36,fontWeight:400,color:"#D8F3DC"},
  formSub:      {fontSize:13,color:"#74C69D",lineHeight:1.6,marginBottom:4},
  formGroup:    {display:"flex",flexDirection:"column",gap:6},
  label:        {fontSize:12,color:"#74C69D"},
  input:        {background:"#0d2218",border:"1px solid #2D6A4F",borderRadius:10,padding:"12px 16px",color:"#D8F3DC",fontSize:14,fontFamily:"'DM Sans',sans-serif",transition:"border-color .2s"},
  errorBox:     {background:"#2D0A0A",border:"1px solid #7B2020",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#F4A4A4"},
  primaryBtn:   {background:"#2D6A4F",border:"none",borderRadius:10,padding:"14px",color:"#D8F3DC",fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"background .2s"},
  switchText:   {fontSize:12,color:"#52B78877",textAlign:"center"},
  switchLink:   {background:"none",border:"none",color:"#52B788",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"},
  adminWrap:    {minHeight:"100vh",background:"#0a1a0f",color:"#D8F3DC",fontFamily:"'DM Sans',sans-serif",padding:32},
  adminHeader:  {display:"flex",alignItems:"center",gap:20,marginBottom:32},
  tabBtn:       {padding:"10px 20px",background:"none",border:"none",borderBottom:"2px solid transparent",color:"#52B78877",cursor:"pointer",fontSize:13,fontFamily:"'DM Sans',sans-serif"},
  tabBtnActive: {borderBottomColor:"#52B788",color:"#D8F3DC"},
  studentCard:  {background:"#0d2218",border:"1px solid #2D6A4F33",borderRadius:14,padding:"16px 20px",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16},
  outlineBtn:   {background:"none",border:"1px solid #2D6A4F44",borderRadius:8,padding:"7px 14px",color:"#74C69D",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",transition:"background .2s"},
  profileExpanded:{background:"#0d2218",border:"1px solid #52B78833",borderRadius:14,padding:24,marginTop:16},
  profileField: {background:"#081C15",borderRadius:10,padding:"12px 16px",border:"1px solid #2D6A4F22"},
  fieldLabel:   {fontSize:10,color:"#52B78877",textTransform:"uppercase",letterSpacing:.5,marginBottom:6},
  fieldValue:   {fontSize:13,color:"#B7E4C7",lineHeight:1.5},
  chatWrap:     {display:"flex",height:"100vh",background:"#0a1a0f",fontFamily:"'DM Sans',sans-serif",overflow:"hidden"},
  sidebar:      {width:252,minWidth:252,background:"#0d2218",borderRight:"1px solid #2D6A4F22",display:"flex",flexDirection:"column",padding:"20px 0",overflow:"hidden"},
  sidebarTop:   {padding:"0 20px 16px",borderBottom:"1px solid #2D6A4F22"},
  sidebarLabel: {fontSize:10,color:"#2D6A4F",letterSpacing:1.5,marginBottom:8,paddingLeft:8},
  sidebarSession:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 8px",borderRadius:8,transition:"background .2s",marginBottom:2},
  sessionActive:{background:"rgba(82,183,136,.1)",border:"1px solid #52B78833"},
  profileCard:  {margin:"0 12px 12px",padding:12,background:"#081C15",borderRadius:10,border:"1px solid #2D6A4F22"},
  pRow:         {marginBottom:5},
  pKey:         {fontSize:10,color:"#52B78877",display:"block"},
  pVal:         {fontSize:11,color:"#B7E4C7"},
  sideTabBtn:   {background:"none",border:"1px solid #2D6A4F44",borderRadius:8,padding:"8px 12px",color:"#52B788",fontSize:11,cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans',sans-serif"},
  chatArea:     {flex:1,display:"flex",flexDirection:"column",overflow:"hidden"},
  chatHeader:   {padding:"16px 24px",borderBottom:"1px solid #2D6A4F22",display:"flex",alignItems:"flex-start",justifyContent:"space-between"},
  activityPill: {fontSize:10,color:"#52B788",background:"#2D6A4F22",border:"1px solid #2D6A4F44",borderRadius:20,padding:"3px 10px"},
  messages:     {flex:1,overflowY:"auto",padding:"24px",display:"flex",flexDirection:"column",gap:16},
  bubble:       {maxWidth:"72%",padding:"12px 16px",borderRadius:16,fontSize:14,lineHeight:1.65},
  bubbleU:      {background:"#2D6A4F",color:"#D8F3DC",borderBottomRightRadius:4},
  bubbleA:      {background:"#0d2218",border:"1px solid #2D6A4F33",color:"#D8F3DC",borderBottomLeftRadius:4},
  inputArea:    {padding:"16px 24px 20px",borderTop:"1px solid #2D6A4F22"},
  textarea:     {flex:1,background:"#0d2218",border:"1px solid #2D6A4F44",borderRadius:12,padding:"12px 16px",color:"#D8F3DC",fontSize:14,fontFamily:"'DM Sans',sans-serif",resize:"none",lineHeight:1.5,minHeight:46,maxHeight:120},
  sendBtn:      {width:46,height:46,background:"#2D6A4F",border:"none",borderRadius:12,color:"#D8F3DC",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .2s"},
};
