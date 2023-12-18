export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SLACK_BOT_TOKEN: string;
      SLACK_SIGNING_SECRET: string;
      SLACK_CHANNEL: string;
      GOOGLE_CALENDAR_ID: string;
      GOOGLE_CLIENT_ID: string;
      GOOGLE_CLIENT_SECRET: string;
      GOOGLE_REFRESH_TOKEN: string;
      GOOGLE_API_KEY: string;
      API_ENDPOINT: string;
      SPREADSHEET_ID: string;
      SHEET_NAME: string;
      MEMBER_LIST_BASE64: string;
    }
  }
}
