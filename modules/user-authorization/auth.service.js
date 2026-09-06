const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.resolve(__dirname, '../../.env');
const API_ID = parseInt(process.env.API_ID);
const API_HASH = process.env.API_HASH;

let client = null;
let phoneCodeHash = null;

function saveSessionToEnv(sessionString) {
  let content = fs.readFileSync(ENV_PATH, 'utf8');
  if (content.includes('SESSION_STRING=')) {
    content = content.replace(/SESSION_STRING=.*/, `SESSION_STRING=${sessionString}`);
  } else {
    content += `\nSESSION_STRING=${sessionString}`;
  }
  fs.writeFileSync(ENV_PATH, content);
  process.env.SESSION_STRING = sessionString;
  console.log('[Auth] SESSION_STRING saved to .env');
}

function getSession() {
  return new StringSession(process.env.SESSION_STRING || '');
}

async function getClient() {
  if (!client) {
    console.log('[Auth] Creating TelegramClient...');
    client = new TelegramClient(getSession(), API_ID, API_HASH, {
      connectionRetries: 2,
      useWSS: true,
    });
    console.log('[Auth] Connecting to Telegram servers...');
    await client.connect();
    console.log('[Auth] Connected.');
  }
  return client;
}

async function isAuthorized() {
  if (!process.env.SESSION_STRING) {
    console.log('[Auth] No SESSION_STRING found, skipping auth check.');
    return false;
  }
  console.log('[Auth] Checking authorization...');
  const c = await getClient();
  const result = await c.isUserAuthorized();
  console.log('[Auth] isAuthorized:', result);
  return result;
}

async function sendCode(phoneNumber) {
  console.log('[Auth] sendCode called for:', phoneNumber);
  const c = await getClient();
  console.log('[Auth] Sending code to Telegram...');
  const result = await c.sendCode({ apiId: API_ID, apiHash: API_HASH }, phoneNumber);
  phoneCodeHash = result.phoneCodeHash;
  console.log('[Auth] Code sent successfully. phoneCodeHash received.');
  return { phoneCodeHash };
}

async function signIn(phoneNumber, code) {
  console.log('[Auth] signIn called for:', phoneNumber);
  const c = await getClient();
  console.log('[Auth] Invoking SignIn...');
  await c.invoke(
    new (require('telegram/tl').Api.auth.SignIn)({
      phoneNumber,
      phoneCodeHash,
      phoneCode: code,
    })
  );
  const sessionString = c.session.save();
  saveSessionToEnv(sessionString);
  console.log('[Auth] Sign in successful. Session saved.');
  return { sessionString };
}

async function signInWith2FA(password) {
  console.log('[Auth] signInWith2FA called.');
  const c = await getClient();
  console.log('[Auth] Submitting 2FA password...');
  await c.signInWithPassword({ apiId: API_ID, apiHash: API_HASH }, { password });
  const sessionString = c.session.save();
  saveSessionToEnv(sessionString);
  console.log('[Auth] 2FA sign in successful. Session saved.');
  return { sessionString };
}

async function getGroups(limit = 10, offset = 0) {
  console.log(`[Auth] Fetching dialogs (limit=${limit}, offset=${offset})...`);
  const c = await getClient();
  const dialogs = await c.getDialogs({ limit: 200 });

  const { Api } = require('telegram');
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

  const total = all.length;
  const page = all.slice(offset, offset + limit);
  console.log(`[Auth] Returning ${page.length} of ${total} groups.`);
  return { groups: page, total, offset, limit };
}

async function getGroupPhoto(entityId) {
  console.log('[Auth] Fetching photo for entity:', entityId);
  const c = await getClient();
  const dialogs = await c.getDialogs({ limit: 200 });
  const { Api } = require('telegram');
  const dialog = dialogs.find(d =>
    (d.entity instanceof Api.Chat || d.entity instanceof Api.Channel) &&
    d.entity.id.toString() === entityId
  );
  if (!dialog) return null;
  const buffer = await c.downloadProfilePhoto(dialog.entity);
  return buffer;
}

async function getGroupContent(groupId, type = 'all', limit = 10, offset = 0) {
  console.log(`[Auth] Fetching content for group ${groupId}, type=${type}`);
  const c = await getClient();
  const dialogs = await c.getDialogs({ limit: 200 });
  const { Api } = require('telegram');

  const dialog = dialogs.find(d =>
    (d.entity instanceof Api.Chat || d.entity instanceof Api.Channel) &&
    d.entity.id.toString() === groupId
  );
  if (!dialog) throw new Error('Group not found');

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
    const fileAttr = attrs.find(a => a.className === 'DocumentAttributeFilename');
    return fileAttr?.fileName || null;
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
      mimeType: msg.media?.document?.mimeType || msg.media?.className === 'MessageMediaPhoto' ? 'image/jpeg' : null,
    }));

  const filtered = type === 'all' ? all : all.filter(m => m.type === type);
  const total = filtered.length;
  const items = filtered.slice(offset, offset + limit);
  console.log(`[Auth] Returning ${items.length} of ${total} items (type=${type})`);
  return { items, total, offset, limit };
}

module.exports = { isAuthorized, sendCode, signIn, signInWith2FA, getGroups, getGroupPhoto, getGroupContent };
