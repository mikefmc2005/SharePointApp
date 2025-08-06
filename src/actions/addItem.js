/**
 * Add Item Action
 * Creates a new item in a SharePoint list
 * @param {string} listName - Name of the SharePoint list
 * @param {Object} data - Data object to be added to the list
 * @returns {Promise<Object>} Promise that resolves to the created item
 */

import { axiosRequest } from "../utils/axiosRequest";

export const addItem = async (listName, data) => {
  data.__metadata = { type: `SP.Data.${listName}ListItem` };

  return await axiosRequest("post", listName, null, data);
};
