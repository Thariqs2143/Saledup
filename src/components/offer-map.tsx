
'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

// This is a type definition that matches the one in find-offers/page.tsx
type Offer = {
    id: string;
    shopId: string;
    title: string;
    description: string;
    imageUrl?: string;
    discountType: string;
    discountValue?: string;
    createdAt: { seconds: number, nanoseconds: number };
    shopName?: string;
    shopAddress?: string;
    shopBusinessType?: string;
    lat?: number;
    lng?: number;
};

interface OfferMapProps {
    offers: Offer[];
}

export default function OfferMap({ offers }: OfferMapProps) {

    useEffect(() => {
        // This code runs only on the client
        (async () => {
            const L = await import('leaflet');
            // Fix for default marker icon issue with webpack
            const iconDefault = new L.Icon({
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });
            L.Marker.prototype.options.icon = iconDefault;
        })();
    }, []);

    // A fallback center in case no offers have coordinates
    const mapCenter: [number, number] = [20.5937, 78.9629];

    return (
        <MapContainer center={mapCenter} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {offers.map(offer => (
                offer.lat && offer.lng ? (
                    <Marker key={offer.id} position={[offer.lat, offer.lng]}>
                        <Popup>
                            <div className="font-bold">{offer.title}</div>
                            <div className="text-sm">{offer.shopName}</div>
                        </Popup>
                    </Marker>
                ) : null
            ))}
        </MapContainer>
    );
}

    