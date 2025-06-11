// Chat System Functions

let currentChatId = null;
let currentChatType = 'direct'; // 'direct' or 'group'
let chatPollingInterval = null;

// Initialize chat page
function initChatPage() {
    loadChatList();
    setupChatEventListeners();
    startChatPolling();
}

// Setup event listeners for chat
function setupChatEventListeners() {
    // New chat button
    document.getElementById('newChatBtn').addEventListener('click', () => {
        openNewChatModal();
    });

    // Chat tabs
    document.querySelectorAll('.chat-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabType = e.target.dataset.tab;
            switchChatTab(tabType);
        });
    });

    // Send message
    document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // New chat modal events
    document.querySelectorAll('[data-type]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.dataset.type;
            switchNewChatType(type);
        });
    });

    document.getElementById('startChatBtn').addEventListener('click', startNewChat);

    // Modal close events
    setupModalEvents('newChatModal');
}

// Load chat list
async function loadChatList() {
    try {
        const [directChats, groupChats] = await Promise.all([
            apiRequest('/api/chat/direct'),
            apiRequest('/api/chat/groups')
        ]);

        renderDirectChatList(directChats.chats || []);
        renderGroupChatList(groupChats.groups || []);

    } catch (error) {
        console.error('Error loading chat list:', error);
        showToast('خطأ في تحميل قائمة المحادثات', 'error');
    }
}

// Render direct chat list
function renderDirectChatList(chats) {
    const container = document.getElementById('directChatList');
    container.innerHTML = '';

    chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.dataset.chatId = chat.id;
        chatItem.dataset.chatType = 'direct';
        
        const unreadClass = chat.unread_count > 0 ? 'unread' : '';
        
        chatItem.innerHTML = `
            <div class="chat-avatar">👤</div>
            <div class="chat-info">
                <div class="chat-name">${escapeHtml(chat.other_user_name)}</div>
                <div class="chat-last-message ${unreadClass}">
                    ${chat.last_message ? escapeHtml(chat.last_message.substring(0, 50)) + '...' : 'لا توجد رسائل'}
                </div>
            </div>
            <div class="chat-meta">
                ${chat.last_message_time ? `<div class="chat-time">${formatTime(chat.last_message_time)}</div>` : ''}
                ${chat.unread_count > 0 ? `<div class="chat-unread">${chat.unread_count}</div>` : ''}
            </div>
        `;

        chatItem.addEventListener('click', () => {
            openChat(chat.id, 'direct', chat.other_user_name);
        });

        container.appendChild(chatItem);
    });
}

// Render group chat list
function renderGroupChatList(groups) {
    const container = document.getElementById('groupChatList');
    container.innerHTML = '';

    groups.forEach(group => {
        const groupItem = document.createElement('div');
        groupItem.className = 'chat-item';
        groupItem.dataset.chatId = group.id;
        groupItem.dataset.chatType = 'group';
        
        const unreadClass = group.unread_count > 0 ? 'unread' : '';
        
        groupItem.innerHTML = `
            <div class="chat-avatar">👥</div>
            <div class="chat-info">
                <div class="chat-name">${escapeHtml(group.name)}</div>
                <div class="chat-last-message ${unreadClass}">
                    ${group.last_message ? escapeHtml(group.last_message.substring(0, 50)) + '...' : 'لا توجد رسائل'}
                </div>
            </div>
            <div class="chat-meta">
                ${group.last_message_time ? `<div class="chat-time">${formatTime(group.last_message_time)}</div>` : ''}
                ${group.unread_count > 0 ? `<div class="chat-unread">${group.unread_count}</div>` : ''}
                <div class="chat-members">${group.member_count} أعضاء</div>
            </div>
        `;

        groupItem.addEventListener('click', () => {
            openChat(group.id, 'group', group.name);
        });

        container.appendChild(groupItem);
    });
}

// Switch chat tab
function switchChatTab(tabType) {
    // Update tab buttons
    document.querySelectorAll('.chat-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabType}"]`).classList.add('active');

    // Show/hide chat lists
    document.getElementById('directChatList').style.display = tabType === 'direct' ? 'block' : 'none';
    document.getElementById('groupChatList').style.display = tabType === 'group' ? 'block' : 'none';
}

// Open chat conversation
async function openChat(chatId, chatType, chatName) {
    currentChatId = chatId;
    currentChatType = chatType;

    // Update UI
    document.querySelector('.chat-welcome').style.display = 'none';
    document.getElementById('chatConversation').style.display = 'block';
    document.getElementById('chatHeader').innerHTML = `
        <h3>${escapeHtml(chatName)}</h3>
        <div class="chat-actions">
            ${chatType === 'group' ? '<button class="btn btn-sm btn-secondary" onclick="showGroupInfo()">معلومات المجموعة</button>' : ''}
        </div>
    `;

    // Mark chat as active
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-chat-id="${chatId}"][data-chat-type="${chatType}"]`).classList.add('active');

    // Load messages
    await loadChatMessages();

    // Mark as read
    await markChatAsRead(chatId, chatType);
}

// Load chat messages
async function loadChatMessages() {
    try {
        const endpoint = currentChatType === 'direct' 
            ? `/api/chat/direct/${currentChatId}/messages`
            : `/api/chat/groups/${currentChatId}/messages`;

        const response = await apiRequest(endpoint);
        renderChatMessages(response.messages || []);

    } catch (error) {
        console.error('Error loading chat messages:', error);
        showToast('خطأ في تحميل الرسائل', 'error');
    }
}

// Render chat messages
function renderChatMessages(messages) {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';

    messages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${message.is_own ? 'own' : 'other'}`;
        
        messageDiv.innerHTML = `
            <div class="message-content">
                ${!message.is_own && currentChatType === 'group' ? 
                    `<div class="message-sender">${escapeHtml(message.sender_name)}</div>` : ''}
                <div class="message-text">${escapeHtml(message.content)}</div>
                <div class="message-time">${formatTime(message.created_at)}</div>
            </div>
        `;

        container.appendChild(messageDiv);
    });

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Send message
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const content = input.value.trim();

    if (!content || !currentChatId) return;

    try {
        const endpoint = currentChatType === 'direct' 
            ? `/api/chat/direct/${currentChatId}/messages`
            : `/api/chat/groups/${currentChatId}/messages`;

        await apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify({ content })
        });

        input.value = '';
        await loadChatMessages();

    } catch (error) {
        console.error('Error sending message:', error);
        showToast('خطأ في إرسال الرسالة', 'error');
    }
}

// Mark chat as read
async function markChatAsRead(chatId, chatType) {
    try {
        const endpoint = chatType === 'direct' 
            ? `/api/chat/direct/${chatId}/read`
            : `/api/chat/groups/${chatId}/read`;

        await apiRequest(endpoint, { method: 'POST' });

    } catch (error) {
        console.error('Error marking chat as read:', error);
    }
}

// Open new chat modal
function openNewChatModal() {
    const modal = document.getElementById('newChatModal');
    loadUsersForChat();
    showModal(modal);
}

// Load users for chat
async function loadUsersForChat() {
    try {
        const response = await apiRequest('/api/users/employees');
        
        // Direct chat dropdown
        const directSelect = document.getElementById('directChatUser');
        directSelect.innerHTML = '<option value="">اختر مستخدم</option>';
        
        // Group members list
        const membersList = document.getElementById('groupMembersList');
        membersList.innerHTML = '';

        response.employees.forEach(user => {
            // Direct chat option
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.full_name;
            directSelect.appendChild(option);

            // Group member checkbox
            const memberDiv = document.createElement('div');
            memberDiv.className = 'member-item';
            memberDiv.innerHTML = `
                <label class="checkbox-label">
                    <input type="checkbox" value="${user.id}" name="groupMembers">
                    <span>${escapeHtml(user.full_name)}</span>
                </label>
            `;
            membersList.appendChild(memberDiv);
        });

    } catch (error) {
        console.error('Error loading users for chat:', error);
    }
}

// Switch new chat type
function switchNewChatType(type) {
    // Update buttons
    document.querySelectorAll('[data-type]').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-type="${type}"]`).classList.add('active');

    // Show/hide forms
    document.getElementById('directChatForm').style.display = type === 'direct' ? 'block' : 'none';
    document.getElementById('groupChatForm').style.display = type === 'group' ? 'block' : 'none';
}

// Start new chat
async function startNewChat() {
    const activeType = document.querySelector('[data-type].active').dataset.type;

    try {
        if (activeType === 'direct') {
            const userId = document.getElementById('directChatUser').value;
            if (!userId) {
                showToast('يرجى اختيار مستخدم', 'error');
                return;
            }

            await apiRequest('/api/chat/direct', {
                method: 'POST',
                body: JSON.stringify({ user_id: parseInt(userId) })
            });

        } else {
            const groupName = document.getElementById('groupName').value.trim();
            const groupDescription = document.getElementById('groupDescription').value.trim();
            const memberCheckboxes = document.querySelectorAll('input[name="groupMembers"]:checked');

            if (!groupName) {
                showToast('يرجى إدخال اسم المجموعة', 'error');
                return;
            }

            if (memberCheckboxes.length === 0) {
                showToast('يرجى اختيار عضو واحد على الأقل', 'error');
                return;
            }

            const memberIds = Array.from(memberCheckboxes).map(cb => parseInt(cb.value));

            await apiRequest('/api/chat/groups', {
                method: 'POST',
                body: JSON.stringify({
                    name: groupName,
                    description: groupDescription,
                    member_ids: memberIds
                })
            });
        }

        hideModal('newChatModal');
        showToast('تم إنشاء المحادثة بنجاح', 'success');
        loadChatList();

    } catch (error) {
        console.error('Error starting new chat:', error);
        showToast('خطأ في إنشاء المحادثة', 'error');
    }
}

// Start chat polling
function startChatPolling() {
    if (chatPollingInterval) {
        clearInterval(chatPollingInterval);
    }

    chatPollingInterval = setInterval(async () => {
        if (currentChatId) {
            await loadChatMessages();
        }
        await loadChatList();
    }, 5000); // Poll every 5 seconds
}

// Stop chat polling
function stopChatPolling() {
    if (chatPollingInterval) {
        clearInterval(chatPollingInterval);
        chatPollingInterval = null;
    }
}

// Show group info
async function showGroupInfo() {
    if (currentChatType !== 'group' || !currentChatId) return;

    try {
        const group = await apiRequest(`/api/chat/groups/${currentChatId}`);
        
        const membersHtml = group.members.map(member => 
            `<li>${escapeHtml(member.full_name)} (${getRoleText(member.role)})</li>`
        ).join('');

        const info = `
            <div class="group-info">
                <h3>${escapeHtml(group.name)}</h3>
                <p><strong>الوصف:</strong> ${group.description || '-'}</p>
                <p><strong>تاريخ الإنشاء:</strong> ${formatDate(group.created_at)}</p>
                <p><strong>الأعضاء:</strong></p>
                <ul>${membersHtml}</ul>
            </div>
        `;

        showAlert('معلومات المجموعة', info);

    } catch (error) {
        console.error('Error loading group info:', error);
        showToast('خطأ في تحميل معلومات المجموعة', 'error');
    }
}

// Format time for chat
function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `${diffMins} د`;
    if (diffHours < 24) return `${diffHours} س`;
    if (diffDays < 7) return `${diffDays} ي`;
    
    return date.toLocaleDateString('ar-SA');
}

