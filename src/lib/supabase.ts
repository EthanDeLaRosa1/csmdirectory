import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://njytnjkxtxsccasgeapn.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qeXRuamt4dHhzY2Nhc2dlYXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NDM2NTUsImV4cCI6MjEwMjIxOTY1NX0.dhx2rvIZT719mTaIcaHPz53hJknp--qezPrBH9jhO84";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);