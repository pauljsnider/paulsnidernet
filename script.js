// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Navigation menu toggle for mobile
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }
    
    // Close mobile menu when clicking a nav link
    const navItems = document.querySelectorAll('.nav-links a');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
    
    // Header scroll effect
    const header = document.querySelector('header');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
    
    // Active navigation link based on scroll position
    const sections = document.querySelectorAll('section');
    window.addEventListener('scroll', function() {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (window.scrollY >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        });
        
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href').substring(1) === current) {
                item.classList.add('active');
            }
        });
    });
    
    // Expand/collapse timeline items
    const expandButtons = document.querySelectorAll('.expand-btn');
    expandButtons.forEach(button => {
        button.addEventListener('click', function() {
            const hiddenContent = this.nextElementSibling;
            
            if (hiddenContent.style.display === 'block') {
                hiddenContent.style.display = 'none';
                this.textContent = 'Show Details';
            } else {
                hiddenContent.style.display = 'block';
                this.textContent = 'Hide Details';
            }
        });
    });
    
    // Form submission handling
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value;
            
            // Here you would typically send the form data to a server
            // For now, we'll just show a success message
            
            // Create success message
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.style.backgroundColor = 'var(--success-color)';
            successMessage.style.color = 'white';
            successMessage.style.padding = '15px';
            successMessage.style.borderRadius = '5px';
            successMessage.style.marginTop = '20px';
            successMessage.textContent = 'Thank you for your message! I will get back to you soon.';
            
            // Clear form
            contactForm.reset();
            
            // Add success message to the form
            contactForm.appendChild(successMessage);
            
            // Remove success message after 5 seconds
            setTimeout(() => {
                successMessage.remove();
            }, 5000);
        });
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Animation on scroll (simple reveal effect)
    const revealElements = document.querySelectorAll('.timeline-item, .education-item, .skill-category');
    
    function checkReveal() {
        const triggerBottom = window.innerHeight * 0.8;
        
        revealElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            
            if (elementTop < triggerBottom) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    }
    
    // Set initial styles for animation
    revealElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });
    
    // Check on load and scroll
    window.addEventListener('load', checkReveal);
    window.addEventListener('scroll', checkReveal);
    
    // Blog functionality
    initializeBlog();
});

// Blog functionality
function initializeBlog() {
    const searchInput = document.getElementById('blog-search');
    const categoryFilter = document.getElementById('category-filter');
    const blogPosts = document.querySelectorAll('.blog-post');
    const loadMoreBtn = document.getElementById('load-more');
    
    if (!searchInput || !categoryFilter || !blogPosts.length) return;
    
    let allPosts = Array.from(blogPosts);
    let visiblePosts = allPosts.slice(0, 6); // Show first 6 posts initially
    let currentFilter = '';
    let currentSearch = '';
    
    // Initialize display
    updatePostDisplay();
    
    // Search functionality
    searchInput.addEventListener('input', function() {
        currentSearch = this.value.toLowerCase().trim();
        filterPosts();
    });
    
    // Category filter functionality
    categoryFilter.addEventListener('change', function() {
        currentFilter = this.value;
        filterPosts();
    });
    
    // Load more functionality
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            const hiddenPosts = allPosts.filter(post => post.classList.contains('hidden'));
            const postsToShow = hiddenPosts.slice(0, 3);
            
            postsToShow.forEach(post => {
                post.classList.remove('hidden');
            });
            
            // Hide load more button if no more posts
            const remainingHidden = allPosts.filter(post => post.classList.contains('hidden'));
            if (remainingHidden.length === 0) {
                loadMoreBtn.style.display = 'none';
            }
        });
    }
    
    function filterPosts() {
        allPosts.forEach(post => {
            const category = post.getAttribute('data-category');
            const title = post.getAttribute('data-title').toLowerCase();
            const content = post.querySelector('.post-excerpt').textContent.toLowerCase();
            
            const matchesCategory = !currentFilter || category === currentFilter;
            const matchesSearch = !currentSearch || 
                title.includes(currentSearch) || 
                content.includes(currentSearch);
            
            if (matchesCategory && matchesSearch) {
                post.classList.remove('hidden');
            } else {
                post.classList.add('hidden');
            }
        });
        
        // Show/hide no results message
        const visibleCount = allPosts.filter(post => !post.classList.contains('hidden')).length;
        showNoResults(visibleCount === 0);
        
        // Reset load more button visibility
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'block';
        }
    }
    
    function updatePostDisplay() {
        allPosts.forEach((post, index) => {
            if (index < 6) {
                post.classList.remove('hidden');
            } else {
                post.classList.add('hidden');
            }
        });
    }
    
    function showNoResults(show) {
        let noResultsMsg = document.querySelector('.no-results');
        
        if (show && !noResultsMsg) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.className = 'no-results';
            noResultsMsg.innerHTML = `
                <i class="fas fa-search"></i>
                <h3>No posts found</h3>
                <p>Try adjusting your search terms or category filter.</p>
            `;
            document.getElementById('blog-posts').appendChild(noResultsMsg);
        } else if (!show && noResultsMsg) {
            noResultsMsg.remove();
        }
    }
    
    // Add smooth reveal animation to blog posts
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Apply animation styles and observe posts
    allPosts.forEach((post, index) => {
        post.style.opacity = '0';
        post.style.transform = 'translateY(20px)';
        post.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(post);
    });
}