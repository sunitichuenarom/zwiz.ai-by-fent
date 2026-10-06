function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const env = {
  get LINE_CHANNEL_SECRET() {
    return required("LINE_CHANNEL_SECRET");
  },
  get LINE_CHANNEL_ACCESS_TOKEN() {
    return required("LINE_CHANNEL_ACCESS_TOKEN");
  },
  get APP_PASSCODE() {
    return process.env.APP_PASSCODE || undefined;
  },
};
