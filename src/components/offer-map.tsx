'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';

// Type definition
type Offer = {
  id: string;
  shopId: string;
  title: string;
  description: string;
  imageUrl?: string;
  discountType: string;
  discountValue?: string;
  createdAt: { seconds: number; nanoseconds: number };
  shopName?: string;
  shopAddress?: string;
  shopBusinessType?: string;
  lat?: number;
  lng?: number;
};

interface OfferMapProps {
  offers: Offer[];
}

// Dynamically import react-leaflet components (Next.js SSR fix)
const MapContainer = dynamic(
  async () => (await import('react-leaflet')).MapContainer,
  { ssr: false }
);
const TileLayer = dynamic(async () => (await import('react-leaflet')).TileLayer, {
  ssr: false,
});
const Marker = dynamic(async () => (await import('react-leaflet')).Marker, {
  ssr: false,
});
const Popup = dynamic(async () => (await import('react-leaflet')).Popup, {
  ssr: false,
});

export default function OfferMap({ offers }: OfferMapProps) {
  const [L, setL] = useState<any>(null);

  // Load Leaflet only on client side and set default icon once
  useEffect(() => {
    (async () => {
      const leaflet = await import('leaflet');
      delete (leaflet.Icon.Default as any).prototype._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
      setL(leaflet);
    })();
  }, []);

  // Fallback center if no coordinates are provided
  const mapCenter: [number, number] =
    offers.find((o) => o.lat && o.lng)
      ? [offers[0].lat ?? 20.5937, offers[0].lng ?? 78.9629]
      : [20.5937, 78.9629];

  // Wait for Leaflet to load before rendering
  if (!L) return <div>Loading map...</div>;

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <MapContainer
        key={`${mapCenter[0]}-${mapCenter[1]}`} // prevents reinitialization error
        center={mapCenter}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {offers.map(
          (offer) =>
            offer.lat &&
            offer.lng && (
              <Marker key={offer.id} position={[offer.lat, offer.lng]}>
                <Popup>
                  <div className="font-bold">{offer.title}</div>
                  <div className="text-sm">{offer.shopName}</div>
                </Popup>
              </Marker>
            )
        )}
      </MapContainer>
    </div>
  );
}
