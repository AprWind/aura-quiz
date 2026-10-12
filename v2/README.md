# AURA v2 · 性张力打分（个人气场诊断报告）
纯静态，无构建。文件：`index.html` `style.css` `config.js` `data.js`(题库/权重/文案) `scoring.js` `app.js`，权重说明见 `WEIGHTS.md`。

## 模式开关（重要）
- `config.js` 中 `MODE: "mock"`：演示模式，不调用后端、任意 ≥4 位访问码可进入、不扣次；页面顶部常驻“演示模式”横条，报告和图片带“演示模式”水印；分享链接只存本机 localStorage。
- 迁移 SQL 执行并验证后，把 `MODE` 改为 `"live"` 并推送。live 下不存在任何 URL 参数/前端开关能回到 mock，无法绕过访问码。
- **在 MODE 为 live 之前，不要对外投放 v2 链接。**

## 后端 RPC（live）
- `start_session(p_code, p_client_request_id, p_gender)` 开局扣 1 次；同一 client_request_id 重试返回同一会话不重复扣。
- `complete_session(p_session_token, p_type_id, p_gender, p_scores)` → `share_token`。
- `get_share(p_token)` → 摘要（类型/性别/四维分），90 天有效。
- localStorage `aura_v2_state` 只存 session_token、client_request_id、性别、作答进度；**从不存访问码**，URL 只有 `#s=<不透明 token>`。

## 测试
`node test/scoring.test.js`（分布 + 12 型可达），`--calibrate` 重新计算 BIAS。

## Cloudflare Worker 代理（国内/微信）
见仓库 `worker/README.md`。部署后在 `config.js` 设置 `API_BASE` 为 Worker URL，并把 `USE_DIRECT_SUPABASE` 改为 `false`，避免浏览器直连 supabase.co。
