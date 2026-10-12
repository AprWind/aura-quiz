/**
 * AURA quiz v2 — China-friendly Supabase RPC proxy (Cloudflare Worker).
 * Only forwards allowlisted RPCs with the public anon key from secret SUPABASE_ANON_KEY.
 * NEVER put service_role or DB passwords here.
 */

const ALLOWED_RPCS = new Set(["start_session", "complete_session", "get_share"]);

const ALLOWED_ORIGINS = new Set([
  "https://aprwind.github.io",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:8080",
]);

function corsHeaders(origin) {
  const allow =
    origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://aprwind.github.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, Prefer",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
  });
}

/** Extract RPC name from /rpc/:name or /api/supabase/rpc/:name */
function parseRpcName(pathname) {
  const p = pathname.replace(/\/+$/, "") || "/";
  let m = p.match(/^\/rpc\/([a-z0-9_]+)$/i);
  if (m) return m[1];
  m = p.match(/^\/api\/supabase\/rpc\/([a-z0-9_]+)$/i);
  if (m) return m[1];
  return null;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      const name = parseRpcName(url.pathname);
      if (!name || !ALLOWED_RPCS.has(name)) {
        return new Response(null, { status: 404, headers: corsHeaders(origin) });
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return json(200, { ok: true, service: "aura-quiz-proxy", rpcs: [...ALLOWED_RPCS] }, origin);
    }

    if (request.method !== "POST") {
      return json(405, { ok: false, error: "method_not_allowed" }, origin);
    }

    const rpcName = parseRpcName(url.pathname);
    if (!rpcName || !ALLOWED_RPCS.has(rpcName)) {
      return json(404, { ok: false, error: "not_found" }, origin);
    }

    const anon = env.SUPABASE_ANON_KEY;
    const base = (env.SUPABASE_URL || "").replace(/\/+$/, "");
    if (!anon || !base) {
      return json(500, { ok: false, error: "proxy_misconfigured" }, origin);
    }

    let bodyText;
    try {
      bodyText = await request.text();
    } catch {
      return json(400, { ok: false, error: "bad_body" }, origin);
    }
    if (!bodyText) bodyText = "{}";
    // Reject obviously oversized payloads (RPC bodies are small)
    if (bodyText.length > 65536) {
      return json(413, { ok: false, error: "payload_too_large" }, origin);
    }

    const upstream = `${base}/rest/v1/rpc/${rpcName}`;
    let upstreamRes;
    try {
      upstreamRes = await fetch(upstream, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anon,
          Authorization: `Bearer ${anon}`,
          Prefer: "return=representation",
        },
        body: bodyText,
      });
    } catch (e) {
      return json(502, { ok: false, error: "upstream_unreachable" }, origin);
    }

    const text = await upstreamRes.text();
    const headers = {
      "Content-Type": upstreamRes.headers.get("Content-Type") || "application/json; charset=utf-8",
      ...corsHeaders(origin),
    };
    return new Response(text, { status: upstreamRes.status, headers });
  },
};
