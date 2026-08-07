import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

export default async function handler(req, res) {
  const { token, expires } = req.query;
  const SECRET = process.env.API_SECRET;

  // Authentication
  if (token && expires) {
    const expected = crypto.createHmac('sha256', SECRET).update(`playlist:${expires}`).digest('hex');
    if (token !== expected) return res.status(403).send('Invalid token');
    if (Date.now() > parseInt(expires)) return res.status(403).send('Token expired');
  } else if (req.headers['x-api-key'] === SECRET) {
    // Valid API key
  } else {
    return res.status(404).send('Not found');
  }

  try {
    const sourcesPath = path.join(process.cwd(), 'data', 'sources.json');
    const filterPath = path.join(process.cwd(), 'data', 'filter.json');

    // Load filter configuration
    let filter = null;
    if (fs.existsSync(filterPath)) {
      try { 
        filter = JSON.parse(fs.readFileSync(filterPath, 'utf-8')); 
      } catch(e) {
        console.error('Error loading filter:', e);
      }
    }

    let channelMap = {};
    let debugInfo = [];
    let hiddenTextRemoved = 0;
    let totalSources = 0;
    let successfulSources = 0;

    if (fs.existsSync(sourcesPath)) {
      const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));

      for (const source of sources) {
        if (!source.enabled) {
          debugInfo.push(`${source.name}: DISABLED`);
          continue;
        }
        
        totalSources++;

        try {
          debugInfo.push(`${source.name}: Fetching...`);
          const content = await fetchUrl(source.url);
          
          if (!content || content.length < 10) {
            debugInfo.push(`${source.name}: EMPTY response`);
            continue;
          }

          if (content.includes('<!DOCTYPE') || content.includes('<html')) {
            debugInfo.push(`${source.name}: Got HTML instead of playlist`);
            continue;
          }

          let parsed = [];

          // Auto-detect format (M3U or JSON)
          if (content.trim().startsWith('#EXTM3U') || content.includes('#EXTINF:')) {
            // M3U format
            parsed = parseM3U(content, source.name);
            debugInfo.push(`${source.name}: M3U format - ${parsed.length} channels`);
          } else if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
            // JSON format
            parsed = parseJSON(content, source.name);
            debugInfo.push(`${source.name}: JSON format - ${parsed.length} channels`);
          } else {
            debugInfo.push(`${source.name}: Unknown format`);
            continue;
          }

          successfulSources++;

          // Process each channel
          for (const ch of parsed) {
            // Remove @rtxcric from channel names
            const originalName = ch.name;
            ch.name = ch.name
              .replace(/@rtxcric/gi, '')
              .replace(/\s+/g, ' ')
              .trim();
            
            if (originalName !== ch.name) {
              hiddenTextRemoved++;
            }

            // Apply filter if exists
            if (filter && !shouldKeep(ch, filter)) continue;

            // Add to channel map
            if (ch.servers && ch.servers.length > 0) {
              for (const srv of ch.servers) {
                if (!srv.url || srv.url.length < 5) continue;
                
                const flat = {
                  name: ch.name,
                  logo: ch.logo,
                  group: ch.group || 'Chill Box',
                  language: ch.language,
                  drm: srv.drm || '',
                  license: srv.license || '',
                  url: srv.url,
                  serverName: srv.name || 'SD'
                };
                
                addCh(channelMap, flat);
              }
            }
          }
        } catch (e) {
          debugInfo.push(`${source.name}: ERROR - ${e.message}`);
        }
      }
    }

    const channels = Object.values(channelMap);

    // Sort channels alphabetically
    channels.sort((a, b) => a.name.localeCompare(b.name));

    // Generate M3U playlist
    let playlist = '#EXTM3U\n';
    playlist += `#EXTINF:-1,CHILL BOX - IPTV\n`;
    playlist += `# GENERATED: ${new Date().toISOString()}\n`;
    playlist += `# SOURCES: ${successfulSources}/${totalSources} successful\n`;
    playlist += `# CHANNELS: ${channels.length}\n`;
    if (hiddenTextRemoved > 0) {
      playlist += `# NOTE: ${hiddenTextRemoved} channel names cleaned\n`;
    }
    playlist += `\n`;

    for (const ch of channels) {
      if (ch.servers && ch.servers.length > 0) {
        for (const srv of ch.servers) {
          if (!srv.url || srv.url.length < 5) continue;
          
          playlist += `#EXTINF:-1 `;
          if (ch.language) playlist += `tvg-language="${ch.language}" `;
          if (ch.logo) playlist += `tvg-logo="${ch.logo}" `;
          playlist += `group-title="${ch.group || 'Chill Box'}" `;
          if (srv.name) playlist += `server-name="${srv.name}" `;
          playlist += `,${ch.name}\n`;
          
          if (srv.drm) {
            playlist += `#KODIPROP:inputstream.adaptive.license_type=${srv.drm}\n`;
          }
          if (srv.license) {
            playlist += `#KODIPROP:inputstream.adaptive.license_key=${srv.license}\n`;
          }
          
          playlist += `${srv.url}\n`;
        }
      }
    }

    // Set headers
    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    res.status(200).send(playlist);

  } catch (e) {
    console.error('Playlist generation error:', e);
    res.status(500).json({ 
      error: 'Failed to generate playlist',
      message: e.message 
    });
  }
}

// ============ HELPER FUNCTIONS ============

function extractName(line) {
  // Try standard M3U format first
  const stdMatch = line.match(/,([^,]+)$/);
  if (stdMatch && stdMatch[1].trim().length > 1) {
    const name = stdMatch[1].trim();
    // Make sure it's not a URL
    if (!name.startsWith('http')) return name;
  }
  
  // Try to get name from quotes
  const quotes = line.split('"');
  if (quotes.length >= 2) {
    const after = quotes[quotes.length - 1].trim();
    if (after && after.length > 1 && !after.startsWith('http')) return after;
  }
  
  return 'Unknown';
}

function fetchUrl(url, redirects = 0) {
  return new Promise((resolve) => {
    if (redirects > 5) {
      resolve('');
      return;
    }

    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive'
      },
      timeout: 15000
    }, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        fetchUrl(response.headers.location, redirects + 1).then(resolve);
        return;
      }
      
      if (response.statusCode !== 200) {
        resolve('');
        return;
      }
      
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
      response.on('error', () => resolve(''));
    });
    
    req.on('error', () => resolve(''));
    req.on('timeout', () => { 
      req.destroy(); 
      resolve(''); 
    });
  });
}

function parseM3U(content, sourceName = '') {
  const lines = content.split('\n');
  const channels = {};
  let currentChannel = null;
  let pendingDrm = null;
  let pendingLicense = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Handle KODIPROP for DRM
    if (trimmed.startsWith('#KODIPROP:')) {
      if (trimmed.includes('license_type=')) {
        pendingDrm = trimmed.split('license_type=')[1]?.trim();
      }
      if (trimmed.includes('license_key=')) {
        pendingLicense = trimmed.split('license_key=')[1]?.trim();
      }
      continue;
    }

    // Handle EXTINF
    if (trimmed.startsWith('#EXTINF:')) {
      // Save previous channel
      if (currentChannel && currentChannel.url) {
        addParsedChannel(channels, currentChannel);
      }

      // Extract channel info
      const name = extractName(trimmed);
      const logo = (trimmed.match(/tvg-logo="([^"]+)"/) || [])[1] || null;
      const group = (trimmed.match(/group-title="([^"]+)"/) || [])[1] || 'Chill Box';
      const language = (trimmed.match(/tvg-language="([^"]+)"/) || [])[1] || '';
      const serverName = (trimmed.match(/server-name="([^"]+)"/) || [])[1] || 'SD';

      currentChannel = {
        name,
        logo,
        group,
        language,
        drm: pendingDrm || '',
        license: pendingLicense || '',
        url: null,
        serverName
      };

      // Reset pending DRM
      pendingDrm = null;
      pendingLicense = null;
      continue;
    }

    // Handle URLs
    if ((trimmed.startsWith('https://') || trimmed.startsWith('http://')) && currentChannel) {
      currentChannel.url = trimmed;
      addParsedChannel(channels, currentChannel);
      currentChannel = null;
    }
  }

  // Handle last channel
  if (currentChannel && currentChannel.url) {
    addParsedChannel(channels, currentChannel);
  }

  return Object.values(channels);
}

function parseJSON(content, sourceName = '') {
  try {
    const data = JSON.parse(content);
    let channels = [];

    // Handle different JSON structures
    if (Array.isArray(data)) {
      // Direct array of channels
      channels = data;
    } else if (data.channels && Array.isArray(data.channels)) {
      // Object with channels array
      channels = data.channels;
    } else if (data.data && Array.isArray(data.data)) {
      // Object with data array
      channels = data.data;
    }

    // Convert JSON channels to M3U-like structure
    return channels.map(ch => ({
      name: ch.name || ch.title || 'Unknown',
      logo: ch.logo || ch.tvgLogo || null,
      group: ch.group || ch.groupTitle || 'Chill Box',
      language: ch.language || '',
      drm: ch.drm || '',
      license: ch.license || ch.licenseKey || '',
      servers: ch.servers || (ch.url ? [{ name: 'SD', url: ch.url, drm: ch.drm || '', license: ch.license || '' }] : [])
    }));
  } catch (e) {
    console.error(`Error parsing JSON from ${sourceName}:`, e);
    return [];
  }
}

function addParsedChannel(dict, ch) {
  if (!ch.url || ch.url.length < 5) return;
  
  // Clean channel name
  let base = ch.name
    .replace(/@rtxcric/gi, '')
    .replace(/\s+(HD|SD|4K|FHD|UHD|HEVC|H265|H264)\s*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (!base) base = ch.name.trim();
  
  const id = base.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  
  const server = {
    name: ch.serverName || 'SD',
    url: ch.url,
    drm: ch.drm || '',
    license: ch.license || ''
  };

  if (!dict[id]) {
    dict[id] = {
      id,
      name: base,
      language: ch.language || '',
      logo: ch.logo,
      group: ch.group || 'Chill Box',
      servers: [server]
    };
  } else {
    // Add server if not duplicate
    if (!dict[id].servers.some(s => s.url === ch.url)) {
      dict[id].servers.push(server);
    }
  }
}

function shouldKeep(channel, filter) {
  if (!filter || !filter.enabled) return true;
  
  const name = (channel.name || '').toLowerCase().trim();
  
  // Check if channel should be included based on filter rules
  if (filter.include && filter.include.length > 0) {
    return filter.include.some(keyword => 
      name.includes(keyword.toLowerCase().trim())
    );
  }
  
  // Check if channel should be excluded
  if (filter.exclude && filter.exclude.length > 0) {
    return !filter.exclude.some(keyword => 
      name.includes(keyword.toLowerCase().trim())
    );
  }
  
  return true;
}

function addCh(dict, ch) {
  if (!ch.url || ch.url.length < 5) return;
  
  // Clean channel name
  let base = ch.name
    .replace(/@rtxcric/gi, '')
    .replace(/\s+(HD|SD|4K|FHD|UHD|HEVC|H265|H264)\s*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (!base) base = ch.name.trim();
  
  const id = base.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  
  const server = {
    name: ch.serverName || 'SD',
    url: ch.url,
    drm: ch.drm || '',
    license: ch.license || ''
  };

  if (!dict[id]) {
    dict[id] = {
      id,
      name: base,
      language: ch.language || '',
      logo: ch.logo,
      group: ch.group || 'Chill Box',
      servers: [server]
    };
  } else {
    // Update group if it was default and new one is not
    if (dict[id].group === 'Chill Box' && ch.group && ch.group !== 'Chill Box') {
      dict[id].group = ch.group;
    }
    // Update logo if exists
    if (!dict[id].logo && ch.logo) {
      dict[id].logo = ch.logo;
    }
    // Add server if not duplicate
    if (!dict[id].servers.some(s => s.url === ch.url)) {
      dict[id].servers.push(server);
    }
  }
}
