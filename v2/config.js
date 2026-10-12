/* AURA v2 前端公开配置。anon key 为可公开浏览器密钥（权限受 RLS + RPC 限制）。切勿放 service_role key。
 *
 * MODE:
 *   "mock" —— 演示模式：不调用任何后端，任意访问码可进入、不扣次，页面顶部常驻“演示模式”标识，
 *             分享链接仅在本机浏览器可打开。仅用于 start_session/complete_session/get_share 上线前的测试。
 *   "live" —— 正式模式：调用 Supabase RPC。此时 URL 参数 ?mock=1 会被完全忽略，用户无法绕过付费。
 *
 * 上线切换（迁移 SQL 执行并验证后）：把下面 MODE 改为 "live" 并推送。不要把 MODE 留在 "mock" 并公开投放链接。
 */
window.AURA_CONFIG = {
  MODE: "live",
  SUPABASE_URL: "https://nkkcecuopkdmtvsjdcav.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ra2NlY3VvcGtkbXR2c2pkY2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NzA2MjAsImV4cCI6MjEwNzM0NjYyMH0.sRLQ8VX9VXstvTVD4g1OP8ITVuQvNJ2xe23yq__OGdk"
};
