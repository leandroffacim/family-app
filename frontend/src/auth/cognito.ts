import {
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
});

export interface Session {
  idToken: string;
  memberId: string | null;
  email: string | null;
}

function sessionFromCognito(session: CognitoUserSession): Session {
  const payload = session.getIdToken().decodePayload();
  return {
    idToken: session.getIdToken().getJwtToken(),
    memberId: (payload["custom:memberId"] as string | undefined) ?? null,
    email: (payload["email"] as string | undefined) ?? null,
  };
}

// Tenta restaurar a sessão de um login anterior (o SDK guarda os tokens
// no localStorage). Renova sozinho via refresh token se o idToken já
// tiver expirado.
export function restoreSession(): Promise<Session | null> {
  const user = userPool.getCurrentUser();
  if (!user) return Promise.resolve(null);
  return new Promise((resolve) => {
    user.getSession((error: Error | null, session: CognitoUserSession | null) => {
      if (error || !session || !session.isValid()) {
        resolve(null);
        return;
      }
      resolve(sessionFromCognito(session));
    });
  });
}

export type LoginResult =
  | { status: "success"; session: Session }
  | { status: "newPasswordRequired" };

// Guarda o CognitoUser do login em andamento — o SDK exige chamar
// completeNewPasswordChallenge na MESMA instância que recebeu o
// desafio, não dá pra recriar um CognitoUser novo pra isso.
let pendingNewPasswordUser: CognitoUser | null = null;

export function login(email: string, password: string): Promise<LoginResult> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.authenticateUser(
      new AuthenticationDetails({ Username: email, Password: password }),
      {
        onSuccess: (session) =>
          resolve({ status: "success", session: sessionFromCognito(session) }),
        onFailure: (error) => reject(error),
        // conta recém-convidada (scripts/inviteUser.ts) — senha
        // temporária ainda não foi trocada pela definitiva
        newPasswordRequired: () => {
          pendingNewPasswordUser = user;
          resolve({ status: "newPasswordRequired" });
        },
      },
    );
  });
}

export function completeNewPassword(newPassword: string): Promise<Session> {
  return new Promise((resolve, reject) => {
    if (!pendingNewPasswordUser) {
      reject(new Error("Nenhum login pendente de troca de senha."));
      return;
    }
    pendingNewPasswordUser.completeNewPasswordChallenge(
      newPassword,
      {},
      {
        onSuccess: (session) => {
          pendingNewPasswordUser = null;
          resolve(sessionFromCognito(session));
        },
        onFailure: (error) => reject(error),
      },
    );
  });
}

export function logout() {
  pendingNewPasswordUser = null;
  userPool.getCurrentUser()?.signOut();
}
