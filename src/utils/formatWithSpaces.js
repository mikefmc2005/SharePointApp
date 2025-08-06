/**
 * Number Formatting Utility
 * Formats numbers with thousands separators and optional decimal points
 */

/**
 * Formats a number with commas as thousands separators and optional decimal points
 * @param {number} number - The number to format
 * @param {number} points - Number of decimal points to show (default: 1)
 * @returns {string} Formatted number as a string
 */
const formatWithSpaces = (number, points = 1) => {
  // Validate input
  if (typeof number !== "number" || isNaN(number)) {
    return "0";
  }

  let formattedNumber;

  // Handle integer vs decimal numbers
  if (number === parseInt(number)) {
    formattedNumber = parseInt(number);
  } else {
    formattedNumber = number.toFixed(points);
    // Remove trailing .0 if present
    if (formattedNumber.endsWith(".0")) {
      formattedNumber = formattedNumber.slice(0, -2);
    }
  }

  // Final validation
  if (isNaN(formattedNumber)) {
    return "";
  }

  // Split into integer and decimal parts
  const [intPart, decimalPart] = formattedNumber.toString().split(".");

  // Add thousands separators to integer part
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // Return formatted number
  return decimalPart !== undefined ? `${formattedInt}.${decimalPart}` : formattedInt;
};

export default formatWithSpaces;
