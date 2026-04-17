import { NextRequest } from "next/server";

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

function filterHeaders(headers: Headers): Headers {
  const nextHeaders = new Headers(headers);
  for (const [key] of nextHeaders) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower) || BROWSER_ONLY_HEADERS.has(lower)) {
      nextHeaders.delete(key);
    }
  }
  return nextHeaders;
}

function buildResponseHeaders(headers: Headers): Headers {
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

async function proxyRequest(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("url");
  if (!target) {
    return Response.json({ error: "Missing url parameter." }, { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch {
    return Response.json({ error: "Invalid url parameter." }, { status: 400 });
  }

  if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
    return Response.json(
      { error: "Only http and https URLs are supported." },
      { status: 400 }
    );
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

export async function GET(request: NextRequest) {
  return proxyRequest(request);
}

export async function POST(request: NextRequest) {
  return proxyRequest(request);
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request);
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request);
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request);
}

export async function OPTIONS(request: NextRequest) {
  return proxyRequest(request);
}
