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

<p align="center">
  <img src="docs/images/hero.png" alt="Tree Style Tab Overview" width="700" style="border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);" />
</p>

---

### Why Tree Style Tab?

When you have dozens of tabs open, finding the right one is painful. Tree Style Tab solves this by displaying your tabs as a **tree** — tabs opened from the same page are grouped as children, giving you instant context about how your tabs relate to each other.

---

### Features

#### 🌳 Tree View

Tabs are organized into a parent-child tree based on how they were opened. Collapse, expand, and drag & drop to reorganize — even across tab groups.

<p align="center">
  <img src="docs/images/tree-view.png" alt="Tree View" width="360" style="border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);" />
</p>

#### 📁 Chrome Tab Groups

Full support for native Chrome/Edge tab groups. Color-coded containers, click to collapse/expand (synced with browser), double-click to inline edit name & color.

<p align="center">
  <img src="docs/images/tab-group.png" alt="Tab Groups" height="220" style="border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);" />
  &nbsp;&nbsp;
  <img src="docs/images/tab-group-edit.png" alt="Tab Group Editing" height="220" style="border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);" />
</p>

#### 🖥️ Two Modes

| | Popup Mode | Side Panel Mode |
|---|---|---|
| **Shortcut** | `Alt + Q` | `Alt + S` |
| **Style** | Overlay, closes after action | Always visible alongside pages |
| **Best for** | Quick tab switching | Managing many tabs |

<p align="center">
  <img src="docs/images/popup-mode.png" alt="Popup Mode" height="400" style="border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);" />
  &nbsp;&nbsp;
  <img src="docs/images/sidepanel-mode.png" alt="Side Panel Mode" height="400" style="border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);" />
</p>

#### ✋ Drag & Drop

Rearrange tabs by dragging them anywhere in the tree. Move tabs between groups, reorder siblings, or nest as children. A live position indicator shows exactly where the tab will land.

<p align="center">
  <img src="docs/images/drag-drop.png" alt="Drag & Drop" width="360" style="border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);" />
</p>

#### 🏷️ Tab Marks (Side Panel)

In side panel mode, hover a tab to reveal quick-action buttons. Mark tabs with icons (✓ Done, 📌 Pin, ✗ Reject, ⚠ WIP, ? Question) — the mark shows as a colored badge on the favicon for easy visual scanning.

<p align="center">
  <img src="docs/images/tab-marks.png" alt="Tab Marks" width="360" style="border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);" />
</p>

#### 🔍 Search

Type to filter tabs by title or URL instantly. Bookmarks also appear in results. No match? Press Enter to search Google directly.

<p align="center">
  <img src="docs/images/search.png" alt="Search" width="300" style="border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);" />
</p>

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

Automatic dark / light mode based on your system preference.

<p align="center">
  <img src="docs/images/dark-mode.png" alt="Dark Mode" height="200" style="border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);" />
  &nbsp;&nbsp;
  <img src="docs/images/light-mode.png" alt="Light Mode" height="200" style="border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);" />
</p>

---

### Getting Started

1. Install from [Chrome Web Store](https://chromewebstore.google.com/detail/tree-style-tab/hbohdjmnjcbngeflcopjdnmpoiolkfoc) or [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tree-style-tab/jemgfkmpnlaeopgihkaoncnobfnjkjgn)
2. Pin the extension for quick access
3. Press `Alt + Q` (popup) or `Alt + S` (side panel) to start

### Development

```bash
npm install
npm run start:dev    # Dev server with mock data (localhost:3000)
npm run build        # Production build
```

Dev mode includes a **popup / sidepanel toggle** in the bottom-left corner. In sidepanel mode, a resizable drag handle lets you simulate different panel widths.

### Note
Tabs opened before installing the extension will appear as a flat list — the tree structure only tracks tabs opened after installation.