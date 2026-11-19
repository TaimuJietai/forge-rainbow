# Agent 规范

本文件为本仓库对 AI / Agent 的约定；各模型应优先遵循此处，勿另起重复的规范文档。

## 文档命名

`docs/` 及子目录内的文档文件名**一律使用中文**（扩展名如 `.md` 除外）。

- 新建、重命名示例：`彩虹SDK开发计划.md`
- 专有名词可嵌在中文名中（如 `彩虹SDK`、`WebView`），不可整名仅为英文 slug
- 禁止新增纯英文文件名文档（如 `sdk-rainbow.md`）

## 开发计划文档

1. **位置**：所有开发计划一律放在 `docs/plan/` 下，不要写到仓库其他目录。
2. **文件名**：遵循上文「文档命名」，使用中文（如 `彩虹SDK开发计划.md`）。
3. **文首元信息**（创建与重大修订时必须保留 / 更新），建议用引用块写在标题正下方，至少包含：

   | 字段 | 说明 |
   |------|------|
   | 状态 | 如：规划中 / 进行中 / 已落地 / 已废弃 |
   | 创建日期 | `YYYY-MM-DD` |
   | 更新日期 | `YYYY-MM-DD`（有实质修改时刷新） |
   | 摘要 | 一两句说明计划目标（可选但推荐） |

   可按主题追加字段（目标目录、全局对象、配置路径等），但**日期与状态不可省略**。

4. **文末**：可用一行简短版本说明呼应日期与变更要点（可选）。

## Git 只读

本仓库对 AI / Agent 的 git 使用为**只读**。不得执行任何会修改仓库状态、远程或配置的 git 命令。

### 允许（只读）

- `git status`
- `git log` / `git show` / `git diff`
- `git branch`（仅查看，不加 `-d`/`-D`/`-m` 等修改参数）
- `git rev-parse` / `git rev-list`
- `git ls-files` / `git ls-remote`（仅查询）
- `git remote -v`（仅查看）
- `git stash list` / `git stash show`（仅查看）
- `git blame` / `git describe` / `git tag`（仅列出，不创建/删除）
- `git fetch --dry-run` 等纯探测类选项（若需网络查询，优先用只读查询）

### 禁止（写入 / 副作用）

- `git add` / `git rm` / `git mv` / `git restore --staged`
- `git commit` / `git commit --amend`
- `git push` / `git push --force` 及一切推送
- `git pull` / `git fetch`（会更新本地引用；需要远程信息时用只读查询或请用户执行）
- `git merge` / `git rebase` / `git cherry-pick` / `git revert`
- `git checkout` / `git switch` / `git reset` / `git clean`
- `git stash`（push/pop/apply/drop）
- `git branch -d/-D/-m` / `git tag -d` / 创建 tag
- `git remote add/remove/set-url`
- `git config`（含 `--local` / `--global`）
- 任何带 `--no-verify`、改写历史、或修改工作区/索引/引用的操作

### 行为要求

1. 用户明确要求 commit / push / 切分支等写入操作时：**拒绝执行**，说明本仓库为 git 只读规范，请用户在本地自行执行。
2. 需要了解变更时：只用 `git status`、`git diff`、`git log` 等只读命令。
3. 不要用「帮用户执行写入再汇报」等方式绕过本规范。
