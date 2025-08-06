/**
 * Get All Items Action
 * Retrieves all items from a SharePoint list with pagination support
 * @param {string} listName - Name of the SharePoint list
 * @param {Array<string>} keys - Array of field names to retrieve
 * @returns {Promise<Array>} Promise that resolves to array of items
 */

import { axiosRequest } from "../utils/axiosRequest";

// SharePoint site URL - should be moved to environment variables
const SHAREPOINT_SITE_URL = "https://e1aoa.sharepoint.com/sites/Project-Management";

export async function getAllItems(listName, keys) {
  let allItems = [];

  // Start with first page of results
  let nextUrl = `${SHAREPOINT_SITE_URL}/_api/web/lists/getbytitle('${listName}')/items?$top=100`;

  try {
    // Fetch all pages of data
    while (nextUrl) {
      const responseData = await axiosRequest("get", listName, nextUrl, null, true);

      // Add current page items to collection
      allItems = allItems.concat(responseData.value);

      // Get next page URL if available
      nextUrl = responseData["odata.nextLink"] || null;
    }

    // Filter and map items to only include requested fields
    const filteredItems = allItems.map((item) => {
      const filteredItem = {};
      keys.forEach((key) => {
        filteredItem[key] = item[key];
      });
      return filteredItem;
    });

    return filteredItems;
  } catch (error) {
    console.error(`Failed to fetch items from list '${listName}':`, error);
    throw error;
  }
}
