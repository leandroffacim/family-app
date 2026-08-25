// Convida um membro da família: cria a conta no Cognito e deixa o
// próprio Cognito mandar o e-mail de convite (senha temporária
// gerada automaticamente). A pessoa loga com essa senha temporária
// e o app pede pra ela escolher a senha definitiva na hora.
//
// Uso:
//   export USER_POOL_ID=<valor do output UserPoolId do sam deploy>
//   npm run invite-user -- <email> <memberId>
//
// <memberId> tem que ser o mesmo id usado em MEMBER#{memberId} (o que
// aparece em scripts/seed.ts, ex.: "voce", "ana", "theo") — é isso
// que liga a conta ao membro certo.
//
// Alternativa: scripts/createUser.ts, que não manda e-mail e já
// define a senha definitiva na hora (útil se a família preferir
// combinar a senha por fora em vez de depender do e-mail).

import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const USER_POOL_ID = process.env.USER_POOL_ID;
const [, , email, memberId] = process.argv;

if (!USER_POOL_ID) {
  console.error("Defina USER_POOL_ID antes de rodar (veja o output do `sam deploy`).");
  process.exit(1);
}
if (!email || !memberId) {
  console.error("Uso: npm run invite-user -- <email> <memberId>");
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
      // sem MessageAction: SUPPRESS -> Cognito gera a senha temporária
      // e manda o e-mail de convite sozinho (template configurado no
      // template.yaml, AdminCreateUserConfig.InviteMessageTemplate)
    })
  );

  console.log(`Convite enviado para ${email} (memberId=${memberId}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
