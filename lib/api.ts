// Owner: Megha | Task: MEG-P1-2 | Priority: P1

export interface ApiFetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

// TODO (MEG-P1-2): Unified API fetch client with error handling and mock data switching
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

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message || "An API error occurred");
  }

  return body.data as T;
}
