export default function handler(req, res) {
  res.status(200).json({
    version: "1.0.1",
    versionCode: 2,
    updateUrl: "https://your-download-link.com/app-release.apk",
    forceUpdate: true,
    message: "New channels added! Zee Tamil, Zee Bangala, and more.",
    releaseDate: "2026-08-04"
  });
}
