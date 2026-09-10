# Previous-Session Tree Recovery

## Scope

Recovery is automatic and best-effort for one normal browser window containing HTTP(S) tabs. Chrome/Edge must first restore the pages. The extension only writes definite parent-child edges into the current `storage.session.tabParentMap`; it never creates, closes, moves, pins, navigates, or groups tabs as part of recovery.

This is not saved-tab-group synchronization, workspace opening, lazy loading, multi-window recovery, or crash detection. Normal browser session restoration can also qualify. Matching the same URLs does not prove tab identity or that Chrome restored them; the conservative checks reduce ambiguity but cannot eliminate it.

## Matching Rules

- The complete ordered HTTP(S) URL list must match the previous snapshot. An extra, missing, redirected, or reordered web page prevents recovery. `pendingUrl` supports pages still being restored; pages do not need to finish loading.
- There must be exactly one normal window containing web pages. Incognito windows are ignored. Blank or internal-only startup windows can coexist with the restored window.
- Both endpoints must have unique URLs within the snapshot and current window. Repeated URLs are never assigned by position alone, including children of an ambiguous parent.
- Pinned/grouped status must match. Both endpoints must be unpinned and share the same current native group, or both be ungrouped. Group IDs may change; group title/color are not identity keys.
- Parents must precede children in browser order. Existing parent assignments are preserved, and edges that would create a cycle are skipped.
- An unsuccessful match is retried after relevant tab/window changes settle for 750 ms, for at most two minutes from session initialization. An expired deadline is also checked when a suspended worker wakes.
- Tree edits, workspace opening, moving, attaching/detaching, pinning, individual tab closure, or another parent-map update stop recovery. A successful full match is consumed once, even when all remaining edges are ambiguous.

The extension does not restore group metadata, collapse state, marks, notes, pinned status, or page content. It cannot recover trees from before this feature first recorded a snapshot.

## Storage and Lifecycle

`storage.local.treeSessionRecovery` holds a versioned current snapshot and a protected previous-session snapshot. Entries contain full URLs, pinned/grouped flags, and parent indices, plus snapshot version/time. Titles, favicons, tab IDs, window IDs, native group IDs, and incognito/non-HTTP(S) pages are not persisted by this feature. Recovery data is neither synced nor sent over the network.

`storage.session.treeSessionRecoveryState` holds a session token, deadline, phase, and the current snapshot's source-window ID. The source ID stays session-only and prevents a leftover blank startup window from replacing a closed source window's snapshot. The token survives service-worker suspension but not browser restart. Rotation is resumable: initialization is recorded before local snapshot rotation, and local data is tagged with the same token. A worker restart therefore does not rotate twice.

The previous snapshot remains untouched while matching is pending; partial startup tabs cannot overwrite it. Once waiting ends, the current window becomes the new snapshot source. Only the immediately preceding session is eligible; an older protected snapshot is not carried forward if the intervening session had no current snapshot. Closing the entire window preserves the last complete snapshot. Storage and tab events are asynchronous, so the final debounce interval or a failed storage write can lose recent changes.

All production parent writes share the service worker's queue. UI parent edits cancel waiting immediately and are acknowledged through `updateTabParent` messages, including explicit detachment of an already-root tab. The existing UI storage listener refreshes the tree when recovered edges are written. No new production permissions are needed.

## Verification

Run focused unit tests:

```bash
CI=true npm test -- --watchAll=false --runInBand --runTestsByPath src/__tests__/SessionRecovery.test.js src/__tests__/PinnedTabRelations.test.js src/__tests__/useWorkspace.test.js
```

Run a real unpacked-extension test with a throwaway profile:

```bash
npm run test:recovery
```

This builds the extension, creates six local fixture pages, records four parent edges through the production message handler, closes Chromium, and asks Chromium to restore its last session. It verifies changed tab IDs, preserved URL order and group membership, two restored unique edges, two skipped duplicate edges, and snapshot rotation. It does not use MockChrome. The test wrapper disables outbound `fetch` calls from the background worker, and all profiles are temporary.

The optional Linux crash path requires a working display and installed Playwright Chromium/system libraries:

```bash
TST_CRASH_TEST=1 npm run test:recovery
```

It initializes a persistent profile, waits for Chrome's session checkpoint, verifies the browser PID belongs to the test process and profile, and sends `SIGKILL` only to that process. After restart, the test-only `sessions` permission allows the harness to ask Chrome's own `sessions.restore()` API to restore the saved window. The production extension never calls that API and does not request that permission.

Verified locally with Chromium 145.0.7632.6 on Linux/WSL: normal session restore and the SIGKILL/API path. Native Restore-button interaction and keyboard injection are not part of the passing gate; WSL/X11 shortcut delivery was unreliable. Chrome/Edge release builds on Windows/macOS have not been validated by this test.