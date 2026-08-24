// Ponte entre o AuthContext (React) e o api/client.ts (módulo simples,
// fora da árvore de componentes) — guarda o idToken atual pra montar o
// header Authorization, e avisa o AuthContext quando a API responde 401
// (token expirado/revogado) pra ele voltar pra tela de login.

let currentToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setToken(token: string | null) {
  currentToken = token;
}

export function getToken(): string | null {
  return currentToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized() {
  unauthorizedHandler?.();
}
