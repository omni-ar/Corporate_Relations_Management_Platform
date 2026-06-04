import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Vendor = {
  id: string;
  vendorName: string;
  city: string;
  category: string;
  approved: boolean;
};

const cityCoordinates: Record<string, [number, number]> = {
  Mumbai: [19.076, 72.8777],
  Delhi: [28.6139, 77.209],
  Bangalore: [12.9716, 77.5946],
  Hyderabad: [17.385, 78.4867],
  Ahmedabad: [23.0225, 72.5714],
  Chennai: [13.0827, 80.2707],
  Kolkata: [22.5726, 88.3639],
  Surat: [21.1702, 72.8311],
  Pune: [18.5204, 73.8567],
  Jaipur: [26.9124, 75.7873],
  Lucknow: [26.8467, 80.9462],
  Kanpur: [26.4499, 80.3319],
  Nagpur: [21.1458, 79.0882],
  Indore: [22.7196, 75.8577],
  Thane: [19.2183, 72.9781],
  Bhopal: [23.2599, 77.4126],
  Visakhapatnam: [17.6868, 83.2185],
  Patna: [25.5941, 85.1376],
  Vadodara: [22.3072, 73.1812],
  Ghaziabad: [28.6692, 77.4538],
  Ludhiana: [30.901, 75.8573],
  Agra: [27.1767, 78.0081],
  Nashik: [19.9975, 73.7898],
  Faridabad: [28.4089, 77.3178],
  Meerut: [28.9845, 77.7064],
  Rajkot: [22.3039, 70.8022],
  Varanasi: [25.3176, 82.9739],
  Srinagar: [34.0837, 74.7973],
  Aurangabad: [19.8762, 75.3433],
  Dhanbad: [23.7957, 86.4304],
  Amritsar: [31.634, 74.8723],
  Navi_Mumbai: [19.033, 73.0297],
  Allahabad: [25.4358, 81.8463],
  Ranchi: [23.3441, 85.3096],
  Howrah: [22.5958, 88.2636],
  Coimbatore: [11.0168, 76.9558],
  Jabalpur: [23.1815, 79.9864],
  Gwalior: [26.2183, 78.1828],
  Vijayawada: [16.5062, 80.648],
  Jodhpur: [26.2389, 73.0243],
  Madurai: [9.9252, 78.1198],
  Raipur: [21.2514, 81.6296],
  Kochi: [9.9312, 76.2673],
  Chandigarh: [30.7333, 76.7794],
  Mysore: [12.2958, 76.6394],
  Portland: [45.5051, -122.675],
  Austin: [30.2672, -97.7431],
  Seattle: [47.6062, -122.3321],
  "San Francisco": [37.7749, -122.4194],
  Chicago: [41.8781, -87.6298],
  "New York": [40.7128, -74.006],
  "Los Angeles": [34.0522, -118.2437],
  Dallas: [32.7767, -96.797],
  "San Jose": [37.3382, -121.8863],
  Denver: [39.7392, -104.9903],
  Miami: [25.7617, -80.1918],
  "San Diego": [32.7157, -117.1611],
};

function getCategoryColor(category: string): string {
  switch (category) {
    case "Packaging":
      return "#0ea5e9";
    case "Hardware":
      return "#f59e0b";
    case "Materials":
      return "#10b981";
    case "Manufacturing":
      return "#8b5cf6";
    case "Services":
      return "#ec4899";
    default:
      return "#6b7280";
  }
}


function createPopupContent(city: string, vendors: Vendor[]): HTMLElement {
  const container = document.createElement("div");
  container.style.minWidth = "200px";

  const title = document.createElement("h3");
  title.style.fontWeight = "600";
  title.style.fontSize = "14px";
  title.style.marginBottom = "8px";
  title.textContent = city;
  container.appendChild(title);

  const list = document.createElement("div");
  list.style.fontSize = "12px";
  list.style.color = "#666";

  vendors.forEach((v) => {
    const row = document.createElement("div");
    row.style.padding = "4px 0";
    row.style.borderBottom = "1px solid #eee";

    const name = document.createElement("span");
    name.style.fontWeight = "500";
    name.textContent = v.vendorName;
    row.appendChild(name);

    const status = document.createElement("span");
    status.style.color = v.approved ? "#10b981" : "#f59e0b";
    status.textContent = v.approved ? " ✓" : " Pending";
    row.appendChild(status);

    list.appendChild(row);
  });

  container.appendChild(list);
  return container;
}

export default function VendorMap({ vendors }: { vendors: Vendor[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const invalidateSize = useCallback(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 100);
    }
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      invalidateSize();
    });

    if (mapRef.current) {
      observer.observe(mapRef.current);
    }

    return () => observer.disconnect();
  }, [invalidateSize]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([20.5937, 78.9629], 5);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    const vendorsByCity = vendors.reduce(
      (acc, vendor) => {
        const city = vendor.city;
        if (!acc[city]) acc[city] = [];
        acc[city].push(vendor);
        return acc;
      },
      {} as Record<string, Vendor[]>,
    );

    Object.entries(vendorsByCity).forEach(([city, cityVendors]) => {
      const coords = cityCoordinates[city];
      if (!coords) return;

      const primaryCategory = cityVendors[0].category;
      const color = getCategoryColor(primaryCategory);

      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="
          background: ${color};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
        ">${cityVendors.length}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const popupContent = createPopupContent(city, cityVendors);
      L.marker(coords, { icon }).addTo(map).bindPopup(popupContent);
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {};
  }, [vendors]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={mapRef}
      className="h-full w-full rounded-lg"
      style={{ minHeight: "300px" }}
      data-testid="vendor-map"
    />
  );
}
