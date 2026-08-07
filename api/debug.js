import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

export default async function handler(req, res) {
  const data = {
    sources: [],
    errors: []
  };
  
  const sourcesPath = path.join(process.cwd(), 'data', 'sources.json');
  const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
  
  for (const src of sources) {
    if (!src.enabled) continue;
    
    try {
      const content = await fetchUrl(src.url);
      const lines = content.split('\n');
      const extinf = lines.filter(l => l.trim().startsWith('#EXTINF:')).length;
      const urls = lines.filter(l => l.trim().startsWith('http')).length;
      
      data.sources.push({
        name: src.name,
        lines: lines.length,
        extinf: extinf,
        urls: urls,
        sample: content.substring(0, 200)
      });
    } catch(e) {
      data.errors.push(`${src.name}: ${e.message}`);
    }
  }
  
  res.status(200).json(data);
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' },
      timeout: 10000
    }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
      response.on('error', reject);
    }).on('error', reject);
  });
}
