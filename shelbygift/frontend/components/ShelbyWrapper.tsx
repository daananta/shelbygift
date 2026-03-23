import { PropsWithChildren, useMemo } from "react";
import { shelbyClient } from "@/utils/shelbyClient";

/**
 * Safely wraps children with ShelbyClientProvider if the client is available.
 * Falls back to rendering children directly if Shelby SDK fails to initialize.
 */
export function ShelbyWrapper({ children }: PropsWithChildren) {
  const Provider = useMemo(() => {
    if (!shelbyClient) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require("@shelby-protocol/react");
      return mod.ShelbyClientProvider;
    } catch {
      return null;
    }
  }, []);

  if (!Provider || !shelbyClient) {
    return <>{children}</>;
  }

  return <Provider client={shelbyClient}>{children}</Provider>;
}
