"use client";
// components/ExploraApp.jsx
// Componente principal del sistema de orientación vocacional.
// Las llamadas a Anthropic pasan por /api/chat y /api/profile (server-side).

import { useState, useEffect, useRef, useCallback } from "react";
import { SESSIONS_CONFIG } from "@/lib/systemPrompt";

// ─── STORAGE HELPERS (localStorage para persistencia en el browser) ──────────
const store = {
  get: (key) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
    catch { return null; }
  },
  set: (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  },
  del: (key) => {
    try { localStorage.removeItem(key); } catch {}
  },
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function ExploraApp() {
  const [view, setView]                     = useState("loading");
  const [userName, setUserName]             = useState("");
  const [userId, setUserId]                 = useState("");
  const [messages, setMessages]             = useState([]);
  const [input, setInput]                   = useState("");
  const [isTyping, setIsTyping]             = useState(false);
  const [userProfile, setUserProfile]       = useState(null);
  const [careerData, setCareerData]         = useState("");
  const [currentSession, setCurrentSession] = useState(1);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [nameInput, setNameInput]           = useState("");

  // Admin state
  const [adminUnlocked, setAdminUnlocked]   = useState(false);
  const [adminPassword, setAdminPassword]   = useState("");
  const [careerInput, setCareerInput]       = useState("");
  const [saveStatus, setSaveStatus]         = useState("");

  const chatEndRef  = useRef(null);
  const textareaRef = useRef(null);

  // ── INIT ──
  useEffect(() => {
    const careers = store.get("careers_data");
    if (careers) setCareerData(careers);

    const session = store.get("user_session");
    if (session?.userId) {
      setUserId(session.userId);
      setUserName(session.userName);
      const profile  = store.get(`profile_${session.userId}`);
      const msgs     = store.get(`messages_${session.userId}`);
      const progress = store.get(`progress_${session.userId}`);
      if (profile)   setUserProfile(profile);
      if (msgs?.length) setMessages(msgs);
      if (progress) {
        setCurrentSession(progress.currentSession || 1);
        setCompletedSessions(progress.completedSessions || []);
      }
      setView("chat");
    } else {
      setView("welcome");
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── START SESSION ──
  const startSession = async () => {
    if (!nameInput.trim()) return;
    const id = `user_${Date.now()}`;
    setUserId(id);
    setUserName(nameInput.trim());
    store.set("user_session", { userId: id, userName: nameInput.trim() });
    setView("chat");
    setTimeout(() => sendWelcomeMessage(nameInput.trim(), id), 300);
  };

  const sendWelcomeMessage = async (name, id) => {
    setIsTyping(true);
    const initMessages = [
      { role: "user", content: `Hola, me llamo ${name} y quiero empezar el proceso de orientación vocacional.` },
    ];
    try {
      const res  = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: initMessages, userProfile: null, careerData }),
      });
      const data = await res.json();
      const reply = data.content || "¡Hola! Estoy aquí para acompañarte.";
      const newMsgs = [
        { role: "user",      content: initMessages[0].content },
        { role: "assistant", content: reply },
      ];
      setMessages(newMsgs);
      store.set(`messages_${id}`, newMsgs);
    } catch {
      const fallback = [{ role: "assistant", content: `¡Hola ${name}! Soy Explora, tu orientador vocacional de la Universidad de La Sabana. ¿Qué te trajo hoy aquí?` }];
      setMessages(fallback);
    }
    setIsTyping(false);
  };

  // ── SEND MESSAGE ──
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isTyping) return;
    const userMsg    = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const res  = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          userProfile,
          careerData,
        }),
      });
      const data = await res.json();
      const reply = data.content || "Hubo un error. Por favor intenta de nuevo.";

      const finalMessages = [...newMessages, { role: "assistant", content: reply }];
      setMessages(finalMessages);
      store.set(`messages_${userId}`, finalMessages);

      // Detectar completado de sesión
      const sessionMatch = reply.match(/Has completado la Sesión (\d)/);
      if (sessionMatch) {
        const completedNum = parseInt(sessionMatch[1]);
        const newCompleted = [...new Set([...completedSessions, completedNum])];
        const nextSession  = Math.min(completedNum + 1, 3);
        setCompletedSessions(newCompleted);
        setCurrentSession(nextSession);
        store.set(`progress_${userId}`, { currentSession: nextSession, completedSessions: newCompleted });
      }

      // Actualizar perfil cada 6 mensajes
      if (finalMessages.length % 6 === 0) {
        updateProfile(finalMessages);
      }

    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Error de conexión. Recarga la página e intenta de nuevo." }]);
    }
    setIsTyping(false);
  }, [input, messages, isTyping, userId, careerData, userProfile, completedSessions]);

  const updateProfile = async (msgs) => {
    try {
      const res  = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs, currentProfile: userProfile }),
      });
      const data = await res.json();
      if (data.profile) {
        setUserProfile(data.profile);
        store.set(`profile_${userId}`, data.profile);
      }
    } catch {}
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const resetUser = () => {
    if (!confirm("¿Seguro que quieres borrar tu progreso y empezar de nuevo?")) return;
    store.del("user_session");
    store.del(`messages_${userId}`);
    store.del(`profile_${userId}`);
    store.del(`progress_${userId}`);
    setMessages([]); setUserProfile(null); setCurrentSession(1); setCompletedSessions([]);
    setView("welcome"); setNameInput("");
  };

  const unlockAdmin = async () => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });
      if (res.ok) {
        setAdminUnlocked(true);
        setCareerInput(careerData);
      } else {
        alert("Contraseña incorrecta");
      }
    } catch {
      alert("Error de conexión");
    }
  };

  const saveCareerData = () => {
    const data = careerInput.trim();
    store.set("careers_data", data);
    setCareerData(data);
    setSaveStatus("✓ Datos guardados");
    setTimeout(() => setSaveStatus(""), 3000);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  if (view === "loading") return (
    <div style={S.loadingScreen}>
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}`}</style>
      <div style={S.loadingDot} />
    </div>
  );

  if (view === "welcome") return (
    <div style={S.welcomeWrap}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .btn-start:hover{background:#1B4332!important;transform:translateY(-1px)}
        .name-input:focus{outline:none;border-color:#52B788!important}
        .admin-link:hover{opacity:.8!important}
      `}</style>
      <div style={S.welcomeBg} />
      <div style={S.welcomeCard}>
        <div style={S.logoArea}>
          <span style={S.logoIcon}>◈</span>
          <div>
            <div style={S.logoU}>Universidad de La Sabana</div>
            <div style={S.logoSub}>Bienestar y Experiencia del Estudiante</div>
          </div>
        </div>
        <h1 style={S.heroH1}>Explora<br/>Tu Carrera</h1>
        <p style={S.heroP}>Un espacio de orientación vocacional personalizado para acompañarte en una de las decisiones más importantes de tu vida.</p>
        <div style={S.sessionsPreview}>
          {SESSIONS_CONFIG.map(s => (
            <div key={s.id} style={S.sessionChip}>
              <span style={S.chipIcon}>{s.icon}</span>
              <div>
                <div style={S.chipTitle}>Sesión {s.id}: {s.title}</div>
                <div style={S.chipSub}>{s.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
        <input
          className="name-input"
          style={S.nameInput}
          type="text"
          placeholder="¿Cómo te llamas?"
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && startSession()}
          autoFocus
        />
        <button className="btn-start" style={S.startBtn} onClick={startSession}>
          Comenzar mi proceso →
        </button>
        <button className="admin-link" style={S.adminLink} onClick={() => setView("admin")}>
          Acceso orientadores
        </button>
      </div>
    </div>
  );

  if (view === "admin") return (
    <div style={S.adminWrap}>
      <style>{`*{box-sizing:border-box} textarea:focus,input:focus{outline:none;border-color:#52B788!important} .save-btn:hover{background:#1B4332!important}`}</style>
      <div style={S.adminHeader}>
        <button style={S.backBtn} onClick={() => setView(userId ? "chat" : "welcome")}>← Volver</button>
        <h2 style={S.adminTitle}>Panel de Orientadores</h2>
      </div>
      {!adminUnlocked ? (
        <div style={S.adminLock}>
          <p style={S.adminLockLabel}>Contraseña de acceso</p>
          <input style={S.adminInput} type="password" placeholder="Contraseña"
            value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && unlockAdmin()} />
          <button className="save-btn" style={S.saveBtn} onClick={unlockAdmin}>Ingresar</button>
        </div>
      ) : (
        <div style={S.adminContent}>
          <div style={S.adminSection}>
            <h3 style={S.adminSectionTitle}>📚 Datos de Programas y Carreras</h3>
            <p style={S.adminDesc}>
              Pega aquí la información de todos los programas de La Sabana: pregrados, posgrados, asignaturas, 
              perfiles de ingreso/egreso, campos de acción. Cuanto más detallado, más preciso será el orientador.
            </p>
            <p style={{...S.adminDesc, color:"#52B788", marginTop:6}}>
              Formato libre: texto, JSON o CSV. Ejemplo: "Programa: Derecho | Facultad: Ciencias Jurídicas | Duración: 10 semestres | Perfil ingreso: ... | Materias: ..."
            </p>
            <textarea style={S.careerTextarea} rows={16}
              value={careerInput} onChange={e => setCareerInput(e.target.value)}
              placeholder={`Programa: Medicina\nFacultad: Ciencias de la Salud\nDuración: 12 semestres\nPerfil de ingreso: Vocación de servicio, habilidades científicas...\nPerfil del egresado: Médico capaz de diagnosticar, tratar...\nCampos de acción: Medicina clínica, investigación, salud pública...\nMaterias clave: Anatomía, Fisiología, Bioquímica...\n\n---\n\nPrograma: Derecho\n...`}
            />
            <div style={{display:"flex", alignItems:"center", gap:16, marginTop:12}}>
              <button className="save-btn" style={S.saveBtn} onClick={saveCareerData}>Guardar datos</button>
              {saveStatus && <span style={{fontSize:13, color:"#52B788"}}>{saveStatus}</span>}
            </div>
          </div>
          <div style={S.adminSection}>
            <h3 style={S.adminSectionTitle}>⚙️ Estado del sistema</h3>
            <div style={S.infoGrid}>
              {[
                ["Datos de carreras", careerData ? `${careerData.length.toLocaleString()} caracteres cargados` : "Sin datos"],
                ["Modelo de IA",      "Claude Sonnet 4 (Anthropic)"],
                ["Idioma",            "Español (Colombia)"],
                ["Sesiones",          "3 sesiones — Curso Explora Tu Carrera"],
              ].map(([label, value]) => (
                <div key={label} style={S.infoCard}>
                  <div style={S.infoLabel}>{label}</div>
                  <div style={S.infoValue}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── CHAT VIEW ──
  const sessionDone = (n) => completedSessions.includes(n);

  return (
    <div style={S.chatWrap}>
      <style>{`
        *{box-sizing:border-box}
        body{background:#0a1a0f}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#2D6A4F44;border-radius:2px}
        .msg-u{animation:slideIn .2s ease}
        .msg-a{animation:fadeUp .3s ease}
        @keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .send-btn:hover:not(:disabled){background:#1B4332!important}
        .ss:hover{background:rgba(82,183,136,.08)!important}
        textarea:focus{outline:none}
        @keyframes blink{0%,100%{opacity:.2}50%{opacity:1}}
      `}</style>

      {/* SIDEBAR */}
      <div style={S.sidebar}>
        <div style={S.sidebarTop}>
          <div style={S.sidebarLogo}><span style={{fontSize:18,color:"#52B788"}}>◈</span><span style={S.sidebarLogoText}>Explora</span></div>
          <div style={S.sidebarUserName}>{userName}</div>
        </div>

        <div style={{padding:"16px 12px", flex:1}}>
          <div style={S.sidebarLabel}>TU PROCESO</div>
          {SESSIONS_CONFIG.map(s => (
            <div key={s.id} className="ss" style={{
              ...S.sidebarSession,
              ...(currentSession===s.id && !sessionDone(s.id) ? S.sessionActive : {}),
              ...(sessionDone(s.id) ? {opacity:.55} : {}),
            }}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{...S.sidebarDot, background: sessionDone(s.id)||currentSession===s.id ? "#52B788" : "#2D6A4F44", boxShadow: currentSession===s.id&&!sessionDone(s.id) ? "0 0 8px #52B78866" : "none"}}/>
                <div>
                  <div style={S.ssTitle}>Sesión {s.id}: {s.title}</div>
                  <div style={S.ssSub}>{s.subtitle}</div>
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
            {userProfile.aptitudes?.length>0 && <div style={S.pRow}><span style={S.pKey}>Aptitudes:</span><span style={S.pVal}>{userProfile.aptitudes.slice(0,2).join(", ")}</span></div>}
          </div>
        )}

        <div style={{padding:"12px 12px 0", borderTop:"1px solid #2D6A4F22", display:"flex", flexDirection:"column", gap:6}}>
          <button style={S.sideTabBtn} onClick={() => setView("admin")}>⚙ Panel orientadores</button>
          <button style={S.resetBtn} onClick={resetUser}>Reiniciar proceso</button>
        </div>
      </div>

      {/* CHAT MAIN */}
      <div style={S.chatArea}>
        <div style={S.chatHeader}>
          <div>
            <div style={S.chatHeaderTitle}>Sesión {currentSession}: {SESSIONS_CONFIG[currentSession-1]?.title}</div>
            <div style={S.chatHeaderSub}>{SESSIONS_CONFIG[currentSession-1]?.subtitle}</div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end",maxWidth:400}}>
            {SESSIONS_CONFIG[currentSession-1]?.activities.map((a,i) => (
              <div key={i} style={S.activityPill}>{a}</div>
            ))}
          </div>
        </div>

        <div style={S.messagesContainer}>
          {messages.length===0 && (
            <div style={S.emptyState}>
              <div style={{fontSize:32,color:"#52B788"}}>◈</div>
              <div style={{fontSize:14,color:"#74C69D",textAlign:"center"}}>Tu orientador vocacional está listo para acompañarte</div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={msg.role==="user"?"msg-u":"msg-a"} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start",alignItems:"flex-end",gap:10}}>
              {msg.role==="assistant" && <div style={{fontSize:16,color:"#52B788",marginBottom:4,flexShrink:0}}>◈</div>}
              <div style={{...S.bubble,...(msg.role==="user"?S.bubbleU:S.bubbleA)}}>
                {msg.content.split("\n").map((line,j,arr) => (
                  <span key={j}>{line}{j<arr.length-1&&<br/>}</span>
                ))}
              </div>
            </div>
          ))}
          {isTyping && (
            <div style={{display:"flex",alignItems:"flex-end",gap:10}}>
              <div style={{fontSize:16,color:"#52B788",marginBottom:4}}>◈</div>
              <div style={{...S.bubble,...S.bubbleA,display:"flex",gap:5,alignItems:"center"}}>
                {[0,.2,.4].map((d,i) => <span key={i} style={{fontSize:7,color:"#52B788",animation:`blink 1.2s ${d}s infinite`}}>●</span>)}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div style={S.inputArea}>
          <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
            <textarea ref={textareaRef} style={S.textarea} value={input}
              onChange={e => { setInput(e.target.value); e.target.style.height="auto"; e.target.style.height=Math.min(e.target.scrollHeight,120)+"px"; }}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu respuesta aquí... (Enter para enviar)" rows={1}
            />
            <button className="send-btn" style={{...S.sendBtn, opacity:(!input.trim()||isTyping)?.4:1}}
              onClick={sendMessage} disabled={!input.trim()||isTyping}>↑</button>
          </div>
          <div style={{fontSize:11,color:"#2D6A4F",marginTop:6}}>Shift + Enter para nueva línea</div>
        </div>
      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  loadingScreen: {display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0a1a0f"},
  loadingDot:    {width:16,height:16,borderRadius:"50%",background:"#52B788",animation:"pulse 1.2s infinite"},
  welcomeWrap:   {minHeight:"100vh",background:"#0a1a0f",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'DM Sans', sans-serif"},
  welcomeBg:     {position:"fixed",inset:0,background:"radial-gradient(ellipse at 20% 50%, #1B4332 0%, transparent 60%)",pointerEvents:"none"},
  welcomeCard:   {position:"relative",maxWidth:500,width:"100%",zIndex:1,display:"flex",flexDirection:"column",gap:16},
  logoArea:      {display:"flex",alignItems:"center",gap:12},
  logoIcon:      {fontSize:24,color:"#52B788"},
  logoU:         {fontSize:13,fontWeight:500,color:"#D8F3DC",letterSpacing:.5},
  logoSub:       {fontSize:11,color:"#52B78888"},
  heroH1:        {fontFamily:"'Cormorant Garamond', serif",fontSize:"clamp(52px,9vw,80px)",fontWeight:300,color:"#D8F3DC",lineHeight:1.0,letterSpacing:-2,marginTop:24},
  heroP:         {fontSize:14,color:"#74C69D",lineHeight:1.7,fontWeight:300,marginBottom:8},
  sessionsPreview:{display:"flex",flexDirection:"column",gap:8,marginBottom:8},
  sessionChip:   {display:"flex",alignItems:"center",gap:14,padding:"8px 0",borderBottom:"1px solid #2D6A4F33"},
  chipIcon:      {fontSize:16,color:"#52B788",width:22,textAlign:"center"},
  chipTitle:     {fontSize:12,fontWeight:500,color:"#B7E4C7",letterSpacing:.2},
  chipSub:       {fontSize:11,color:"#52B78877"},
  nameInput:     {background:"#0d2218",border:"1px solid #2D6A4F",borderRadius:12,padding:"14px 18px",color:"#D8F3DC",fontSize:15,fontFamily:"'DM Sans', sans-serif",transition:"border-color .2s"},
  startBtn:      {background:"#2D6A4F",border:"none",borderRadius:12,padding:"14px 18px",color:"#D8F3DC",fontSize:15,fontWeight:500,cursor:"pointer",transition:"all .2s",fontFamily:"'DM Sans', sans-serif"},
  adminLink:     {background:"none",border:"none",color:"#2D6A4F",fontSize:12,cursor:"pointer",opacity:.6,fontFamily:"'DM Sans', sans-serif",alignSelf:"center"},
  adminWrap:     {minHeight:"100vh",background:"#0a1a0f",color:"#D8F3DC",fontFamily:"'DM Sans', sans-serif",padding:32},
  adminHeader:   {display:"flex",alignItems:"center",gap:20,marginBottom:32},
  backBtn:       {background:"none",border:"1px solid #2D6A4F",borderRadius:8,padding:"8px 16px",color:"#74C69D",fontSize:13,cursor:"pointer"},
  adminTitle:    {fontSize:22,fontWeight:400,color:"#D8F3DC"},
  adminLock:     {maxWidth:340,display:"flex",flexDirection:"column",gap:12},
  adminLockLabel:{fontSize:13,color:"#74C69D"},
  adminInput:    {background:"#0d2218",border:"1px solid #2D6A4F",borderRadius:10,padding:"12px 16px",color:"#D8F3DC",fontSize:14,fontFamily:"'DM Sans', sans-serif"},
  adminContent:  {maxWidth:780,display:"flex",flexDirection:"column",gap:28},
  adminSection:  {background:"#0d2218",border:"1px solid #2D6A4F33",borderRadius:16,padding:24},
  adminSectionTitle:{fontSize:16,fontWeight:500,color:"#D8F3DC",marginBottom:10},
  adminDesc:     {fontSize:13,color:"#74C69D",lineHeight:1.6,marginBottom:12},
  careerTextarea:{width:"100%",background:"#081C15",border:"1px solid #2D6A4F",borderRadius:10,padding:16,color:"#D8F3DC",fontSize:13,fontFamily:"'DM Sans', sans-serif",resize:"vertical",lineHeight:1.6},
  saveBtn:       {background:"#2D6A4F",border:"none",borderRadius:10,padding:"10px 20px",color:"#D8F3DC",fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"'DM Sans', sans-serif",transition:"background .2s"},
  infoGrid:      {display:"grid",gridTemplateColumns:"1fr 1fr",gap:12},
  infoCard:      {background:"#081C15",borderRadius:10,padding:"12px 16px",border:"1px solid #2D6A4F22"},
  infoLabel:     {fontSize:10,color:"#52B78888",letterSpacing:.5,marginBottom:4,textTransform:"uppercase"},
  infoValue:     {fontSize:13,color:"#B7E4C7"},
  chatWrap:      {display:"flex",height:"100vh",background:"#0a1a0f",fontFamily:"'DM Sans', sans-serif",overflow:"hidden"},
  sidebar:       {width:252,minWidth:252,background:"#0d2218",borderRight:"1px solid #2D6A4F22",display:"flex",flexDirection:"column",padding:"20px 0",overflow:"hidden"},
  sidebarTop:    {padding:"0 20px 20px",borderBottom:"1px solid #2D6A4F22"},
  sidebarLogo:   {display:"flex",alignItems:"center",gap:8,marginBottom:10},
  sidebarLogoText:{fontSize:16,fontFamily:"'Cormorant Garamond', serif",color:"#D8F3DC",fontWeight:400},
  sidebarUserName:{fontSize:13,color:"#74C69D"},
  sidebarLabel:  {fontSize:10,color:"#2D6A4F",letterSpacing:1.5,marginBottom:8,paddingLeft:8},
  sidebarSession:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 8px",borderRadius:8,cursor:"default",transition:"background .2s",marginBottom:2},
  sessionActive: {background:"rgba(82,183,136,.1)",border:"1px solid #52B78833"},
  sidebarDot:    {width:8,height:8,borderRadius:"50%",flexShrink:0,transition:"all .3s"},
  ssTitle:       {fontSize:12,fontWeight:500,color:"#B7E4C7"},
  ssSub:         {fontSize:10,color:"#52B78877"},
  profileCard:   {margin:"0 12px 12px",padding:12,background:"#081C15",borderRadius:10,border:"1px solid #2D6A4F22"},
  pRow:          {marginBottom:6},
  pKey:          {fontSize:10,color:"#52B78877",display:"block"},
  pVal:          {fontSize:11,color:"#B7E4C7"},
  sideTabBtn:    {background:"none",border:"1px solid #2D6A4F44",borderRadius:8,padding:"8px 12px",color:"#52B788",fontSize:11,cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans', sans-serif"},
  resetBtn:      {background:"none",border:"none",color:"#2D6A4F",fontSize:11,cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans', sans-serif",padding:"4px 12px"},
  chatArea:      {flex:1,display:"flex",flexDirection:"column",overflow:"hidden"},
  chatHeader:    {padding:"16px 24px",borderBottom:"1px solid #2D6A4F22",display:"flex",alignItems:"flex-start",justifyContent:"space-between"},
  chatHeaderTitle:{fontSize:16,fontWeight:500,color:"#D8F3DC"},
  chatHeaderSub: {fontSize:12,color:"#52B78877",marginTop:2},
  activityPill:  {fontSize:10,color:"#52B788",background:"#2D6A4F22",border:"1px solid #2D6A4F44",borderRadius:20,padding:"3px 10px"},
  messagesContainer:{flex:1,overflowY:"auto",padding:"24px",display:"flex",flexDirection:"column",gap:16},
  emptyState:    {flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,opacity:.35,marginTop:80},
  bubble:        {maxWidth:"72%",padding:"12px 16px",borderRadius:16,fontSize:14,lineHeight:1.65},
  bubbleU:       {background:"#2D6A4F",color:"#D8F3DC",borderBottomRightRadius:4},
  bubbleA:       {background:"#0d2218",border:"1px solid #2D6A4F33",color:"#D8F3DC",borderBottomLeftRadius:4},
  inputArea:     {padding:"16px 24px 20px",borderTop:"1px solid #2D6A4F22"},
  textarea:      {flex:1,background:"#0d2218",border:"1px solid #2D6A4F44",borderRadius:12,padding:"12px 16px",color:"#D8F3DC",fontSize:14,fontFamily:"'DM Sans', sans-serif",resize:"none",lineHeight:1.5,minHeight:46,maxHeight:120,transition:"border-color .2s"},
  sendBtn:       {width:46,height:46,background:"#2D6A4F",border:"none",borderRadius:12,color:"#D8F3DC",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .2s"},
};
