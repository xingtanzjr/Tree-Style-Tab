import { memo } from 'react';
import { SettingOutlined } from '@ant-design/icons';
import { t } from '../util/i18n';

function SettingsView({ chrome, showUrls, onToggleShowUrls }) {
    return (
        <div className="settings-view">
            <div className="settings-section">
                <div className="settings-section-title">{t('settingsDisplay')}</div>
                <label className="settings-toggle-row">
                    <span>{t('settingsShowUrls')}</span>
                    <input
                        type="checkbox"
                        checked={showUrls}
                        onChange={(e) => onToggleShowUrls(e.target.checked)}
                    />
                </label>
            </div>
            <div className="settings-section">
                <div className="settings-section-title">{t('settingsShortcuts')}</div>
                <button
                    className="settings-link-btn"
                    onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}
                >
                    <SettingOutlined />
                    <span>{t('settingsOpenShortcuts')}</span>
                </button>
            </div>
        </div>
    );
}

export default memo(SettingsView);
