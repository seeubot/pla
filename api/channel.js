import crypto from 'crypto';

export default function handler(req, res) {
  const { id, token, expires } = req.query;
  const SECRET = process.env.API_SECRET;

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
  else if (req.headers['x-api-key'] === SECRET) {
    // Valid
  }
  else {
    return res.status(404).send('Not found');
  }

  const channels = {
    "sunneohd": "https://livestream.sunnxt.com/248c92b73514435686fd72ba325d4008/SunNeoHDB_IN_index.mpd?|drmScheme=clearkey&drmLicense=09ffaaff477d490abb4516b7e0711d35:759cc157a993e8a76ff4d675e34b5400",
    "suntv": "https://livestream.sunnxt.com/05b5df1221764bca9867054c5e65ee62/SunTVB_IN_index.mpd?|drmScheme=clearkey&drmLicense=6752015acf084572a08dfe21796f8b45:ff823ddbe5625c35d3e93f0ed4520115",
    "suntvhd": "https://livestream.sunnxt.com/19ee29194c4d4fc286c3e697362e60cd/SunTVHDB_IN_index.mpd?|drmScheme=clearkey&drmLicense=3891557f1cb14dedb7545bf52499d748:fb662f742e5f5e0c61a7c1c66d2b019a",
    "sunmarathi": "https://livestream.sunnxt.com/b0aacde03b744564870634ecb10e8a31/SunMarathiB_IN_index.mpd?|drmScheme=clearkey&drmLicense=5ea90a1f3b1e4a0a9b72c8e0f4a9bf31:30899fda5ca4dfb5a4535ce10c4d7341",
    "sunmusic": "https://livestream.sunnxt.com/585bb66e95c84ccea3f828c96b3567b5/SunMusicB_IN_index.mpd?|drmScheme=clearkey&drmLicense=21ddc14c4da94c079d4f4c343ecdcd80:5701bee4ee9b625d0c8ed7de032a7478",
    "sunmusichd": "https://livestream.sunnxt.com/d434796d90fa4dc9b7ecfacedbe683f1/SunMusicHDB_IN_index.mpd?|drmScheme=clearkey&drmLicense=b5a2c6d13b9748de9ceebc0a8adc8af3:e806fec1bf1c8a844216118c94bad020",
    "sunlife": "https://livestream.sunnxt.com/6b79451f54284b3fb680fd717ee008dc/SunLifeB_IN_index.mpd?|drmScheme=clearkey&drmLicense=81546df3f41c4a6dbc9a4efc7f2fb626:3928505f4054cf1fa935276fdbe40992",
    "sunbangla": "https://livestream.sunnxt.com/bf76ee92dd01473bb2eb57d137294484/SunBanglaB_IN_index.mpd?|drmScheme=clearkey&drmLicense=01f7b9f7bf7e425f86d6dfd478390e3f:5fde68100a7856d055038236ffc7c84a",
    "sunnews": "https://livestream.sunnxt.com/491c99fb6d0c49e88e6349170d890a2f/SunNewsB_IN_index.mpd?|drmScheme=clearkey&drmLicense=4df8f920386e4346ba6b7d7ae935d668:c5fcaa8df5663365d938a50987f71b84",
    "ktv": "https://livestream.sunnxt.com/6ae70edd4c1440379f5311e8fbddc7c1/KTVB_IN_index.mpd?|drmScheme=clearkey&drmLicense=426117d115b04497b0b0d425e8095184:aa751ae8a41ac6f87141734163ffe3b2",
    "ktvhd": "https://livestream.sunnxt.com/61477b4c8d8d45d5a49e044cc1dffc60/KTVHDB_IN_index.mpd?|drmScheme=clearkey&drmLicense=351e547391bb45cbac66d2cb9ec0c294:3bd646753f4903eee3b404646c7819d3",
    "surya": "https://livestream.sunnxt.com/30612a1b269d4a18aa14657641c47515/SuryaTVB_IN_index.mpd?|drmScheme=clearkey&drmLicense=56e1f5b5b72e4e45a98b6f287c265ab9:6dee8663e63cc8f8dda8478b8b2f3b71",
    "suryahd": "https://livestream.sunnxt.com/d719fad367614ee5baad747822767ad8/SuryaTVHDB_IN_index.mpd?|drmScheme=clearkey&drmLicense=eae838ccd75d4a1fbff6fd7dd1c97780:8259ce0c112725a4d2c94d154207425f",
    "suryamovies": "https://livestream.sunnxt.com/e24ee14c395945bd8ccb065e1bce8b9b/SuryaMoviesB_IN_index.mpd?|drmScheme=clearkey&drmLicense=6b67bccef7024f2da29b42e10dc13f89:2e8460c47d3f01693e193dba5963a5e1",
    "suryamusic": "https://livestream.sunnxt.com/8c2352ff54954e7b9a4188045dcf3b27/SuryaMusicB_IN_index.mpd?|drmScheme=clearkey&drmLicense=25a1d2a4c3f848b1aed911ad691fe232:3c8b2cf8611c343e6a231b6a9c7c8b58",
    "suryacomedy": "https://livestream.sunnxt.com/6505e922bf164423ad122f404747356a/SuryaComedyB_IN_index.mpd?|drmScheme=clearkey&drmLicense=11563b00a46b43f2a0f80ecf42a4fb77:9bad28ad6f23dbb917c63ee680f66a1f",
    "udaya": "https://livestream.sunnxt.com/e2f36b5d0be74780a041a8f5b65bc7e6/UdayaTVB_IN_index.mpd?|drmScheme=clearkey&drmLicense=3084683c80234b6bbf69abfd5bb258a0:4ae6b547e5c8f51329a12d7953ee4c72",
    "udayahd": "https://livestream.sunnxt.com/a8d28f18944c4946ad7133938860e7cf/UdayaTVHDB_IN_index.mpd?|drmScheme=clearkey&drmLicense=91b5f2d0205c4527b7aa3e41f35e1e7f:66ddb1a017753f966e20442ab2f91f18",
    "udayamovies": "https://livestream.sunnxt.com/1c02547243c041eea5dab1c343018e90/UdayaMoviesB_IN_index.mpd?|drmScheme=clearkey&drmLicense=b4dbffb517824732a955ca02dd6aacd9:83c2aa2946432f1ded7c049efe79feef",
    "udayamusic": "https://livestream.sunnxt.com/8034b7519d6a4ab8929aa4279fda1f29/UdayaMusicB_IN_index.mpd?|drmScheme=clearkey&drmLicense=9ac3472b0040459cab52035ead6fe1ae:ba9fe9dd1b8e5421e2f8c9d23bd86922",
    "udayacomedy": "https://livestream.sunnxt.com/8a3d3d8d679b4f9f83a8305b4ead0644/UdayaComedyB_IN_index.mpd?|drmScheme=clearkey&drmLicense=71329783aeb74e6e9e1014fb9e4c30f4:1e025a9ed7e50fa35b8de2c96cccdd6b",
    "geminitv": "https://livestream.sunnxt.com/a1a61fa1811c4d20a5c2d5e14cdc0cd2/GeminiTVB_IN_index.mpd?|drmScheme=clearkey&drmLicense=2ec6fa5b77ff4223a376c2b98032fbf8:afe96f602fd6abedcd9c2c8cdf799afd",
    "geminihd": "https://livestream.sunnxt.com/e778d9c98488494b9c9b38f9c48b63ec/GeminiTVHDB_IN_index.mpd?|drmScheme=clearkey&drmLicense=880dc94460af4197bbbf43a176fb3a95:0beb7012ffd133360889d5d56e20de4d",
    "geminimovies": "https://livestream.sunnxt.com/6a59979ff0044fd3b6e0cb85d6f44432/GeminiMoviesB_IN_index.mpd?|drmScheme=clearkey&drmLicense=0c37231880034787bce9fd3607aa09ea:e063bb30351dac572bac24ed43d304b2",
    "geminimovieshd": "https://livestream.sunnxt.com/ec0d4961a002442295f91efc9d675c9d/GeminiMoviesHDB_IN_index.mpd?|drmScheme=clearkey&drmLicense=0c37231880034787bce9fd3607aa09ea:e063bb30351dac572bac24ed43d304b2",
    "geminimusic": "https://livestream.sunnxt.com/52b94f70c6e64692b2497f5023b629cd/GeminiMusicB_IN_index.mpd?|drmScheme=clearkey&drmLicense=0faa2e9469fc45fdaf1728333351ec71:ffcf9dee6ede62bd8740dacfaa0c1e59",
    "geminimusichd": "https://livestream.sunnxt.com/6a6520e446604c6e9840e5bf3a3a7d95/GeminiMusicHDB_IN_index.mpd?|drmScheme=clearkey&drmLicense=76230567f3c04513a7e5d1249ab65983:4ee6dc9a99d894dc41b0878d6ea22790",
    "geminicomedy": "https://livestream.sunnxt.com/167c40e9521b470b87b4cf921fd0e146/GeminiComedyB_IN_index.mpd?|drmScheme=clearkey&drmLicense=93e686ceac134f30b0a7bc3ce5a76b26:2c37e97fa0646751e1f2b85bc4b9ff8a",
    "geminilife": "https://livestream.sunnxt.com/a4b4f71a8b4344f3a280e906657a517a/GeminiLifeB_IN_index.mpd?|drmScheme=clearkey&drmLicense=96d5157791ea4817a66a419e285a137f:d6d0ad2a9a6cc56e18d7557c7c693a37",
    "adithyatv": "https://livestream.sunnxt.com/4d0eb3cde30247ada4ade679fdfbaf86/AdithyaTVB_IN_index.mpd?|drmScheme=clearkey&drmLicense=d674a1a7f43641a29bd8867d87c7259a:812f55dcde68619fc6ad95951b241d2c",
    "kushitv": "https://livestream.sunnxt.com/4a736d41608849758a0aed36949ded30/KushiTVB_IN_index.mpd?|drmScheme=clearkey&drmLicense=e16421cf7c374c57a8f7e91049f58cd9:b7e01aba2c307b1f05057e91a9d150d2",
    "chuttitv": "https://livestream.sunnxt.com/3ed29d5b01b546eaa05d184cd87535f1/ChuttiTVB_IN_index.mpd?|drmScheme=clearkey&drmLicense=05da38a46fb7403088f41434e44de980:488046139a1e1d65323cfe4bb1b30b7b",
    "kochutv": "https://livestream.sunnxt.com/1893b9ab790747cb80a584873a608dcb/KochuTVB_IN_index.mpd?|drmScheme=clearkey&drmLicense=7354fb333b0c4159bc6c433c4db13d0f:fbf8b4a11febf7d2eed2283006979176",
    "chintutv": "https://livestream.sunnxt.com/ed4c67ad957644b69361651d9101107e/ChintuTVB_IN_index.mpd?|drmScheme=clearkey&drmLicense=19d8a5cc002f411b89b33925acdc33e0:2a9aa7a3f69834c4f348430cc3f658bb"
  };

  const streamUrl = channels[id];
  if (!streamUrl) {
    return res.status(404).json({ 
      error: 'Channel not found',
      available_channels: Object.keys(channels)
    });
  }

  res.redirect(302, streamUrl);
}
