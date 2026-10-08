import { CORS_HEADERS } from '../config/cors.js';

export const jsonResponse = (data, status = 200, extraHeaders = {}) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders
    }
  });
};

export const errorResponse = (message, status = 500) => {
  return jsonResponse({ error: message, success: false }, status);
};

export const parseKeys = (rawString = '') => {
  return rawString.split(',').map(k => k.trim()).filter(k => k.length > 5);
};
