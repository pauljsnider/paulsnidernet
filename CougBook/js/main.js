document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            mobileMenuToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
            
            // Toggle hamburger to X
            const bars = mobileMenuToggle.querySelectorAll('.bar');
            if (bars.length === 3) {
                bars[0].classList.toggle('animate-bar-1');
                bars[1].classList.toggle('animate-bar-2');
                bars[2].classList.toggle('animate-bar-3');
            }
        });
    }
    
    // Form toggle for registration
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    const formSections = document.querySelectorAll('.form-section');
    
    if (toggleBtns.length > 0 && formSections.length > 0) {
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const target = this.getAttribute('data-target');
                
                // Update active button
                toggleBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Show target section
                formSections.forEach(section => {
                    section.classList.remove('active');
                    if (section.id === target) {
                        section.classList.add('active');
                    }
                });
            });
        });
    }
    
    // Check URL parameters for registration type
    const urlParams = new URLSearchParams(window.location.search);
    const userType = urlParams.get('type');
    
    if (userType && document.querySelector(`[data-target="register-${userType}"]`)) {
        document.querySelector(`[data-target="register-${userType}"]`).click();
    }
    
    // Search filters
    const filterForm = document.getElementById('filter-form');
    const resetBtn = document.getElementById('reset-filters');
    
    if (filterForm && resetBtn) {
        resetBtn.addEventListener('click', function(e) {
            e.preventDefault();
            filterForm.reset();
        });
    }
    
    // Listing gallery
    const mainImage = document.querySelector('.main-image img');
    const thumbnails = document.querySelectorAll('.thumbnail img');
    
    if (mainImage && thumbnails.length > 0) {
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', function() {
                mainImage.src = this.src;
            });
        });
    }
    
    // Dashboard tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    if (tabBtns.length > 0 && tabContents.length > 0) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const target = this.getAttribute('data-tab');
                
                // Update active button
                tabBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Show target content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === target) {
                        content.classList.add('active');
                    }
                });
            });
        });
    }
    
    // Form validation
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('error');
                    
                    // Add error message if not exists
                    let errorMsg = field.parentElement.querySelector('.error-message');
                    if (!errorMsg) {
                        errorMsg = document.createElement('span');
                        errorMsg.className = 'error-message';
                        errorMsg.textContent = 'This field is required';
                        field.parentElement.appendChild(errorMsg);
                    }
                } else {
                    field.classList.remove('error');
                    const errorMsg = field.parentElement.querySelector('.error-message');
                    if (errorMsg) {
                        errorMsg.remove();
                    }
                }
            });
            
            if (!isValid) {
                e.preventDefault();
            }
        });
    });
    
    // Initialize page-specific functionality
    initPageSpecificFunctions();
});

function initPageSpecificFunctions() {
    const currentPage = window.location.pathname;
    
    // Search page functionality
    if (currentPage.includes('search.html')) {
        initSearchPage();
    }
    
    // Listing details page
    if (currentPage.includes('listing-details.html')) {
        initListingDetailsPage();
    }
    
    // Dashboard page
    if (currentPage.includes('dashboard.html')) {
        initDashboardPage();
    }
}

function initSearchPage() {
    const priceRange = document.getElementById('price-range');
    const priceValue = document.getElementById('price-value');
    
    if (priceRange && priceValue) {
        priceRange.addEventListener('input', function() {
            priceValue.textContent = `$${this.value}`;
        });
    }
    
    // Simulated search functionality
    const filterForm = document.getElementById('filter-form');
    const listingsContainer = document.querySelector('.listings-grid');
    
    if (filterForm && listingsContainer) {
        filterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // In a real application, this would send an AJAX request to the server
            // For demo purposes, we'll just show a loading state
            listingsContainer.innerHTML = '<div class="loading">Searching for matches...</div>';
            
            // Simulate loading delay
            setTimeout(() => {
                // Restore listings (in a real app, this would be the response data)
                renderListings();
            }, 1000);
        });
    }
}

function initListingDetailsPage() {
    // Message form handling
    const messageForm = document.getElementById('message-form');
    const messageBtn = document.getElementById('send-message-btn');
    
    if (messageForm && messageBtn) {
        messageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show sending state
            messageBtn.textContent = 'Sending...';
            messageBtn.disabled = true;
            
            // Simulate sending delay
            setTimeout(() => {
                // Show success message
                messageForm.innerHTML = '<div class="success-message">Your message has been sent! The provider will contact you soon.</div>';
            }, 1000);
        });
    }
}

function initDashboardPage() {
    // Handle listing actions (delete, edit)
    const actionBtns = document.querySelectorAll('.listing-action');
    
    if (actionBtns.length > 0) {
        actionBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const action = this.getAttribute('data-action');
                const listingId = this.getAttribute('data-id');
                
                if (action === 'delete') {
                    if (confirm('Are you sure you want to delete this listing?')) {
                        // In a real app, this would send a request to delete the listing
                        this.closest('.listing-card').remove();
                    }
                } else if (action === 'edit') {
                    // Redirect to edit page
                    window.location.href = `edit-listing.html?id=${listingId}`;
                }
            });
        });
    }
}

// Helper function to render listings (for demo purposes)
function renderListings() {
    // In a real application, this data would come from the server
    const listings = [
        {
            id: 1,
            title: 'Cozy Room Near Campus',
            price: 550,
            location: '0.5 miles from University',
            image: 'images/house1.jpeg'
        },
        {
            id: 2,
            title: 'Private Room with Bathroom',
            price: 650,
            location: '1.2 miles from University',
            image: 'images/house2.jpg'
        },
        {
            id: 3,
            title: 'Spacious Room in Quiet Neighborhood',
            price: 600,
            location: '1.5 miles from University',
            image: 'images/house3.jpg'
        }
    ];
    
    const listingsContainer = document.querySelector('.listings-grid');
    if (!listingsContainer) return;
    
    listingsContainer.innerHTML = '';
    
    listings.forEach(listing => {
        const listingCard = document.createElement('div');
        listingCard.className = 'listing-card';
        
        listingCard.innerHTML = `
            <div class="listing-image">
                <img src="${listing.image}" alt="${listing.title}">
            </div>
            <div class="listing-content">
                <h3>${listing.title}</h3>
                <p class="price">$${listing.price}/month</p>
                <p class="location">${listing.location}</p>
                <a href="listing-details.html?id=${listing.id}" class="btn btn-outline">View Details</a>
            </div>
        `;
        
        listingsContainer.appendChild(listingCard);
    });
}