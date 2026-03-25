## Tree Style Tab

<p align="center">
  <img src="public/images/icon-128.png" alt="Tree Style Tab" width="80" />
</p>

<p align="center">
  <strong>A tree-style tab manager for Chrome & Edge</strong><br/>
  Organize, search, and navigate your tabs visually.
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/tree-style-tab/hbohdjmnjcbngeflcopjdnmpoiolkfoc">
    <img src="https://img.shields.io/chrome-web-store/v/hbohdjmnjcbngeflcopjdnmpoiolkfoc?label=Chrome%20Web%20Store&color=4285f4&logo=googlechrome&logoColor=white" alt="Chrome Web Store" />
  </a>
  <a href="https://microsoftedge.microsoft.com/addons/detail/tree-style-tab/jemgfkmpnlaeopgihkaoncnobfnjkjgn">
    <img src="https://img.shields.io/badge/Edge%20Add--ons-v2.0.0-0078d4?logo=microsoftedge&logoColor=white" alt="Edge Add-ons" />
  </a>
  <a href="https://chromewebstore.google.com/detail/tree-style-tab/hbohdjmnjcbngeflcopjdnmpoiolkfoc">
    <img src="https://img.shields.io/chrome-web-store/users/hbohdjmnjcbngeflcopjdnmpoiolkfoc?color=34a853&label=users" alt="Users" />
  </a>
</p>

---

### Why Tree Style Tab?

When you have dozens of tabs open, finding the right one is painful. Tree Style Tab solves this by displaying your tabs as a **tree** — tabs opened from the same page are grouped as children, giving you instant context about how your tabs relate to each other.

<!-- 📸 截图放到 docs/ 目录，取消下面的注释即可显示 -->
<!-- <p align="center">
  <img src="docs/screenshot-sidepanel.png" alt="Side Panel" width="700" />
</p> -->

---

### Features

#### 🌳 Tree View
- Tabs organized into a parent-child tree based on how they were opened
- Collapse/expand any parent tab to hide its children
- Drag & drop tabs to reorganize the tree — even across tab groups

```
 📂 Tree Style Tab
 ├─ 🔍 Google: "React hooks"
 │  ├─ 📄 React Docs - Hooks
 │  │  ├─ 📄 useState Hook
 │  │  └─ 📄 useEffect Guide
 │  └─ 📄 Stack Overflow - hooks question
 ├─ 📧 Gmail
 └─ 📄 YouTube
```

#### 📁 Chrome Tab Groups
- Full support for native Chrome/Edge tab groups with color-coded containers
- Click to collapse/expand — **synced bidirectionally** with the browser
- Double-click to inline edit group name & color (9 colors)
- Collapsed groups show a favicon preview strip with letter fallbacks

```
 🔵┃ Sprint 12 (3)                    ← expanded
   ┃  📄 JIRA Board
   ┃  📄 Design Spec
   ┃  📄 PR Review
 🟢┃ Research (4)  📄📄 Ⓢ Ⓖ          ← collapsed, shows favicon strip
 🔴┃ Bugs ✏️                           ← double-click to edit name & color
   ┃  [Bug Tracker___________]
   ┃  🔵🔴🟡🟢🟣🩷🩶🟠🩵  ← color picker
```

#### 🖥️ Two Modes

| | Popup Mode | Side Panel Mode |
|---|---|---|
| **Shortcut** | `Alt + Q` | `Alt + S` |
| **Style** | Overlay, closes after action | Always visible alongside pages |
| **Best for** | Quick tab switching | Managing many tabs |

```
 ┌─ Popup Mode ─────────┐      ┌── Browser ──────────────────┬─ Side Panel ─┐
 │ Filter: ___________   │      │                             │ Filter: ___  │
 │ 📄 React Docs         │      │                             │ 📄 React     │
 │ 📄 Gmail          [x] │      │     Your Web Page           │ 📄 Gmail     │
 │ 📄 YouTube            │      │                             │ 📄 YouTube   │
 └───────────────────────┘      └─────────────────────────────┴──────────────┘
   opens on Alt+Q, auto-close      side panel stays open with Alt+S
```

#### 🔍 Search
- Type to filter tabs by title or URL instantly
- Bookmarks appear in search results
- No match? Press `Enter` to search Google directly

```
 Filter: [react______]
 ──────────────────────
 📄 React Docs - Hooks          ← title match
    https://react.dev/...
 📄 useEffect Guide             ← URL match
    https://react.dev/hooks/...
 ──────────────────────
 Bookmark & Search
 ⭐ React Tutorial              ← bookmark match
 ──────────────────────
 ⏎ to search on the Internet    ← no match fallback
```

#### ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `↑` `↓` | Move between tabs |
| `←` | Collapse / Go to parent |
| `→` | Expand / Go to first child |
| `Enter` | Switch to selected tab |
| `Alt + W` | Close tab and all its children |
| `Alt + Q` | Open popup |
| `Alt + S` | Open side panel |

#### 🎨 Themes
- Automatic dark/light mode based on system preference

---

### Getting Started

1. Install from [Chrome Web Store](https://chromewebstore.google.com/detail/tree-style-tab/hbohdjmnjcbngeflcopjdnmpoiolkfoc) or [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tree-style-tab/jemgfkmpnlaeopgihkaoncnobfnjkjgn)
2. Pin the extension for quick access
3. Press `Alt + Q` (popup) or `Alt + S` (side panel) to start

### Note
Tabs opened before installing the extension will appear as a flat list — the tree structure only tracks tabs opened after installation.