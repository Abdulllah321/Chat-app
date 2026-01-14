
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { MongoMemoryServer } = require('mongodb-memory-server');

dotenv.config();

const User = require('./models/User');
const Message = require('./models/Message');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const ws = require('ws');
const fs = require('fs');

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = process.env.JWT_SECRET;

const app = express();
app.use(express.json());
app.use(cors({
    credentials: true,
    origin: 'http://localhost:5173',
}));
app.use('/uploads', express.static(__dirname + '/uploads'));

const uploadsDir = __dirname + '/uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Middleware for authentication
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
            if (err) {
                return res.status(401).json('invalid token');
            }
            req.userData = userData;
            next();
        });
    } else {
        res.status(401).json('no token');
    }
};

app.get('/test', (req, res) => {
    res.json('test ok');
});

app.post('/register', async (req, res) => {
    const {username, password} = req.body;
    try {
        const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
        const createdUser = await User.create({
            username: username,
            password: hashedPassword,
        });
        jwt.sign({userId: createdUser._id, username}, jwtSecret, {}, (err, token) => {
            if (err) throw err;
            res.status(201).json({
                id: createdUser._id,
                token: token,
            });
        });
    } catch(err) {
        if (err.code === 11000) {
            res.status(400).json('username already exists');
        } else {
            res.status(500).json('error');
        }
    }
});

app.post('/login', async (req, res) => {
    const {username, password} = req.body;
    const foundUser = await User.findOne({username});
    if (foundUser) {
        const passOk = bcrypt.compareSync(password, foundUser.password);
        if (passOk) {
            jwt.sign({userId: foundUser._id, username}, jwtSecret, {}, (err, token) => {
                if (err) throw err;
                res.json({
                    id: foundUser._id,
                    username: username,
                    token: token,
                });
            });
        } else {
            res.status(401).json('incorrect password');
        }
    } else {
        res.status(404).json('user not found');
    }
});

app.get('/profile', authenticate, (req, res) => {
    res.json(req.userData);
});

app.get('/people', async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const users = await User.find({}, { '_id': 1, username: 1 })
        .skip((page - 1) * limit)
        .limit(limit);
    res.json(users);
});

app.get('/people/count', async (req, res) => {
    const count = await User.countDocuments();
    res.json({ count });
});

app.get('/messages/:userId', async (req, res) => {
    const {userId} = req.params;
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;
    const messages = await Message.find({
        sender: {$in: [userId, ourUserId]},
        recipient: {$in: [userId, ourUserId]},
    }).sort({createdAt: 1});
    res.json(messages);
});

async function startServer() {
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log('Connected to in-memory database');

    const server = app.listen(process.env.PORT || 4040, () => {
        console.log(`Server listening on port ${process.env.PORT || 4040}`);
    });

    const wss = new ws.WebSocketServer({server});
    wss.on('connection', (connection, req) => {

        function notifyAboutOnlinePeople() {
            const online = [...wss.clients].map(c => ({userId: c.userId, username: c.username}));
            const data = JSON.stringify({online});
            [...wss.clients].forEach(client => {
                client.send(data);
            });
        }

        connection.isAlive = true;
        connection.timer = setInterval(() => {
            connection.ping();
            connection.deathTimer = setTimeout(() => {
                connection.isAlive = false;
                clearInterval(connection.timer);
                connection.terminate();
                notifyAboutOnlinePeople();
            }, 1000);
        }, 5000);

        connection.on('pong', () => {
            clearTimeout(connection.deathTimer);
        });

        const cookies = req.headers.cookie;
        if (cookies) {
            const tokenCookieString = cookies.split(';').find(str => str.startsWith('token='));
            if (tokenCookieString) {
                const token = tokenCookieString.split('=')[1];
                if (token) {
                    try {
                        jwt.verify(token, jwtSecret, {}, (err, userData) => {
                            if (err) {
                                console.error(err);
                                connection.terminate();
                            } else {
                                const {userId, username} = userData;
                                connection.userId = userId;
                                connection.username = username;
                            }
                        });
                    } catch (err) {
                        console.error(err);
                        connection.terminate();
                    }
                }
            }
        }

        async function handleNewMessage(messageData, connection) {
            const {recipient, text, file} = messageData;
            let filename = null;
            if (file) {
                const parts = file.name.split('.');
                const ext = parts[parts.length - 1];
                filename = Date.now() + '.' + ext;
                const path = __dirname + '/uploads/' + filename;
                const bufferData = Buffer.from(file.data.split(',')[1], 'base64');
                fs.writeFile(path, bufferData, (err) => {
                    if (err) {
                        console.error(err);
                    } else {
                        console.log('file saved:' + path);
                    }
                });
            }
            if (recipient && (text || file)) {
                const messageDoc = await Message.create({
                    sender: connection.userId,
                    recipient,
                    text,
                    file: file ? filename : null,
                });
                [...wss.clients]
                    .filter(c => c.userId === recipient)
                    .forEach(c => c.send(JSON.stringify({
                        text,
                        sender: connection.userId,
                        recipient,
                        file: file ? filename : null,
                        _id: messageDoc._id,
                    })));
            }
        }

        async function handleTyping(messageData, connection) {
            [...wss.clients]
                .filter(c => c.userId === messageData.recipient)
                .forEach(c => c.send(JSON.stringify({
                    typing: true,
                    sender: connection.userId,
                })));
        }

        async function handleDelete(messageData, connection) {
            const message = await Message.findById(messageData.delete);
            if (message.sender.toString() === connection.userId) {
                await Message.findByIdAndUpdate(messageData.delete, {text: 'This message was deleted'});
                [...wss.clients]
                    .filter(c => c.userId === messageData.recipient)
                    .forEach(c => c.send(JSON.stringify({
                        delete: messageData.delete,
                    })));
            }
        }

        async function handleEdit(messageData, connection) {
            const message = await Message.findById(messageData.edit.messageId);
            if (message.sender.toString() === connection.userId) {
                await Message.findByIdAndUpdate(messageData.edit.messageId, {text: messageData.edit.text});
                [...wss.emails]
                    .filter(c => c.userId === messageData.recipient)
                    .forEach(c => c.send(JSON.stringify({
                        edit: messageData.edit,
                    })));
            }
        }

        async function handleReaction(messageData, connection) {
            const message = await Message.findById(messageData.messageId);
            if (message && (message.sender.toString() === connection.userId || message.recipient.toString() === connection.userId)) {
                await Message.findByIdAndUpdate(messageData.messageId, {$push: {reactions: messageData.reaction}});
                [...wss.clients]
                    .filter(c => c.userId === message.sender.toString() || c.userId === message.recipient.toString())
                    .forEach(c => c.send(JSON.stringify({
                        reaction: messageData.reaction,
                        messageId: messageData.messageId,
                        sender: connection.userId,
                    })));
            }
        }

        function handleSignaling(messageData, connection) {
            [...wss.clients]
                .filter(c => c.userId === messageData.recipient)
                .forEach(c => c.send(JSON.stringify({
                    ...messageData,
                    sender: connection.userId,
                })));
        }

        connection.on('message', async (message) => {
            try {
                const messageData = JSON.parse(message.toString());
                if (messageData.recipient && (typeof messageData.text === 'string' || messageData.file)) {
                    await handleNewMessage(messageData, connection);
                } else if (messageData.typing && messageData.recipient) {
                    await handleTyping(messageData, connection);
                } else if (messageData.delete && mongoose.Types.ObjectId.isValid(messageData.delete)) {
                    await handleDelete(messageData, connection);
                } else if (messageData.edit && mongoose.Types.ObjectId.isValid(messageData.edit.messageId) && typeof messageData.edit.text === 'string') {
                    await handleEdit(messageData, connection);
                } else if (messageData.reaction && mongoose.Types.ObjectId.isValid(messageData.messageId) && typeof messageData.reaction === 'string') {
                    await handleReaction(messageData, connection);
                } else if (messageData.recipient && (messageData['call-offer'] || messageData['call-answer'] || messageData['ice-candidate'] || messageData['call-hangup'] || messageData['call-decline'])) {
                    handleSignaling(messageData, connection);
                }
            } catch (err) {
                console.error(err);
            }
        });

        notifyAboutOnlinePeople();
    });
}

startServer();
