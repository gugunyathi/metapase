import { GeoFix, GeoPoint, NodeReading, PlacedStore, PositionEstimate, ResolvedMode, VenueMode } from '../types/metapase';
import { MATCH_RADIUS_M, OUTDOOR_ACCURACY_M } from '../config/venue';
import { distanceToRssi, haversineM, initialBearingDeg, offsetToGeo, rssiToDistanceM, weightedCentroid } from './geo';
import { solvePosition } from './trilateration';

const MIN_BEARING_DISTANCE_M = 1.5;
const TRILATERATION_SLACK_M = 15;

const trilaterate = (anchor: GeoPoint, samples: { node: PlacedStore; distanceM: number }[]): GeoPoint | null => {
  const solved = solvePosition(samples.map(sample => ({ x: sample.node.offsetEastM, y: sample.node.offsetNorthM, distance: sample.distanceM })));
  if (!solved) return null;
  const xs = samples.map(sample => sample.node.offsetEastM);
  const ys = samples.map(sample => sample.node.offsetNorthM);
  const reach = Math.max(...samples.map(sample => sample.distanceM)) + TRILATERATION_SLACK_M;
  if (solved.x < Math.min(...xs) - reach || solved.x > Math.max(...xs) + reach || solved.y < Math.min(...ys) - reach || solved.y > Math.max(...ys) + reach) return null;
  return offsetToGeo(anchor, solved.x, solved.y);
};

export const resolveMode = (preference: VenueMode, fix: GeoFix | null): ResolvedMode => {
  if (preference !== 'auto') return preference;
  return fix !== null && fix.accuracyM <= OUTDOOR_ACCURACY_M ? 'outdoor' : 'indoor';
};

export const estimatePosition = (
  nodes: PlacedStore[],
  mode: ResolvedMode,
  fix: GeoFix | null,
  rssiMap: Record<string, number>,
  anchor: GeoPoint,
  matchRadiusM: number = MATCH_RADIUS_M
): PositionEstimate => {
  if (mode === 'outdoor') {
    if (!fix) {
      return {
        mode,
        userPoint: null,
        readings: nodes.map(node => ({ node, rssi: -127, distanceM: Number.POSITIVE_INFINITY, bearingDeg: null, inRange: false }))
      };
    }
    const readings: NodeReading[] = nodes.map(node => {
      const distanceM = haversineM(fix, node.point);
      return {
        node,
        rssi: distanceToRssi(distanceM, node.txPower),
        distanceM,
        bearingDeg: distanceM < MIN_BEARING_DISTANCE_M ? null : initialBearingDeg(fix, node.point),
        inRange: distanceM <= matchRadiusM
      };
    });
    return { mode, userPoint: { lat: fix.lat, lng: fix.lng }, readings };
  }

  const ranged = nodes.map(node => {
    const rssi = rssiMap[node.id] ?? -100;
    return { node, rssi, distanceM: rssiToDistanceM(rssi, node.txPower) };
  });
  const heard = ranged.filter(sample => sample.distanceM <= matchRadiusM);
  const userPoint = (heard.length >= 3 ? trilaterate(anchor, heard) : null)
    ?? weightedCentroid(heard.map(sample => ({ point: sample.node.point, distanceM: sample.distanceM })));
  const readings: NodeReading[] = ranged.map(sample => {
    const separation = userPoint ? haversineM(userPoint, sample.node.point) : 0;
    return {
      node: sample.node,
      rssi: sample.rssi,
      distanceM: sample.distanceM,
      bearingDeg: userPoint && separation >= 0.5 && sample.distanceM >= MIN_BEARING_DISTANCE_M ? initialBearingDeg(userPoint, sample.node.point) : null,
      inRange: sample.distanceM <= matchRadiusM
    };
  });
  return { mode, userPoint, readings };
};
