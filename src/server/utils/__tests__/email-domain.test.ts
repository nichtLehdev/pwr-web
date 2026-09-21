import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { Resolver } from "node:dns/promises";

import { isDeliverableDomain } from "../email-domain";

// Am Prototyp statt am Modul: Das Modul legt seinen Resolver beim Laden an,
// eine Modul-Attrappe käme zu spät.
const resolveMx = jest.spyOn(Resolver.prototype, "resolveMx");
const resolve4 = jest.spyOn(Resolver.prototype, "resolve4");
const resolve6 = jest.spyOn(Resolver.prototype, "resolve6");

function dnsError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}

/** Der Cache merkt sich Domains — jeder Fall braucht eine eigene. */
let counter = 0;
const freshAddress = () => `person@domain-${counter++}.example`;

const env = process.env as { NODE_ENV?: string };
const originalNodeEnv = env.NODE_ENV;

describe("isDeliverableDomain", () => {
  beforeEach(() => {
    resolveMx.mockReset();
    resolve4.mockReset();
    resolve6.mockReset();
    // Außerhalb der Produktion fragt die Funktion gar nicht erst nach.
    env.NODE_ENV = "production";
  });

  afterAll(() => {
    env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  it("does not ask DNS outside production", async () => {
    env.NODE_ENV = "development";
    await expect(isDeliverableDomain("someone@claude.test")).resolves.toBe(
      true,
    );
    expect(resolveMx).not.toHaveBeenCalled();
  });

  it("accepts a domain with a mail exchanger", async () => {
    resolveMx.mockResolvedValue([{ exchange: "mx.example", priority: 10 }]);
    await expect(isDeliverableDomain(freshAddress())).resolves.toBe(true);
    expect(resolve4).not.toHaveBeenCalled();
  });

  it("falls back to the host address when there is no MX record", async () => {
    resolveMx.mockRejectedValue(dnsError("ENODATA"));
    resolve4.mockResolvedValue(["203.0.113.4"]);
    await expect(isDeliverableDomain(freshAddress())).resolves.toBe(true);
  });

  it("rejects a domain that does not exist", async () => {
    resolveMx.mockRejectedValue(dnsError("ENOTFOUND"));
    resolve4.mockRejectedValue(dnsError("ENOTFOUND"));
    resolve6.mockRejectedValue(dnsError("ENOTFOUND"));
    await expect(isDeliverableDomain(freshAddress())).resolves.toBe(false);
  });

  it("lets an address pass when the lookup itself fails", async () => {
    resolveMx.mockRejectedValue(dnsError("ETIMEOUT"));
    await expect(isDeliverableDomain(freshAddress())).resolves.toBe(true);
  });

  it("rejects an address without a domain", async () => {
    await expect(isDeliverableDomain("nobody")).resolves.toBe(false);
    expect(resolveMx).not.toHaveBeenCalled();
  });

  it("answers a repeated domain from the cache", async () => {
    resolveMx.mockResolvedValue([{ exchange: "mx.example", priority: 10 }]);
    const address = freshAddress();
    await isDeliverableDomain(address);
    await isDeliverableDomain(address.toUpperCase());
    expect(resolveMx).toHaveBeenCalledTimes(1);
  });
});
