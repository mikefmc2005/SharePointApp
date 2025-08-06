/**
 * SharePoint API Request Utilities
 * Handles authentication and HTTP requests to SharePoint REST API
 */

import * as msal from "@azure/msal-browser";
import axios from "axios";
import { useUserStore } from "../store/index";

// Azure AD Configuration
const TENANT_ID = "893c3206-7236-4ab1-82b5-d8d51b82ac12";
const CLIENT_ID = "b3aed150-5011-4b6f-9143-77658825ab99";

// SharePoint Site Configuration
const SHAREPOINT_SITE_URL = "https://e1aoa.sharepoint.com/sites/Project-Management";

// Request headers for SharePoint API
const headers = {
  Authorization: null,
  "X-RequestDigest": null,
  "Content-Type": "application/json;odata=verbose",
  "If-Match": "*",
  Accept: "application/json;odata=minimalmetadata",
};

// Feature flag for local storage usage
const USE_LOCAL_STORAGE = false;

/**
 * Load access token from Azure AD or local storage
 * Handles MSAL authentication flow
 */
export async function loadAccessToken() {
  // Try to get token from local storage first
  headers.Authorization = window.localStorage.getItem("Authorization");

  if (USE_LOCAL_STORAGE) return;

  try {
    // Initialize MSAL instance for Azure AD authentication
    const msalInstance = new msal.PublicClientApplication({
      auth: {
        clientId: CLIENT_ID,
        authority: `https://login.microsoftonline.com/${TENANT_ID}`,
        redirectUri: window.location.origin,
      },
      cache: {
        cacheLocation: "localStorage",
        storeAuthStateInCookie: false,
      },
    });

    await msalInstance.initialize();

    // Login and get access token
    const { tokenType, accessToken } = await msalInstance.loginPopup({
      scopes: ["https://e1aoa.sharepoint.com/.default"],
    });

    headers.Authorization = `${tokenType} ${accessToken}`;
    window.localStorage.setItem("Authorization", headers.Authorization);
  } catch (error) {
    console.error("Failed to load access token:", error);
    throw error;
  }
}

/**
 * Load SharePoint request digest and current user info
 * Required for POST/PATCH/DELETE operations
 */
export async function loadRequestDigest() {
  const userStore = useUserStore();

  try {
    // Get request digest for SharePoint API
    const response = await axios.post(`${SHAREPOINT_SITE_URL}/_api/contextinfo`, {}, { headers });

    const data = response.data;

    if (data.error_description) {
      throw new Error(data.error_description);
    }

    headers["X-RequestDigest"] = data.FormDigestValue;

    // Fetch current user and store in Pinia
    const userResponse = await axios.get(`${SHAREPOINT_SITE_URL}/_api/web/currentuser`, { headers });

    const userData = userResponse.data;
    userStore.setUser(userData);
  } catch (error) {
    console.error("Failed to load request digest:", error);
    throw error;
  }
}

/**
 * Generic HTTP request function for SharePoint API
 * @param {string} method - HTTP method (get, post, patch, delete)
 * @param {string} listName - SharePoint list name
 * @param {string|number} details - Additional URL details or item ID
 * @param {Object} body - Request body for POST/PATCH requests
 * @param {boolean} fullUrl - Whether details contains a full URL
 * @returns {Promise<Object>} Response data
 */
export async function axiosRequest(method, listName, details = null, body = null, fullUrl = false) {
  // Construct URL
  const url = fullUrl
    ? details
    : `${SHAREPOINT_SITE_URL}/_api/web/lists/getbytitle('${listName}')/items${details ? details : ""}`;

  try {
    let response;

    if (method === "get" || method === "delete") {
      response = await axios[method](url, { headers });
    } else {
      response = await axios[method](url, body, { headers });
    }

    // Handle unauthorized responses
    if (response.status === 401) {
      console.error("Unauthorized access");
      alert("Unauthorized access. Please refresh the page.");
      window.location.reload();
      return;
    }

    // Return early for PATCH and DELETE operations
    if (method === "patch" || method === "delete") {
      return response.data;
    }

    return response.data;
  } catch (error) {
    console.error(`Request failed for ${method} ${url}:`, error);

    if (error?.response?.status === 401) {
      alert("Unauthorized access. Please refresh the page.");
      window.location.reload();
      return;
    }

    throw error;
  }
}

/**
 * Convenience function for GET requests
 * @param {string} url - Full URL to request
 * @returns {Promise<Object>} Response data
 */
export async function getRequest(url) {
  return await axiosRequest("get", null, url, null, true);
}

/**
 * Convenience function for POST requests
 * @param {string} url - Full URL to request
 * @param {Object} data - Request body
 * @returns {Promise<Object>} Response data
 */
export async function postRequest(url, data) {
  return await axiosRequest("post", null, url, data, true);
}
