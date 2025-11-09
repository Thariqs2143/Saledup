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

// Dynamically import react-leaflet components for SSR fix
const MapContainer = dynamic(async () => (await import('react-leaflet')).MapContainer, { ssr: false });
const TileLayer = dynamic(async () => (await import('react-leaflet')).TileLayer, { ssr: false });
const Marker = dynamic(async () => (await import('react-leaflet')).Marker, { ssr: false });
const Popup = dynamic(async () => (await import('react-leaflet')).Popup, { ssr: false });

export default function OfferMap({ offers }: OfferMapProps) {
  const [L, setL] = useState<any>(null);

  // Load Leaflet and set default marker icons
  useEffect(() => {
    (async () => {
      const leaflet = await import('leaflet');

      // Reset default icons
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

  // Find first offer with coordinates to center map
  const firstWithCoords = offers.find(o => o.lat !== undefined && o.lng !== undefined);
  const mapCenter: [number, number] = firstWithCoords
    ? [firstWithCoords.lat!, firstWithCoords.lng!]
    : [20.5937, 78.9629]; // fallback to India center

  // Wait for Leaflet to load
  if (!L) return (
    <div className="flex justify-center items-center h-full text-gray-500">
      Loading map...
    </div>
  );

  return (
    <div className="h-full w-full">
      <MapContainer
        key={`${mapCenter[0]}-${mapCenter[1]}`} // prevent re-init issues
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
            offer.lat !== undefined &&
            offer.lng !== undefined && (
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
