/**
 * Get Item Action
 * Retrieves a single item from a SharePoint list
 * @param {string} listName - Name of the SharePoint list
 * @param {number} itemId - ID of the item to retrieve
 * @returns {Promise<Object>} Promise that resolves to the requested item
 */

import { axiosRequest } from "../utils/axiosRequest";

export const getItem = async (listName, keys, details) => {
  const items = await axiosRequest("get", listName, details);

  return items.value.map((it) => {
    const temp = {};
    keys.map((key) => (temp[key] = it[key]));
    return temp;
  });
};
