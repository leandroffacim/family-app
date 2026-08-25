import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as cognito from "./cognito";
import { setToken, setUnauthorizedHandler } from "./tokenStore";

type Status =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  // login com senha temporária de convite (scripts/inviteUser.ts) —
  // precisa definir a senha definitiva antes de continuar
  | "newPasswordRequired";

interface AuthContextValue {
  status: Status;
  memberId: string | null;
  email: string | null;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  completeNewPassword: (newPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [memberId, setMemberId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applySession = (session: cognito.Session | null) => {
    setToken(session?.idToken ?? null);
    setMemberId(session?.memberId ?? null);
    setEmail(session?.email ?? null);
    setStatus(session ? "authenticated" : "unauthenticated");
  };

  useEffect(() => {
    cognito
      .restoreSession()
      .then(applySession)
      .catch(() => applySession(null));

    // se a API responder 401 (token expirado/revogado), derruba a
    // sessão e volta pra tela de login
    setUnauthorizedHandler(() => {
      cognito.logout();
      applySession(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = async (loginEmail: string, password: string) => {
    setError(null);
    try {
      const result = await cognito.login(loginEmail, password);
      if (result.status === "newPasswordRequired") {
        setStatus("newPasswordRequired");
        return;
      }
      applySession(result.session);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível entrar",
      );
      throw err;
    }
  };

  const completeNewPassword = async (newPassword: string) => {
    setError(null);
    try {
      const session = await cognito.completeNewPassword(newPassword);
      applySession(session);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível definir a senha",
      );
      throw err;
    }
  };

  const logout = () => {
    cognito.logout();
    applySession(null);
  };

  const value = useMemo(
    () => ({ status, memberId, email, error, login, completeNewPassword, logout }),
    [status, memberId, email, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
