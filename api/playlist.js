import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import https from 'http';
import http from 'http';

export default async function handler(req, res) {
  const { token, expires } = req.query;
  const SECRET = process.env.API_SECRET;

  // Auth
  if (token && expires) {
    const expected = crypto.createHmac('sha256', SECRET).update(`playlist:${expires}`).digest('hex');
    if (token !== expected) return res.status(403).send('Invalid token');
    if (Date.now() > parseInt(expires)) return res.status(403).send('Token expired');
  } else if (req.headers['x-api-key'] === SECRET) {
    // Valid
  } else {
    return res.status(404).send('Not found');
  }

  try {
    const channelsPath = path.join(process.cwd(), 'data', 'channels.json');
    const sourcesPath = path.join(process.cwd(), 'data', 'sources.json');
    const filterPath = path.join(process.cwd(), 'data', 'filter.json');
    
    // Load existing channels
    let channelMap = {};
    if (fs.existsSync(channelsPath)) {
      const existing = JSON.parse(fs.readFileSync(channelsPath, 'utf-8'));
      for (const ch of existing) {
        channelMap[ch.id] = ch;
      }
    }
    
    // Load filter
    let filter = null;
    if (fs.existsSync(filterPath)) {
      filter = JSON.parse(fs.readFileSync(filterPath, 'utf-8'));
    }
    
    // Fetch from sources
    if (fs.existsSync(sourcesPath)) {
      const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
      
      for (const source of sources) {
        if (!source.enabled) continue;
        
        try {
          const content = await fetchUrl(source.url);
          const parsed = parseM3U(content);
          
          for (const ch of parsed) {
            // APPLY FILTER
            if (!shouldKeep(ch, filter)) continue;
            
            if (channelMap[ch.id]) {
              const urls = (channelMap[ch.id].servers || []).map(s => s.url);
              for (const srv of (ch.servers || [])) {
                if (!urls.includes(srv.url)) {
                  channelMap[ch.id].servers.push(srv);
                }
              }
            } else {
              ch.group = 'Chill Box';
              channelMap[ch.id] = ch;
            }
          }
        } catch (e) {
          console.log(`Failed: ${source.name} - ${e.message}`);
        }
      }
    }
    
    // Save updated channels
    const channels = Object.values(channelMap);
    if (fs.existsSync(channelsPath)) {
      fs.writeFileSync(channelsPath, JSON.stringify(channels, null, 2));
    }
    
    // Generate M3U
    let playlist = '#EXTM3U\n';
    for (const ch of channels) {
      if (ch.servers && ch.servers.length > 0) {
        for (const srv of ch.servers) {
          playlist += `#EXTINF:-1 tvg-language="${ch.language||''}" tvg-logo="${ch.logo||''}" group-title="${ch.group||'Chill Box'}" server-name="${srv.name}",${ch.name}\n`;
          if (srv.drm) playlist += `#KODIPROP:inputstream.adaptive.license_type=${srv.drm}\n`;
          if (srv.license) playlist += `#KODIPROP:inputstream.adaptive.license_key=${srv.license}\n`;
          playlist += `${srv.url}\n`;
        }
      } else if (ch.url) {
        playlist += `#EXTINF:-1 group-title="${ch.group||'Chill Box'}",${ch.name}\n`;
        playlist += `${ch.url}\n`;
      }
    }
    
    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(playlist);
    
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

function shouldKeep(channel, filter) {
  if (!filter || !filter.whitelist || filter.whitelist.length === 0) return true;
  
  const name = (channel.name || '').toLowerCase();
  return filter.whitelist.some(w => name.includes(w.toLowerCase()));
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'ChillBox/1.0' }, timeout: 15000 }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
      response.on('error', reject);
    }).on('error', reject);
  });
}

function parseM3U(content) {
  const lines = content.split('\n');
  const channels = {};
  let cur = { name: '', logo: null, group: 'Chill Box', language: '', clearKey: null, url: null, serverName: null };
  
  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;
    if (l.startsWith('#EXTINF:')) {
      if (cur.url && cur.name) addCh(channels, cur);
      cur = {
        name: (l.match(/,(.+)/) || ['', 'Unknown'])[1].trim(),
        logo: (l.match(/tvg-logo="([^"]+)"/) || [])[1] || null,
        group: (l.match(/group-title="([^"]+)"/) || [])[1] || 'Chill Box',
        language: (l.match(/tvg-language="([^"]+)"/) || [])[1] || '',
        clearKey: null, url: null,
        serverName: (l.match(/server-name="([^"]+)"/) || [])[1] || null
      };
    } else if (l.startsWith('#KODIPROP:') && l.includes('license_key=')) {
      cur.clearKey = l.split('license_key=')[1]?.trim();
    } else if ((l.startsWith('https://') || l.startsWith('http://')) && !l.startsWith('#')) {
      cur.url = l;
      if (cur.name) { addCh(channels, cur); cur = { name: '', logo: null, group: 'Chill Box', language: '', clearKey: null, url: null, serverName: null }; }
    }
  }
  if (cur.url && cur.name) addCh(channels, cur);
  return Object.values(channels);
}

function addCh(dict, ch) {
  const base = ch.name.replace(/\s*HD$/i, '').trim();
  const srv = { name: ch.serverName || (ch.name.includes('HD') ? 'HD' : 'SD'), url: ch.url, drm: ch.clearKey ? 'clearkey' : '', license: ch.clearKey || '' };
  if (!dict[base]) {
    dict[base] = { id: base.toLowerCase().replace(/[^a-z0-9_]/g, '_'), name: base, language: ch.language, logo: ch.logo, group: 'Chill Box', servers: [srv] };
  } else {
    if (!dict[base].servers.some(s => s.url === ch.url)) dict[base].servers.push(srv);
  }
}
