/**
 * Delete Item Action
 * Removes an item from a SharePoint list
 * @param {string} listName - Name of the SharePoint list
 * @param {number} itemId - ID of the item to delete
 * @returns {Promise<Object>} Promise that resolves when item is deleted
 */

import { axiosRequest } from "../utils/axiosRequest";

export const deleteItem = async (listName, ID) => {
  await axiosRequest("delete", listName, `(${ID})`);
  return true;
};
