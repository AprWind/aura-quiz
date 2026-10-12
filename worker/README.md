# aura-quiz-proxy (Cloudflare Worker)

China-friendly proxy so browsers (CN / WeChat) do not call `*.supabase.co` directly.
Forwards **only** these RPCs with the **public anon** key:

- `POST /rpc/start_session`
- `POST /rpc/complete_session`
- `POST /rpc/get_share`
- `OPTIONS` on the same paths (CORS)
- Aliases: `/api/supabase/rpc/<name>`

Everything else → 404. **Never** put `service_role` or DB passwords in this Worker, Pages, or GitHub.

## One-time: Cloudflare login (required)

On the box (Node ≥ 22):

```bash
export PATH="$HOME/.local/node-v22.20.0-linux-x64/bin:$PATH"   # if needed on this box
cd /workspace/side-income/test-tool/site/worker
npx wrangler login
npx wrangler whoami
```

`wrangler login` opens a browser OAuth flow — Justin must complete it once (parent can hand the desktop).

## Deploy

```bash
cd /workspace/side-income/test-tool/site/worker
# Paste the same public anon key from v2/config.js / deploy/supabase.txt (NOT service_role)
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler deploy
```

Note the printed URL, e.g. `https://aura-quiz-proxy.<subdomain>.workers.dev`.

## Point the frontend at the Worker

In `v2/config.js` set:

```js
API_BASE: "https://aura-quiz-proxy.<subdomain>.workers.dev",
```

Leave `USE_DIRECT_SUPABASE: false` (default). Then commit + push `v2/`.

## Verify (do not burn real access codes)

```bash
# Health
curl -sS "https://aura-quiz-proxy.<subdomain>.workers.dev/health"

# Invalid code — should return RPC JSON like invalid_or_exhausted, not a network error
curl -sS -X POST "https://aura-quiz-proxy.<subdomain>.workers.dev/rpc/start_session" \
  -H "Content-Type: application/json" \
  -H "Origin: https://aprwind.github.io" \
  -d '{"p_code":"INVALID-TEST","p_client_request_id":"00000000-0000-4000-8000-000000000001","p_gender":"female"}'

# Blocked path
curl -sS -o /dev/null -w "%{http_code}\n" -X POST \
  "https://aura-quiz-proxy.<subdomain>.workers.dev/rest/v1/rpc/start_session"
# expect 404
```

In browser (CN / WeChat): open https://aprwind.github.io/aura-quiz/v2/ with an invalid code — should show “访问码无效或次数已用完”, not a supabase.co connection error.

## CN risk note

`*.workers.dev` can still be slow or flaky on some mainland networks. If so, add a custom domain on Cloudflare (e.g. `api.yourdomain.com` → this Worker) which often routes better than the workers.dev subdomain.

## Local dry-run (no deploy)

```bash
# Needs the secret in .dev.vars (gitignored) — never commit it
echo 'SUPABASE_ANON_KEY=eyJ...' > .dev.vars
npx wrangler dev
```

## Status note (box deploy)

`npx wrangler whoami` was **not authenticated** on the agent box. A **temporary** preview deploy was used to verify the proxy (`wrangler deploy --temporary` + `--secrets-file`). That account must be **claimed within ~60 minutes** or a durable account used via `wrangler login` — otherwise the workers.dev URL disappears.

For production:

1. Justin runs `npx wrangler login` once (browser OAuth; parent can hand desktop), **or** claims the preview account in the Cloudflare dashboard.
2. `npx wrangler secret put SUPABASE_ANON_KEY` (anon only).
3. `npx wrangler deploy` → stable `https://aura-quiz-proxy.<account>.workers.dev`.
4. Set `v2/config.js` `API_BASE` to that URL and `USE_DIRECT_SUPABASE: false`, then commit + push.
