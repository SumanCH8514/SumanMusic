/**
 * Global API wrapper to intercept and handle specific status codes (like 403).
 */
export const apiFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);

    if (response.status === 403) {
      // Dispatch a custom event for the GDriveContext to catch and rotate keys
      window.dispatchEvent(new CustomEvent('gdrive-key-failover'));
      
      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: {
          message: 'Access Denied (403): Switching API Key...',
          type: 'error'
        }
      }));
    }

    return response;
  } catch (error) {
    // Also catch network errors
    window.dispatchEvent(new CustomEvent('app-toast', {
      detail: {
        message: 'Network Error: Please check your connection.',
        type: 'error'
      }
    }));
    throw error;
  }
};
