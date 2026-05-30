// Same-origin proxy for A2A agents.
//
// Browser clients cannot reach cross-origin agents directly (CORS). The UI
// rewrites such requests to `/api/proxy?url=<target>` and this handler forwards
// them server-side. Ported from the original Next.js route handler; works with
// the web-standard Request/Response so it can be mounted in any host (Vite dev
// middleware or the production Node server).

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const BROWSER_ONLY_HEADERS = new Set([
  "origin",
  "referer",
  "sec-ch-ua",
  "sec-ch-ua-arch",
  "sec-ch-ua-bitness",
  "sec-ch-ua-full-version",
  "sec-ch-ua-full-version-list",
  "sec-ch-ua-mobile",
  "sec-ch-ua-model",
  "sec-ch-ua-platform",
  "sec-ch-ua-platform-version",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "sec-fetch-user",
]);

function filterHeaders(headers) {
  const nextHeaders = new Headers(headers);
  for (const [key] of nextHeaders) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower) || BROWSER_ONLY_HEADERS.has(lower)) {
      nextHeaders.delete(key);
    }
  }
  return nextHeaders;
}

function buildResponseHeaders(headers) {
  const nextHeaders = new Headers(headers);
  for (const [key] of nextHeaders) {
    const lower = key.toLowerCase();
    if (
      HOP_BY_HOP_HEADERS.has(lower) ||
      lower === "content-encoding" ||
      lower === "content-length"
    ) {
      nextHeaders.delete(key);
    }
  }
  return nextHeaders;
}

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function handleProxyRequest(request) {
  const target = new URL(request.url).searchParams.get("url");
  if (!target) {
    return Response.json({ error: "Missing url parameter." }, { status: 400 });
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch {
    return Response.json({ error: "Invalid url parameter." }, { status: 400 });
  }

  if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
    return Response.json({ error: "Only http and https URLs are supported." }, { status: 400 });
  }

  const headers = filterHeaders(request.headers);
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
    redirect: "follow",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: buildResponseHeaders(upstream.headers),
  });
}

/**
 * Connect-style middleware adapter so the same proxy logic can run inside the
 * Vite dev server, which exposes Node req/res rather than web Request/Response.
 */
export async function proxyNodeMiddleware(req, res) {
  try {
    const url = `http://localhost${req.originalUrl ?? req.url}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }

    let body;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = Buffer.concat(chunks);
    }

    const request = new Request(url, {
      method: req.method,
      headers,
      body,
      duplex: "half",
    });

    const response = await handleProxyRequest(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  } catch (error) {
    res.statusCode = 502;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Proxy failed." }));
  }
}
