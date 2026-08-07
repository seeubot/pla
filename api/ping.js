import https from 'https';

export default async function handler(req, res) {
  const results = {};
  
  // Test 1: Can Vercel reach GitHub?
  try {
    const data = await fetchUrl('https://raw.githubusercontent.com/amitfunny/sunnxt.m3u/refs/heads/main/index.html');
    results.github = {
      success: true,
      length: data.length,
      hasM3U: data.includes('#EXTINF:'),
      preview: data.substring(0, 150)
    };
  } catch(e) {
    results.github = { success: false, error: e.message };
  }
  
  // Test 2: Can Vercel reach any HTTPS?
  try {
    const data = await fetchUrl('https://httpbin.org/get');
    results.httpbin = { success: true, length: data.length };
  } catch(e) {
    results.httpbin = { success: false, error: e.message };
  }
  
  res.status(200).json(results);
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 10000 }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
    }).on('error', reject);
  });
}
