
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const sourcesPath = path.join(process.cwd(), 'data', 'sources.json');
  const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
  
  // Test with first enabled source
  const src = sources.find(s => s.enabled);
  
  const content = await fetchUrl(src.url);
  
  const lines = content.split('\n');
  const sample = lines.slice(0, 20).join('\n');
  
  res.status(200).json({
    source: src.name,
    totalLines: lines.length,
    first20: sample,
    hasEXTINF: content.includes('#EXTINF:'),
    hasHTTP: content.includes('https://')
  });
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const http = require('http');
    const client = url.startsWith('https') ? https : http;
    client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' },
      timeout: 10000
    }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
    }).on('error', reject);
  });
}
