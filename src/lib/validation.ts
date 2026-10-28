import ipaddr from "ipaddr.js";
import { normalizeUrlInput } from "./url-input";

export function isPublicAddress(address: string): boolean {
  try {
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}

export function normalizePublicUrl(input: unknown): string {
  const normalized = normalizeUrlInput(input);
  const host = new URL(normalized).hostname.replace(/^\[|\]$/g, "");
  if (ipaddr.isValid(host) && !isPublicAddress(host))
    throw new Error("Private or reserved network addresses are not allowed.");
  return normalized;
}
export const assertPublicUrl = normalizePublicUrl;
export function isPublicUrl(input: string): boolean {
  try {
    normalizePublicUrl(input);
    return true;
  } catch {
    return false;
  }
}
