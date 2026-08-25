import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  // amazon-cognito-identity-js (via crypto-js) espera o `global` do
  // Node, que não existe no navegador — o Vite não faz esse polyfill
  // sozinho (diferente do webpack). Sem isso dá
  // "Uncaught ReferenceError: global is not defined".
  define: {
    global: "globalThis",
  },
});
