/* global chrome */

const GA_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const GA_DEBUG_ENDPOINT = 'https://www.google-analytics.com/debug/mp/collect';

const MEASUREMENT_ID = 'G-FZMN8RTLXZ';
const API_SECRET = 'nxIUJE8TSO-jzVct48v83A';
const DEFAULT_ENGAGEMENT_TIME_MSEC = 100;
const SESSION_EXPIRATION_IN_MIN = 30;
const IP_CACHE_KEY = 'ga4IpOverrideCache';
const IP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const IP_CACHE_VERSION = 1;

class Analytics {
  constructor(debug = false) {
    this.debug = debug;
  }

  debugIgnoredError(message, error) {
    if (this.debug) {
      console.debug(`[GA4] ${message}`, error);
    }
  }

  async getOrCreateClientId() {
    let clientId = null;
    try {
      const result = await chrome.storage?.local?.get('clientId');
      clientId = result?.clientId;
    } catch (error) {
      this.debugIgnoredError('clientId storage read unavailable; generating a new client ID.', error);
    }
    if (!clientId) {
      clientId = crypto.randomUUID();
      try {
        await chrome.storage?.local?.set({ clientId });
      } catch (error) {
        this.debugIgnoredError('clientId storage write unavailable; continuing without persistence.', error);
      }
    }
    return clientId;
  }

  async getOrCreateSessionId() {
    let sessionData = null;
    try {
      const result = await chrome.storage?.session?.get('sessionData');
      if (result) sessionData = result.sessionData;
    } catch (error) {
      this.debugIgnoredError(
        'session storage unavailable; falling back to a transient session ID.',
        error
      );
    }
    const currentTimeInMs = Date.now();

    if (sessionData && sessionData.timestamp) {
      const durationInMin = (currentTimeInMs - sessionData.timestamp) / 60000;
      if (durationInMin > SESSION_EXPIRATION_IN_MIN) {
        sessionData = null;
      } else {
        sessionData.timestamp = currentTimeInMs;
        await chrome.storage?.session?.set({ sessionData });
      }
    }

    if (!sessionData) {
      sessionData = {
        session_id: currentTimeInMs.toString(),
        timestamp: currentTimeInMs.toString(),
      };
      await chrome.storage?.session?.set({ sessionData });
    }

    return sessionData.session_id;
  }

  async getIpOverride() {
    try {
      const result = await chrome.storage?.local?.get(IP_CACHE_KEY);
      const ipCache = result?.[IP_CACHE_KEY];
      if (
        ipCache &&
        ipCache.version === IP_CACHE_VERSION &&
        (Date.now() - ipCache.timestamp) < IP_CACHE_TTL_MS
      ) {
        return ipCache.ip;
      }

      const response = await fetch('https://ipinfo.io/json');
      if (!response.ok) return null;

      const json = await response.json();
      if (!json.ip) return null;

      await chrome.storage?.local?.set({
        [IP_CACHE_KEY]: {
          ip: json.ip,
          timestamp: Date.now(),
          version: IP_CACHE_VERSION,
        },
      });

      return json.ip;
    } catch (error) {
      this.debugIgnoredError('IP lookup failed; sending event without ip_override.', error);
      return null;
    }
  }

  async fireEvent(name, params = {}) {
    if (!params.session_id) {
      params.session_id = await this.getOrCreateSessionId();
    }
    if (!params.engagement_time_msec) {
      params.engagement_time_msec = DEFAULT_ENGAGEMENT_TIME_MSEC;
    }

    try {
      const ipOverride = await this.getIpOverride();
      const body = {
        client_id: await this.getOrCreateClientId(),
        events: [{ name, params }],
      };
      if (ipOverride) {
        body.ip_override = ipOverride;
      }
      const response = await fetch(
        `${this.debug ? GA_DEBUG_ENDPOINT : GA_ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );
      if (this.debug) {
        console.log('[GA4] Request body:', JSON.stringify(body, null, 2));
        console.log('[GA4] Response:', await response.text());
      }
    } catch (e) {
      console.error('Google Analytics request failed with an exception', e);
    }
  }

  async firePageViewEvent(pageTitle, pageLocation, additionalParams = {}) {
    return this.fireEvent('page_view', {
      page_title: pageTitle,
      page_location: pageLocation,
      ...additionalParams,
    });
  }

  async fireErrorEvent(error, additionalParams = {}) {
    return this.fireEvent('extension_error', {
      ...error,
      ...additionalParams,
    });
  }
}

export default new Analytics(process.env.REACT_APP_USE_MOCK === 'true');
