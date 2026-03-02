-- ============================================================
-- EXPLORA TU CARRERA — Universidad de La Sabana
-- Ejecuta este SQL en: Supabase → SQL Editor → New query
-- ============================================================

-- 1. ESTUDIANTES (login y datos básicos)
create table if not exists students (
  id          text primary key,           -- ID institucional: 0000123456
  nickname    text not null,              -- Nombre preferido
  password_hash text not null,            -- SHA-256 con salt
  salt        text not null,              -- Salt único por usuario
  created_at  timestamptz default now()
);

-- 2. MENSAJES (historial completo de cada conversación)
create table if not exists messages (
  id            uuid default gen_random_uuid() primary key,
  student_id    text references students(id) on delete cascade,
  role          text not null check (role in ('user', 'assistant')),
  content       text not null,
  session_number integer default 1,
  created_at    timestamptz default now()
);

-- 3. PERFIL VOCACIONAL (se actualiza automáticamente cada 6 mensajes)
create table if not exists profiles (
  student_id  text primary key references students(id) on delete cascade,
  data        jsonb default '{}',
  updated_at  timestamptz default now()
);

-- 4. PROGRESO (qué sesión va y cuáles ha completado)
create table if not exists progress (
  student_id          text primary key references students(id) on delete cascade,
  current_session     integer default 1,
  completed_sessions  integer[] default '{}',
  updated_at          timestamptz default now()
);

-- 5. DATOS DE CARRERAS (subidos por los orientadores)
create table if not exists career_data (
  id      integer primary key default 1,  -- Solo hay 1 fila
  content text default '',
  updated_at timestamptz default now()
);
insert into career_data (id, content) values (1, '') on conflict (id) do nothing;

-- ÍNDICES para búsquedas rápidas
create index if not exists messages_student_id_idx on messages(student_id);
create index if not exists messages_created_at_idx on messages(created_at);

-- ROW LEVEL SECURITY (recomendado — datos privados por estudiante)
alter table students  enable row level security;
alter table messages  enable row level security;
alter table profiles  enable row level security;
alter table progress  enable row level security;
alter table career_data enable row level security;

-- Las rutas API usan la service_role key (acceso total desde el servidor)
-- El navegador del estudiante NUNCA accede directamente a Supabase
