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

// API to get channels
app.get('/api/channels', (req, res) => {
    db.all("SELECT * FROM channels", [], (err, rows) => {
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
