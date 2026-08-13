export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  res.status(200).json({
    version: "1.0.1", // Increment this when you have new APK
    versionCode: 2,   // Increment this too
    forceUpdate: true, // Set to true to force update
    updateUrl: "https://t.me/+PEc2GpjasuExYzFl",
    apkUrl: "https://serverfile-sigma.vercel.app/chillbox-v1.0.1.apk", // Direct APK download
    apkSize: "24.5 MB", // Optional: Show APK size
    message: "A new version of Chill Box is available! Please update to continue.",
    releaseDate: "2026-08-13",
    changelog: [
      "Fixed video player crashes",
      "Added new channel sources",
      "Improved stream stability",
      "Bug fixes and performance improvements"
    ]
  });
}
