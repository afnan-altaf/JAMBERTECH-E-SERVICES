// Vercel Serverless Function - JamberTech E-SERVICES API
// Build command (pnpm run vercel-build) pehle handler.mjs banata hai
// phir ye file us handler ko use karta hai

module.exports = async (req, res) => {
  const { default: app } = await import(
    "../artifacts/api-server/dist/vercel/handler.mjs"
  );
  return app(req, res);
};
