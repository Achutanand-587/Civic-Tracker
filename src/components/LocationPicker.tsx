import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons (same as IssueMap)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationPickerProps {
    lat: number;
    lng: number;
    onLocationChange: (lat: number, lng: number) => void;
}

const LocationPicker = ({ lat, lng, onLocationChange }: LocationPickerProps) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);

    // Initialize map
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current).setView([lat, lng], 15);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }).addTo(map);

        mapRef.current = map;

        // Create draggable marker
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current = marker;

        marker.on('dragend', () => {
            const position = marker.getLatLng();
            onLocationChange(position.lat, position.lng);
        });

        // Cleanup
        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []); // Only run once on mount for initialization

    // Update map view and marker when props change (e.g. GPS update)
    useEffect(() => {
        if (!mapRef.current || !markerRef.current) return;

        // Only update if considerable distance to avoid jitter during drag?
        // Actually, we want to respect prop updates (from GPS button)
        const currentCenter = mapRef.current.getCenter();
        const dist = Math.sqrt(Math.pow(currentCenter.lat - lat, 2) + Math.pow(currentCenter.lng - lng, 2));

        // If the update comes from parent (e.g. GPS button press), fly to it
        // We check distance to confirm it's a real move, not just a tiny re-render
        if (dist > 0.0001) {
            mapRef.current.setView([lat, lng], 15);
            markerRef.current.setLatLng([lat, lng]);
        }
    }, [lat, lng]);

    return (
        <div className="h-[300px] w-full rounded-lg overflow-hidden border border-border shadow-sm z-0 relative">
            <div ref={mapContainerRef} className="h-full w-full" />
            <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded text-xs text-muted-foreground z-[1000] pointer-events-none">
                Drag marker to refine location
            </div>
        </div>
    );
};

export default LocationPicker;
