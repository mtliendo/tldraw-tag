import { Auth0Client } from "@auth0/nextjs-auth0/server";

export function isAuth0Enabled(): boolean {
  return Boolean(
    process.env.AUTH0_DOMAIN &&
      process.env.AUTH0_CLIENT_ID &&
      process.env.AUTH0_CLIENT_SECRET &&
      process.env.AUTH0_SECRET &&
      process.env.APP_BASE_URL,
  );
}

export function isDevBypass(): boolean {
  return process.env.DEV_BYPASS_AUTH === "true";
}

export const auth0 = isAuth0Enabled()
  ? new Auth0Client({
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      secret: process.env.AUTH0_SECRET,
      appBaseUrl: process.env.APP_BASE_URL,
      authorizationParameters: {
        scope: "openid profile email",
        audience: process.env.AUTH0_AUDIENCE,
      },
    })
  : null;
