import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it } from "vitest";
import {
  assertFamilyAccess,
  ForbiddenFamilyError,
  UnlinkedAccountError,
} from "../auth";

function eventWithClaims(
  claims: Record<string, string> | undefined,
): APIGatewayProxyEvent {
  return {
    requestContext: {
      authorizer: claims === undefined ? undefined : { claims },
    },
  } as unknown as APIGatewayProxyEvent;
}

describe("assertFamilyAccess", () => {
  it("returns the acting member when custom:familyId matches the requested familyId", () => {
    const event = eventWithClaims({
      "custom:memberId": "owner",
      "custom:familyId": "fam-123",
      email: "owner@example.com",
    });

    const result = assertFamilyAccess(event, "fam-123");

    expect(result).toEqual({
      memberId: "owner",
      email: "owner@example.com",
      familyId: "fam-123",
    });
  });

  it("returns the actual custom:memberId claim, not a hardcoded value", () => {
    const event = eventWithClaims({
      "custom:memberId": "ana",
      "custom:familyId": "fam-123",
      email: "ana@example.com",
    });

    const result = assertFamilyAccess(event, "fam-123");

    expect(result.memberId).toBe("ana");
  });

  it("throws ForbiddenFamilyError when custom:familyId does not match the requested familyId", () => {
    const event = eventWithClaims({
      "custom:memberId": "owner",
      "custom:familyId": "fam-123",
      email: "owner@example.com",
    });

    expect(() => assertFamilyAccess(event, "fam-999")).toThrow(
      ForbiddenFamilyError,
    );
  });

  it("throws UnlinkedAccountError when custom:familyId claim is absent", () => {
    const event = eventWithClaims({
      "custom:memberId": "owner",
      email: "owner@example.com",
    });

    expect(() => assertFamilyAccess(event, "fam-123")).toThrow(
      UnlinkedAccountError,
    );
  });

  it("throws UnlinkedAccountError when custom:memberId claim is absent", () => {
    const event = eventWithClaims({
      "custom:familyId": "fam-123",
      email: "owner@example.com",
    });

    expect(() => assertFamilyAccess(event, "fam-123")).toThrow(
      UnlinkedAccountError,
    );
  });
});
