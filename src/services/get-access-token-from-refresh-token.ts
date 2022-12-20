export default async function getAccessTokenFromRefreshToken(): Promise<string> {
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: JSON.stringify({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      }),
    });
    const tokenObject = await tokenResponse.json();
    if (!tokenResponse.ok) throw tokenObject;
    return tokenObject.access_token;
  } catch (error) {
    throw error;
  }
}
