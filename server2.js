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
    timestamp: "2016/11/28 10:40:21PM"
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
    // Format timestamp like [YYYY/MM/DD hh:mm:ssAM/PM]
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedTime = `${year}/${month}/${day} ${String(hours).padStart(2, '0')}:${minutes}:${seconds}${ampm}`;

    const newMessage = {
      id: Date.now(),
      username: username ? username.trim() : "Anonymous",
      text: text.trim(),
      timestamp: formattedTime
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
    <title>Hiddenworld Chat</title>
    <style>
        	:root {
   	 			box-sizing: border-box;
			}

*, *::before, *::after {
    box-sizing: inherit;
}
        body {
            background-color: #000000;
            color: #ffffff;
            font-family: "Georgia", "Times New Roman", serif;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }
        .container {
            width: 100%;
            max-width: 1000px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            flex: 1;
            background-color: #000000;
        }
        #chat-feed {
            flex: 1;
            display: flex;
            flex-direction: column;
            background-color: #000000;
        }
        .post {
            padding: 4px 6px;
            font-size: 1.05rem;
            line-height: 1.35;
            word-break: break-word;
            border-bottom: 1px solid #000000;
        }
        /* Normal posts: Charcoal Grey */
        .post.grey {
            background-color: #4a4a4a;
            color: #ffffff;
        }
        /* OOC / Standard posts: Dark Red */
        .post.red {
            background-color: #5a0000;
            color: #ffffff;
        }
        .post-header {
            font-weight: bold;
            display: inline;
        }

        /* Bottom Control Panel Bar */
        .control-panel {
            background-color: #0b2265;
            color: #ffffff;
            font-family: Arial, sans-serif;
            font-size: 0.75rem;
            padding: 6px 8px;
            border-top: 1px solid #000000;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .panel-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            flex-wrap: wrap;
        }
        .panel-group {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        select, input[type="text"] {
            background: #ffffff;
            color: #000000;
            border: 1px solid #7f9db9;
            font-size: 0.75rem;
            padding: 1px 3px;
        }
        #message-input {
            flex: 1;
            min-width: 200px;
        }
        button, input[type="submit"] {
            background: #e1e1e1;
            color: #000000;
            border: 1px solid #707070;
            font-size: 0.7rem;
            padding: 2px 8px;
            cursor: pointer;
        }
        button:active, input[type="submit"]:active {
            background: #ccc;
        }
        footer {
            background-color: #000000;
            color: #888888;
            font-family: Arial, sans-serif;
            font-size: 0.65rem;
            text-align: center;
            padding: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div id="chat-feed"></div>

        <div class="control-panel">
            <div class="panel-row">
                <div class="panel-group">
                    <input type="checkbox" id="purchase-check">
                    <label for="purchase-check">Purchase something:</label>
                    <select id="purchase-select">
                        <option>Water (0 gold)</option>
                    </select>
                </div>
                <div class="panel-group">
                    <input type="checkbox" id="autoupdate-check" checked>
                    <label for="autoupdate-check">Change Autoupdate:</label>
                    <select id="timer-display">
                        <option>10 seconds</option>
                        <option>5 seconds</option>
                        <option>Off</option>
                    </select>
                </div>
            </div>

            <form id="chat-form" class="panel-row" style="margin: 0;">
                <div class="panel-group" style="flex: 1;">
                    <label for="message-input">Add a comment:</label>
                    <input type="text" id="message-input" placeholder="">
                    <button type="submit" id="send-btn">Submit</button>
                </div>
                <div class="panel-group">
                    <input type="checkbox" id="spellcheck-check" checked>
                    <label for="spellcheck-check">Spellcheck in</label>
                    <select id="language-select">
                        <option>English</option>
                    </select>
                </div>
                <div class="panel-group">
                    <input type="text" id="username-input" style="width: 50px;" value="User">
                    <button type="button" onclick="alert('Logged out')">Logout</button>
                </div>
            </form>
        </div>

        <footer>
            Design&amp;Concept Copyright Hiddenworld.com 1997-2013
        </footer>
    </div>

    <script>
        let timeLeft = 10;
        let timerInterval;

        async function fetchMessages() {
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
                postDiv.className = \`post \${isOoc || msg.username === 'System' ? 'red' : 'grey'}\`;

                const headerSpan = document.createElement('span');
                headerSpan.className = 'post-header';
                headerSpan.textContent = \`[\${msg.timestamp} \${msg.username}] \`;

                const textSpan = document.createElement('span');
                textSpan.textContent = msg.text;

                postDiv.appendChild(headerSpan);
                postDiv.appendChild(textSpan);
                feed.appendChild(postDiv);
            });

            if (isAtBottom) {
                feed.scrollTop = feed.scrollHeight;
            }
        }

        function resetTimer() {
            clearInterval(timerInterval);
            timeLeft = 10;
            
            const timerSelect = document.getElementById('timer-display');
            timerInterval = setInterval(() => {
                if (!document.getElementById('autoupdate-check').checked) return;
                timeLeft--;
                if (timeLeft <= 0) {
                    fetchMessages();
                    timeLeft = 10;
                }
            }, 1000);
        }

        document.getElementById('chat-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username-input').value;
            const messageInput = document.getElementById('message-input');
            const text = messageInput.value;

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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}