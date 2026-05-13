import React from "react";
import ReactDOM from "react-dom/client";
import MamaMiaAngebotsgenerator from "./MamaMiaAngebotsgenerator.jsx";

const style = document.createElement("style");
style.textContent = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MamaMiaAngebotsgenerator />
  </React.StrictMode>
);
