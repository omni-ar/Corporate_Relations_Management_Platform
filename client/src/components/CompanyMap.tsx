import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Company = {
  id: string;
  name: string;
  industry: string;
  city?: string;
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
  Noida: [28.5355, 77.391],
  Gurgaon: [28.4595, 77.0266],
};

function getIndustryColor(industry: string): string {
  switch (industry) {
    case "IT / Software":
      return "#4f46e5";
    case "Consulting":
      return "#0ea5e9";
    case "Finance / Banking":
      return "#f59e0b";
    case "Core Engineering":
      return "#10b981";
    case "E-Commerce":
      return "#8b5cf6";
    case "Healthcare":
      return "#ec4899";
    case "Analytics":
      return "#06b6d4";
    case "FMCG":
      return "#84cc16";
    case "Automobile":
      return "#f97316";
    default:
      return "#6b7280";
  }
}

function createPopupContent(city: string, companies: Company[]): HTMLElement {
  const container = document.createElement("div");
  container.style.minWidth = "180px";

  const title = document.createElement("h3");
  title.style.fontWeight = "600";
  title.style.fontSize = "13px";
  title.style.marginBottom = "6px";
  title.textContent = city;
  container.appendChild(title);

  const list = document.createElement("div");
  list.style.fontSize = "11px";
  list.style.color = "#666";

  companies.forEach((c) => {
    const row = document.createElement("div");
    row.style.padding = "3px 0";
    row.style.borderBottom = "1px solid #eee";

    const name = document.createElement("span");
    name.style.fontWeight = "500";
    name.textContent = c.name;
    row.appendChild(name);

    const industry = document.createElement("span");
    industry.style.color = "#999";
    industry.style.marginLeft = "6px";
    industry.textContent = `(${c.industry})`;
    row.appendChild(industry);

    list.appendChild(row);
  });

  container.appendChild(list);
  return container;
}

export default function CompanyMap({ companies }: { companies: Company[] }) {
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

    const companiesByCity = companies.reduce(
      (acc, company) => {
        const city = company.city;
        if (!city) return acc;
        if (!acc[city]) acc[city] = [];
        acc[city].push(company);
        return acc;
      },
      {} as Record<string, Company[]>,
    );

    Object.entries(companiesByCity).forEach(([city, cityCompanies]) => {
      const coords = cityCoordinates[city];
      if (!coords) return;

      const primaryIndustry = cityCompanies[0].industry;
      const color = getIndustryColor(primaryIndustry);

      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="
          background: ${color};
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 12px;
        ">${cityCompanies.length}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const popupContent = createPopupContent(city, cityCompanies);
      L.marker(coords, { icon }).addTo(map).bindPopup(popupContent);
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {};
  }, [companies]);

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
      data-testid="company-map"
    />
  );
}
