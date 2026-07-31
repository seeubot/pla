import crypto from 'crypto';

export default function handler(req, res) {
  const { token, expires } = req.query;
  const SECRET = process.env.API_SECRET;

  // Check if token and expires are provided in URL
  if (token && expires) {
    // Verify token
    const expectedToken = crypto
      .createHmac('sha256', SECRET)
      .update(`playlist:${expires}`)
      .digest('hex');

    if (token !== expectedToken) {
      return res.status(403).send('Invalid token');
    }

    if (Date.now() > parseInt(expires)) {
      return res.status(403).send('Token expired');
    }
  }
  // Check API key header (for direct API access)
  else if (req.headers['x-api-key'] === SECRET) {
    // Valid API key
  }
  else {
    return res.status(404).send('Not found');
  }

  const playlist = `#EXTM3U
#EXTINF:-1 tvg-id="1" tvg-logo="https://sund-images.sunnxt.com/194337/640x360_TestGeminiLife_194337_1927e76e-b04a-428b-a0fc-6aa5ed06fa88.jpg" group-title="Sunnxt Telugu",Gemini Life
#KODIPROP:inputstream.adaptive.manifest_type=mpd
#KODIPROP:inputstream.adaptive.license_type=clearkey
#KODIPROP:inputstream.adaptive.license_key=96d5157791ea4817a66a419e285a137f:d6d0ad2a9a6cc56e18d7557c7c693a37
https://livestream.sunnxt.com/a4b4f71a8b4344f3a280e906657a517a/GeminiLifeB_IN_index.mpd

#EXTINF:-1 tvg-id="2" tvg-logo="https://sund-images.sunnxt.com/194407/960x540_AdithyaTV_194407_b6f8fa30-255b-4f4a-8f8f-4264abda8b33.jpg" group-title="Sunnxt Tamil",Adithya TV
#KODIPROP:inputstream.adaptive.manifest_type=mpd
#KODIPROP:inputstream.adaptive.license_type=clearkey
#KODIPROP:inputstream.adaptive.license_key=d674a1a7f43641a29bd8867d87c7259a:812f55dcde68619fc6ad95951b241d2c
https://livestream.sunnxt.com/4d0eb3cde30247ada4ade679fdfbaf86/AdithyaTVB_IN_index.mpd

#EXTINF:-1 tvg-id="3" tvg-logo="https://sund-images.sunnxt.com/194346/960x540_KushiTV_194346_b0eff97b-4670-42fb-9d87-49d78fab6f3a.jpg" group-title="Sunnxt Tamil",Kushi TV
#KODIPROP:inputstream.adaptive.manifest_type=mpd
#KODIPROP:inputstream.adaptive.license_type=clearkey
#KODIPROP:inputstream.adaptive.license_key=e16421cf7c374c57a8f7e91049f58cd9:b7e01aba2c307b1f05057e91a9d150d2
https://livestream.sunnxt.com/4a736d41608849758a0aed36949ded30/KushiTVB_IN_index.mpd

#EXTINF:-1 tvg-id="4" tvg-logo="https://sund-images.sunnxt.com/194390/640x360_ChuttiTV_194390_61005292-313a-45b4-b6a8-3ac5128a513e.jpg" group-title="Sunnxt Tamil",Chutti TV
#KODIPROP:inputstream.adaptive.manifest_type=mpd
#KODIPROP:inputstream.adaptive.license_type=clearkey
#KODIPROP:inputstream.adaptive.license_key=05da38a46fb7403088f41434e44de980:488046139a1e1d65323cfe4bb1b30b7b
https://livestream.sunnxt.com/3ed29d5b01b546eaa05d184cd87535f1/ChuttiTVB_IN_index.mpd

#EXTINF:-1 tvg-id="5" tvg-logo="https://sund-images.sunnxt.com/194348/960x540_KochuTV_194348_9777cbfd-685b-4e06-a7cc-f2902c1874e8.jpg" group-title="Sunnxt Malayalam",Kochu TV
#KODIPROP:inputstream.adaptive.manifest_type=mpd
#KODIPROP:inputstream.adaptive.license_type=clearkey
#KODIPROP:inputstream.adaptive.license_key=7354fb333b0c4159bc6c433c4db13d0f:fbf8b4a11febf7d2eed2283006979176
https://livestream.sunnxt.com/1893b9ab790747cb80a584873a608dcb/KochuTVB_IN_index.mpd

#EXTINF:-1 tvg-id="6" tvg-logo="https://sund-images.sunnxt.com/194347/960x540_ChintuTV_194347_64af5425-0ed0-4c8a-b071-00ef86eaefde.jpg" group-title="Sunnxt Kannada",Chintu TV
#KODIPROP:inputstream.adaptive.manifest_type=mpd
#KODIPROP:inputstream.adaptive.license_type=clearkey
#KODIPROP:inputstream.adaptive.license_key=19d8a5cc002f411b89b33925acdc33e0:2a9aa7a3f69834c4f348430cc3f658bb
https://livestream.sunnxt.com/ed4c67ad957644b69361651d9101/ChintuTVB_IN_index.mpd`;

  res.setHeader('Content-Type', 'audio/x-mpegurl');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(playlist);
}
