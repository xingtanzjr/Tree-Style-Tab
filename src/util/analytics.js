/* global chrome */

const GA_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const GA_DEBUG_ENDPOINT = 'https://www.google-analytics.com/debug/mp/collect';

const MEASUREMENT_ID = 'G-FZMN8RTLXZ';
const API_SECRET = 'nxIUJE8TSO-jzVct48v83A';
const DEFAULT_ENGAGEMENT_TIME_MSEC = 100;
const SESSION_EXPIRATION_IN_MIN = 30;

class Analytics {
  constructor(debug = false) {
    this.debug = debug;
  }

  async getOrCreateClientId() {
    let { clientId } = await chrome.storage.local.get('clientId');
    if (!clientId) {
      clientId = crypto.randomUUID();
      await chrome.storage.local.set({ clientId });
    }
    return clientId;
  }

  async getOrCreateSessionId() {
    let { sessionData } = await chrome.storage.session.get('sessionData');
    const currentTimeInMs = Date.now();

    if (sessionData && sessionData.timestamp) {
      const durationInMin = (currentTimeInMs - sessionData.timestamp) / 60000;
      if (durationInMin > SESSION_EXPIRATION_IN_MIN) {
        sessionData = null;
      } else {
        sessionData.timestamp = currentTimeInMs;
        await chrome.storage.session.set({ sessionData });
      }
    }

    if (!sessionData) {
      sessionData = {
        session_id: currentTimeInMs.toString(),
        timestamp: currentTimeInMs.toString(),
      };
      await chrome.storage.session.set({ sessionData });
    }

    return sessionData.session_id;
  }

  async fireEvent(name, params = {}) {
    if (!params.session_id) {
      params.session_id = await this.getOrCreateSessionId();
    }
    if (!params.engagement_time_msec) {
      params.engagement_time_msec = DEFAULT_ENGAGEMENT_TIME_MSEC;
    }

    try {
      const response = await fetch(
        `${this.debug ? GA_DEBUG_ENDPOINT : GA_ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`,
        {
          method: 'POST',
          body: JSON.stringify({
            client_id: await this.getOrCreateClientId(),
            events: [{ name, params }],
          }),
        }
      );
      if (this.debug) {
        console.log(await response.text());
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
