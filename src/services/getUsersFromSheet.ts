import { getAccessTokenFromRefreshToken } from './getAccessTokenFromRefreshToken.js';

export async function getUsersFromSheet() {
  try {
    const accessToken = await getAccessTokenFromRefreshToken();
    const sheetName = new Date().getFullYear().toString();
    const query = new URLSearchParams({
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
    });
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SPREADSHEET_ID}/values/${sheetName}?${query}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const sheetValues = await response.json();
    if (!response.ok) throw sheetValues.error;
    const [header, ...rows] = sheetValues.values;
    const result: Record<string, string>[] = [];
    for (const rowValues of rows) {
      const obj: Record<string, string> = {};
      for (let i = 0; i < rowValues.length; i++) {
        const key = header[i];
        const value = rowValues[i];
        obj[key] = value;
      }
      result.push(obj);
    }
    return result;
  } catch (error) {
    throw error;
  }
}
