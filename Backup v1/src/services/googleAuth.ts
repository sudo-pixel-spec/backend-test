import { OAuth2Client } from "google-auth-library";

let client: OAuth2Client | null = null;

function getClient() {
  if (!client) client = new OAuth2Client();
  return client;
}

export async function verifyGoogleCredential(idToken: string) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) throw new Error("Missing env: GOOGLE_CLIENT_ID");

  const ticket = await getClient().verifyIdToken({
    idToken,
    audience: googleClientId
  });

  const payload = ticket.getPayload();
  if (!payload) throw new Error("Invalid Google token payload");

  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified,
    name: payload.name,
    picture: payload.picture
  };
}