process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
process.env.API_BASE_URL =
  process.env.API_BASE_URL || "http://localhost:3000/api";
process.env.EMAIL_FROM =
  process.env.EMAIL_FROM || "AqarDot Tests <test@aqardot.com>";
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || "test-resend-key";
process.env.ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "30m";
process.env.ACCESS_TOKEN_MAXAGE_MS =
  process.env.ACCESS_TOKEN_MAXAGE_MS || String(30 * 60 * 1000);
process.env.ENFORCE_EMAIL_VERIFICATION =
  process.env.ENFORCE_EMAIL_VERIFICATION || "false";
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test-client-id";
