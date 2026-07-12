# agent_cluster — Agent 集群路由 + 编排插件

让云端主 agent（Hermes）接到任务后，在一个 **576 个专家 sub-agent 的集群**内检索、
编排、委派执行，并把每次执行沉淀为可复用的知识资产（自成长）。

四个来源仓库的 agent 定义统一进一份 roster（懒加载，不膨胀初始 prompt）：

| 来源 | 数量 | 内容 |
|---|---|---|
| [agency-agents](https://github.com/jbqvibecoding/agency-agents) | 235 | 17 个 division 的专业 agent（工程/营销/设计/游戏/GIS…） |
| [ruflo (claude-flow)](https://github.com/jbqvibecoding/ruflo) | 108 | 编码/测试/安全/共识/SPARC 等技术 agent |
| [AgentHub](https://github.com/jbqvibecoding/AgentHub) | 47 | 带组织层级的公司角色（L1/L2、manages/reports_to） |
| [OpenOPC](https://github.com/jbqvibecoding/openopc) | 186 | 人才库 persona（学术/空间/策略等长尾角色） |

复用机制一览：

- **执行底座** — Hermes 自带 `delegate_task`（隔离上下文、受限工具集、并行 batch、
  leaf/orchestrator 深度控制），本插件不新建执行器。
- **编排** — crew44 的两个模式用 Python 重写：顺序接力 pipeline（阶段 N 结果作为
  阶段 N+1 的 handover note）+ 独立 goal verifier（无历史上下文、criteria 锁定）。
- **质量门禁** — AgentHub 的 G0–G6 checklist（`assets/gates.json`）供 verifier 引用；
  危险命令拦截（kill-port / `--no-verify` / force-push main）移植为 `pre_tool_call`
  钩子，进程内对主 agent 与所有子代理生效，决策审计写 `guard-log.jsonl`。
- **自成长** — OpenOPC `EmployeeEvolutionManager` 精简移植：每次委派记录为该角色的
  reflection（`evolution/executions.jsonl` + `evolution/agents.json`）；同角色同领域
  经验达到阈值（默认 2 次）自动升格为 playbook `SKILL.md`，下次加载该角色时自动注入。
  另附 AgentHub 的 25 个标准工作流模板（`assets/workflows/`），与 playbook 同库检索。

## 工具面（toolset `agent_cluster`）

| 工具 | 用途 |
|---|---|
| `cluster_search` | 按自然语言（中英）检索 roster，支持 source/division 过滤 |
| `cluster_inspect` | 查看单个专家的元数据 / 完整指令 |
| `cluster_load` | 组装专家提示块（人设 + playbook + 历史战绩 + 安全规则），本回合内采用 |
| `cluster_delegate` | 委派单个专家，或 `assignments[]` 并行 fan-out 多个专家 |
| `cluster_pipeline` | 顺序接力流水线（架构 → 编码 → 测试…），可选终局 verifier |
| `cluster_verify` | 独立核验子代理：锁定 criteria + 可选 G0–G6 门禁，输出 PASS/FAIL 报告 |
| `cluster_knowledge` | 检索沉淀的 reflection、playbook 与标准工作流 |
| `cluster_plan` † | 在 ClawTeam 任务板上按依赖建任务 DAG（owner = roster slug） |
| `cluster_swarm` † | DAG 调度循环：就绪任务并行委派 → 完成自动解锁下游 → 收敛；可选 worktree 隔离与终局 verifier |
| `cluster_board` † | 任务板快照（各状态列 + 统计） |
| `cluster_template` † | 列出/展开 TOML 团队模板（software-dev、code-review、hedge-fund…），映射 roster 选角，可 run=true 直接执行 |

† 需要 ClawTeam MCP 桥接（见下节）；未配置时返回带安装指引的错误，其余工具不受影响。

## 安装 / 启用

捆绑插件，随 hermes-agent 仓库分发。在 Hermes `config.yaml` 启用：

```yaml
plugins:
  enabled:
    - agent_cluster
  entries:
    agent_cluster:          # 全部可选，默认值如下
      data_dir: ""          # 默认 <HERMES_HOME>/agent-cluster
      promotion_threshold: 2
      reflection_context_limit: 3
      guard_enabled: true
      handover_note_limit: 4000
```

### 给主 agent 的推荐指令

```text
处理多角色任务时使用 agent_cluster 工具集：先 cluster_search 找到合适的专家，
简单任务用 cluster_delegate 委派（多个独立子任务用 assignments 并行），
有先后依赖的开发流程用 cluster_pipeline（并带 verify_goal + gate 做终局核验），
宣布完成前用 cluster_verify 跑 G2/G3 门禁。保持懒加载：不要预载全量 roster。
```

## ClawTeam 桥接（DAG swarm / worktree / 模板 / 持久团队）

[ClawTeam](https://github.com/jbqvibecoding/ClawTeam) 作为**外部进程**提供任务 DAG
存储（依赖链、环检测、完成自动解锁下游）、git worktree 隔离与团队模板。本插件不
`import clawteam`——通过 Hermes 自带 MCP client 桥接，复用其经过验证的任务底座。

### 安装与接线

```bash
pip install clawteam
```

Hermes `config.yaml`：

```yaml
mcp_servers:
  clawteam:
    command: clawteam-mcp
```

重启 Hermes 后，ClawTeam 的 26 个工具以 `mcp__clawteam__*` 注册进工具表，
`cluster_plan / cluster_swarm / cluster_board / cluster_template` 即可用。
（server 名不叫 `clawteam` 时，在 `plugins.entries.agent_cluster.clawteam_server` 指定。）

### 两种用法

1. **DAG swarm（推荐云端默认）** —— 状态在 ClawTeam 任务板，执行在 Hermes
   `delegate_task`，知识沉淀在 evolution：

   ```
   cluster_plan(team="feature-x", tasks=[
     {subject: "设计 schema",  agent: "system-architect"},
     {subject: "实现 API",     agent: "backend-architect", blocked_by: [0]},
     {subject: "实现前端",     agent: "frontend-developer", blocked_by: [0]},
     {subject: "集成测试",     agent: "tester", blocked_by: [1, 2]},
   ])
   cluster_swarm(team="feature-x", verify_goal="feature X 可用", gate="G3")
   ```

   就绪任务（0）先跑；完成后 1、2 自动解锁并**并行**委派；全完后 4 跑；
   最后独立 verifier 按 G3 门禁核验。失败自动重试一次，超限标记 failed 并停止
   下游。`workspace_repo=/path/to/repo` 时每个 agent 在独立 worktree 分支工作，
   成功后受控合并（冲突即中止并报告；需要宿主装有 `clawteam` CLI 与 git）。

2. **持久 tmux 团队（长任务/真实 CLI 进程）** —— 主 agent 直接使用
   `mcp__clawteam__*` 工具（team/task/mailbox/board/workspace 分析），配合宿主上
   `clawteam spawn/launch` 起真实的 Claude Code/Codex worker 进程；适合跨天任务
   与需要人监控 tmux 的场景。

### 双向互通

- **出**：把 roster 专家或已升格的 playbook 导出为 ClawTeam 可注入的 skill：

  ```bash
  python3 -m plugins.agent_cluster.scripts.export_skill --agent backend-architect
  python3 -m plugins.agent_cluster.scripts.export_skill --playbook coder-backend-playbook
  # 之后： clawteam spawn <team> --skill backend-architect ...
  ```

- **入**：ClawTeam 格式的 SKILL.md 目录放进 `<data_dir>/skills/` 即被
  `cluster_knowledge` 检索、被同名角色的提示注入复用（格式天然兼容）。

## Roster 重建

roster 是生成物（`assets/roster.json`，已提交，运行时不依赖源仓库在场）。
源仓库更新后重建：

```bash
python3 scripts/build_roster.py \
  --agency   /path/to/agency-agents \
  --ruflo    /path/to/ruflo \
  --agenthub /path/to/AgentHub \
  --openopc  /path/to/OpenOPC
```

去重规则：slug 冲突时按 `agenthub > agency > ruflo > openopc` 保留裸 slug
（组织字段最全者优先），其余重命名为 `<source>--<slug>`，全部可检索。

## 测试

```bash
python3 -m pytest plugins/agent_cluster/tests/ -q   # 36 个离线单测
python3 -m plugins.agent_cluster.tests.smoke        # FakeCtx 冒烟（7 工具 + 钩子）
```

## 数据目录布局（运行时生成）

```
<data_dir>/
├── evolution/
│   ├── agents.json        # 按 slug 的结构化战绩（成败计数、领域、pattern 计数）
│   └── executions.jsonl   # 每次执行的追加审计日志（知识资产原始层）
├── skills/<name>/SKILL.md # 自动升格的 playbook
└── guard-log.jsonl        # 危险命令拦截审计
```
