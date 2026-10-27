import { useEffect, useState } from 'react';
import { DeviceProfile } from '../types/metapase';

const detectProfile = (): DeviceProfile => {
  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (ua.includes('glass') || ua.includes('orion')) return 'glasses';
  if (ua.includes('watch') || ua.includes('wear os') || (width <= 380 && height <= 380)) return 'watch';
  if (ua.includes('carplay') || (width / height > 2.1 && width < 1280)) return 'car';
  if (/iphone|android|phone/.test(ua) && width < 768) return 'mobile';
  return 'desktop';
};

export function useDeviceProfile(): DeviceProfile {
  const [profile, setProfile] = useState<DeviceProfile>(() => (typeof window === 'undefined' ? 'desktop' : detectProfile()));

  useEffect(() => {
    const update = () => setProfile(detectProfile());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return profile;
}
