export const COOKIE_NAME =
  process.env.NODE_ENV === "production" && process.env.HTTPS === "true"
    ? "__Host-session"
    : "session";
