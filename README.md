# 🎓 Explora Tu Carrera — Universidad de La Sabana

Sistema de orientación vocacional impulsado por IA, basado en el programa institucional **"Explora Tu Carrera"** de Bienestar y Experiencia del Estudiante.

---

## ¿Qué hace este sistema?

- Guía al estudiante a través de las **3 sesiones del programa Explora** de forma conversacional
- Construye un **perfil vocacional progresivo** mientras el estudiante habla
- **Recuerda el progreso** entre sesiones (el estudiante puede retomar donde quedó)
- Tiene un **panel para orientadores** donde se sube la info de todas las carreras de La Sabana
- Habla en **español colombiano**, con el tono cálido y empático del programa

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 14 + React |
| IA | Claude Sonnet 4 (Anthropic) |
| Backend | Next.js API Routes (Node.js) |
| Memoria | localStorage del browser |
| Deploy | Vercel (recomendado) |

---

## Instalación local

### 1. Prerrequisitos
- Node.js 18 o superior → [descargar](https://nodejs.org)
- Una cuenta en [Anthropic Console](https://console.anthropic.com) para la API key

### 2. Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/explora-tu-carrera.git
cd explora-tu-carrera
```

### 3. Instalar dependencias
```bash
npm install
```

### 4. Configurar variables de entorno
```bash
# Copiar el archivo de ejemplo
cp .env.example .env.local

# Abrirlo y rellenar:
# ANTHROPIC_API_KEY=sk-ant-...  ← tu key de Anthropic
# ADMIN_PASSWORD=tu_contraseña  ← contraseña del panel de orientadores
```

### 5. Correr en desarrollo
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## Estructura del proyecto

```
explora-tu-carrera/
├── app/
│   ├── api/
│   │   ├── chat/route.js       ← Proxy seguro hacia Anthropic (chat)
│   │   ├── profile/route.js    ← Extracción automática del perfil
│   │   └── admin/route.js      ← Verificación de contraseña admin
│   ├── layout.js               ← Layout raíz (fuentes, metadata)
│   └── page.js                 ← Página principal
├── components/
│   └── ExploraApp.jsx          ← Componente principal de la app
├── lib/
│   └── systemPrompt.js         ← Prompt del orientador + config de sesiones
├── .env.example                ← Variables de entorno (sin valores reales)
├── .gitignore                  ← Excluye node_modules, .env.local, .next
├── next.config.js
├── package.json
└── README.md
```

---

## Deploy en Vercel (recomendado, gratis)

### Primera vez:

1. Ve a [vercel.com](https://vercel.com) → crear cuenta con tu cuenta de GitHub
2. Haz clic en **"Add New Project"**
3. Selecciona tu repositorio `explora-tu-carrera`
4. En **Environment Variables**, agrega:
   - `ANTHROPIC_API_KEY` = tu API key
   - `ADMIN_PASSWORD` = la contraseña que quieras
5. Haz clic en **Deploy**

Vercel te da una URL pública tipo `explora-tu-carrera.vercel.app` en ~2 minutos.

### Para actualizaciones posteriores:
```bash
git add .
git commit -m "descripción del cambio"
git push origin main
# Vercel detecta el push y redespliega automáticamente
```

---

## Subir a GitHub (primera vez)

```bash
# Dentro de la carpeta del proyecto:
git init
git add .
git commit -m "🎓 Initial commit - Explora Tu Carrera"

# Crea el repo en github.com, luego:
git remote add origin https://github.com/TU_USUARIO/explora-tu-carrera.git
git branch -M main
git push -u origin main
```

---

## Panel de Orientadores

1. En la app, haz clic en **"Acceso orientadores"** (abajo en la pantalla de bienvenida)
2. Ingresa la contraseña configurada en `ADMIN_PASSWORD`
3. Pega la información de los programas en el campo de texto
4. Guarda — el sistema la usará automáticamente en todas las conversaciones

**Formato sugerido para los datos de carreras:**
```
Programa: Medicina
Facultad: Ciencias de la Salud
Modalidad: Presencial
Duración: 12 semestres
Perfil de ingreso: Vocación de servicio humano, habilidades en ciencias naturales...
Perfil del egresado: Médico capaz de diagnóstico, tratamiento, investigación...
Campos de acción: Medicina clínica, salud pública, docencia, investigación...
Materias clave: Anatomía, Fisiología, Bioquímica, Microbiología, Clínica...
Enlace: https://www.unisabana.edu.co/programas/medicina

---

Programa: Derecho
...
```

---

## Personalización fácil

| ¿Qué quieres cambiar? | ¿Dónde? |
|----------------------|---------|
| Tono y personalidad del orientador | `lib/systemPrompt.js` |
| Actividades de cada sesión | `lib/systemPrompt.js` → `SESSIONS_CONFIG` |
| Colores y diseño | `components/ExploraApp.jsx` → objeto `S` (styles) |
| Número de sesiones | `lib/systemPrompt.js` + `SESSIONS_CONFIG` |
| Modelo de IA | `app/api/chat/route.js` → `model:` |

---

## Roadmap / Próximas mejoras sugeridas

- [ ] Base de datos real (Supabase/PostgreSQL) para guardar perfiles de todos los estudiantes
- [ ] Dashboard para orientadores que muestre el estado de cada estudiante
- [ ] Exportar el perfil vocacional en PDF al final del proceso
- [ ] Integración con el test CIPUS vía API
- [ ] Modo de voz (STT + TTS) para conversación hablada en español
- [ ] Login con correo @unisabana.edu.co

---

## Equipo

Desarrollado para la **Dirección de Bienestar y Experiencia del Estudiante**  
Universidad de La Sabana — Chía, Colombia

Contacto orientaciones: liliamcb@unisabana.edu.co | ana.garcia@unisabana.edu.co
