// Owner: Megha | Task: MEG-P1-2 | Priority: P1

export interface ApiFetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiClientError extends Error {
  code?: string;
  fields?: Record<string, string>;

  constructor(message: string, code?: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.fields = fields;
  }
}

export async function apiClient<T>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  const { params, headers, ...rest } = options;

  let url = endpoint;
  if (params) {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined) {
        query.set(key, String(val));
      }
    }
    const queryString = query.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...rest,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiClientError(
      body?.error?.message || "An API error occurred",
      body?.error?.code,
      body?.error?.fields
    );
  }

  return body.data as T;
}
