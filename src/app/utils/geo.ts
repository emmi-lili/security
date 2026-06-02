export type GeoCoords = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

/** Reads device GPS at call time (used when registering a QR scan). */
export function getCurrentPosition(): Promise<GeoCoords> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ latitude: 0, longitude: 0 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve({ latitude: 0, longitude: 0 }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );
  });
}

export function hasValidCoords(coords: GeoCoords): boolean {
  return coords.latitude !== 0 || coords.longitude !== 0;
}

export function formatCoords(coords: GeoCoords): string {
  return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
}
