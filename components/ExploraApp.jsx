"use client";
// components/ExploraApp.jsx

import { useState, useEffect, useRef, useCallback } from "react";
import { SESSIONS_CONFIG } from "@/lib/systemPrompt";

export default function ExploraApp() {
  // ── Auth state
  const [screen, setScreen]         = useState("loading"); // loading | choose | register | login | chat | admin
  const [authError, setAuthError]   = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // ── Register form
  const [regNick, setRegNick]       = useState("");
  const [regId, setRegId]           = useState("");
  const [regPass, setRegPass]       = useState("");
  const [regPass2, setRegPass2]     = useState("");

  // ── Login form
  const [loginId, setLoginId]       = useState("");
  const [loginPass, setLoginPass]   = useState("");

  // ── Session
  const [userId, setUserId]         = useState("");
  const [userName, setUserName]     = useState("");
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState("");
  const [isTyping, setIsTyping]     = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [careerData, setCareerData] = useState("");
  const [currentSession, setCurrentSession]         = useState(1);
  const [completedSessions, setCompletedSessions]   = useState([]);

  // ── Admin
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPass, setAdminPass]         = useState("");
  const [careerInput, setCareerInput]     = useState("");
  const [saveStatus, setSaveStatus]       = useState("");

  const chatEndRef  = useRef(null);
  const textareaRef = useRef(null);

  // ── Check active session in localStorage (token ligero)
  useEffect(() => {
    const saved = localStorage.getItem("explora_session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.userId) {
          // Re-login automático con datos cacheados
          restoreSession(parsed);
          return;
        }
      } catch {}
    }
    setScreen("choose");
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const restoreSession = (saved) => {
    setUserId(saved.userId);
    setUserName(saved.userName);
    setMessages(saved.messages || []);
    setUserProfile(saved.profile || null);
    setCareerData(saved.careerData || "");
    setCurrentSession(saved.currentSession || 1);
    setCompletedSessions(saved.completedSessions || []);
    setScreen("chat");
  };

  const saveLocalSession = (data) => {
    localStorage.setItem("explora_session", JSON.stringify(data));
  };

  // ── REGISTER ──
  const handleRegister = async () => {
    setAuthError("");
    if (!regNick.trim())                return setAuthError("¿Cómo te gustaría que te llamemos?");
    if (!/^\d{10}$/.test(regId))        return setAuthError("El ID debe tener exactamente 10 dígitos (ej: 0000123456)");
    if (regPass.length < 6)             return setAuthError("La contraseña debe tener al menos 6 caracteres");
    if (regPass !== regPass2)           return setAuthError("Las contraseñas no coinciden");

    setAuthLoading(true);
    try {
      const res  = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: regId, nickname: regNick.trim(), password: regPass }),
      });
      const data = await res.json();
      if (!res.ok) return setAuthError(data.error);

      setUserId(data.studentId);
      setUserName(data.nickname);
      setCurrentSession(1);
      setCompletedSessions([]);
      setMessages([]);
      setScreen("chat");
      setTimeout(() => sendWelcomeMessage(data.nickname, data.studentId), 300);
    } catch {
      setAuthError("Error de conexión. Intenta de nuevo.");
    } finally {
      setAuthLoading(false);
    }
  };

  // ── LOGIN ──
  const handleLogin = async () => {
    setAuthError("");
    if (!/^\d{10}$/.test(loginId)) return setAuthError("El ID debe tener 10 dígitos");
    if (!loginPass)                return setAuthError("Ingresa tu contraseña");

    setAuthLoading(true);
    try {
      const res  = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: loginId, password: loginPass }),
      });
      const data = await res.json();
      if (!res.ok) return setAuthError(data.error);

      setUserId(data.studentId);
      setUserName(data.nickname);
      setMessages(data.messages || []);
      setUserProfile(data.profile);
      setCareerData(data.careerData || "");
      setCurrentSession(data.currentSession);
      setCompletedSessions(data.completedSessions);

      saveLocalSession({
        userId:            data.studentId,
        userName:          data.nickname,
        messages:          data.messages || [],
        profile:           data.profile,
        careerData:        data.careerData || "",
        currentSession:    data.currentSession,
        completedSessions: data.completedSessions,
      });

      setScreen("chat");
    } catch {
      setAuthError("Error de conexión. Intenta de nuevo.");
    } finally {
      setAuthLoading(false);
    }
  };

  // ── WELCOME MESSAGE ──
  const sendWelcomeMessage = async (name, uid) => {
    setIsTyping(true);
    const initMsgs = [{ role: "user", content: `Hola, me llamo ${name} y quiero empezar el proceso Explora Tu Carrera.` }];
    try {
      const res  = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: initMsgs, userProfile: null, careerData, studentId: uid, sessionNumber: 1 }),
      });
      const data  = await res.json();
      const reply = data.content || `¡Hola ${name}! Soy Explora. ¿Qué te trajo hoy aquí?`;
      const newMsgs = [
        { role: "user",      content: initMsgs[0].content },
        { role: "assistant", content: reply },
      ];
      setMessages(newMsgs);
      saveLocalSession({ userId: uid, userName: name, messages: newMsgs, profile: null, careerData, currentSession: 1, completedSessions: [] });
    } catch {
      setMessages([{ role: "assistant", content: `¡Hola ${name}! Soy Explora, tu orientador vocacional. ¿Qué te trajo hoy aquí?` }]);
    }
    setIsTyping(false);
  };

  // ── SEND MESSAGE ──
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isTyping) return;
    const userMsg     = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const res  = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, userProfile, careerData, studentId: userId, sessionNumber: currentSession }),
      });
      const data  = await res.json();
      const reply = data.content || "Error al responder. Intenta de nuevo.";
      const finalMsgs = [...newMessages, { role: "assistant", content: reply }];
      setMessages(finalMsgs);

      // Detectar sesión completada
      let newSession    = currentSession;
      let newCompleted  = [...completedSessions];
      const match = reply.match(/Has completado la Sesión (\d)/);
      if (match) {
        const num = parseInt(match[1]);
        newCompleted = [...new Set([...completedSessions, num])];
        newSession   = Math.min(num + 1, 3);
        setCompletedSessions(newCompleted);
        setCurrentSession(newSession);
        await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: userId, currentSession: newSession, completedSessions: newCompleted }),
        });
      }

      // Actualizar sesión local
      saveLocalSession({ userId, userName, messages: finalMsgs, profile: userProfile, careerData, currentSession: newSession, completedSessions: newCompleted });

      // Extraer perfil cada 6 mensajes
      if (finalMsgs.length % 6 === 0) updateProfile(finalMsgs);

    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Error de conexión. Recarga e intenta de nuevo." }]);
    }
    setIsTyping(false);
  }, [input, messages, isTyping, userId, userName, careerData, userProfile, currentSession, completedSessions]);

  const updateProfile = async (msgs) => {
    try {
      const res  = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs, currentProfile: userProfile, studentId: userId }),
      });
      const data = await res.json();
      if (data.profile) {
        setUserProfile(data.profile);
        saveLocalSession({ userId, userName, messages, profile: data.profile, careerData, currentSession, completedSessions });
      }
    } catch {}
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const logout = () => {
    if (!confirm("¿Cerrar sesión? Tu progreso está guardado en la nube.")) return;
    localStorage.removeItem("explora_session");
    setUserId(""); setUserName(""); setMessages([]); setUserProfile(null);
    setCurrentSession(1); setCompletedSessions([]);
    setScreen("choose");
  };

  // ── ADMIN ──
  const unlockAdmin = async () => {
    const res  = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: adminPass }),
    });
    if (res.ok) {
      setAdminUnlocked(true);
      const get = await fetch("/api/admin");
      const d   = await get.json();
      setCareerInput(d.content || "");
    } else {
      alert("Contraseña incorrecta");
    }
  };

  const saveCareerData = async () => {
    const res = await fetch("/api/admin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: adminPass, content: careerInput }),
    });
    if (res.ok) {
      setCareerData(careerInput);
      setSaveStatus("✓ Guardado en base de datos");
      setTimeout(() => setSaveStatus(""), 3000);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDERS
  // ─────────────────────────────────────────────────────────────────────────

  if (screen === "loading") return (
    <div style={S.center}>
      <style>{`@keyframes pulse{0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}`}</style>
      <div style={S.dot} />
    </div>
  );

  // ── CHOOSE ──────────────────────────────────────────────────────────────
  if (screen === "choose") return (
    <div style={S.authWrap}>
      <GlobalStyles />
      <div style={S.authBg} />
      <div style={S.authCard}>
        <div style={S.logoRow}>
          <span style={S.logoIcon}>◈</span>
          <div>
            <div style={S.logoU}>Universidad de La Sabana</div>
            <div style={S.logoSub}>Orientación Vocacional</div>
          </div>
        </div>
        <h1 style={S.authH1}>Explora<br/>Tu Carrera</h1>
        <p style={S.authP}>Un espacio de orientación vocacional personalizado, a tu ritmo y en tus tiempos.</p>

        <div style={S.choiceButtons}>
          <button className="choice-btn primary" onClick={() => setScreen("register")}>
            <span style={S.choiceIcon}>✦</span>
            <div>
              <div style={S.choiceTitle}>Es mi primera vez</div>
              <div style={S.choiceSub}>Quiero crear mi cuenta y empezar</div>
            </div>
          </button>
          <button className="choice-btn secondary" onClick={() => setScreen("login")}>
            <span style={S.choiceIcon}>→</span>
            <div>
              <div style={S.choiceTitle}>Ya tengo un proceso</div>
              <div style={S.choiceSub}>Quiero retomar desde donde quedé</div>
            </div>
          </button>
        </div>

        <button style={S.adminLink} onClick={() => setScreen("admin")}>Acceso orientadores</button>
      </div>
    </div>
  );

  // ── REGISTER ────────────────────────────────────────────────────────────
  if (screen === "register") return (
    <div style={S.authWrap}>
      <GlobalStyles />
      <div style={S.authBg} />
      <div style={S.authCard}>
        <button style={S.backBtn} onClick={() => { setScreen("choose"); setAuthError(""); }}>← Volver</button>
        <h2 style={S.formTitle}>Crear mi cuenta</h2>
        <p style={S.formSubtitle}>Tus datos se guardan de forma segura para que puedas retomar tu proceso en cualquier momento.</p>

        <div style={S.formGroup}>
          <label style={S.label}>¿Cómo te gustaría que te llamemos?</label>
          <input className="auth-input" style={S.input} type="text" placeholder="Ej: Laura, Juancho, Sofi..." value={regNick} onChange={e => setRegNick(e.target.value)} autoFocus />
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>ID institucional (10 dígitos con ceros)</label>
          <input className="auth-input" style={S.input} type="text" placeholder="Ej: 0000123456" maxLength={10} value={regId} onChange={e => setRegId(e.target.value.replace(/\D/g,""))} />
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>Contraseña</label>
          <input className="auth-input" style={S.input} type="password" placeholder="Mínimo 6 caracteres" value={regPass} onChange={e => setRegPass(e.target.value)} />
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>Confirmar contraseña</label>
          <input className="auth-input" style={S.input} type="password" placeholder="Repite tu contraseña" value={regPass2} onChange={e => setRegPass2(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleRegister()} />
        </div>

        {authError && <div style={S.errorBox}>{authError}</div>}

        <button className="primary-btn" style={S.primaryBtn} onClick={handleRegister} disabled={authLoading}>
          {authLoading ? "Creando cuenta..." : "Comenzar mi proceso →"}
        </button>
        <p style={S.switchText}>¿Ya tienes cuenta? <button style={S.switchLink} onClick={() => { setScreen("login"); setAuthError(""); }}>Ingresa aquí</button></p>
      </div>
    </div>
  );

  // ── LOGIN ────────────────────────────────────────────────────────────────
  if (screen === "login") return (
    <div style={S.authWrap}>
      <GlobalStyles />
      <div style={S.authBg} />
      <div style={S.authCard}>
        <button style={S.backBtn} onClick={() => { setScreen("choose"); setAuthError(""); }}>← Volver</button>
        <h2 style={S.formTitle}>Retomar mi proceso</h2>
        <p style={S.formSubtitle}>Tu historial y progreso están guardados. Ingresa y continúa donde lo dejaste.</p>

        <div style={S.formGroup}>
          <label style={S.label}>ID institucional (10 dígitos)</label>
          <input className="auth-input" style={S.input} type="text" placeholder="Ej: 0000123456" maxLength={10} value={loginId} onChange={e => setLoginId(e.target.value.replace(/\D/g,""))} autoFocus />
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>Contraseña</label>
          <input className="auth-input" style={S.input} type="password" placeholder="Tu contraseña" value={loginPass} onChange={e => setLoginPass(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>

        {authError && <div style={S.errorBox}>{authError}</div>}

        <button className="primary-btn" style={S.primaryBtn} onClick={handleLogin} disabled={authLoading}>
          {authLoading ? "Ingresando..." : "Retomar proceso →"}
        </button>
        <p style={S.switchText}>¿Primera vez? <button style={S.switchLink} onClick={() => { setScreen("register"); setAuthError(""); }}>Crea tu cuenta</button></p>
      </div>
    </div>
  );

  // ── ADMIN ────────────────────────────────────────────────────────────────
  if (screen === "admin") return (
    <div style={S.adminWrap}>
      <GlobalStyles />
      <div style={S.adminHeader}>
        <button style={S.backBtn} onClick={() => setScreen(userId ? "chat" : "choose")}>← Volver</button>
        <h2 style={S.adminTitle}>Panel de Orientadores</h2>
      </div>
      {!adminUnlocked ? (
        <div style={S.adminLock}>
          <label style={S.label}>Contraseña de acceso</label>
          <input className="auth-input" style={S.input} type="password" placeholder="Contraseña" value={adminPass}
            onChange={e => setAdminPass(e.target.value)} onKeyDown={e => e.key==="Enter" && unlockAdmin()} />
          <button className="primary-btn" style={S.primaryBtn} onClick={unlockAdmin}>Ingresar</button>
        </div>
      ) : (
        <div style={S.adminContent}>
          <div style={S.adminSection}>
            <h3 style={S.adminSectionTitle}>📚 Datos de Programas y Carreras</h3>
            <p style={S.adminDesc}>Pega aquí la información de todos los programas de La Sabana. Los datos se guardan en la base de datos y el orientador los usa automáticamente.</p>
            <textarea style={S.careerTextarea} rows={18} value={careerInput} onChange={e => setCareerInput(e.target.value)}
              placeholder={`Programa: Medicina\nFacultad: Ciencias de la Salud\nDuración: 12 semestres\nPerfil de ingreso: ...\nPerfil del egresado: ...\nCampos de acción: ...\nMaterias clave: ...\n\n---\n\nPrograma: Derecho\n...`} />
            <div style={{ display:"flex", alignItems:"center", gap:16, marginTop:12 }}>
              <button className="primary-btn" style={S.primaryBtn} onClick={saveCareerData}>Guardar en base de datos</button>
              {saveStatus && <span style={{ fontSize:13, color:"#52B788" }}>{saveStatus}</span>}
            </div>
          </div>
          <div style={S.adminSection}>
            <h3 style={S.adminSectionTitle}>⚙️ Estado del sistema</h3>
            <div style={S.infoGrid}>
              {[["Base de datos","Supabase (PostgreSQL)"],["Modelo de IA","Llama 3.3 70B via Groq"],["Idioma","Español colombiano"],["Datos de carreras", careerInput ? `${careerInput.length.toLocaleString()} caracteres` : "Sin datos aún"]].map(([k,v]) => (
                <div key={k} style={S.infoCard}><div style={S.infoLabel}>{k}</div><div style={S.infoValue}>{v}</div></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── CHAT ─────────────────────────────────────────────────────────────────
  const sessionDone = (n) => completedSessions.includes(n);

  return (
    <div style={S.chatWrap}>
      <GlobalStyles />

      {/* SIDEBAR */}
      <div style={S.sidebar}>
        <div style={S.sidebarTop}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <span style={{ fontSize:16, color:"#52B788" }}>◈</span>
            <span style={{ fontSize:15, fontFamily:"'Cormorant Garamond',serif", color:"#D8F3DC" }}>Explora</span>
          </div>
          <div style={{ fontSize:13, color:"#74C69D" }}>{userName}</div>
          <div style={{ fontSize:10, color:"#2D6A4F88", marginTop:2 }}>ID: {userId}</div>
        </div>

        <div style={{ padding:"16px 12px", flex:1 }}>
          <div style={S.sidebarLabel}>TU PROCESO</div>
          {SESSIONS_CONFIG.map(s => (
            <div key={s.id} className="ss" style={{ ...S.sidebarSession, ...(currentSession===s.id&&!sessionDone(s.id)?S.sessionActive:{}), ...(sessionDone(s.id)?{opacity:.5}:{}) }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, background: sessionDone(s.id)||currentSession===s.id?"#52B788":"#2D6A4F44", boxShadow: currentSession===s.id&&!sessionDone(s.id)?"0 0 8px #52B78866":"none" }} />
                <div>
                  <div style={{ fontSize:12, fontWeight:500, color:"#B7E4C7" }}>Sesión {s.id}: {s.title}</div>
                  <div style={{ fontSize:10, color:"#52B78877" }}>{s.subtitle}</div>
                </div>
              </div>
              {sessionDone(s.id) && <span style={{ color:"#52B788", fontSize:12 }}>✓</span>}
            </div>
          ))}
        </div>

        {userProfile && (
          <div style={S.profileCard}>
            <div style={S.sidebarLabel}>MI PERFIL</div>
            {userProfile.intereses?.length>0 && <div style={S.pRow}><span style={S.pKey}>Intereses:</span><span style={S.pVal}>{userProfile.intereses.slice(0,3).join(", ")}</span></div>}
            {userProfile.carrerasInteres?.length>0 && <div style={S.pRow}><span style={S.pKey}>Explora:</span><span style={S.pVal}>{userProfile.carrerasInteres.slice(0,2).join(", ")}</span></div>}
            {userProfile.aptitudes?.length>0 && <div style={S.pRow}><span style={S.pKey}>Aptitudes:</span><span style={S.pVal}>{userProfile.aptitudes.slice(0,2).join(", ")}</span></div>}
          </div>
        )}

        <div style={{ padding:"12px", borderTop:"1px solid #2D6A4F22", display:"flex", flexDirection:"column", gap:6 }}>
          <button style={S.sideTabBtn} onClick={() => setScreen("admin")}>⚙ Panel orientadores</button>
          <button style={S.logoutBtn} onClick={logout}>Cerrar sesión</button>
        </div>
      </div>

      {/* CHAT MAIN */}
      <div style={S.chatArea}>
        <div style={S.chatHeader}>
          <div>
            <div style={{ fontSize:16, fontWeight:500, color:"#D8F3DC" }}>Sesión {currentSession}: {SESSIONS_CONFIG[currentSession-1]?.title}</div>
            <div style={{ fontSize:12, color:"#52B78877", marginTop:2 }}>{SESSIONS_CONFIG[currentSession-1]?.subtitle}</div>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"flex-end", maxWidth:380 }}>
            {SESSIONS_CONFIG[currentSession-1]?.activities.map((a,i) => (
              <div key={i} style={S.activityPill}>{a}</div>
            ))}
          </div>
        </div>

        <div style={S.messages}>
          {messages.length===0 && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, opacity:.3, marginTop:80 }}>
              <div style={{ fontSize:32, color:"#52B788" }}>◈</div>
              <div style={{ fontSize:14, color:"#74C69D", textAlign:"center" }}>Tu orientador vocacional está listo</div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={msg.role==="user"?"msg-u":"msg-a"} style={{ display:"flex", justifyContent:msg.role==="user"?"flex-end":"flex-start", alignItems:"flex-end", gap:10 }}>
              {msg.role==="assistant" && <div style={{ fontSize:14, color:"#52B788", marginBottom:4, flexShrink:0 }}>◈</div>}
              <div style={{ ...S.bubble, ...(msg.role==="user"?S.bubbleU:S.bubbleA) }}>
                {msg.content.split("\n").map((l,j,arr) => <span key={j}>{l}{j<arr.length-1&&<br/>}</span>)}
              </div>
            </div>
          ))}
          {isTyping && (
            <div style={{ display:"flex", alignItems:"flex-end", gap:10 }}>
              <div style={{ fontSize:14, color:"#52B788", marginBottom:4 }}>◈</div>
              <div style={{ ...S.bubble, ...S.bubbleA, display:"flex", gap:5, alignItems:"center" }}>
                {[0,.2,.4].map((d,i) => <span key={i} style={{ fontSize:7, color:"#52B788", animation:`blink 1.2s ${d}s infinite` }}>●</span>)}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div style={S.inputArea}>
          <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
            <textarea ref={textareaRef} style={S.textarea} value={input}
              onChange={e => { setInput(e.target.value); e.target.style.height="auto"; e.target.style.height=Math.min(e.target.scrollHeight,120)+"px"; }}
              onKeyDown={handleKeyDown} placeholder="Escribe tu respuesta... (Enter para enviar)" rows={1} />
            <button className="send-btn" style={{ ...S.sendBtn, opacity:(!input.trim()||isTyping)?.4:1 }}
              onClick={sendMessage} disabled={!input.trim()||isTyping}>↑</button>
          </div>
          <div style={{ fontSize:11, color:"#2D6A4F", marginTop:6 }}>Shift + Enter para nueva línea</div>
        </div>
      </div>
    </div>
  );
}

// ── Global styles ──
function GlobalStyles() {
  return (
    <style>{`
      @keyframes pulse{0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
      @keyframes blink{0%,100%{opacity:.2}50%{opacity:1}}
      @keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      *{box-sizing:border-box;margin:0;padding:0}
      ::-webkit-scrollbar{width:4px}
      ::-webkit-scrollbar-thumb{background:#2D6A4F44;border-radius:2px}
      .msg-u{animation:slideIn .2s ease}
      .msg-a{animation:fadeUp .3s ease}
      .auth-input:focus{outline:none;border-color:#52B788!important}
      textarea:focus{outline:none}
      .choice-btn{display:flex;align-items:center;gap:16;padding:18px 20px;border-radius:14px;cursor:pointer;border:1px solid;text-align:left;width:100%;transition:all .2s;font-family:'DM Sans',sans-serif}
      .choice-btn.primary{background:#1B4332;border-color:#52B78866;color:#D8F3DC}
      .choice-btn.primary:hover{background:#2D6A4F;border-color:#52B788}
      .choice-btn.secondary{background:transparent;border-color:#2D6A4F44;color:#B7E4C7}
      .choice-btn.secondary:hover{background:#0d2218;border-color:#2D6A4F}
      .primary-btn:hover:not(:disabled){background:#1B4332!important}
      .primary-btn:disabled{opacity:.5;cursor:not-allowed}
      .send-btn:hover:not(:disabled){background:#1B4332!important}
      .ss:hover{background:rgba(82,183,136,.08)!important}
    `}</style>
  );
}

// ── Styles ──
const S = {
  center:    { display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0a1a0f" },
  dot:       { width:16,height:16,borderRadius:"50%",background:"#52B788",animation:"pulse 1.2s infinite" },
  authWrap:  { minHeight:"100vh",background:"#0a1a0f",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'DM Sans',sans-serif" },
  authBg:    { position:"fixed",inset:0,background:"radial-gradient(ellipse at 20% 50%, #1B4332 0%, transparent 60%)",pointerEvents:"none" },
  authCard:  { position:"relative",maxWidth:480,width:"100%",zIndex:1,display:"flex",flexDirection:"column",gap:16 },
  logoRow:   { display:"flex",alignItems:"center",gap:12 },
  logoIcon:  { fontSize:22,color:"#52B788" },
  logoU:     { fontSize:13,fontWeight:500,color:"#D8F3DC" },
  logoSub:   { fontSize:11,color:"#52B78877" },
  authH1:    { fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(48px,9vw,76px)",fontWeight:300,color:"#D8F3DC",lineHeight:1,letterSpacing:-2,marginTop:16 },
  authP:     { fontSize:14,color:"#74C69D",lineHeight:1.7,fontWeight:300 },
  choiceButtons: { display:"flex",flexDirection:"column",gap:10,marginTop:8 },
  choiceIcon:    { fontSize:20,color:"#52B788",flexShrink:0 },
  choiceTitle:   { fontSize:14,fontWeight:500,color:"#D8F3DC" },
  choiceSub:     { fontSize:12,color:"#52B78877",marginTop:2 },
  adminLink:     { background:"none",border:"none",color:"#2D6A4F",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",alignSelf:"center",marginTop:4 },
  backBtn:       { background:"none",border:"none",color:"#74C69D",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",alignSelf:"flex-start",padding:0,marginBottom:8 },
  formTitle:     { fontFamily:"'Cormorant Garamond',serif",fontSize:36,fontWeight:400,color:"#D8F3DC" },
  formSubtitle:  { fontSize:13,color:"#74C69D",lineHeight:1.6,marginBottom:4 },
  formGroup:     { display:"flex",flexDirection:"column",gap:6 },
  label:         { fontSize:12,color:"#74C69D" },
  input:         { background:"#0d2218",border:"1px solid #2D6A4F",borderRadius:10,padding:"12px 16px",color:"#D8F3DC",fontSize:14,fontFamily:"'DM Sans',sans-serif",transition:"border-color .2s" },
  errorBox:      { background:"#2D0A0A",border:"1px solid #7B2020",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#F4A4A4" },
  primaryBtn:    { background:"#2D6A4F",border:"none",borderRadius:10,padding:"14px",color:"#D8F3DC",fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"background .2s" },
  switchText:    { fontSize:12,color:"#52B78877",textAlign:"center" },
  switchLink:    { background:"none",border:"none",color:"#52B788",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" },
  adminWrap:     { minHeight:"100vh",background:"#0a1a0f",color:"#D8F3DC",fontFamily:"'DM Sans',sans-serif",padding:32 },
  adminHeader:   { display:"flex",alignItems:"center",gap:20,marginBottom:32 },
  adminTitle:    { fontSize:22,fontWeight:400,color:"#D8F3DC" },
  adminLock:     { maxWidth:340,display:"flex",flexDirection:"column",gap:12 },
  adminContent:  { maxWidth:780,display:"flex",flexDirection:"column",gap:24 },
  adminSection:  { background:"#0d2218",border:"1px solid #2D6A4F33",borderRadius:16,padding:24 },
  adminSectionTitle: { fontSize:16,fontWeight:500,color:"#D8F3DC",marginBottom:10 },
  adminDesc:     { fontSize:13,color:"#74C69D",lineHeight:1.6,marginBottom:14 },
  careerTextarea: { width:"100%",background:"#081C15",border:"1px solid #2D6A4F",borderRadius:10,padding:16,color:"#D8F3DC",fontSize:13,fontFamily:"'DM Sans',sans-serif",resize:"vertical",lineHeight:1.6 },
  infoGrid:      { display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 },
  infoCard:      { background:"#081C15",borderRadius:10,padding:"12px 16px",border:"1px solid #2D6A4F22" },
  infoLabel:     { fontSize:10,color:"#52B78877",letterSpacing:.5,marginBottom:4,textTransform:"uppercase" },
  infoValue:     { fontSize:13,color:"#B7E4C7" },
  chatWrap:      { display:"flex",height:"100vh",background:"#0a1a0f",fontFamily:"'DM Sans',sans-serif",overflow:"hidden" },
  sidebar:       { width:252,minWidth:252,background:"#0d2218",borderRight:"1px solid #2D6A4F22",display:"flex",flexDirection:"column",padding:"20px 0",overflow:"hidden" },
  sidebarTop:    { padding:"0 20px 16px",borderBottom:"1px solid #2D6A4F22" },
  sidebarLabel:  { fontSize:10,color:"#2D6A4F",letterSpacing:1.5,marginBottom:8,paddingLeft:8 },
  sidebarSession: { display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 8px",borderRadius:8,transition:"background .2s",marginBottom:2 },
  sessionActive: { background:"rgba(82,183,136,.1)",border:"1px solid #52B78833" },
  profileCard:   { margin:"0 12px 12px",padding:12,background:"#081C15",borderRadius:10,border:"1px solid #2D6A4F22" },
  pRow:          { marginBottom:5 },
  pKey:          { fontSize:10,color:"#52B78877",display:"block" },
  pVal:          { fontSize:11,color:"#B7E4C7" },
  sideTabBtn:    { background:"none",border:"1px solid #2D6A4F44",borderRadius:8,padding:"8px 12px",color:"#52B788",fontSize:11,cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans',sans-serif" },
  logoutBtn:     { background:"none",border:"none",color:"#2D6A4F",fontSize:11,cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans',sans-serif",padding:"4px 12px" },
  chatArea:      { flex:1,display:"flex",flexDirection:"column",overflow:"hidden" },
  chatHeader:    { padding:"16px 24px",borderBottom:"1px solid #2D6A4F22",display:"flex",alignItems:"flex-start",justifyContent:"space-between" },
  activityPill:  { fontSize:10,color:"#52B788",background:"#2D6A4F22",border:"1px solid #2D6A4F44",borderRadius:20,padding:"3px 10px" },
  messages:      { flex:1,overflowY:"auto",padding:"24px",display:"flex",flexDirection:"column",gap:16 },
  bubble:        { maxWidth:"72%",padding:"12px 16px",borderRadius:16,fontSize:14,lineHeight:1.65 },
  bubbleU:       { background:"#2D6A4F",color:"#D8F3DC",borderBottomRightRadius:4 },
  bubbleA:       { background:"#0d2218",border:"1px solid #2D6A4F33",color:"#D8F3DC",borderBottomLeftRadius:4 },
  inputArea:     { padding:"16px 24px 20px",borderTop:"1px solid #2D6A4F22" },
  textarea:      { flex:1,background:"#0d2218",border:"1px solid #2D6A4F44",borderRadius:12,padding:"12px 16px",color:"#D8F3DC",fontSize:14,fontFamily:"'DM Sans',sans-serif",resize:"none",lineHeight:1.5,minHeight:46,maxHeight:120 },
  sendBtn:       { width:46,height:46,background:"#2D6A4F",border:"none",borderRadius:12,color:"#D8F3DC",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .2s" },
};
