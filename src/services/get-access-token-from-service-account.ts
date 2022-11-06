import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { serviceAccountKey } from './service-account-key';

export default async function getAccessTokenFromServiceAccount(): Promise<string> {
  try {
    const jwtToken = jwt.sign(
      { scope: 'https://www.googleapis.com/auth/cloud-translation' },
      serviceAccountKey.private_key.replace(/\\n/gm, '\n'),
      {
        algorithm: 'RS256',
        issuer: serviceAccountKey.client_email,
        audience: serviceAccountKey.token_uri,
        expiresIn: '1h',
      },
    );
    const accessTokenResponse = await fetch(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        body: JSON.stringify({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwtToken,
        }),
      },
    );
    const accessTokenObject = await accessTokenResponse.json();
    return accessTokenObject.access_token;
  } catch (error) {
    throw error;
  }
}
