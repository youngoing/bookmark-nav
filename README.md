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
- 用户隔离的 REST 接口，所有个人资源均由 Session 中的用户身份限定
- 独立的分享发布与发现接口，分享内容不会混入个人书签
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

未配置 `BACKEND_URL` 时，前端 API 代理在本地和生产环境均使用 `4001` 端口。容器或独立部署等场景请通过 `BACKEND_URL` 显式覆盖后端地址。

浏览器扩展不能使用系统级 Token 访问个人数据；后续扩展接入必须使用绑定具体用户的授权令牌。

## 自托管

```bash
docker compose up -d --build
```

MongoDB 已包含在 Compose 中，独立 backend 负责 MongoDB 连接、书签数据访问和鉴权。集合定义位于 `backend/src/database/collections`，backend 启动时创建并校验固定的 `sites`、`bookmarks`、`folders`、`tags`、`bookmark_publications`、`shared_collections` 和 `users` collection、字段 validator 和索引。`Site` 是父级网站，`Bookmark` 通过 `siteId` 保存网站下的具体子链接；个人标签可将选定书签发布为不含私人元数据的共享合集快照。个人数据集合模式不匹配时会直接删除重建，不执行旧数据迁移。数据库连接通过统一模块设置 `MONGODB_APP_NAME`（默认 `bookmark-nav`），便于在 MongoDB 监控中识别应用。

Google 登录使用 OAuth 2.0 授权码流程：前端只跳转到 Google，不接触密钥；回调地址为 `/auth/google/callback`，backend 使用 `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` 换取并验证用户信息，按邮箱匹配已有用户，或在首次登录时自动创建用户，最后签发本项目自己的 HttpOnly Cookie。

## 接口选择

前端和后端同仓库部署，Web 端通过同源 REST 代理访问 backend，所有个人资源接口都要求携带用户 Session。tRPC 保留同样的 Session 用户上下文。浏览器扩展后续必须接入绑定具体用户的授权令牌，不能使用系统级共享 Token。
