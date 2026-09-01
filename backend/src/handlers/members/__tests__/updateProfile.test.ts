import { APIGatewayProxyEvent } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();
vi.mock("../../../lib/dynamo", () => ({
  ddb: { send: (...args: unknown[]) => sendMock(...args) },
  TABLE_NAME: "TEST_TABLE",
}));

import { handler } from "../updateProfile";

function buildEvent(
  familyId: string,
  claims: Record<string, string> | undefined,
  body: unknown,
): APIGatewayProxyEvent {
  return {
    pathParameters: { familyId },
    requestContext: {
      authorizer: claims === undefined ? undefined : { claims },
    },
    body: JSON.stringify(body),
  } as unknown as APIGatewayProxyEvent;
}

function invoke(
  familyId: string,
  claims: Record<string, string> | undefined,
  body: unknown,
) {
  return handler(
    buildEvent(familyId, claims, body),
    {} as never,
    () => {},
  ) as Promise<{ statusCode: number; body: string }>;
}

const validClaims = {
  "custom:memberId": "ana",
  "custom:familyId": "fam-123",
  email: "ana@example.com",
};

beforeEach(() => {
  sendMock.mockReset();
});

describe("updateProfile handler", () => {
  it("updates the caller's own name", async () => {
    sendMock.mockResolvedValueOnce({});

    const res = await invoke("fam-123", validClaims, { name: "Ana Silva" });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({
      memberId: "ana",
      name: "Ana Silva",
    });

    const input = sendMock.mock.calls[0][0].input;
    expect(input.Key).toEqual({ PK: "FAMILY#fam-123", SK: "MEMBER#ana" });
    expect(input.ExpressionAttributeValues[":name"]).toBe("Ana Silva");
  });

  it("updates the caller's own avatar color", async () => {
    sendMock.mockResolvedValueOnce({});

    const res = await invoke("fam-123", validClaims, { color: "#EF4444" });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({
      memberId: "ana",
      color: "#EF4444",
    });

    const input = sendMock.mock.calls[0][0].input;
    expect(input.ExpressionAttributeValues[":color"]).toBe("#EF4444");
  });

  it("rejects an empty (whitespace-only) name with 400 and does not touch the record", async () => {
    const res = await invoke("fam-123", validClaims, { name: "   " });

    expect(res.statusCode).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("rejects a color outside the predefined palette with 400 and does not touch the record", async () => {
    const res = await invoke("fam-123", validClaims, { color: "#000000" });

    expect(res.statusCode).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("rejects a request with neither name nor color with 400", async () => {
    const res = await invoke("fam-123", validClaims, {});

    expect(res.statusCode).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("always targets the memberId from the token, ignoring any memberId sent in the body", async () => {
    sendMock.mockResolvedValueOnce({});

    const res = await invoke("fam-123", validClaims, {
      memberId: "someone-else",
      name: "Ana Silva",
    });

    expect(res.statusCode).toBe(200);
    const input = sendMock.mock.calls[0][0].input;
    expect(input.Key).toEqual({ PK: "FAMILY#fam-123", SK: "MEMBER#ana" });
    expect(JSON.parse(res.body).memberId).toBe("ana");
  });
});
