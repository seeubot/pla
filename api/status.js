export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Get the app's current version from query params
  const appVersion = req.query.version || '0';
  const appVersionCode = parseInt(req.query.versionCode || '0');

  // Server version info
  const serverVersion = process.env.APP_VERSION || '1.0.1';
  const serverVersionCode = parseInt(process.env.VERSION_CODE || '4');
  const forceUpdate = process.env.FORCE_UPDATE === 'true';
  const maintenance = process.env.MAINTENANCE === 'true';

  // Check if update is needed
  const needsUpdate = forceUpdate && appVersionCode < serverVersionCode;

  res.status(200).json({
    maintenance: maintenance,
    update: needsUpdate,
    version: serverVersion,
    versionCode: serverVersionCode,
    currentVersion: appVersion,
    currentVersionCode: appVersionCode,
    title: maintenance ? "System Maintenance" : (needsUpdate ? "Update Required" : "Chill Box"),
    message: maintenance 
      ? "Our servers are currently undergoing scheduled maintenance."
      : (needsUpdate 
        ? `A new version (v${serverVersion}) is available! Please update to continue.`
        : "Chill Box is up to date."),
    telegram: "https://t.me/+PEc2GpjasuExYzFl",
    apkUrl: "",
    eta: maintenance ? "2 hours" : null,
    releaseDate: "2026-08-13"
  });
}
