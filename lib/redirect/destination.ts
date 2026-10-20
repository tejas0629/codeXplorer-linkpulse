export type DeviceType = "mobile" | "desktop" | "tablet" | string;

export function selectRedirectDestination(
  deviceType: DeviceType,
  destinationUrl: string,
  mobileUrl: string | null,
): string {
  return deviceType === "mobile" && mobileUrl ? mobileUrl : destinationUrl;
}