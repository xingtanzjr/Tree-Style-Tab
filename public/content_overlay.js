(function () {
    const OVERLAY_ID = 'tst-popup-overlay';

    // If overlay exists, close it (toggle behavior)
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) {
        existing.remove();
        return;
    }

    // Backdrop
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0', left: '0', right: '0', bottom: '0',
        zIndex: '2147483647',
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '8vh',
    });

    // Iframe loading the extension popup page
    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('index.html') + '?mode=overlay';
    Object.assign(iframe.style, {
        width: '750px',
        height: '600px',
        maxHeight: '80vh',
        border: 'none',
        borderRadius: '8px',
        boxShadow: '0 8px 40px rgba(0, 0, 0, 0.6)',
    });
    iframe.allow = '';

    overlay.appendChild(iframe);

    function closeOverlay() {
        overlay.remove();
    }

    // Click backdrop to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeOverlay();
    });

    // Escape to close
    function onKeyDown(e) {
        if (e.key === 'Escape') {
            closeOverlay();
            document.removeEventListener('keydown', onKeyDown, true);
        }
    }
    document.addEventListener('keydown', onKeyDown, true);

    // Listen for close message from the iframe (e.g. after tab switch)
    window.addEventListener('message', function handler(e) {
        if (e.data && e.data.type === 'tst-close-overlay') {
            closeOverlay();
            window.removeEventListener('message', handler);
        }
    });

    document.body.appendChild(overlay);
})();
