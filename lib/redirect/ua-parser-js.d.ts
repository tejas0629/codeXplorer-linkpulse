declare module "ua-parser-js" {
  type ParsedUserAgent = {
    device: { type?: string };
    browser: { name?: string };
    os: { name?: string };
  };

  type UserAgentParser = {
    getResult(): ParsedUserAgent;
  };

  const UAParser: {
    new (userAgent?: string): UserAgentParser;
  };

  export default UAParser;
}