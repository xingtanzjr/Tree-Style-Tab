import { useState, useEffect } from 'react';
import { t } from '../util/i18n';

/**
 * Banner prompting the user to grant the optional "tabGroups" permission.
 * Shown only when the permission has not yet been granted.
 * After granting, triggers a tree refresh so tab groups appear immediately.
 */
export default function PermissionBanner({ chrome, onPermissionGranted }) {
    const [needed, setNeeded] = useState(false);

    useEffect(() => {
        chrome.permissions?.contains?.({ permissions: ['tabGroups'] }, (result) => {
            if (!result) setNeeded(true);
        });
    }, [chrome.permissions]);

    const requestPermission = () => {
        chrome.permissions?.request?.({ permissions: ['tabGroups'] }, (granted) => {
            if (granted) {
                setNeeded(false);
                onPermissionGranted?.();
            }
        });
    };

    if (!needed) return null;

    return (
        <div className="permission-banner">
            <div className="permission-banner-text">
                <div className="permission-banner-title">🎨 {t('permissionBannerTitle')}</div>
                <div className="permission-banner-desc">{t('permissionBannerDesc')}</div>
            </div>
            <button className="permission-banner-btn" onClick={requestPermission}>
                {t('permissionBannerAction')}
            </button>
        </div>
    );
}
