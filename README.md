## Tree Style Tab
A tree style tab navigator

**PIN your extension and press 'Alt + Q' to open the extension swiftly**, enhancing your browsing experience!

### Introduction
This Chrome/Edge extension is aimed to solve a very simple but annoying problem, that is, how to switch to the tab you want quickly in lots of opened tabs.

What the extension different from others is that it gives a **tree-style list** for tabs. This tree separates all tabs into different groups by the relationship between the child-tab and their parent-tab, which gives you a better insight for all the tabs. All the tabs opened by same tab will become the children of the tab which opens them.

### New-Features
* 🚀 **DARK MODE**
* 🔍 **Quick Search**. If no tab is selected, pressing **ENTER** can search the keyword on the Internet directly!

### Default Shrot-cuts
* Alt+Q : Open Tab-Tree. (You can also set your own shortcut for that)
* ⬆️ (Arrow-up): move to previous tab 
* ⬇️ (Arrow-down):move to next tab
* ↩️ (Enter): switch to selected tab. If no tab is selected, it will search the keyword on the Internet
* Alt + w: close all sub tabs for selected tab

    
### Other Features
* Search: search all opened tabs by keyword.
* Bookmarks: search your bookmarks and open the bookmark in a new tab quickly.

### Build form source
1. Clone the repository
2. Execute `export NODE_OPTIONS=--openssl-legacy-provider` if you are using openssl 3.0 or newer
3. Run `yarn install` to install dependencies
4. Run `yarn run build` to build the extension
5. Load the extension in Chrome/Edge:
    * Open Chrome/Edge and go to `chrome://extensions/` or `edge://extensions/`
    * Enable "Developer mode" (usually a toggle switch in the top right corner)
    * Click "Load unpacked" (usually a button in the top left corner)
    * Select the `build` folder in the project directory
6. Pack into crx file if needed

### NOTICE
Tabs which was opened before installing this extension could not be showed in a tree view.