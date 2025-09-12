import type { SyncConfig } from "~/app/map/Cache/Sync/types";

// Advanced online checking (optional)
export const checkOnlineStatus = async (syncConfig: SyncConfig): Promise<boolean> => {
  if (!syncConfig.onlineCheckUrl) {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  }

  try {
    await fetch(syncConfig.onlineCheckUrl, {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-cache",
    });
    return true; // If fetch succeeds, we're online
  } catch {
    return false;
  }
};