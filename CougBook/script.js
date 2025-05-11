// Basic JavaScript for future interactivity

document.addEventListener('DOMContentLoaded', function() {
    console.log('CougBook Script Loaded');

    // Login/Register Form Toggle
    const loginFormSection = document.getElementById('login-form-section');
    const registerFormSection = document.getElementById('register-form-section');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');

    if (showRegisterLink && loginFormSection && registerFormSection) {
        showRegisterLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginFormSection.style.display = 'none';
            registerFormSection.style.display = 'block';
        });
    }

    if (showLoginLink && loginFormSection && registerFormSection) {
        showLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            registerFormSection.style.display = 'none';
            loginFormSection.style.display = 'block';
        });
    }

    // Conditional Fields for Registration Form
    const userTypeStudentRadio = document.getElementById('userTypeStudent');
    const userTypeProviderRadio = document.getElementById('userTypeProvider');
    const studentFieldsDiv = document.getElementById('studentFields');
    const providerFieldsDiv = document.getElementById('providerFields');

    function toggleRegistrationFields() {
        if (userTypeStudentRadio && userTypeProviderRadio && studentFieldsDiv && providerFieldsDiv) {
            if (userTypeStudentRadio.checked) {
                studentFieldsDiv.style.display = 'block';
                providerFieldsDiv.style.display = 'none';
            } else if (userTypeProviderRadio.checked) {
                studentFieldsDiv.style.display = 'none';
                providerFieldsDiv.style.display = 'block';
            }
        }
    }

    // Initial check in case a radio is pre-selected (e.g., student is checked by default)
    toggleRegistrationFields(); 

    if (userTypeStudentRadio) {
        userTypeStudentRadio.addEventListener('change', toggleRegistrationFields);
    }
    if (userTypeProviderRadio) {
        userTypeProviderRadio.addEventListener('change', toggleRegistrationFields);
    }

    // Check if on login page and handle initial display based on URL params (e.g., from homepage buttons)
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');

    if (window.location.pathname.endsWith('login.html')) {
        if (typeParam === 'student' || typeParam === 'provider') {
            if (loginFormSection && registerFormSection) {
                loginFormSection.style.display = 'none';
                registerFormSection.style.display = 'block';
                if (typeParam === 'provider' && userTypeProviderRadio) {
                    userTypeProviderRadio.checked = true;
                } else if (userTypeStudentRadio) {
                    userTypeStudentRadio.checked = true; // Default to student if type is 'student' or param is missing but on register form
                }
                toggleRegistrationFields(); // Update fields based on (potentially new) radio state
            }
        } else {
            // Default to showing login form if no type param or not relevant
            if (loginFormSection) loginFormSection.style.display = 'block';
            if (registerFormSection) registerFormSection.style.display = 'none';
        }
    }

    // Listing Details Page - Image Gallery
    const mainImage = document.getElementById('mainGalleryImage');
    const thumbnails = document.querySelectorAll('.gallery-thumbnail');

    // Store the function globally or ensure it's in scope for onclick attributes
    window.changeMainImage = function(newSrc) {
        if (mainImage) {
            mainImage.src = newSrc;
            // Update active state for thumbnails
            thumbnails.forEach(thumb => {
                if (thumb.src.includes(newSrc)) { // A bit simplistic, might need refinement if paths are complex
                    thumb.classList.add('active-thumb');
                } else {
                    thumb.classList.remove('active-thumb');
                }
            });
        }
    }

    // Add event listeners to thumbnails if not using inline onclick, or to enhance them
    // This is an alternative/enhancement to inline onclicks and is generally preferred for cleaner HTML
    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            if (mainImage) {
                const newSrc = this.src; // Or a data-large-src attribute
                mainImage.src = newSrc;
                thumbnails.forEach(t => t.classList.remove('active-thumb'));
                this.classList.add('active-thumb');
            }
        });
    });

    // Ensure the first thumbnail is marked active if JS is enhancing (and inline onclick is removed or supplemented)
    // This part depends on how you decide to handle the event binding ultimately.
    // If keeping inline onclick, this part is less critical as the initial class is set in HTML.
    if (thumbnails.length > 0 && mainImage && !document.querySelector('.gallery-thumbnail.active-thumb')) {
        // If no thumb is active and we are using JS for clicks, make the first one active.
        // This scenario is more for when onclick attributes are removed from HTML.
        // For now, with onclicks in HTML, the initial active thumb is set there.
    }

    // Example: Mobile navigation toggle (if you add a burger menu later)
    // const navToggle = document.querySelector('.nav-toggle');
    // const navMenu = document.querySelector('header nav ul');

    // if (navToggle && navMenu) {
    //     navToggle.addEventListener('click', () => {
    //         navMenu.classList.toggle('active');
    //     });
    // }
});
