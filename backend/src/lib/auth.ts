import { APIGatewayProxyEvent } from "aws-lambda";

// Extrai o membro autenticado a partir das claims que o CognitoAuthorizer
// (API Gateway REST API) já validou e injetou em requestContext.authorizer.
// Nunca confiar em memberId vindo do body/path — só do token assinado.
export interface ActingMember {
  memberId: string;
  email: string;
  familyId?: string;
}

export class UnlinkedAccountError extends Error {
  constructor() {
    super("Conta autenticada ainda não está vinculada a um membro da família (custom:memberId ausente)");
    this.name = "UnlinkedAccountError";
  }
}

export class ForbiddenFamilyError extends Error {
  constructor() {
    super("Conta autenticada não pertence a esta família");
    this.name = "ForbiddenFamilyError";
  }
}

function readClaims(event: APIGatewayProxyEvent): Record<string, string> | undefined {
  return event.requestContext.authorizer?.claims as Record<string, string> | undefined;
}

export function getActingMember(event: APIGatewayProxyEvent): ActingMember {
  const claims = readClaims(event);

  const memberId = claims?.["custom:memberId"];
  const email = claims?.["email"] ?? "";

  if (!memberId) throw new UnlinkedAccountError();

  return { memberId, email };
}

// Confere que o familyId do path bate com o custom:familyId do token —
// ponto único de checagem que fecha o IDOR de acesso entre famílias.
export function assertFamilyAccess(event: APIGatewayProxyEvent, familyId: string): ActingMember {
  const claims = readClaims(event);

  const memberId = claims?.["custom:memberId"];
  const tokenFamilyId = claims?.["custom:familyId"];
  const email = claims?.["email"] ?? "";

  if (!memberId || !tokenFamilyId) throw new UnlinkedAccountError();
  if (tokenFamilyId !== familyId) throw new ForbiddenFamilyError();

  return { memberId, email, familyId: tokenFamilyId };
}
