export default function handler(req, res) {
  const { id } = req.query;
  
  // Secret key from Vercel env - never exposed in code or URLs
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.API_SECRET) {
    // Return 404 to hide that endpoint even exists
    return res.status(404).json({ error: "Not found" });
  }

  const channels = {
    "geminilife": {
      name: "Gemini Life",
      language: "Telugu",
      stream: "https://livestream.sunnxt.com/a4b4f71a8b4344f3a280e906657a517a/GeminiLifeB_IN_index.mpd?|drmScheme=clearkey&drmLicense=96d5157791ea4817a66a419e285a137f:d6d0ad2a9a6cc56e18d7557c7c693a37"
    },
    "adithyatv": {
      name: "Adithya TV",
      language: "Tamil",
      stream: "https://livestream.sunnxt.com/4d0eb3cde30247ada4ade679fdfbaf86/AdithyaTVB_IN_index.mpd?|drmScheme=clearkey&drmLicense=d674a1a7f43641a29bd8867d87c7259a:812f55dcde68619fc6ad95951b241d2c"
    },
    "kushitv": {
      name: "Kushi TV",
      language: "Tamil",
      stream: "https://livestream.sunnxt.com/4a736d41608849758a0aed36949ded30/KushiTVB_IN_index.mpd?|drmScheme=clearkey&drmLicense=e16421cf7c374c57a8f7e91049f58cd9:b7e01aba2c307b1f05057e91a9d150d2"
    },
    "chuttitv": {
      name: "Chutti TV",
      language: "Tamil",
      stream: "https://livestream.sunnxt.com/3ed29d5b01b546eaa05d184cd87535f1/ChuttiTVB_IN_index.mpd?|drmScheme=clearkey&drmLicense=05da38a46fb7403088f41434e44de980:488046139a1e1d65323cfe4bb1b30b7b"
    },
    "kochutv": {
      name: "Kochu TV",
      language: "Malayalam",
      stream: "https://livestream.sunnxt.com/1893b9ab790747cb80a584873a608dcb/KochuTVB_IN_index.mpd?|drmScheme=clearkey&drmLicense=7354fb333b0c4159bc6c433c4db13d0f:fbf8b4a11febf7d2eed2283006979176"
    },
    "chintutv": {
      name: "Chintu TV",
      language: "Kannada",
      stream: "https://livestream.sunnxt.com/ed4c67ad957644b69361651d9101/ChintuTVB_IN_index.mpd?|drmScheme=clearkey&drmLicense=19d8a5cc002f411b89b33925acdc33e0:2a9aa7a3f69834c4f348430cc3f658bb"
    }
  };

  // If no ID provided, return only channel names (safe)
  if (!id) {
    return res.status(200).json({ 
      channels: Object.keys(channels).map(key => ({
        id: key,
        name: channels[key].name,
        language: channels[key].language
      }))
    });
  }

  const channel = channels[id];
  if (!channel) {
    return res.status(404).json({ error: "Not found" });
  }

  // Redirect to stream with all params
  res.redirect(302, channel.stream);
}
