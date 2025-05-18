/**
 * Junior Current Website
 * Navigation Behavior
 */

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            navLinks.classList.toggle('active');
            
            // Animate hamburger icon
            const hamburger = this.querySelector('.hamburger');
            if (hamburger) {
                hamburger.classList.toggle('active');
            }
            
            // Prevent body scrolling when menu is open
            document.body.classList.toggle('menu-open');
        });
    }
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        if (navLinks && navLinks.classList.contains('active')) {
            if (!event.target.closest('.main-nav')) {
                navLinks.classList.remove('active');
                if (mobileMenuToggle) {
                    mobileMenuToggle.classList.remove('active');
                    
                    // Reset hamburger icon
                    const hamburger = mobileMenuToggle.querySelector('.hamburger');
                    if (hamburger) {
                        hamburger.classList.remove('active');
                    }
                }
                
                // Re-enable body scrolling
                document.body.classList.remove('menu-open');
            }
        }
    });
    
    // Handle keyboard navigation
    document.addEventListener('keydown', function(event) {
        // Close mobile menu on Escape key
        if (event.key === 'Escape' && navLinks && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
            if (mobileMenuToggle) {
                mobileMenuToggle.classList.remove('active');
                
                // Reset hamburger icon
                const hamburger = mobileMenuToggle.querySelector('.hamburger');
                if (hamburger) {
                    hamburger.classList.remove('active');
                }
            }
            
            // Re-enable body scrolling
            document.body.classList.remove('menu-open');
        }
    });
    
    // Add active class to current page link
    const currentPage = window.location.pathname.split('/').pop();
    const navLinkItems = document.querySelectorAll('.nav-links a');
    
    navLinkItems.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref === currentPage || (currentPage === '' && linkHref === 'index.html')) {
            link.classList.add('active');
        }
    });
    
    // Add smooth scroll behavior for navigation links
    navLinkItems.forEach(link => {
        link.addEventListener('click', function() {
            // Close mobile menu when a link is clicked
            if (navLinks && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                if (mobileMenuToggle) {
                    mobileMenuToggle.classList.remove('active');
                    
                    // Reset hamburger icon
                    const hamburger = mobileMenuToggle.querySelector('.hamburger');
                    if (hamburger) {
                        hamburger.classList.remove('active');
                    }
                }
                
                // Re-enable body scrolling
                document.body.classList.remove('menu-open');
            }
        });
    });
});