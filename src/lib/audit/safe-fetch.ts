import { auditSignal } from "./deadline";
import { lookup } from "node:dns";
import { Agent, fetch as networkFetch } from "undici";
import { assertPublicUrl, isPublicAddress } from "../validation";

// Validate the actual connection address, not a separate DNS preflight (rebinding-safe).
const dispatcher = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      lookup(hostname, { ...options, all: true }, (error, addresses) => {
        if (error) return callback(error, [], undefined);
        if (
          !addresses.length ||
          addresses.some(({ address }) => !isPublicAddress(address))
        ) {
          return callback(
            new Error("Private or reserved network addresses are not allowed."),
            [],
            undefined,
          );
        }
        if (options.all) callback(null, addresses);
        else callback(null, addresses[0].address, addresses[0].family);
      });
    },
  },
});

/** Every redirect is validated; one caller-provided deadline covers the full chain. */
export async function safeFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const signal = auditSignal(init.signal);
  signal?.throwIfAborted();
  let url = assertPublicUrl(input);
  for (let hop = 0; hop <= 5; hop++) {
    const response = (await networkFetch(url, {
      method: init.method,
      headers: init.headers as Record<string, string>,
      signal,
      redirect: "manual",
      dispatcher,
    })) as unknown as Response;
    if (
      init.redirect === "manual" ||
      ![301, 302, 303, 307, 308].includes(response.status)
    )
      return response;
    const location = response.headers.get("location");
    if (!location) return response;
    await response.body?.cancel();
    url = assertPublicUrl(new URL(location, url).href);
  }
  throw new Error("This website redirects too many times.");
}

/** Bound memory consumption even when content-length is absent or dishonest. */
export async function readBoundedBody(
  response: Response,
  maxBytes = 5_000_000,
): Promise<ArrayBuffer> {
  const reader = response.body?.getReader();
  if (!reader) return new ArrayBuffer(0);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes)
        throw new Error("The resource exceeds the safe download size limit.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes.buffer;
}
