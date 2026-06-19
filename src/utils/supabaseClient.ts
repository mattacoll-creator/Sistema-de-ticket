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

// Retrieves the configuration from either import.meta.env or localStorage
export function getSupabaseConfig(): SupabaseConfig | null {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey };
  }

  const storedUrl = localStorage.getItem(DEFAULT_KEYS.URL);
  const storedKey = localStorage.getItem(DEFAULT_KEYS.ANON_KEY);

  if (storedUrl && storedKey) {
    return { url: storedUrl, anonKey: storedKey };
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
export const SUPABASE_SQL_SETUP_SCRIPT = `-- SUPABASE SQL SCHEMA SETUP FOR TRIBUNAL ELECTORAL (16 REGIONAL OFFICES)
-- Run this setup script in your Supabase SQL Editor.

-- 1. Office and ticket state logs
create table if not exists office_state (
  office_id text primary key,
  tickets jsonb not null default '[]'::jsonb,
  cubicles jsonb not null default '[]'::jsonb,
  auto_assign boolean not null default true,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS and set public policies (for demo ease)
alter table office_state enable row level security;

drop policy if exists "Allow public access to office_state" on office_state;

create policy "Allow public access to office_state" 
  on office_state for all 
  using (true) 
  with check (true);
`;
