export const serviceAccountKey = JSON.parse(
  Buffer.from(process.env.SERVICE_ACCOUNT_KEY_BASE64!, 'base64').toString(),
);
