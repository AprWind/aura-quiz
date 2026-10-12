/* AURA v2 前端公开配置。anon key 为可公开浏览器密钥（权限受 RLS + RPC 限制）。切勿放 service_role key。
 *
 * MODE:
 *   "mock" —— 演示模式：不调用任何后端，任意访问码可进入、不扣次，页面顶部常驻“演示模式”标识，
 *             分享链接仅在本机浏览器可打开。仅用于 start_session/complete_session/get_share 上线前的测试。
 *   "live" —— 正式模式：调用后端 RPC。此时 URL 参数 ?mock=1 会被完全忽略，用户无法绕过付费。
 *
 * API 路由（live）：
 *   API_BASE —— Cloudflare Worker 代理根 URL（推荐，国内/微信友好），请求走
 *               POST {API_BASE}/rpc/{start_session|complete_session|get_share}，
 *               anon key 由 Worker 注入，前端不必也不应再直连 supabase.co。
 *   USE_DIRECT_SUPABASE —— 仅当显式为 true 时才回退到 SUPABASE_URL + 浏览器侧 anon key。
 *               默认 false。未设置 API_BASE 且未开直连时，live 请求会失败并提示配置错误。
 *
 * 上线切换（迁移 SQL 执行并验证后）：把下面 MODE 改为 "live" 并推送。不要把 MODE 留在 "mock" 并公开投放链接。
 * Worker 部署后把 API_BASE 改成实际 workers.dev（或自定义域）URL 并推送。
 */
window.AURA_CONFIG = {
  MODE: "live",
  /* 部署 Worker 后填入，例如 "https://aura-quiz-proxy.<subdomain>.workers.dev" — 勿带尾斜杠 */
  API_BASE: "https://aura-quiz-proxy.vercel.app",
  /* 仅排障时显式 true；生产应走 API_BASE 代理 */
  USE_DIRECT_SUPABASE: false,
  SUPABASE_URL: "https://nkkcecuopkdmtvsjdcav.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ra2NlY3VvcGtkbXR2c2pkY2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NzA2MjAsImV4cCI6MjEwNzM0NjYyMH0.sRLQ8VX9VXstvTVD4g1OP8ITVuQvNJ2xe23yq__OGdk"
};
