import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { token, expires } = req.query;
  const SECRET = process.env.API_SECRET;

  if (token && expires) {
    const expectedToken = crypto
      .createHmac('sha256', SECRET)
      .update(`playlist:${expires}`)
      .digest('hex');
    if (token !== expectedToken) return res.status(403).send('Invalid token');
    if (Date.now() > parseInt(expires)) return res.status(403).send('Token expired');
  } else if (req.headers['x-api-key'] === SECRET) {
    // Valid
  } else {
    return res.status(404).send('Not found');
  }

  const userAgent = req.headers['user-agent'] || '';
  const browserKeywords = ['Mozilla', 'Chrome', 'Safari', 'Firefox', 'Edge', 'Opera'];
  if (browserKeywords.some(k => userAgent.includes(k))) {
    return res.status(403).send('Access denied. Use this URL in IPTV player only.');
  }

  const filePath = path.join(process.cwd(), 'data', 'channels.json');
  const channels = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let playlist = '#EXTM3U\n';
  channels.forEach(ch => {
    // Check if channel has servers array
    if (ch.servers && ch.servers.length > 0) {
      ch.servers.forEach(server => {
        playlist += `#EXTINF:-1 tvg-language="${ch.language}" tvg-logo="${ch.logo}" group-title="${ch.group}",${ch.name} (${server.name})\n`;
        playlist += `#KODIPROP:inputstream.adaptive.license_type=${server.drm || ''}\n`;
        playlist += `#KODIPROP:inputstream.adaptive.license_key=${server.license || ''}\n`;
        playlist += `${server.url}\n`;
      });
    } else if (ch.url) {
      // Single URL channel
      playlist += `#EXTINF:-1 tvg-language="${ch.language}" tvg-logo="${ch.logo}" group-title="${ch.group}",${ch.name}\n`;
      playlist += `#KODIPROP:inputstream.adaptive.license_type=${ch.drm || ''}\n`;
      playlist += `#KODIPROP:inputstream.adaptive.license_key=${ch.license || ''}\n`;
      playlist += `${ch.url}\n`;
    }
  });

  res.setHeader('Content-Type', 'audio/x-mpegurl');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(playlist);
}
