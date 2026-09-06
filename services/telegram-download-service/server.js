require('dotenv').config();
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'telegram-download-service' }));

// TODO: implement media download from Telegram using message ID + group ID
app.post('/download', (req, res) => {
  const { groupId, messageId } = req.body;
  if (!groupId || !messageId) return res.status(400).json({ error: 'groupId and messageId are required' });
  res.json({ message: 'Download queued', groupId, messageId });
});

app.listen(PORT, () => console.log(`[telegram-download-service] running on port ${PORT}`));
