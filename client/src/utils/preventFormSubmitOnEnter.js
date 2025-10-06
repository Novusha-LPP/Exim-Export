/**
 * Utility function to prevent form submission when Enter key is pressed in input fields
 * @param {KeyboardEvent} event - The keyboard event
 */
export const preventFormSubmitOnEnter = (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
  }
};

/**
 * Higher-order function to create onKeyDown handler that prevents Enter key form submission
 * while allowing other key events to pass through
 * @param {Function} customHandler - Optional custom key handler to run after preventing Enter
 * @returns {Function} - The onKeyDown event handler
 */
export const createEnterKeyHandler = (customHandler) => {
  return (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      // Optionally run custom handler after preventing default
      if (customHandler && typeof customHandler === 'function') {
        customHandler(event);
      }
    }
  };
};

/**
 * Common props object for TextField components that should not submit form on Enter
 */
export const noEnterSubmitProps = {
  onKeyDown: preventFormSubmitOnEnter,
};
