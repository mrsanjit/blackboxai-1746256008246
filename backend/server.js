const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

// In-memory data stores
let users = [];
let tweets = [];
let sessions = {};
let follows = {};

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Helper functions
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function authenticate(req, res, next) {
  const token = req.headers['authorization'];
  if (!token || !sessions[token]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = sessions[token];
  next();
}

// Routes

// Signup
app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  const user = { id: generateId(), username, password };
  users.push(user);
  res.json({ message: 'User created' });
});

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateId();
  sessions[token] = user;
  res.json({ token, username: user.username });
});

// Logout
app.post('/logout', authenticate, (req, res) => {
  const token = req.headers['authorization'];
  delete sessions[token];
  res.json({ message: 'Logged out' });
});

// Post a tweet
app.post('/tweet', authenticate, (req, res) => {
  const { content } = req.body;
  if (!content || content.length > 280) {
    return res.status(400).json({ error: 'Invalid tweet content' });
  }
  const tweet = {
    id: generateId(),
    userId: req.user.id,
    username: req.user.username,
    content,
    timestamp: new Date()
  };
  tweets.push(tweet);
  res.json({ message: 'Tweet posted', tweet });
});

// Get timeline (tweets from followed users and self)
app.get('/timeline', authenticate, (req, res) => {
  const userId = req.user.id;
  const following = follows[userId] || [];
  const timelineTweets = tweets.filter(t => t.userId === userId || following.includes(t.userId));
  timelineTweets.sort((a, b) => b.timestamp - a.timestamp);
  res.json(timelineTweets);
});

// Follow a user
app.post('/follow', authenticate, (req, res) => {
  const { userIdToFollow } = req.body;
  if (!users.find(u => u.id === userIdToFollow)) {
    return res.status(400).json({ error: 'User to follow not found' });
  }
  if (userIdToFollow === req.user.id) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }
  if (!follows[req.user.id]) {
    follows[req.user.id] = [];
  }
  if (!follows[req.user.id].includes(userIdToFollow)) {
    follows[req.user.id].push(userIdToFollow);
  }
  res.json({ message: 'User followed' });
});

// Unfollow a user
app.post('/unfollow', authenticate, (req, res) => {
  const { userIdToUnfollow } = req.body;
  if (!follows[req.user.id]) {
    return res.status(400).json({ error: 'Not following anyone' });
  }
  follows[req.user.id] = follows[req.user.id].filter(id => id !== userIdToUnfollow);
  res.json({ message: 'User unfollowed' });
});

// Get user profile
app.get('/profile/:username', authenticate, (req, res) => {
  const { username } = req.params;
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const userTweets = tweets.filter(t => t.userId === user.id);
  res.json({
    username: user.username,
    tweets: userTweets
  });
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
