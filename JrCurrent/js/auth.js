/**
 * Junior Current Website
 * Authentication Module
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize login form functionality
    initLoginForm();
    
    // Check authentication on admin page
    if (window.location.pathname.includes('admin.html')) {
        checkAuthentication();
    }
    
    // Handle logout
    const logoutLink = document.querySelector('a[href="login.html"]');
    if (logoutLink && window.location.pathname.includes('admin.html')) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
            window.location.href = 'login.html';
        });
    }
});

/**
 * Initialize login form functionality
 */
function initLoginForm() {
    const loginForm = document.querySelector('.login-form');
    if (!loginForm) return;
    
    // Toggle password visibility
    const togglePassword = document.querySelector('.toggle-password');
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
        
        // Keyboard accessibility for password toggle
        togglePassword.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    }
    
    // Form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember')?.checked || false;
        
        // Validate form
        if (!validateLoginForm(email, password)) {
            return;
        }
        
        // Disable login button and show loading state
        const loginButton = document.getElementById('login-button');
        if (loginButton) {
            loginButton.disabled = true;
            loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        }
        
        // Authenticate user
        authenticateUser(email, password, remember);
    });
    
    // Input validation
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            validateEmail(this.value.trim());
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('blur', function() {
            validatePassword(this.value);
        });
    }
    
    // Forgot password link
    const forgotPasswordLink = document.querySelector('.forgot-password a');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            alert('For demo purposes, use email: admin@juniorcurrent.com and password: demo123');
        });
    }
}

/**
 * Validate login form
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {boolean} - Whether form is valid
 */
function validateLoginForm(email, password) {
    let isValid = true;
    
    if (!validateEmail(email)) {
        isValid = false;
    }
    
    if (!validatePassword(password)) {
        isValid = false;
    }
    
    return isValid;
}

/**
 * Validate email
 * @param {string} email - User email
 * @returns {boolean} - Whether email is valid
 */
function validateEmail(email) {
    const emailInput = document.getElementById('email');
    const emailValidation = document.getElementById('email-validation');
    
    if (!email) {
        if (emailInput) emailInput.classList.add('invalid');
        if (emailValidation) emailValidation.textContent = 'Email is required';
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        if (emailInput) emailInput.classList.add('invalid');
        if (emailValidation) emailValidation.textContent = 'Please enter a valid email address';
        return false;
    }
    
    if (emailInput) emailInput.classList.remove('invalid');
    return true;
}

/**
 * Validate password
 * @param {string} password - User password
 * @returns {boolean} - Whether password is valid
 */
function validatePassword(password) {
    const passwordInput = document.getElementById('password');
    const passwordValidation = document.getElementById('password-validation');
    
    if (!password) {
        if (passwordInput) passwordInput.classList.add('invalid');
        if (passwordValidation) passwordValidation.textContent = 'Password is required';
        return false;
    }
    
    if (passwordInput) passwordInput.classList.remove('invalid');
    return true;
}

/**
 * Authenticate user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {boolean} remember - Whether to remember user
 */
function authenticateUser(email, password, remember) {
    // For demo purposes only - in a real application, this would be a server call
    const validEmail = 'admin@juniorcurrent.com';
    const validPassword = 'demo123';
    
    // Simulate network delay
    setTimeout(() => {
        if (email === validEmail && password === validPassword) {
            // Store authentication state
            if (remember) {
                localStorage.setItem('isAuthenticated', 'true');
            } else {
                sessionStorage.setItem('isAuthenticated', 'true');
            }
            
            // Redirect to admin page
            window.location.href = 'admin.html';
        } else {
            // Show error message
            showError('Invalid email or password. Please try again.');
            
            // Reset login button
            const loginButton = document.getElementById('login-button');
            if (loginButton) {
                loginButton.disabled = false;
                loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
            }
        }
    }, 1000);
}

/**
 * Check if user is authenticated
 */
function checkAuthentication() {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true' || 
                           sessionStorage.getItem('isAuthenticated') === 'true';
    
    // Redirect to login if not authenticated and trying to access admin page
    if (!isAuthenticated && window.location.pathname.includes('admin.html')) {
        window.location.href = 'login.html';
    }
}

/**
 * Logout user
 */
function logout() {
    localStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('isAuthenticated');
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    const errorContainer = document.getElementById('error-container');
    if (!errorContainer) return;
    
    // Create error element
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    // Clear any existing errors
    errorContainer.innerHTML = '';
    
    // Add error to container
    errorContainer.appendChild(errorElement);
    
    // Remove error after 5 seconds
    setTimeout(() => {
        errorElement.remove();
    }, 5000);
}