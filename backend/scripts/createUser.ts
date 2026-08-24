// Cria a conta de login (Cognito) de um membro da família e vincula ela
// ao MEMBER#{memberId} já existente na tabela via custom:memberId.
// Só o admin roda esse script — não existe self sign-up no app.
//
// Uso:
//   export USER_POOL_ID=<valor do output UserPoolId do sam deploy>
//   npm run create-user -- <email> <memberId> <senha-inicial>
//
// <memberId> tem que ser o mesmo id usado em MEMBER#{memberId} (o que
// aparece em scripts/seed.ts, ex.: "voce", "ana", "theo").
//
// A senha inicial já sai como definitiva (sem exigir troca no primeiro
// login) pra manter o fluxo simples — combine com weakSecrets razoáveis
// e, se quiser, troque depois pelo próprio Cognito.

import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

const USER_POOL_ID = process.env.USER_POOL_ID || "us-east-1_AphfqQmaR";
const [, , email, memberId, password] = process.argv;

if (!USER_POOL_ID) {
  console.error(
    "Defina USER_POOL_ID antes de rodar (veja o output do `sam deploy`).",
  );
  process.exit(1);
}
if (!email || !memberId || !password) {
  console.error(
    "Uso: npm run create-user -- <email> <memberId> <senha-inicial>",
  );
  process.exit(1);
}
if (password.length < 8) {
  console.error(
    "A senha precisa ter pelo menos 8 caracteres (política do User Pool).",
  );
  process.exit(1);
}

const cognito = new CognitoIdentityProviderClient({ region: "us-east-1" });

async function main() {
  await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
        { Name: "custom:memberId", Value: memberId },
      ],
      MessageAction: "SUPPRESS",
      TemporaryPassword: password,
    }),
  );

  await cognito.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      Password: password,
      Permanent: true,
    }),
  );

  console.log(
    `Conta criada para ${email} (memberId=${memberId}). Já pode logar no app com essa senha.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
