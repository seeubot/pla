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
        console.log('Filter loaded');
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
          const content = await fetchUrlWithRetry(source.url, source.name);
          
          if (!content || content.length < 10) {
            console.log(`  Empty response from ${source.name}`);
            continue;
          }
          
          // Try multiple parsers
          let parsed = parseM3U(content);
          
          // If first parser found nothing, try alternative
          if (parsed.length === 0) {
            parsed = parseM3UAlt(content);
          }
          
          console.log(`  Parsed: ${parsed.length} channels from ${source.name}`);
          
          let kept = 0;
          for (const ch of parsed) {
            if (!ch.url || ch.url === 'undefined' || ch.url.length < 5) continue;
            if (!shouldKeep(ch, filter)) continue;
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
    
    // Generate M3U playlist
    let playlist = '#EXTM3U\n';
    playlist += `# CHILL BOX - ${channels.length} channels\n`;
    
    for (const ch of channels) {
      if (ch.servers && ch.servers.length > 0) {
        for (const srv of ch.servers) {
          if (!srv.url || srv.url === 'undefined' || srv.url.length < 5) continue;
          
          playlist += `#EXTINF:-1 tvg-language="${ch.language||''}" tvg-logo="${ch.logo||''}" group-title="${ch.group||'Chill Box'}" server-name="${srv.name}",${ch.name}\n`;
          if (srv.drm) playlist += `#KODIPROP:inputstream.adaptive.license_type=${srv.drm}\n`;
          if (srv.license) playlist += `#KODIPROP:inputstream.adaptive.license_key=${srv.license}\n`;
          playlist += `${srv.url}\n`;
        }
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

// ========== FETCH WITH RETRY & MULTIPLE HEADER SETS ==========

async function fetchUrlWithRetry(url, sourceName) {
  // Try different header combinations
  const headerSets = [
    // Set 1: Standard browser
    {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    // Set 2: IPTV player
    {
      'User-Agent': 'IPTVPlayer/1.0',
      'Accept': 'audio/x-mpegurl, application/x-mpegurl, */*',
    },
    // Set 3: VLC
    {
      'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
      'Accept': '*/*',
    },
    // Set 4: Mobile
    {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36',
      'Accept': '*/*',
    }
  ];
  
  // Add Referer for specific sources
  if (url.includes('servertvhub')) {
    headerSets.forEach(h => h['Referer'] = 'https://servertvhub.site/');
  }
  
  for (const headers of headerSets) {
    try {
      const content = await fetchUrl(url, headers);
      if (content && content.length > 50) {
        // Check if it's HTML (error page)
        if (content.includes('<!DOCTYPE') || content.includes('<html')) {
          console.log(`  Got HTML from ${sourceName}, trying next headers...`);
          continue;
        }
        return content;
      }
    } catch(e) {
      continue;
    }
  }
  
  console.log(`  All header sets failed for ${sourceName}`);
  return '';
}

function fetchUrl(url, headers) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const options = {
      headers: headers,
      timeout: 15000
    };
    
    client.get(url, options, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        fetchUrl(response.headers.location, headers).then(resolve).catch(reject);
        return;
      }
      
      // Skip non-200
      if (response.statusCode !== 200) {
        resolve('');
        return;
      }
      
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
      response.on('error', reject);
    }).on('error', (e) => resolve('')).on('timeout', () => resolve(''));
  });
}

// ========== PRIMARY PARSER (Handles KODIPROP before EXTINF) ==========

function parseM3U(content) {
  const lines = content.split('\n');
  const channels = {};
  let cur = { name: '', logo: null, group: 'Chill Box', language: '', clearKey: null, url: null, serverName: null };
  let pendingClearKey = null;
  let pendingDrm = null;
  
  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;
    
    // Handle KODIPROP before EXTINF (Sunnxt format)
    if (l.startsWith('#KODIPROP:') && l.includes('license_key=')) {
      pendingClearKey = l.split('license_key=')[1]?.trim();
      continue;
    }
    if (l.startsWith('#KODIPROP:') && l.includes('license_type=')) {
      pendingDrm = l.split('license_type=')[1]?.trim();
      continue;
    }
    
    if (l.startsWith('#EXTINF:')) {
      // Save previous channel
      if (cur.url && cur.name && cur.url.length > 5) {
        addCh(channels, cur);
      }
      
      // Parse new channel - get name from end after comma
      const nameMatch = l.match(/,([^,]+)$/);
      cur = {
        name: nameMatch ? nameMatch[1].trim() : 'Unknown',
        logo: (l.match(/tvg-logo="([^"]+)"/) || [])[1] || null,
        group: (l.match(/group-title="([^"]+)"/) || [])[1] || 'Chill Box',
        language: (l.match(/tvg-language="([^"]+)"/) || [])[1] || '',
        clearKey: pendingClearKey,
        drm: pendingDrm,
        url: null,
        serverName: (l.match(/server-name="([^"]+)"/) || [])[1] || null
      };
      pendingClearKey = null;
      pendingDrm = null;
      
    } else if ((l.startsWith('https://') || l.startsWith('http://')) && !l.startsWith('#')) {
      cur.url = l;
      if (cur.name && cur.url.length > 5) {
        addCh(channels, cur);
        cur = { name: '', logo: null, group: 'Chill Box', language: '', clearKey: null, url: null, serverName: null };
      }
    }
  }
  
  // Last channel
  if (cur.url && cur.name && cur.url.length > 5) {
    addCh(channels, cur);
  }
  
  return Object.values(channels);
}

// ========== ALTERNATIVE PARSER (Handles Sony format - URL right after EXTINF) ==========

function parseM3UAlt(content) {
  const lines = content.split('\n');
  const channels = {};
  
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l || !l.startsWith('#EXTINF:')) continue;
    
    // Get channel name
    const nameMatch = l.match(/,([^,]+)$/);
    const name = nameMatch ? nameMatch[1].trim() : 'Unknown';
    const logo = (l.match(/tvg-logo="([^"]+)"/) || [])[1] || null;
    const group = (l.match(/group-title="([^"]+)"/) || [])[1] || 'Chill Box';
    
    // Look for URL in next few lines
    let url = '';
    for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
      const nl = lines[j].trim();
      if (nl.startsWith('https://') || nl.startsWith('http://')) {
        url = nl;
        break;
      }
      if (nl.startsWith('#EXTINF:')) break; // Next channel
    }
    
    if (url && url.length > 5) {
      const ch = { name, logo, group, language: '', clearKey: null, url, serverName: null };
      addCh(channels, ch);
    }
  }
  
  return Object.values(channels);
}

// ========== FILTER ==========

function shouldKeep(channel, filter) {
  if (!filter) return true;
  
  const name = (channel.name || '').toLowerCase().trim();
  
  // Empty groups = allow all
  if (!filter.groups || Object.keys(filter.groups).length === 0) {
    if (filter.whitelist && filter.whitelist.length > 0) {
      return filter.whitelist.some(w => name.includes(w.toLowerCase().trim()));
    }
    return true;
  }
  
  // Check groups
  for (const groupConfig of Object.values(filter.groups)) {
    const keywords = groupConfig.keywords || [];
    for (const kw of keywords) {
      if (name.includes(kw.toLowerCase().trim()) || kw.toLowerCase().trim().includes(name)) {
        return true;
      }
    }
  }
  
  if (filter.whitelist && filter.whitelist.length > 0) {
    return filter.whitelist.some(w => name.includes(w.toLowerCase().trim()));
  }
  
  return false;
}

// ========== ADD CHANNEL ==========

function addCh(dict, ch) {
  if (!ch.url || ch.url === 'undefined' || ch.url.length < 5) return;
  
  let base = ch.name
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(/\s*\[.*?\]\s*/g, '')
    .replace(/\s+(4K|FHD|UHD|HD|SD|HEVC|H264|H265|RAW|VIP)\s*$/gi, '')
    .trim();
  
  if (!base || base.length < 2) base = ch.name.trim();
  
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
  
  const id = base.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  
  if (!dict[id]) {
    dict[id] = { 
      id, name: base, 
      language: ch.language, 
      logo: ch.logo, 
      group: ch.group || 'Chill Box', 
      servers: [srv] 
    };
  } else {
    if (!dict[id].servers.some(s => s.url === ch.url)) {
      const sameName = dict[id].servers.filter(s => s.name === srvName);
      if (sameName.length > 0) {
        try {
          const host = new URL(ch.url).hostname.replace('www.', '').split('.')[0];
          srv.name = srvName + ' (' + host + ')';
        } catch {
          srv.name = srvName + ' (' + (sameName.length + 1) + ')';
        }
      }
      dict[id].servers.push(srv);
    }
    if (ch.logo && !dict[id].logo) dict[id].logo = ch.logo;
  }
}
