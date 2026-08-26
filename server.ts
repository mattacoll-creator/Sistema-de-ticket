import "dotenv/config";
import express from "express";
import helmet from "helmet";
import path from "path";
import { createServer as createViteServer } from "vite";
import dns from "dns";
import fs from "fs";
import http from "http";
import https from "https";
import nodemailer from "nodemailer";
import pg from "pg";

const { Pool } = pg;

// ==========================================
// AZURE POSTGRESQL FLEXIBLE SERVER CONFIGS & INITIALIZER
// ==========================================
const pgConnectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
const isPgConfigured = !!(pgConnectionString || process.env.PGHOST);

let pgPool: pg.Pool | null = null;
if (isPgConfigured) {
  const pgConfig: pg.PoolConfig = pgConnectionString
    ? { connectionString: pgConnectionString }
    : {
        host: process.env.PGHOST,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE || "postgres",
        port: parseInt(process.env.PGPORT || "5432", 10),
      };

  // Azure PostgreSQL Flexible Server requires SSL by default
  pgConfig.ssl = process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false };

  pgPool = new Pool(pgConfig);
  console.log(`[Azure PostgreSQL Flexible Server] Configured & Initialized`);
}

async function initPostgresSchema() {
  if (!pgPool) return;
  try {
    const client = await pgPool.connect();
    try {
      // 1. USUARIOS Y AUTENTICACIÓN
      await client.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
          username VARCHAR(100) PRIMARY KEY,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(100) NOT NULL,
          nombre VARCHAR(255) NOT NULL,
          sucursal_id VARCHAR(100),
          must_change_password BOOLEAN DEFAULT FALSE,
          activo BOOLEAN DEFAULT TRUE,
          fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // 2. CITAS WEB (AGENDAMIENTO CIUDADANO)
      await client.query(`
        CREATE TABLE IF NOT EXISTS appointments (
          id VARCHAR(100) PRIMARY KEY,
          codigo_transaccion VARCHAR(100),
          tipo VARCHAR(100),
          tramite VARCHAR(255),
          sub_tramite VARCHAR(255),
          identificacion VARCHAR(100) NOT NULL,
          nombre VARCHAR(255) NOT NULL,
          correo VARCHAR(255),
          telefono VARCHAR(100),
          provincia VARCHAR(100),
          distrito VARCHAR(100),
          sucursal_id VARCHAR(100) NOT NULL,
          sucursal_nombre VARCHAR(255),
          fecha VARCHAR(50) NOT NULL,
          hora VARCHAR(50) NOT NULL,
          estado VARCHAR(50) DEFAULT 'confirmada',
          data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_appts_fecha_hora ON appointments (fecha, hora);
        CREATE INDEX IF NOT EXISTS idx_appts_identificacion ON appointments (identificacion);
        CREATE INDEX IF NOT EXISTS idx_appts_sucursal ON appointments (sucursal_id);
        CREATE INDEX IF NOT EXISTS idx_appts_estado ON appointments (estado);
      `);

      // 3. TICKETS DE TURNO (KIOSKO Y SALA DE ESPERA - ACTIVOS)
      await client.query(`
        CREATE TABLE IF NOT EXISTS tickets (
          id VARCHAR(100) PRIMARY KEY,
          numero_ticket VARCHAR(50) NOT NULL,
          tipo_tramite VARCHAR(100) NOT NULL,
          sub_tramite VARCHAR(255),
          identificacion VARCHAR(100),
          nombre VARCHAR(255),
          correo VARCHAR(255),
          telefono VARCHAR(50),
          es_prioritario BOOLEAN DEFAULT FALSE,
          es_cita BOOLEAN DEFAULT FALSE,
          cita_id VARCHAR(100),
          sucursal_id VARCHAR(100) NOT NULL,
          estado VARCHAR(50) DEFAULT 'espera',
          fase_actual VARCHAR(50) DEFAULT 'caja',
          modulo_asignado VARCHAR(50),
          modulo_asignado_nombre VARCHAR(150),
          agente_asignado VARCHAR(100),
          agente_asignado_nombre VARCHAR(255),
          hora_emision TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          hora_llamado TIMESTAMP WITH TIME ZONE,
          hora_inicio_atencion TIMESTAMP WITH TIME ZONE,
          hora_fin_atencion TIMESTAMP WITH TIME ZONE,
          tiempo_espera_segundos INTEGER DEFAULT 0,
          tiempo_atencion_segundos INTEGER DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_tickets_estado ON tickets (estado);
        CREATE INDEX IF NOT EXISTS idx_tickets_sucursal_fecha ON tickets (sucursal_id, hora_emision);
        CREATE INDEX IF NOT EXISTS idx_tickets_numero ON tickets (numero_ticket);

        -- Migraciones automáticas de columnas para tablas existentes en PostgreSQL
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sub_tramite VARCHAR(255);
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS identificacion VARCHAR(100);
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS nombre VARCHAR(255);
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS correo VARCHAR(255);
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS es_prioritario BOOLEAN DEFAULT FALSE;
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS es_cita BOOLEAN DEFAULT FALSE;
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS cita_id VARCHAR(100);
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sucursal_id VARCHAR(100) DEFAULT 'OFF-1';
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'espera';
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS fase_actual VARCHAR(50) DEFAULT 'caja';
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS modulo_asignado VARCHAR(50);
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS modulo_asignado_nombre VARCHAR(150);
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS agente_asignado VARCHAR(100);
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS agente_asignado_nombre VARCHAR(255);
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS hora_emision TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS hora_llamado TIMESTAMP WITH TIME ZONE;
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS hora_inicio_atencion TIMESTAMP WITH TIME ZONE;
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS hora_fin_atencion TIMESTAMP WITH TIME ZONE;
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS tiempo_espera_segundos INTEGER DEFAULT 0;
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS tiempo_atencion_segundos INTEGER DEFAULT 0;
      `);

      // 4. HISTÓRICO DE TICKETS (TURNOS COMPLETADOS Y REPORTES)
      await client.query(`
        CREATE TABLE IF NOT EXISTS tickets_historico (
          id VARCHAR(120) PRIMARY KEY,
          number_code VARCHAR(50) NOT NULL,
          office_id VARCHAR(50) NOT NULL DEFAULT 'OFF-1',
          service_type VARCHAR(50) NOT NULL,
          status VARCHAR(30) NOT NULL,
          current_phase VARCHAR(50),
          priority BOOLEAN DEFAULT FALSE,
          is_appointment BOOLEAN DEFAULT FALSE,
          appointment_id VARCHAR(120),
          name VARCHAR(255) NOT NULL,
          id_number VARCHAR(100),
          email VARCHAR(255),
          phone VARCHAR(50),
          procedure VARCHAR(50),
          photo_preference VARCHAR(100),
          assigned_cubicle_id VARCHAR(100),
          assigned_cubicle_name VARCHAR(150),
          agent_id VARCHAR(100),
          agent_name VARCHAR(255),
          wait_time_seconds INTEGER DEFAULT 0,
          service_time_seconds INTEGER DEFAULT 0,
          rating INTEGER,
          feedback TEXT,
          created_at BIGINT NOT NULL,
          called_at BIGINT,
          attended_at BIGINT,
          completed_at BIGINT,
          fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_tickets_hist_office_id ON tickets_historico(office_id);
        CREATE INDEX IF NOT EXISTS idx_tickets_hist_created_at ON tickets_historico(created_at);
        CREATE INDEX IF NOT EXISTS idx_tickets_hist_service_type ON tickets_historico(service_type);
        CREATE INDEX IF NOT EXISTS idx_tickets_hist_status ON tickets_historico(status);
        CREATE INDEX IF NOT EXISTS idx_tickets_hist_id_number ON tickets_historico(id_number);

        -- Migraciones automáticas para tickets_historico
        ALTER TABLE tickets_historico ADD COLUMN IF NOT EXISTS office_id VARCHAR(50) DEFAULT 'OFF-1';
        ALTER TABLE tickets_historico ADD COLUMN IF NOT EXISTS is_appointment BOOLEAN DEFAULT FALSE;
        ALTER TABLE tickets_historico ADD COLUMN IF NOT EXISTS appointment_id VARCHAR(120);
        ALTER TABLE tickets_historico ADD COLUMN IF NOT EXISTS attended_at BIGINT;
        ALTER TABLE tickets_historico ADD COLUMN IF NOT EXISTS current_phase VARCHAR(50);
        ALTER TABLE tickets_historico ADD COLUMN IF NOT EXISTS assigned_cubicle_name VARCHAR(150);
        ALTER TABLE tickets_historico ADD COLUMN IF NOT EXISTS agent_name VARCHAR(255);
      `);

      // 4. MÓDULOS / VENTANILLAS DE ATENCIÓN (ESTADO EN VIVO)
      await client.query(`
        CREATE TABLE IF NOT EXISTS modulos_atencion (
          id VARCHAR(100) PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          sucursal_id VARCHAR(100) NOT NULL,
          tipo_servicio VARCHAR(100) NOT NULL,
          agente_actual VARCHAR(100),
          ticket_actual_id VARCHAR(100),
          estado VARCHAR(50) DEFAULT 'disponible',
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // 5. SESIONES DE SEGUIMIENTO MÓVIL (QR & TRACKER)
      await client.query(`
        CREATE TABLE IF NOT EXISTS tracking_sesiones_moviles (
          id VARCHAR(100) PRIMARY KEY,
          token_acceso VARCHAR(255) UNIQUE NOT NULL,
          ticket_id VARCHAR(100),
          cita_id VARCHAR(100),
          dispositivo_info VARCHAR(255),
          ip_origen VARCHAR(100),
          ultimo_acceso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          notificaciones_activas BOOLEAN DEFAULT TRUE,
          sonido_alerta_activo BOOLEAN DEFAULT TRUE,
          vibracion_activa BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_tracking_token ON tracking_sesiones_moviles (token_acceso);
        CREATE INDEX IF NOT EXISTS idx_tracking_ticket ON tracking_sesiones_moviles (ticket_id);
      `);

      // 6. NOTIFICACIONES Y ALERTAS MÓVILES
      await client.query(`
        CREATE TABLE IF NOT EXISTS notificaciones_moviles (
          id SERIAL PRIMARY KEY,
          ticket_id VARCHAR(100),
          telefono_destino VARCHAR(50),
          canal_notificacion VARCHAR(50) DEFAULT 'web_push',
          tipo_evento VARCHAR(50) NOT NULL,
          titulo VARCHAR(150) NOT NULL,
          mensaje TEXT NOT NULL,
          estado_envio VARCHAR(50) DEFAULT 'enviado',
          leido_en_movil BOOLEAN DEFAULT FALSE,
          fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_notif_ticket ON notificaciones_moviles (ticket_id);
        CREATE INDEX IF NOT EXISTS idx_notif_fecha ON notificaciones_moviles (fecha_envio);
      `);

      // 7. SUSCRIPCIONES PUSH WEB (Web Push API)
      await client.query(`
        CREATE TABLE IF NOT EXISTS push_subscriptions_movil (
          id SERIAL PRIMARY KEY,
          token_acceso VARCHAR(255) NOT NULL,
          endpoint TEXT NOT NULL,
          p256dh_key TEXT NOT NULL,
          auth_key TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // 8. EXPEDIENTES DE EXTRANJERÍA
      await client.query(`
        CREATE TABLE IF NOT EXISTS extranjeria_records (
          id VARCHAR(100) PRIMARY KEY,
          pasaporte VARCHAR(100) NOT NULL,
          nombre VARCHAR(255) NOT NULL,
          nacionalidad VARCHAR(100),
          estatus_migratorio VARCHAR(100),
          data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_extranjeria_pasaporte ON extranjeria_records (pasaporte);
      `);

      // 9. EXPEDIENTES DE INSCRIPCIÓN TARDÍA (PASADOS DE EDAD)
      await client.query(`
        CREATE TABLE IF NOT EXISTS tardia_records (
          id VARCHAR(100) PRIMARY KEY,
          numero_seguimiento VARCHAR(100) NOT NULL,
          identificacion VARCHAR(100) NOT NULL,
          nombre_completo VARCHAR(255) NOT NULL,
          sucursal_id VARCHAR(100),
          fecha_cita VARCHAR(50),
          hora_cita VARCHAR(50),
          estado_tramite VARCHAR(100) DEFAULT 'en_revision',
          documentos_presentados JSONB,
          notas TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_tardia_seguimiento ON tardia_records (numero_seguimiento);
        CREATE INDEX IF NOT EXISTS idx_tardia_identificacion ON tardia_records (identificacion);
      `);

      // 10. CONFIGURACIONES DEL SISTEMA (CMS, CUPOS Y HORARIOS)
      await client.query(`
        CREATE TABLE IF NOT EXISTS app_configs (
          id VARCHAR(100) PRIMARY KEY,
          config JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // 11. AUDITORÍA Y TRAZABILIDAD (LOGS)
      await client.query(`
        CREATE TABLE IF NOT EXISTS logs_auditoria (
          id SERIAL PRIMARY KEY,
          usuario VARCHAR(100),
          accion VARCHAR(255) NOT NULL,
          detalles JSONB,
          ip_origen VARCHAR(100),
          fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_logs_fecha ON logs_auditoria (fecha);
        CREATE INDEX IF NOT EXISTS idx_logs_usuario ON logs_auditoria (usuario);
      `);

      console.log("[Azure PostgreSQL Flexible Server] Las 11 tablas e infraestructura verificadas correctamente.");
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("[Azure PostgreSQL Flexible Server] Error al inicializar las 11 tablas:", err.message);
  }
}

if (isPgConfigured && pgPool) {
  initPostgresSchema().catch(console.error);
}

// Fix Node warning about localhost dns resolution in some runtimes
dns.setDefaultResultOrder("ipv4first");

const DB_PATH = path.join(process.cwd(), "appointments-db.json");
const EXTRANJERIA_DB_PATH = path.join(process.cwd(), "extranjeria-db.json");
const EXTRANJERIA_CONFIG_PATH = path.join(process.cwd(), "extranjeria-config.json");
const TARDIA_CONFIG_PATH = path.join(process.cwd(), "tardia-config.json");
const USERS_DB_PATH = path.join(process.cwd(), "users-db.json");
const CMS_CONFIG_PATH = path.join(process.cwd(), "cms-config.json");

// ==========================================
// OUTLOOK EMAIL CONFIGURATIONS & TRANSPORTER
// ==========================================
const outlookUser = process.env.OUTLOOK_USER || "";
const outlookPass = process.env.OUTLOOK_PASS || "";
const isOutlookConfigured = !!(outlookUser && outlookPass);

console.log(`[Outlook Email Status] Configured: ${isOutlookConfigured}`);
if (isOutlookConfigured) {
  console.log(`[Outlook Email Account]: ${outlookUser}`);
}

async function sendOutlookEmail(to: string, subject: string, html: string) {
  if (!isOutlookConfigured) {
    throw new Error("Outlook no está configurado (falta OUTLOOK_USER o OUTLOOK_PASS)");
  }

  const host = process.env.OUTLOOK_HOST || process.env.SMTP_HOST || "mail.smtp2go.com";
  const port = parseInt(process.env.OUTLOOK_PORT || process.env.SMTP_PORT || "587");
  const isSecure = port === 465 || port === 8465;
  const user = process.env.OUTLOOK_USER || process.env.SMTP_USER || "";
  const pass = process.env.OUTLOOK_PASS || process.env.SMTP_PASS || "";
  const fromEmail = process.env.SMTP_FROM || process.env.OUTLOOK_FROM || user;

  const transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: isSecure, // true for 465 / 8465 (SSL), false for 2525, 587, 8025, 25 (STARTTLS)
    auth: {
      user: user,
      pass: pass
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: `"Tribunal Electoral de Panamá" <${fromEmail}>`,
    to: to,
    subject: subject,
    html: html
  };

  return await transporter.sendMail(mailOptions);
}

// ==========================================
// ==========================================
// DETERMINISTIC TABLE NAMES (11 TABLAS)
// ==========================================
async function getUsersTableName(): Promise<string> { return "usuarios"; }
async function getAppointmentsTableName(): Promise<string> { return "appointments"; }
async function getTicketsTableName(): Promise<string> { return "tickets"; }
async function getModulosTableName(): Promise<string> { return "modulos_atencion"; }
async function getTrackingSessionsTableName(): Promise<string> { return "tracking_sesiones_moviles"; }
async function getMobileNotificationsTableName(): Promise<string> { return "notificaciones_moviles"; }
async function getPushSubscriptionsTableName(): Promise<string> { return "push_subscriptions_movil"; }
async function getExtranjeriaTableName(): Promise<string> { return "extranjeria_records"; }
async function getTardiaTableName(): Promise<string> { return "tardia_records"; }
async function getAppConfigsTableName(): Promise<string> { return "app_configs"; }
async function getAuditLogsTableName(): Promise<string> { return "logs_auditoria"; }

interface ServerUser {
  username: string;
  password?: string;
  role: 'sencillo' | 'super' | 'extranjeria' | 'pasado_edad' | 'extranjeria_supervisor' | 'extranjeria_atencion' | 'extranjeria_cubiculo' | 'pasado_edad_supervisor' | 'pasado_edad_admin';
  nombre: string;
  fechaCreacion: string;
  mustChangePassword?: boolean;
}

const DEFAULT_USERS: ServerUser[] = [
  {
    username: "login",
    password: "login",
    role: "super",
    nombre: "Usuario Inicial (Cambio Requerido)",
    fechaCreacion: "2026-08-07T08:00:00Z",
    mustChangePassword: true
  },
  {
    username: "oscargave3003",
    password: "Value1234",
    role: "super",
    nombre: "Oscar Super Admin",
    fechaCreacion: "2026-06-05T18:11:00Z"
  },
  {
    username: "oscargave3003@gmail.com",
    password: "Value1234",
    role: "super",
    nombre: "Oscar Super Admin (Email)",
    fechaCreacion: "2026-06-05T18:11:00Z"
  },
  {
    username: "adminmini",
    password: "admin1234",
    role: "sencillo",
    nombre: "Administrador Sencillo",
    fechaCreacion: "2026-05-26T15:18:27Z"
  },
  {
    username: "adminte",
    password: "Value1234",
    role: "super",
    nombre: "Super Administrador TE",
    fechaCreacion: "2026-05-26T15:18:27Z"
  },
  {
    username: "migra26",
    password: "12345678",
    role: "extranjeria",
    nombre: "Gestor de Extranjería",
    fechaCreacion: "2026-05-26T15:18:27Z"
  },
  {
    "username": "adminpedad",
    "password": "PasaDodeEdad2026",
    "role": "pasado_edad",
    "nombre": "Gestor Pasado de Edad",
    "fechaCreacion": "2026-05-26T15:18:27Z"
  },
  {
    "username": "superit",
    "password": "1234",
    "role": "pasado_edad",
    "nombre": "SuperIT - Supervisor Inscripción Tardía",
    "fechaCreacion": "2026-05-27T19:27:00Z"
  },
  {
    "username": "supermigra",
    "password": "1234",
    "role": "extranjeria_supervisor",
    "nombre": "Supervisor de Extranjería",
    "fechaCreacion": "2026-05-28T18:13:00Z"
  },
  {
    "username": "atencionmigra",
    "password": "1234",
    "role": "extranjeria_atencion",
    "nombre": "Atendimiento Entrada Extranjería",
    "fechaCreacion": "2026-05-28T18:13:00Z"
  },
  {
    "username": "cubiculomigra",
    "password": "1234",
    "role": "extranjeria_cubiculo",
    "nombre": "Cubículo Ticket Extranjería",
    "fechaCreacion": "2026-05-28T18:13:00Z"
  }
];

function getUsers(): ServerUser[] {
  try {
    if (!fs.existsSync(USERS_DB_PATH)) {
      fs.writeFileSync(USERS_DB_PATH, JSON.stringify(DEFAULT_USERS, null, 2), "utf8");
      return DEFAULT_USERS;
    }
    const data = fs.readFileSync(USERS_DB_PATH, "utf8");
    const currentUsers = JSON.parse(data);
    let mutated = false;
    DEFAULT_USERS.forEach((defUser) => {
      const exists = currentUsers.some((u: any) => u.username.toLowerCase() === defUser.username.toLowerCase());
      if (!exists) {
        currentUsers.push(defUser);
        mutated = true;
      }
    });
    if (mutated) {
      fs.writeFileSync(USERS_DB_PATH, JSON.stringify(currentUsers, null, 2), "utf8");
    }
    return currentUsers;
  } catch (error) {
    console.error("Error reading users DB:", error);
  }
  return DEFAULT_USERS;
}

function saveUsers(users: ServerUser[]): void {
  try {
    fs.writeFileSync(USERS_DB_PATH, JSON.stringify(users, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing users DB:", error);
  }
}

let cachedCmsConfig: CmsConfig | null = null;
let cachedExtranjeriaConfig: ExtranjeriaConfig | null = null;
let cachedTardiaConfig: TardiaConfig | null = null;

interface ExtranjeriaConfig {
  capacidad: number;
  intervalo: number;
  horaInicio: string;
  horaFin: string;
}

const DEFAULT_EXTRANJERIA_CONFIG: ExtranjeriaConfig = {
  capacidad: 2,
  intervalo: 15,
  horaInicio: "07:00 AM",
  horaFin: "01:45 PM"
};

function getExtranjeriaConfig(): ExtranjeriaConfig {
  if (cachedExtranjeriaConfig) return cachedExtranjeriaConfig;
  try {
    if (!fs.existsSync(EXTRANJERIA_CONFIG_PATH)) {
      fs.writeFileSync(EXTRANJERIA_CONFIG_PATH, JSON.stringify(DEFAULT_EXTRANJERIA_CONFIG, null, 2), "utf8");
      cachedExtranjeriaConfig = DEFAULT_EXTRANJERIA_CONFIG;
      return DEFAULT_EXTRANJERIA_CONFIG;
    }
    const data = fs.readFileSync(EXTRANJERIA_CONFIG_PATH, "utf8");
    const parsed = JSON.parse(data);
    if (parsed.horaFin === "02:00 AM" || parsed.horaFin === "02:00 PM" || !parsed.horaFin) {
      parsed.horaFin = "01:45 PM";
      parsed.capacidad = 2;
      fs.writeFileSync(EXTRANJERIA_CONFIG_PATH, JSON.stringify(parsed, null, 2), "utf8");
    }
    cachedExtranjeriaConfig = parsed;
    return parsed;
  } catch (error) {
    console.error("Error reading extranjeria config DB:", error);
  }
  return DEFAULT_EXTRANJERIA_CONFIG;
}

function saveExtranjeriaConfig(config: ExtranjeriaConfig): void {
  cachedExtranjeriaConfig = config;
  try {
    fs.writeFileSync(EXTRANJERIA_CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing extranjeria config DB:", error);
  }

  if (isPgConfigured && pgPool) {
    pgPool.query(
      `INSERT INTO app_configs (id, config, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      ["extranjeria_settings", JSON.stringify(config)]
    ).catch(err => console.error("Error saving Extranjería config to Azure PostgreSQL:", err.message));
  }
}

interface TardiaConfig {
  capacidadTotalDia: number;
  intervalo: number;
  horaInicio: string;
  horaFin: string;
}

const DEFAULT_TARDIA_CONFIG: TardiaConfig = {
  capacidadTotalDia: 4,
  intervalo: 50,
  horaInicio: "08:00 AM",
  horaFin: "11:30 AM"
};

function getTardiaConfig(): TardiaConfig {
  if (cachedTardiaConfig) return cachedTardiaConfig;
  try {
    if (!fs.existsSync(TARDIA_CONFIG_PATH)) {
      fs.writeFileSync(TARDIA_CONFIG_PATH, JSON.stringify(DEFAULT_TARDIA_CONFIG, null, 2), "utf8");
      cachedTardiaConfig = DEFAULT_TARDIA_CONFIG;
      return DEFAULT_TARDIA_CONFIG;
    }
    const data = fs.readFileSync(TARDIA_CONFIG_PATH, "utf8");
    cachedTardiaConfig = JSON.parse(data);
    return cachedTardiaConfig!;
  } catch (error) {
    console.error("Error reading tardia config DB:", error);
  }
  return DEFAULT_TARDIA_CONFIG;
}

function saveTardiaConfig(config: TardiaConfig): void {
  cachedTardiaConfig = config;
  try {
    fs.writeFileSync(TARDIA_CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing tardia config DB:", error);
  }

  if (isPgConfigured && pgPool) {
    pgPool.query(
      `INSERT INTO app_configs (id, config, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      ["tardia_settings", JSON.stringify(config)]
    ).catch(err => console.error("Error saving Tardía config to Azure PostgreSQL:", err.message));
  }
}

interface CmsConfig {
  siteTitle: string;
  siteSubtitle: string;
  logoUrl: string;
  primaryColor: string;
  customTexts: { [key: string]: string };
  sections: Array<{ id: string; name: string; description: string; icon?: string }>;
  pages: Array<{ id: string; title: string; slug: string; content: string; path?: string }>;
  images: Array<{ id: string; name: string; url: string; category?: string }>;
}

const DEFAULT_CMS_CONFIG: CmsConfig = {
  siteTitle: "Portal de Trámites",
  siteSubtitle: "Tribunal Electoral de Panamá",
  logoUrl: "/images/logo-te-aniversario-1.png",
  primaryColor: "#0f172a",
  customTexts: {
    welcomeTitle: "Bienvenido al Portal de Trámites y Citas",
    welcomeSubtitle: "Agende y verifique sus citas oficiales de manera ágil y digital.",
    footerText: "© 2026 Tribunal Electoral de Panamá. Todos los derechos reservados.",
    helpContact: "Línea gratuita de atención: 311 o +507 507-8000",
    visitanosBadge: "Visítanos",
    visitanosTitle: "Visitas Guiadas al Tribunal Electoral",
    visitanosDescription: "Regístrese para conocer la historia, funciones y espacios institucionales de la Sede Principal.",
    renovacionMesesAnticipacion: "6",
    msgNoCumpleRenovacion: "No cumple. El trámite de renovación de cédula solo puede realizarse con un máximo de {meses} meses de anticipación a su vencimiento (o si está vencida)."
  },
  sections: [
    { id: "registro_civil", name: "Registro Civil", description: "Certificados de nacimiento, matrimonio, defunción y otros trámites del estado civil de las personas." },
    { id: "cedulacion", name: "Cedulación", description: "Trámites relacionados con la obtención, renovación, y duplicados de cédulas de identidad personal." },
    { id: "organizacion_electoral", name: "Organización Electoral", description: "Cambios de residencia electoral, inscripciones a partidos políticos, y más." },
    { id: "extranjeria", name: "Trámites de Extranjería", description: "Procesamiento de cédulas de identidad para ciudadanos extranjeros (PE) y certificaciones." },
    { id: "panamenos_extranjero", name: "Panameños en el Extranjero", description: "Inscripción de hechos vitales y trámites consulares de identidad para ciudadanos residentes en el exterior." }
  ],
  pages: [
    { id: "home", title: "Inicio", slug: "inicio", content: "Página principal del Portal del Tribunal Electoral para el agendamiento de citas en línea." },
    { id: "requisitos", title: "Requisitos Generales", slug: "requisitos", content: "Detalles completos de los requisitos necesarios para cada uno de los trámites que ofrece la institución." },
    { id: "contacto", title: "Contacto y Oficinas", slug: "contacto", content: "Consulte nuestras sucursales y números de contacto en todas las provincias de la República." }
  ],
  images: [
    { id: "logo", name: "Logo Principal", url: "/images/logo-te-aniversario-1.png" }
  ]
};

async function getCmsConfig(): Promise<CmsConfig> {
  if (cachedCmsConfig) return cachedCmsConfig;

  if (isPgConfigured && pgPool) {
    try {
      const res = await pgPool.query(`SELECT config FROM app_configs WHERE id = 'site_settings' LIMIT 1`);
      if (res.rows && res.rows[0]?.config) {
        const configObj = typeof res.rows[0].config === 'string' ? JSON.parse(res.rows[0].config) : res.rows[0].config;
        if (configObj && configObj.siteTitle) {
          cachedCmsConfig = configObj;
          return configObj;
        }
      }
    } catch (e) {
      console.warn("Error loading CMS settings from Azure PostgreSQL, falling back to local file:", e);
    }
  }

  try {
    if (!fs.existsSync(CMS_CONFIG_PATH)) {
      fs.writeFileSync(CMS_CONFIG_PATH, JSON.stringify(DEFAULT_CMS_CONFIG, null, 2), "utf8");
      cachedCmsConfig = DEFAULT_CMS_CONFIG;
      return DEFAULT_CMS_CONFIG;
    }
    const data = fs.readFileSync(CMS_CONFIG_PATH, "utf8");
    const parsed = JSON.parse(data);
    cachedCmsConfig = {
      siteTitle: parsed.siteTitle || DEFAULT_CMS_CONFIG.siteTitle,
      siteSubtitle: parsed.siteSubtitle || DEFAULT_CMS_CONFIG.siteSubtitle,
      logoUrl: parsed.logoUrl || DEFAULT_CMS_CONFIG.logoUrl,
      primaryColor: parsed.primaryColor || DEFAULT_CMS_CONFIG.primaryColor,
      customTexts: parsed.customTexts || DEFAULT_CMS_CONFIG.customTexts,
      sections: Array.isArray(parsed.sections) ? parsed.sections : DEFAULT_CMS_CONFIG.sections,
      pages: Array.isArray(parsed.pages) ? parsed.pages : DEFAULT_CMS_CONFIG.pages,
      images: Array.isArray(parsed.images) ? parsed.images : DEFAULT_CMS_CONFIG.images
    };
    return cachedCmsConfig;
  } catch (error) {
    console.error("Error reading cms config file:", error);
  }
  return DEFAULT_CMS_CONFIG;
}

async function saveCmsConfig(config: CmsConfig): Promise<boolean> {
  cachedCmsConfig = config;
  try {
    fs.writeFileSync(CMS_CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing cms config file:", error);
  }

  if (isPgConfigured && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO app_configs (id, config, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
        ["site_settings", JSON.stringify(config)]
      );
    } catch (pgErr: any) {
      console.error("[Azure PostgreSQL] Error saving CMS config:", pgErr.message);
    }
  }
  return true;
}

interface ExtranjeriaRecord {
  pasaporte: string;
  nombre: string;
  nacionalidad?: string;
  elegible: boolean; // boolean or true/false
  motivo: string;    // description/reason
}

// Default records to seed on startup if database is empty or doesn't exist
const DEFAULT_EXTRANJERIA_RECORDS: ExtranjeriaRecord[] = [
  {
    pasaporte: "PA123456",
    nombre: "John Smith",
    nacionalidad: "Estados Unidos",
    elegible: true,
    motivo: "Resolución de Residencia Permanente Aprobada (Nro. Res: SNM-2026-904). Listo para agendar cédula."
  },
  {
    pasaporte: "PA987654",
    nombre: "Maria Gorka",
    nacionalidad: "España",
    elegible: false,
    motivo: "Estadía vencida con multa pendiente de pago. Debe presentarse a Ventanilla Única de SNM para regularizar."
  },
  {
    pasaporte: "PA555444",
    nombre: "Luigi Rossini",
    nacionalidad: "Italia",
    elegible: true,
    motivo: "Visa de Corta Duraciones por Acuerdo de Países Amigos Autorizada. Apto para trámite presencial."
  },
  {
    pasaporte: "PA000111",
    nombre: "Yuki Tanaka",
    nacionalidad: "Japón",
    elegible: false,
    motivo: "Expediente de filiación en estado 'Pendiente' por falta de documentos debidamente apostillados."
  }
];

function getExtranjeriaRecords(): ExtranjeriaRecord[] {
  try {
    if (!fs.existsSync(EXTRANJERIA_DB_PATH)) {
      fs.writeFileSync(EXTRANJERIA_DB_PATH, JSON.stringify(DEFAULT_EXTRANJERIA_RECORDS, null, 2), "utf8");
      return DEFAULT_EXTRANJERIA_RECORDS;
    }
    const data = fs.readFileSync(EXTRANJERIA_DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading extranjeria DB:", error);
  }
  return DEFAULT_EXTRANJERIA_RECORDS;
}

function saveExtranjeriaRecords(records: ExtranjeriaRecord[]): void {
  try {
    fs.writeFileSync(EXTRANJERIA_DB_PATH, JSON.stringify(records, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing extranjeria DB:", error);
  }
}

interface ServerCita {
  id: string;
  correo: string;
  codigoTransaccion: string;
  categoriaNombre: string;
  subServicioNombre: string;
  subServicioId?: string;
  fecha: string;
  hora: string;
  sucursalNombre: string;
  sucursalDireccion: string;
  identificacion: string;
  telefono: string;
  requisitos: string[];
  estado: 'confirmada' | 'cancelada' | 'asistire' | 'no_asistire' | 'realizada';
  fechaCreacion: string;
  numeroSeguimiento?: string;
  datosPersonales?: any;
  nombre?: string;
  creadoPor?: string;
}

function getAppointments(): ServerCita[] {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading appointments DB:", error);
  }
  return [];
}

function saveAppointments(appointments: ServerCita[]): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(appointments, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing appointments DB:", error);
  }
}

async function safeUpsertAppointment(row: any) {
  // Always update local database
  const appointments = getAppointments();
  const apptId = row.identificacion || row.id || row.codigo_transaccion;
  const existingIdx = appointments.findIndex(a => a.id === apptId || a.codigoTransaccion === apptId);
  const serverCita: ServerCita = {
    id: apptId,
    correo: row.correo || row.ciudadano_correo || "",
    codigoTransaccion: row.codigo_transaccion || apptId,
    categoriaNombre: row.categoria_nombre || "Trámites",
    subServicioNombre: row.sub_servicio_nombre || row.sub_tramite || "",
    subServicioId: row.sub_servicio_id,
    fecha: row.fecha || row.fecha_cita || "",
    hora: row.tiempo || row.hora || row.hora_cita || "",
    sucursalNombre: row.sucursal_nombre || "Sucursal",
    sucursalDireccion: row.sucursal_direccion || "",
    identificacion: row.ciudadano_identificacion || row.identificacion || "",
    telefono: row.telefono || row.ciudadano_telefono || "",
    requisitos: Array.isArray(row.requisitos) ? row.requisitos : [],
    estado: row.estado || row.estado_cita || 'confirmada',
    fechaCreacion: row.fecha_creacion || new Date().toISOString(),
    numeroSeguimiento: row.numero_seguimiento || undefined,
    datosPersonales: row.datos_personales || undefined,
    nombre: row.nombre_completo || row.ciudadano_nombre || row.nombre || ""
  };

  if (existingIdx >= 0) {
    appointments[existingIdx] = serverCita;
  } else {
    appointments.push(serverCita);
  }
  saveAppointments(appointments);

  if (isPgConfigured && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO appointments (id, tipo, tramite, sub_tramite, identificacion, nombre, correo, telefono, provincia, distrito, sucursal_id, sucursal_nombre, fecha, hora, estado, data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO UPDATE SET
           tipo = EXCLUDED.tipo, tramite = EXCLUDED.tramite, sub_tramite = EXCLUDED.sub_tramite,
           identificacion = EXCLUDED.identificacion, nombre = EXCLUDED.nombre, correo = EXCLUDED.correo,
           telefono = EXCLUDED.telefono, provincia = EXCLUDED.provincia, distrito = EXCLUDED.distrito,
           sucursal_id = EXCLUDED.sucursal_id, sucursal_nombre = EXCLUDED.sucursal_nombre,
           fecha = EXCLUDED.fecha, hora = EXCLUDED.hora, estado = EXCLUDED.estado, data = EXCLUDED.data`,
        [
          apptId,
          row.tipo_servicio || row.tipo || '',
          row.categoria_nombre || row.tramite || '',
          row.sub_servicio_nombre || row.sub_tramite || '',
          row.ciudadano_identificacion || row.identificacion || '',
          row.ciudadano_nombre || row.nombre || '',
          row.ciudadano_correo || row.correo || '',
          row.ciudadano_telefono || row.telefono || '',
          row.provincia || '',
          row.distrito || '',
          row.sucursal_id || '',
          row.sucursal_nombre || '',
          row.fecha_cita || row.fecha || '',
          row.hora_cita || row.hora || '',
          row.estado_cita || row.estado || 'CONFIRMADA',
          JSON.stringify(row)
        ]
      );
    } catch (e: any) {
      console.error("[Azure PostgreSQL] Error saving appointment:", e.message);
    }
  }
}

async function getDBUsers(): Promise<ServerUser[]> {
  const localUsers = getUsers();

  if (isPgConfigured && pgPool) {
    try {
      const res = await pgPool.query(`SELECT username, password, role, nombre, must_change_password, fecha_creacion FROM usuarios`);
      if (res.rows && res.rows.length > 0) {
        const pgUsers: ServerUser[] = res.rows.map((row: any) => ({
          username: row.username,
          password: row.password,
          role: row.role as any,
          nombre: row.nombre,
          fechaCreacion: row.fecha_creacion ? new Date(row.fecha_creacion).toISOString() : new Date().toISOString(),
          mustChangePassword: !!row.must_change_password
        }));

        const merged = [...localUsers];
        pgUsers.forEach((pu: ServerUser) => {
          if (pu.username) {
            const idx = merged.findIndex(u => u.username.toLowerCase() === pu.username.toLowerCase());
            if (idx >= 0) {
              merged[idx] = pu;
            } else {
              merged.push(pu);
            }
          }
        });
        return merged;
      } else {
        for (const u of localUsers) {
          try {
            await pgPool.query(
              `INSERT INTO usuarios (username, password, role, nombre, must_change_password)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (username) DO NOTHING`,
              [u.username.toLowerCase(), u.password, u.role, u.nombre, !!u.mustChangePassword]
            );
          } catch (e: any) {
            console.warn(`[Azure PostgreSQL Seeder Warning] Failed to seed user ${u.username}:`, e.message);
          }
        }
      }
    } catch (err: any) {
      console.error("Error reading users from Azure PostgreSQL:", err.message);
    }
  }

  return localUsers;
}

async function getDBAppointments(): Promise<ServerCita[]> {
  if (isPgConfigured && pgPool) {
    try {
      const res = await pgPool.query(`SELECT * FROM appointments ORDER BY created_at DESC`);
      if (res.rows && res.rows.length > 0) {
        return res.rows.map((row: any) => {
          let parsed: any = {};
          if (row.data) {
            parsed = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
          }
          return {
            ...parsed,
            id: row.id || parsed.id,
            codigoTransaccion: row.id || parsed.codigoTransaccion,
            tipo: row.tipo || parsed.tipo,
            tramite: row.tramite || parsed.tramite,
            subTramite: row.sub_tramite || parsed.subTramite,
            identificacion: row.identificacion || parsed.identificacion,
            nombre: row.nombre || parsed.nombre,
            correo: row.correo || parsed.correo,
            telefono: row.telefono || parsed.telefono,
            provincia: row.provincia || parsed.provincia,
            distrito: row.distrito || parsed.distrito,
            sucursalId: row.sucursal_id || parsed.sucursalId,
            sucursalNombre: row.sucursal_nombre || parsed.sucursalNombre,
            fecha: row.fecha || parsed.fecha,
            hora: row.hora || parsed.hora,
            estado: row.estado || parsed.estado
          };
        });
      }
    } catch (err: any) {
      console.error("Error fetching appointments from Azure PostgreSQL:", err.message);
    }
  }

  return getAppointments();
}

async function getDBExtranjeriaRecords(): Promise<ExtranjeriaRecord[]> {
  return getExtranjeriaRecords();
}

function renderStatusPage(
  title: string, 
  subtitle: string, 
  iconHtml: string, 
  themeColor: string, 
  detailsHtml: string, 
  host: string
): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - Tribunal Electoral de Panamá</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #f1f5f9;
          color: #0f172a;
          margin: 0;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 90vh;
        }
        .card {
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          width: 100%;
          max-width: 500px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }
        .banner {
          background-color: ${themeColor};
          padding: 30px 20px;
          text-align: center;
          color: #ffffff;
        }
        .icon-container {
          margin-bottom: 12px;
          display: inline-block;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          width: 64px;
          height: 64px;
          line-height: 64px;
          text-align: center;
        }
        .icon-container svg {
          vertical-align: middle;
          display: inline-block;
          width: 32px;
          height: 32px;
        }
        .title {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .subtitle {
          font-size: 13px;
          margin: 6px 0 0 0;
          opacity: 0.9;
        }
        .content {
          padding: 24px;
        }
        .details-box {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .details-title {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 6px;
          margin-top: 0;
          margin-bottom: 12px;
        }
        .details-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin: 8px 0;
        }
        .details-label {
          color: #64748b;
          font-weight: 500;
        }
        .details-value {
          font-weight: 700;
          color: #0f172a;
          text-align: right;
        }
        .btn {
          display: block;
          background-color: #1e3a8a;
          color: #ffffff !important;
          text-align: center;
          padding: 12px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 800;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          transition: background-color 0.2s;
        }
        .btn:hover {
          background-color: #12255c;
        }
        .footer {
          text-align: center;
          padding: 16px;
          font-size: 11px;
          color: #64748b;
          border-top: 1px solid #f1f5f9;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="banner">
          <div class="icon-container">${iconHtml}</div>
          <h1 class="title">${title}</h1>
          <p class="subtitle">${subtitle}</p>
        </div>
        <div class="content">
          ${detailsHtml}
          <a href="https://${host}" class="btn">Ir al Portal del Tribunal</a>
        </div>
        <div class="footer">
          Tribunal Electoral de Panamá • La Patria La Hacemos Contigo
        </div>
      </div>
    </body>
    </html>
  `;
}

interface ActiveSession {
  username: string;
  role: string;
  timestamp: number;
}

const activeSessions: Record<string, ActiveSession> = {};

async function verifySession(req: any): Promise<boolean> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return false;
    }
    const token = authHeader.substring(7).trim();
    if (!token) return false;
    
    const session = activeSessions[token];
    if (!session) return false;
    
    // session expiration (12 hours)
    const twelveHours = 12 * 60 * 60 * 1000;
    if (Date.now() - session.timestamp > twelveHours) {
      delete activeSessions[token];
      return false;
    }
    
    return true;
  } catch (e) {
    return false;
  }
}

async function verifyAdminSession(req: any, res: any, next: any) {
  const isValid = await verifySession(req);
  if (!isValid) {
    return res.status(401).json({ success: false, error: "Sesión inválida o expirada. Por favor inicie sesión de nuevo." });
  }
  next();
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || "3000";

  // Configuración de Helmet para inyectar cabeceras de seguridad estándar de forma automática (CSP, XSS, etc.)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "frame-ancestors": ["'self'", "https://*.google.com", "https://*.run.app", "https://ai.studio", "https://aistudio.google", "*"],
          "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          "connect-src": ["'self'", "https://*", "http://*", "ws://*", "wss://*"],
          "img-src": ["'self'", "data:", "https://*", "http://*"],
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
        },
      },
      // Desactivamos frameguard (X-Frame-Options: SAMEORIGIN) para evitar que bloquee la carga del portal
      // dentro de la vista previa del iframe en el entorno interactivo de Google AI Studio.
      frameguard: false,
    })
  );

  // Middleware to parse requests
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Create uploads directory if it does not exist and serve it as static files
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsDir));

  // Serve static images directly from public directory
  const publicImagesDir = path.join(process.cwd(), "public", "images");
  if (fs.existsSync(publicImagesDir)) {
    app.use("/images", express.static(publicImagesDir));
    app.use("/public/images", express.static(publicImagesDir));
  }

  // Official logo endpoint (serves local high-res asset with immediate response)
  app.get("/api/logo", async (req, res) => {
    try {
      const localLogoPath = path.join(process.cwd(), "public", "images", "logo-te-aniversario-1.png");
      const localSvgPath = path.join(process.cwd(), "public", "images", "logo-te-aniversario.svg");
      
      if (fs.existsSync(localLogoPath)) {
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.sendFile(localLogoPath);
      }
      if (fs.existsSync(localSvgPath)) {
        res.setHeader("Content-Type", "image/svg+xml");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.sendFile(localSvgPath);
      }

      // Deep fallback: clear 1x1 transparent PNG
      const transparentPixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
      res.setHeader("Content-Type", "image/png");
      res.send(transparentPixel);
    } catch (error: any) {
      console.error("[Logo Endpoint Error]:", error.message || error);
      const transparentPixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
      res.setHeader("Content-Type", "image/png");
      res.send(transparentPixel);
    }
  });

  // Build Version endpoint for automated client cache invalidation and gateway sync
  const CURRENT_APP_VERSION = "2026.08.26-v2.1.0";
  app.get(["/api/version", "/api/app-version"], (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.json({
      version: CURRENT_APP_VERSION,
      timestamp: Date.now(),
      redirectGateway: true
    });
  });

  // Endpoints for Admin authentication session creation
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, error: "Usuario y contraseña requeridos." });
      }

      const lcUser = String(username).trim().toLowerCase();
      const users = await getDBUsers();
      
      const foundUser = users.find(u => u.username.toLowerCase() === lcUser && u.password === password);
      
      if (foundUser) {
        const token = "session_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
        activeSessions[token] = {
          username: foundUser.username,
          role: foundUser.role,
          timestamp: Date.now()
        };
        return res.json({
          success: true,
          token,
          user: {
            username: foundUser.username,
            role: foundUser.role,
            nombre: foundUser.nombre,
            mustChangePassword: !!foundUser.mustChangePassword
          }
        });
      }

      // Hardcoded fallback accounts for backward-compatibility in case table/seeding isn't fully operational
      const fallbackAdmins = [
        { u: "login", p: "login", r: "super", n: "Usuario Inicial", mcp: true },
        { u: "adminmini", p: "admin1234", r: "sencillo", n: "Administrador Mini" },
        { u: "adminte", p: "Value1234", r: "super", n: "Super Admin Tribal" },
        { u: "oscargave3003", p: "Value1234", r: "super", n: "Oscar Super Admin" },
        { u: "oscargave3003@gmail.com", p: "Value1234", r: "super", n: "Oscar Super Admin Email" },
        { u: "migra26", p: "12345678", r: "extranjeria", n: "Inmigración / Extranjería" },
        { u: "adminpedad", p: "PasaDodeEdad2026", r: "pasado_edad", n: "Administrador VID" },
        { u: "adminpe_sup", p: "1234", r: "pasado_edad_supervisor", n: "Supervisor VID" },
        { u: "adminpe_op", p: "1234", r: "pasado_edad_admin", n: "Operador Seguimiento VID" }
      ];

      const fallbackMatch = fallbackAdmins.find(f => f.u.toLowerCase() === lcUser && f.p === password);
      if (fallbackMatch) {
        const token = "session_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
        activeSessions[token] = {
          username: fallbackMatch.u,
          role: fallbackMatch.r,
          timestamp: Date.now()
        };
        return res.json({
          success: true,
          token,
          user: {
            username: fallbackMatch.u,
            role: fallbackMatch.r,
            nombre: fallbackMatch.n,
            mustChangePassword: !!fallbackMatch.mcp
          }
        });
      }

      return res.status(401).json({ success: false, error: "Credenciales incorrectas." });
    } catch (e: any) {
      console.error("Error during /api/login:", e);
      return res.status(500).json({ success: false, error: "Ocurrió un error interno en el servidor" });
    }
  });

  // API Route to dispatch the appointment confirmation email
  app.post("/api/send-email", async (req, res) => {
    try {
      const { 
        email, 
        codigoTransaccion, 
        categoriaNombre, 
        subServicioNombre, 
        fechaFormateada, 
        fecha,
        id,
        hora, 
        sucursalNombre, 
        sucursalDireccion, 
        identificacion, 
        telefono,
        requisitos = [],
        numeroSeguimiento,
        ticketTurnoCode
      } = req.body;

      if (!email) {
        return res.status(400).json({ error: "El correo electrónico es requerido." });
      }

      // Automatically register or update this appointment inside our server DB
      if (codigoTransaccion) {
        const appointments = await getDBAppointments();
        const existingIdx = appointments.findIndex(a => a.id === id || a.codigoTransaccion === codigoTransaccion);
        
        const serverCita: ServerCita = {
          id: id || `TE-${Date.now()}`,
          correo: email || "",
          codigoTransaccion: codigoTransaccion,
          categoriaNombre: categoriaNombre || "",
          subServicioNombre: subServicioNombre || "",
          subServicioId: req.body.subServicioId || undefined,
          fecha: fecha || new Date().toISOString().split('T')[0],
          hora: hora || "",
          sucursalNombre: sucursalNombre || "",
          sucursalDireccion: sucursalDireccion || "",
          identificacion: identificacion || "",
          telefono: telefono || "",
          requisitos: requisitos || [],
          estado: existingIdx >= 0 ? appointments[existingIdx].estado : 'confirmada',
          fechaCreacion: existingIdx >= 0 ? appointments[existingIdx].fechaCreacion : new Date().toISOString(),
          numeroSeguimiento: numeroSeguimiento || undefined,
          datosPersonales: req.body.datosPersonales || undefined,
          nombre: req.body.nombre || (req.body.datosPersonales?.nombreCompleto) || ""
        };

        await safeUpsertAppointment({
          identificacion: serverCita.id,
          codigo_transaccion: serverCita.codigoTransaccion,
          fecha: serverCita.fecha,
          tiempo: serverCita.hora,
          fecha_creacion: serverCita.fechaCreacion,
          estado: existingIdx >= 0 ? appointments[existingIdx].estado : serverCita.estado,
          sucursal_id: req.body.sucursalId || "anc_main",
          sub_servicio_id: req.body.subServicioId || "ced_primera_vez",
          tipo_identificacion: serverCita.datosPersonales?.tipoIdentificacion || "Cedula",
          identificacion_ciudadano: serverCita.identificacion,
          ciudadano_identificacion: serverCita.identificacion,
          fecha_nacimiento: serverCita.datosPersonales?.fechaNacimiento || "2000-01-01",
          telefono: serverCita.telefono,
          correo: serverCita.correo,
          nombre_completo: serverCita.nombre || serverCita.datosPersonales?.nombreCompleto || "",
          numero_seguimiento: serverCita.numeroSeguimiento || null,
          primer_nombre: serverCita.datosPersonales?.primerNombre || null,
          segundo_nombre: serverCita.datosPersonales?.segundoNombre || null,
          primer_apellido: serverCita.datosPersonales?.primerApellido || null,
          segundo_apellido: serverCita.datosPersonales?.segundoApellido || null,
          pasaporte: serverCita.datosPersonales?.pasaporte || null,
          nacionalidad: serverCita.datosPersonales?.nacionalidad || null,
          numero_resolucion: serverCita.datosPersonales?.numeroResolucion || null,
          fecha_resolucion: serverCita.datosPersonales?.fechaResolucion || null,
          fecha_vencimiento: serverCita.datosPersonales?.fechaVencimiento || null
        });
      }

      // Use the local proxy endpoint on our server which sets proper headers (Referer, User-Agent) to bypass hotlinking protection and support unblocked PNG fallbacks
      const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || "https";
      const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
      const logoAbsoluteUrl = `${protocol}://${host}/api/logo`;

      // Construct a highly polished, official HTML document for the email
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Comprobante de Cita Oficial - Tribunal Electoral</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              background-color: #f8fafc;
              color: #1e293b;
              margin: 0;
              padding: 0;
              -webkit-font-smoothing: antialiased;
            }
            .wrapper {
              width: 100%;
              background-color: #f8fafc;
              padding: 40px 10px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
            }
            .top-stripe {
              height: 6px;
              width: 100%;
              font-size: 0;
              line-height: 0;
            }
            .stripe-red {
              display: inline-block;
              width: 33.33%;
              height: 6px;
              background-color: #dc2626;
            }
            .stripe-blue {
              display: inline-block;
              width: 33.33%;
              height: 6px;
              background-color: #1e3a8a;
            }
            .stripe-white {
              display: inline-block;
              width: 33.33%;
              height: 6px;
              background-color: #ffffff;
            }
            .header {
              background-color: #0b1329;
              padding: 24px;
              text-align: center;
              color: #ffffff;
              border-bottom: 2px solid #b45309;
            }
            .header-emblem {
              display: inline-block;
              width: 44px;
              height: 44px;
              line-height: 44px;
              border-radius: 50%;
              border: 1px solid rgba(255,255,255,0.2);
              background-color: rgba(255,255,255,0.1);
              font-family: Georgia, serif;
              font-weight: 900;
              font-size: 16px;
              color: #fbbf24;
              margin-bottom: 8px;
              text-align: center;
            }
            .header-title-sub {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              color: #93c5fd;
              font-weight: 800;
              margin: 0;
              line-height: 1.2;
            }
            .header-title-main {
              font-size: 14px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #ffffff;
              margin: 4px 0 0 0;
              line-height: 1.2;
            }
            .conf-banner {
              background-color: #ecfdf5;
              border-bottom: 1px solid #d1fae5;
              padding: 16px;
              text-align: center;
            }
            .conf-title {
              color: #065f46;
              font-weight: 800;
              font-size: 16px;
              margin: 0 0 4px 0;
            }
            .conf-desc {
              color: #047857;
              font-size: 12px;
              font-weight: 500;
              margin: 0;
            }
            .code-box {
              background-color: #eff6ff;
              border: 1px dashed #bfdbfe;
              border-radius: 6px;
              padding: 12px 16px;
              margin: 20px;
              text-align: center;
            }
            .code-label {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #1e40af;
              margin: 0 0 2px 0;
            }
            .code-value {
              font-family: monospace;
              font-weight: 900;
              font-size: 20px;
              color: #b45309;
              letter-spacing: 1px;
            }
            .content-body {
              padding: 0 24px 20px 24px;
            }
            .section-title {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #64748b;
              margin: 16px 0 6px 0;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 4px;
            }
            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
            }
            .info-table td {
              padding: 6px 0;
              vertical-align: top;
            }
            .info-table .label {
              width: 35%;
              font-size: 12px;
              color: #64748b;
              font-weight: 600;
            }
            .info-table .value {
              width: 65%;
              font-size: 12px;
              color: #0f172a;
              font-weight: 700;
            }
            .card-citizen {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 14px;
              margin-top: 10px;
            }
            .citizen-title {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              color: #475569;
              margin: 0 0 8px 0;
              letter-spacing: 0.05em;
            }
            .citizen-row {
              font-size: 12px;
              margin: 3px 0;
              color: #334155;
            }
            .citizen-row strong {
              color: #0f172a;
            }
            .reminder-box {
              background-color: #fffbeb;
              border: 1px solid #fde68a;
              border-radius: 6px;
              padding: 16px;
              margin: 20px 24px;
            }
            .reminder-title {
              font-size: 12px;
              font-weight: 800;
              color: #92400e;
              text-transform: uppercase;
              margin: 0 0 8px 0;
              display: flex;
              align-items: center;
            }
            .reminder-list {
              padding-left: 16px;
              margin: 0;
              font-size: 11.5px;
              color: #78350f;
              line-height: 1.6;
            }
            .reminder-list li {
              margin-bottom: 4px;
              font-weight: 500;
            }
            .reminder-list .highlight {
              font-weight: 800;
              color: #000000;
            }
            .footer-notes {
              text-align: center;
              padding: 20px;
              font-size: 10px;
              color: #94a3b8;
              background-color: #f1f5f9;
              border-top: 1px solid #e2e8f0;
            }
            .footer-notes a {
              color: #1e3a8a;
              text-decoration: none;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <!-- Flag strip at top -->
              <div class="top-stripe">
                <span class="stripe-red"></span><span class="stripe-blue"></span><span class="stripe-white"></span>
              </div>
              
              <!-- Header Brand -->
              <div class="header" style="background-color: #0b1329; border-bottom: 2px solid #b45309; padding: 24px; text-align: center;">
                <img 
                  src="${logoAbsoluteUrl}" 
                  alt="Tribunal Electoral" 
                  style="max-height: 52px; width: auto; max-width: 100%; display: inline-block; vertical-align: middle;"
                />
              </div>

              <!-- Confirmation message -->
              <div class="conf-banner">
                <h3 class="conf-title">¡Su Cita ha sido Agendada Exitosamente!</h3>
                <p class="conf-desc">Presente este comprobante digital o físico el día asignado.</p>
              </div>

              <!-- Transaction Code & Turno Section -->
              <div class="code-box">
                <div class="code-label">Código de Cita</div>
                <div class="code-value">${codigoTransaccion}</div>
                ${ticketTurnoCode ? `
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #bfdbfe;">
                  <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #1e3a8a; display: block; letter-spacing: 0.05em;">Número de Turno Asignado para Pantallas TV:</span>
                  <span style="font-family: monospace; font-weight: 900; font-size: 24px; color: #1e3a8a; display: inline-block; margin-top: 2px;">${ticketTurnoCode}</span>
                  <span style="display: block; font-size: 11px; color: #047857; font-weight: bold; margin-top: 2px;">⭐ ATENCIÓN PREFERENTE / CITA PREVIA</span>
                </div>
                ` : ''}
              </div>

              <!-- Core info segment -->
              <div class="content-body">
                <div class="section-title">Detalles de la Cita</div>
                <table class="info-table">
                  <tr>
                    <td class="label">Categoría:</td>
                    <td class="value">${categoriaNombre}</td>
                  </tr>
                  <tr>
                    <td class="label">Trámite Exacto:</td>
                    <td class="value" style="color: #1d4ed8;">${subServicioNombre}</td>
                  </tr>
                  <tr>
                    <td class="label">Sede / Sucursal:</td>
                    <td class="value">${sucursalNombre}</td>
                  </tr>
                  <tr>
                    <td class="label">Ubicación Sede:</td>
                    <td class="value" style="font-weight: 500; font-size: 11.5px; color: #475569;">${sucursalDireccion}</td>
                  </tr>
                  <tr>
                    <td class="label">Fecha Programada:</td>
                    <td class="value">${fechaFormateada}</td>
                  </tr>
                  <tr>
                    <td class="label">Hora Pactada:</td>
                    <td class="value">${hora}</td>
                  </tr>
                </table>

                <div class="section-title">Datos del Solicitante</div>
                <div class="card-citizen">
                  <div class="citizen-title">Identificación del Ciudadano</div>
                  <div class="citizen-row">Cédula de Identidad: <strong>${identificacion}</strong></div>
                  <div class="citizen-row">Teléfono de Contacto: <strong>${telefono}</strong></div>
                  <div class="citizen-row">Correo Electrónico: <strong>${email}</strong></div>
                </div>
              </div>

              <!-- Requirements checklist -->
              <div class="reminder-box">
                <div class="reminder-title">⚠️ REQUISITOS Y RECORDATORIOS OBLIGATORIOS</div>
                <ul class="reminder-list">
                  ${requisitos.map((req: string) => `<li>${req}</li>`).join("")}
                  <li class="highlight">Favor estar presente físicamente con un mínimo de 15 minutos antes de la hora pactada.</li>
                  <li>La vestimenta para la toma de fotografía biométrica exige hombros cubiertos y ausencia de escotes, gorros o anteojos de sol.</li>
                </ul>
              </div>

              <!-- Professional corporate footnote -->
              <div class="footer-notes">
                <p>Este es un correo oficial generado automáticamente por el Portal del Tribunal Electoral de Panamá.</p>
                <p>Para consultas o soporte adicional, contacte a nuestra línea gratuita <strong>311</strong> o al teléfono <strong>+507 507-8000</strong>.</p>
                <p><a href="https://www.tribunal-electoral.gob.pa">www.tribunal-electoral.gob.pa</a> • La Patria La Hacemos Contigo</p>
              </div>

            </div>
          </div>
        </body>
        </html>
      `;

      // Check if Outlook is configured
      if (isOutlookConfigured) {
        console.log(`[Email Service] Attempting real Outlook email delivery to ${email} (From: ${outlookUser})...`);
        try {
          const info = await sendOutlookEmail(
            email,
            `Comprobante de Cita Oficial: ${codigoTransaccion} - Tribunal Electoral`,
            htmlContent
          );
          console.log("[Email Service] Email sent successfully via Outlook SMTP:", info.messageId);
          return res.json({ 
            success: true, 
            message: "El comprobante ha sido enviado a su correo electrónico exitosamente.",
            id: info.messageId,
            simulated: false
          });
        } catch (error: any) {
          console.error("[Email Service] SMTP delivery error:", error);
          
          return res.status(400).json({ 
            success: false, 
            error: "No se pudo procesar el correo",
            errorType: "smtp_error",
            simulated: false,
            htmlPreview: htmlContent
          });
        }
      } else {
        // Run in Simulation Mode (perfect for Sandbox preview)
        console.log(`[Email Service] Simulating email delivery to ${email} (no OUTLOOK_USER configured).`);
        
        // Emulate a 1 second net delay for high fidelity
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return res.json({
          success: true,
          message: "Se simuló el envío correctamente debido a que está operando en modo de pruebas sin credenciales de Outlook.",
          simulated: true,
          htmlPreview: htmlContent
        });
      }

    } catch (e: any) {
      console.error("[Email Service] Exception sending email:", e);
      res.status(500).json({ error: "Ocurrió un error interno en el servidor" });
    }
  });

  // ==========================================
  // EXTRANJERÍA MIGRATION DATABASE ENDPOINTS
  // ==========================================
  
  // Endpoint to fetch the full list of foreigner passport eligibility records
  app.get("/api/extranjeria/list", async (req, res) => {
    try {
      const records = await getDBExtranjeriaRecords();
      return res.json({ success: true, records });
    } catch (e: any) {
      console.error("Error fetching extranjería list:", e);
      return res.status(500).json({ success: false, error: "Ocurrió un error interno en el servidor" });
    }
  });

  // Endpoint to upload/overwrite foreign passport records (expecting parsed array of records)
  app.post("/api/extranjeria/upload", verifyAdminSession, async (req, res) => {
    try {
      const { records } = req.body;
      if (!Array.isArray(records)) {
        return res.status(400).json({ success: false, error: "Datos incorrectos: se espera un array de registros en la propiedad 'records'." });
      }

      // Convert eligible string values, clean whitespace, and format
      const normalizedRecords: ExtranjeriaRecord[] = records.map((r: any) => ({
        pasaporte: String(r.pasaporte || "").trim().toUpperCase(),
        nombre: String(r.nombre || "").trim(),
        nacionalidad: r.nacionalidad ? String(r.nacionalidad).trim() : "No especificada",
        elegible: r.elegible === true || String(r.elegible || "").toLowerCase() === "si" || String(r.elegible || "").toLowerCase() === "true" || String(r.elegible || "").toLowerCase() === "sí",
        motivo: String(r.motivo || "").trim() || "Consulte en ventanilla"
      })).filter(r => r.pasaporte !== "");

      saveExtranjeriaRecords(normalizedRecords);

      console.log(`[Extranjería] CSV Upload Success. Conserved ${normalizedRecords.length} records.`);
      return res.json({ success: true, count: normalizedRecords.length, records: normalizedRecords });
    } catch (e: any) {
      console.error("Error saving extranjería records:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // Endpoint to verify a specific passport number
  app.post("/api/extranjeria/verify", async (req, res) => {
    try {
      const { pasaporte } = req.body;
      if (!pasaporte) {
        return res.status(405).json({ success: false, error: "Número de pasaporte requerido." });
      }

      const searchPassport = String(pasaporte).trim().toUpperCase();
      const records = await getDBExtranjeriaRecords();
      const match = records.find(r => r.pasaporte === searchPassport);

      if (match) {
        return res.json({
          success: true,
          found: true,
          record: match
        });
      } else {
        return res.json({
          success: true,
          found: false,
          record: null,
          message: "El pasaporte no se encuentra registrado en la base de datos de elegibilidad de Extranjería. Acuda a la oficina principal."
        });
      }
    } catch (e: any) {
      console.error("Error verifying passport:", e);
      return res.status(500).json({ success: false, error: "Ocurrió un error interno en el servidor" });
    }
  });

  // Endpoints to get and set Extranjería capacity scheduler configurations
  app.get("/api/extranjeria/config", (req, res) => {
    try {
      const config = getExtranjeriaConfig();
      return res.json({ success: true, config });
    } catch (e: any) {
      console.error("Error fetching extranjería settings:", e);
      return res.status(500).json({ success: false, error: "Ocurrió un error interno en el servidor" });
    }
  });

  app.post("/api/extranjeria/config", verifyAdminSession, (req, res) => {
    try {
      const { capacidad, intervalo, horaInicio, horaFin } = req.body;
      
      const updatedConfig: ExtranjeriaConfig = {
        capacidad: parseInt(capacidad, 10) || DEFAULT_EXTRANJERIA_CONFIG.capacidad,
        intervalo: parseInt(intervalo, 10) || DEFAULT_EXTRANJERIA_CONFIG.intervalo,
        horaInicio: String(horaInicio || DEFAULT_EXTRANJERIA_CONFIG.horaInicio),
        horaFin: String(horaFin || DEFAULT_EXTRANJERIA_CONFIG.horaFin)
      };

      saveExtranjeriaConfig(updatedConfig);
      return res.json({ success: true, config: updatedConfig });
    } catch (e: any) {
      console.error("Error saving extranjería config:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/tardia/config", (req, res) => {
    try {
      const config = getTardiaConfig();
      return res.json({ success: true, config });
    } catch (e: any) {
      console.error("Error fetching tardía settings:", e);
      return res.status(500).json({ success: false, error: "Ocurrió un error interno en el servidor" });
    }
  });

  app.post("/api/tardia/config", verifyAdminSession, (req, res) => {
    try {
      const { capacidadTotalDia, intervalo, horaInicio, horaFin } = req.body;
      
      const updatedConfig: TardiaConfig = {
        capacidadTotalDia: parseInt(capacidadTotalDia, 10) || DEFAULT_TARDIA_CONFIG.capacidadTotalDia,
        intervalo: parseInt(intervalo, 10) || DEFAULT_TARDIA_CONFIG.intervalo,
        horaInicio: String(horaInicio || DEFAULT_TARDIA_CONFIG.horaInicio),
        horaFin: String(horaFin || DEFAULT_TARDIA_CONFIG.horaFin)
      };

      saveTardiaConfig(updatedConfig);
      return res.json({ success: true, config: updatedConfig });
    } catch (e: any) {
      console.error("Error saving tardía config:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/cms/config", async (req, res) => {
    try {
      const config = await getCmsConfig();
      return res.json({ success: true, config });
    } catch (e: any) {
      console.error("Error fetching CMS config:", e);
      return res.status(500).json({ success: false, error: "Ocurrió un error interno en el servidor" });
    }
  });

  const getDbStatusHandler = async (req: express.Request, res: express.Response) => {
    try {
      const statusResponse: any = {
        isAzurePostgresConfigured: isPgConfigured,
        azurePostgresHost: process.env.PGHOST || (pgConnectionString ? "postgresql-flexible-server.postgres.database.azure.com" : ""),
        storage: "Azure PostgreSQL / Local Storage JSON"
      };

      if (isPgConfigured && pgPool) {
        try {
          const client = await pgPool.connect();
          statusResponse.azurePostgresConnected = true;
          client.release();
        } catch (pgErr: any) {
          statusResponse.azurePostgresConnected = false;
          statusResponse.azurePostgresError = pgErr.message;
        }
      }

      return res.json(statusResponse);
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  };

  app.get("/api/db-status", getDbStatusHandler);

  app.post("/api/cms/config", verifyAdminSession, async (req, res) => {
    try {
      const config = req.body;
      if (!config || typeof config !== "object") {
        return res.status(400).json({ success: false, error: "Configuración inválida" });
      }
      const success = await saveCmsConfig(config);
      return res.json({ success, config });
    } catch (e: any) {
      console.error("Error saving CMS config:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // API to upload an asset/image via base64 data
  app.post("/api/upload", verifyAdminSession, async (req, res) => {
    try {
      const { filename, base64Data } = req.body;
      if (!base64Data) {
        return res.status(400).json({ success: false, error: "No se proporcionó información de la imagen (datos base64)." });
      }

      let fileBuffer: Buffer;
      let cleanedFilename = "image-" + Date.now() + ".png";

      if (filename) {
        // Sanitize the filename to avoid traversal or bad chars
        cleanedFilename = String(filename)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_.-]/g, "-");
        // Ensure unique prefix to avoid duplicate name clashes and cache conflicts
        cleanedFilename = `${Date.now()}-${cleanedFilename}`;
      }

      if (base64Data.includes(";base64,")) {
        const parts = base64Data.split(";base64,");
        const rawBase64 = parts[1];
        fileBuffer = Buffer.from(rawBase64, "base64");
      } else {
        fileBuffer = Buffer.from(base64Data, "base64");
      }

      const filePath = path.join(process.cwd(), "uploads", cleanedFilename);
      fs.writeFileSync(filePath, fileBuffer);

      return res.json({
        success: true,
        url: `/uploads/${cleanedFilename}`,
        filename: cleanedFilename,
        size: fileBuffer.length
      });
    } catch (e: any) {
      console.error("Error saving uploaded image asset:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // API to list all uploaded images/assets
  app.get("/api/uploads/list", verifyAdminSession, async (req, res) => {
    try {
      const uDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uDir)) {
        return res.json({ success: true, files: [] });
      }
      const files = fs.readdirSync(uDir);
      const fileInfos = files
        .filter(file => !file.startsWith('.'))
        .map(file => {
          const fPath = path.join(uDir, file);
          const stat = fs.statSync(fPath);
          return {
            filename: file,
            url: `/uploads/${file}`,
            size: stat.size,
            mtime: stat.mtime
          };
        })
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      return res.json({ success: true, files: fileInfos });
    } catch (e: any) {
      console.error("Error listing files inside uploads/ directory:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // API to delete an uploaded image asset
  app.delete("/api/uploads/:filename", verifyAdminSession, async (req, res) => {
    try {
      const { filename } = req.params;
      if (!filename || filename.includes("/") || filename.includes("..")) {
        return res.status(400).json({ success: false, error: "Nombre de archivo inválido." });
      }
      const fPath = path.join(process.cwd(), "uploads", filename);
      if (fs.existsSync(fPath)) {
        fs.unlinkSync(fPath);
        return res.json({ success: true, message: `Archivo ${filename} eliminado con éxito de la base de datos de almacenamiento local.` });
      } else {
        return res.status(404).json({ success: false, error: "El archivo no existe." });
      }
    } catch (e: any) {
      console.error("Error deleting image from uploads/ directory:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // API to register appointment directly
  app.post("/api/register-appointment", async (req, res) => {
    try {
      const { 
        id, 
        datosPersonales, 
        servicioCategoria, 
        subServicioId, 
        sucursalId, 
        fecha, 
        hora, 
        codigoTransaccion, 
        fechaCreacion, 
        estado,
        categoriaNombre,
        subServicioNombre,
        sucursalNombre,
        sucursalDireccion,
        requisitos,
        creadoPor
      } = req.body;

      if (!id || !codigoTransaccion) {
        return res.status(400).json({ error: "Datos incompletos." });
      }

      const appointments = await getDBAppointments();

      // Enforce capacity check for Extranjeria appointments
      const isExtranjeria = servicioCategoria === 'extranjeria' || 
        (subServicioId && (subServicioId.includes('extranjero') || subServicioId.startsWith('ext_')));
      
      if (isExtranjeria) {
        const config = getExtranjeriaConfig();
        const activeCitas = appointments.filter(a => 
          a.fecha === fecha && 
          a.hora === hora && 
          (a.categoriaNombre === 'extranjeria' || (a.subServicioNombre && (a.subServicioNombre.includes('extranjero') || a.subServicioNombre.toLowerCase().includes('extranjeria')))) &&
          a.estado !== 'cancelada'
        );
        
        // Only reject if booking a fresh slot (not modifying/re-saving existing on same slot)
        const isNewBooking = appointments.findIndex(a => a.id === id) < 0;
        if (isNewBooking && activeCitas.length >= config.capacidad) {
          return res.status(400).json({ 
            success: false, 
            error: `Cupos agotados. El límite de atención para las ${hora} el día ${fecha} es de ${config.capacidad} usuarios.` 
          });
        }
      }

      // Enforce daily capacity, days of the week, and hours check for Pasados de Edad
      const isPastAge = subServicioId === 'ced_pasados_edad' || 
        (subServicioId && (subServicioId.includes('pasado') || subServicioId.toLowerCase().includes('ced_pasados_edad'))) ||
        (subServicioNombre && (subServicioNombre.toLowerCase().includes('pasado') || subServicioNombre.toLowerCase().includes('tardía')));
      
      if (isPastAge) {
        // 1. Verify working days (de lunes a jueves / Mon - Thu)
        const targetDate = new Date(fecha + 'T00:00:00');
        const dayOfWeek = targetDate.getDay(); 
        if (dayOfWeek < 1 || dayOfWeek > 4) {
          return res.status(400).json({
            success: false,
            error: "Las citas para Pasados de Edad solo están habilitadas de lunes a jueves."
          });
        }

        // 2. Verify allowed times
        const allowedTimes = ['08:00 AM', '09:00 AM', '10:30 AM', '11:30 AM'];
        if (!allowedTimes.includes(hora)) {
          return res.status(400).json({
            success: false,
            error: "Horario no disponible. Las citas de Pasados de Edad se agendan únicamente a las 08:00 AM, 09:00 AM, 10:30 AM o 11:30 AM."
          });
        }

        // 3. Enforce slot capacity of exactly 1 appointment for that specific hour
        const hourlyCitas = appointments.filter(a => 
          a.fecha === fecha && 
          a.hora === hora && 
          (a.subServicioId === 'ced_pasados_edad' || a.subServicioNombre?.toLowerCase().includes('pasado') || a.subServicioNombre?.toLowerCase().includes('tardía')) &&
          a.estado !== 'cancelada'
        );
        const isNewBooking = appointments.findIndex(a => a.id === id) < 0;
        if (isNewBooking && hourlyCitas.length >= 1) {
          return res.status(400).json({
            success: false,
            error: `El cupo de las ${hora} para inscripción de Pasado de Edad ya se encuentra reservado. Por favor, elija otra hora o fecha.`
          });
        }

        const activePasadosEdadCitas = appointments.filter(a => 
          a.fecha === fecha && 
          (a.subServicioId === 'ced_pasados_edad' || a.subServicioNombre?.toLowerCase().includes('pasado') || a.subServicioNombre?.toLowerCase().includes('tardía')) &&
          a.estado !== 'cancelada'
        );
        if (isNewBooking && activePasadosEdadCitas.length >= 4) {
          return res.status(400).json({
            success: false,
            error: "Se completó el límite diario de atención. Solo se permiten hasta 4 citas de inscripción de Pasado de Edad por día."
          });
        }
      }

      const existingIdx = appointments.findIndex(a => a.id === id || a.codigoTransaccion === codigoTransaccion);

      const serverCita: ServerCita = {
        id,
        correo: datosPersonales?.correo || req.body.correo || "",
        codigoTransaccion,
        categoriaNombre: categoriaNombre || servicioCategoria || "Trámite",
        subServicioNombre: subServicioNombre || subServicioId || "Servicio",
        subServicioId: subServicioId || undefined,
        fecha,
        hora,
        sucursalNombre: sucursalNombre || sucursalId || "Sucursal",
        sucursalDireccion: sucursalDireccion || "",
        identificacion: datosPersonales?.identificacion || req.body.identificacion || "",
        telefono: datosPersonales?.telefono || req.body.telefono || "",
        requisitos: requisitos || [],
        estado: estado || "confirmada",
        fechaCreacion: fechaCreacion || new Date().toISOString(),
        numeroSeguimiento: datosPersonales?.numeroSeguimiento || req.body.numeroSeguimiento || undefined,
        datosPersonales: datosPersonales || undefined,
        nombre: datosPersonales?.nombreCompleto || req.body.nombre || "",
        creadoPor: creadoPor || datosPersonales?.creadoPor || undefined
      };

      await safeUpsertAppointment({
        identificacion: serverCita.id,
        codigo_transaccion: serverCita.codigoTransaccion,
        fecha: serverCita.fecha,
        tiempo: serverCita.hora,
        fecha_creacion: serverCita.fechaCreacion,
        estado: existingIdx >= 0 ? appointments[existingIdx].estado : serverCita.estado,
        sucursal_id: sucursalId || "anc_main",
        sub_servicio_id: subServicioId || "ced_primera_vez",
        tipo_identificacion: serverCita.datosPersonales?.tipoIdentificacion || "Cedula",
        identificacion_ciudadano: serverCita.identificacion,
        ciudadano_identificacion: serverCita.identificacion,
        fecha_nacimiento: serverCita.datosPersonales?.fechaNacimiento || "2000-01-01",
        telefono: serverCita.telefono,
        correo: serverCita.correo,
        nombre_completo: serverCita.nombre || serverCita.datosPersonales?.nombreCompleto || "",
        numero_seguimiento: serverCita.numeroSeguimiento || null,
        primer_nombre: serverCita.datosPersonales?.primerNombre || null,
        segundo_nombre: serverCita.datosPersonales?.segundoNombre || null,
        primer_apellido: serverCita.datosPersonales?.primerApellido || null,
        segundo_apellido: serverCita.datosPersonales?.segundoApellido || null,
        pasaporte: serverCita.datosPersonales?.pasaporte || null,
        nacionalidad: serverCita.datosPersonales?.nacionalidad || null,
        numero_resolucion: serverCita.datosPersonales?.numeroResolucion || null,
        fecha_resolucion: serverCita.datosPersonales?.fechaResolucion || null
      });

      return res.json({ success: true, appointment: serverCita });
    } catch (e: any) {
      console.error("Error registering appointment:", e);
      res.status(500).json({ error: "Ocurrió un error interno en el servidor" });
    }
  });

  // API to bulk-sync appointment statuses
  app.post("/api/sync-appointments", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ error: "Ids debe ser un array" });
      }

      const appointments = await getDBAppointments();
      const results = appointments.filter(a => ids.includes(a.id));
      return res.json({ success: true, appointments: results });
    } catch (e: any) {
      console.error("Error syncing appointments:", e);
      res.status(500).json({ error: "Ocurrió un error interno en el servidor" });
    }
  });

  // API to get all appointments (Secured: Requires Admin authorization)
  app.get("/api/appointments", async (req, res) => {
    try {
      const isAdmin = await verifySession(req);
      if (!isAdmin) {
        return res.status(401).json({ 
          success: false, 
          error: "Acceso denegado. Se requiere autenticación de administrador para acceder a este recurso." 
        });
      }
      const appointments = await getDBAppointments();
      return res.json({ success: true, appointments });
    } catch (e: any) {
      console.error("Error fetching all appointments:", e);
      res.status(500).json({ success: false, error: "Ocurrió un error interno en el servidor" });
    }
  });

  // Public endpoint for availability checks without exposing appointment IDs or client details
  app.get("/api/public/occupied-slots", async (req, res) => {
    try {
      const appointments = await getDBAppointments();
      const occupied = appointments
        .filter(a => a.estado !== "cancelada")
        .map(a => ({
          fecha: a.fecha,
          hora: a.hora,
          subServicioId: a.subServicioId
        }));
      return res.json({ success: true, appointments: occupied });
    } catch (e: any) {
      res.status(500).json({ success: false, error: "Error al obtener disponibilidad" });
    }
  });

  // API to cancel an appointment from dashboard
  app.post("/api/cancel-appointment", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Se requiere un ID de cita" });
      }

      const appointments = getAppointments();
      const appointment = appointments.find(a => a.id === id);
      if (appointment) {
        appointment.estado = 'cancelada';
        saveAppointments(appointments);
        
        if (isPgConfigured && pgPool) {
          try {
            await pgPool.query(`UPDATE appointments SET estado = 'cancelada' WHERE identificacion = $1`, [id]);
          } catch (pgErr: any) {
            console.error("[Azure PostgreSQL] Error updating cancel status:", pgErr.message);
          }
        }
        return res.json({ success: true, status: 'cancelada' });
      }
      return res.status(404).json({ error: "Cita no encontrada en el servidor." });
    } catch (e: any) {
      console.error("Error canceling appointment:", e);
      res.status(500).json({ error: "Ocurrió un error interno en el servidor" });
    }
  });

  // API to delete an appointment
  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const appointments = await getDBAppointments();
      const existingIdx = appointments.findIndex(a => a.id === id);
      if (existingIdx < 0) {
        return res.status(404).json({ success: false, error: "Cita no encontrada" });
      }

      const localAppointments = getAppointments();
      const filtered = localAppointments.filter(a => a.id !== id);
      saveAppointments(filtered);

      if (isPgConfigured && pgPool) {
        try {
          await pgPool.query(`DELETE FROM appointments WHERE identificacion = $1`, [id]);
        } catch (pgErr: any) {
          console.error("[Azure PostgreSQL] Error deleting appointment:", pgErr.message);
        }
      }
      return res.json({ success: true, message: "Cita eliminada correctamente" });
    } catch (e: any) {
      console.error("Error deleting appointment:", e);
      res.status(500).json({ success: false, error: "Ocurrió un error interno en el servidor" });
    }
  });

  // API to purge all database records (appointments, tickets, logs, extranjeria, tardia)
  app.post("/api/admin/purge-all-database", async (req, res) => {
    try {
      console.log("[DB Admin] Purgando todos los registros de la base de datos a petición...");
      
      // 1. Limpiar appointments en JSON directamente
      try {
        fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2), "utf8");
      } catch (errDb) {
        console.error("Error al vaciar DB_PATH:", errDb);
      }

      // 2. Limpiar extranjería en JSON
      try {
        if (fs.existsSync(EXTRANJERIA_DB_PATH)) {
          fs.writeFileSync(EXTRANJERIA_DB_PATH, JSON.stringify([], null, 2), "utf8");
        }
      } catch (errExt) {
        console.error("Error al vaciar EXTRANJERIA_DB_PATH:", errExt);
      }

      // 3. Si PostgreSQL está configurado, vaciar tablas existentes una a una para que no falle si alguna no existe
      if (isPgConfigured && pgPool) {
        const tablesToClear = [
          "appointments",
          "tickets",
          "tickets_historico",
          "modulos_atencion",
          "tracking_sesiones_moviles",
          "notificaciones_moviles",
          "push_subscriptions_movil",
          "extranjeria_records",
          "tardia_records",
          "logs_auditoria",
          "auditoria_atencion"
        ];

        for (const table of tablesToClear) {
          try {
            await pgPool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`);
            console.log(`[Azure PostgreSQL] Tabla '${table}' purgada.`);
          } catch (tErr: any) {
            // Si la tabla no existe aún en PostgreSQL, intentar DELETE o ignorar
            try {
              await pgPool.query(`DELETE FROM ${table};`);
            } catch (ignoreErr) {
              console.log(`[Azure PostgreSQL] Info: No se pudo truncar '${table}': ${tErr.message}`);
            }
          }
        }
      }

      // 4. Limpiar store en memoria de tickets para que no resuciten
      memoryTicketsStore.clear();

      return res.json({
        success: true,
        message: "Base de datos restablecida a 0 exitosamente. Todos los tickets, citas, expedientes y registros han sido eliminados."
      });
    } catch (e: any) {
      console.error("Error al purgar la base de datos:", e);
      return res.status(500).json({ success: false, error: "Error al purgar la base de datos: " + e.message });
    }
  });

  // HTTP Endpoint to Confirm Attendance via Email Links
  app.get("/api/appointment/confirm", async (req, res) => {
    const code = req.query.code as string;
    const id = req.query.id as string;
    const host = req.get("host") || "localhost:3000";

    const appointments = await getDBAppointments();
    const appointment = appointments.find(a => a.id === id || a.codigoTransaccion === code);

    if (!appointment) {
      return res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h1 style="color: #dc2626;">Cita No Encontrada</h1>
          <p>No pudimos localizar la cita con el código proporcionado. Por favor, revise el enlace o contacte a soporte.</p>
          <a href="https://${host}" style="background-color:#1e3a8a; color:white; padding:10px 20px; text-decoration:none; border-radius:4px;">Ir al Portal</a>
        </div>
      `);
    }

    // Update status to confirm attendance ('asistire')
    appointment.estado = 'asistire';
    
    const allAppts = getAppointments();
    const match = allAppts.find(a => a.id === appointment.id);
    if (match) {
      match.estado = 'asistire';
      saveAppointments(allAppts);
    }
    if (isPgConfigured && pgPool) {
      try {
        await pgPool.query(`UPDATE appointments SET estado = 'asistire' WHERE identificacion = $1`, [appointment.id]);
      } catch (pgErr: any) {
        console.error("[Azure PostgreSQL] Error updating attendance status:", pgErr.message);
      }
    }

    const iconHtml = `
      <svg style="width: 32px; height: 32px; color: #ffffff;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    `;
    
    const detailsHtml = `
      <div class="details-box">
        <div class="details-title">Detalles de la Cita Confirmada</div>
        <div class="details-row">
          <span class="details-label">Código de Cita:</span>
          <span class="details-value" style="color: #b45309; font-family: monospace;">${appointment.codigoTransaccion}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Ciudadano:</span>
          <span class="details-value">${appointment.identificacion}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Servicio:</span>
          <span class="details-value">${appointment.subServicioNombre}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Sede / Oficina:</span>
          <span class="details-value">${appointment.sucursalNombre}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Fecha Programada:</span>
          <span class="details-value">${appointment.fecha}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Hora de Atención:</span>
          <span class="details-value" style="color: #1d4ed8;">${appointment.hora}</span>
        </div>
      </div>
      <p style="font-size: 12.5px; color: #475569; line-height: 1.6; text-align: center; margin-bottom: 24px;">
        Su asistencia ha sido <strong>confirmada de forma oficial</strong>. Su turno está asegurado y agendado prioritariamente. Agradecemos su puntualidad (asista 15 minutos antes).
      </p>
    `;

    const htmlResponse = renderStatusPage(
      "Asistencia Confirmada",
      "¡Gracias por confirmar! Le esperamos para su atención.",
      iconHtml,
      "#059669", // emerald-600
      detailsHtml,
      host
    );

    res.send(htmlResponse);
  });

  // HTTP Endpoint to Cancel Appointment via Email Links
  app.get("/api/appointment/cancel", async (req, res) => {
    const code = req.query.code as string;
    const id = req.query.id as string;
    const host = req.get("host") || "localhost:3000";

    const appointments = await getDBAppointments();
    const appointment = appointments.find(a => a.id === id || a.codigoTransaccion === code);

    if (!appointment) {
      return res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h1 style="color: #dc2626;">Cita No Encontrada</h1>
          <p>No pudimos localizar la cita con el código proporcionado.</p>
          <a href="https://${host}" style="background-color:#1e3a8a; color:white; padding:10px 20px; text-decoration:none; border-radius:4px;">Ir al Portal</a>
        </div>
      `);
    }

    // Update status to cancel 'cancelada'
    appointment.estado = 'cancelada';
    
    const allAppts = getAppointments();
    const match = allAppts.find(a => a.id === appointment.id);
    if (match) {
      match.estado = 'cancelada';
      saveAppointments(allAppts);
    }
    if (isPgConfigured && pgPool) {
      try {
        await pgPool.query(`UPDATE appointments SET estado = 'cancelada' WHERE identificacion = $1`, [appointment.id]);
      } catch (pgErr: any) {
        console.error("[Azure PostgreSQL] Error updating cancellation status:", pgErr.message);
      }
    }

    const iconHtml = `
      <svg style="width: 32px; height: 32px; color: #ffffff;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    `;
    
    const detailsHtml = `
      <div class="details-box">
        <div class="details-title">Cita Desprogramada</div>
        <div class="details-row">
          <span class="details-label">Código de Cita:</span>
          <span class="details-value" style="text-decoration: line-through; color: #dc2626; font-family: monospace;">${appointment.codigoTransaccion}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Trámite:</span>
          <span class="details-value">${appointment.subServicioNombre}</span>
        </div>
      </div>
      <p style="font-size: 12.5px; color: #475569; line-height: 1.6; text-align: center; margin-bottom: 24px;">
        La cita ha sido <strong>cancelada correctamente</strong>. Su turno ha sido liberado para permitir que otros ciudadanos programen sus trámites. Puede volver a agendar en cualquier momento.
      </p>
    `;

    const htmlResponse = renderStatusPage(
      "Cita Cancelada",
      "Su cita ha sido desprogramada de nuestro sistema.",
      iconHtml,
      "#dc2626", // red-600
      detailsHtml,
      host
    );

    res.send(htmlResponse);
  });

  // API Route to dispatch the 24h Reminder email with Confirm / Cancel options
  app.post("/api/send-reminder-email", async (req, res) => {
    try {
      const { 
        id,
        email, 
        codigoTransaccion, 
        categoriaNombre, 
        subServicioNombre, 
        fechaFormateada, 
        hora, 
        sucursalNombre, 
        sucursalDireccion, 
        identificacion, 
        telefono,
        requisitos = [],
        numeroSeguimiento,
        ticketTurnoCode
      } = req.body;

      if (!email) {
        return res.status(400).json({ error: "El correo electrónico es requerido." });
      }

      // Automatically register/update status on reminder send too!
      const appointments = await getDBAppointments();
      const existingIdx = appointments.findIndex(a => a.id === id || a.codigoTransaccion === codigoTransaccion);
      
      const serverCita: ServerCita = {
        id: id || `TE-${Date.now()}`,
        correo: email || "",
        codigoTransaccion: codigoTransaccion,
        categoriaNombre: categoryTranslation(categoriaNombre) || "",
        subServicioNombre: subServicioNombre || "",
        subServicioId: req.body.subServicioId || undefined,
        fecha: req.body.fecha || new Date().toISOString().split('T')[0],
        hora: hora || "",
        sucursalNombre: sucursalNombre || "",
        sucursalDireccion: sucursalDireccion || "",
        identificacion: identificacion || "",
        telefono: telefono || "",
        requisitos: requisitos || [],
        estado: existingIdx >= 0 ? appointments[existingIdx].estado : 'confirmada',
        fechaCreacion: existingIdx >= 0 ? appointments[existingIdx].fechaCreacion : new Date().toISOString(),
        numeroSeguimiento: numeroSeguimiento || undefined,
        datosPersonales: req.body.datosPersonales || undefined,
        nombre: req.body.nombre || (req.body.datosPersonales?.nombreCompleto) || ""
      };

      await safeUpsertAppointment({
        identificacion: serverCita.id,
        codigo_transaccion: serverCita.codigoTransaccion,
        fecha: serverCita.fecha,
        tiempo: serverCita.hora,
        fecha_creacion: serverCita.fechaCreacion,
        estado: existingIdx >= 0 ? appointments[existingIdx].estado : serverCita.estado,
        sucursal_id: req.body.sucursalId || "anc_main",
        sub_servicio_id: req.body.subServicioId || "ced_primera_vez",
        tipo_identificacion: serverCita.datosPersonales?.tipoIdentificacion || "Cedula",
        identificacion_ciudadano: serverCita.identificacion,
        ciudadano_identificacion: serverCita.identificacion,
        fecha_nacimiento: serverCita.datosPersonales?.fechaNacimiento || "2000-01-01",
        telefono: serverCita.telefono,
        correo: serverCita.correo,
        nombre_completo: serverCita.nombre || serverCita.datosPersonales?.nombreCompleto || "",
        numero_seguimiento: serverCita.numeroSeguimiento || null,
        primer_nombre: serverCita.datosPersonales?.primerNombre || null,
        segundo_nombre: serverCita.datosPersonales?.segundoNombre || null,
        primer_apellido: serverCita.datosPersonales?.primerApellido || null,
        segundo_apellido: serverCita.datosPersonales?.segundoApellido || null,
        pasaporte: serverCita.datosPersonales?.pasaporte || null,
        nacionalidad: serverCita.datosPersonales?.nacionalidad || null,
        numero_resolucion: serverCita.datosPersonales?.numeroResolucion || null,
        fecha_resolucion: serverCita.datosPersonales?.fechaResolucion || null
      });

      const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || "https";
      const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
      const logoAbsoluteUrl = `${protocol}://${host}/api/logo`;

      // Absolute links for confirming & canceling
      const confirmUrl = `${protocol}://${host}/api/appointment/confirm?code=${codigoTransaccion}&id=${serverCita.id}`;
      const cancelUrl = `${protocol}://${host}/api/appointment/cancel?code=${codigoTransaccion}&id=${serverCita.id}`;

      // Construct a highly polished, official HTML document for the reminder email
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Recordatorio de Cita Oficial: Cita en 24 Horas - Tribunal Electoral</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              background-color: #f8fafc;
              color: #1e293b;
              margin: 0;
              padding: 0;
              -webkit-font-smoothing: antialiased;
            }
            .wrapper {
              width: 100%;
              background-color: #f8fafc;
              padding: 40px 10px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
            }
            .top-stripe {
              height: 6px;
              width: 100%;
              font-size: 0;
              line-height: 0;
            }
            .stripe-red {
              display: inline-block;
              width: 33.33%;
              height: 6px;
              background-color: #dc2626;
            }
            .stripe-blue {
              display: inline-block;
              width: 33.33%;
              height: 6px;
              background-color: #1e3a8a;
            }
            .stripe-white {
              display: inline-block;
              width: 33.33%;
              height: 6px;
              background-color: #ffffff;
            }
            .header {
              background-color: #ffffff;
              padding: 24px;
              text-align: center;
              color: #1e3a8a;
              border-bottom: 2px solid #f1f5f9;
            }
            .conf-banner {
              background-color: #fffbeb;
              border-bottom: 1px solid #fef3c7;
              padding: 20px 16px;
              text-align: center;
            }
            .conf-title {
              color: #b45309;
              font-weight: 800;
              font-size: 18px;
              margin: 0 0 4px 0;
              text-transform: uppercase;
              letter-spacing: 0.02em;
            }
            .conf-desc {
              color: #92400e;
              font-size: 13px;
              font-weight: 600;
              margin: 0;
            }
            .code-box {
              background-color: #fffbeb;
              border: 1px dashed #fcd34d;
              border-radius: 6px;
              padding: 12px 16px;
              margin: 20px;
              text-align: center;
            }
            .code-label {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #92400e;
              margin: 0 0 2px 0;
            }
            .code-value {
              font-family: monospace;
              font-weight: 900;
              font-size: 20px;
              color: #b45309;
              letter-spacing: 1px;
            }
            .content-body {
              padding: 0 24px 20px 24px;
            }
            .section-title {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #64748b;
              margin: 16px 0 6px 0;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 4px;
            }
            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
            }
            .info-table td {
              padding: 6px 0;
              vertical-align: top;
            }
            .info-table .label {
              width: 35%;
              font-size: 12px;
              color: #64748b;
              font-weight: 600;
            }
            .info-table .value {
              width: 65%;
              font-size: 12px;
              color: #0f172a;
              font-weight: 700;
            }
            .action-box {
              background-color: #f8fafc;
              border: 2px solid #e2e8f0;
              border-radius: 8px;
              padding: 24px 16px;
              margin: 24px 0;
              text-align: center;
            }
            .action-title {
              font-size: 14px;
              font-weight: bold;
              color: #1e3a8a;
              text-transform: uppercase;
              margin-bottom: 14px;
              letter-spacing: 0.05em;
            }
            .btn-confirm {
              display: inline-block;
              background-color: #059669;
              color: #ffffff !important;
              text-decoration: none;
              padding: 12px 24px;
              font-size: 13px;
              font-weight: 800;
              border-radius: 5px;
              text-transform: uppercase;
              margin: 6px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .btn-cancel {
              display: inline-block;
              background-color: #dc2626;
              color: #ffffff !important;
              text-decoration: none;
              padding: 12px 24px;
              font-size: 13px;
              font-weight: 800;
              border-radius: 5px;
              text-transform: uppercase;
              margin: 6px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .reminder-box {
              background-color: #fffbeb;
              border: 1px solid #fde68a;
              border-radius: 6px;
              padding: 16px;
              margin: 20px 24px;
            }
            .reminder-title {
              font-size: 12px;
              font-weight: 800;
              color: #92400e;
              text-transform: uppercase;
              margin: 0 0 8px 0;
            }
            .reminder-list {
              padding-left: 16px;
              margin: 0;
              font-size: 11.5px;
              color: #78350f;
              line-height: 1.6;
            }
            .reminder-list li {
              margin-bottom: 4px;
              font-weight: 500;
            }
            .reminder-list .highlight {
              font-weight: 800;
              color: #000000;
            }
            .footer-notes {
              text-align: center;
              padding: 20px;
              font-size: 10px;
              color: #94a3b8;
              background-color: #f1f5f9;
              border-top: 1px solid #e2e8f0;
            }
            .footer-notes a {
              color: #1e3a8a;
              text-decoration: none;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="top-stripe">
                <span class="stripe-red"></span><span class="stripe-blue"></span><span class="stripe-white"></span>
              </div>
              
              <div class="header">
                <img 
                  src="${logoAbsoluteUrl}" 
                  alt="Tribunal Electoral" 
                  style="max-height: 52px; width: auto;"
                />
              </div>

              <div class="conf-banner">
                <h3 class="conf-title">⏳ RECORDATORIO: SU CITA ES EN 24 HORAS</h3>
                <p class="conf-desc">Su turno programado vencerá si no asiste a tiempo o confirma.</p>
              </div>

              <div class="code-box">
                <div class="code-label">Código de Cita</div>
                <div class="code-value">${codigoTransaccion}</div>
                ${ticketTurnoCode ? `
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #fcd34d;">
                  <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #92400e; display: block; letter-spacing: 0.05em;">Turno Asignado para Pantallas TV:</span>
                  <span style="font-family: monospace; font-weight: 900; font-size: 24px; color: #b45309; display: inline-block; margin-top: 2px;">${ticketTurnoCode}</span>
                  <span style="display: block; font-size: 11px; color: #047857; font-weight: bold; margin-top: 2px;">⭐ ATENCIÓN PREFERENTE / CITA PREVIA</span>
                </div>
                ` : ''}
              </div>

              <div class="content-body">
                <div class="section-title">Detalles Fundamentales de la Cita</div>
                <table class="info-table">
                  <tr>
                    <td class="label">Trámite Exacto:</td>
                    <td class="value" style="color: #1d4ed8;">${subServicioNombre}</td>
                  </tr>
                  <tr>
                    <td class="label">Sede / Sucursal:</td>
                    <td class="value">${sucursalNombre}</td>
                  </tr>
                  <tr>
                    <td class="label">Dirección:</td>
                    <td class="value" style="font-weight: 500; font-size: 11.5px; color: #475569;">${sucursalDireccion}</td>
                  </tr>
                  <tr>
                    <td class="label">Fecha Programada:</td>
                    <td class="value" style="color: #dc2626;">${fechaFormateada}</td>
                  </tr>
                  <tr>
                    <td class="label">Hora Pactada:</td>
                    <td class="value">${hora}</td>
                  </tr>
                </table>

                <!-- Action Confirmation buttons -->
                <div class="action-box">
                  <div class="action-title">⚠️ ¿Asistirá a esta cita programada?</div>
                  <p style="font-size:12px; color:#475569; margin-top:-6px; margin-bottom:18px;">Por favor, es de suma importancia confirmar si podrá asistir para mantener su reserva o liberarla para otro ciudadano.</p>
                  <div>
                    <a href="${confirmUrl}" style="display: inline-block; background-color: #059669; color: #ffffff !important; text-decoration: none; padding: 12px 24px; font-size: 13px; font-weight: 800; border-radius: 5px; text-transform: uppercase; margin: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Sí, asistiré</a>
                    <a href="${cancelUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff !important; text-decoration: none; padding: 12px 24px; font-size: 13px; font-weight: 800; border-radius: 5px; text-transform: uppercase; margin: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">No, cancelar cita</a>
                  </div>
                </div>

                <div class="section-title">Datos del Solicitante</div>
                <table class="info-table" style="margin-bottom: 0;">
                  <tr>
                    <td class="label" style="font-size:11px;">Identificación:</td>
                    <td class="value" style="font-size:11px;">${identificacion}</td>
                  </tr>
                  <tr>
                    <td class="label" style="font-size:11px;">Correo:</td>
                    <td class="value" style="font-size:11px;">${email}</td>
                  </tr>
                </table>
              </div>

              <div class="reminder-box">
                <div class="reminder-title">⚠️ RECORDATORIOS OBLIGATORIOS</div>
                <ul class="reminder-list">
                  ${requisitos.map((req: string) => `<li>${req}</li>`).join("")}
                  <li class="highlight">Favor estar presente físicamente con un mínimo de 15 minutos antes de la hora pactada.</li>
                </ul>
              </div>

              <div class="footer-notes">
                <p>Este es un recordatorio oficial generado automáticamente por el Portal de Trámites del Tribunal Electoral de Panamá.</p>
                <p>Línea gratuita de atención: <strong>311</strong> • Teléfono alterno: <strong>+507 507-8000</strong>.</p>
                <p><a href="https://www.tribunal-electoral.gob.pa">www.tribunal-electoral.gob.pa</a></p>
              </div>

            </div>
          </div>
        </body>
        </html>
      `;

      if (isOutlookConfigured) {
        console.log(`[Email Service - Reminder] Sending 24h reminder email to ${email} (From: ${outlookUser})...`);
        try {
          const info = await sendOutlookEmail(
            email,
            `Recordatorio de Cita Oficial: Mañana a las ${hora} - Tribunal Electoral`,
            htmlContent
          );
          console.log("[Email Service - Reminder] Email sent successfully via Outlook SMTP:", info.messageId);
          return res.json({ 
            success: true, 
            message: "Se ha enviado el recordatorio de 24h a su correo electrónico exitosamente.",
            simulated: false,
            confirmUrl,
            cancelUrl
          });
        } catch (error: any) {
          console.error("[Email Service - Reminder] Outlook sending error:", error);
          return res.status(400).json({ 
            success: false, 
            error: `Error al enviar recordatorio por Outlook: ${error.message || error}`,
            errorType: "smtp_error",
            htmlPreview: htmlContent,
            confirmUrl,
            cancelUrl
          });
        }
      } else {
        console.log(`[Email Service - Reminder] Simulating reminder sent to ${email} (no OUTLOOK_USER configured).`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return res.json({
          success: true,
          message: "Se simuló el envío del recordatorio correctamente (modo sin credenciales de Outlook).",
          simulated: true,
          htmlPreview: htmlContent,
          confirmUrl,
          cancelUrl
        });
      }

    } catch (e: any) {
      console.error("[Email Service - Reminder] Error sending reminder:", e);
      res.status(500).json({ error: "Ocurrió un error interno en el servidor" });
    }
  });

  // Helper inside routes to translate category strings safely if needed
  function categoryTranslation(cat: string): string {
    if (cat === "extranjeria") return "Trámites de Extranjería";
    if (cat === "organizacion_electoral") return "Organización Electoral";
    if (cat === "cedulacion") return "Cedulación";
    if (cat === "registro_civil") return "Registro Civil";
    return cat || "Trámites";
  }

  // ==========================================
  // GESTIÓN DE USUARIOS POR EL SUPER ADMIN (PROTEGIDO)
  // ==========================================
  app.get("/api/users", verifyAdminSession, async (req, res) => {
    try {
      const users = await getDBUsers();
      return res.json({ success: true, users });
    } catch (e: any) {
      console.error("Error fetching users list:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/users", verifyAdminSession, async (req, res) => {
    try {
      const { username, password, role, nombre } = req.body;
      if (!username || !password || !role || !nombre) {
        return res.status(400).json({ success: false, error: "Datos incompletos para el usuario." });
      }

      const cleanUsername = String(username).trim().toLowerCase();
      // Validate length or patterns can be added
      if (cleanUsername.length < 3) {
        return res.status(400).json({ success: false, error: "El nombre de usuario debe tener al menos 3 caracteres." });
      }

      const localUsers = getUsers();
      const existingIdx = localUsers.findIndex(u => u.username.toLowerCase() === cleanUsername);

      const newUser: ServerUser = {
        username: cleanUsername,
        password: String(password).trim(),
        role: role,
        nombre: String(nombre).trim(),
        fechaCreacion: existingIdx >= 0 ? localUsers[existingIdx].fechaCreacion : new Date().toISOString()
      };

      // Always save to local JSON file
      if (existingIdx >= 0) {
        localUsers[existingIdx] = newUser;
      } else {
        localUsers.push(newUser);
      }
      saveUsers(localUsers);

      // Save to Azure PostgreSQL if configured
      if (isPgConfigured && pgPool) {
        try {
          await pgPool.query(
            `INSERT INTO usuarios (username, password, role, nombre, must_change_password)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (username) DO UPDATE SET
               password = EXCLUDED.password, role = EXCLUDED.role, nombre = EXCLUDED.nombre`,
            [cleanUsername, String(password).trim(), role, String(nombre).trim(), false]
          );
        } catch (pgErr: any) {
          console.error("[Azure PostgreSQL] Error saving user:", pgErr.message);
        }
      }

      return res.json({ success: true, user: newUser });
    } catch (e: any) {
      console.error("Error registering user:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete("/api/users/:username", verifyAdminSession, async (req, res) => {
    try {
      const usernameToDelete = String(req.params.username).trim().toLowerCase();
      
      // Prevent deleting core admins to avoid getting locked out
      if (usernameToDelete === "adminte") {
        return res.status(400).json({ success: false, error: "No es posible eliminar el Super Administrador principal (adminte)." });
      }

      // Always delete from local database
      const localUsers = getUsers();
      const filteredUsers = localUsers.filter(u => u.username.toLowerCase() !== usernameToDelete);
      saveUsers(filteredUsers);

      // Delete from Azure PostgreSQL if configured
      if (isPgConfigured && pgPool) {
        try {
          await pgPool.query(`DELETE FROM usuarios WHERE LOWER(username) = $1`, [usernameToDelete]);
        } catch (pgErr: any) {
          console.error("[Azure PostgreSQL] Error deleting user:", pgErr.message);
        }
      }

      return res.json({ success: true, message: `Usuario '${usernameToDelete}' eliminado exitosamente.` });
    } catch (e: any) {
      console.error("Error deleting user:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // Endpoint público para cambio de contraseña (primer ingreso o reseteo obligado)
  app.post("/api/change-password", async (req, res) => {
    try {
      const { username, currentPassword, newPassword } = req.body;
      if (!username || !newPassword) {
        return res.status(400).json({ success: false, error: "Nombre de usuario y nueva contraseña requeridos." });
      }

      const cleanNewPass = String(newPassword).trim();
      if (cleanNewPass.length < 4) {
        return res.status(400).json({ success: false, error: "La nueva contraseña debe tener al menos 4 caracteres." });
      }

      const cleanUsername = String(username).trim().toLowerCase();
      const localUsers = getUsers();
      const userIdx = localUsers.findIndex(u => u.username.toLowerCase() === cleanUsername);

      if (userIdx >= 0) {
        if (currentPassword && localUsers[userIdx].password && localUsers[userIdx].password !== currentPassword) {
          return res.status(401).json({ success: false, error: "La contraseña actual ingresada es incorrecta." });
        }
        localUsers[userIdx].password = cleanNewPass;
        localUsers[userIdx].mustChangePassword = false;
        saveUsers(localUsers);

        if (isPgConfigured && pgPool) {
          try {
            await pgPool.query(
              `UPDATE usuarios SET password = $1, must_change_password = FALSE WHERE LOWER(username) = $2`,
              [cleanNewPass, cleanUsername]
            );
          } catch (pgErr: any) {
            console.error("[Azure PostgreSQL] Error updating password:", pgErr.message);
          }
        }

        return res.json({ success: true, message: "Contraseña actualizada con éxito." });
      } else {
        const newUser: ServerUser = {
          username: cleanUsername,
          password: cleanNewPass,
          role: "super",
          nombre: cleanUsername,
          fechaCreacion: new Date().toISOString(),
          mustChangePassword: false
        };
        localUsers.push(newUser);
        saveUsers(localUsers);
        return res.json({ success: true, message: "Contraseña actualizada exitosamente." });
      }
    } catch (e: any) {
      console.error("Error updating password:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // ==========================================
  // API TICKETS & TURNOS EN TIEMPO REAL (PostgreSQL + Memory Sync)
  // ==========================================

  // Live in-memory cache to guarantee instantaneous zero-delay sync across Kiosk, TV, Agents and Mobile Tracker
  const memoryTicketsStore: Map<string, any> = new Map();
  const memoryModulosStore: Map<string, any> = new Map();

  // Helper normalizers for seamless synchronization across Kiosk, TV and Agents
  function normalizeTicketStatus(st: any): string {
    const s = String(st || "").toUpperCase();
    if (s === "ESPERA" || s === "WAITING") return "WAITING";
    if (s === "LLAMADO" || s === "CALLING") return "CALLING";
    if (s === "ATENDIENDO" || s === "ATTENDING" || s === "ATENCION") return "ATTENDING";
    if (s === "COMPLETADO" || s === "FINALIZADO" || s === "COMPLETED") return "COMPLETED";
    if (s === "CANCELADO" || s === "MISSED" || s === "PERDIDO") return "MISSED";
    return "WAITING";
  }

  function normalizeTicketPhase(ph: any, serviceType?: string): string {
    const p = String(ph || "").toUpperCase();
    if (p === "TRIADA" || p === "FOTOGRAFIA" || p === "FOTO") return "TRIADA";
    return "CAJA";
  }

  function normalizeServiceType(st: any): string {
    const s = String(st || "").toUpperCase();
    if (s.includes("ELECTORAL") || s === "O") return "ELECTORAL";
    if (s.includes("REGISTRO") || s === "REG" || s.includes("CERTIFICACION")) return "REGISTRO";
    if (s.includes("EXTRANJERIA") || s === "E" || s.includes("EXT")) return "EXTRANJERIA";
    return "CEDULACION";
  }

  // 0. Hora Oficial del Servidor (Sincronización TV, Kioskos y Monitores - Panama UTC-5)
  app.get("/api/server-time", (req, res) => {
    const now = new Date();
    return res.json({
      success: true,
      timestamp: now.getTime(),
      iso: now.toISOString(),
      timezone: "America/Panama",
      offsetMinutes: -300
    });
  });

  // 1. Obtener todos los tickets de una sucursal o globales
  app.get("/api/tickets", async (req, res) => {
    try {
      const sucursalId = (req.query.office as string) || (req.query.sucursal_id as string) || "OFF-1";
      
      let dbTickets: any[] = [];
      let dbQueryExecuted = false;

      if (isPgConfigured && pgPool) {
        try {
          const query = sucursalId === "ALL" 
            ? `SELECT * FROM tickets ORDER BY hora_emision ASC`
            : `SELECT * FROM tickets WHERE sucursal_id = $1 ORDER BY hora_emision ASC`;
          const params = sucursalId === "ALL" ? [] : [sucursalId];
          const dbRes = await pgPool.query(query, params);
          dbQueryExecuted = true;
          
          if (dbRes.rows && dbRes.rows.length > 0) {
            dbTickets = dbRes.rows.map((r: any) => {
              const svc = normalizeServiceType(r.tipo_tramite);
              const phase = normalizeTicketPhase(r.fase_actual || (r.modulo_asignado ? "CAJA" : (svc === "REGISTRO" ? "TRIADA" : "CAJA")), svc);
              const st = normalizeTicketStatus(r.estado);
              const cTime = r.hora_emision ? new Date(r.hora_emision).getTime() : Date.now();
              const callTime = r.hora_llamado ? new Date(r.hora_llamado).getTime() : undefined;
              const attTime = r.hora_inicio_atencion ? new Date(r.hora_inicio_atencion).getTime() : undefined;
              const compTime = r.hora_fin_atencion ? new Date(r.hora_fin_atencion).getTime() : undefined;

              return {
                id: r.id,
                numberCode: r.numero_ticket,
                number: parseInt(String(r.numero_ticket).replace(/\D/g, ""), 10) || 1,
                name: r.nombre || "Ciudadano",
                serviceType: svc,
                status: st,
                currentPhase: phase,
                phaseHistory: [{ phase, timestamp: cTime }],
                createdAt: cTime,
                calledAt: callTime,
                attendedAt: attTime,
                completedAt: compTime,
                assignedCubicle: r.modulo_asignado || null,
                assignedCubicleId: r.modulo_asignado || null,
                assignedAgent: r.agente_asignado || null,
                priority: !!r.es_prioritario,
                isAppointment: !!r.es_cita,
                procedure: r.sub_tramite || "",
                sucursalId: r.sucursal_id
              };
            });
          }
        } catch (pgErr: any) {
          console.warn("[PostgreSQL] Error fetching tickets from DB:", pgErr.message);
          dbQueryExecuted = false;
        }
      }

      if (dbQueryExecuted) {
        // PostgreSQL is authoritative. Sync memoryTicketsStore to reflect the true state of DB
        if (sucursalId === "ALL") {
          memoryTicketsStore.clear();
          dbTickets.forEach(t => memoryTicketsStore.set(t.id, t));
        } else {
          for (const [id, t] of memoryTicketsStore.entries()) {
            if ((t.sucursalId || "OFF-1") === sucursalId) {
              memoryTicketsStore.delete(id);
            }
          }
          dbTickets.forEach(t => memoryTicketsStore.set(t.id, t));
        }

        const finalTickets = dbTickets.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        return res.json({ success: true, tickets: finalTickets, serverTime: Date.now() });
      }

      // If PostgreSQL not configured or unreachable, use memory cache
      const allMemTickets = Array.from(memoryTicketsStore.values());
      const filteredMemTickets = sucursalId === "ALL"
        ? allMemTickets
        : allMemTickets.filter(t => (t.sucursalId || "OFF-1") === sucursalId);

      const finalTickets = filteredMemTickets.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      return res.json({ success: true, tickets: finalTickets, serverTime: Date.now() });
    } catch (e: any) {
      console.error("Error in GET /api/tickets:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // DELETE /api/tickets - Permite eliminar tickets de una o todas las sucursales
  app.delete("/api/tickets", async (req, res) => {
    try {
      const sucursalId = (req.query.office as string) || (req.query.sucursal_id as string);
      
      if (isPgConfigured && pgPool) {
        try {
          if (sucursalId && sucursalId !== "ALL") {
            await pgPool.query("DELETE FROM tickets WHERE sucursal_id = $1", [sucursalId]);
            await pgPool.query("DELETE FROM tracking_sesiones_moviles WHERE ticket_id NOT IN (SELECT id FROM tickets)");
          } else {
            await pgPool.query("DELETE FROM tickets");
            await pgPool.query("DELETE FROM tracking_sesiones_moviles");
          }
        } catch (pgErr: any) {
          console.error("[PostgreSQL] Error deleting tickets:", pgErr.message);
        }
      }

      if (sucursalId && sucursalId !== "ALL") {
        for (const [id, t] of memoryTicketsStore.entries()) {
          if ((t.sucursalId || "OFF-1") === sucursalId) {
            memoryTicketsStore.delete(id);
          }
        }
      } else {
        memoryTicketsStore.clear();
      }

      return res.json({ success: true, message: "Tickets eliminados correctamente de la base de datos y memoria." });
    } catch (e: any) {
      console.error("Error in DELETE /api/tickets:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // 2. Crear o actualizar un ticket (Kiosko / Agentes / TV)
  app.post("/api/tickets", async (req, res) => {
    try {
      const {
        id,
        numberCode,
        name,
        serviceType,
        procedure,
        priority = false,
        isAppointment = false,
        sucursalId = "OFF-1",
        status = "WAITING",
        currentPhase = "CAJA",
        assignedCubicle,
        assignedCubicleId,
        assignedAgent,
        calledAt,
        attendedAt,
        completedAt,
        phaseHistory,
        createdAt = Date.now()
      } = req.body;

      if (!id || !numberCode) {
        return res.status(400).json({ success: false, error: "id y numberCode son requeridos" });
      }

      const normService = normalizeServiceType(serviceType);
      const normStatus = normalizeTicketStatus(status);
      const normPhase = normalizeTicketPhase(currentPhase, normService);
      const cubId = assignedCubicleId || assignedCubicle || null;
      const tCreatedAt = typeof createdAt === "number" ? createdAt : (createdAt ? new Date(createdAt).getTime() : Date.now());
      const tCalledAt = calledAt ? (typeof calledAt === "number" ? calledAt : new Date(calledAt).getTime()) : undefined;
      const tAttendedAt = attendedAt ? (typeof attendedAt === "number" ? attendedAt : new Date(attendedAt).getTime()) : undefined;
      const tCompletedAt = completedAt ? (typeof completedAt === "number" ? completedAt : new Date(completedAt).getTime()) : undefined;

      const ticketPayload = {
        id: String(id),
        numberCode: String(numberCode),
        number: parseInt(String(numberCode).replace(/\D/g, ""), 10) || 1,
        name: name || "Ciudadano",
        serviceType: normService,
        procedure: procedure || "",
        priority: !!priority,
        isAppointment: !!isAppointment,
        sucursalId: sucursalId || "OFF-1",
        status: normStatus,
        currentPhase: normPhase,
        phaseHistory: Array.isArray(phaseHistory) && phaseHistory.length > 0 ? phaseHistory : [{ phase: normPhase, timestamp: tCreatedAt }],
        assignedCubicle: cubId,
        assignedCubicleId: cubId,
        assignedAgent: assignedAgent || null,
        calledAt: tCalledAt,
        attendedAt: tAttendedAt,
        completedAt: tCompletedAt,
        createdAt: tCreatedAt
      };

      // Always save to memory store immediately
      memoryTicketsStore.set(id, ticketPayload);

      if (isPgConfigured && pgPool) {
        try {
          await pgPool.query(
            `INSERT INTO tickets (
               id, numero_ticket, tipo_tramite, sub_tramite, nombre, es_prioritario, es_cita,
               sucursal_id, estado, fase_actual, modulo_asignado, agente_asignado, hora_llamado, hora_inicio_atencion, hora_fin_atencion, hora_emision
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
             ON CONFLICT (id) DO UPDATE SET
               numero_ticket = EXCLUDED.numero_ticket,
               tipo_tramite = EXCLUDED.tipo_tramite,
               sub_tramite = EXCLUDED.sub_tramite,
               nombre = EXCLUDED.nombre,
               es_prioritario = EXCLUDED.es_prioritario,
               es_cita = EXCLUDED.es_cita,
               sucursal_id = EXCLUDED.sucursal_id,
               estado = EXCLUDED.estado,
               fase_actual = EXCLUDED.fase_actual,
               modulo_asignado = EXCLUDED.modulo_asignado,
               agente_asignado = EXCLUDED.agente_asignado,
               hora_llamado = COALESCE(EXCLUDED.hora_llamado, tickets.hora_llamado),
               hora_inicio_atencion = COALESCE(EXCLUDED.hora_inicio_atencion, tickets.hora_inicio_atencion),
               hora_fin_atencion = COALESCE(EXCLUDED.hora_fin_atencion, tickets.hora_fin_atencion)`,
            [
              id,
              numberCode,
              normService,
              procedure || "",
              name || "Ciudadano",
              !!priority,
              !!isAppointment,
              sucursalId || "OFF-1",
              normStatus,
              normPhase,
              cubId,
              assignedAgent || null,
              tCalledAt ? new Date(tCalledAt) : null,
              tAttendedAt ? new Date(tAttendedAt) : null,
              tCompletedAt ? new Date(tCompletedAt) : null,
              new Date(tCreatedAt)
            ]
          );

          // Si el ticket tiene código o seguimiento móvil, guardar/actualizar la sesión en tracking_sesiones_moviles
          await pgPool.query(
            `INSERT INTO tracking_sesiones_moviles (id, token_acceso, ticket_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (token_acceso) DO UPDATE SET
               ticket_id = EXCLUDED.ticket_id,
               ultimo_acceso = NOW()`,
            [`TRK-${id}`, numberCode.toUpperCase(), id]
          );
        } catch (pgErr: any) {
          console.error("[PostgreSQL] Error upserting ticket:", pgErr.message);
        }
      }

      return res.json({ success: true, message: "Ticket guardado en base de datos", ticket: ticketPayload, serverTime: Date.now() });
    } catch (e: any) {
      console.error("Error in POST /api/tickets:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // 3. Sincronización masiva de tickets de una sucursal (para pantallas de TV y Kioskos)
  app.post("/api/tickets/bulk-sync", async (req, res) => {
    try {
      const { sucursalId = "OFF-1", tickets = [] } = req.body;
      
      if (Array.isArray(tickets) && tickets.length > 0) {
        for (const t of tickets) {
          const normService = normalizeServiceType(t.serviceType || t.tipo_tramite);
          const normStatus = normalizeTicketStatus(t.status || t.estado);
          const normPhase = normalizeTicketPhase(t.currentPhase || t.fase_actual, normService);
          const cubId = t.assignedCubicleId || t.assignedCubicle || t.modulo_asignado || null;
          const tCreatedAt = t.createdAt ? (typeof t.createdAt === "number" ? t.createdAt : new Date(t.createdAt).getTime()) : Date.now();
          const tCalledAt = t.calledAt ? (typeof t.calledAt === "number" ? t.calledAt : new Date(t.calledAt).getTime()) : undefined;
          const tCompletedAt = t.completedAt ? (typeof t.completedAt === "number" ? t.completedAt : new Date(t.completedAt).getTime()) : undefined;

          const itemPayload = {
            id: t.id,
            numberCode: t.numberCode || t.numero_ticket,
            number: parseInt(String(t.numberCode || t.numero_ticket).replace(/\D/g, ""), 10) || 1,
            name: t.name || t.nombre || "Ciudadano",
            serviceType: normService,
            procedure: t.procedure || t.sub_tramite || "",
            priority: !!t.priority || !!t.es_prioritario,
            isAppointment: !!t.isAppointment || !!t.es_cita,
            sucursalId: sucursalId,
            status: normStatus,
            currentPhase: normPhase,
            phaseHistory: Array.isArray(t.phaseHistory) && t.phaseHistory.length > 0 ? t.phaseHistory : [{ phase: normPhase, timestamp: tCreatedAt }],
            assignedCubicle: cubId,
            assignedCubicleId: cubId,
            assignedAgent: t.assignedAgent || t.agente_asignado || null,
            calledAt: tCalledAt,
            completedAt: tCompletedAt,
            createdAt: tCreatedAt
          };
          memoryTicketsStore.set(t.id, itemPayload);

          if (isPgConfigured && pgPool) {
            try {
              await pgPool.query(
                `INSERT INTO tickets (
                   id, numero_ticket, tipo_tramite, sub_tramite, nombre, es_prioritario, es_cita,
                   sucursal_id, estado, fase_actual, modulo_asignado, agente_asignado, hora_llamado, hora_fin_atencion, hora_emision
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                 ON CONFLICT (id) DO UPDATE SET
                   estado = EXCLUDED.estado,
                   fase_actual = EXCLUDED.fase_actual,
                   es_cita = EXCLUDED.es_cita,
                   modulo_asignado = EXCLUDED.modulo_asignado,
                   agente_asignado = EXCLUDED.agente_asignado,
                   hora_llamado = COALESCE(EXCLUDED.hora_llamado, tickets.hora_llamado),
                   hora_fin_atencion = COALESCE(EXCLUDED.hora_fin_atencion, tickets.hora_fin_atencion)`,
                [
                  t.id,
                  t.numberCode || t.numero_ticket,
                  normService,
                  t.procedure || t.sub_tramite || "",
                  t.name || t.nombre || "Ciudadano",
                  !!t.priority || !!t.es_prioritario,
                  !!t.isAppointment || !!t.es_cita,
                  sucursalId,
                  normStatus,
                  normPhase,
                  cubId,
                  t.assignedAgent || t.agente_asignado || null,
                  tCalledAt ? new Date(tCalledAt) : null,
                  tCompletedAt ? new Date(tCompletedAt) : null,
                  new Date(tCreatedAt)
                ]
              );
            } catch (itemErr: any) {
              // continue batch
            }
          }
        }
      }

      return res.json({ success: true, count: memoryTicketsStore.size, serverTime: Date.now() });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // 4. Consulta de Seguimiento Móvil por Código (ej: ?view=tracker&ticket=CED-001)
  app.get("/api/tracker/:code", async (req, res) => {
    try {
      const code = String(req.params.code).trim().toUpperCase();
      
      // Check memory store first
      for (const t of memoryTicketsStore.values()) {
        if (t.numberCode?.toUpperCase() === code || t.id?.toUpperCase() === code) {
          const aheadCount = Array.from(memoryTicketsStore.values()).filter(
            other => (other.sucursalId || "OFF-1") === (t.sucursalId || "OFF-1") &&
                     other.serviceType === t.serviceType &&
                     (other.status === "espera" || other.status === "WAITING") &&
                     (other.createdAt || 0) < (t.createdAt || 0)
          ).length;

          return res.json({
            success: true,
            ticket: {
              ...t,
              horaEmision: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
              aheadCount
            }
          });
        }
      }

      if (isPgConfigured && pgPool) {
        const ticketRes = await pgPool.query(
          `SELECT * FROM tickets WHERE UPPER(numero_ticket) = $1 OR UPPER(id) = $1 LIMIT 1`,
          [code]
        );

        if (ticketRes.rows && ticketRes.rows.length > 0) {
          const row = ticketRes.rows[0];
          
          const queueRes = await pgPool.query(
            `SELECT COUNT(*) as ahead_count 
             FROM tickets 
             WHERE sucursal_id = $1 
               AND tipo_tramite = $2 
               AND estado = 'espera' 
               AND hora_emision < $3`,
            [row.sucursal_id, row.tipo_tramite, row.hora_emision]
          );
          
          const aheadCount = parseInt(queueRes.rows[0]?.ahead_count || "0", 10);

          return res.json({
            success: true,
            ticket: {
              id: row.id,
              numberCode: row.numero_ticket,
              name: row.nombre,
              serviceType: row.tipo_tramite,
              status: row.estado,
              assignedCubicle: row.modulo_asignado,
              assignedAgent: row.agente_asignado,
              horaEmision: row.hora_emision,
              horaLlamado: row.hora_llamado,
              sucursalId: row.sucursal_id,
              aheadCount
            }
          });
        }
      }

      return res.status(404).json({ success: false, error: "Ticket no encontrado" });
    } catch (e: any) {
      console.error("Error in tracker endpoint:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // 5. Estado de Ventanillas / Módulos en Vivo (Para TV y Monitores)
  app.get("/api/modulos", async (req, res) => {
    try {
      const sucursalId = (req.query.office as string) || "OFF-1";
      if (isPgConfigured && pgPool) {
        const dbRes = await pgPool.query(`SELECT * FROM modulos_atencion WHERE sucursal_id = $1`, [sucursalId]);
        return res.json({ success: true, modulos: dbRes.rows || [] });
      }
      return res.json({ success: true, modulos: [] });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/modulos/status", async (req, res) => {
    try {
      const { id, nombre, sucursalId = "OFF-1", tipoServicio = "cedulacion", agenteActual, ticketActualId, estado } = req.body;
      if (!id || !nombre) {
        return res.status(400).json({ success: false, error: "id y nombre requeridos" });
      }

      if (isPgConfigured && pgPool) {
        await pgPool.query(
          `INSERT INTO modulos_atencion (id, nombre, sucursal_id, tipo_servicio, agente_actual, ticket_actual_id, estado, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (id) DO UPDATE SET
             nombre = EXCLUDED.nombre,
             sucursal_id = EXCLUDED.sucursal_id,
             tipo_servicio = EXCLUDED.tipo_servicio,
             agente_actual = EXCLUDED.agente_actual,
             ticket_actual_id = EXCLUDED.ticket_actual_id,
             estado = EXCLUDED.estado,
             updated_at = NOW()`,
          [id, nombre, sucursalId, tipoServicio, agenteActual || null, ticketActualId || null, estado || "disponible"]
        );
      }
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // Vite middleware setup for assets and hot builds under development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, locate the static dist folder reliably
    let distPath = path.join(process.cwd(), "dist");
    if (!fs.existsSync(path.join(distPath, "index.html")) && fs.existsSync(path.join(__dirname, "index.html"))) {
      distPath = __dirname;
    } else if (!fs.existsSync(path.join(distPath, "index.html")) && fs.existsSync(path.join(__dirname, "..", "dist", "index.html"))) {
      distPath = path.join(__dirname, "..", "dist");
    }

    console.log(`[Production Static Mode] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Application dist/index.html not found. Please run 'npm run build' before starting IIS.");
      }
    });
  }

  const isNamedPipe = typeof PORT === "string" && (PORT.startsWith("\\\\.\\pipe\\") || PORT.startsWith("//./pipe/") || PORT.includes("pipe"));

  if (isNamedPipe) {
    app.listen(PORT, () => {
      console.log(`🚀 IIS (iisnode) worker started successfully on named pipe: ${PORT}`);
    });
  } else {
    const numericPort = parseInt(String(PORT), 10) || 3000;
    const sslKeyPath = process.env.SSL_KEY_PATH;
    const sslCertPath = process.env.SSL_CERT_PATH;

    if (sslKeyPath && sslCertPath && fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
      try {
        const options = {
          key: fs.readFileSync(sslKeyPath),
          cert: fs.readFileSync(sslCertPath)
        };
        https.createServer(options, app).listen(numericPort, "0.0.0.0", () => {
          console.log(`🔒 HTTPS Server listening on https://0.0.0.0:${numericPort}`);
        });
      } catch (sslErr: any) {
        console.error("❌ Error loading SSL certificates, falling back to HTTP:", sslErr.message);
        app.listen(numericPort, "0.0.0.0", () => {
          console.log(`⚡ Server listening on public port ${numericPort} (HTTP)`);
        });
      }
    } else {
      app.listen(numericPort, "0.0.0.0", () => {
        console.log(`⚡ Server listening on public port ${numericPort} (HTTP)`);
      });
    }
  }
}

startServer();
