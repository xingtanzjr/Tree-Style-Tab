import { useState, useEffect } from 'react';
import { t } from '../util/i18n';
import analytics from '../util/analytics';

/**
 * Upgrade guide banner shown to users upgrading from 1.x (popup-only).
 * Introduces Side Panel, Workspaces, and Tab Groups features.
 * Dismissible — sets showUpgradeGuide: false in chrome.storage.local.
 */
export default function UpgradeGuide({ chrome, panelMode }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        chrome.storage.local.get('showUpgradeGuide').then((result) => {
            if (result.showUpgradeGuide) {
                setVisible(true);
            }
        });
    }, [chrome.storage.local]);

    const dismiss = () => {
        setVisible(false);
        chrome.storage.local.set({ showUpgradeGuide: false });
    };

    const openSidePanel = () => {
        chrome.runtime.sendMessage({ action: 'openSidePanel' });
        analytics.fireEvent('upgrade_guide_open_sidepanel');
        dismiss();
    };

    const openOnboarding = () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
        analytics.fireEvent('upgrade_guide_open_onboarding');
        dismiss();
    };

    if (!visible || panelMode === 'sidepanel') return null;

    return (
        <div className="upgrade-guide">
            <button className="upgrade-guide-close" onClick={dismiss} title={t('upgradeGuideDismiss')}>×</button>
            <div className="upgrade-guide-title">🎉 {t('upgradeGuideTitle')}</div>
            <div className="upgrade-guide-features">
                <span>📌 {t('upgradeFeatureSidePanel')} — {t('upgradeHintPrefix')}<kbd>Alt+S</kbd>{t('upgradeHintSuffix')}</span>
                <span className="upgrade-divider">|</span>
                <span>💾 {t('upgradeFeatureWorkspace')}</span>
                <span className="upgrade-divider">|</span>
                <span>🎨 {t('upgradeFeatureTabGroups')}</span>
            </div>
            <div className="upgrade-guide-actions">
                <button className="upgrade-guide-btn" onClick={openOnboarding}>
                    {t('upgradeActionOnboarding')}
                </button>
            </div>
        </div>
    );
}
