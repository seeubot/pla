import crypto from 'crypto';

export default function handler(req, res) {
  const { id, token, expires } = req.query;
  const SECRET = process.env.API_SECRET;

  // Check if token and expires are provided in URL
  if (token && expires) {
    const expectedToken = crypto
      .createHmac('sha256', SECRET)
      .update(`channel:${id}:${expires}`)
      .digest('hex');

    if (token !== expectedToken) {
      return res.status(403).send('Invalid token');
    }

    if (Date.now() > parseInt(expires)) {
      return res.status(403).send('Token expired');
    }
  }
  // Check API key header
  else if (req.headers['x-api-key'] === SECRET) {
    // Valid
  }
  else {
    return res.status(404).send('Not found');
  }

  const channels = {
    "geminilife": "https://livestream.sunnxt.com/a4b4f71a8b4344f3a280e906657a517a/GeminiLifeB_IN_index.mpd?|drmScheme=clearkey&drmLicense=96d5157791ea4817a66a419e285a137f:d6d0ad2a9a6cc56e18d7557c7c693a37",
    "adithyatv": "https://livestream.sunnxt.com/4d0eb3cde30247ada4ade679fdfbaf86/AdithyaTVB_IN_index.mpd?|drmScheme=clearkey&drmLicense=d674a1a7f43641a29bd8867d87c7259a:812f55dcde68619fc6ad95951b241d2c",
    "kushitv": "https://livestream.sunnxt.com/4a736d41608849758a0aed36949ded30/KushiTVB_IN_index.mpd?|drmScheme=clearkey&drmLicense=e16421cf7c374c57a8f7e91049f58cd9:b7e01aba2c307b1f05057e91a9d150d2",
    "chuttitv": "https://livestream.sunnxt.com/3ed29d5b01b546eaa05d184cd87535f1/ChuttiTVB_IN_index.mpd?|drmScheme=clearkey&drmLicense=05da38a46fb7403088f41434e44de980:488046139a1e1d65323cfe4bb1b30b7b",
    "kochutv": "https://livestream.sunnxt.com/1893b9ab790747cb80a584873a608dcb/KochuTVB_IN_index.mpd?|drmScheme=clearkey&drmLicense=7354fb333b0c4159bc6c433c4db13d0f:fbf8b4a11febf7d2eed2283006979176",
    "chintutv": "https://livestream.sunnxt.com/ed4c67ad957644b69361651d9101/ChintuTVB_IN_index.mpd?|drmScheme=clearkey&drmLicense=19d8a5cc002f411b89b33925acdc33e0:2a9aa7a3f69834c4f348430cc3f658bb"
  };

  const streamUrl = channels[id];
  if (!streamUrl) {
    return res.status(404).send('Channel not found');
  }

  res.redirect(302, streamUrl);
}
