# 课题组公共知识库 - 服务器端架构设计

## 概览

这个文档描述联邦架构中**服务器端**的功能和设计。

服务器在联邦架构中的角色极其轻量：**只作为 Git 仓库存储公共池，不承担推理任务**。唯一的计算任务是每周执行一次的自动聚合脚本。

```
┌─────────────────────────────────────┐
│  服务器                              │
│  ┌─────────────────────────────┐    │
│  │  pending-pool/              │    │
│  │    incoming/     (临时接收) │    │
│  └─────────────────────────────┘    │
│           ↓ git push                │
│  ┌─────────────────────────────┐    │
│  │  public-pool/               │    │
│  │    knowledge/    (共识层)   │    │
│  │    insights/     (判断层)   │    │
│  │    tensions/     (冲突页)   │    │
│  │    index.md      (入口)     │    │
│  │    log.md        (日志)     │    │
│  └─────────────────────────────┘    │
│           ↓                         │
│  ┌─────────────────────────────┐    │
│  │  aggregate.sh               │    │
│  │    (每周 cron 执行)           │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

## 核心设计选择

| 维度 | 选择 | 为什么 |
|------|------|--------|
| 推理 | 不执行 | 节省成本，推理是个人消费 |
| 存储 | 纯 Git 仓库 | 最简单，无服务依赖 |
| 聚合 | 每周自动执行 | 低频率，足够及时 |
| Review | 不需要 | 增加摩擦，保守聚合即可 |
| 冲突处理 | 保留多样性 | 冲突即知识张力 |

## 目录结构

```
server-repo/
├── pending-pool/                   # Git 仓库（个人 push 目标）
│   └── incoming/                   # 临时接收区（聚合后清理）
│       ├── user1/
│       ├── user2/
│       └── .../
├── public-pool/                    # Git 仓库（个人 pull 来源）
│   ├── knowledge/                  # 共识层
│   │   ├── topics/
│   │   ├── comparisons/
│   │   └── methods/
│   ├── insights/                   # 判断层
│   │   ├── gaps/
│   │   ├── tradeoffs/
│   │   └── next-steps/
│   ├── tensions/                   # 自动创建的冲突页
│   │   └── *.md
│   ├── index.md                    # 自动生成的入口
│   ├── log.md                      # 贡献日志
│   └── .git/
├── scripts/
│   ├── aggregate.py                # 聚合主脚本
│   ├── tension_detector.py         # 冲突检测
│   ├── index_generator.py          # index.md 生成
│   └── utils.py                    # 工具函数
├── config/
│   └── server.yaml                 # 服务器配置
└── README.md
```

## 服务器职责

### 1. Git 仓库托管

服务器托管两个 Git 仓库：

**pending-pool**（接收区）
- 接收所有客户端的 `git push`
- 每个用户的贡献存放在 `incoming/{user_id}/` 子目录
- 聚合完成后自动清理

**public-pool**（公共池）
- 存储聚合后的共识知识
- 所有客户端的 `git pull` 来源
- 只由 `aggregate.sh` 脚本写入

### 2. 自动聚合（每周执行）

`aggregate.sh` 脚本在每周固定时间（如周日凌晨 2 点）执行：

```bash
#!/bin/bash
# aggregate.sh - 每周自动聚合脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[$(date)] Starting aggregation run..."

# 1. 扫描 incoming/ 新页面
NEW_FILES=$(python scripts/aggregate.py scan --since "last week")

if [ -z "$NEW_FILES" ]; then
    echo "[$(date)] No new contributions found."
    exit 0
fi

echo "[$(date)] Found $(echo "$NEW_FILES" | wc -l) new files."

# 2. 语义聚合
python scripts/aggregate.py process --input pending-pool/incoming --output public-pool

# 3. 检测冲突并创建 tension 页面
python scripts/tension_detector.py run --input public-pool --output public-pool/tensions

# 4. 更新 index.md
python scripts/index_generator.py run --input public-pool --output public-pool/index.md

# 5. 追加贡献日志
python scripts/aggregate.py log --input pending-pool/incoming --output public-pool/log.md

# 6. 提交并推送
cd public-pool
git add -A
git commit -m "Auto-aggregate: $(date +%Y-%m-%d)"
git push origin main

# 7. 清理 incoming/
rm -rf ../pending-pool/incoming/*

echo "[$(date)] Aggregation complete."
```

## 聚合脚本详解

### `aggregate.py` — 聚合主脚本

**职责**：
- 扫描 `incoming/` 中的新页面
- 提取页面主题和元数据
- 将页面移动到 `public-pool/` 的正确位置
- 检测相似主题并添加 cross-link

**核心函数**：

```python
def scan_incoming(incoming_dir: Path, since: str) -> list[Path]:
    """扫描 incoming 目录中指定时间之后的新文件"""

def extract_metadata(page_path: Path) -> dict:
    """提取页面 frontmatter 和正文主题"""
    # 返回：{title, author, date, source, topics, summary}

def find_similar_pages(
    new_page: dict,
    target_dir: Path,
    threshold: float = 0.7
) -> list[Path]:
    """在目标目录中查找相似主题的页面（语义相似度）"""

def add_cross_links(
    page_path: Path,
    related_pages: list[Path],
    link_type: str = "related"
) -> None:
    """在页面中添加相关链接（related_pages 字段）"""

def process_aggregation(incoming_dir: Path, public_pool_dir: Path) -> None:
    """主聚合流程"""
```

**处理逻辑**：

```
for each new_file in incoming/:
    1. 提取 metadata（title, topics, author）
    2. 根据 topics 确定目标目录
    3. 查找相似主题页面
       - 如果找到相似页面：
         - 都保留，互加 related 链接
       - 如果没有相似页面：
         - 直接放入目标目录
    4. 更新 public-pool/log.md
```

### `tension_detector.py` — 冲突检测脚本

**职责**：
- 检测公共池中的冲突判断
- 创建 `tensions/` 页面记录冲突
- 保留双方观点和来源

**冲突类型**：

| 冲突类型 | 检测方式 | 处理方式 |
|---------|---------|---------|
| 相反判断 | 语义相似度高的页面中包含相反倾向的词 | 创建 tension 页 |
| 方法对立 | 两篇页面推荐相反的方法选择 | 创建 tension 页 |
| 结论矛盾 | 对同一问题的结论不一致 | 创建 tension 页 |

**核心函数**：

```python
def extract_judgments(page_path: Path) -> list[dict]:
    """从页面中提取研究判断语句"""
    # 返回：[{statement, confidence, support_evidence}]

def detect_contradiction(judgment_a: dict, judgment_b: dict) -> bool:
    """检测两个判断是否矛盾"""

def create_tension_page(
    page_a: Path,
    page_b: Path,
    tension_type: str,
    output_dir: Path
) -> str:
    """创建 tension 页面"""
```

**Tension 页面模板**：

```markdown
---
title: "边缘卸载延迟敏感性争议"
type: tension
created: 2026-04-13
pages:
  - path: insights/gaps/边缘卸载适合延迟敏感应用.md
    stance: pro
  - path: insights/gaps/边缘卸载不适合延迟敏感应用.md
    stance: con
---

# 边缘卸载延迟敏感性争议

## 争议焦点

边缘卸载是否适合延迟敏感应用？

## 观点 A：适合

> 边缘卸载适合延迟敏感应用

**来源**：[边缘卸载适合延迟敏感应用](../insights/gaps/边缘卸载适合延迟敏感应用.md)

**论据**：
- 边缘节点地理位置接近用户，可以减少网络传输延迟
- ...

## 观点 B：不适合

> 边缘卸载不适合延迟敏感应用

**来源**：[边缘卸载不适合延迟敏感应用](../insights/gaps/边缘卸载不适合延迟敏感应用.md)

**论据**：
- 边缘节点资源有限，可能导致处理排队延迟
- ...

## 可能的解决方向

- 需要更细粒度的延迟分解（网络延迟 vs 计算延迟）
- 可能取决于具体的边缘部署场景
```

### `index_generator.py` — Index 生成脚本

**职责**：
- 扫描 `public-pool/` 所有页面
- 按主题组织页面结构
- 生成 `index.md` 入口页面

**核心函数**：

```python
def scan_all_pages(root_dir: Path) -> list[dict]:
    """扫描所有页面并提取元数据"""

def group_by_topic(pages: list[dict]) -> dict[str, list[dict]]:
    """按主题分组页面"""

def generate_index_md(grouped_pages: dict, output_path: Path) -> None:
    """生成 index.md 文件"""
```

**生成的 index.md 格式**：

```markdown
# 课题组公共知识库

最后更新：2026-04-13

## 知识地图

### 领域主题

- **[边缘计算](knowledge/topics/边缘计算.md)**
  - [边缘卸载 vs 云计算](knowledge/comparisons/边缘卸载 vs 云计算.md)
  - [边缘资源管理方法](knowledge/methods/边缘资源管理.md)

- **[延迟优化](knowledge/topics/延迟优化.md)**
  - ...

### 研究判断

#### 研究空白 (gaps)

- [边缘卸载中的延迟预测空白](insights/gaps/边缘卸载延迟预测空白.md)
- ...

#### 方法权衡 (tradeoffs)

- [集中式 vs 分布式资源调度权衡](insights/tradeoffs/集中式 vs 分布式调度.md)
- ...

#### 下一步建议 (next-steps)

- [验证延迟预测模型的可行性](insights/next-steps/验证延迟预测模型.md)
- ...

### 认知张力 (tensions)

- [边缘卸载延迟敏感性争议](tensions/边缘卸载延迟敏感性争议.md)
- ...

## 贡献日志

详细贡献记录见 [log.md](log.md)
```

## 配置

### `config/server.yaml`

```yaml
# 服务器配置

# 聚合调度
schedule:
  cron: "0 2 * * 0"  # 每周日凌晨 2 点
  timezone: "Asia/Shanghai"

# 聚合策略
aggregation:
  # 相似度阈值（低于此值不创建 cross-link）
  similarity_threshold: 0.6
  
  # 冲突检测阈值
  contradiction_threshold: 0.8
  
  # 是否自动创建 tension 页面
  auto_create_tensions: true
  
  # tension 页面是否需要人工 review（预留）
  tension_review_required: false

# 通知
notifications:
  # 聚合完成后发送通知
  on_complete: false  # 预留
  
  # 通知渠道
  channels: []  # 预留
```

## 数据流

### 客户端 Push 贡献

```
客户端
  ↓ git push
pending-pool/incoming/{user_id}/{page}.md
  ↓ 等待聚合
```

### 聚合执行

```
cron 触发 aggregate.sh
  ↓
1. scan_incoming() → 发现新文件
  ↓
2. for each file:
   - extract_metadata()
   - find_similar_pages()
   - add_cross_links()
   - move to public-pool/
  ↓
3. tension_detector.run()
   - 检测冲突判断
   - 创建 tensions/ 页面
  ↓
4. index_generator.run()
   - 更新 index.md
  ↓
5. 追加 log.md
  ↓
6. git commit & push
  ↓
7. 清理 incoming/
```

### 客户端 Pull 更新

```
客户端
  ↓ git pull
public-pool/ 最新内容
  ↓
本地 public-pool submodule 更新
  ↓
新贡献进入本地检索范围
```

## 语义相似度计算

使用轻量级 embedding 模型计算页面相似度：

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

def compute_similarity(text_a: str, text_b: str) -> float:
    """计算两段文本的语义相似度"""
    emb_a = model.encode(text_a)
    emb_b = model.encode(text_b)
    return cosine_similarity([emb_a], [emb_b])[0][0]
```

**优化策略**：
- 只对 `title` + `summary` + `judgment` 编码，不编码全文
- 使用缓存避免重复计算
- 批量计算时使用矩阵运算

## Token 成本

服务器端唯一消耗 token 的地方是语义聚合脚本中的 embedding 计算，但使用的是本地模型，**不消耗 API token**。

| 项目 | 成本 |
|------|------|
| 推理 | 0（由客户端承担） |
| 存储 | Git 仓库（免费/低成本） |
| 聚合 | 本地 embedding 模型（无 API 成本） |
| 服务器 | 仅需能运行 git 服务和 cron job |

## 扩展性考虑

### 预留功能（当前不实现）

1. **人工 Review 流程**
   - 如果未来需要，可在 `config/server.yaml` 中开启 `tension_review_required`
   - 聚合脚本检测到冲突时暂停，等待人工确认

2. **贡献统计 Dashboard**
   - 统计每个用户的贡献数量
   - 显示热门主题和页面

3. **通知机制**
   - 聚合完成后邮件/Slack 通知
   - 当你的页面被关联时通知

4. **权限控制**
   - 只读用户（只能 pull）
   - 贡献用户（可以 push）
   - 管理员（可以审核）

## 风险与缓解

| 风险 | 描述 | 缓解 |
|------|------|------|
| 聚合错误 | Agent 可能误判相似性或冲突 | 保守策略：不确定就保留两篇 |
| 同步延迟 | 每周执行，新贡献可能一周后才可见 | 建议客户端查询前自动 pull |
| 搭便车 | 只 pull 不 push | 课题组内部规范，非技术约束 |
| 恶意贡献 | 有人故意上传低质或错误内容 | Git 历史可追溯，可回滚 |

## 运行

### 前置要求

- Git 服务器（GitHub/GitLab/自建 Git）
- Python 3.10+
- 能运行 cron job

### 依赖安装

```bash
pip install sentence-transformers scikit-learn pyyaml
```

### 配置 cron

```bash
# 编辑 crontab
crontab -e

# 添加每周执行任务
0 2 * * 0 cd /path/to/server-repo && ./aggregate.sh >> /var/log/aggregate.log 2>&1
```

### 手动测试聚合

```bash
# 手动执行一次聚合
./aggregate.sh --dry-run  # 预览模式，不实际写入
./aggregate.sh --force    # 强制执行
```

## 与客户端的关系

| 功能 | 客户端 | 服务器 |
|------|--------|--------|
| 推理 | ✅ 本地执行 | ❌ |
| 知识存储 | ✅ personal-wiki/ | ✅ public-pool/ |
| 知识写回 | ✅ 本地写回 | ❌ |
| Git push | ✅ 推送到 pending-pool | ✅ 接收 push |
| Git pull | ✅ 从 public-pool 拉取 | ✅ 提供拉取 |
| 语义聚合 | ❌ | ✅ 每周执行 |
| 冲突检测 | ❌ | ✅ 自动创建 tension 页 |
| index 生成 | ✅ 本地副本 | ✅ 生成主版本 |

## 相关文档

- [客户端架构设计](client-architecture.md) — 客户端设计
- [联邦架构总览](课题组公共知识库的联邦架构设计.md) — 整体架构设计
- [产品定义信念](product-definition-belief.md) — 产品目标
