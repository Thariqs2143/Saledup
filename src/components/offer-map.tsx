
'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import { Button } from './ui/button';
import { Phone, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Timestamp } from 'firebase/firestore';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel"

// Type definition
export type Offer = {
  id: string;
  shopId: string;
  title: string;
  description: string;
  imageUrl?: string;
  discountType: string;
  discountValue?: string;
  createdAt: Timestamp;
  startDate?: Timestamp;
  endDate?: Timestamp;
  startTime?: string;
  endTime?: string;
  shopName?: string;
  shopAddress?: string;
  shopBusinessType?: string;
  shopPhone?: string;
  lat?: number;
  lng?: number;
};

interface OfferMapProps {
  offersByShop: Record<string, Offer[]>;
}

// Dynamically import react-leaflet components for SSR fix
const MapContainer = dynamic(async () => (await import('react-leaflet')).MapContainer, { ssr: false });
const TileLayer = dynamic(async () => (await import('react-leaflet')).TileLayer, { ssr: false });
const Marker = dynamic(async () => (await import('react-leaflet')).Marker, { ssr: false });
const Popup = dynamic(async () => (await import('react-leaflet')).Popup, { ssr: false });


const OfferPopupContent = ({ offers }: { offers: Offer[] }) => {
    const [api, setApi] = useState<CarouselApi>()
    const [current, setCurrent] = useState(0)
    const [count, setCount] = useState(0)

    useEffect(() => {
        if (!api) return;
        setCount(api.scrollSnapList().length)
        setCurrent(api.selectedScrollSnap() + 1)
        api.on("select", () => {
            setCurrent(api.selectedScrollSnap() + 1)
        })
    }, [api]);

    return (
        <Carousel setApi={setApi} className="w-full max-w-[220px]">
            <CarouselContent>
                {offers.map((offer) => (
                    <CarouselItem key={offer.id}>
                        <div className="w-full bg-card text-card-foreground">
                            <div className="relative">
                                <Image
                                    src={offer.imageUrl || `https://placehold.co/600x400?text=${offer.title.replace(/\s/g, '+')}`}
                                    alt={offer.title}
                                    width={220}
                                    height={150}
                                    className="aspect-[4/3] object-cover"
                                />
                                {offers.length > 1 && (
                                    <>
                                        <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-6 p-1 bg-background/50 hover:bg-background/80" />
                                        <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-1 bg-background/50 hover:bg-background/80" />
                                    </>
                                )}
                            </div>
                            <div className="p-3">
                                <h3 className="font-bold truncate text-base">{offer.title}</h3>
                                <p className="text-sm text-muted-foreground truncate">{offer.shopName}</p>
                                {offers.length > 1 && (
                                    <div className="text-center text-xs text-muted-foreground pt-1">
                                        Offer {current} of {count}
                                    </div>
                                )}
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
                                    <Tag className="mr-2 h-4 w-4"/> View
                                 </Button>
                               </Link>
                            </div>
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
    );
};


export default function OfferMap({ offersByShop }: OfferMapProps) {
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

  const allOffers = Object.values(offersByShop).flat();
  const firstWithCoords = allOffers.find(o => o.lat !== undefined && o.lng !== undefined);
  const mapCenter: [number, number] = firstWithCoords
    ? [firstWithCoords.lat!, firstWithCoords.lng!]
    : [20.5937, 78.9629]; // fallback to India center

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
          background: hsl(var(--card));
        }
        .leaflet-popup-content {
          margin: 0;
          width: auto !important;
        }
        .leaflet-popup-tip {
            background: hsl(var(--card));
        }
      `}</style>
      <MapContainer
        key={`${mapCenter[0]}-${mapCenter[1]}`}
        center={mapCenter}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {Object.entries(offersByShop).map(([shopId, shopOffers]) => {
            const firstOffer = shopOffers[0];
             if (firstOffer.lat === undefined || firstOffer.lng === undefined) {
                return null;
            }
            return (
              <Marker key={shopId} position={[firstOffer.lat, firstOffer.lng]}>
                <Popup>
                    <OfferPopupContent offers={shopOffers} />
                </Popup>
              </Marker>
            );
        })}
      </MapContainer>
    </div>
  );
}
