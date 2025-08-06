/**
 * Edit Item Action
 * Updates an existing item in a SharePoint list
 * @param {string} listName - Name of the SharePoint list
 * @param {number} itemId - ID of the item to update
 * @param {Object} data - Updated data object
 * @returns {Promise<Object>} Promise that resolves to the updated item
 */

import { axiosRequest } from "../utils/axiosRequest";

export const editItem = async (listName, ID, data) => {
  data.__metadata = { type: "SP.Data." + listName + "ListItem" };

  return await axiosRequest("patch", listName, `(${ID})`, data);
};
