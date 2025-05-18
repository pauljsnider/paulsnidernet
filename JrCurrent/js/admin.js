/**
 * Junior Current Website
 * Admin Panel Functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if on admin page
    if (!window.location.pathname.includes('admin.html')) {
        return;
    }
    
    // Initialize tab functionality
    initTabs();
    
    // Initialize photo upload
    initPhotoUpload();
    
    // Initialize schedule management
    initScheduleManagement();
    
    // Initialize messaging
    initMessaging();
});

/**
 * Initialize tab functionality with accessibility
 */
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });
            
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            
            // Add active class to clicked button
            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');
            
            // Show corresponding content
            const tabId = this.getAttribute('data-tab');
            const tabContent = document.getElementById(`${tabId}-content`);
            if (tabContent) {
                tabContent.classList.add('active');
            }
        });
        
        // Keyboard navigation for tabs
        button.addEventListener('keydown', function(e) {
            // Handle arrow keys for tab navigation
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                
                const tabs = Array.from(tabButtons);
                const currentIndex = tabs.indexOf(this);
                let newIndex;
                
                if (e.key === 'ArrowRight') {
                    newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
                } else {
                    newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
                }
                
                tabs[newIndex].focus();
                tabs[newIndex].click();
            }
        });
    });
}

/**
 * Initialize photo upload functionality
 */
function initPhotoUpload() {
    const photoUpload = document.getElementById('photo-upload');
    const photoPreview = document.getElementById('photo-preview');
    const noPreviewText = document.querySelector('.no-preview-text');
    const uploadForm = document.querySelector('.upload-form');
    const resetButton = document.getElementById('reset-photo-form');
    const recentPhotos = document.getElementById('recent-photos');
    
    // Sample photos data
    let photos = [];
    
    // Handle file selection for preview
    if (photoUpload && photoPreview) {
        photoUpload.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                // Validate file type and size
                const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
                const maxSize = 5 * 1024 * 1024; // 5MB
                
                if (!validTypes.includes(file.type)) {
                    alert('Please select a valid image file (JPG, PNG, or WEBP).');
                    this.value = '';
                    return;
                }
                
                if (file.size > maxSize) {
                    alert('File size exceeds 5MB limit. Please select a smaller image.');
                    this.value = '';
                    return;
                }
                
                // Show preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    photoPreview.src = e.target.result;
                    photoPreview.style.display = 'block';
                    if (noPreviewText) noPreviewText.style.display = 'none';
                };
                reader.readAsDataURL(file);
            } else {
                // Reset preview
                photoPreview.style.display = 'none';
                if (noPreviewText) noPreviewText.style.display = 'block';
            }
        });
    }
    
    // Handle form reset
    if (resetButton && uploadForm) {
        resetButton.addEventListener('click', function() {
            uploadForm.reset();
            if (photoPreview) {
                photoPreview.style.display = 'none';
            }
            if (noPreviewText) {
                noPreviewText.style.display = 'block';
            }
        });
    }
    
    // Handle form submission
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const category = document.getElementById('photo-category').value;
            const title = document.getElementById('photo-title').value;
            const description = document.getElementById('photo-description').value;
            const file = document.getElementById('photo-upload').files[0];
            
            if (!category || !title || !file) {
                alert('Please fill in all required fields and select an image.');
                return;
            }
            
            // Create new photo object
            const newPhoto = {
                id: Date.now(),
                category,
                title,
                description,
                url: photoPreview.src,
                date: new Date().toISOString()
            };
            
            // Add to photos array
            photos.push(newPhoto);
            
            // Update recent uploads
            updateRecentPhotos(photos, recentPhotos);
            
            // Reset form
            this.reset();
            photoPreview.style.display = 'none';
            if (noPreviewText) noPreviewText.style.display = 'block';
            
            // Show success message
            alert('Photo uploaded successfully!');
        });
    }
}

/**
 * Update recent photos display
 * @param {Array} photos - Array of photo objects
 * @param {HTMLElement} container - Container element for the photos
 */
function updateRecentPhotos(photos, container) {
    if (!container) return;
    
    // Clear no items message if present
    const noItemsMessage = container.querySelector('.no-items-message');
    if (noItemsMessage) {
        noItemsMessage.remove();
    }
    
    // Get recent photos (up to 6)
    const recentPhotos = photos.slice(-6).reverse();
    
    // Clear container
    container.innerHTML = '';
    
    if (recentPhotos.length === 0) {
        const message = document.createElement('p');
        message.className = 'no-items-message';
        message.textContent = 'No recent uploads to display';
        container.appendChild(message);
        return;
    }
    
    // Add photo items
    recentPhotos.forEach(photo => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        
        photoItem.innerHTML = `
            <div class="photo-thumbnail">
                <img src="${photo.url}" alt="${photo.title}">
            </div>
            <div class="photo-info">
                <h4>${photo.title}</h4>
                <p>${new Date(photo.date).toLocaleDateString()}</p>
            </div>
            <div class="photo-actions">
                <button class="action-btn" aria-label="View photo">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn delete-btn" aria-label="Delete photo">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Add delete functionality
        const deleteButton = photoItem.querySelector('.delete-btn');
        if (deleteButton) {
            deleteButton.addEventListener('click', function() {
                if (confirm('Are you sure you want to delete this photo?')) {
                    // Remove photo from data
                    const index = photos.findIndex(p => p.id === photo.id);
                    if (index !== -1) {
                        photos.splice(index, 1);
                    }
                    
                    // Update display
                    updateRecentPhotos(photos, container);
                }
            });
        }
        
        container.appendChild(photoItem);
    });
}

/**
 * Initialize schedule management functionality
 */
function initScheduleManagement() {
    const scheduleForm = document.querySelector('.schedule-form');
    const scheduleListBody = document.getElementById('schedule-list-body');
    const resetButton = document.getElementById('reset-schedule-form');
    
    // Sample schedule data
    let scheduleData = [
        {
            id: 1,
            date: '2025-03-09',
            opponent: 'Dolphins',
            time: '14:00',
            location: 'Olathe 6N',
            result: 'Win',
            score: '5-1',
            isExhibition: false
        },
        {
            id: 2,
            date: '2025-03-16',
            opponent: 'Thunder Cats',
            time: '10:00',
            location: 'Olathe 6S',
            result: 'Win',
            score: '2-1',
            isExhibition: false
        },
        {
            id: 3,
            date: '2025-03-23',
            opponent: 'Lightning Bolts',
            time: '15:00',
            location: 'Blue Valley Rec',
            result: 'Tie',
            score: '2-2',
            isExhibition: false
        },
        {
            id: 4,
            date: '2025-05-25',
            opponent: 'Summer Cup Qualifier',
            time: '10:00',
            location: 'Overland Park Complex',
            result: null,
            score: null,
            isExhibition: false
        }
    ];
    
    // Render initial schedule list
    if (scheduleListBody) {
        renderScheduleList(scheduleData, scheduleListBody);
    }
    
    // Handle form reset
    if (resetButton && scheduleForm) {
        resetButton.addEventListener('click', function() {
            scheduleForm.reset();
            
            // Reset any custom state
            const addGameBtn = document.getElementById('add-game-btn');
            if (addGameBtn) {
                addGameBtn.innerHTML = '<i class="fas fa-plus"></i> Add Game';
                addGameBtn.dataset.mode = 'add';
                addGameBtn.dataset.editId = '';
            }
        });
    }
    
    // Handle form submission
    if (scheduleForm) {
        scheduleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const date = document.getElementById('game-date').value;
            const opponent = document.getElementById('game-opponent').value;
            const time = document.getElementById('game-time').value;
            const location = document.getElementById('game-location').value;
            const result = document.getElementById('game-result').value;
            const score = document.getElementById('game-score').value;
            const isExhibition = document.getElementById('game-exhibition').checked;
            
            // Validate required fields
            if (!date || !opponent || !time || !location) {
                alert('Please fill in all required fields.');
                return;
            }
            
            // Check if we're adding or editing
            const addGameBtn = document.getElementById('add-game-btn');
            const isEditing = addGameBtn && addGameBtn.dataset.mode === 'edit';
            const editId = isEditing ? parseInt(addGameBtn.dataset.editId) : null;
            
            if (isEditing) {
                // Update existing game
                const gameIndex = scheduleData.findIndex(game => game.id === editId);
                if (gameIndex !== -1) {
                    scheduleData[gameIndex] = {
                        ...scheduleData[gameIndex],
                        date,
                        opponent,
                        time,
                        location,
                        result: result || null,
                        score: score || null,
                        isExhibition
                    };
                }
                
                // Reset button state
                if (addGameBtn) {
                    addGameBtn.innerHTML = '<i class="fas fa-plus"></i> Add Game';
                    addGameBtn.dataset.mode = 'add';
                    addGameBtn.dataset.editId = '';
                }
            } else {
                // Create new game object
                const newGame = {
                    id: Date.now(), // Use timestamp as unique ID
                    date,
                    opponent,
                    time,
                    location,
                    result: result || null,
                    score: score || null,
                    isExhibition
                };
                
                // Add to schedule data
                scheduleData.push(newGame);
            }
            
            // Re-render schedule list
            renderScheduleList(scheduleData, scheduleListBody);
            
            // Reset form
            this.reset();
        });
    }
}

/**
 * Render schedule list in admin panel
 * @param {Array} scheduleData - Array of game objects
 * @param {HTMLElement} container - Container element for the schedule list
 */
function renderScheduleList(scheduleData, container) {
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    if (scheduleData.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 6;
        emptyCell.textContent = 'No games scheduled';
        emptyCell.className = 'empty-table-message';
        emptyRow.appendChild(emptyCell);
        container.appendChild(emptyRow);
        return;
    }
    
    // Sort games by date
    const sortedGames = [...scheduleData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Add game rows
    sortedGames.forEach(game => {
        const row = document.createElement('tr');
        
        // Format date for display
        const gameDate = new Date(game.date);
        const formattedDate = gameDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
        
        // Format time for display
        const [hours, minutes] = game.time.split(':');
        const formattedTime = new Date(0, 0, 0, hours, minutes).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });
        
        // Date cell
        const dateCell = document.createElement('td');
        dateCell.textContent = formattedDate;
        row.appendChild(dateCell);
        
        // Opponent cell
        const opponentCell = document.createElement('td');
        opponentCell.textContent = game.opponent;
        if (game.isExhibition) {
            const exhibitionBadge = document.createElement('span');
            exhibitionBadge.className = 'badge exhibition-badge';
            exhibitionBadge.textContent = 'Exhibition';
            opponentCell.appendChild(exhibitionBadge);
        }
        row.appendChild(opponentCell);
        
        // Time cell
        const timeCell = document.createElement('td');
        timeCell.textContent = formattedTime;
        row.appendChild(timeCell);
        
        // Location cell
        const locationCell = document.createElement('td');
        locationCell.textContent = game.location;
        row.appendChild(locationCell);
        
        // Result cell
        const resultCell = document.createElement('td');
        if (game.result) {
            const resultText = `${game.result} ${game.score || ''}`;
            const resultClass = game.result === 'Win' ? 'result-win' : 
                               game.result === 'Loss' ? 'result-loss' : 
                               'result-tie';
            
            const resultBadge = document.createElement('span');
            resultBadge.className = `badge ${resultClass}`;
            resultBadge.textContent = resultText;
            resultCell.appendChild(resultBadge);
        } else {
            resultCell.textContent = 'Upcoming';
        }
        row.appendChild(resultCell);
        
        // Actions cell
        const actionsCell = document.createElement('td');
        
        // Edit button
        const editButton = document.createElement('button');
        editButton.className = 'action-btn';
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.setAttribute('aria-label', `Edit game against ${game.opponent}`);
        editButton.addEventListener('click', function() {
            // Populate form with game data
            document.getElementById('game-date').value = game.date;
            document.getElementById('game-opponent').value = game.opponent;
            document.getElementById('game-time').value = game.time;
            document.getElementById('game-location').value = game.location;
            document.getElementById('game-result').value = game.result || '';
            document.getElementById('game-score').value = game.score || '';
            document.getElementById('game-exhibition').checked = game.isExhibition;
            
            // Change button text and mode
            const addGameBtn = document.getElementById('add-game-btn');
            if (addGameBtn) {
                addGameBtn.innerHTML = '<i class="fas fa-save"></i> Update Game';
                addGameBtn.dataset.mode = 'edit';
                addGameBtn.dataset.editId = game.id;
            }
            
            // Scroll to form
            document.querySelector('.schedule-form').scrollIntoView({ behavior: 'smooth' });
        });
        actionsCell.appendChild(editButton);
        
        // Delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'action-btn delete-btn';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.setAttribute('aria-label', `Delete game against ${game.opponent}`);
        deleteButton.addEventListener('click', function() {
            if (confirm(`Are you sure you want to delete the game against ${game.opponent}?`)) {
                // Remove game from data
                scheduleData = scheduleData.filter(g => g.id !== game.id);
                
                // Re-render schedule list
                renderScheduleList(scheduleData, container);
            }
        });
        actionsCell.appendChild(deleteButton);
        
        row.appendChild(actionsCell);
        
        container.appendChild(row);
    });
}

/**
 * Initialize messaging functionality
 */
function initMessaging() {
    const messagingForm = document.querySelector('.messaging-form');
    const messageList = document.getElementById('message-list');
    const saveDraftButton = document.getElementById('save-draft');
    const messageFilters = document.querySelectorAll('.message-filters .filter-btn');
    
    // Sample messages
    let messages = [
        {
            id: 1,
            subject: 'Practice Schedule Update',
            recipients: 'all',
            content: 'Practice this week will be on Tuesday and Thursday from 6-8pm.',
            date: '2025-03-01T10:30:00',
            status: 'sent',
            isUrgent: false
        },
        {
            id: 2,
            subject: 'Game Day Information',
            recipients: 'all',
            content: 'Please arrive 45 minutes before kickoff for warm-ups. Bring both home and away jerseys.',
            date: '2025-03-05T15:45:00',
            status: 'sent',
            isUrgent: true
        }
    ];
    
    // Render initial messages
    if (messageList) {
        renderMessages(messages, messageList);
    }
    
    // Handle message filters
    if (messageFilters) {
        messageFilters.forEach(filter => {
            filter.addEventListener('click', function() {
                // Update active filter
                messageFilters.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // Filter messages
                const filterType = this.getAttribute('data-filter');
                const filteredMessages = filterType === 'all' ? 
                    messages : 
                    messages.filter(message => message.status === filterType);
                
                // Re-render messages
                renderMessages(filteredMessages, messageList);
            });
        });
    }
    
    // Handle save draft
    if (saveDraftButton && messagingForm) {
        saveDraftButton.addEventListener('click', function() {
            const subject = document.getElementById('message-subject').value;
            const recipients = document.getElementById('message-recipients').value;
            const content = document.getElementById('message-content').value;
            const isUrgent = document.getElementById('message-urgent').checked;
            
            if (!subject && !content) {
                alert('Please enter a subject or message content to save as draft.');
                return;
            }
            
            // Create new draft message
            const newDraft = {
                id: Date.now(),
                subject: subject || '(No subject)',
                recipients: recipients || 'all',
                content: content || '',
                date: new Date().toISOString(),
                status: 'draft',
                isUrgent
            };
            
            // Add to messages
            messages.push(newDraft);
            
            // Re-render messages (show all including drafts)
            renderMessages(messages, messageList);
            
            // Update filter buttons
            messageFilters.forEach(btn => {
                if (btn.getAttribute('data-filter') === 'all') {
                    btn.click();
                }
            });
            
            // Show confirmation
            alert('Draft saved successfully!');
        });
    }
    
    // Handle form submission
    if (messagingForm) {
        messagingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const subject = document.getElementById('message-subject').value;
            const recipients = document.getElementById('message-recipients').value;
            const content = document.getElementById('message-content').value;
            const isUrgent = document.getElementById('message-urgent').checked;
            
            // Validate form
            if (!subject || !recipients || !content) {
                alert('Please fill in all required fields.');
                return;
            }
            
            // Create new message object
            const newMessage = {
                id: Date.now(),
                subject,
                recipients,
                content,
                date: new Date().toISOString(),
                status: 'sent',
                isUrgent
            };
            
            // Add to messages
            messages.push(newMessage);
            
            // Re-render messages
            renderMessages(messages, messageList);
            
            // Reset form
            this.reset();
            
            // Show success message
            alert('Message sent successfully!');
        });
    }
}

/**
 * Render messages in admin panel
 * @param {Array} messages - Array of message objects
 * @param {HTMLElement} container - Container element for the messages
 */
function renderMessages(messages, container) {
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    if (messages.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'no-items-message';
        emptyMessage.textContent = 'No messages to display';
        container.appendChild(emptyMessage);
        return;
    }
    
    // Sort messages by date (newest first)
    const sortedMessages = [...messages].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Add message items
    sortedMessages.forEach(message => {
        const messageItem = document.createElement('div');
        messageItem.className = `message-item ${message.status === 'draft' ? 'message-draft' : ''}`;
        if (message.isUrgent) {
            messageItem.classList.add('message-urgent');
        }
        
        // Format date
        const messageDate = new Date(message.date);
        const formattedDate = messageDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
        
        // Get recipient text
        const recipientText = message.recipients === 'all' ? 'All Team Members' :
                             message.recipients === 'players' ? 'Players Only' :
                             message.recipients === 'parents' ? 'Parents Only' :
                             'Coaches Only';
        
        messageItem.innerHTML = `
            <div class="message-header">
                <div class="message-subject">
                    ${message.isUrgent ? '<span class="urgent-badge">URGENT</span>' : ''}
                    ${message.subject}
                    ${message.status === 'draft' ? '<span class="draft-badge">DRAFT</span>' : ''}
                </div>
                <div class="message-meta">
                    <span class="message-recipients">To: ${recipientText}</span>
                    <span class="message-date">${formattedDate}</span>
                </div>
            </div>
            <div class="message-content">${message.content}</div>
            <div class="message-actions">
                ${message.status === 'draft' ? 
                    '<button class="action-btn edit-btn"><i class="fas fa-edit"></i> Edit</button>' : 
                    '<button class="action-btn"><i class="fas fa-reply"></i> Resend</button>'}
                <button class="action-btn delete-btn"><i class="fas fa-trash"></i> Delete</button>
            </div>
        `;
        
        // Add edit functionality for drafts
        const editButton = messageItem.querySelector('.edit-btn');
        if (editButton) {
            editButton.addEventListener('click', function() {
                // Populate form with draft data
                document.getElementById('message-subject').value = message.subject;
                document.getElementById('message-recipients').value = message.recipients;
                document.getElementById('message-content').value = message.content;
                document.getElementById('message-urgent').checked = message.isUrgent;
                
                // Scroll to form
                document.querySelector('.messaging-form').scrollIntoView({ behavior: 'smooth' });
                
                // Remove draft from list
                const index = messages.findIndex(m => m.id === message.id);
                if (index !== -1) {
                    messages.splice(index, 1);
                }
                
                // Re-render messages
                renderMessages(messages, container);
            });
        }
        
        // Add delete functionality
        const deleteButton = messageItem.querySelector('.delete-btn');
        if (deleteButton) {
            deleteButton.addEventListener('click', function() {
                if (confirm('Are you sure you want to delete this message?')) {
                    // Remove message from data
                    const index = messages.findIndex(m => m.id === message.id);
                    if (index !== -1) {
                        messages.splice(index, 1);
                    }
                    
                    // Re-render messages
                    renderMessages(messages, container);
                }
            });
        }
        
        container.appendChild(messageItem);
    });
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date string
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format time for display
 * @param {string} timeString - Time string in 24-hour format (HH:MM)
 * @returns {string} - Formatted time string
 */
function formatTime(timeString) {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':');
    return new Date(0, 0, 0, hours, minutes).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });
}