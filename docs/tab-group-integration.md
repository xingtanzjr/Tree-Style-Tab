# Tab Group Integration Design

## Overview

将 Chrome Tab Groups 功能集成到 Tree Style Tab 中，让用户在 tree 结构中直观看到 group 信息，同时保留 tree 的核心价值。

## 核心设计原则

### 1. 一种视图，不做选择

不提供 Tree View / Group View 切换。Group 作为 tree 中的**容器节点**直接嵌入，用户无需做任何选择。

### 2. Tree 是主结构，Group 是容器

- Tree 层级关系（opener parent）在 group 内部**完全保留**
- Group 只负责把属于它的 tab "框起来"，内部结构由 tree 逻辑决定

### 3. Group 优先于跨组 Tree Parent

如果子 tab 和 parent tab 不在同一个 group，则**切断** parent 关系，子 tab 变成它所在 group 内的根节点。

理由：Group 是用户**主动、有意识**的组织行为，应该被尊重。用户把 tab 拖进另一个 group，本身就意味着"不想让它跟原来的 parent 放在一起"。

## Chrome Tab Group 关键约束

- 一个 tab 只能属于一个 group（或不属于任何 group）
- **同一个 group 中的 tab 在 tab bar 中一定是相邻的**，中间不会插入其他 group 的 tab
- Chrome 有 8 种 group 颜色：grey / blue / red / yellow / green / pink / purple / cyan
- 需要 `tabGroups` 权限

## 显示效果

### 示例 1：基本场景

Chrome tab bar 状态：
| 位置 | Tab | Group | Tree Parent |
|------|-----|-------|-------------|
| 1 | 扩展程序 | 无 | 无 |
| 2 | Jira Dashboard | 🟦 Sprint 12 | 无 |
| 3 | Issue #1234 | 🟦 Sprint 12 | Jira Dashboard |
| 4 | Issue #1235 | 🟦 Sprint 12 | Jira Dashboard |
| 5 | Confluence Doc | 🟦 Sprint 12 | Issue #1234 |
| 6 | Sprint Retro | 🟦 Sprint 12 | 无 |
| 7 | Google | 无 | 无 |
| 8 | Wikipedia: React | 🟩 Research | 无 |
| 9 | Blog: React 19 | 🟩 Research | Wikipedia: React |
| 10 | Gmail | 无 | 无 |

Tree Style Tab 中的显示：
```
扩展程序
    chrome://extensions/
🟦 Sprint 12 (5)                        ← group 容器节点
  ├── Jira Dashboard
  │   ├── Issue #1234
  │   │   └── Confluence Doc
  │   └── Issue #1235
  └── Sprint Retro
Google
    https://www.google.com
🟩 Research (2)                          ← group 容器节点
  ├── Wikipedia: React
  │   └── Blog: React 19
Gmail
    https://mail.google.com
```

### 示例 2：跨 Group Parent 关系切断

| Tab | Group | Tree Parent |
|-----|-------|-------------|
| Jira Dashboard (tab1) | 🟦 Sprint 12 | 无 |
| Issue #1234 (tab2) | 🟩 Research | tab1 |

显示效果（tab2 的 parent 关系被切断）：
```
🟦 Sprint 12 (1)
  └── Jira Dashboard
🟩 Research (1)
  └── Issue #1234              ← parent 是 tab1，但跨组，所以变为 group 内根节点
```

### 示例 3：子 tab 在 group 中但 parent 不在

| Tab | Group | Tree Parent |
|-----|-------|-------------|
| Google | 无 | 无 |
| React Docs | 🟦 Dev | Google（从 Google 搜索打开） |
| Hooks Guide | 🟦 Dev | React Docs |

显示效果：
```
Google
    https://www.google.com
🟦 Dev (2)
  ├── React Docs               ← parent 是 Google，但 Google 不在组内，切断
  │   └── Hooks Guide
```

## Group 容器节点视觉设计

- **左侧彩色竖条**：3px，颜色对应 group 颜色
- **组名标签**：显示 group 名称 + tab 数量，如 `Sprint 12 (5)`
- **可折叠**：点击 group 头可折叠/展开组内所有 tab
- **不属于任何 group 的 tab**：无额外标记，保持现有样式

## Tree 构建逻辑变更

### 当前逻辑（无 group）

```
输入：tabs[] + tabParentMap
输出：tree（根节点 → 各 tab 基于 parent 关系嵌套）
```

### 新逻辑（有 group）

```
输入：tabs[] + tabParentMap + tabGroups[]

步骤：
1. 获取所有 tab 及其 groupId
2. 获取所有 group 信息（id, title, color, collapsed）
3. 构建 tab → groupId 映射
4. 按 group 分组，每组内部基于 tabParentMap 构建 tree
   - 如果 tab 的 parent 不在同一个 group → 切断 parent 关系
5. 无 group 的 tab 按原逻辑构建 tree
6. 最终 tree 的根级 children 按 tab 原始顺序排列：
   - 无 group 的 tab 节点
   - group 容器节点（内含该 group 的 sub-tree）
```

## 需要的 Chrome API

| API | 用途 |
|-----|------|
| `chrome.tabGroups.query({windowId})` | 获取当前窗口所有 group 信息 |
| `tab.groupId` | 每个 tab 对象上已有的字段，-1 表示无 group |
| `chrome.tabGroups.onCreated` | 监听 group 创建 |
| `chrome.tabGroups.onUpdated` | 监听 group 更新（改名、改色、折叠） |
| `chrome.tabGroups.onRemoved` | 监听 group 删除 |

Manifest 权限：
```json
"permissions": ["tabGroups"]
```

## 实施计划

### Phase 1：只读展示（本次）

- [ ] manifest.json 添加 `tabGroups` 权限
- [ ] Initializer 中新增 `getTabGroups()` 方法
- [ ] TabTreeGenerator 改造：支持 group 容器节点 + 跨组 parent 切断
- [ ] TabTreeNode 扩展：支持 `isGroup` 标记和 group 元数据（color, title）
- [ ] DraggableTabItem 渲染 group 容器节点样式（颜色条 + 组名）
- [ ] Group 容器节点可折叠
- [ ] MockChrome 添加 tabGroups mock
- [ ] Tab group 变更事件监听（onCreated/onUpdated/onRemoved → 触发 refresh）

### Phase 2：交互操作（未来）

- [ ] 拖拽 tab 进入/移出 group
- [ ] 右键菜单：加入组 / 移出组
- [ ] 折叠 group 同步到 Chrome tab bar

### Phase 3：Group 管理（未来）

- [ ] 创建新 group（选中多个 tab → 建组）
- [ ] Group 重命名 / 改色
- [ ] 关闭整个 group
- [ ] 搜索框支持 `group:xxx` 语法过滤

## Group 颜色映射

```javascript
const GROUP_COLORS = {
    grey:   '#5f6368',
    blue:   '#1a73e8',
    red:    '#d93025',
    yellow: '#f9ab00',
    green:  '#188038',
    pink:   '#d01884',
    purple: '#a142f4',
    cyan:   '#007b83',
};
```

## 搜索行为

当用户在搜索框输入关键词时：
- Group 名称参与匹配：如果关键词匹配 group 名称，显示整个 group
- Group 内的 tab 被过滤后，如果 group 内没有匹配的 tab，隐藏该 group 容器
- 如果 group 内只有部分 tab 匹配，只显示匹配的 tab（group 容器保留）
