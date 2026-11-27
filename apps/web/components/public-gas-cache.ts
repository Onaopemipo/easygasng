"use client";
import { createPublicGasCache } from "../../../packages/business-rules/src/public-gas-cache";
import { api } from "./ui";
export const publicGasCache = createPublicGasCache();
export function loadPublicGas(branch: string, force = false) {
  return publicGasCache.load(
    branch,
    async () => {
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          api(
            "gas.catalogue?branchId=" + encodeURIComponent(branch),
            undefined,
            { signal: controller.signal },
          ),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              reject(
                Error("Current prices could not be refreshed. Please retry."),
              );
              controller.abort();
            }, 15000);
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
    force,
  );
}
