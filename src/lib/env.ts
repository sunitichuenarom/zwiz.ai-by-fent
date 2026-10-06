const MIN_PASSCODE_LENGTH = 12;

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
    const value = process.env.APP_PASSCODE || undefined;
    if (value && value.length < MIN_PASSCODE_LENGTH) {
      throw new Error(`APP_PASSCODE must be at least ${MIN_PASSCODE_LENGTH} characters`);
    }
    return value;
  },
};
