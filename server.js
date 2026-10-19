const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory message store (for persistent production, connect MongoDB/SQLite)
let messages = [
  {
    id: 1,
    username: "System",
    text: "Welcome to the chat! Normal posts are grey, ooc: posts are red.",
    timestamp: new Date().toLocaleString()
  }
];

// API: Get all messages
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

// API: Post a new message (or trigger empty-refresh if text is blank)
app.post('/api/messages', (req, res) => {
  const { username, text } = req.body;
  
  if (text !== undefined && text.trim() !== '') {
    const newMessage = {
      id: Date.now(),
      username: username ? username.trim() : "Anonymous",
      text: text.trim(),
      timestamp: new Date().toLocaleString()
    };
    messages.push(newMessage);
    // Keep only the last 100 messages in memory
    if (messages.length > 100) messages.shift();
  }
  
  res.json({ success: true, messages });
});

// Serve frontend HTML interface
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Custom Chat App</title>
    <style>
        :root {
            --bg-color: #0f172a;
            --card-bg: #1e293b;
            --border-color: #334155;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --grey-post: #334155;
            --red-post: #7f1d1d;
            --red-border: #991b1b;
            --accent: #3b82f6;
            --accent-hover: #2563eb;
        }
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
        }
        .container {
            width: 100%;
            max-width: 600px;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            height: 90vh;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }
        header {
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        header h1 {
            font-size: 1.1rem;
            margin: 0;
            color: var(--text-main);
        }
        #timer-display {
            font-size: 0.85rem;
            color: var(--text-muted);
            background: rgba(255, 255, 255, 0.05);
            padding: 4px 8px;
            border-radius: 6px;
        }
        #chat-feed {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .post {
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 0.95rem;
            line-height: 1.4;
            word-break: break-word;
            border: 1px solid transparent;
        }
        /* Normal posts: Grey */
        .post.grey {
            background-color: var(--grey-post);
            border-color: #475569;
        }
        /* OOC posts: Red */
        .post.red {
            background-color: var(--red-post);
            border-color: var(--red-border);
        }
        .post-header {
            display: flex;
            justify-content: space-between;
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-bottom: 6px;
            gap: 10px;
        }
        .post-user {
            font-weight: 600;
            color: var(--text-main);
        }
        .ooc-badge {
            background: rgba(239, 68, 68, 0.2);
            color: #fca5a5;
            padding: 1px 6px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 0.7rem;
            border: 1px solid rgba(239, 68, 68, 0.4);
        }
        form {
            padding: 16px 20px;
            border-top: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            gap: 10px;
            background: rgba(0,0,0,0.1);
            border-bottom-left-radius: 12px;
            border-bottom-right-radius: 12px;
        }
        .input-row {
            display: flex;
            gap: 10px;
        }
        input[type="text"], textarea {
            background: var(--bg-color);
            border: 1px solid var(--border-color);
            color: var(--text-main);
            padding: 10px 12px;
            border-radius: 6px;
            font-family: inherit;
            font-size: 0.9rem;
            outline: none;
            transition: border-color 0.2s;
        }
        input[type="text"]:focus, textarea:focus {
            border-color: var(--accent);
        }
        #username-input {
            width: 140px;
        }
        #message-input {
            flex: 1;
            resize: none;
            height: 40px;
        }
        button {
            background-color: var(--accent);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        button:hover {
            background-color: var(--accent-hover);
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Chat Room</h1>
            <div id="timer-display">Refresh in: 10s</div>
        </header>

        <div id="chat-feed"></div>

        <form id="chat-form">
            <div class="input-row">
                <input type="text" id="username-input" placeholder="Your Name" value="User_${Math.floor(Math.random()*1000)}">
                <input type="text" id="message-input" placeholder="Type a message or 'ooc: text'... (Blank = Refresh)">
                <button type="submit" id="send-btn">Send</button>
            </div>
        </form>
    </div>

    <script>
        let timeLeft = 10;
        let timerInterval;

        async function fetchMessages(isManualRefresh = false) {
            try {
                const response = await fetch('/api/messages');
                const messages = await response.json();
                renderMessages(messages);
            } catch (err) {
                console.error("Failed to fetch messages", err);
            }
            resetTimer();
        }

        function renderMessages(messages) {
            const feed = document.getElementById('chat-feed');
            const isAtBottom = feed.scrollHeight - feed.scrollTop <= feed.clientHeight + 50;

            feed.innerHTML = '';
            messages.forEach(msg => {
                const isOoc = msg.text.trim().toLowerCase().startsWith('ooc:');
                const postDiv = document.createElement('div');
                postDiv.className = \`post \${isOoc ? 'red' : 'grey'}\`;

                const headerDiv = document.createElement('div');
                headerDiv.className = 'post-header';
                
                const userInfo = document.createElement('span');
                userInfo.className = 'post-user';
                userInfo.innerHTML = \`\${escapeHtml(msg.username)} \${isOoc ? '<span class="ooc-badge">OOC</span>' : ''}\`;
                
                const timeInfo = document.createElement('span');
                timeInfo.textContent = msg.timestamp;

                headerDiv.appendChild(userInfo);
                headerDiv.appendChild(timeInfo);

                const textDiv = document.createElement('div');
                textDiv.textContent = msg.text;

                postDiv.appendChild(headerDiv);
                postDiv.appendChild(textDiv);
                feed.appendChild(postDiv);
            });

            if (isAtBottom) {
                feed.scrollTop = feed.scrollHeight;
            }
        }

        function escapeHtml(str) {
            return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }

        function resetTimer() {
            clearInterval(timerInterval);
            timeLeft = 10;
            document.getElementById('timer-display').textContent = \`Refresh in: \${timeLeft}s\`;
            
            timerInterval = setInterval(() => {
                timeLeft--;
                document.getElementById('timer-display').textContent = \`Refresh in: \${timeLeft}s\`;
                if (timeLeft <= 0) {
                    fetchMessages();
                }
            }, 1000);
        }

        document.getElementById('chat-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username-input').value;
            const messageInput = document.getElementById('message-input');
            const text = messageInput.value;

            // Send to server (if blank, server treats it as a refresh trigger)
            try {
                const response = await fetch('/api/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, text })
                });
                const data = await response.json();
                renderMessages(data.messages);
            } catch (err) {
                console.error("Error sending message", err);
            }

            // Clear message input field
            messageInput.value = '';
            resetTimer();
        });

        // Initial load
        fetchMessages();
    </script>
</body>
</html>`);
});

module.exports = app;