import { NextRequest, NextResponse } from "next/server";

function isSafeProxyUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" || url.username || url.password) return false;

  const hostname = url.hostname.toLowerCase();
  return !(
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "::1" ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-proxy-secret");
  const expectedSecret = (process.env.JWT_SECRET || "").replace(/\s+/g, "");
  if (!expectedSecret || !secret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await request.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }
  if (!isSafeProxyUrl(url)) {
    return NextResponse.json({ error: "Only public HTTPS URLs are allowed" }, { status: 400 });
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
      Referer: "https://www.instagram.com/",
    },
    signal: AbortSignal.timeout(90000),
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: `Upstream returned ${response.status}` },
      { status: 502 },
    );
  }

  const buffer = await response.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(buffer.byteLength),
    },
  });
}
