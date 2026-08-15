# Loomark

一个面向个人和小团队的现代网址导航工作台，基于 Next.js App Router、tRPC、MongoDB 和 Docker Compose 设计。

## Monorepo 结构

```text
frontend/          Next.js 工作台、页面级 API proxy 和 UI 状态
backend/           独立 tRPC 服务、业务用例和数据访问边界
extension/         Chrome MV3 插件，调用共享 API 契约
packages/shared/   Zod schema、Result、错误码和 API 路径
AI_CODE_RULES.md   AI 与团队统一编码约束
```

`frontend` 与 `backend` 可以分别部署；开发阶段 Next.js 的 `/api/trpc` 和 `/api/v1` 作为同源入口，生产环境可将它们反向代理到独立 backend。所有跨端请求类型从 `@loomark/shared` 引用。

## 当前 MVP

- 书签卡片工作台，支持响应式布局
- 目录筛选、标签筛选、关键词搜索、最近/热门/名称排序
- 添加书签时自动推导域名和 Google favicon
- 点击统计
- tRPC 路由：`/api/trpc`
- 浏览器插件友好的 REST 写入接口：`POST /api/v1/bookmarks`
- Bearer API Token 鉴权，默认开发 Token 为 `demo-api-token`
- Credentials 登录 Cookie 接口：`POST /api/auth/login`
- 邮箱密码登录使用 backend 固定初始化账号，账号设置、目录和标签修改均通过受鉴权 API 完成

开发环境初始化账号：`test@bookmark-nav.local` / `Test123456!`。该账号仅用于本地验证，部署前应替换或移除 seed 用户。
- Docker Compose 自托管配置（应用 + MongoDB）

## 开发

```bash
corepack enable
pnpm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
pnpm dev:backend
pnpm dev:frontend
```

打开 http://localhost:3000。生产构建使用 `pnpm build && pnpm start`。

## 浏览器插件接口

```bash
curl -X POST http://localhost:3000/api/v1/bookmarks \
  -H 'Authorization: Bearer demo-api-token' \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com","title":"Example","folderId":"dev","tags":["ai"]}'
```

`GET /api/v1/bookmarks` 返回公开的当前工作区书签；写入接口必须携带 Token。生产环境请通过环境变量 `API_TOKEN` 设置随机值，并使用 HTTPS。

## 自托管

```bash
docker compose up -d --build
```

MongoDB 已包含在 Compose 中，独立 backend 负责 MongoDB 连接、书签数据访问和鉴权。集合定义位于 `backend/src/database/collections`，backend 启动时创建并校验固定的 `bookmarks`、`folders`、`tags` 和 `users` collection、字段 validator 和索引；运行期间不会按请求动态创建 collection。数据库连接通过统一模块设置 `MONGODB_APP_NAME`（默认 `bookmark-nav`），便于在 MongoDB 监控中识别应用。

Google 登录的标准实现是 OAuth 2.0 授权码流程：前端只跳转到 Google，不接触密钥；Google 回调 backend，backend 使用仅存在于 `backend/.env` 的 `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` 换取授权码对应的用户信息，按邮箱匹配已存在的 `users` 文档，最后签发本项目自己的 HttpOnly Cookie。当前版本先启用邮箱密码登录，Google 配置变量已保留但尚未开放 OAuth 回调，也不会因此自动注册用户。

## 接口选择

前端和后端同仓库部署，核心业务协议使用 tRPC；插件使用旁路 REST endpoint，避免在 MV3 service worker 中引入 tRPC runtime。两者共享同一组业务函数，后续可以用 `trpc-openapi` 生成更完整的 OpenAPI 文档。
