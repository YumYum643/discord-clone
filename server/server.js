const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./database');
const authRoutes = require('./routes/auth');

require('dotenv').config();

const app = express();
const server = http.createServer(app);

const corsOrigin = process.env.CORS_ORIGIN || '*';

app.use(cors({
    origin: corsOrigin,
    methods: ["GET", "POST"]
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: corsOrigin,
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_channel', (channelId) => {
        socket.join(channelId);
        console.log(`User ${socket.id} joined channel ${channelId}`);
    });

    socket.on('send_message', (data) => {
        // data: { channelId, userId, content, username, avatar }
        const { channelId, userId, content } = data;

        // Save to DB
        const stmt = db.prepare("INSERT INTO messages (channel_id, user_id, content) VALUES (?, ?, ?)");
        stmt.run(channelId, userId, content, function (err) {
            if (err) {
                console.error("Error saving message:", err);
                return;
            }

            const messageId = this.lastID;
            const messageToSend = {
                id: messageId,
                channel_id: channelId,
                user_id: userId,
                content: content,
                username: data.username, // Pass through for immediate UI update
                avatar_url: data.avatar_url,
                created_at: new Date().toISOString()
            };

            // Broadcast to channel
            io.to(channelId).emit('receive_message', messageToSend);
        });
        stmt.finalize();
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// API to get channels (Public + Private for user)
app.get('/api/channels', (req, res) => {
    const userId = req.query.userId; // We need to know who is asking

    let sql = `
    SELECT DISTINCT c.* 
    FROM channels c
    LEFT JOIN channel_participants cp ON c.id = cp.channel_id
    WHERE c.type = 'text' 
       OR (c.type = 'private' AND cp.user_id = ?)
  `;

    // If no userId provided, just return public channels (fallback)
    const params = userId ? [userId] : [];
    if (!userId) {
        sql = "SELECT * FROM channels WHERE type = 'text'";
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        // Mask password
        const safeRows = rows.map(row => ({
            ...row,
            has_password: !!row.password,
            password: undefined // Remove actual password
        }));
        res.json(safeRows);
    });
});

// API to create a channel
app.post('/api/channels', (req, res) => {
    const { name, type, description, userIds, password } = req.body;
    // userIds is an array of user IDs to add to the channel (creator + others)

    const channelType = type || 'text';

    db.run("INSERT INTO channels (name, description, type, password) VALUES (?, ?, ?, ?)", [name, description, channelType, password], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        const channelId = this.lastID;

        // If private, add participants
        if (channelType === 'private' && userIds && userIds.length > 0) {
            const placeholders = userIds.map(() => '(?, ?)').join(',');
            const values = [];
            userIds.forEach(uid => {
                values.push(channelId, uid);
            });

            db.run(`INSERT INTO channel_participants (channel_id, user_id) VALUES ${placeholders}`, values, (err) => {
                if (err) {
                    console.error("Error adding participants:", err);
                }
            });
        }

        res.json({ id: channelId, name, description, type: channelType, has_password: !!password });
    });
});

// API to verify channel password
app.post('/api/channels/:id/verify', (req, res) => {
    const channelId = req.params.id;
    const { password } = req.body;

    db.get("SELECT password FROM channels WHERE id = ?", [channelId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: "Channel not found" });
            return;
        }

        if (row.password === password) {
            res.json({ success: true });
        } else {
            res.status(401).json({ error: "Incorrect password" });
        }
    });
});

// API to update user profile
app.put('/api/users/profile', (req, res) => {
    const { userId, avatarUrl } = req.body;

    db.run("UPDATE users SET avatar_url = ? WHERE id = ?", [avatarUrl, userId], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, avatar_url: avatarUrl });
    });
});

// API to get all users
app.get('/api/users', (req, res) => {
    db.all("SELECT id, username, avatar_url FROM users", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// API to get messages for a channel
app.get('/api/channels/:id/messages', (req, res) => {
    const channelId = req.params.id;
    const sql = `
    SELECT m.*, u.username, u.avatar_url 
    FROM messages m 
    JOIN users u ON m.user_id = u.id 
    WHERE m.channel_id = ? 
    ORDER BY m.created_at ASC
  `;
    db.all(sql, [channelId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
