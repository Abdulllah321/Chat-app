
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();
mongoose.connect(process.env.MONGO_URL);
const User = require('./models/User');
const Message = require('./models/Message');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const ws = require('ws');
const fs = require('fs');

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = process.env.JWT_SECRET;

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: 'http://localhost:5173',
}));
app.use('/uploads', express.static(__dirname + '/uploads'));

const uploadsDir = __dirname + '/uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

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
            res.cookie('token', token, {sameSite: 'none', secure: true}).status(201).json({
                id: createdUser._id,
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
                res.cookie('token', token, {sameSite: 'none', secure: true}).json({
                    id: foundUser._id,
                });
            });
        } else {
            res.status(401).json('incorrect password');
        }
    } else {
        res.status(404).json('user not found');
    }
});

app.get('/profile', (req, res) => {
    const token = req.cookies?.token;
    if (token) {
        try {
            jwt.verify(token, jwtSecret, {}, (err, userData) => {
                if (err) {
                    res.status(401).json('invalid token');
                } else {
                    res.json(userData);
                }
            });
        } catch (err) {
            res.status(500).json('error');
        }
    } else {
        res.status(401).json('no token');
    }
});

async function getUserDataFromRequest(req) {
    return new Promise((resolve, reject) => {
        const token = req.cookies?.token;
        if (token) {
            try {
                jwt.verify(token, jwtSecret, {}, (err, userData) => {
                    if (err) {
                        reject('invalid token');
                    } else {
                        resolve(userData);
                    }
                });
            } catch (err) {
                reject('error');
            }
        } else {
            reject('no token');
        }
    });
}

app.get('/people', async (req, res) => {
    const users = await User.find({}, {'_id':1, username:1});
    res.json(users);
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

const server = app.listen(4040);

const wss = new ws.WebSocketServer({server});
wss.on('connection', (connection, req) => {

    function notifyAboutOnlinePeople() {
        [...wss.clients].forEach(client => {
            client.send(JSON.stringify({
                online: [...wss.clients].map(c => ({userId: c.userId, username: c.username})),
            }));
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
            [...wss.clients]
                .filter(c => c.userId === messageData.recipient)
                .forEach(c => c.send(JSON.stringify({
                    edit: messageData.edit,
                })));
        }
    }

    async function handleReaction(messageData, connection) {
        const message = await Message.findById(messageData.messageId);
        if (message) {
            await Message.findByIdAndUpdate(messageData.messageId, {$push: {reactions: messageData.reaction}});
            [...wss.clients]
                .filter(c => c.userId === messageData.recipient)
                .forEach(c => c.send(JSON.stringify({
                    reaction: messageData.reaction,
                    messageId: messageData.messageId,
                    sender: connection.userId,
                })));
        }
    }

    connection.on('message', async (message) => {
        try {
            const messageData = JSON.parse(message.toString());
            if (messageData.recipient && (messageData.text || messageData.file)) {
                await handleNewMessage(messageData, connection);
            } else if (messageData.typing) {
                await handleTyping(messageData, connection);
            } else if (messageData.delete) {
                await handleDelete(messageData, connection);
            } else if (messageData.edit) {
                await handleEdit(messageData, connection);
            } else if (messageData.reaction) {
                await handleReaction(messageData, connection);
            }
        } catch (err) {
            console.error(err);
        }
    });

    notifyAboutOnlinePeople();
});
