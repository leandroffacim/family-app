import { APIGatewayProxyEvent } from "aws-lambda";

// Extrai o membro autenticado a partir das claims que o CognitoAuthorizer
// (API Gateway REST API) já validou e injetou em requestContext.authorizer.
// Nunca confiar em memberId vindo do body/path — só do token assinado.
export interface ActingMember {
  memberId: string;
  email: string;
}

export class UnlinkedAccountError extends Error {
  constructor() {
    super("Conta autenticada ainda não está vinculada a um membro da família (custom:memberId ausente)");
    this.name = "UnlinkedAccountError";
  }
}

export function getActingMember(event: APIGatewayProxyEvent): ActingMember {
  const claims = event.requestContext.authorizer?.claims as
    | Record<string, string>
    | undefined;

  const memberId = claims?.["custom:memberId"];
  const email = claims?.["email"] ?? "";

  if (!memberId) throw new UnlinkedAccountError();

  return { memberId, email };
}
