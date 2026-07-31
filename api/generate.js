import crypto from 'crypto';

export default function handler(req, res) {
  // Check API key
  if (req.headers['x-api-key'] !== process.env.API_SECRET) {
    return res.status(404).json({ error: "Not found" });
  }

  const { id, type, hours } = req.query;
  const SECRET = process.env.API_SECRET;

  // Token valid for specified hours (default 720 hours = 30 days)
  const validHours = hours ? parseInt(hours) : 720;
  const expires = Date.now() + validHours * 3600000;

  // Generate token
  const data = type === 'playlist' ? 'playlist' : `channel:${id}`;
  const token = crypto
    .createHmac('sha256', SECRET)
    .update(`${data}:${expires}`)
    .digest('hex');

  let url;

  if (type === 'playlist') {
    // Generate playlist URL
    url = `https://serverfile-sigma.vercel.app/api/playlist?token=${token}&expires=${expires}`;
  } else if (id) {
    // Generate channel URL
    url = `https://serverfile-sigma.vercel.app/api/channel?id=${id}&token=${token}&expires=${expires}`;
  } else {
    return res.status(400).json({ error: "Missing 'id' or 'type=playlist'" });
  }

  res.status(200).json({
    success: true,
    type: type === 'playlist' ? 'playlist' : 'channel',
    channel: id || 'all',
    url: url,
    expires: new Date(expires).toISOString(),
    valid_for_hours: validHours
  });
}
