# Better Auth 登录配置

认证服务由后端的 Better Auth 提供，Next.js 将同源的 `/api/auth/*` 请求转发到后端。认证数据写入 MongoDB 的 `auth_user`、`auth_session`、`auth_account` 和 `auth_verification` 集合。

所有 MongoDB 集合定义统一放在 `backend/src/database/collections/`，数据库文档类型统一使用 `DbXxx` 命名。Better Auth 集合定义位于其中的 `auth.ts`。

## 环境变量

在 `backend/.env` 中配置：

```dotenv
BETTER_AUTH_SECRET=<使用 openssl rand -base64 48 生成>
BETTER_AUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_PROXY_URL=

FEISHU_LOGIN_ENABLED=false
FEISHU_CLIENT_ID=
FEISHU_CLIENT_SECRET=
```

生产环境的 `BETTER_AUTH_URL` 必须填写用户实际访问的 HTTPS 地址，例如 `https://youngoing.cn`。OAuth 密钥只配置在后端，不应暴露给浏览器。

## OAuth 回调地址

- Google：`GOOGLE_REDIRECT_URI` 配置的地址，生产环境当前为 `https://youngoing.cn/auth/google/callback`
- 飞书：`https://<域名>/api/auth/callback/feishu`

Google 开放平台登记的授权回调地址必须与 `GOOGLE_REDIRECT_URI` 完全一致。旧 Google 回调路由会将结果转交 Better Auth 处理，授权请求和换 Token 始终使用同一个地址。

## 飞书开放平台

要允许不同企业的飞书用户授权，应用需要按飞书开放平台的商店应用流程创建、发布并设置可用范围，不要使用仅对单个企业开放的自建应用配置。代码使用飞书用户授权 OAuth 端点，不校验 `tenant_key`，也不限制邮箱域名。

在飞书开放平台完成以下配置：

1. 启用网页应用能力。
2. 在安全设置中登记上述飞书回调地址。
3. 发布商店应用，并将可用范围设置为目标外部用户。

当前默认关闭飞书登录。准备开放时补齐飞书凭证，并设置 `FEISHU_LOGIN_ENABLED=true`；配置缺失时后端会拒绝启动。

登录只读取授权用户的基础身份。商店应用不保证返回经过验证的邮箱，因此系统固定使用应用范围内稳定的 `open_id` 生成内部账号标识，不会在 `union_id` 和 `open_id` 之间切换，也不会将租户邮箱当作可信登录凭据。

## 迁移行为

服务启动时会把旧 `users` 集合复制到统一的 `auth_user`：

- 用户 ID 必须保持不变；目标中存在同邮箱但不同 ID 的用户时会停止迁移，禁止静默改写业务数据归属。
- 密码哈希只在凭证不存在时迁移到 `auth_account`，重跑不会覆盖用户后来设置的新密码。
- 启动阶段保留旧 `users` 集合，使候选版本失败时仍可回滚旧后端。
- 新版本稳定后执行 `pnpm --filter @loomark/backend migrate:auth:finalize`，将旧表原子重命名为 `users_legacy_backup`。

旧的 `bookmark_session` JWT 不再使用，部署后已登录用户需要重新登录一次。
