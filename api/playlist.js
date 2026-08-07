import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

export default async function handler(req, res) {
  const sourcesPath = path.join(process.cwd(), 'data', 'sources.json');
  const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
  const src = sources.find(s => s.enabled);
  
  const content = await fetchUrl(src.url);
  const parsed = parseM3U(content);
  
  res.status(200).json({
    source: src.name,
    totalParsed: parsed.length,
    first5: parsed.slice(0, 5).map(c => ({ name: c.name, url: c.url?.substring(0, 60) })),
  });
}

function extractName(line) {
  const stdMatch = line.match(/,([^,]+)$/);
  if (stdMatch && stdMatch[1].trim().length > 1) return stdMatch[1].trim();
  
  const quotes = line.split('"');
  if (quotes.length >= 2) {
    const afterLastQuote = quotes[quotes.length - 1].trim();
    if (afterLastQuote && afterLastQuote.length > 1 && !afterLastQuote.startsWith('http')) {
      return afterLastQuote;
    }
  }
  
  return 'Unknown';
}

function parseM3U(content) {
  const lines = content.split('\n');
  const channels = {};
  let cur = { name: '', logo: null, group: 'Chill Box', language: '', clearKey: null, url: null, serverName: null };
  let pendingClearKey = null;
  
  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;
    
    if (l.startsWith('#KODIPROP:') && l.includes('license_key=')) {
      pendingClearKey = l.split('license_key=')[1]?.trim();
      continue;
    }
    
    if (l.startsWith('#EXTINF:')) {
      if (cur.url && cur.name && cur.url.length > 5) {
        addCh(channels, cur);
      }
      
      cur = {
        name: extractName(l),
        logo: (l.match(/tvg-logo="([^"]+)"/) || [])[1] || null,
        group: (l.match(/group-title="([^"]+)"/) || [])[1] || 'Chill Box',
        language: (l.match(/tvg-language="([^"]+)"/) || [])[1] || '',
        clearKey: pendingClearKey,
        url: null,
        serverName: null
      };
      pendingClearKey = null;
      
    } else if ((l.startsWith('https://') || l.startsWith('http://')) && !l.startsWith('#')) {
      cur.url = l;
      if (cur.name && cur.url.length > 5) {
        addCh(channels, cur);
        cur = { name: '', logo: null, group: 'Chill Box', language: '', clearKey: null, url: null, serverName: null };
      }
    }
  }
  
  if (cur.url && cur.name && cur.url.length > 5) {
    addCh(channels, cur);
  }
  
  return Object.values(channels);
}

function addCh(dict, ch) {
  if (!ch.url || ch.url.length < 5) return;
  let base = ch.name.replace(/\s+(HD|SD|4K|FHD|UHD)\s*$/gi, '').trim();
  if (!base) base = ch.name.trim();
  
  const id = base.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  
  if (!dict[id]) {
    dict[id] = { id, name: base, servers: [{ name: 'SD', url: ch.url, drm: ch.clearKey ? 'clearkey' : '', license: ch.clearKey || '' }] };
  } else {
    if (!dict[id].servers.some(s => s.url === ch.url)) {
      dict[id].servers.push({ name: 'HD', url: ch.url, drm: ch.clearKey ? 'clearkey' : '', license: ch.clearKey || '' });
    }
  }
}

function fetchUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}
