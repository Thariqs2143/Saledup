
'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { Button } from './ui/button';
import { Phone, Tag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
  shopPhone?: string;
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
       <style jsx global>{`
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          overflow: hidden;
        }
        .leaflet-popup-content {
          margin: 0;
          width: 220px !important;
        }
        .leaflet-popup-tip {
            background: hsl(var(--card));
        }
      `}</style>
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
                   <div className="w-full bg-card text-card-foreground">
                        <Image
                            src={offer.imageUrl || `https://placehold.co/600x400?text=${offer.title.replace(/\s/g, '+')}`}
                            alt={offer.title}
                            width={220}
                            height={150}
                            className="aspect-[4/3] object-cover"
                        />
                        <div className="p-3">
                            <h3 className="font-bold truncate text-base">{offer.title}</h3>
                            <p className="text-sm text-muted-foreground truncate">{offer.shopName}</p>
                        </div>
                        <div className="p-3 border-t grid grid-cols-2 gap-2">
                           {offer.shopPhone && (
                             <a href={`tel:${offer.shopPhone}`}>
                                <Button variant="outline" size="sm" className="w-full">
                                    <Phone className="mr-2 h-4 w-4"/> Call
                                </Button>
                             </a>
                           )}
                           <Link href={`/offers/${offer.id}?shopId=${offer.shopId}&from=all`}>
                             <Button size="sm" className={cn("w-full", !offer.shopPhone && "col-span-2")}>
                                <Tag className="mr-2 h-4 w-4"/> View Offer
                             </Button>
                           </Link>
                        </div>
                    </div>
                </Popup>
              </Marker>
            )
        )}
      </MapContainer>
    </div>
  );
}
