// Schriften kommen aus public/schriften, nicht von Google Fonts (keine IP-Adresse an Google beim Laden).
import { describe, it, expect } from "vitest";
import fs from "node:fs";

const css = fs.readFileSync("src/schriften.css", "utf8");

describe("Schriften", () => {
  it("nichts lädt von Google Fonts, weder Seite noch Code", () => {
    const dateien = [
      "index.html",
      ...fs.readdirSync("src", { recursive: true }).filter((d) => /\.(jsx?|css)$/.test(d) && !d.endsWith(".test.js")).map((d) => `src/${d}`),
    ];
    for (const d of dateien) expect(fs.readFileSync(d, "utf8"), d).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });

  it("jede eingebundene Datei liegt im Ordner, und main.jsx bindet die Schriften ein", () => {
    const pfade = [...css.matchAll(/url\(\/schriften\/([^)]+)\)/g)].map((m) => m[1]);
    expect(pfade.length).toBe(8);
    for (const p of pfade) expect(fs.existsSync(`public/schriften/${p}`), p).toBe(true);
    expect(fs.readFileSync("src/main.jsx", "utf8")).toContain('import "./schriften.css";');
  });

  it("die Namen sind die, die theme.js verwendet, mit gerader und kursiver Playfair", () => {
    expect(css).toMatch(/font-family: 'DM Sans';[\s\S]*?font-style: normal/);
    expect(css).toMatch(/font-family: 'Playfair Display';\s*font-style: italic/);
    const theme = fs.readFileSync("src/theme.js", "utf8");
    expect(theme).toContain("'DM Sans'");
    expect(theme).toContain("'Playfair Display'");
  });
});
