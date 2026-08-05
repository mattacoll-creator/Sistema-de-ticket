import "dotenv/config";
import express from "express";
import helmet from "helmet";
import path from "path";
import { createServer as createViteServer } from "vite";
import dns from "dns";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// Fix Node warning about localhost dns resolution in some runtimes
dns.setDefaultResultOrder("ipv4first");

const DB_PATH = path.join(process.cwd(), "appointments-db.json");
const EXTRANJERIA_DB_PATH = path.join(process.cwd(), "extranjeria-db.json");
const EXTRANJERIA_CONFIG_PATH = path.join(process.cwd(), "extranjeria-config.json");
const TARDIA_CONFIG_PATH = path.join(process.cwd(), "tardia-config.json");
const USERS_DB_PATH = path.join(process.cwd(), "users-db.json");
const CMS_CONFIG_PATH = path.join(process.cwd(), "cms-config.json");

// ==========================================
// SUPABASE DATABASE WORKFLOW CONFIGS & INITIALIZER
// ==========================================
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

console.log(`[Supabase Status] Configured: ${isSupabaseConfigured}`);
if (isSupabaseConfigured) {
  console.log(`[Supabase Url]: ${supabaseUrl}`);
}

const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    }) 
  : null;

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

  const host = process.env.OUTLOOK_HOST || "smtp.office365.com";
  const port = parseInt(process.env.OUTLOOK_PORT || "587");
  const isSecure = port === 465;

  const transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: isSecure, // true only for port 465, false for 587/all others
    auth: {
      user: outlookUser,
      pass: outlookPass
    },
    connectionTimeout: 10000, // 10s connection timeout for fast failover diagnostics on port blocks
    greetingTimeout: 10000,
    socketTimeout: 15000,
    requireTLS: port === 587, // enforce STARTTLS upgrades for standard Outlook TLS ports
    tls: {
      // Modern Node.js versions (such as 18/20 on Vercel) deprecate and disable SSLv3 entirely inside OpenSSL.
      // Removing 'ciphers: "SSLv3"' ensures modern TLS protocol negotiation (TLS 1.2/1.3) works seamlessly.
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: `"Tribunal Electoral de Panamá" <${outlookUser}>`,
    to: to,
    subject: subject,
    html: html
  };

  return await transporter.sendMail(mailOptions);
}

// ==========================================
// DYNAMIC SUPABASE TABLE NAME DETECTORS (FALLBACKS)
// ==========================================
let resolvedAppointmentsTable: string | null = null;
async function getAppointmentsTableName(): Promise<string> {
  if (resolvedAppointmentsTable) return resolvedAppointmentsTable;
  if (!isSupabaseConfigured || !supabase) {
    resolvedAppointmentsTable = "otro";
    return "otro";
  }
  const candidates = ["otro", "equipo", "citas", "appointments"];
  for (const table of candidates) {
    try {
      const { error } = await supabase.from(table).select("identificacion").limit(1);
      if (!error || (error.message && !error.message.includes("Could not find") && !error.message.includes("does not exist") && !error.message.includes("public." + table))) {
        console.log(`[Supabase Detector] Detected appointments table name: '${table}'`);
        resolvedAppointmentsTable = table;
        return table;
      }
    } catch (e) {}
  }
  resolvedAppointmentsTable = "otro";
  return "otro";
}

let resolvedUsersTable: string | null = null;
async function getUsersTableName(): Promise<string> {
  if (resolvedUsersTable) return resolvedUsersTable;
  if (!isSupabaseConfigured || !supabase) {
    resolvedUsersTable = "usuarios";
    return "usuarios";
  }
  const candidates = ["usuarios", "usuario", "users", "usuarios_db"];
  for (const table of candidates) {
    try {
      const { error } = await supabase.from(table).select("nombre_usuario").limit(1);
      if (!error || (error.message && !error.message.includes("Could not find") && !error.message.includes("does not exist") && !error.message.includes("public." + table))) {
        console.log(`[Supabase Detector] Detected users table name: '${table}'`);
        resolvedUsersTable = table;
        return table;
      }
    } catch (e) {}
  }
  resolvedUsersTable = "usuarios";
  return "usuarios";
}

let resolvedSucursalesTable: string | null = null;
async function getSucursalesTableName(): Promise<string> {
  if (resolvedSucursalesTable) return resolvedSucursalesTable;
  if (!isSupabaseConfigured || !supabase) {
    resolvedSucursalesTable = "sucursales";
    return "sucursales";
  }
  const candidates = ["sucursales", "sucursal", "offices"];
  for (const table of candidates) {
    try {
      const { error } = await supabase.from(table).select("identificacion").limit(1);
      if (!error || (error.message && !error.message.includes("Could not find") && !error.message.includes("does not exist") && !error.message.includes("public." + table))) {
        console.log(`[Supabase Detector] Detected sucursales table name: '${table}'`);
        resolvedSucursalesTable = table;
        return table;
      }
    } catch (e) {}
  }
  resolvedSucursalesTable = "sucursales";
  return "sucursales";
}

let resolvedServiciosTable: string | null = null;
async function getServiciosTableName(): Promise<string> {
  if (resolvedServiciosTable) return resolvedServiciosTable;
  if (!isSupabaseConfigured || !supabase) {
    resolvedServiciosTable = "servicios_subservicios";
    return "servicios_subservicios";
  }
  const candidates = ["servicios_subservicios", "servicios", "subservicios", "services"];
  for (const table of candidates) {
    try {
      const { error } = await supabase.from(table).select("identificacion").limit(1);
      if (!error || (error.message && !error.message.includes("Could not find") && !error.message.includes("does not exist") && !error.message.includes("public." + table))) {
        console.log(`[Supabase Detector] Detected servicios table name: '${table}'`);
        resolvedServiciosTable = table;
        return table;
      }
    } catch (e) {}
  }
  resolvedServiciosTable = "servicios_subservicios";
  return "servicios_subservicios";
}

let resolvedExtranjeriaTable: string | null = null;
async function getExtranjeriaTableName(): Promise<string> {
  if (resolvedExtranjeriaTable) return resolvedExtranjeriaTable;
  if (!isSupabaseConfigured || !supabase) {
    resolvedExtranjeriaTable = "extranjeria_records";
    return "extranjeria_records";
  }
  const candidates = ["extranjeria_records", "extranjeria", "records_extranjeria", "migracion"];
  for (const table of candidates) {
    try {
      const { error } = await supabase.from(table).select("pasaporte").limit(1);
      if (!error || (error.message && !error.message.includes("Could not find") && !error.message.includes("does not exist") && !error.message.includes("public." + table))) {
        console.log(`[Supabase Detector] Detected extranjeria table name: '${table}'`);
        resolvedExtranjeriaTable = table;
        return table;
      }
    } catch (e) {}
  }
  resolvedExtranjeriaTable = "extranjeria_records";
  return "extranjeria_records";
}

interface ServerUser {
  username: string;
  password?: string;
  role: 'sencillo' | 'super' | 'extranjeria' | 'pasado_edad' | 'extranjeria_supervisor' | 'extranjeria_atencion' | 'extranjeria_cubiculo' | 'pasado_edad_supervisor' | 'pasado_edad_admin';
  nombre: string;
  fechaCreacion: string;
}

const DEFAULT_USERS: ServerUser[] = [
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

  if (isSupabaseConfigured && supabase) {
    getCmsTableName().then(tbl => {
      supabase!.from(tbl).upsert({
        id: "extranjeria_settings",
        config_data: config,
        updated_at: new Date().toISOString()
      }).then(({ error }) => {
        if (error) console.error("Error saving Extranjería config to Supabase:", error.message);
      });
    }).catch(err => console.error("Error detecting table name for Extranjería config:", err));
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

  if (isSupabaseConfigured && supabase) {
    getCmsTableName().then(tbl => {
      supabase!.from(tbl).upsert({
        id: "tardia_settings",
        config_data: config,
        updated_at: new Date().toISOString()
      }).then(({ error }) => {
        if (error) console.error("Error saving Tardía config to Supabase:", error.message);
      });
    }).catch(err => console.error("Error detecting table name for Tardía config:", err));
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
  logoUrl: "https://www.tribunal-electoral.gob.pa/wp-content/uploads/2026/06/Logo-TE-aniversario-256x256px-blanco-02.png",
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
    { id: "logo", name: "Logo Principal", url: "https://www.tribunal-electoral.gob.pa/wp-content/uploads/2026/06/Logo-TE-aniversario-256x256px-blanco-02.png" }
  ]
};

let resolvedCmsTable: string | null = null;
async function getCmsTableName(): Promise<string> {
  if (resolvedCmsTable) return resolvedCmsTable;
  if (!isSupabaseConfigured || !supabase) {
    resolvedCmsTable = "cms_config";
    return "cms_config";
  }
  const candidates = ["cms_config", "cmsconfig", "site_config", "settings"];
  for (const table of candidates) {
    try {
      const { error } = await supabase.from(table).select("id").limit(1);
      if (!error || (error.message && !error.message.includes("Could not find") && !error.message.includes("does not exist") && !error.message.includes("public." + table))) {
        console.log(`[Supabase Detector] Detected cms table name: '${table}'`);
        resolvedCmsTable = table;
        return table;
      }
    } catch (e) {}
  }
  resolvedCmsTable = "cms_config";
  return "cms_config";
}

async function getCmsConfig(): Promise<CmsConfig> {
  if (cachedCmsConfig) return cachedCmsConfig;

  if (isSupabaseConfigured && supabase) {
    try {
      const tbl = await getCmsTableName();
      const { data, error } = await supabase.from(tbl).select("*").eq("id", "site_settings").single();
      if (!error && data) {
        const loaded: any = data.config_data;
        const configObj = typeof loaded === "string" ? JSON.parse(loaded) : loaded;
        if (configObj && configObj.siteTitle) {
          cachedCmsConfig = configObj;
          return configObj;
        }
      }
    } catch (e) {
      console.warn("Error loading CMS settings from Supabase, falling back to local file:", e);
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

  if (isSupabaseConfigured && supabase) {
    try {
      const tbl = await getCmsTableName();
      const { error } = await supabase.from(tbl).upsert({
        id: "site_settings",
        config_data: config,
        updated_at: new Date().toISOString()
      });
      if (error) {
        console.warn("Supabase upsert for CMS configs returned error:", error.message);
        return false;
      }
      return true;
    } catch (e: any) {
      console.error("Error saving CMS to Supabase:", e.message || e);
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

// ==========================================
// SUPABASE SERVICES AND DATABASE MAPPING METHODS
// ==========================================

function categoryTranslation(cat: string): string {
  if (cat === "extranjeria") return "Trámites de Extranjería";
  if (cat === "organizacion_electoral") return "Organización Electoral";
  if (cat === "cedulacion") return "Cedulación";
  if (cat === "registro_civil") return "Registro Civil";
  return cat || "Trámites";
}

function mapDBRowToCita(row: any): ServerCita {
  const datosPersonales = row.datos_personales || {
    tipoIdentificacion: row.tipo_identificacion || "Cedula",
    identificacion: row.ciudadano_identificacion || row.identificacion_ciudadano || row.identificacion || "",
    fechaNacimiento: row.fecha_nacimiento || null,
    telefono: row.telefono || "",
    correo: row.correo || "",
    nombreCompleto: row.nombre_completo || "",
    numeroSeguimiento: row.numero_seguimiento || null,
    primerNombre: row.primer_nombre || null,
    segundoNombre: row.segundo_nombre || null,
    primerApellido: row.primer_apellido || null,
    segundoApellido: row.segundo_apellido || null,
    pasaporte: row.pasaporte || null,
    nacionalidad: row.nacionalidad || null,
    fechaResolucion: row.fecha_resolucion || null,
    numeroResolucion: row.numero_resolucion || null
  };

  return {
    id: row.identificacion,
    correo: row.correo || datosPersonales.correo || "",
    codigoTransaccion: row.codigo_transaccion,
    categoriaNombre: row.categoria_nombre || categoryTranslation(row.sub_servicio_id?.startsWith('ext_') ? 'extranjeria' : 'cedulacion'), 
    subServicioNombre: row.sub_servicio_nombre || row.sub_servicio_id || "",
    subServicioId: row.sub_servicio_id,
    fecha: row.fecha,
    hora: row.tiempo || row.hora || "",
    sucursalNombre: row.sucursal_nombre || row.sucursal_id || "Sucursal",
    sucursalDireccion: row.sucursal_direccion || "",
    identificacion: row.ciudadano_identificacion || row.identificacion_ciudadano || datosPersonales.identificacion || "",
    telefono: row.telefono || datosPersonales.telefono || "",
    requisitos: Array.isArray(row.requisitos) ? row.requisitos : [],
    estado: row.estado || 'confirmada',
    fechaCreacion: row.fecha_creacion,
    numeroSeguimiento: row.numero_seguimiento || datosPersonales.numeroSeguimiento || undefined,
    datosPersonales: datosPersonales,
    nombre: row.nombre_completo || datosPersonales.nombreCompleto || ""
  };
}

async function safeUpsertSupabase(tbl: string, row: any) {
  if (!supabase) return;
  const payload = { ...row };

  // Common cross-mapping fallback properties
  if (payload.tiempo !== undefined && payload.hora === undefined) {
    payload.hora = payload.tiempo;
  }
  if (payload.hora !== undefined && payload.tiempo === undefined) {
    payload.tiempo = payload.hora;
  }

  // Handle NOT NULL constraint on fecha_nacimiento
  if (tbl === "citas" || tbl === "appointments" || tbl === "otro" || tbl === "equipo") {
    if (!payload.fecha_nacimiento) {
      payload.fecha_nacimiento = "2000-01-01";
    }
  }

  const MAX_RETRIES = 15;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { error } = await supabase.from(tbl).upsert(payload);
    if (!error) {
      return;
    }

    const errMsg = error.message || "";

    // 1. Handle foreign key constraint violations on sub_servicio_id dynamically
    if (errMsg.includes("violates foreign key constraint") && errMsg.includes("sub_servicio_id")) {
      console.warn(`[Supabase Self-Healing] Foreign key violation on sub_servicio_id: "${payload.sub_servicio_id}". Attempting to fallback.`);
      try {
        const tblServs = await getServiciosTableName();
        const { data: validServices } = await supabase.from(tblServs).select("*");
        if (validServices && validServices.length > 0) {
          const firstValidId = validServices[0].identificacion || validServices[0].id || validServices[0].identificacion_servicio;
          if (firstValidId) {
            console.log(`[Supabase Self-Healing] Falling back sub_servicio_id from "${payload.sub_servicio_id}" to "${firstValidId}"`);
            payload.sub_servicio_id = firstValidId;
            continue;
          }
        }
      } catch (err) {
        console.error("[Supabase Self-Healing] Error trying to retrieve valid sub-services:", err);
      }
    }

    // 2. Handle foreign key constraint on sucursal_id
    if (errMsg.includes("violates foreign key constraint") && errMsg.includes("sucursal_id")) {
      console.warn(`[Supabase Self-Healing] Foreign key violation on sucursal_id: "${payload.sucursal_id}". Attempting to fallback.`);
      try {
        const tblSucs = await getSucursalesTableName();
        const { data: validSucs } = await supabase.from(tblSucs).select("*");
        if (validSucs && validSucs.length > 0) {
          const firstValidSucId = validSucs[0].identificacion || validSucs[0].id;
          if (firstValidSucId) {
            console.log(`[Supabase Self-Healing] Falling back sucursal_id from "${payload.sucursal_id}" to "${firstValidSucId}"`);
            payload.sucursal_id = firstValidSucId;
            continue;
          }
        }
      } catch (err) {
        console.error("[Supabase Self-Healing] Error trying to retrieve valid sucursales:", err);
      }
    }

    // 3. Handle non-existent columns (original pattern)
    const matchSchemaCache = errMsg.match(/Could not find the '([^']+)' column/i);
    const matchPostgresNotExist = errMsg.match(/column "([^"]+)" of relation "([^"]+)" does not exist/i);
    const matchPostgresField = errMsg.match(/column "([^"]+)" does not exist/i);

    const problematicColumn = matchSchemaCache?.[1] || matchPostgresNotExist?.[1] || matchPostgresField?.[1];

    if (problematicColumn && payload.hasOwnProperty(problematicColumn)) {
      console.log(`[Supabase Self-Healing] Table '${tbl}': Pruning non-existent column '${problematicColumn}' from payload.`);
      delete payload[problematicColumn];
    } else {
      console.error(`[Supabase Upsert Fatal] Table '${tbl}' error:`, errMsg, "Payload:", payload);
      throw error;
    }
  }
  throw new Error(`Exceeded maximum retries (${MAX_RETRIES}) attempting to heal schema mismatch on table '${tbl}'`);
}

async function safeUpsertAppointment(row: any) {
  const tbl = await getAppointmentsTableName();
  await safeUpsertSupabase(tbl, row);
}

async function getDBUsers(): Promise<ServerUser[]> {
  const localUsers = getUsers();
  if (isSupabaseConfigured && supabase) {
    try {
      const tbl = await getUsersTableName();
      const { data, error } = await supabase.from(tbl).select("*");
      if (error) {
        console.error("Error reading users from Supabase:", error.message);
        return localUsers; 
      }
      if (data && data.length > 0) {
        const supabaseUsers = data.map((row: any) => ({
          username: row.nombre_usuario,
          password: row.hash_contrasena,
          role: row.role as any,
          nombre: row.nombre,
          fechaCreacion: row.fecha_creacion
        }));

        const merged = [...localUsers];
        supabaseUsers.forEach((su: any) => {
          if (su.username) {
            const idx = merged.findIndex(u => u.username.toLowerCase() === su.username.toLowerCase());
            if (idx >= 0) {
              merged[idx] = su;
            } else {
              merged.push(su);
            }
          }
        });
        return merged;
      } else {
        for (const u of localUsers) {
          try {
            await safeUpsertSupabase(tbl, {
              identificacion: u.username,
              nombre_usuario: u.username,
              hash_contrasena: u.password || "",
              nombre: u.nombre,
              role: u.role,
              fecha_creacion: u.fechaCreacion
            });
          } catch (e: any) {
            console.warn(`[Supabase Seeder Warning] Failed to seed user ${u.username}:`, e.message || e);
          }
        }
      }
    } catch (err) {
      console.error("Catch in getDBUsers:", err);
    }
  }
  return localUsers;
}

async function getDBAppointments(): Promise<ServerCita[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const tbl = await getAppointmentsTableName();
      const { data, error } = await supabase.from(tbl).select("*");
      if (error) {
        console.error("Error fetching appointments from Supabase:", error.message);
        return getAppointments(); 
      }
      
      let sucs: any[] = [];
      let subs: any[] = [];
      try {
        const tblSucs = await getSucursalesTableName();
        const { data: resSucs } = await supabase.from(tblSucs).select("*");
        if (resSucs) sucs = resSucs;
      } catch (e) {
        console.warn("Failed to load sucursales map:", e);
      }
      try {
        const tblServs = await getServiciosTableName();
        const { data: resSubs } = await supabase.from(tblServs).select("*");
        if (resSubs) subs = resSubs;
      } catch (e) {
        console.warn("Failed to load servicios_subservicios map:", e);
      }
      
      const sucursalMap = new Map<string, any>(sucs?.map((s: any) => [s.identificacion, s]) || []);
      const subServicioMap = new Map<string, any>(subs?.map((s: any) => [s.identificacion, s]) || []);

      return data.map((row: any) => {
        const suc = sucursalMap.get(row.sucursal_id);
        const sub = subServicioMap.get(row.sub_servicio_id);
        
        const mapped = mapDBRowToCita(row);
        if (suc) {
          mapped.sucursalNombre = suc.nombre;
          mapped.sucursalDireccion = suc.direccion;
        }
        if (sub) {
          mapped.subServicioNombre = sub.nombre;
          mapped.requisitos = Array.isArray(sub.requisitos) ? sub.requisitos : [];
        }
        return mapped;
      });
    } catch (err) {
      console.error("Catch in getDBAppointments:", err);
    }
  }
  return getAppointments();
}

async function getDBExtranjeriaRecords(): Promise<ExtranjeriaRecord[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const tbl = await getExtranjeriaTableName();
      const { data, error } = await supabase.from(tbl).select("*");
      if (error) {
        console.error("Error reading extranjeria records from Supabase:", error.message);
        return getExtranjeriaRecords();
      }
      if (data && data.length > 0) {
        return data.map((row: any) => ({
          pasaporte: row.pasaporte,
          nombre: row.nombre,
          nacionalidad: row.nacionalidad,
          elegible: row.elegible,
          motivo: row.razon || row.motivo || ""
        }));
      } else {
        const localRecs = getExtranjeriaRecords();
        for (const r of localRecs) {
          try {
            await safeUpsertSupabase(tbl, {
              pasaporte: r.pasaporte,
              nombre: r.nombre,
              nacionalidad: r.nacionalidad || "No especificada",
              elegible: r.elegible,
              razon: r.motivo
            });
          } catch (e: any) {
            console.warn(`[Supabase Seeder Warning] Failed to seed extranjeria record for passport ${r.pasaporte}:`, e.message || e);
          }
        }
        return localRecs;
      }
    } catch (err) {
      console.error("Catch in getDBExtranjeriaRecords:", err);
    }
  }
  return getExtranjeriaRecords();
}

async function loadConfigsFromSupabase() {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    const tbl = await getCmsTableName();
    
    // 1. Load CMS config
    try {
      const { data: cmsData } = await supabase.from(tbl).select("*").eq("id", "site_settings").single();
      if (cmsData) {
        const loaded = cmsData.config_data;
        cachedCmsConfig = typeof loaded === "string" ? JSON.parse(loaded) : loaded;
        console.log("[Supabase Seeder] Loaded CMS site_settings from Supabase.");
      } else {
        console.log("[Supabase Seeder] site_settings absent in Supabase. Backfilling from local config...");
        const local = await getCmsConfig();
        await supabase.from(tbl).upsert({
          id: "site_settings",
          config_data: local,
          updated_at: new Date().toISOString()
        });
      }
    } catch (e: any) {
      console.warn("[Supabase Seeder] Unable to load/upsert site_settings:", e.message || e);
    }

    // 2. Load Extranjería config
    try {
      const { data: extData } = await supabase.from(tbl).select("*").eq("id", "extranjeria_settings").single();
      if (extData) {
        const loaded = extData.config_data;
        cachedExtranjeriaConfig = typeof loaded === "string" ? JSON.parse(loaded) : loaded;
        console.log("[Supabase Seeder] Loaded Extranjería config from Supabase.");
      } else {
        console.log("[Supabase Seeder] extranjeria_settings absent in Supabase. Backfilling from local config...");
        const local = getExtranjeriaConfig();
        await supabase.from(tbl).upsert({
          id: "extranjeria_settings",
          config_data: local,
          updated_at: new Date().toISOString()
        });
      }
    } catch (e: any) {
      console.warn("[Supabase Seeder] Unable to load/upsert extranjeria_settings:", e.message || e);
    }

    // 3. Load Tardía config
    try {
      const { data: tarData } = await supabase.from(tbl).select("*").eq("id", "tardia_settings").single();
      if (tarData) {
        const loaded = tarData.config_data;
        cachedTardiaConfig = typeof loaded === "string" ? JSON.parse(loaded) : loaded;
        console.log("[Supabase Seeder] Loaded Tardía config from Supabase.");
      } else {
        console.log("[Supabase Seeder] tardia_settings absent in Supabase. Backfilling from local config...");
        const local = getTardiaConfig();
        await supabase.from(tbl).upsert({
          id: "tardia_settings",
          config_data: local,
          updated_at: new Date().toISOString()
        });
      }
    } catch (e: any) {
      console.warn("[Supabase Seeder] Unable to load/upsert tardia_settings:", e.message || e);
    }

  } catch (e: any) {
    console.error("[Supabase Seeder Error] Failed during loadConfigsFromSupabase:", e.message || e);
  }
}

async function initializeSupabaseTables() {
  if (!isSupabaseConfigured || !supabase) return;

  console.log("[Supabase Seeder] Checking and initializing database seeds...");
  
  // Load and cache settings from Supabase (backed by cms_config table)
  await loadConfigsFromSupabase();

  try {
    // 1. Seed sucursales
    const tblSucs = await getSucursalesTableName();
    let sucs: any[] | null = null;
    let sucErr: any = null;

    // Try selecting identificacion, fallback to select *
    const { data: sd1, error: se1 } = await supabase.from(tblSucs).select("identificacion");
    if (!se1) {
      sucs = sd1;
    } else {
      const { data: sd2, error: se2 } = await supabase.from(tblSucs).select("*");
      if (!se2) {
        sucs = sd2;
      } else {
        sucErr = se2;
      }
    }

    if (sucErr) {
      console.warn("[Supabase Seeder] 'sucursales' query failed (verify database structure):", sucErr.message);
    } else {
      const sucursalSeeds = [
        { identificacion: 'anc_main', provincia: 'Panamá', nombre: 'Tribunal Electoral de Panamá', direccion: 'Avenida Omar Torrijos Herrera, Ancón, frente a la terminal de Albrook, Ciudad de Panamá', telefono: '+507 507-8000', tiempo: 'Lunes a Viernes 7:30 AM - 3:30 PM' },
        { identificacion: 'boc_office', provincia: 'Bocas del Toro', nombre: 'Dirección Regional de Bocas del Toro', direccion: 'Calle Principal, Isla Colón, Bocas del Toro', telefono: '+507 757-8100', tiempo: 'Lunes a Viernes 7:30 AM - 3:30 PM' },
        { identificacion: 'coc_office', provincia: 'Coclé', nombre: 'Dirección Regional de Coclé', direccion: 'Vía Interamericana, entrada de Penonomé, frente a Plaza Iguana, Coclé', telefono: '+507 997-8100', tiempo: 'Lunes a Viernes 7:30 AM - 3:30 PM' },
        { identificacion: 'col_office', provincia: 'Colón', nombre: 'Dirección Regional de Colón', direccion: 'Calle 11 y Avenida Roosevelt, Ciudad de Colón', telefono: '+507 433-8200', tiempo: 'Lunes a Viernes 7:30 AM - 3:30 PM' },
        { identificacion: 'chi_office', provincia: 'Chiriquí', nombre: 'Dirección Regional de Chiriquí', direccion: 'Calle F Sur y Avenida 3ra Oeste, David, Chiriquí', telefono: '+507 728-8100', tiempo: 'Lunes a Viernes 7:30 AM - 3:30 PM' },
        { identificacion: 'dar_office', provincia: 'Darién', nombre: 'Dirección Regional de Darién', direccion: 'Metetí, Carretera Panamericana, Darién', telefono: '+507 299-6350', tiempo: 'Lunes a Viernes 7:30 AM - 3:30 PM' },
        { identificacion: 'her_office', provincia: 'Herrera', nombre: 'Dirección Regional de Herrera', direccion: 'Avenida Melitón Martín, Chitré, Herrera', telefono: '+507 913-8100', tiempo: 'Lunes a Viernes 7:30 AM - 3:30 PM' },
        { identificacion: 'los_office', provincia: 'Los Santos', nombre: 'Dirección Regional de Los Santos', direccion: 'Vía Circunvalación, frente al Estadio Flaco Bala Hernández, Las Tablas', telefono: '+507 926-8100', tiempo: 'Lunes a Viernes 7:30 AM - 3:30 PM' },
        { identificacion: 'pac_office', provincia: 'Panamá Centro', nombre: 'Dirección Regional de Panamá Centro', direccion: 'Centro Comercial El Dorado, Vía Ricardo J. Alfaro, Planta Alta, Ciudad de Panamá', telefono: '+507 507-8100', tiempo: 'Martes a Sábado 9:00 AM - 5:00 PM' },
        { identificacion: 'pan_office', provincia: 'Panamá Norte', nombre: 'Dirección Regional de Panamá Norte', direccion: 'Vía Transístmica, Centro Comercial Plaza Las Cumbres, Las Cumbres', telefono: '+507 507-8250', tiempo: 'Lunes a Viernes 8:00 AM - 4:00 PM' },
        { identificacion: 'pae_office', provincia: 'Panamá Este', nombre: 'Dirección Regional de Panamá Este', direccion: 'Plaza Comercial El Cruce, Planta Alta, 24 de Diciembre', telefono: '+507 507-8280', tiempo: 'Lunes a Viernes 8:00 AM - 4:00 PM' },
        { identificacion: 'pao_office', provincia: 'Panamá Oeste', nombre: 'Dirección Regional de Panamá Oeste', direccion: 'Avenida Las Américas, al lado del cuartel de bomberos, La Chorrera', telefono: '+507 507-8400', tiempo: 'Lunes a Viernes 7:30 AM - 3:30 PM' },
        { identificacion: 'sm_office', provincia: 'San Miguelito', nombre: 'Dirección Regional de San Miguelito', direccion: 'Centro Comercial Los Andes, Centro de Servicios Gubernamentales, San Miguelito', telefono: '+507 507-8300', tiempo: 'Martes a Sábado 9:00 AM - 5:00 PM' },
        { identificacion: 'ver_office', provincia: 'Veraguas', nombre: 'Dirección Regional de Veraguas', direccion: 'Avenida Héctor Alejandro Santacoloma, Santiago, Veraguas', telefono: '+507 950-8100', tiempo: 'Lunes a Viernes 7:30 AM - 3:30 PM' },
        { identificacion: 'gun_office', provincia: 'Guna Yala', nombre: 'Dirección Regional de Guna Yala', direccion: 'Sede Comarcal, El Porvenir, Guna Yala', telefono: '+507 299-9130', tiempo: 'Lunes a Viernes 7:30 AM - 3:30 PM' },
        { identificacion: 'arr_office', provincia: 'Arraiján', nombre: 'Regional Especial de Arraiján', direccion: 'Vía Interamericana, Plaza Paseo Arraiján, Arraiján', telefono: '+507 507-8410', tiempo: 'Lunes a Viernes 8:00 AM - 4:00 PM' }
      ];

      const existingSucs = new Set(
        sucs?.map((s: any) => s.identificacion || s.id).filter(Boolean) || []
      );

      for (const suc of sucursalSeeds) {
        if (!existingSucs.has(suc.identificacion)) {
          console.log(`[Supabase Seeder] Inserting missing sucursal: ${suc.identificacion}`);
          const payload = {
            identificacion: suc.identificacion,
            id: suc.identificacion,
            provincia: suc.provincia,
            nombre: suc.nombre,
            direccion: suc.direccion,
            telefono: suc.telefono,
            tiempo: suc.tiempo,
            horario: suc.tiempo
          };
          try {
            await safeUpsertSupabase(tblSucs, payload);
          } catch (upsertErr: any) {
            console.error(`[Supabase Seeder Error] Failed to safely seed sucursal ${suc.identificacion}:`, upsertErr.message || upsertErr);
          }
        }
      }
      console.log("[Supabase Seeder] Sucursales verified / seeded successfully.");
    }

    // 2. Seed servicios_subservicios
    const tblServs = await getServiciosTableName();
    let subs: any[] | null = null;
    let subErr: any = null;

    // Try selecting identificacion, fallback to select *
    const { data: d1, error: e1 } = await supabase.from(tblServs).select("identificacion");
    if (!e1) {
      subs = d1;
    } else {
      const { data: d2, error: e2 } = await supabase.from(tblServs).select("*");
      if (!e2) {
        subs = d2;
      } else {
        subErr = e2;
      }
    }

    if (subErr) {
      console.warn("[Supabase Seeder] 'servicios_subservicios' query failed (verify database structure):", subErr.message);
    } else {
      console.log("[Supabase Seeder] Verifying and inserting missing servicios_subservicios...");
      const serviceSeeds = [
        { identificacion: 'ced_primera_vez', id_categoria: 'cedulacion', nombre: 'Cédula por Primera Vez (Mayores de 18 años)', descripcion: 'Para ciudadanos panameños nacidos en el territorio nacional que alcanzan la mayoría de edad.', requisitos: ['Tener 18 años cumplidos.', 'Copia de certificado de nacimiento del Registro Civil (para verificar filiación).', 'Presencia física del interesado.'] },
        { identificacion: 'ced_renovacion', id_categoria: 'cedulacion', nombre: 'Renovación de Cédula', descripcion: 'Cédula vencida o por vencer (6 meses antes de su vencimiento)', requisitos: ['Trámite gratuito', 'Presentarse personalmente', 'Presentar la cédula de identidad vencida o por vencer (6 meses antes).'] },
        { identificacion: 'ced_duplicado', id_categoria: 'cedulacion', nombre: 'Duplicado de Cédula (Pérdida o Robo)', descripcion: 'Reposición del documento por pérdida, robo, hurto o deterioro.', requisitos: ['Costo de B/. 15.00 por el primer duplicado (B/. 25.00 a partir del segundo).', 'Denuncia de pérdida (opcional pero recomendada).', 'Confirmación de datos biométricos en oficina.'] },
        { identificacion: 'ced_juvenil_primera', id_categoria: 'cedulacion', nombre: 'Cédula Juvenil por Primera Vez', descripcion: 'Formulación y entrega de cédula de identidad para menores de edad por primera vez.', requisitos: ['Estar acompañado de por lo menos uno de los padres con su cédula vigente.', 'El menor de edad debe estar presente física voluntariamente.'] },
        { identificacion: 'ced_juvenil_renovacion', id_categoria: 'cedulacion', nombre: 'Cédula Juvenil Renovación', descripcion: 'Trámite de renovación para la cédula de identidad de menor de edad por vencimiento.', requisitos: ['Estar acompañado de uno de los padres con su cédula vigente.', 'Presentar la cédula juvenil vencida o próxima a vencer.', 'El menor de edad debe estar presente físicamente.'] },
        { identificacion: 'ced_pasados_edad', id_categoria: 'cedulacion', nombre: 'Cédula por primera vez con edad de 20 años y 1 día, en adelante', descripcion: 'Ciudadano panameño que solicita su cédula a los 20 años y 1 día de edad, en adelante. Este trámite no aplica a ciudadanos que tengan menos de la edad indicada.', requisitos: ['Declaración jurada de dos (2) testigos panameños mayores de edad.', 'Certificado de nacimiento expedido por el Registro Civil.', 'Pruebas documentales de presencia física en el país (certificados de escuela, cartillas de vacunas, etc.).', 'Presencia física del interesado con vestimenta formal y hombros cubiertos.', 'EVITA EL COLOR BLANCO: NO USES SUÉTERES, CAMISAS, BLUSAS NI BUFANDAS BLANCAS.', 'EVITA ACCESORIOS EN EL ROSTRO: NO LLEVES GORRAS, SOMBREROS, LENTES OSCUROS NI PIERCINGS VISIBLES EN LA CARA.', 'CABELLO DESPEJADO: ASEGÚRATE DE LLEVAR EL ROSTRO Y LAS CEJAS TOTALMENTE VISIBLES.'] },
        { identificacion: 'ced_extranjero_renovacion', id_categoria: 'cedulacion', nombre: 'Renovación de carné de residente permanente', "descripcion": "Trámite de renovación de documento de identidad personal para ciudadano extranjero residente permanente, con documento vencido o por vencer (6 meses antes de su vencimiento)", requisitos: ['Presentar la cédula de extranjero (PE) vencida o próxima a vencer.', 'En caso de menor de edad, aplican los mismos requisitos y debe estar acompañado de uno de los padres, hermano mayor de edad, abuelo o tío que consten inscritos como familiares.', 'Certificado de estatus migratorio vigente, emitido por el Servicio Nacional de Migración.', 'Pasaporte original vigente (copia completa certificada).', 'Pago del costo del trámite en la sucursal del Tribunal Electoral.', 'EVITA EL COLOR BLANCO: NO USES SUÉTERES, CAMISAS, BLUSAS NI BUFANDAS BLANCAS.', 'EVITA ACCESORIOS EN EL ROSTRO: NO LLEVES GORRAS, SOMBREROS, LENTES OSCUROS NI PIERCINGS VISIBLES EN LA CARA.', 'CABELLO DESPEJADO: ASEGÚRATE DE LLEVAR EL ROSTRO Y LAS CEJAS TOTALMENTE VISIBLES.'] },
        { identificacion: 'ced_extranjero_duplicado_perdida', id_categoria: 'cedulacion', nombre: 'Duplicado carné de residente permanente', "descripcion": "Reposición de la cédula de extranjero (PE) residente permanente debido a robo, extravío o deterioro.", requisitos: ['En caso de robo o hurto del documento de identidad, se recomienda presente denuncia (no obligatorio)', 'Copia de pasaporte vigente y resolución autorizada de residencia.', 'Pago de arancel obligatorio por duplicado de extranjería (B/. 50.00).', 'EVITA EL COLOR BLANCO: NO USES SUÉTERES, CAMISAS, BLUSAS NI BUFANDAS BLANCAS.', 'EVITA ACCESORIOS EN EL ROSTRO: NO LLEVES GORRAS, SOMBREROS, LENTES OSCUROS NI PIERCINGS VISIBLES EN LA CARA.', 'CABELLO DESPEJADO: ASEGÚRATE DE LLEVAR EL ROSTRO Y LAS CEJAS TOTALMENTE VISIBLES.'] },
        { identificacion: 'rc_nacimiento', id_categoria: 'registro_civil', nombre: 'Certificado de Nacimiento (Con o Sin Timbres)', descripcion: 'Expedición de certificados oficiales para trámites escolares, legales o de viaje.', requisitos: ['Suministrar el número de cédula del titular o tomo, asiento y folio del nacimiento.', 'Costo de B/. 3.00 (con timbres fiscales de uso común).', 'Nombres completos de los padres.'] },
        { identificacion: 'rc_matrimonio', id_categoria: 'registro_civil', nombre: 'Certificado de Matrimonio', descripcion: 'Documento que certifica el enlace de matrimonio inscrito legalmente.', requisitos: ['Número de cédula de ambos contrayentes o tomo/folio de inscripción.', 'Costo de B/. 3.00 para uso nacional. Para uso internacional debe ser autenticado.', 'Fecha aproximada en que se celebró el acto.'] },
        { identificacion: 'rc_defuncion', id_categoria: 'registro_civil', nombre: 'Certificado de Defunción', descripcion: 'Expedición de actas para trámites legales de herencias o procesos luctuosos.', requisitos: ['Número de cédula del difunto y fecha exacta del deceso.', 'Identificación del solicitante con cédula de identidad personal.', 'Costo de B/. 3.00.'] },
        { identificacion: 'rc_inscripcion', id_categoria: 'registro_civil', nombre: 'Inscripción de Nacimiento / Matrimonio', descripcion: 'Registro oficial de un nuevo nacimiento o de un enlace matrimonial civil.', requisitos: ['Parte clínico del hospital/partera (para nacimientos).', 'Acta matrimonial original de la notaría o juzgado.', 'Cédulas vigentes de los padres o contrayentes.'] },
        { identificacion: 'ext_primera_vez', id_categoria: 'extranjeria', nombre: 'Cédula de Extranjero por Primera Vez (PE)', descripcion: 'Emisión del documento de identidad personal para extranjeros residentes permanentes.', requisitos: ['Resolución original del Servicio Nacional de Migración aprobando la residencia permanente.', 'Copia de la resolución debidamente autenticada.', 'Pasaporte original vigente con el sello de residencia.', 'En caso de menor de edad, aplican los mismos requisitos y debe estar acompañado de uno de sus padres siempre que esté incluido en la resolución del Servicio Nacional de Migración.', 'Pago correspondiente de aranceles de carnet de extranjería.'] },
        { identificacion: 'oe_cambio_residencia', id_categoria: 'organizacion_electoral', nombre: 'Cambio de Residencia Electoral', descripcion: 'Actualización del centro de votación asignado según su domicilio habitual real.', requisitos: ['Cédula de identidad personal vigente.', 'Factura de servicio público (agua, luz, teléfono) o documento que demuestre la nueva dirección (Opcional).', 'Someterse a declaración jurada de residencia electoral.'] },
        { identificacion: 'oe_afiliacion_partido', id_categoria: 'organizacion_electoral', nombre: 'Afiliación a Partido Político', descripcion: 'Registro voluntario de pertenencia a un esquema de partido político oficialmente reconocido.', requisitos: ['Cédula de identidad personal panameña vigente.', 'Estar en pleno goce de sus derechos políticos (no tener suspensiones vigentes).', 'La afiliación es de character personal e indelegable.'] },
        { identificacion: 'oe_renuncia_partido', id_categoria: 'organizacion_electoral', nombre: 'Renuncia a Partido Político', descripcion: 'Trámite para desafiliarse de un colectivo partidario y regresar a estado independiente.', requisitos: ['Cédula de identidad vigente.', 'Presentar formulario de renuncia debidamente firmado en oficinas del TE.'] },
        { identificacion: 'pe_nacimiento', id_categoria: 'panamenos_extranjero', nombre: 'Inscripción de Nacimiento en el Extranjero', descripcion: 'Registro de nacimiento para hijos de padre y/o madre panameños nacidos fuera del territorio nacional.', requisitos: ['Certificado de nacimiento original otorgado por el país extranjero, debidamente apostillado o legalizado.', 'Cédula de identidad de origen o pasaportes vigentes del padre o la madre panameña.', 'Copia simple del documento de identidad del menor.'] },
        { identificacion: 'pe_cedulacion', id_categoria: 'panamenos_extranjero', nombre: 'Cédula de Identidad en Oficinas Consulares', descripcion: 'Gestión y renovación de cédula de identidad a través de delegaciones diplomáticas y consulados de enlace.', requisitos: ['Presencia física obligatoria en el consulado panameño correspondiente.', 'Suministrar número de cédula anterior o pasaporte panameño vigente.', 'Formulario de validación biométrica consular firmado.'] },
        { identificacion: 'pe_matrimonio', id_categoria: 'panamenos_extranjero', nombre: 'Inscripción de Matrimonio celebrado en el Extranjero', descripcion: 'Registro oficial de matrimonios de ciudadanos panameños celebrados en el exterior.', requisitos: ['Certificado de matrimonio original extranjero apostillado o legalizado.', 'Cédula de identidad vigente del cónyuge panameño.', 'Traducción autorizada al español si el documento original fue emitido en otro idioma.'] }
      ];

      const existingSubs = new Set(
        subs?.map((s: any) => s.identificacion || s.id || s.identificacion_servicio).filter(Boolean) || []
      );

      for (const service of serviceSeeds) {
        if (!existingSubs.has(service.identificacion)) {
          console.log(`[Supabase Seeder] Inserting missing subservicio: ${service.identificacion}`);
          const payload = {
            identificacion: service.identificacion,
            id: service.identificacion,
            id_categoria: service.id_categoria,
            categoria_id: service.id_categoria,
            nombre: service.nombre,
            descripcion: service.descripcion,
            requisitos: service.requisitos
          };
          try {
            await safeUpsertSupabase(tblServs, payload);
          } catch (upsertErr: any) {
            console.error(`[Supabase Seeder Error] Failed to safely seed subservicio ${service.identificacion}:`, upsertErr.message || upsertErr);
          }
        } else if (
          service.identificacion === 'ced_pasados_edad' ||
          service.identificacion === 'ced_extranjero_renovacion' ||
          service.identificacion === 'ced_extranjero_duplicado_perdida'
        ) {
          console.log(`[Supabase Seeder] Updating name and requirements for existing ${service.identificacion} sub-service...`);
          const updatePayload = {
            nombre: service.nombre,
            requisitos: service.requisitos
          };
          try {
            const { error: updErr1 } = await supabase.from(tblServs).update(updatePayload).eq('identificacion', service.identificacion);
            if (updErr1) {
              await supabase.from(tblServs).update(updatePayload).eq('id', service.identificacion);
            }
          } catch (updateErr: any) {
            console.error(`[Supabase Seeder Error] Failed to update existing subservice ${service.identificacion}:`, updateErr.message || updateErr);
          }
        }
      }
      console.log("[Supabase Seeder] Servicios/Subservicios verified / seeded successfully.");
    }

    // 3. Populate default admin profiles and whitelist registers if empty
    await getDBUsers();
    await getDBExtranjeriaRecords();

    // Ensure our new super admin accounts are seeded in Supabase if active
    try {
      const tblUsers = await getUsersTableName();
      const usersToEnsure = [
        { username: "oscargave3003", password: "Value1234", role: "super", nombre: "Oscar Super Admin", fechaCreacion: "2026-06-05T18:11:00Z" },
        { username: "oscargave3003@gmail.com", password: "Value1234", role: "super", nombre: "Oscar Super Admin (Email)", fechaCreacion: "2026-06-05T18:11:00Z" }
      ];
      for (const u of usersToEnsure) {
        await safeUpsertSupabase(tblUsers, {
          identificacion: u.username,
          nombre_usuario: u.username,
          hash_contrasena: u.password,
          nombre: u.nombre,
          role: u.role,
          fecha_creacion: u.fechaCreacion
        });
      }
      console.log("[Supabase Seeder] Verified and upserted custom super admin profiles.");
    } catch (usersErr: any) {
      console.warn("[Supabase Seeder Warning] Error ensuring custom super users in Supabase:", usersErr.message || usersErr);
    }

    // 4. Seed Citas (Appointments) if empty in Supabase
    try {
      const tblCitas = await getAppointmentsTableName();
      const { data: existingCitas, error: citasError } = await supabase.from(tblCitas).select("identificacion").limit(1);
      if (!citasError && (!existingCitas || existingCitas.length === 0)) {
        console.log("[Supabase Seeder] 'citas' table is empty. Seeding appointments from local JSON...");
        const localAppts = getAppointments();
        for (const appt of localAppts) {
          try {
            await safeUpsertAppointment({
              identificacion: appt.id,
              codigo_transaccion: appt.codigoTransaccion,
              fecha: appt.fecha,
              tiempo: appt.hora,
              fecha_creacion: appt.fechaCreacion,
              estado: appt.estado,
              sucursal_id: appt.subServicioId?.startsWith('ext_') ? 'pac_office' : 'anc_main',
              sub_servicio_id: appt.subServicioId || "ced_primera_vez",
              tipo_identificacion: appt.datosPersonales?.tipoIdentificacion || "Cedula",
              identificacion_ciudadano: appt.identificacion,
              ciudadano_identificacion: appt.identificacion,
              fecha_nacimiento: appt.datosPersonales?.fechaNacimiento || "2000-01-01",
              telefono: appt.telefono,
              correo: appt.correo,
              nombre_completo: appt.nombre || appt.datosPersonales?.nombreCompleto || "",
              numero_seguimiento: appt.numeroSeguimiento || null,
              primer_nombre: appt.datosPersonales?.primerNombre || null,
              segundo_nombre: appt.datosPersonales?.segundoNombre || null,
              primer_apellido: appt.datosPersonales?.primerApellido || null,
              segundo_apellido: appt.datosPersonales?.segundoApellido || null,
              pasaporte: appt.datosPersonales?.pasaporte || null,
              nacionalidad: appt.datosPersonales?.nacionalidad || null,
              numero_resolucion: appt.datosPersonales?.numeroResolucion || null,
              fecha_resolucion: appt.datosPersonales?.fechaResolucion || null,
              fecha_vencimiento: appt.datosPersonales?.fechaVencimiento || null
            });
          } catch (apptErr: any) {
            console.warn(`[Supabase Seeder Warning] Failed to seed appointment ${appt.id}:`, apptErr.message || apptErr);
          }
        }
        console.log("[Supabase Seeder] Appointments verified / seeded successfully.");
      }
    } catch (citasErr: any) {
      console.warn("[Supabase Seeder Warning] Error checking or seeding appointments in Supabase:", citasErr.message || citasErr);
    }

  } catch (err: any) {
    console.error("[Supabase Seeder Error] Exception during table initialization:", err.message || err);
  }
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
  const PORT = parseInt(process.env.PORT || "3000", 10);

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

  // Check and seed Supabase schema on start
  await initializeSupabaseTables();

  // Proxy endpoint to load the official logo, bypassing potential hotlinking/CORS protection on the Tribunal Electoral server
  app.get("/api/logo", async (req, res) => {
    try {
      const targetUrl = "https://www.tribunal-electoral.gob.pa/wp-content/uploads/2026/06/Logo-TE-aniversario-256x256px-blanco-02.png";
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Referer": "https://www.tribunal-electoral.gob.pa/",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
        }
      });
      
      if (!response.ok) {
        throw new Error(`Original logo returned status: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
      res.send(buffer);
    } catch (error: any) {
      console.error("[Logo Proxy Error - Serving elegant PNG fallback from Wikimedia]:", error.message || error);
      
      try {
        // Fallback to Wikipedia/Wikimedia's highly-available, non-blocked official Panama Coat of Arms PNG (supported universally, unlike SVGs in some email clients)
        const fallbackUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Coat_of_arms_of_Panama.svg/240px-Coat_of_arms_of_Panama.svg.png";
        const fallbackResponse = await fetch(fallbackUrl);
        if (fallbackResponse.ok) {
          const arrayBuffer = await fallbackResponse.arrayBuffer();
          res.setHeader("Content-Type", "image/png");
          res.setHeader("Cache-Control", "public, max-age=1800"); // Cache for 30 mins
          return res.send(Buffer.from(arrayBuffer));
        }
      } catch (fallbackError: any) {
        console.error("Wikimedia fallback fetch failed:", fallbackError.message || fallbackError);
      }
      
      // Deep fallback: clear 1x1 transparent PNG to prevent breaking layout completely in client
      const transparentPixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
      res.setHeader("Content-Type", "image/png");
      res.send(transparentPixel);
    }
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
            nombre: foundUser.nombre
          }
        });
      }

      // Hardcoded fallback accounts for backward-compatibility in case table/seeding isn't fully operational
      const fallbackAdmins = [
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
            nombre: fallbackMatch.n
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
        numeroSeguimiento
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

        if (isSupabaseConfigured && supabase) {
          const row = {
            identificacion: serverCita.id,
            codigo_transaccion: serverCita.codigoTransaccion,
            fecha: serverCita.fecha,
            tiempo: serverCita.hora,
            fecha_creacion: serverCita.fechaCreacion,
            estado: serverCita.estado,
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
          };
          try {
            await safeUpsertAppointment(row);
          } catch (dbErr: any) {
            console.error("[Email Service - DB Sync Warning] Failed to register/update appointment row in Supabase, continuing email delivery:", dbErr.message || dbErr);
          }
        } else {
          if (existingIdx >= 0) {
            appointments[existingIdx] = serverCita;
          } else {
            appointments.push(serverCita);
          }
          saveAppointments(appointments);
        }
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

              <!-- Transaction Code Section -->
              <div class="code-box">
                <div class="code-label">Código de Cita</div>
                <div class="code-value">${codigoTransaccion}</div>
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
          console.error("[Email Service] Outlook sending error:", error);
          
          let diagnosticMessage = `Error al enviar correo por Outlook: ${error.message || error}. Asegúrese de que su usuario y contraseña o clave de aplicación de Outlook sean válidos.`;
          
          const errMsg = (error.message || "").toString();
          const errCode = (error.code || "").toString();
          
          if (errMsg.includes("535") || errCode === "EAUTH" || errMsg.toLowerCase().includes("authentication unsuccessful") || errMsg.toLowerCase().includes("login") || errMsg.toLowerCase().includes("username and password not accepted")) {
            diagnosticMessage = `Error de Autenticación SMTP (Código 535) con el servidor de Outlook.\n\n` +
              `Razones comunes y cómo resolverlo:\n` +
              `1. Verificación en Dos Pasos (MFA / 2FA): Si su correo de Outlook tiene activada la autenticación multifactor, NO puede utilizar su contraseña normal. Debe ingresar a su panel de seguridad de Microsoft y crear una "Contraseña de aplicación" (App Password) de 16 caracteres, y configurar esa clave especial en la variable OUTLOOK_PASS en Vercel.\n` +
              `2. Registro de SMTP AUTH Deshabilitado en Office 365: Microsoft inhabilita "SMTP AUTH" por defecto en cuentas de Office 365 de empresas/colegios debido a políticas de seguridad modernas. Debe solicitar al administrador de su sistema que habilite "SMTP Autenticado" (SMTP AUTH) en la configuración de Correo de su usuario específico dentro del Centro de administración de Microsoft 365 (Usuarios -> Usuarios Activos -> Haga clic en su usuario -> Pestaña Correo -> Administrar aplicaciones de correo electrónico -> Active "SMTP Autenticado").`;
          } else if (errCode === "ETIMEDOUT" || errCode === "ECONNREFUSED" || errCode === "ENOTFOUND" || errMsg.toLowerCase().includes("timeout") || errMsg.toLowerCase().includes("connect") || errMsg.toLowerCase().includes("socket")) {
            const currentHost = process.env.OUTLOOK_HOST || "smtp.office365.com";
            const currentPort = process.env.OUTLOOK_PORT || "587";
            diagnosticMessage = `Error de Conexión de Red SMTP (Timeout o Conexión Rechazada) al intentar conectar con ${currentHost}:${currentPort}.\n\n` +
              `Los proveedores de host cloud (como Vercel, AWS Lambda, Heroku, etc.) bloquean por completo las conexiones salientes por puerto 587 o 25 para evitar el spam de correo.\n\n` +
              `Soluciones recomendadas:\n` +
              `1. Pruebe cambiando el puerto a 465 (SMTPS) y configure la variable OUTLOOK_PORT = 465 en Vercel, lo que iniciará una conexión segura desde un puerto que a veces no está bloqueado.\n` +
              `2. Se recomienda encarecidamente utilizar servicios de email por API HTTP (como Resend, SendGrid o Mailgun) que transmiten los correos de manera confiable en plataformas serverless sin usar el protocolo de puertos SMTP tradicionales.`;
          }

          return res.status(400).json({ 
            success: false, 
            error: diagnosticMessage,
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

      if (isSupabaseConfigured && supabase) {
        const tbl = await getExtranjeriaTableName();
        for (const r of normalizedRecords) {
          try {
            await safeUpsertSupabase(tbl, {
              pasaporte: r.pasaporte,
              nombre: r.nombre,
              nacionalidad: r.nacionalidad,
              elegible: r.elegible,
              razon: r.motivo
            });
          } catch (e: any) {
            console.error(`[Extranjería Migrate Error] Fail on passport ${r.pasaporte}:`, e.message || e);
          }
        }
      } else {
        saveExtranjeriaRecords(normalizedRecords);
      }

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

  app.get("/api/supabase-status", async (req, res) => {
    try {
      const statusResponse: any = {
        isSupabaseConfigured,
        supabaseUrl: supabaseUrl ? supabaseUrl.replace(/^(https?:\/\/)[^.]+(\.supabase\.co)/, "$1***$2") : "",
        hasSupabaseKey: !!supabaseKey,
        tables: {}
      };

      if (isSupabaseConfigured && supabase) {
        // Test appointments table
        try {
          const apptsTable = await getAppointmentsTableName();
          const { error: apptsError } = await supabase.from(apptsTable).select("identificacion").limit(1);
          statusResponse.tables.appointments = {
            tableName: apptsTable,
            connected: !apptsError,
            error: apptsError ? apptsError.message : null
          };
        } catch (e: any) {
          statusResponse.tables.appointments = { tableName: "otro", connected: false, error: e.message };
        }

        // Test users table
        try {
          const usersTable = await getUsersTableName();
          const { error: usersError } = await supabase.from(usersTable).select("nombre_usuario").limit(1);
          statusResponse.tables.users = {
            tableName: usersTable,
            connected: !usersError,
            error: usersError ? usersError.message : null
          };
        } catch (e: any) {
          statusResponse.tables.users = { tableName: "usuarios", connected: false, error: e.message };
        }

        // Test sucursales table
        try {
          const sucursalTable = await getSucursalesTableName();
          const { error: sucError } = await supabase.from(sucursalTable).select("identificacion").limit(1);
          statusResponse.tables.sucursales = {
            tableName: sucursalTable,
            connected: !sucError,
            error: sucError ? sucError.message : null
          };
        } catch (e: any) {
          statusResponse.tables.sucursales = { tableName: "sucursales", connected: false, error: e.message };
        }

        // Test servicios table
        try {
          const servTable = await getServiciosTableName();
          const { error: servError } = await supabase.from(servTable).select("identificacion").limit(1);
          statusResponse.tables.servicios = {
            tableName: servTable,
            connected: !servError,
            error: servError ? servError.message : null
          };
        } catch (e: any) {
          statusResponse.tables.servicios = { tableName: "servicios_subservicios", connected: false, error: e.message };
        }

        // Test extranjeria table
        try {
          const extTable = await getExtranjeriaTableName();
          const { error: extError } = await supabase.from(extTable).select("pasaporte").limit(1);
          statusResponse.tables.extranjeria = {
            tableName: extTable,
            connected: !extError,
            error: extError ? extError.message : null
          };
        } catch (e: any) {
          statusResponse.tables.extranjeria = { tableName: "extranjeria_records", connected: false, error: e.message };
        }
      }

      return res.json(statusResponse);
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

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

      if (isSupabaseConfigured && supabase) {
        const row = {
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
        };
        await safeUpsertAppointment(row);
      } else {
        if (existingIdx >= 0) {
          const existing = appointments[existingIdx];
          serverCita.estado = existing.estado;
          appointments[existingIdx] = serverCita;
        } else {
          appointments.push(serverCita);
        }
        saveAppointments(appointments);
      }

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

  // API to get all appointments
  app.get("/api/appointments", async (req, res) => {
    try {
      const appointments = await getDBAppointments();
      const isAdmin = await verifySession(req);
      if (isAdmin) {
        return res.json({ success: true, appointments });
      } else {
        // Scrub PII for public requests to ensure GDPR/privacy protection
        const scrubbed = appointments.map(a => ({
          id: a.id,
          fecha: a.fecha,
          hora: a.hora,
          subServicioId: a.subServicioId,
          categoriaNombre: a.categoriaNombre,
          servicioCategoria: (a as any).servicioCategoria || a.categoriaNombre,
          estado: a.estado
        }));
        return res.json({ success: true, appointments: scrubbed });
      }
    } catch (e: any) {
      console.error("Error fetching all appointments:", e);
      res.status(500).json({ success: false, error: "Ocurrió un error interno en el servidor" });
    }
  });

  // API to cancel an appointment from dashboard
  app.post("/api/cancel-appointment", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Se requiere un ID de cita" });
      }

      if (isSupabaseConfigured && supabase) {
        const tbl = await getAppointmentsTableName();
        const { error } = await supabase.from(tbl).update({ estado: 'cancelada' }).eq("identificacion", id);
        if (error) throw error;
        return res.json({ success: true, status: 'cancelada' });
      } else {
        const appointments = getAppointments();
        const appointment = appointments.find(a => a.id === id);
        if (appointment) {
          appointment.estado = 'cancelada';
          saveAppointments(appointments);
          return res.json({ success: true, status: 'cancelada' });
        }
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

      if (isSupabaseConfigured && supabase) {
        const tbl = await getAppointmentsTableName();
        const { error } = await supabase.from(tbl).delete().eq("identificacion", id);
        if (error) throw error;
      } else {
        const localAppointments = getAppointments();
        const filtered = localAppointments.filter(a => a.id !== id);
        saveAppointments(filtered);
      }
      return res.json({ success: true, message: "Cita eliminada correctamente" });
    } catch (e: any) {
      console.error("Error deleting appointment:", e);
      res.status(500).json({ success: false, error: "Ocurrió un error interno en el servidor" });
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
    
    if (isSupabaseConfigured && supabase) {
      const tbl = await getAppointmentsTableName();
      await supabase.from(tbl).update({ estado: 'asistire' }).eq("identificacion", appointment.id);
    } else {
      const allAppts = getAppointments();
      const match = allAppts.find(a => a.id === appointment.id);
      if (match) {
        match.estado = 'asistire';
        saveAppointments(allAppts);
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
    
    if (isSupabaseConfigured && supabase) {
      const tbl = await getAppointmentsTableName();
      await supabase.from(tbl).update({ estado: 'cancelada' }).eq("identificacion", appointment.id);
    } else {
      const allAppts = getAppointments();
      const match = allAppts.find(a => a.id === appointment.id);
      if (match) {
        match.estado = 'cancelada';
        saveAppointments(allAppts);
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
        numeroSeguimiento
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

      if (isSupabaseConfigured && supabase) {
        const row = {
          identificacion: serverCita.id,
          codigo_transaccion: serverCita.codigoTransaccion,
          fecha: serverCita.fecha,
          tiempo: serverCita.hora,
          fecha_creacion: serverCita.fechaCreacion,
          estado: serverCita.estado,
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
        };
        await safeUpsertAppointment(row);
      } else {
        if (existingIdx >= 0) {
          appointments[existingIdx] = serverCita;
        } else {
          appointments.push(serverCita);
        }
        saveAppointments(appointments);
      }

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

      // Save to Supabase as well if configured
      if (isSupabaseConfigured && supabase) {
        const newUserRow = {
          identificacion: cleanUsername,
          nombre_usuario: cleanUsername,
          hash_contrasena: String(password).trim(),
          role: role,
          nombre: String(nombre).trim(),
          fecha_creacion: newUser.fechaCreacion
        };
        const tbl = await getUsersTableName();
        const { error } = await supabase.from(tbl).upsert(newUserRow);
        if (error) throw error;
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

      // Also delete from Supabase if configured
      if (isSupabaseConfigured && supabase) {
        const tbl = await getUsersTableName();
        const { error } = await supabase.from(tbl).delete().eq("nombre_usuario", usernameToDelete);
        if (error) throw error;
      }

      return res.json({ success: true, message: `Usuario '${usernameToDelete}' eliminado exitosamente.` });
    } catch (e: any) {
      console.error("Error deleting user:", e);
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
    // In production, serve the static bundle from dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on public port ${PORT}`);
  });
}

startServer();
