export interface DiscoveredBeacon {
  uuid: string;
  major: number;
  minor: number;
  rssi: number;
  txPower: number | null;
  timestamp: number;
}

interface LEScan {
  active?: boolean;
  stop: () => void;
}

interface AdvertisementEvent extends Event {
  rssi?: number | null;
  txPower?: number | null;
  manufacturerData?: Map<number, DataView>;
}

interface BluetoothWithScanning extends EventTarget {
  requestLEScan?: (options: { acceptAllAdvertisements?: boolean; keepRepeatedDevices?: boolean; filters?: unknown[] }) => Promise<LEScan>;
}

const APPLE_COMPANY_ID = 0x004c;
const IBEACON_TYPE = 0x02;
const IBEACON_LENGTH = 0x15;

const getBluetooth = (): BluetoothWithScanning | null => {
  try {
    if (typeof navigator === 'undefined') return null;
    const bluetooth = (navigator as Navigator & { bluetooth?: BluetoothWithScanning }).bluetooth;
    return bluetooth ?? null;
  } catch {
    return null;
  }
};

export const scanningSupport = (): { supported: boolean; reason: string | null } => {
  if (typeof window !== 'undefined' && !window.isSecureContext) return { supported: false, reason: 'Bluetooth scanning needs HTTPS or localhost.' };
  const bluetooth = getBluetooth();
  if (!bluetooth) return { supported: false, reason: 'This browser has no Web Bluetooth. Use Chrome on Android or desktop.' };
  if (typeof bluetooth.requestLEScan !== 'function') {
    return { supported: false, reason: 'Beacon scanning is switched off in this browser. In Chrome, enable chrome://flags/#enable-experimental-web-platform-features and reload.' };
  }
  return { supported: true, reason: null };
};

const hex = (view: DataView, offset: number, length: number): string => {
  let out = '';
  for (let index = 0; index < length; index++) out += view.getUint8(offset + index).toString(16).padStart(2, '0');
  return out;
};

export const parseIBeacon = (data: DataView): Omit<DiscoveredBeacon, 'rssi' | 'timestamp'> | null => {
  if (data.byteLength < 23) return null;
  if (data.getUint8(0) !== IBEACON_TYPE || data.getUint8(1) !== IBEACON_LENGTH) return null;
  const raw = hex(data, 2, 16);
  const uuid = `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
  return {
    uuid,
    major: data.getUint16(18, false),
    minor: data.getUint16(20, false),
    txPower: data.getInt8(22)
  };
};

export class HardwareBeaconScanner {
  private scan: LEScan | null = null;
  private readonly handler: (event: Event) => void;

  constructor(private readonly onBeacon: (beacon: DiscoveredBeacon) => void) {
    this.handler = (event: Event) => {
      const advertisement = event as AdvertisementEvent;
      if (typeof advertisement.rssi !== 'number') return;
      const apple = advertisement.manufacturerData?.get(APPLE_COMPANY_ID);
      if (!apple) return;
      const parsed = parseIBeacon(apple);
      if (!parsed) return;
      this.onBeacon({ ...parsed, txPower: parsed.txPower ?? advertisement.txPower ?? null, rssi: advertisement.rssi, timestamp: Date.now() });
    };
  }

  get active(): boolean {
    return this.scan !== null;
  }

  async start(): Promise<void> {
    const support = scanningSupport();
    const bluetooth = getBluetooth();
    if (!support.supported || !bluetooth || typeof bluetooth.requestLEScan !== 'function') throw new Error(support.reason ?? 'Bluetooth scanning is not available.');
    if (this.scan) return;
    bluetooth.addEventListener('advertisementreceived', this.handler);
    try {
      this.scan = await bluetooth.requestLEScan({ acceptAllAdvertisements: true, keepRepeatedDevices: true });
    } catch (error) {
      bluetooth.removeEventListener('advertisementreceived', this.handler);
      throw error instanceof Error ? error : new Error('Bluetooth scanning was refused.');
    }
  }

  stop(): void {
    const bluetooth = getBluetooth();
    bluetooth?.removeEventListener('advertisementreceived', this.handler);
    try {
      this.scan?.stop();
    } finally {
      this.scan = null;
    }
  }
}
