import { PostConfirmationTriggerEvent } from "aws-lambda";
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
  AdminUpdateUserAttributesCommand: vi
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
}));

vi.mock("ulid", () => ({ ulid: () => "fam-ulid-123" }));

import { handler } from "../postConfirmation";

function buildEvent(
  userAttributes: Record<string, string>,
): PostConfirmationTriggerEvent {
  return {
    userPoolId: "pool-1",
    userName: "user-1",
    request: { userAttributes },
    response: {},
  } as unknown as PostConfirmationTriggerEvent;
}

function invoke(event: PostConfirmationTriggerEvent) {
  return (handler as unknown as (...args: unknown[]) => Promise<unknown>)(
    event,
    {},
    () => {},
  );
}

beforeEach(() => {
  sendMock.mockReset();
  cognitoSendMock.mockReset();
});

describe("postConfirmation handler", () => {
  it("stamps isOwner: true on the owner MEMBER item when signing up a new family", async () => {
    sendMock.mockResolvedValueOnce({});
    cognitoSendMock.mockResolvedValueOnce({});

    await invoke(
      buildEvent({
        "custom:familyName": "Silva",
        email: "owner@example.com",
      }),
    );

    const transactInput = sendMock.mock.calls[0][0].input as {
      TransactItems: { Put: { Item: Record<string, unknown> } }[];
    };
    const ownerPut = transactInput.TransactItems.find(
      (item) => item.Put.Item.SK === "MEMBER#owner",
    );
    expect(ownerPut?.Put.Item.isOwner).toBe(true);
  });

  it("does not set isOwner on the invited-member confirmation path", async () => {
    sendMock.mockResolvedValueOnce({});

    await invoke(
      buildEvent({
        "custom:familyId": "fam-123",
        "custom:memberId": "ana",
        email: "ana@example.com",
      }),
    );

    const updateInput = sendMock.mock.calls[0][0].input as {
      UpdateExpression: string;
      ExpressionAttributeValues: Record<string, unknown>;
    };
    expect(updateInput.UpdateExpression).not.toContain("isOwner");
    expect(updateInput.ExpressionAttributeValues).not.toHaveProperty(
      ":isOwner",
    );
  });
});
