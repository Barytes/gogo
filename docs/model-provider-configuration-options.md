# 用户自定义 Model Provider 方案评估

> 适用范围：`gogo-app` 中“用户配置自己的 model provider”这条能力的产品与技术设计。  
> 相关实现见：
> - `app/backend/config.py`
> - `app/backend/main.py`
> - `app/frontend/assets/workbench.js`
> - `src-tauri/src/backend.rs`

**更新时间**: 2026-04-16

---

## 1. 背景

当前 `gogo-app` 已经支持用户在设置面板里配置 Provider profile，并通过：

- `gogo-app` 托管 provider 定义
- 生成 `.gogo/pi-extensions/managed-providers.ts`
- 将 API key 等应用可直接表达的认证信息写入 Pi 的 `auth.json`
- 在桌面版打开 Pi CLI，由用户在终端中执行 `/login`

这条路线的优点是：

- 和 Pi 自己的 provider / model 机制一致
- 运行时仍然由 Pi RPC 驱动，不需要 `gogo-app` 自己实现另一套 LLM 适配层
- 已经和当前代码结构兼容

但实际落地时也暴露出一些复杂度：

- 如果试图把 OAuth 登录桥做得过于自动化，开发态和桌面态容易分叉
- “用户配置 provider”其实混合了两类完全不同的问题：
  - 如何定义 provider / model
  - 如何完成认证与 token 生命周期管理
- 对“高级用户想接自定义模型”与“普通用户只想点一下登录”这两种需求，当前表单承载得有点过重

所以需要把可选方案单独分析清楚。

---

## 2. 设计目标

如果要长期支持“用户配置自己的 model provider”，理想目标应当是：

1. 简单用户能直接用  
   例如 OpenAI Codex、GitHub Copilot、Google 这类常见 Provider，最好只需要选择 + 登录。

2. 高级用户能接自定义模型  
   例如自建 OpenAI-compatible API、公司内网代理、模型网关。

3. 不把认证复杂度全塞进 `gogo-app`  
   尤其 OAuth、refresh token、订阅态校验，这些更适合由 Pi 本身处理。

4. 不让 `gogo-app` 变成另一个模型编排框架  
   当前主链路仍然是 “Pi RPC + 本地知识库壳”，这个边界最好保持。

5. 能同时兼容 Web 版和桌面版  
   即便两端能力不同，也要让用户能理解差异，不至于配置完却无法使用。

---

## 3. 评估维度

评估每种方案时，我建议主要看这 6 个维度：

- `易用性`：普通用户是否容易理解和完成配置
- `表达能力`：能否覆盖内置 Provider、自定义 API、复杂 OAuth
- `实现复杂度`：对当前 `gogo-app` 代码改动是否可控
- `安全边界`：凭证由谁保管，谁负责刷新
- `与 Pi 一致性`：是否顺着 Pi 原生能力走，而不是逆着做
- `长期可维护性`：后续新增 Provider 或模型能力时是否容易演进

---

## 4. 可选方案

### 方案 A：继续沿用当前“托管 profile + 生成 extension + Pi 管认证”

这是当前仓库已经在做的路线。

结构：

- `gogo-app` 保存 provider profile
- `config.py` 生成托管 extension
- Pi 启动时通过 `--extension` 加载
- API key / 自定义 API 相关配置继续由 `gogo-app` 写入 Pi 配置
- OAuth / subscription 类登录由用户进入 Pi CLI 后执行 `/login`

优点：

- 和现有代码最一致
- 不需要 `gogo-app` 自己实现模型调用协议
- API Provider 和 OAuth Provider 的责任边界更清楚
- 桌面版可以直接复用 Pi 自己的登录与 token 刷新逻辑
- 避免为每个 OAuth Provider 维护额外的桌面桥参数与兼容分支

缺点：

- UI 容易变成“半配置中心、半认证中心”
- 仍然需要把“API key 配置”和“去 Pi 里登录”在 UI 上讲清楚
- 对“复杂自定义 OAuth Provider”支持并不自然
- 对高级用户来说，表单表达能力仍然有限

适用场景：

- 内置 OAuth Provider
- 常见 OpenAI-compatible / Anthropic-compatible API Provider
- 想让 `gogo-app` 保持低侵入、继续依赖 Pi 的主链路

结论：

- 这是当前最现实、最应该继续收敛的主路线
- 但不应该把它当成“唯一入口”

---

### 方案 B：直接让用户编辑 Pi 的原生配置文件

做法：

- `gogo-app` 不维护 provider profile
- 直接暴露：
  - `~/.pi/agent/auth.json`
  - `~/.pi/agent/models.json`
  - 甚至 `~/.pi/agent/extensions/*.ts`
- 用户自己编辑或粘贴 JSON / TS

优点：

- 表达能力最强
- 完全不需要 `gogo-app` 设计额外 schema
- 对熟悉 Pi 的高级用户最透明

缺点：

- 易用性很差
- 很容易配坏
- 跟 `gogo-app` 的产品形态不匹配
- 校验、错误提示、迁移成本都高

适用场景：

- 高级 / 专家模式
- 调试与内部开发

结论：

- 不适合做默认主路径
- 但可以考虑作为“专家模式 / 打开原始配置文件”的兜底能力

---

### 方案 C：只支持“导入 / 启用 Provider 扩展”，不在 `gogo-app` 里设计 Provider 表单

做法：

- 用户通过 npm / git / 本地文件导入 Pi extension
- `gogo-app` 只负责：
  - 展示当前可用 provider
  - 展示认证状态
  - 提供登录按钮
- 自定义 provider 的定义完全交给 extension 作者

优点：

- 架构很干净
- `gogo-app` 不用承载复杂 provider schema
- 最适合复杂 OAuth / 企业 SSO / 非标准 API

缺点：

- 对普通用户门槛高
- “我只是想接一个自定义 OpenAI-compatible API”会显得过重
- 用户需要理解 extension 生态

适用场景：

- 企业内部 Provider
- 非标准 OAuth 流程
- 团队内维护自定义 provider package

结论：

- 非常适合作为“高级扩展路径”
- 不适合替代当前表单式入口

---

### 方案 D：`gogo-app` 自己实现完整 Provider Registry 与认证系统

做法：

- `gogo-app` 自己维护 provider 定义、认证、token 刷新、模型列表发现
- Pi 只作为一个下游执行器，甚至不再承担 provider 管理职责

优点：

- 产品体验最统一
- Web / Desktop 可以完全同构
- UI 可控性最高

缺点：

- 实现成本非常高
- 会和 Pi 原生 provider 机制重复造轮子
- 需要自己处理 OAuth、token refresh、权限和安全边界
- 长期维护成本最大

适用场景：

- 只有在未来明确决定“gogo-app 要逐步摆脱 Pi 的 provider/runtime 管理能力”时才成立

结论：

- 当前阶段不建议走这条路
- 这会让 `gogo-app` 从“应用壳”变成“模型平台”

---

### 方案 E：引入“托管表单模式 + 原始配置模式 + 扩展导入模式”的分层混合方案

做法：

把 Provider 能力分成三层：

1. `基础模式`
   - 面向普通用户
   - 内置预设 Provider
   - 支持一键登录 / 保存 API key

2. `自定义 API 模式`
   - 面向中高级用户
   - 继续使用当前表单 schema
   - 支持 `base_url + api_type + models + auth_header`

3. `专家模式`
   - 打开 Pi 原始配置文件
   - 或导入 / 启用 extension
   - 适配复杂 OAuth 与非标准 provider

优点：

- 能同时覆盖简单和复杂场景
- 不会强迫所有用户都理解 extension
- 也不会逼 `gogo-app` 把所有极端情况都塞进表单

缺点：

- 需要明确模式边界
- UI 要避免让用户迷失在太多入口里

结论：

- 这是我最推荐的长期方案

---

## 5. OpenClaw 参考：Provider 层 vs Harness 层

在分析用户自定义 Provider 这件事时，`OpenClaw` 是一个很有参考价值的案例，因为它底层仍然可以使用 Pi agent / Pi harness，但它并没有把“模型适配能力”完全交给 Pi。

它的关键做法是把系统拆成两层：

1. `Provider / Model 控制层`
   - 负责 provider catalog、认证、配置归一化、模型选择、状态探测、fallback 规则
2. `Harness / Runtime 执行层`
   - 负责具体 agent session 的运行、工具调用、消息流与低层执行

换句话说，Pi 在 OpenClaw 体系里更像是一个默认可用的执行 harness，而不是唯一的 provider 适配中心。

### 5.1 OpenClaw 为什么能“基于 Pi 但不受限于 Pi 的 provider 能力”

OpenClaw 并不是简单地把 Provider 配好后原样交给 Pi，然后完全由 Pi 接管。它自己在 Pi 之上又叠了一层 provider/plugin 控制面，主要体现在：

- provider 插件可以注入 model catalog
- provider 插件可以拥有自己的登录 / onboarding 流程
- provider 插件可以做配置归一化与 transport 归一化
- provider 插件可以解析 API key、生成 synthetic auth
- provider 插件可以接管 OAuth refresh、usage snapshot、missing auth 提示
- OpenClaw 自己决定模型选择、fallback、provider 内部认证 failover

这意味着：

- “有哪些 provider / model 可用”不是只由 Pi 决定
- “如何登录某个 provider”也不是只靠一个统一表单解决
- “运行时到底走哪个 harness”则是后续另一层决策

这种分层让它既能复用 Pi 的执行能力，又能在 Provider 适配上保持高度扩展性。

### 5.2 这和 `gogo-app` 当前方案的关系

`gogo-app` 现在的主链路是：

- 前端设置页收集 profile
- 后端生成 `managed-providers.ts`
- Pi 继续负责 provider/runtime 集成
- 桌面态通过 Pi CLI `/login` 完成 OAuth

这条路线本质上仍然是“把 Provider 定义尽量贴近 Pi 原生能力”，所以它和 OpenClaw 的方向并不冲突，但层次还没有 OpenClaw 分得那么开。

更准确地说：

- `gogo-app` 当前更像是在 Pi 之上做“配置体验层”
- OpenClaw 则是在 Pi 之上做了更完整的“Provider 控制层 + Harness 路由层”

因此，OpenClaw 给我们的启发不是“立刻把所有东西重写成插件系统”，而是：

- 不要把所有 Provider 问题都理解成“再加几个表单字段”
- 要明确区分“Provider 定义 / 认证 / 模型选择”和“Agent 运行时执行”是两层问题
- 如果未来要支持更多复杂 Provider，更可能需要一个比当前表单更高一层的 Provider 控制面

### 5.3 对 `gogo-app` 的实际启发

这件事落到当前仓库里，最值得吸收的不是 OpenClaw 的全部复杂度，而是它的边界感：

1. `Pi` 可以继续是默认 runtime / harness  
   不需要急着替换掉 Pi RPC 主链路。

2. `gogo-app` 不应该试图只靠一个统一设置表单覆盖所有 Provider  
   否则 UI 和认证逻辑会越来越臃肿。

3. 如果以后要支持更多复杂 Provider，应该优先补“Provider 控制层”的能力，而不是直接重做底层运行时  
   例如：
   - 内置 Provider 预设
   - 自定义 API Provider
   - extension / 原始配置入口
   - 登录状态 / probe / 诊断页

4. `gogo-app` 当前更适合走“轻量版 OpenClaw 思路”  
   也就是：
   - 保留 Pi 作为运行时执行层
   - 在上层逐步引入更清晰的 Provider 分层与入口分流
   - 复杂 Provider 交给扩展或专家模式，而不是主表单硬扛

一句话概括：

> OpenClaw 能在 Pi 之上提供丰富的模型适配能力，不是因为 Pi 自动支持了一切，而是因为它自己实现了一层高于 Pi harness 的 Provider / Plugin 控制面。对 `gogo-app` 来说，真正值得借鉴的是这种“Provider 层与 Harness 层解耦”的设计，而不是简单复制它的全部实现。

---

## 6. 当前推荐决策：API key 由 gogo-app 配，OAuth 由 Pi `/login` 负责

结合当前仓库实现状态、桌面态桥接复杂度，以及 Pi 本身已经提供的登录能力，我建议把默认路线进一步收敛成“双轨策略”：

### 6.1 API key / 自定义 API Provider

由 `gogo-app` 负责配置体验和托管配置产物：

- 在设置面板中收集 `base_url`、`api_key`、`models`、`auth_header`
- 生成 `managed-providers.ts`
- 写入 Pi 可直接消费的认证与模型配置
- 在 UI 中展示当前可用模型与默认模型

这部分之所以适合由 `gogo-app` 管，是因为：

- 表单表达能力足够
- 当前实现已经基本跑通
- 用户期望的是“在应用里填好即可”，不需要再进入 CLI

### 6.2 OAuth / subscription Provider

由 `Pi` 负责真实登录，`gogo-app` 只负责把用户送到正确的入口：

- 桌面版打开系统终端并启动 `pi`
- 用户在终端里执行 `/login`
- 登录完成后，`gogo-app` 重新读取 Pi 的认证状态和模型列表

这里刻意不要求 `gogo-app` 在登录时替用户指定模型，也不要求为每个 Provider 维护一套专门的自动登录桥。

原因是：

- `/login` 本来就是 Pi 的原生交互路径
- OAuth / subscription 的细节更适合由 Pi 自己处理
- 这样可以显著降低桌面桥复杂度和 provider-specific 兼容成本

### 6.3 这个决策意味着什么

这条路线本质上是：

- `gogo-app` 管“配置体验层”
- `Pi` 管“运行时认证与 provider 接入内核”

对用户心智来说也更清楚：

- 想接 API key 模型：在 `gogo-app` 里配置
- 想做 OAuth 登录：去 `pi` 里 `/login`

这是一个比“所有事情都尝试在设置面板里自动完成”更稳、更容易维护的边界。

---

## 7. 对比结论

### 如果目标是“尽快稳定可用”

优先顺序建议：

1. 方案 A
2. 方案 E（逐步演进）
3. 方案 C

原因：

- 方案 A 已经有现成代码基础
- 当前问题主要是桥接与边界收敛，而不是方向错了

### 如果目标是“最大表达能力”

优先顺序建议：

1. 方案 E
2. 方案 C
3. 方案 B

### 明确不建议作为当前主路线的

- 方案 D

原因：

- 它会让 `gogo-app` 和 Pi 的职责重叠过深

---

## 8. 推荐路线

我建议把后续路线明确成这句：

> `gogo-app` 默认负责“API key / 自定义 API 的配置体验”，Pi 继续负责“OAuth 登录、运行时认证与模型接入”；复杂 Provider 则通过 extension / 原始配置入口扩展，而不是强塞进设置面板表单。

拆成具体策略就是：

### 8.1 默认主路径

继续使用当前方案，但进一步收敛：

- 内置 OAuth Provider：预设 + 打开终端进入 Pi CLI `/login`
- 自定义 API Provider：表单配置 + `managed-providers.ts`
- API key / 模型配置：继续由 `gogo-app` 写入 Pi 可消费的配置

### 8.2 专家路径

新增两个“高级入口”即可，不需要重写整套架构：

- `打开 Pi Provider 配置目录`
- `打开终端并运行 pi`
- `导入 / 启用自定义 provider extension`

这样能把复杂场景从主表单里剥离出去。

### 8.3 明确边界

设置面板表单应该明确提示：

- 哪些 provider 属于“内置预设”
- 哪些属于“自定义 API”
- 哪些需要进入 Pi CLI `/login`
- 哪些超出当前表单表达范围，需要走 extension / 原始配置

---

## 9. 对当前仓库的具体建议

### 短期建议

1. 把 OAuth 登录路径收敛成“打开终端 + 用户执行 `pi` / `/login`”  
   不再继续扩大自动登录桥的职责。

2. 降低表单的野心  
   不要试图让当前表单覆盖“任意 OAuth Provider 的任意登录流”。

3. 在 UI 上明确分层  
   可以改成：
   - `内置 Provider`
   - `自定义 API Provider`
   - `高级扩展`

### 中期建议

增加一个新的能力组，而不是继续加更多表单字段：

- `打开 Pi 配置目录`
- `打开 auth.json`
- `打开 managed-providers.ts`
- `打开终端并运行 pi`
- `导入扩展说明`

### 长期建议

如果未来团队真的要支持大量企业内部 Provider，再评估是否往方案 C/E 方向发展：

- 让复杂 Provider 以扩展包交付
- `gogo-app` 只做展示、登录入口和诊断

---

## 10. 最终建议

一句话总结：

`gogo-app` 不应该试图单靠一个设置表单解决所有 Provider 问题。更合理的方式是：API key / 自定义 API 由 gogo-app 负责配置，OAuth 登录交给 Pi CLI `/login`，同时补一个清晰的高级扩展入口，把复杂 Provider 留给 extension / 原始配置。`

如果只能选一个最现实的方向，我建议：

- **短期主路线**：继续收敛当前方案 A
- **中长期演进**：逐步走向方案 E

这样既不推翻现有实现，也能给“用户配置自己的 model provider”留下真正可扩展的空间。
