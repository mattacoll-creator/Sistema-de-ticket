import { createClient, SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_KEYS = {
  URL: "ticket_system_supabase_url",
  ANON_KEY: "ticket_system_supabase_anon_key",
};

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Lazy loaded client
let supabaseClientInstance: SupabaseClient | null = null;

function isValidSupabaseUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  if (trimmed.includes('your-project') || trimmed.includes('example.com') || trimmed.includes('your-app')) return false;
  return true;
}

function isValidSupabaseKey(key: string | null | undefined): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (trimmed.length < 20) return false;
  if (trimmed.includes('your-anon-key') || trimmed.includes('YOUR_SUPABASE_ANON_KEY') || trimmed.includes('your-key')) return false;
  return true;
}

// Retrieves the configuration from either import.meta.env or localStorage
export function getSupabaseConfig(): SupabaseConfig | null {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  if (isValidSupabaseUrl(envUrl) && isValidSupabaseKey(envKey)) {
    return { url: envUrl.trim(), anonKey: envKey.trim() };
  }

  const storedUrl = localStorage.getItem(DEFAULT_KEYS.URL);
  const storedKey = localStorage.getItem(DEFAULT_KEYS.ANON_KEY);

  if (isValidSupabaseUrl(storedUrl) && isValidSupabaseKey(storedKey)) {
    return { url: storedUrl.trim(), anonKey: storedKey.trim() };
  }

  return null;
}

// Dynamically initialized so it never throws on load if environment keys are missing
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClientInstance) return supabaseClientInstance;

  const config = getSupabaseConfig();
  if (!config) return null;

  try {
    supabaseClientInstance = createClient(config.url, config.anonKey);
    return supabaseClientInstance;
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
    return null;
  }
}

// Reset the instance (e.g., if changing matching credentials)
export function resetSupabaseClient() {
  supabaseClientInstance = null;
}

/**
 * SQL Schema script to easily define tables in Supabase Dashboard SQL Editor:
 */
export const SUPABASE_SQL_SETUP_SCRIPT = `-- ====================================================================
-- SCRIPT DE CONFIGURACIÓN COMPLETO DE SUPABASE PARA EL TRIBUNAL ELECTORAL
-- ====================================================================
-- Copia y ejecuta este script en el 'SQL Editor' de tu proyecto en Supabase (https://supabase.com).
-- Creará todas las tablas necesarias para el Sistema de Citas y el Kiosco de Turnos.

-- 1. Estado de Colas y Cubículos por Oficina (Ecosistema de Turnos)
CREATE TABLE IF NOT EXISTS office_state (
  office_id TEXT PRIMARY KEY,
  tickets JSONB NOT NULL DEFAULT '[]'::jsonb,
  cubicles JSONB NOT NULL DEFAULT '[]'::jsonb,
  auto_assign BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Citas Agendadas y Reservas (Tabla 'otro' / 'citas')
CREATE TABLE IF NOT EXISTS otro (
  identificacion TEXT PRIMARY KEY,
  codigo_transaccion TEXT,
  categoria_nombre TEXT,
  sub_servicio_id TEXT,
  sub_servicio_nombre TEXT,
  fecha TEXT,
  tiempo TEXT,
  hora TEXT,
  sucursal_id TEXT,
  sucursal_nombre TEXT,
  sucursal_direccion TEXT,
  ciudadano_identificacion TEXT,
  correo TEXT,
  telefono TEXT,
  requisitos JSONB DEFAULT '[]'::jsonb,
  estado TEXT DEFAULT 'confirmada',
  fecha_creacion TEXT,
  numero_seguimiento TEXT,
  datos_personales JSONB DEFAULT '{}'::jsonb,
  nombre_completo TEXT,
  fecha_nacimiento TEXT DEFAULT '2000-01-01'
);

-- 3. Gestión de Usuarios y Roles
CREATE TABLE IF NOT EXISTS usuarios (
  identificacion TEXT PRIMARY KEY,
  nombre_usuario TEXT UNIQUE NOT NULL,
  hash_contrasena TEXT NOT NULL,
  nombre TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sencillo',
  fecha_creacion TEXT
);

-- 4. Sucursales / Direcciones Regionales
CREATE TABLE IF NOT EXISTS sucursales (
  identificacion TEXT PRIMARY KEY,
  provincia TEXT NOT NULL,
  nombre TEXT NOT NULL,
  direccion TEXT NOT NULL,
  telefono TEXT,
  tiempo TEXT
);

-- 5. Servicios y Subservicios
CREATE TABLE IF NOT EXISTS servicios_subservicios (
  identificacion TEXT PRIMARY KEY,
  categoria_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  requisitos JSONB DEFAULT '[]'::jsonb,
  costo TEXT DEFAULT 'Gratuito',
  duracion TEXT DEFAULT '15 mins',
  modalidad TEXT DEFAULT 'Presencial'
);

-- 6. Registros y Elegibilidad de Extranjería
CREATE TABLE IF NOT EXISTS extranjeria_records (
  pasaporte TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  nacionalidad TEXT,
  elegible BOOLEAN DEFAULT true,
  razon TEXT
);

-- 7. Configuración General y CMS
CREATE TABLE IF NOT EXISTS cms_config (
  id TEXT PRIMARY KEY,
  config_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- POLÍTICAS DE ACCESO (RLS - ROW LEVEL SECURITY)
-- ====================================================================
ALTER TABLE office_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE otro ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios_subservicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE extranjeria_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_config ENABLE ROW LEVEL SECURITY;

-- Crear políticas permisivas para lectura/escritura pública
DROP POLICY IF EXISTS "public_office_state" ON office_state;
CREATE POLICY "public_office_state" ON office_state FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_otro" ON otro;
CREATE POLICY "public_otro" ON otro FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_usuarios" ON usuarios;
CREATE POLICY "public_usuarios" ON usuarios FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_sucursales" ON sucursales;
CREATE POLICY "public_sucursales" ON sucursales FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_servicios" ON servicios_subservicios;
CREATE POLICY "public_servicios" ON servicios_subservicios FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_extranjeria" ON extranjeria_records;
CREATE POLICY "public_extranjeria" ON extranjeria_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_cms_config" ON cms_config;
CREATE POLICY "public_cms_config" ON cms_config FOR ALL USING (true) WITH CHECK (true);
`;
