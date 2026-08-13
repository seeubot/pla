export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  res.status(200).json({
    maintenance: false,
    update: true, // Set to true when you want to force update
    version: "1.0.1",
    versionCode: 4,
    title: "Update Required",
    message: "Please update Chill Box to the latest version",
    apkUrl: "",
    telegram: "https://t.me/+PEc2GpjasuExYzFl"
  });
}
