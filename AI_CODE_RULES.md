# Loomark AI / TypeScript 编码约束

这份文档位于仓库根目录，是所有人和 AI 生成代码的强制约束。新增代码必须遵守；修改旧代码时，应顺手消除触及范围内的违规写法。

## 1. 类型安全

- 禁止使用 `any`、`unknown`、`object`、无约束的 `Record<string, ...>` 和 `as any`。
- 所有跨边界数据必须有明确的 TypeScript 类型，并且在运行时使用 Zod schema 校验。
- `JSON.parse`、`Request.json()`、环境变量、数据库结果、第三方 SDK 返回值都视为不可信输入，不能直接断言后使用。
- 类型定义放在 `packages/shared`，前端、后端和浏览器插件不得重复定义同一份请求/响应类型。
- 优先使用 discriminated union、泛型和精确的 `Pick` / `Omit`；不能为了通过编译放宽类型。

## 2. 输入校验与错误处理

- API、tRPC procedure、消息传递和表单输入必须先经过 Zod `safeParse` 或 tRPC 的 Zod adapter。
- 业务函数统一返回 `Result<T, E>`，不使用 `null`/`undefined` 表示业务错误。
- 禁止使用 `try/catch` 做正常流程控制。可恢复失败使用 `Result`，异步操作使用 `Result.fromPromise` 或显式 `.then/.catch` 转换。
- 只有进程边界（HTTP handler、worker 启动、CLI 入口）可以捕获未预期异常；捕获后必须记录结构化日志并转换成统一错误响应，不能吞掉错误。
- 错误类型必须可判别，至少包含 `code`、面向用户的 `message` 和可选的 `details`，禁止直接把第三方异常对象返回给客户端。

## 3. 模块边界

- `frontend` 只负责展示、交互和调用协议，不直接访问 MongoDB。
- `backend` 负责 tRPC、REST adapter、认证、授权、业务用例和数据访问。
- `extension` 只通过 `packages/shared` 中的契约调用后端，不复制业务逻辑。
- `packages/shared` 只放类型、Zod schema、错误码、API 路径和无副作用的纯函数，不依赖 Next.js、MongoDB 或浏览器 API。
- 禁止跨层直接 import 内部实现；跨包依赖必须通过公开入口导出。
- `backend` 独占 MongoDB 连接、数据库访问、JWT 密钥、API Token 和其他服务端密钥；这些变量只能从 `backend/.env` 或部署环境注入。`frontend` 不得直接连接 MongoDB 或读取上述密钥，只能通过 backend 协议访问数据，并使用 `BACKEND_URL` 等非敏感代理配置。
- MongoDB 连接必须通过 backend 的通用数据库封装创建，并设置可识别的驱动 `appName`（默认 `bookmark-nav`）。每个 collection 必须在 `backend/src/database/collections` 下拥有固定名称、完整字段定义、Mongo validator 和索引；服务启动时统一初始化并校验 schema，业务 repository 不得动态创建 collection 或自行 new `MongoClient`。

## 4. API 与安全

- tRPC 是内部业务协议；插件使用同一份 schema 适配的 REST endpoint。
- 所有写入接口必须鉴权、授权、校验 URL，并限制请求体大小和频率。
- Token 只能从环境变量或安全存储读取，严禁写入源码、日志或前端 bundle。
- 用户输入输出默认按不可信内容处理，避免 XSS、SSRF、开放重定向和 Mongo 注入。

## 5. 数据库与并发

- MongoDB collection、索引和迁移必须有明确 schema；唯一性约束不能只依赖应用层判断。
- 所有写操作必须考虑重复请求（幂等键或唯一索引）和并发更新。
- 数据库访问放在 repository 层，业务层不得拼接 Mongo 查询。

## 6. 测试与交付

- 测试框架优先使用 Vitest；前端交互测试使用 Testing Library 和 `userEvent`，需要拦截网络请求时使用 MSW 或项目已有的协议测试工具。新增功能不得只依赖手工验证，必须补充可重复执行的自动化测试。
- 测试必须从用户使用角度编写：以“用户执行什么操作、界面展示什么、用户最终得到什么结果”为测试场景，使用可访问角色、标签和可见文本定位元素。不得以组件内部状态、私有函数、实现细节、调用次数或 DOM 结构作为主要断言，也不要为了测试而导出内部实现。
- 每个用户可见功能至少覆盖：主要成功流程、用户输入无效时的提示、加载/空状态、可恢复的网络或服务错误，以及刷新或重复操作后的结果（适用时）。键盘操作、提交后禁用重复提交、权限不足和移动端关键布局（适用时）也要从用户行为验证。
- 每个公开 procedure/endpoint 至少有成功、鉴权失败、输入失败和资源不存在测试；断言应模拟消费者看到的响应、错误信息和状态变化，而不是 repository 或 handler 的内部实现。
- 修复 bug 必须补回归测试；共享 schema 变更必须同时更新前端和插件的用户流程测试。测试名称应描述用户场景，例如“用户提交无效网址后看到校验提示”。
- 项目统一使用 pnpm；不得提交 `package-lock.json` 或使用 npm 安装依赖。测试脚本必须可在干净环境运行，并提供单次执行命令（例如 `pnpm test` 或 `pnpm exec vitest run`）和开发监听命令（例如 `pnpm test:watch`）。提交前必须运行相关 Vitest 测试，并通过 `pnpm build:frontend`、后端类型检查和 extension build。
- 不提交密钥、个人数据、构建产物和临时文件。

## 7. 代码风格

- 函数保持单一职责，业务规则命名清晰；禁止通过注释解释可以通过命名表达的代码。
- 优先小而明确的模块，避免为了复用提前抽象。

## 8. 前端主题

- 前端所有可见样式必须遵守 [`docs/theme-system.md`](docs/theme-system.md)。
- 新增或修改颜色、背景、边框、阴影、聚焦环和交互态时，必须使用主题令牌；不得新增界面颜色字面量。
- 新增主题必须补齐 `ThemeTokens`，并验证浅色、深色、预设主题和移动端状态。
- 结构化日志使用固定字段（`requestId`、`userId`、`code`），禁止 `console.log` 输出敏感数据。
