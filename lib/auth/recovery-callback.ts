export function getRecoveryCallbackRedirect(
  requestUrl: string,
  search: string,
): URL | null {
  if (new URLSearchParams(search).get("flow") !== "recovery") return null;

  const destination = new URL("/auth/callback/complete", requestUrl);
  destination.search = search;
  return destination;
}
