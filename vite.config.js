import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// __VORSCHAU__ ist nur in der Vercel-Vorschau wahr (dort setzt Vercel VERCEL_ENV=preview) und schaltet
// die Leiste zum Umschalten der Breite ein. Lokal: MM_VORSCHAU=1 vor den Befehl setzen.
export default defineConfig({
  plugins: [react()],
  define: {
    __VORSCHAU__: JSON.stringify(process.env.VERCEL_ENV === "preview" || process.env.MM_VORSCHAU === "1"),
  },
});
