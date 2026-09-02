# 主题系统规范

本文档是 `frontend` 主题系统的强制规范。新增或修改任何可见 UI 样式时，必须同时检查主题令牌、浅色主题、深色主题、预设主题和移动端表现。

## 目标

- 所有界面样式节点都必须处于主题控制范围内。
- 组件不直接依赖某个主题名称，也不直接写死界面颜色。
- 主题切换只改变令牌，不修改业务组件结构。
- 主题配置必须可以安全持久化、迁移和扩展到图片背景。

## 分层

主题系统分为四层：

1. **主题配置层**：[`frontend/app/theme-config.ts`](../frontend/app/theme-config.ts)
   - 定义 `ThemeId`、`ThemeMode`、`ThemeTokens` 和预设主题。
   - 主题只能通过类型安全的配置进入页面。
   - 禁止在配置中保存任意 CSS 片段。

2. **主题运行时层**：[`frontend/app/theme-provider.tsx`](../frontend/app/theme-provider.tsx)
   - 负责读取和保存主题选择。
   - 将令牌写入 `document.documentElement`。
   - `localStorage` 只作为当前阶段的本地持久化方案，后续可替换为用户偏好接口。

3. **样式令牌层**：[`frontend/app/globals.css`](../frontend/app/globals.css)
   - 页面样式通过 `--theme-*` 或兼容别名 `--bg`、`--panel` 等消费令牌。
   - 兼容别名只用于渐进迁移，新增样式优先使用 `--theme-*`。
   - 所有交互态也必须使用令牌，包括 `hover`、`active`、`focus`、`disabled`、错误和成功状态。

4. **组件层**
   - 组件只声明布局、尺寸、排版和结构。
   - 组件不得根据 `themeId` 写条件分支。
   - 组件不得直接写入 `document.documentElement.style`。

- `data-theme` 仅保留为旧 CSS 的兼容标记，固定为 `light`；实际界面颜色只能来自根节点注入的 `--theme-*` 令牌，`data-theme-preset` 仅标识当前预设。
- 界面只提供一个主题选择器，第一项固定为“跟随系统”，随后提供“默认白”“默认黑”和风格预设；默认白与默认黑是稳定的基础主题，不承载场景特效。
- 有背景图的主题必须同时提供遮罩层、半透明表面和可读性兜底，不能只铺一张图片。
- 每个背景图必须同时提供 `fallback` CSS 背景层；远程图片加载失败时仍需保留主题视觉，不得显示空白背景。
- 每个预设至少应有一个与主题语义对应的风格元素，例如纸张虚线边框、森林侧边色带或赛博扫描线；EVA 主题使用人物背景和红色光晕，不使用斜杠警示纹理。

## 用户主题存储

用户主题偏好存储在独立的 `user_preferences` collection，不写入 `auth_user`，也不与书签、目录、标签混存。

文档结构：

```text
userId       string  unique
themeId      enum(default, midnight, sakura, forest, paper, cyber)
themeMode    enum(system, light, dark)
version      int >= 1
createdAt    ISO string
updatedAt    ISO string
```

接口：

```text
GET   /api/v1/preferences
PATCH /api/v1/preferences
```

约束：

- 接口只接受当前登录会话，不接受 API Key 修改用户主题。
- `themeId` 和 `themeMode` 必须经过 `packages/shared` 中的 Zod schema 校验。
- 首次读取会幂等创建默认偏好。
- 主题枚举扩展属于兼容迁移，后端启动时会通过 `collMod` 更新 `user_preferences` Validator，不会删除集合或重置用户偏好。
- 前端先用本地配置立即渲染，登录后从服务端覆盖。
- 服务端不可用时保留本地主题，不阻塞工作台加载。
- 更新采用整组 `themeId + themeMode` 写入，避免两个字段产生不一致。
- `version` 每次更新递增，为后续偏好迁移和冲突处理保留空间。

## EVA · 明日香预设

`eva-asuka` 是一个红色系二次元风格预设，设计依据来自检索到的角色视觉特征：

- 烧橙色头发和红色头戴设备作为主色来源。
- 红橙插入栓和深蓝反差作为强调色与文字对比。
- 黑红工业驾驶舱、警示灯和玻璃反光作为页面氛围。
- 人物放在背景右侧，左侧保留内容安全区，让人物成为第一视觉信号但不遮挡书签信息。
- 卡片采用半透明深红表面，确保背景图存在时仍能阅读书签内容。

主背景使用项目内的 [`asuka.png`](../frontend/public/theme/asuka.png)，左侧导航使用 [`asuka.leff-bar.jpg`](../frontend/public/theme/asuka.leff-bar.jpg)；两者都通过本地静态路径提供，并在其上叠加半透明深色遮罩以保证导航与书签内容可读。公开部署前仍应确认这些素材具备相应的使用授权。

其他预设不在用户打开页面时调用文字生图接口，直接使用稳定的 CSS 视觉背景兜底，避免出现“图片正在生成中”的占位内容。

## 令牌分类

| 分类       | 令牌示例                                                                       | 用途                     |
| ---------- | ------------------------------------------------------------------------------ | ------------------------ |
| 页面表面   | `--theme-bg`、`--theme-panel`、`--theme-panel-elevated`                        | 页面、卡片、弹窗、侧栏   |
| 内容文字   | `--theme-ink`、`--theme-muted`、`--theme-text-subtle`、`--theme-text-faint`    | 标题、正文、辅助信息     |
| 边界和输入 | `--theme-line`、`--theme-input-border`、`--theme-focus-ring`                   | 边框、表单聚焦           |
| 品牌强调   | `--theme-accent`、`--theme-accent-dark`、`--theme-on-accent`                   | 主按钮、选中态、品牌标记 |
| 控件状态   | `--theme-control-bg`、`--theme-control-hover`、`--theme-control-selected`      | 选择器、导航、切换按钮   |
| 业务状态   | `--theme-success`、`--theme-warning`、`--theme-danger`                         | 成功、警告、错误、删除   |
| 状态表面   | `--theme-success-surface`、`--theme-warning-surface`、`--theme-danger-surface` | 状态提示的背景           |
| 结构细节   | `--theme-table-header`、`--theme-favicon-bg`、`--theme-upgrade-surface`        | 表头、图标容器、升级提示 |
| 层级效果   | `--theme-backdrop`、`--theme-card-shadow`、`--theme-radius`                    | 遮罩、阴影、圆角         |

## 强制规则

### 颜色

- 禁止在 `globals.css` 新增界面颜色字面量，例如 `#ffffff`、`rgba(...)`。
- 禁止使用主题无关的 `background: white`、`color: black`。
- 禁止为了适配深色主题复制一套组件 CSS；应扩展 `ThemeTokens`。
- `color-mix()` 的基色必须是主题令牌，不能使用固定白色或黑色。
- 用户内容颜色（例如标签颜色）属于数据，不属于界面主题；必须通过 `--tag-color` 这类明确的数据变量进入样式。

### 组件

- 背景、文字、边框、阴影、聚焦环和状态色都必须来自主题令牌。
- 每个新组件至少检查：默认主题、深夜黑、樱花粉、赛博霓虹和窄屏。
- 新增弹层必须使用 `--theme-backdrop`、`--theme-panel` 和主题阴影。
- 新增表单控件必须使用 `--theme-control-bg`、`--theme-input-border` 和 `--theme-focus-ring`。
- 禁止使用 `[data-theme="dark"]` 为新组件添加专属样式；优先修改主题配置或使用通用令牌。

### 主题配置

- 新主题必须补齐全部 `ThemeTokens`，不能通过 `as` 绕过类型检查。
- 主题名称、预览色和描述必须与实际令牌一致。
- 主题配置不能包含 URL、HTML、CSS、脚本或用户上传内容。
- 图片背景应只保存资源 URL 和受限参数，不能将大图 Base64 写入 MongoDB。

## 新增主题流程

1. 在 `ThemeTokens` 增加确有必要的新语义令牌。
2. 为基础主题、深色主题和新预设主题提供值。
3. 在组件中使用语义令牌，不使用主题 ID 判断。
4. 检查所有交互态和弹层层级。
5. 补充主题切换或视觉回归测试。
6. 更新本文档的令牌表或例外说明。

## 当前迁移状态

核心页面容器、导航、表单、表格、弹窗、登录页、管理后台和状态提示已经接入主题兼容层。旧 CSS 中的兼容规则仍会逐步收敛到 `--theme-*`，后续修改触及旧规则时必须一并迁移，不能继续扩大硬编码颜色范围。

下一阶段包括：

- 账号设置中的完整外观编辑器
- 自定义颜色和圆角配置
- 图片上传、裁剪、透明度、模糊和遮罩
- 用户偏好后端同步
- 主题配置导入导出
