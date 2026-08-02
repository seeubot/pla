import crypto from 'crypto';

export default function handler(req, res) {
  if (req.headers['x-api-key'] !== process.env.API_SECRET) {
    return res.status(404).json({ error: "Not found" });
  }

  const { id, type, hours } = req.query;
  const SECRET = process.env.API_SECRET;
  const validHours = hours ? parseInt(hours) : 720;
  const expires = Date.now() + validHours * 3600000;
  const data = type === 'playlist' ? 'playlist' : `channel:${id}`;
  const token = crypto.createHmac('sha256', SECRET).update(`${data}:${expires}`).digest('hex');

  let url;
  if (type === 'playlist') {
    url = `https://serverfile-sigma.vercel.app/api/playlist?token=${token}&expires=${expires}`;
  } else if (id) {
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
