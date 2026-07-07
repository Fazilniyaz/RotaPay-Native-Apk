// hooks/useDeviceIntegrity.ts
// React access to the device root/jailbreak check. `compromised` gates sensitive
// features; `assertTrusted()` is a convenience guard for action handlers.
import { useEffect, useState } from 'react';
import { checkDeviceIntegrity, getCachedIntegrity, DeviceIntegrity } from '../lib/deviceIntegrity';

export function useDeviceIntegrity(): DeviceIntegrity & { ready: boolean } {
  const [state, setState] = useState<DeviceIntegrity | null>(getCachedIntegrity());

  useEffect(() => {
    if (state) return;
    let active = true;
    checkDeviceIntegrity().then((r) => active && setState(r));
    return () => {
      active = false;
    };
  }, [state]);

  return {
    compromised: state?.compromised ?? false,
    isEmulator: state?.isEmulator ?? false,
    reasons: state?.reasons ?? [],
    ready: state !== null,
  };
}
