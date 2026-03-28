// Vercel Serverless Function - JamberTech E-SERVICES API
// Build step mein _handler.mjs same directory mein banta hai
// Vercel underscore wali files ko function nahi samajhta — sirf helper file hai
// api/index.js is _handler.mjs ko import karke use karta hai

module.exports = async (req, res) => {
  const { default: app } = await import("./_handler.mjs");
  return app(req, res);
};
