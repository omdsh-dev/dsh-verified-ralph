# dsh-verified-ralph

[English](README.md) | 中文

`dsh-verified-ralph` 是独立的 DeepSeek Harness function plugin，在官方 `ralph` 之外新增 `verified_ralph`。每个 Round 都启动共享工作区上的全新本地 child，将其不可变 DSH session 投影为可观察轨迹，再通过 `ctx.verifier` 独立评分任务完成进展。

插件不修改 DSH core，也不重新定义 verifier API。可复现构建依赖固定到 `dsh-as-a-verifier` merge commit `0d57987a409f15ecb47864cc811e944504d99091`（release `v0.2.3`）；运行时要求 verifier protocol 1 与离线 progress tracking。底层 progress 方法源自 llm-as-a-verifier（<https://github.com/llm-as-a-verifier/llm-as-a-verifier>）的 commit `8db8a114355a9d7fdf9a8d1d5c87f6aeebd18770`。归属见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 安装

一起安装两个 bundle 默认分支的最新版本。两个仓库都保持 `private: true` npm package，通过 Git/profile 安装：

```sh
dsh plugin --profile web add \
  github:omdsh-dev/dsh-as-a-verifier \
  github:omdsh-dev/dsh-verified-ralph
```

Profile lockfile 会固定安装时解析到的 commit，重启不会静默追踪新提交。升级需要显式执行，并在完成后重启 Profile：

```sh
dsh plugin --profile web update dsh-as-a-verifier dsh-verified-ralph
```

需要稳定复现的生产部署应固定不可移动的 release tag：

```sh
dsh plugin --profile web add \
  github:omdsh-dev/dsh-as-a-verifier#v0.2.3 \
  github:omdsh-dev/dsh-verified-ralph#v0.1.2
```

Headless 使用对应 profile。由于本 Git package 有意固定依赖另一个 Git package，pnpm 11 调用方需要显式允许这条已审计的依赖边和两次 prepare 构建：

```yaml
blockExoticSubdeps: false
allowBuilds:
  dsh-verified-ralph@https://codeload.github.com/omdsh-dev/dsh-verified-ralph/tar.gz/<verified-ralph-commit>: true
  dsh-as-a-verifier@https://codeload.github.com/omdsh-dev/dsh-as-a-verifier/tar.gz/0d57987a409f15ecb47864cc811e944504d99091: true
```

将 `<verified-ralph-commit>` 替换为实际安装的 commit；跟随更新后的默认分支时，始终复制 pnpm 当前打印的精确 key。Release tag 只从验证完成的 `main` merge 创建且绝不移动；兼容修复提升 patch，公共编排能力提升 minor，不兼容的 verifier protocol 要求提升 major。bundle 只插入 `dsh-verified-ralph`；verifier row 与凭据由部署单独管理。

## 合同

插件导出 `name`、`inject`、`Config`、`apply`，没有 default export；必需服务为 `tools`、`subagents`、`systemPrompt`、`verifier`。除非 `ctx.verifier.protocolVersion === 1` 且提供 `offlineProgressTracking`，插件会在注册 guidance 和工具前直接拒绝加载。

```ts
await tools.verified_ralph({
  objective: '实现需求并证明相关检查通过。',
  maxRounds: 8,
})
```

每个 child 只接收不可变 objective、Round 信息、共享工作区说明、上一轮有界 report 和可选的固定 verifier 纠偏。provider 必须支持 structured output、不得继承 parent context，并且必须返回 `localAgent`；禁止远程或 report-only 降级。

child 成功结束后，插件按 `step/start`—`step/end` 聚合 assistant message、tool call 和 tool result，再调用 `ctx.verifier.track()` 评分最后一个完成 step。完整任务和投影后的 child 轨迹会发送到配置的 DeepSeek verifier endpoint。child session 保存普通 prompt/轨迹，parent 保存规范化最终工具结果；插件不增加自定义 session event。

成功状态：

- `verified-complete`：worker 报告完成且独立分数达到阈值。
- `blocked`：worker 报告具体 blocker，`verified` 保持 false。
- `stagnated`：完整纠偏宽限期后仍未取得足够进展。
- `budget-limited`：达到部署或调用 Round 上限。

child、session、report、verifier、取消或 provider 失败都会让整个工具失败。低于阈值的完成声明只会触发纠偏，绝不会被接受或静默视为平局。

## 保守策略

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `subagentProvider` | `spawn` | 全新 structured 本地 provider |
| `maxRounds` | `256` | 默认值与部署 ceiling |
| `maxHandoffChars` | `16384` | worker report 序列化上限 |
| `maxResultChars` | `16384` | parent 渲染文本上限，不改变 canonical data |
| `nEvaluations` | `2` | 每 Round verifier repeats |
| `completionThreshold` | `0.85` | 独立完成阈值 |
| `stagnationWindow` | `3` | 停滞检测窗口 |
| `minProgressGain` | `0.05` | 清除停滞/纠偏所需增益 |
| `correctionGraceRounds` | `2` | 纠偏后的完整宽限 Round 数 |

被拒绝的完成声明会立即触发纠偏；否则当完整窗口首尾增益低于 `minProgressGain` 时触发。后续分数达到纠偏前最佳值加 `minProgressGain` 会清除纠偏，否则在宽限 Round 后停止。

canonical result 包含运行状态与计数、最终 report、每个 child id/分数/调用/usage/决策、聚合 usage、阈值、最终分数和 `verified`。

## 开发

```sh
pnpm install
pnpm run verify:self-contained
pnpm run typecheck
pnpm test
pnpm run build
pnpm run prepare
```

所有 PR 与 `main` push 都会运行 Ubuntu/Windows × Node 22/24 完整矩阵和精确 commit Git-install smoke。所有 Action 使用审查过的完整 SHA，并采用 Node 24 action runtime；CI 不读取 DeepSeek key，也不调用真实 API。稳定的 `required` check 是 `main` 门禁。

发布保持人工流程：维护者先对当前 `main` 精确 SHA 与版本手工触发 `release-check`，等待所有 keyless 门禁和 Git 安装通过，再通过 Hangar/devbox-x 创建并推送 annotated tag；tag 会再次触发同一个只读检查。Actions 不创建或移动 tag，也不发布 npm。只有 backend、prompt 或 decoder 行为变化时，才要求在本地执行真实 API E2E。

## 边界

不修改 DSH core，不替换官方 `ralph`，不支持远程 provider 降级、多模态、后台/进程恢复 Ralph、价格/时间预算、UI 或其他 verifier backend。

## 许可

[MIT](LICENSE)。上游声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
