---
name: project-kickoff
description: Initialize new project with CLAUDE.md, .knowledge/ structure, company rules, and git
allowed-tools: Read, Write, Glob, Bash
---

# 專案初始化

PM 啟動新專案時使用，確保所有基礎結構就位。

## 使用方式
```
/project-kickoff <project-type> <project-name>
```

## 參數
- `$0`: 專案類型（web-app / api-service / mobile-app / library）
- `$ARGUMENTS`: 完整參數

## 執行步驟

1. **檢查現有結構**
   - 檢查 CLAUDE.md 是否已存在
   - 檢查 .knowledge/ 目錄是否已存在
   - 如已存在，提示確認是否覆蓋

2. **部署 CLAUDE.md**
   - 從對應模板生成（替換 `{專案名稱}` 佔位符）
   - 模板位置：AgentHub `.knowledge/company/project-templates/{type}/CLAUDE.md.template`

3. **建立 .knowledge/ 結構**
   - 建立 `.knowledge/` 目錄
   - 複製 `architecture.md`（從模板目錄）
   - 建立空的 `project-overview.md`（標題 + 佔位符）
   - 建立空的 `postmortem-log.md`（標題 + 空表格）
   - 從模板部署 `file-index.md`（替換 `{專案名稱}`、填入今日日期）
     - 模板位置：AgentHub `.knowledge/company/project-templates/{type}/file-index.md.template`

4. **部署共用規則**
   - 複製 `company-rules.md` → `.knowledge/company-rules.md`
   - 複製 `team-workflow.md` → `.knowledge/team-workflow.md`

5. **建立 Roadmap**

   5a. 建立 `proposal/` 目錄（若已存在則跳過）

   5b. 建立 `proposal/roadmap.md`（若已存在則跳過）：
   ```markdown
   # {專案名稱} — 產品路線圖

   ## 產品定位
   > {一句話描述產品}

   ## 目標用戶
   > {描述}

   ## 核心價值
   > {描述}

   ## 版本規劃

   | Sprint | 主題 | 目標 | 狀態 |
   |--------|------|------|------|
   | Sprint 1 | {待定} | {待定} | 🔲 規劃中 |

   ## 長期願景
   > {描述}
   ```

6. **Git 初始化**

   6a. 檢查是否已有 git repo（`.git/` 目錄存在）：
   - 已存在 → 跳過 `git init`
   - 不存在 → 執行 `git init`

   6b. 建立 `.gitignore`（若已存在則跳過）：
   ```
   node_modules/
   dist/
   .env
   .env.*
   .claude/
   coverage/
   *.log
   .DS_Store
   ```

   6c. 執行初始 commit（若 working tree 有變更）：
   ```bash
   git add -A
   git commit -m "chore: project kickoff — {project-name}"
   ```

7. **輸出下一步 Checklist**
   ```
   ✅ 專案初始化完成

   Git：已初始化 ✅
   初始 commit：chore: project kickoff — {project-name} ✅
   Roadmap：proposal/roadmap.md ✅

   下一步：
   - [ ] 填寫 CLAUDE.md 專案簡介佔位符
   - [ ] 填寫技術棧表格
   - [ ] 填寫 proposal/roadmap.md 產品定位
   - [ ] 執行 /product-diagnosis 做 G0 前置診斷
   - [ ] 撰寫 Sprint 提案書（/sprint-proposal）
   - [ ] 執行 /dev-plan 建立 sprint branch
   ```
