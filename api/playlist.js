import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

export default async function handler(req, res) {
  const { token, expires } = req.query;
  const SECRET = process.env.API_SECRET;

  // Auth check
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
    const sourcesPath = path.join(process.cwd(), 'data', 'sources.json');
    const filterPath = path.join(process.cwd(), 'data', 'filter.json');
    
    // Load filter
    let filter = null;
    if (fs.existsSync(filterPath)) {
      try {
        filter = JSON.parse(fs.readFileSync(filterPath, 'utf-8'));
        console.log('Filter loaded successfully');
      } catch(e) {
        console.log('Filter parse error:', e.message);
      }
    }
    
    // Merge all channels from sources
    let channelMap = {};
    
    if (fs.existsSync(sourcesPath)) {
      const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
      
      for (const source of sources) {
        if (!source.enabled) continue;
        
        try {
          console.log(`Fetching: ${source.name}`);
          const content = await fetchUrl(source.url);
          const parsed = parseM3U(content);
          console.log(`  Parsed: ${parsed.length} channels`);
          
          let kept = 0;
          for (const ch of parsed) {
            // APPLY FILTER
            if (!shouldKeep(ch, filter)) {
              continue;
            }
            kept++;
            
            addCh(channelMap, ch);
          }
          console.log(`  Kept after filter: ${kept}`);
        } catch (e) {
          console.log(`  Failed: ${source.name} - ${e.message}`);
        }
      }
    }
    
    const channels = Object.values(channelMap);
    console.log(`Total filtered channels: ${channels.length}`);
    
    // Show merged channels with multiple servers
    for (const ch of channels) {
      if (ch.servers && ch.servers.length > 1) {
        console.log(`  ${ch.name}: ${ch.servers.length} servers (${ch.servers.map(s => s.name).join(', ')})`);
      }
    }
    
    // Generate M3U playlist
    let playlist = '#EXTM3U\n';
    playlist += `# CHILL BOX - ${channels.length} channels\n`;
    
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
    console.error('Error:', e);
    res.status(500).json({ error: e.message });
  }
}

function shouldKeep(channel, filter) {
  // If no filter or empty groups, allow everything
  if (!filter) return true;
  if (!filter.groups || Object.keys(filter.groups).length === 0) {
    if (filter.whitelist && filter.whitelist.length > 0) {
      const name = (channel.name || '').toLowerCase().trim();
      return filter.whitelist.some(w => name.includes(w.toLowerCase().trim()));
    }
    return true;
  }
  
  const name = (channel.name || '').toLowerCase().trim();
  
  // Check all groups
  for (const groupConfig of Object.values(filter.groups)) {
    const keywords = groupConfig.keywords || [];
    for (const kw of keywords) {
      const keyword = kw.toLowerCase().trim();
      if (name.includes(keyword) || keyword.includes(name)) {
        return true;
      }
    }
  }
  
  // Also check old whitelist
  if (filter.whitelist && filter.whitelist.length > 0) {
    return filter.whitelist.some(w => name.includes(w.toLowerCase().trim()));
  }
  
  return false;
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      },
      timeout: 15000
    };
    
    client.get(url, options, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        fetchUrl(response.headers.location).then(resolve).catch(reject);
        return;
      }
      
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
      response.on('error', reject);
    }).on('error', reject).on('timeout', () => { reject(new Error('Timeout')); });
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
        name: (l.match(/,([^,]+)$/) || ['', 'Unknown'])[1].trim(),
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
  // Clean base name - remove quality suffixes for merging
  let base = ch.name
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(/\s*\[.*?\]\s*/g, '')
    .replace(/\s+(4K|FHD|UHD|HD|SD|HEVC|H264|H265|RAW|VIP)\s*$/gi, '')
    .trim();
  
  if (!base || base.length < 2) base = ch.name.trim();
  
  // Detect server name
  let srvName = ch.serverName;
  if (!srvName) {
    const qMatch = ch.name.match(/(4K|FHD|UHD|HD|SD|HEVC)/i);
    srvName = qMatch ? qMatch[0].toUpperCase() : 'SD';
  }
  
  const srv = { 
    name: srvName, 
    url: ch.url, 
    drm: ch.clearKey ? 'clearkey' : '', 
    license: ch.clearKey || '' 
  };
  
  // Use cleaned base name as ID
  const id = base.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  
  if (!dict[id]) {
    dict[id] = { 
      id: id, 
      name: base, 
      language: ch.language, 
      logo: ch.logo, 
      group: ch.group || 'Chill Box', 
      servers: [srv] 
    };
  } else {
    // Check for duplicate URL
    if (!dict[id].servers.some(s => s.url === ch.url)) {
      // If server name already exists, add source suffix
      const sameName = dict[id].servers.filter(s => s.name === srvName);
      if (sameName.length > 0) {
        try {
          const urlHost = new URL(ch.url).hostname;
          const shortHost = urlHost.replace('www.', '').split('.')[0];
          srv.name = srvName + ' (' + shortHost + ')';
        } catch {
          srv.name = srvName + ' (' + (sameName.length + 1) + ')';
        }
      }
      dict[id].servers.push(srv);
    }
    // Update logo if missing
    if (ch.logo && !dict[id].logo) dict[id].logo = ch.logo;
  }
}
