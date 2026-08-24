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

export function login(email: string, password: string): Promise<Session> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.authenticateUser(
      new AuthenticationDetails({ Username: email, Password: password }),
      {
        onSuccess: (session) => resolve(sessionFromCognito(session)),
        onFailure: (error) => reject(error),
        newPasswordRequired: () =>
          reject(
            new Error(
              "Essa conta precisa trocar a senha antes de continuar — fale com quem administra o app.",
            ),
          ),
      },
    );
  });
}

export function logout() {
  userPool.getCurrentUser()?.signOut();
}
