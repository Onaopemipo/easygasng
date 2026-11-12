export type NativeRiderMapPoint = {
  id: string;
  label: string;
  lat: number;
  lng: number;
};

// Expo's web build uses the existing text equivalent.
export default function NativeRiderMap(_: { points: NativeRiderMapPoint[] }) {
  return null;
}
