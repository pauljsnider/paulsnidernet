/**
 * Junior Current Website
 * Main JavaScript Functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Handle image loading errors
    document.querySelectorAll('img').forEach(img => {
        img.onerror = function() {
            this.src = 'Images/placeholder.png';
            this.alt = 'Image not available';
        };
    });

    // Initialize any components that need JavaScript functionality
    initializeComponents();
});

/**
 * Initialize various components across the site
 */
function initializeComponents() {
    // Add any global component initialization here
    console.log('Junior Current website initialized');
}

/**
 * Helper function to create elements with classes
 * @param {string} tag - HTML tag name
 * @param {string|Array} classes - CSS class or array of classes
 * @param {string} text - Optional text content
 * @returns {HTMLElement} - The created element
 */
function createElement(tag, classes, text) {
    const element = document.createElement(tag);
    
    if (classes) {
        if (Array.isArray(classes)) {
            classes.forEach(cls => element.classList.add(cls));
        } else {
            element.classList.add(classes);
        }
    }
    
    if (text) {
        element.textContent = text;
    }
    
    return element;
}

/**
 * Format a date string to a more readable format
 * @param {string} dateString - Date string in format YYYY-MM-DD
 * @returns {string} - Formatted date string
 */
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

/**
 * Format a time string to a more readable format
 * @param {string} timeString - Time string in format HH:MM
 * @returns {string} - Formatted time string
 */
function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}