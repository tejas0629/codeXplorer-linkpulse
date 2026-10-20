// Owner: Chirag | Task: CHI-P2-5, CHI-P2-6 | Priority: P2
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import dns from "node:dns";
import {
  isPrivateOrReservedIp,
  validateDestinationUrl,
  checkDestination,
  parseIpv6Words,
} from "./health-check";

describe("isPrivateOrReservedIp", () => {
  const cases: Array<{ ip: string; expected: boolean; description: string }> = [
    { ip: "localhost", expected: true, description: "localhost hostname" },
    { ip: "127.0.0.1", expected: true, description: "loopback IPv4" },
    { ip: "127.255.255.255", expected: true, description: "loopback range upper" },
    { ip: "10.0.0.1", expected: true, description: "private 10.0.0.0/8 start" },
    { ip: "10.254.1.99", expected: true, description: "private 10.0.0.0/8 mid" },
    { ip: "172.16.0.1", expected: true, description: "private 172.16.0.0/12 start" },
    { ip: "172.24.10.5", expected: true, description: "private 172.16.0.0/12 mid" },
    { ip: "172.31.255.255", expected: true, description: "private 172.16.0.0/12 end" },
    { ip: "192.168.0.1", expected: true, description: "private 192.168.0.0/16 start" },
    { ip: "192.168.1.100", expected: true, description: "private 192.168.0.0/16 mid" },
    { ip: "169.254.169.254", expected: true, description: "link-local AWS metadata" },
    { ip: "169.254.0.1", expected: true, description: "link-local 169.254.0.0/16 start" },
    { ip: "0.0.0.0", expected: true, description: "unspecified 0.0.0.0/8" },
    { ip: "0.1.2.3", expected: true, description: "current network 0.0.0.0/8" },
    { ip: "224.0.0.1", expected: true, description: "multicast range" },
    { ip: "240.0.0.1", expected: true, description: "reserved future range" },
    { ip: "255.255.255.255", expected: true, description: "broadcast" },
    { ip: "::1", expected: true, description: "IPv6 loopback" },
    { ip: "::", expected: true, description: "IPv6 unspecified" },
    { ip: "fc00::1", expected: true, description: "IPv6 unique local fc00::/7" },
    { ip: "fd12:3456:789a::1", expected: true, description: "IPv6 unique local fd00::/8" },
    { ip: "fe80::1", expected: true, description: "IPv6 link-local fe80::/10" },
    { ip: "febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff", expected: true, description: "IPv6 link-local end" },
    { ip: "::ffff:127.0.0.1", expected: true, description: "IPv4-mapped loopback" },
    { ip: "::ffff:10.0.0.1", expected: true, description: "IPv4-mapped private 10.x" },
    { ip: "::ffff:192.168.1.1", expected: true, description: "IPv4-mapped private 192.168.x" },
    { ip: "::ffff:169.254.169.254", expected: true, description: "IPv4-mapped metadata" },
    { ip: "::ffff:8.8.8.8", expected: true, description: "IPv4-mapped public" },
    { ip: "8.8.8.8", expected: false, description: "public Google DNS" },
    { ip: "1.1.1.1", expected: false, description: "public Cloudflare DNS" },
    { ip: "172.15.0.1", expected: false, description: "public just below 172.16" },
    { ip: "172.32.0.1", expected: false, description: "public just above 172.31" },
    { ip: "192.167.1.1", expected: false, description: "public just below 192.168" },
    { ip: "192.169.1.1", expected: false, description: "public just above 192.168" },
    { ip: "2606:4700:4700::1111", expected: false, description: "public Cloudflare IPv6" },
    { ip: "2001:4860:4860::8888", expected: false, description: "public Google IPv6" },
  ];

  for (const { ip, expected, description } of cases) {
    it(`evaluates ${description} (${ip}) -> ${expected}`, () => {
      expect(isPrivateOrReservedIp(ip)).toBe(expected);
    });
  }

  it("handles malformed IPv4 and IPv6 as reserved/unsafe", () => {
    expect(isPrivateOrReservedIp("999.999.999.999")).toBe(false); // not IP family, not localhost
    expect(parseIpv6Words("invalid:::ipv6")).toBeNull();
  });
});

function mockDns(addresses: Array<{ address: string; family: number }>) {
  return vi
    .spyOn(dns.promises, "lookup")
    .mockImplementation((() => Promise.resolve(addresses)) as never);
}

function mockDnsOnce(addresses: Array<{ address: string; family: number }>) {
  return vi
    .spyOn(dns.promises, "lookup")
    .mockImplementationOnce((() => Promise.resolve(addresses)) as never);
}

describe("validateDestinationUrl", () => {
  it("rejects non-http(s) schemes", async () => {
    const ftp = await validateDestinationUrl("ftp://example.com/file.txt");
    expect(ftp.ok).toBe(false);
    expect(ftp.error).toContain("Invalid URL protocol");

    const file = await validateDestinationUrl("file:///etc/passwd");
    expect(file.ok).toBe(false);
    expect(file.error).toContain("Invalid URL protocol");
  });

  it("rejects localhost and reserved hostnames", async () => {
    const local = await validateDestinationUrl("http://localhost:3000/api");
    expect(local.ok).toBe(false);
    expect(local.error).toContain("SSRF protection");

    const internal = await validateDestinationUrl("http://service.internal");
    expect(internal.ok).toBe(false);
    expect(internal.error).toContain("SSRF protection");
  });

  it("rejects IP literal destinations pointing to private ranges", async () => {
    const loopback = await validateDestinationUrl("http://127.0.0.1:8080");
    expect(loopback.ok).toBe(false);
    expect(loopback.error).toContain("SSRF protection");

    const meta = await validateDestinationUrl("http://169.254.169.254/latest/meta-data");
    expect(meta.ok).toBe(false);
    expect(meta.error).toContain("SSRF protection");

    const ipv6 = await validateDestinationUrl("http://[::1]:8080");
    expect(ipv6.ok).toBe(false);
    expect(ipv6.error).toContain("SSRF protection");
  });

  it("rejects hostnames that resolve to private IP addresses", async () => {
    const lookupSpy = mockDnsOnce([{ address: "10.0.0.12", family: 4 }]);

    const res = await validateDestinationUrl("https://internal-portal.corp");
    expect(res.ok).toBe(false);
    expect(res.error).toContain("resolved to private or reserved IP");
    lookupSpy.mockRestore();
  });

  it("accepts valid public hostnames", async () => {
    const lookupSpy = mockDnsOnce([{ address: "93.184.216.34", family: 4 }]);

    const res = await validateDestinationUrl("https://example.com");
    expect(res.ok).toBe(true);
    lookupSpy.mockRestore();
  });
});

describe("checkDestination", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns ok for 200 OK HEAD response", async () => {
    mockDns([{ address: "93.184.216.34", family: 4 }]);

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers(),
    } as Response);

    const result = await checkDestination("https://example.com");
    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.checkedAt).toBeDefined();
  });

  it("falls back to GET if HEAD returns 405 Method Not Allowed", async () => {
    mockDns([{ address: "93.184.216.34", family: 4 }]);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        status: 405,
        headers: new Headers(),
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        body: { cancel: vi.fn().mockResolvedValue(undefined) },
      } as unknown as Response);

    globalThis.fetch = fetchMock;

    const result = await checkDestination("https://example.com/no-head");
    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("follows valid redirects up to 3 hops", async () => {
    mockDns([{ address: "93.184.216.34", family: 4 }]);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        status: 301,
        headers: new Headers({ location: "https://example.com/hop1" }),
      } as Response)
      .mockResolvedValueOnce({
        status: 302,
        headers: new Headers({ location: "https://example.com/hop2" }),
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
      } as Response);

    globalThis.fetch = fetchMock;

    const result = await checkDestination("https://example.com/start");
    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("rejects if redirect limit exceeds 3 hops", async () => {
    mockDns([{ address: "93.184.216.34", family: 4 }]);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        status: 301,
        headers: new Headers({ location: "https://example.com/1" }),
      } as Response)
      .mockResolvedValueOnce({
        status: 301,
        headers: new Headers({ location: "https://example.com/2" }),
      } as Response)
      .mockResolvedValueOnce({
        status: 301,
        headers: new Headers({ location: "https://example.com/3" }),
      } as Response)
      .mockResolvedValueOnce({
        status: 301,
        headers: new Headers({ location: "https://example.com/4" }),
      } as Response);

    globalThis.fetch = fetchMock;

    const result = await checkDestination("https://example.com/start");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Redirect limit exceeded");
  });

  it("rejects redirect to a private IP (SSRF in redirect hop)", async () => {
    mockDns([{ address: "93.184.216.34", family: 4 }]);

    const fetchMock = vi.fn().mockResolvedValueOnce({
      status: 302,
      headers: new Headers({ location: "http://192.168.1.1/admin" }),
    } as Response);

    globalThis.fetch = fetchMock;

    const result = await checkDestination("https://example.com/redirect-to-lan");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("SSRF protection");
  });

  it("reports failure on HTTP 404 or 500 response", async () => {
    mockDns([{ address: "93.184.216.34", family: 4 }]);

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 404,
      headers: new Headers(),
    } as Response);

    const result = await checkDestination("https://example.com/missing");
    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(404);
    expect(result.error).toContain("HTTP status 404");
  });

  it("handles timeout abort cleanly", async () => {
    mockDns([{ address: "93.184.216.34", family: 4 }]);

    globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
      const error = new Error("The operation was aborted");
      error.name = "AbortError";
      if (init?.signal) {
        Object.defineProperty(init.signal, "aborted", { value: true });
      }
      return Promise.reject(error);
    });

    const result = await checkDestination("https://example.com/slow");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("timed out");
  });

  it("handles redirect missing Location header", async () => {
    mockDns([{ address: "93.184.216.34", family: 4 }]);

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 302,
      headers: new Headers(),
    } as Response);

    const result = await checkDestination("https://example.com/bad-redirect");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("without Location header");
  });

  it("handles network error when both HEAD and GET fail", async () => {
    mockDns([{ address: "93.184.216.34", family: 4 }]);

    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

    const result = await checkDestination("https://example.com/down");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Connection refused");
  });

  it("handles HEAD network failure falling back to successful GET", async () => {
    mockDns([{ address: "93.184.216.34", family: 4 }]);

    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("HEAD socket hangup"))
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        body: { cancel: vi.fn().mockResolvedValue(undefined) },
      } as unknown as Response);

    globalThis.fetch = fetchMock;

    const result = await checkDestination("https://example.com/head-fails-get-works");
    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(200);
  });

  it("handles DNS lookup error gracefully", async () => {
    vi.spyOn(dns.promises, "lookup").mockRejectedValue(new Error("ENOTFOUND"));

    const result = await checkDestination("https://non-existent-domain-12345.com");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("DNS resolution failed");
  });

  it("handles DNS returning empty address array", async () => {
    mockDns([]);

    const result = await checkDestination("https://empty-dns-record.com");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("no addresses found");
  });

  it("handles invalid URL string gracefully", async () => {
    const result = await checkDestination("not-a-valid-url");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Invalid URL");
  });
});
