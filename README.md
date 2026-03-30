## Tree Style Tab

<p align="center">
  <img src="public/images/icon-128.png" alt="Tree Style Tab" width="80" />
</p>

<p align="center">
  <strong>A tree-style tab manager for Chrome & Edge</strong><br/>
  Organize, search, and navigate your tabs visually.
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/tree-style-tab/oicakdoenlelpjnkoljnaakdofplkgnd">
    <img src="https://img.shields.io/chrome-web-store/v/oicakdoenlelpjnkoljnaakdofplkgnd?label=Chrome%20Web%20Store&color=4285f4&logo=googlechrome&logoColor=white" alt="Chrome Web Store" />
  </a>
  <a href="https://microsoftedge.microsoft.com/addons/detail/tree-style-tab/gebppppmdlmbaigelgpdlpfkaodikfon">
    <img src="https://img.shields.io/badge/Edge%20Add--ons-v2.0.0-0078d4?logo=microsoftedge&logoColor=white" alt="Edge Add-ons" />
  </a>
  <a href="https://chromewebstore.google.com/detail/tree-style-tab/oicakdoenlelpjnkoljnaakdofplkgnd">
    <img src="https://img.shields.io/chrome-web-store/users/oicakdoenlelpjnkoljnaakdofplkgnd?color=34a853&label=users" alt="Users" />
  </a>
</p>

<p align="center">
  <img src="docs/images/light-hero.png" alt="Tree Style Tab Overview" width="100%" />
</p>

---

### Why Tree Style Tab?

When you have dozens of tabs open, finding the right one is painful. Tree Style Tab solves this by displaying your tabs as a **tree** — tabs opened from the same page are grouped as children, giving you instant context about how your tabs relate to each other.

---

### Features

#### 🖥️ Two Modes

| | Popup Mode | Side Panel Mode |
|---|---|---|
| **Shortcut** | `Alt + Q` | `Alt + S` |
| **Style** | Overlay, closes after action | Always visible alongside pages |
| **Best for** | Quick tab switching | Managing many tabs |

<p align="center">
  <img src="docs/images/light-hero.png" alt="Tree Style Tab Overview" width="100%" />
</p>
<p align="center">
  <img src="docs/images/light-popup-overview.png" alt="Tree Style Tab Overview" width="100%" />
</p>

#### 🌳 Tree View

Tabs are automatically organized into a parent-child tree based on how they were opened. Collapse and expand subtrees (with a +N badge showing hidden children count), or drag & drop to reorganize — even across tab groups. The tree updates in real time as you open, close, or move tabs.

<p align="center">
  <img src="docs/images/light-sidepanel-focus.png" alt="Tree View" height="620" />
  &nbsp;&nbsp;
  <img src="docs/images/dark-sidepanel-focus.png" alt="Tree View Dark" height="620" />
</p>

#### 📁 Chrome Tab Groups

Full support for native Chrome/Edge tab groups. Color-coded containers with 9 colors, click to collapse/expand (bi-directionally synced with the browser), and double-click the group header to inline edit name & color. Tabs dragged between groups are automatically reassigned.

<p align="center">
  <img src="docs/images/tab-group.png" alt="Tab Groups" height="420" />
  &nbsp;&nbsp;
  <img src="docs/images/tab-group-edit.png" alt="Tab Group Editing" height="420" />
</p>


#### ✋ Drag & Drop

Rearrange tabs by dragging them anywhere in the tree. Move tabs between groups, reorder siblings, or nest as children. A live position indicator shows exactly where the tab will land. Dragging a tab moves its entire subtree.

#### 🏷️ Tab Marks (Side Panel)

In side panel mode, hover a tab to reveal quick-action buttons. Mark tabs with icons (✓ Done, 📌 Pin, ✗ Reject, ⚠ WIP, ? Question) — the mark shows as a colored badge on the favicon for easy visual scanning. Marks are preserved when saving workspaces.

<p align="center">
  <img src="docs/images/drag-drop.png" alt="Drag & Drop" height="360" />
  &nbsp;&nbsp;
  <img src="docs/images/tab-marks.png" alt="Tab Marks" height="360" />
</p>

#### 🔍 Search & Filter

Type to filter tabs by title or URL instantly with keyword highlighting. Bookmarks also appear in results (up to 30 matches). No match? Press Enter to search Google directly. Full IME composition support for CJK input.

<p align="center">
  <img src="docs/images/light-filter.png" alt="Search & Filter" width="100%" />
</p>

#### 📂 Workspaces (Side Panel)

Save your current window as a named workspace — all tabs, tree structure, groups, and marks are preserved. Reopen a workspace later to restore everything. Preview and edit saved workspaces: rename, remove tabs, reorganize with drag & drop, or modify groups and marks before restoring.

<p align="center">
  <img src="docs/images/workspace-list.png" alt="Workspace List" width="360" />
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

Start typing anywhere to instantly filter — the search field auto-focuses.

#### 🎨 Themes

Automatic dark / light mode based on your system preference.

<p align="center">
  <img src="docs/images/light-hero-fullscreen.png" alt="Light Mode" width="49%" />
  <img src="docs/images/dark-hero-fullscreen.png" alt="Dark Mode" width="49%" />
</p>

#### 🌐 Internationalization

Supports 10 languages out of the box: English, German, Spanish, French, Japanese, Korean, Portuguese (Brazil), Russian, Simplified Chinese, and Traditional Chinese.

---

### Getting Started

1. Install from [Chrome Web Store](https://chromewebstore.google.com/detail/tree-style-tab/oicakdoenlelpjnkoljnaakdofplkgnd) or [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tree-style-tab/gebppppmdlmbaigelgpdlpfkaodikfon)
2. Pin the extension for quick access
3. Press `Alt + Q` (popup) or `Alt + S` (side panel) to start
4. A guided onboarding tour will walk you through key features on first install

### Development

```bash
npm install
npm run start:dev    # Dev server with mock data (localhost:3000)
npm run build        # Production build
```

Dev mode includes a **popup / sidepanel toggle** in the bottom-left corner. In sidepanel mode, a resizable drag handle lets you simulate different panel widths.

### Note
Tabs opened before installing the extension will appear as a flat list — the tree structure only tracks tabs opened after installation.
