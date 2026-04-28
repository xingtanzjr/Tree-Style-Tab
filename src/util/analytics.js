/* global chrome */

import REGION_CODES, { COUNTRY_LOCATION_CODES } from './regionCodes';

const GA_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const GA_DEBUG_ENDPOINT = 'https://www.google-analytics.com/debug/mp/collect';

const MEASUREMENT_ID = 'G-FZMN8RTLXZ';
const API_SECRET = 'nxIUJE8TSO-jzVct48v83A';
const DEFAULT_ENGAGEMENT_TIME_MSEC = 100;
const SESSION_EXPIRATION_IN_MIN = 30;
const GEO_CACHE_KEY = 'ga4UserLocationCache';
const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const GEO_CACHE_VERSION = 1;

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

  async getGeoLocation() {
    try {
      const result = await chrome.storage?.local?.get(GEO_CACHE_KEY);
      const geoCache = result?.[GEO_CACHE_KEY];
      if (
        geoCache &&
        geoCache.version === GEO_CACHE_VERSION &&
        (Date.now() - geoCache.timestamp) < GEO_CACHE_TTL_MS
      ) {
        return geoCache.data;
      }

      const response = await fetch('https://ipinfo.io/json');
      if (!response.ok) return null;

      const json = await response.json();
      if (!json.country) return null;

      const data = { country_id: json.country };
      if (json.city) {
        data.city = json.city;
      }

      const locationCodes = COUNTRY_LOCATION_CODES[json.country];
      if (locationCodes) {
        data.continent_id = locationCodes.continent_id;
        data.subcontinent_id = locationCodes.subcontinent_id;
      }

      const regionCode = REGION_CODES[json.country]?.[json.region];
      if (regionCode) {
        data.region_id = `${json.country}-${regionCode}`;
      }

      await chrome.storage?.local?.set({
        [GEO_CACHE_KEY]: {
          data,
          timestamp: Date.now(),
          version: GEO_CACHE_VERSION,
        },
      });

      return data;
    } catch (error) {
      this.debugIgnoredError('geo lookup failed; sending event without user_location.', error);
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
      const geo = await this.getGeoLocation();
      const body = {
        client_id: await this.getOrCreateClientId(),
        events: [{ name, params }],
      };
      if (geo) {
        body.user_location = geo;
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
