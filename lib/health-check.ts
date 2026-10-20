// Owner: Chirag | Task: CHI-P2-5 | Priority: P2
import dns from "node:dns";
import net from "node:net";

export interface HealthCheckResult {
  ok: boolean;
  statusCode?: number;
  error?: string;
  checkedAt: string;
}

export const HEALTH_CHECK_TIMEOUT_MS = 5000;
export const MAX_HEALTH_CHECK_REDIRECTS = 3;

/**
 * Parses an IPv6 string into 8 16-bit integer words.
 * Handles double colons and trailing embedded IPv4 addresses.
 */
export function parseIpv6Words(ip: string): number[] | null {
  let clean = ip.trim().toLowerCase();
  if (clean.startsWith("[") && clean.endsWith("]")) {
    clean = clean.slice(1, -1);
  }

  // Handle embedded IPv4 at the end, e.g., ::ffff:192.168.1.1
  const lastColon = clean.lastIndexOf(":");
  let ipv4Words: number[] = [];
  if (lastColon !== -1) {
    const trailing = clean.slice(lastColon + 1);
    if (trailing.includes(".")) {
      const v4Parts = trailing.split(".").map(Number);
      if (
        v4Parts.length === 4 &&
        v4Parts.every((n) => !isNaN(n) && n >= 0 && n <= 255)
      ) {
        ipv4Words = [
          (v4Parts[0] << 8) | v4Parts[1],
          (v4Parts[2] << 8) | v4Parts[3],
        ];
        clean = clean.slice(0, lastColon);
      } else {
        return null;
      }
    }
  }

  const doubleColonCount = (clean.match(/::/g) || []).length;
  if (doubleColonCount > 1) {
    return null;
  }

  if (doubleColonCount === 1) {
    const [before, after] = clean.split("::");
    const beforeParts = before ? before.split(":") : [];
    const afterParts = after ? after.split(":") : [];
    const totalExplicit =
      beforeParts.length + afterParts.length + ipv4Words.length;
    if (totalExplicit > 8) {
      return null;
    }
    const zerosNeeded = 8 - totalExplicit;
    const words: number[] = [];
    for (const p of beforeParts) {
      const val = parseInt(p, 16);
      if (isNaN(val) || val < 0 || val > 0xffff) return null;
      words.push(val);
    }
    for (let i = 0; i < zerosNeeded; i++) {
      words.push(0);
    }
    for (const p of afterParts) {
      const val = parseInt(p, 16);
      if (isNaN(val) || val < 0 || val > 0xffff) return null;
      words.push(val);
    }
    words.push(...ipv4Words);
    return words;
  }

  const parts = clean.split(":");
  const words: number[] = [];
  for (const p of parts) {
    const val = parseInt(p, 16);
    if (isNaN(val) || val < 0 || val > 0xffff) return null;
    words.push(val);
  }
  words.push(...ipv4Words);
  if (words.length !== 8) {
    return null;
  }
  return words;
}

/**
 * Checks if an IPv4 address belongs to private, loopback, link-local, or reserved ranges.
 */
function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255)) {
    return true; // Malformed IPv4 is treated as unsafe
  }
  const [a, b] = parts;
  // 0.0.0.0/8 - "This" network / broadcast / unspecified
  if (a === 0) return true;
  // 10.0.0.0/8 - Private
  if (a === 10) return true;
  // 127.0.0.0/8 - Loopback
  if (a === 127) return true;
  // 169.254.0.0/16 - Link-local
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 - Private (172.16.0.0 to 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 - Private
  if (a === 192 && b === 168) return true;
  // 224.0.0.0/4 - Multicast, 240.0.0.0/4 Reserved, 255.255.255.255 Broadcast
  if (a >= 224) return true;

  return false;
}

/**
 * Checks if an IPv6 address belongs to loopback, unique-local, link-local,
 * IPv4-mapped, or unspecified ranges.
 */
function isPrivateOrReservedIpv6(ip: string): boolean {
  const words = parseIpv6Words(ip);
  if (!words) {
    return true; // Malformed IPv6 is treated as unsafe
  }

  // :: (unspecified)
  if (words.every((w) => w === 0)) return true;

  // ::1 (loopback)
  if (words.slice(0, 7).every((w) => w === 0) && words[7] === 1) return true;

  // IPv4-mapped IPv6 (::ffff:0:0/96 or ::ffff:a.b.c.d)
  if (words.slice(0, 5).every((w) => w === 0) && words[5] === 0xffff) {
    return true;
  }

  // IPv4-compatible IPv6 (::a.b.c.d)
  if (words.slice(0, 6).every((w) => w === 0)) {
    return true;
  }

  // fc00::/7 (Unique Local Address, fc00:: to fdff:ffff:...)
  if ((words[0] & 0xfe00) === 0xfc00) return true;

  // fe80::/10 (Link-Local Unicast, fe80:: to febf:ffff:...)
  if ((words[0] & 0xffc0) === 0xfe80) return true;

  // 2001:db8::/32 (Documentation prefix)
  if (words[0] === 0x2001 && words[1] === 0x0db8) return true;

  return false;
}

/**
 * Evaluates whether an IP address is in a private, loopback, or reserved range.
 * Supports IPv4 and IPv6 representations.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) {
    return isPrivateOrReservedIpv4(ip);
  }
  if (family === 6) {
    return isPrivateOrReservedIpv6(ip);
  }
  if (ip.toLowerCase() === "localhost") {
    return true;
  }
  return false;
}

/**
 * Validates a destination URL against SSRF and protocol restrictions.
 */
export async function validateDestinationUrl(
  urlStr: string
): Promise<{ ok: boolean; parsedUrl?: URL; error?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { ok: false, error: "Invalid URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      error: `Invalid URL protocol: must be http: or https: (got ${parsed.protocol})`,
    };
  }

  const hostname = parsed.hostname;
  if (!hostname) {
    return { ok: false, error: "URL is missing a hostname" };
  }

  const lowerHost = hostname.toLowerCase();
  if (
    lowerHost === "localhost" ||
    lowerHost.endsWith(".localhost") ||
    lowerHost.endsWith(".local") ||
    lowerHost.endsWith(".internal")
  ) {
    return {
      ok: false,
      error: `SSRF protection: host ${hostname} is local or reserved`,
    };
  }

  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      return {
        ok: false,
        error: `SSRF protection: IP address ${hostname} is private or reserved`,
      };
    }
    return { ok: true, parsedUrl: parsed };
  }

  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return {
        ok: false,
        error: `DNS resolution failed: no addresses found for ${hostname}`,
      };
    }
    for (const record of addresses) {
      if (isPrivateOrReservedIp(record.address)) {
        return {
          ok: false,
          error: `SSRF protection: hostname ${hostname} resolved to private or reserved IP ${record.address}`,
        };
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `DNS resolution failed for ${hostname}: ${msg}`,
    };
  }

  return { ok: true, parsedUrl: parsed };
}

/**
 * Performs a health check on a destination URL.
 * Uses HEAD with GET fallback, 5s timeout via AbortController,
 * manual redirect following (up to 3 hops) with re-validation on every hop.
 */
export async function checkDestination(url: string): Promise<HealthCheckResult> {
  const checkedAt = new Date().toISOString();
  let currentUrl = url;
  let redirectCount = 0;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, HEALTH_CHECK_TIMEOUT_MS);

  try {
    while (true) {
      const validation = await validateDestinationUrl(currentUrl);
      if (!validation.ok) {
        return {
          ok: false,
          error: validation.error,
          checkedAt,
        };
      }

      let response: Response;
      let usedMethod = "HEAD";

      try {
        response = await fetch(currentUrl, {
          method: "HEAD",
          redirect: "manual",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            "User-Agent": "LinkPulse-HealthCheck/1.0",
            Accept: "*/*",
          },
        });

        if (response.status === 405 || response.status === 501) {
          usedMethod = "GET";
          response = await fetch(currentUrl, {
            method: "GET",
            redirect: "manual",
            cache: "no-store",
            signal: controller.signal,
            headers: {
              "User-Agent": "LinkPulse-HealthCheck/1.0",
              Accept: "*/*",
            },
          });
          if (response.body) {
            try {
              await response.body.cancel();
            } catch {
              // Ignore body cancellation errors
            }
          }
        }
      } catch (fetchErr: unknown) {
        if (controller.signal.aborted) {
          return {
            ok: false,
            error: `Request timed out after ${HEALTH_CHECK_TIMEOUT_MS}ms`,
            checkedAt,
          };
        }

        if (usedMethod === "HEAD") {
          try {
            response = await fetch(currentUrl, {
              method: "GET",
              redirect: "manual",
              cache: "no-store",
              signal: controller.signal,
              headers: {
                "User-Agent": "LinkPulse-HealthCheck/1.0",
                Accept: "*/*",
              },
            });
            if (response.body) {
              try {
                await response.body.cancel();
              } catch {
                // Ignore body cancellation errors
              }
            }
          } catch (getErr: unknown) {
            if (controller.signal.aborted) {
              return {
                ok: false,
                error: `Request timed out after ${HEALTH_CHECK_TIMEOUT_MS}ms`,
                checkedAt,
              };
            }
            const msg = getErr instanceof Error ? getErr.message : String(getErr);
            return {
              ok: false,
              error: `Network error: ${msg}`,
              checkedAt,
            };
          }
        } else {
          const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
          return {
            ok: false,
            error: `Network error: ${msg}`,
            checkedAt,
          };
        }
      }

      if (
        response.status === 301 ||
        response.status === 302 ||
        response.status === 303 ||
        response.status === 307 ||
        response.status === 308
      ) {
        const location = response.headers.get("location");
        if (!location) {
          return {
            ok: false,
            statusCode: response.status,
            error: `Redirect status ${response.status} returned without Location header`,
            checkedAt,
          };
        }

        if (redirectCount >= MAX_HEALTH_CHECK_REDIRECTS) {
          return {
            ok: false,
            statusCode: response.status,
            error: `Redirect limit exceeded (maximum ${MAX_HEALTH_CHECK_REDIRECTS} redirects)`,
            checkedAt,
          };
        }

        redirectCount++;
        try {
          currentUrl = new URL(location, currentUrl).toString();
        } catch {
          return {
            ok: false,
            statusCode: response.status,
            error: `Invalid redirect location: ${location}`,
            checkedAt,
          };
        }
        continue;
      }

      const isOk = response.status >= 200 && response.status < 400;
      return {
        ok: isOk,
        statusCode: response.status,
        ...(isOk ? {} : { error: `HTTP status ${response.status}` }),
        checkedAt,
      };
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
