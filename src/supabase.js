import { createClient } from "@supabase/supabase-js";

/* Ein gemeinsamer Zugang zur Datenbank für alle neuen Dateien.
   Der öffentliche Schlüssel darf im Browser stehen; geschützt wird über die Regeln der Datenbank. */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
