export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');

  // ===== CONFIGURATION - Edit these to control the app =====
  const config = {
    // Set to true to show maintenance screen
    maintenance: false,
    
    // Set to true to force update
    update: true,
    
    // Maintenance screen settings
    title: "Server Maintenance",
    message: "Our servers are currently undergoing maintenance. Please check back later or join our Telegram channel for live updates.",
    eta: "2026-08-06 12:00 AM IST",
    
    // Update screen settings
    version: "1.0.1",
    
    // Telegram channel for updates
    telegram: "https://t.me/+PEc2GpjasuExYzFl",
  };
  // ==========================================================

  res.status(200).json(config);
}
