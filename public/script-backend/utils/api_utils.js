import { photoLoading } from './loading_utils.js';

// Default configuration
const DEFAULT_CONFIG = {
  baseURL: '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

export const createApiClient = (userConfig = {}) => {
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  // Helper function to handle timeout
  const withTimeout = (promise, ms) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Request timeout after ${ms}ms`));
      }, ms);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  };

  // Common request handler
  const request = async (method, url, data, options = {}) => {
    const {
      loadingTarget = document.body,
      loadingMessage,
      headers = {},
      ...fetchOptions
    } = options;

    const loadingId = photoLoading.create(loadingTarget);
    let response;

    try {
      photoLoading.show(loadingId);

      const fullUrl = config.baseURL + url;
      const body = data ? JSON.stringify(data) : undefined;

      response = await withTimeout(
        fetch(fullUrl, {
          method,
          headers: { ...config.headers, ...headers },
          body,
          ...fetchOptions
        }),
        options.timeout || config.timeout
      );

      if (!response.ok) {
        const errorData = await parseResponse(response);
        throw createApiError(errorData, response.status);
      }

      return await parseResponse(response);
    } catch (error) {
      console.error(`API ${method} ${url} failed:`, error);
      throw error;
    } finally {
      photoLoading.hide(loadingId);
      setTimeout(() => photoLoading.destroy(loadingId), 300);
    }
  };

  // Response parser
  const parseResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  };

  // Custom error constructor
  const createApiError = (errorData, status) => {
    const error = new Error(errorData.message || `HTTP error! status: ${status}`);
    error.status = status;
    error.data = errorData;
    return error;
  };

  // Public API methods
  return {
    get: (url, options = {}) => request('GET', url, null, options),
    post: (url, data, options = {}) => request('POST', url, data, options),
    put: (url, data, options = {}) => request('PUT', url, data, options),
    patch: (url, data, options = {}) => request('PATCH', url, data, options),
    delete: (url, options = {}) => request('DELETE', url, null, options),
    
    // Add any additional methods as needed
    setHeader: (key, value) => {
      config.headers[key] = value;
    },
    removeHeader: (key) => {
      delete config.headers[key];
    }
  };
};

// Default API instance
export const api = createApiClient();