import { DeleteCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();
vi.mock("../../../lib/dynamo", () => ({
  ddb: { send: (...args: unknown[]) => sendMock(...args) },
  TABLE_NAME: "TEST_TABLE",
}));

const cognitoSendMock = vi.fn();
vi.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  CognitoIdentityProviderClient: vi.fn().mockImplementation(() => ({
    send: (...args: unknown[]) => cognitoSendMock(...args),
  })),
  AdminDeleteUserCommand: vi
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
}));

import { handler } from "../deleteAccount";

function buildEvent(
  familyId: string,
  claims: Record<string, string> | undefined,
): APIGatewayProxyEvent {
  return {
    pathParameters: { familyId },
    requestContext: {
      authorizer: claims === undefined ? undefined : { claims },
    },
  } as unknown as APIGatewayProxyEvent;
}

function invoke(familyId: string, claims: Record<string, string> | undefined) {
  return handler(
    buildEvent(familyId, claims),
    {} as never,
    () => {},
  ) as Promise<{ statusCode: number; body: string }>;
}

const memberClaims = {
  "custom:memberId": "ana",
  "custom:familyId": "fam-123",
  email: "ana@example.com",
};

beforeEach(() => {
  sendMock.mockReset();
  cognitoSendMock.mockReset();
});

describe("deleteAccount handler", () => {
  it("deletes a non-owner member with no active references (happy path)", async () => {
    sendMock.mockImplementation((command: unknown) => {
      if (command instanceof GetCommand)
        return Promise.resolve({ Item: { memberId: "ana" } });
      if (command instanceof QueryCommand) return Promise.resolve({ Items: [] });
      if (command instanceof DeleteCommand) return Promise.resolve({});
      return Promise.resolve({});
    });
    cognitoSendMock.mockResolvedValueOnce({});

    const res = await invoke("fam-123", memberClaims);

    expect(res.statusCode).toBe(204);
    expect(cognitoSendMock).toHaveBeenCalledTimes(1);
    const deleteCall = sendMock.mock.calls.find(
      ([c]) => c instanceof DeleteCommand,
    );
    expect((deleteCall?.[0] as InstanceType<typeof DeleteCommand>).input.Key).toEqual({
      PK: "FAMILY#fam-123",
      SK: "MEMBER#ana",
    });
  });

  it("rejects owner deletion with 403 before any reference check or Cognito call", async () => {
    sendMock.mockImplementation((command: unknown) => {
      if (command instanceof GetCommand)
        return Promise.resolve({ Item: { memberId: "owner", isOwner: true } });
      return Promise.resolve({});
    });

    const res = await invoke("fam-123", {
      "custom:memberId": "owner",
      "custom:familyId": "fam-123",
      email: "owner@example.com",
    });

    expect(res.statusCode).toBe(403);
    expect(
      sendMock.mock.calls.some(([c]) => c instanceof QueryCommand),
    ).toBe(false);
    expect(cognitoSendMock).not.toHaveBeenCalled();
  });

  it("rejects deletion with 409 when the member is referenced in a task's rotationOrder", async () => {
    sendMock.mockImplementation((command: unknown) => {
      if (command instanceof GetCommand)
        return Promise.resolve({ Item: { memberId: "ana" } });
      if (command instanceof QueryCommand) {
        const input = (command as InstanceType<typeof QueryCommand>).input as unknown as {
          ExpressionAttributeValues: { ":prefix": string };
        };
        if (input.ExpressionAttributeValues[":prefix"] === "TASK#")
          return Promise.resolve({ Items: [{ id: "t1" }] });
        return Promise.resolve({ Items: [] });
      }
      return Promise.resolve({});
    });

    const res = await invoke("fam-123", memberClaims);

    expect(res.statusCode).toBe(409);
    expect(cognitoSendMock).not.toHaveBeenCalled();
  });

  it("rejects deletion with 409 when the member is referenced in an event's members array", async () => {
    sendMock.mockImplementation((command: unknown) => {
      if (command instanceof GetCommand)
        return Promise.resolve({ Item: { memberId: "ana" } });
      if (command instanceof QueryCommand) {
        const input = (command as InstanceType<typeof QueryCommand>).input as unknown as {
          ExpressionAttributeValues: { ":prefix": string };
        };
        if (input.ExpressionAttributeValues[":prefix"] === "EVENT#")
          return Promise.resolve({ Items: [{ id: "e1" }] });
        return Promise.resolve({ Items: [] });
      }
      return Promise.resolve({});
    });

    const res = await invoke("fam-123", memberClaims);

    expect(res.statusCode).toBe(409);
    expect(cognitoSendMock).not.toHaveBeenCalled();
  });

  it("treats a repeated deletion (member item already gone) as a successful no-op (204)", async () => {
    sendMock.mockImplementation((command: unknown) => {
      if (command instanceof GetCommand) return Promise.resolve({ Item: undefined });
      if (command instanceof DeleteCommand) return Promise.resolve({});
      return Promise.resolve({});
    });
    cognitoSendMock.mockResolvedValueOnce({});

    const res = await invoke("fam-123", memberClaims);

    expect(res.statusCode).toBe(204);
    expect(
      sendMock.mock.calls.some(([c]) => c instanceof QueryCommand),
    ).toBe(false);
  });

  it("treats a Cognito UserNotFoundException as already-deleted and still removes the Dynamo item (204)", async () => {
    sendMock.mockImplementation((command: unknown) => {
      if (command instanceof GetCommand)
        return Promise.resolve({ Item: { memberId: "ana" } });
      if (command instanceof QueryCommand) return Promise.resolve({ Items: [] });
      if (command instanceof DeleteCommand) return Promise.resolve({});
      return Promise.resolve({});
    });
    const notFound = Object.assign(new Error("not found"), {
      name: "UserNotFoundException",
    });
    cognitoSendMock.mockRejectedValueOnce(notFound);

    const res = await invoke("fam-123", memberClaims);

    expect(res.statusCode).toBe(204);
    expect(
      sendMock.mock.calls.some(([c]) => c instanceof DeleteCommand),
    ).toBe(true);
  });

  it("returns 500 and never re-creates the Cognito user when the Dynamo delete fails after Cognito succeeds", async () => {
    sendMock.mockImplementation((command: unknown) => {
      if (command instanceof GetCommand)
        return Promise.resolve({ Item: { memberId: "ana" } });
      if (command instanceof QueryCommand) return Promise.resolve({ Items: [] });
      if (command instanceof DeleteCommand)
        return Promise.reject(new Error("dynamo unavailable"));
      return Promise.resolve({});
    });
    cognitoSendMock.mockResolvedValueOnce({});

    const res = await invoke("fam-123", memberClaims);

    expect(res.statusCode).toBe(500);
    expect(cognitoSendMock).toHaveBeenCalledTimes(1);
  });
});
