import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { id, token, expires } = req.query;
  const SECRET = process.env.API_SECRET;

  if (token && expires) {
    const expectedToken = crypto
      .createHmac('sha256', SECRET)
      .update(`channel:${id}:${expires}`)
      .digest('hex');
    if (token !== expectedToken) return res.status(403).send('Invalid token');
    if (Date.now() > parseInt(expires)) return res.status(403).send('Token expired');
  } else if (req.headers['x-api-key'] === SECRET) {
    // Valid
  } else {
    return res.status(404).send('Not found');
  }

  const filePath = path.join(process.cwd(), 'data', 'channels.json');
  const channels = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const channel = channels.find(c => c.id === id);

  if (!channel) {
    return res.status(404).json({ error: 'Channel not found', available_channels: channels.map(c => c.id) });
  }

  const streamUrl = `${channel.url}?|drmScheme=${channel.drm}&drmLicense=${channel.license}`;
  res.redirect(302, streamUrl);
}
