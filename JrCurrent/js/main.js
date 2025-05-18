/**
 * Junior Current Website
 * Main JavaScript Functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    try {
        // Handle image loading errors
        document.querySelectorAll('img').forEach(img => {
            img.onerror = function() {
                this.src = 'Images/placeholder.png';
                this.alt = 'Image not available';
            };
        });

        // Initialize any components that need JavaScript functionality
        initializeComponents();
        
        // Ensure page completes loading even if there are errors
        window.addEventListener('load', function() {
            document.body.classList.add('page-loaded');
        });
        
        // Set a timeout to ensure the page completes loading
        setTimeout(function() {
            document.body.classList.add('page-loaded');
        }, 5000); // 5 second timeout as a fallback
    } catch (error) {
        console.error('Error initializing website:', error);
        // Ensure page completes loading even if there's an error
        document.body.classList.add('page-loaded');
    }
});

/**
 * Initialize various components across the site
 */
function initializeComponents() {
    try {
        // Add any global component initialization here
        console.log('Junior Current website initialized');
    } catch (error) {
        console.error('Error in component initialization:', error);
    }
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
    try {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString; // Return original string if there's an error
    }
}

/**
 * Format a time string to a more readable format
 * @param {string} timeString - Time string in format HH:MM
 * @returns {string} - Formatted time string
 */
function formatTime(timeString) {
    try {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    } catch (error) {
        console.error('Error formatting time:', error);
        return timeString; // Return original string if there's an error
    }
}