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
