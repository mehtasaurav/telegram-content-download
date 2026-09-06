require('dotenv').config();
const express = require('express');
const cors = require('cors');
const auth = require('./modules/user-authorization/auth.service');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Check if already logged in
app.get('/auth/status', async (req, res) => {
  const authorized = await auth.isAuthorized();
  res.json({ authorized });
});

// Step 1: Send OTP to phone number
app.post('/auth/send-code', async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber is required' });
  try {
    await auth.sendCode(phoneNumber);
    res.json({ message: 'Code sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Step 2: Verify OTP code
app.post('/auth/sign-in', async (req, res) => {
  const { phoneNumber, code } = req.body;
  if (!phoneNumber || !code) return res.status(400).json({ error: 'phoneNumber and code are required' });
  try {
    const { sessionString } = await auth.signIn(phoneNumber, code);
    res.json({ message: 'Signed in', sessionString });
  } catch (err) {
    // Telegram throws SessionPasswordNeededError if 2FA is enabled
    if (err.message.includes('PASSWORD_HASH_INVALID') || err.message.includes('SESSION_PASSWORD_NEEDED')) {
      return res.status(403).json({ error: '2FA required', require2FA: true });
    }
    res.status(500).json({ error: err.message });
  }
});

// Step 3 (only if 2FA): Submit password
app.post('/auth/2fa', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'password is required' });
  try {
    const { sessionString } = await auth.signInWith2FA(password);
    res.json({ message: 'Signed in with 2FA', sessionString });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/download', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  // TODO: handle download logic
  res.json({ message: 'Received', url });
});

app.get('/groups', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const result = await auth.getGroups(limit, offset);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/groups/:id/photo', async (req, res) => {
  try {
    const buffer = await auth.getGroupPhoto(req.params.id);
    if (!buffer || buffer.length === 0) return res.status(404).end();
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/groups/:id/content', async (req, res) => {
  try {
    const type = req.query.type || 'all';
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const result = await auth.getGroupContent(req.params.id, type, limit, offset);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
