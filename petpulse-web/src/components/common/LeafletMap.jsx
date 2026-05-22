import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet marker assets
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LeafletMap = ({
    center,
    zoom = 12,
    userLocation,
    markers = [],
    onMarkerRegister,
    tileLayerUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    tileLayerAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
}) => {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef({});
    const userMarkerRef = useRef(null);

    // 1. Map Initialization and Cleanup
    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Ensure absolute cleanup before instantiating a new map
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        const mapCenter = center && center[0] && center[1] ? center : [30.0444, 31.2357];
        
        try {
            const map = L.map(mapContainerRef.current, {
                zoomControl: true,
                scrollWheelZoom: true,
                attributionControl: true
            }).setView(mapCenter, zoom);

            mapInstanceRef.current = map;

            L.tileLayer(tileLayerUrl, {
                attribution: tileLayerAttribution,
                maxZoom: 19
            }).addTo(map);

            // Handle ResizeObserver to completely eradicate gray tiles bug on load/tab switch
            const observer = new ResizeObserver(() => {
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.invalidateSize();
                }
            });
            observer.observe(mapContainerRef.current);

            return () => {
                observer.disconnect();
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.remove();
                    mapInstanceRef.current = null;
                }
            };
        } catch (error) {
            console.error('Failed to initialize Leaflet Map safely:', error);
        }
    }, []); // Only run once on mount

    // 2. Smooth View Recenter & Pan
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (map && center && center[0] && center[1]) {
            const currentCenter = map.getCenter();
            // Only fly if coordinates are significantly different to avoid infinite trigger loops
            const diffLat = Math.abs(currentCenter.lat - center[0]);
            const diffLng = Math.abs(currentCenter.lng - center[1]);
            if (diffLat > 0.0001 || diffLng > 0.0001) {
                map.flyTo(center, zoom, { animate: true, duration: 1.5 });
            }
        }
    }, [center, zoom]);

    // 3. Keep User Pulsing Location Up to Date
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (userMarkerRef.current) {
            userMarkerRef.current.remove();
            userMarkerRef.current = null;
        }

        if (userLocation && userLocation.lat && userLocation.lng) {
            const pulsingIcon = L.divIcon({
                className: 'custom-pulsing-marker',
                html: `
                    <div class="relative flex items-center justify-center w-6 h-6">
                        <div class="absolute w-6 h-6 bg-blue-500 rounded-full animate-ping opacity-30"></div>
                        <div class="relative w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
                    </div>
                `,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            try {
                const marker = L.marker([userLocation.lat, userLocation.lng], { icon: pulsingIcon })
                    .addTo(map)
                    .bindPopup(`
                        <div class="text-center font-sans p-1.5">
                            <strong class="block text-slate-800 text-sm">📍 You Are Here</strong>
                            <span class="text-[10px] text-slate-500 block mt-0.5">${userLocation.neighborhood || 'Cairo, Egypt'}</span>
                        </div>
                    `);
                
                userMarkerRef.current = marker;
            } catch (err) {
                console.error("Failed to render user location marker:", err);
            }
        }
    }, [userLocation]);

    // 4. Manage Custom Markers with Event Bindings
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        // Clean out existing markers
        Object.values(markersRef.current).forEach(m => m.remove());
        markersRef.current = {};

        markers.forEach(m => {
            if (!m.coords || !m.coords[0] || !m.coords[1]) return;

            try {
                const marker = L.marker(m.coords).addTo(map);

                if (m.popupHtml) {
                    marker.bindPopup(m.popupHtml);
                } else if (m.title) {
                    const container = document.createElement('div');
                    container.className = 'w-56 overflow-hidden rounded-xl border border-slate-100 font-sans shadow-md bg-white';
                    
                    let imageHtml = '';
                    if (m.image) {
                        imageHtml = `
                            <div class="h-28 relative overflow-hidden bg-slate-100">
                                <img src="${m.image}" alt="${m.title}" class="w-full h-full object-cover" />
                                ${m.isOpenStatus !== undefined ? `
                                    <div class="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider ${m.isOpenStatus ? 'text-emerald-600' : 'text-red-500'} uppercase shadow-sm">
                                        ${m.isOpenStatus ? 'Open' : 'Closed'}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }

                    container.innerHTML = `
                        ${imageHtml}
                        <div class="p-3">
                            <h4 class="font-bold text-slate-800 text-sm leading-tight mb-1">${m.title}</h4>
                            ${m.subtitle ? `<p class="text-xs font-semibold text-blue-600 mb-1">${m.subtitle}</p>` : ''}
                            ${m.distanceText ? `<p class="text-[10px] text-emerald-600 font-extrabold mb-2">${m.distanceText}</p>` : ''}
                            ${m.buttonText ? `<button class="w-full bg-slate-900 text-white font-bold py-1.5 rounded-lg text-xs hover:bg-blue-600 transition-colors map-popup-action-btn">${m.buttonText}</button>` : ''}
                        </div>
                    `;

                    if (m.buttonText && m.onButtonClick) {
                        const btn = container.querySelector('.map-popup-action-btn');
                        if (btn) {
                            btn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                m.onButtonClick();
                            });
                        }
                    }

                    marker.bindPopup(container, {
                        className: 'rounded-xl overflow-hidden p-0 m-0 custom-popup-leaflet',
                        maxWidth: 240
                    });
                }

                markersRef.current[m.id] = marker;
                if (onMarkerRegister) {
                    onMarkerRegister(m.id, marker);
                }
            } catch (err) {
                console.error("Failed to render marker:", m, err);
            }
        });
    }, [markers]);

    // 5. Auto Fit Bounds to include all markers and user location
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        const points = [];
        
        // Add user location if present
        if (userLocation && userLocation.lat && userLocation.lng) {
            points.push([userLocation.lat, userLocation.lng]);
        }

        // Add all markers
        markers.forEach(m => {
            if (m.coords && m.coords[0] && m.coords[1]) {
                points.push(m.coords);
            }
        });

        if (points.length > 0) {
            try {
                const bounds = L.latLngBounds(points);
                map.fitBounds(bounds, {
                    padding: [50, 50],
                    maxZoom: 14,
                    animate: true,
                    duration: 1.5
                });
            } catch (err) {
                console.error("Failed to fit map bounds:", err);
            }
        }
    }, [markers, userLocation]);

    return (
        <div 
            ref={mapContainerRef} 
            className="w-full h-full rounded-2xl overflow-hidden z-0" 
            style={{ minHeight: '300px', width: '100%', height: '100%' }}
        />
    );
};

export default LeafletMap;
