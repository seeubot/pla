import crypto from 'crypto';

export default function handler(req, res) {
  if (req.headers['x-api-key'] !== process.env.API_SECRET) {
    return res.status(404).json({ error: "Not found" });
  }

  const { type, hours } = req.query;
  const validHours = hours ? parseInt(hours) : 720;
  const expires = Date.now() + validHours * 3600000;
  const token = crypto.createHmac('sha256', process.env.API_SECRET).update(`playlist:${expires}`).digest('hex');

  const url = `https://chillboxiptv.vercel.app/api/playlist?token=${token}&expires=${expires}`;

  res.status(200).json({
    success: true,
    type: 'playlist',
    channel: 'all',
    url: url,
    expires: new Date(expires).toISOString(),
    valid_for_hours: validHours
  });
}
