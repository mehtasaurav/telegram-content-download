require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Service URLs come from environment variables so they work both
// locally (localhost) and inside Docker (service hostnames).
const AUTH_URL     = process.env.AUTH_SERVICE_URL     || 'http://localhost:3001';
const READ_URL     = process.env.READ_SERVICE_URL     || 'http://localhost:3002';
const DOWNLOAD_URL = process.env.DOWNLOAD_SERVICE_URL || 'http://localhost:3003';
const GUP_URL      = process.env.GUPLOAD_SERVICE_URL  || 'http://localhost:3004';
const GDWN_URL     = process.env.GDOWNLOAD_SERVICE_URL|| 'http://localhost:3005';

// ------------------------------------------------------------------
// Health check — the gateway itself, not the downstream services
// ------------------------------------------------------------------
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

// ------------------------------------------------------------------
// Route table
// Each createProxyMiddleware call:
//   - target: where to forward the request
//   - changeOrigin: rewrite the Host header to match the target
//   - pathRewrite: strip the prefix before forwarding
//     e.g. /auth/send-code → /send-code on auth-service
// ------------------------------------------------------------------
app.use('/auth', createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: { '^/auth': '' },
}));

app.use('/groups', createProxyMiddleware({
  target: READ_URL,
  changeOrigin: true,
  pathRewrite: { '^/groups': '/groups' },
}));

app.use('/download', createProxyMiddleware({
  target: DOWNLOAD_URL,
  changeOrigin: true,
  pathRewrite: { '^/download': '/download' },
}));

app.use('/google/upload', createProxyMiddleware({
  target: GUP_URL,
  changeOrigin: true,
  pathRewrite: { '^/google/upload': '/upload' },
}));

app.use('/google/download', createProxyMiddleware({
  target: GDWN_URL,
  changeOrigin: true,
  pathRewrite: { '^/google/download': '/download' },
}));

app.listen(PORT, () => console.log(`[api-gateway] running on port ${PORT}`));
