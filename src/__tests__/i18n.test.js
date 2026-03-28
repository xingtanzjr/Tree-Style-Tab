import { t } from '../util/i18n';

describe('i18n', () => {
    it('should return message from chrome.i18n.getMessage', () => {
        // global.chrome.i18n.getMessage is mocked in setupTests.js to return key
        const result = t('someKey');
        expect(result).toBe('someKey');
    });

    it('should return key as fallback when getMessage returns empty', () => {
        const originalGetMessage = chrome.i18n.getMessage;
        chrome.i18n.getMessage = jest.fn().mockReturnValue('');
        
        expect(t('emptyKey')).toBe('emptyKey');
        
        chrome.i18n.getMessage = originalGetMessage;
    });

    it('should return key when chrome API throws', () => {
        const originalGetMessage = chrome.i18n.getMessage;
        chrome.i18n.getMessage = jest.fn().mockImplementation(() => {
            throw new Error('API not available');
        });

        expect(t('errorKey')).toBe('errorKey');

        chrome.i18n.getMessage = originalGetMessage;
    });

    it('should pass substitutions to chrome API', () => {
        const spy = jest.spyOn(chrome.i18n, 'getMessage');
        t('greeting', ['World']);
        expect(spy).toHaveBeenCalledWith('greeting', ['World']);
        spy.mockRestore();
    });
});
