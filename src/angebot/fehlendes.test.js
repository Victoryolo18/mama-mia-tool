import { describe, it, expect } from "vitest";
import { ersterOffenerBlock } from "./fehlendes.js";

const vorspeisen = { id: "v", typ: "wahl", min_auswahl: 2, max_auswahl: 2 };
const haupt = { id: "h", typ: "wahl", min_auswahl: 1, max_auswahl: 1 };
const fest = { id: "f", typ: "fix" };
const beilagen = { id: "b", typ: "wahl", min_auswahl: 2, max_auswahl: 2 };
const extras = { id: "z", typ: "zusatz", min_auswahl: 0, max_auswahl: 3 };
const bloecke = [vorspeisen, haupt, fest, beilagen, extras];

describe("ersterOffenerBlock", () => {
  it("der erste Teil, in dem etwas fehlt, in der Reihenfolge der Seite", () => {
    expect(ersterOffenerBlock(bloecke, {})?.id).toBe("v");
    expect(ersterOffenerBlock(bloecke, { v: [1] })?.id).toBe("v");
    expect(ersterOffenerBlock(bloecke, { v: [1, 2] })?.id).toBe("h");
  });

  it("fehlt nur bei Beilagen, geht es dorthin; feste Teile und Extras fehlen nie", () => {
    expect(ersterOffenerBlock(bloecke, { v: [1, 2], h: [3] })?.id).toBe("b");
    expect(ersterOffenerBlock(bloecke, { v: [1, 2], h: [3], b: [4, 5] })).toBeNull();
  });

  it("mit +1 fehlt das zusätzliche Gericht", () => {
    expect(ersterOffenerBlock(bloecke, { v: [1, 2], h: [3], b: [4, 5] }, { v: true })?.id).toBe("v");
  });
});
