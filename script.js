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

    // Blog image lightbox
    initializeImageLightbox();

    // Library functionality
    initializeLibrary();
});

// Blog functionality
function initializeBlog() {
    const searchInput = document.getElementById('blog-search');
    const categoryFilter = document.getElementById('category-filter');
    const blogContainer = document.getElementById('blog-posts');

    if (blogContainer && !blogContainer.querySelector('[data-title="Access Is Becoming the New Capability Multiplier"]')) {
        const post = document.createElement('article');
        post.className = 'blog-post';
        post.setAttribute('data-category', 'technology');
        post.setAttribute('data-title', 'Access Is Becoming the New Capability Multiplier');
        post.setAttribute('data-publish-date', '2026-09-05');
        post.innerHTML = `
            <a href="blogs/blog-post-access-capability-multiplier.html" class="post-image">
              <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=250&fit=crop" alt="Access Is Becoming the New Capability Multiplier" style="object-position: center;">
            </a>
            <div class="post-content">
              <div class="post-meta">
                <span class="post-category">Technology</span>
                <span class="post-date">September 5, 2026</span>
              </div>
              <h3 class="post-title">Access Is Becoming the New Capability Multiplier</h3>
              <p class="post-excerpt">Why agent capability increasingly comes from the combination of intelligence and access, what Collusion Wiki may be signaling, and why security has to scale with autonomy.</p>
              <div class="post-footer">
                <a href="blogs/blog-post-access-capability-multiplier.html" class="read-more">Read More <i class="fas fa-arrow-right"></i></a>
                <div class="post-stats">
                  <span><i class="fas fa-clock"></i> 4 min read</span>
                </div>
              </div>
            </div>
        `;
        blogContainer.prepend(post);
    }

    const blogPosts = document.querySelectorAll('.blog-post');
    const loadMoreBtn = document.getElementById('load-more');
    
    if (!searchInput || !categoryFilter || !blogPosts.length) return;
    
    const todayKey = getLocalDateKey();
    const postElements = Array.from(blogPosts);

    postElements.forEach(post => {
        const publishDate = post.getAttribute('data-publish-date');
        const isFuturePost = publishDate && publishDate > todayKey;

        if (isFuturePost) {
            post.dataset.scheduledHidden = 'true';
            post.classList.add('hidden');
            post.style.display = 'none';
        } else if (publishDate) {
            post.style.display = '';
        }
    });

    let allPosts = postElements.filter(post => post.dataset.scheduledHidden !== 'true');
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

    function getLocalDateKey(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
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

// Library functionality
function initializeLibrary() {
    const libraryMain = document.getElementById('library-main');
    if (!libraryMain) return;

    const container = libraryMain.querySelector('.container');
    const intro = container?.querySelector('.library-intro');
    if (!container || !intro) return;

    const categories = Array.from(container.querySelectorAll('.book-category'));
    if (categories.length === 0) return;

    const controls = document.createElement('div');
    controls.className = 'library-controls';
    controls.innerHTML = `
        <div class="library-controls-row">
            <label class="library-search">
                <span class="library-search-icon" aria-hidden="true">⌕</span>
                <input id="library-search" type="search" placeholder="Search titles and authors…" autocomplete="off" />
            </label>
            <button id="library-clear" type="button" class="library-btn library-btn-secondary">Clear</button>
            <button id="library-collapse-all" type="button" class="library-btn">Collapse all</button>
            <button id="library-expand-all" type="button" class="library-btn library-btn-secondary">Expand all</button>
        </div>
        <div id="library-count" class="library-meta" aria-live="polite"></div>
    `;
    intro.insertAdjacentElement('afterend', controls);

    const searchInput = controls.querySelector('#library-search');
    const clearButton = controls.querySelector('#library-clear');
    const collapseAllButton = controls.querySelector('#library-collapse-all');
    const expandAllButton = controls.querySelector('#library-expand-all');
    const countEl = controls.querySelector('#library-count');

    const SHOW_LIMIT = 18;

    function getCategoryKey(category) {
        return category.id ? `library.category.${category.id}` : null;
    }

    function setCollapsed(category, collapsed) {
        category.classList.toggle('is-collapsed', collapsed);

        const titleEl = category.querySelector('.category-title');
        if (titleEl) {
            titleEl.setAttribute('aria-expanded', String(!collapsed));
        }

        const key = getCategoryKey(category);
        if (key) {
            try {
                localStorage.setItem(key, collapsed ? '1' : '0');
            } catch {
                // ignore storage failures
            }
        }
    }

    function ensureCategoryHeader(category) {
        const titleEl = category.querySelector('.category-title');
        if (!titleEl) return null;

        if (!titleEl.querySelector('.category-right')) {
            const left = document.createElement('span');
            left.className = 'category-left';
            while (titleEl.firstChild) {
                left.appendChild(titleEl.firstChild);
            }

            const right = document.createElement('span');
            right.className = 'category-right';

            const meta = document.createElement('span');
            meta.className = 'category-meta';

            const chevron = document.createElement('span');
            chevron.className = 'category-chevron';
            chevron.setAttribute('aria-hidden', 'true');
            chevron.textContent = '▾';

            right.append(meta, chevron);
            titleEl.append(left, right);
        }

        titleEl.setAttribute('role', 'button');
        titleEl.setAttribute('tabindex', '0');

        const isCollapsed = category.classList.contains('is-collapsed');
        titleEl.setAttribute('aria-expanded', String(!isCollapsed));

        titleEl.addEventListener('click', () => {
            setCollapsed(category, !category.classList.contains('is-collapsed'));
        });

        titleEl.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            setCollapsed(category, !category.classList.contains('is-collapsed'));
        });

        return titleEl;
    }

    function getCategoryItems(category) {
        return Array.from(category.querySelectorAll('.book-list .book-item'));
    }

    function ensureShowMore(category) {
        const list = category.querySelector('.book-list');
        if (!list) return null;

        let actions = category.querySelector('.category-actions');
        if (!actions) {
            actions = document.createElement('div');
            actions.className = 'category-actions';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'library-btn library-btn-secondary category-show-more';
            btn.textContent = 'Show more';
            btn.addEventListener('click', () => {
                const showingAll = category.dataset.showAll === '1';
                category.dataset.showAll = showingAll ? '0' : '1';
                render();
            });

            actions.appendChild(btn);
            list.insertAdjacentElement('afterend', actions);
        }

        return actions;
    }

    function applyVisibility(category, query) {
        const items = getCategoryItems(category);
        const normalized = query.trim().toLowerCase();

        let visibleCount = 0;
        items.forEach((item, idx) => {
            const title = item.querySelector('.book-title')?.textContent || '';
            const author = item.querySelector('.book-author')?.textContent || '';
            const haystack = `${title} ${author}`.toLowerCase();
            const matches = !normalized || haystack.includes(normalized);

            item.classList.toggle('is-filtered-out', !matches);

            if (matches) {
                visibleCount += 1;
            }

            const shouldLimit = !normalized && category.dataset.showAll !== '1';
            const isHiddenByLimit = shouldLimit && idx >= SHOW_LIMIT;
            item.classList.toggle('is-hidden', matches && isHiddenByLimit);
        });

        const titleEl = category.querySelector('.category-title');
        const metaEl = titleEl?.querySelector('.category-right .category-meta');
        if (metaEl) {
            metaEl.textContent = normalized ? `${visibleCount}/${items.length}` : `${items.length}`;
        }

        const actions = ensureShowMore(category);
        if (actions) {
            const btn = actions.querySelector('.category-show-more');
            const shouldShowButton = items.length > SHOW_LIMIT && !normalized;
            actions.style.display = shouldShowButton ? '' : 'none';
            if (btn) {
                btn.textContent = category.dataset.showAll === '1' ? 'Show less' : 'Show more';
            }
        }

        return { total: items.length, visible: visibleCount, shown: items.filter((i) => !i.classList.contains('is-filtered-out') && !i.classList.contains('is-hidden')).length };
    }

    function render() {
        const query = searchInput?.value || '';

        let total = 0;
        let visible = 0;
        let shown = 0;

        categories.forEach((category) => {
            ensureCategoryHeader(category);
            const result = applyVisibility(category, query);
            total += result.total;
            visible += result.visible;
            shown += result.shown;
        });

        if (!countEl) return;
        if (query.trim()) {
            countEl.textContent = `Showing ${shown} of ${total}`;
        } else {
            countEl.textContent = `Total items: ${total} (showing ${shown})`;
        }
    }

    // Restore collapsed state
    categories.forEach((category) => {
        const key = getCategoryKey(category);
        if (!key) return;
        try {
            const value = localStorage.getItem(key);
            if (value === '1') {
                category.classList.add('is-collapsed');
            }
        } catch {
            // ignore storage failures
        }
    });

    if (searchInput) {
        searchInput.addEventListener('input', render);
    }

    if (clearButton) {
        clearButton.addEventListener('click', () => {
            if (!searchInput) return;
            searchInput.value = '';
            searchInput.focus();
            render();
        });
    }

    if (collapseAllButton) {
        collapseAllButton.addEventListener('click', () => {
            categories.forEach((c) => setCollapsed(c, true));
        });
    }

    if (expandAllButton) {
        expandAllButton.addEventListener('click', () => {
            categories.forEach((c) => setCollapsed(c, false));
        });
    }

    render();
}

function initializeImageLightbox() {
    const images = document.querySelectorAll('.post-content img, .post-featured-image img');
    if (!images.length) return;

    const lightbox = document.createElement('div');
    lightbox.className = 'image-lightbox';
    lightbox.innerHTML = '<img alt="">';
    document.body.appendChild(lightbox);

    const lightboxImage = lightbox.querySelector('img');

    function openLightbox(src, alt) {
        lightboxImage.src = src;
        lightboxImage.alt = alt || '';
        lightbox.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('is-open');
        document.body.style.overflow = '';
        lightboxImage.src = '';
        lightboxImage.alt = '';
    }

    images.forEach((img) => {
        img.classList.add('click-to-zoom');
        img.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openLightbox(img.src, img.alt);
        });
    });

    lightbox.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && lightbox.classList.contains('is-open')) {
            closeLightbox();
        }
    });
}