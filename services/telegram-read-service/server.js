require('dotenv').config();
const express = require('express');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

const API_ID = parseInt(process.env.API_ID);
const API_HASH = process.env.API_HASH;

let client = null;

async function getClient() {
  if (!client) {
    client = new TelegramClient(new StringSession(process.env.SESSION_STRING || ''), API_ID, API_HASH, {
      connectionRetries: 2,
      useWSS: true,
    });
    await client.connect();
  }
  return client;
}

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'telegram-read-service' }));

app.get('/groups', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const c = await getClient();
    const dialogs = await c.getDialogs({ limit: 200 });

    const all = dialogs
      .filter(d => d.entity instanceof Api.Chat || d.entity instanceof Api.Channel)
      .map(d => {
        const e = d.entity;
        return {
          id: e.id.toString(),
          name: e.title,
          type: e instanceof Api.Channel && !e.megagroup ? 'channel' : 'group',
          memberCount: e.participantsCount ?? null,
          createdAt: e.date ? new Date(e.date * 1000).toISOString() : null,
          scam: e.scam ?? false,
          fake: e.fake ?? false,
          restricted: e.restricted ?? false,
        };
      });

    res.json({ groups: all.slice(offset, offset + limit), total: all.length, offset, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/groups/:id/photo', async (req, res) => {
  try {
    const c = await getClient();
    const dialogs = await c.getDialogs({ limit: 200 });
    const dialog = dialogs.find(
      d => (d.entity instanceof Api.Chat || d.entity instanceof Api.Channel) &&
           d.entity.id.toString() === req.params.id
    );
    if (!dialog) return res.status(404).end();
    const buffer = await c.downloadProfilePhoto(dialog.entity);
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
    const c = await getClient();
    const dialogs = await c.getDialogs({ limit: 200 });

    const dialog = dialogs.find(
      d => (d.entity instanceof Api.Chat || d.entity instanceof Api.Channel) &&
           d.entity.id.toString() === req.params.id
    );
    if (!dialog) return res.status(404).json({ error: 'Group not found' });

    const messages = await c.getMessages(dialog.entity, { limit: 200 });

    const categorize = (msg) => {
      const media = msg.media;
      if (!media) return 'chat';
      if (media.className === 'MessageMediaPhoto') return 'image';
      if (media.className === 'MessageMediaDocument') {
        const mime = media.document?.mimeType || '';
        if (mime.startsWith('video/')) return 'video';
        if (mime === 'application/pdf') return 'pdf';
        if (mime.startsWith('image/')) return 'image';
        return 'other';
      }
      return 'other';
    };

    const getFileName = (msg) => {
      const attrs = msg.media?.document?.attributes || [];
      const a = attrs.find(x => x.className === 'DocumentAttributeFilename');
      return a?.fileName || null;
    };

    const all = messages
      .filter(msg => msg.message !== undefined)
      .map(msg => ({
        id: msg.id.toString(),
        type: categorize(msg),
        text: msg.message || '',
        date: msg.date ? new Date(msg.date * 1000).toISOString() : null,
        fileName: getFileName(msg),
        fileSize: msg.media?.document?.size ? Number(msg.media.document.size) : null,
        mimeType: msg.media?.document?.mimeType || (msg.media?.className === 'MessageMediaPhoto' ? 'image/jpeg' : null),
      }));

    const filtered = type === 'all' ? all : all.filter(m => m.type === type);
    res.json({ items: filtered.slice(offset, offset + limit), total: filtered.length, offset, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`[telegram-read-service] running on port ${PORT}`));
