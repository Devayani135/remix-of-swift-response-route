import { useState, useEffect } from "react";

interface TrafficSegment {
  id: string;
  name: string;
  location: string;
  density: number;
}

// Vizag road segments for traffic density analysis
const initialSegments: TrafficSegment[] = [
  { id: "seg-1", name: "RK Beach - Jagadamba", location: "Beach Road", density: 42 },
  { id: "seg-2", name: "Jagadamba - Dwaraka Nagar", location: "Main Road", density: 58 },
  { id: "seg-3", name: "MVP Colony - Maddilapalem", location: "MVP Road", density: 35 },
  { id: "seg-4", name: "Seethamadara - NAD Junction", location: "NAD Road", density: 72 },
  { id: "seg-5", name: "Gajuwaka - Steel Plant", location: "Steel Plant Road", density: 48 },
];

export function useTrafficData() {
  const [segments, setSegments] = useState<TrafficSegment[]>(initialSegments);
  const [isUpdating, setIsUpdating] = useState(false);

  // Simulate real-time traffic updates
  useEffect(() => {
    const updateTraffic = () => {
      setIsUpdating(true);
      setSegments(prev => 
        prev.map(segment => ({
          ...segment,
          density: Math.max(10, Math.min(95, segment.density + (Math.random() * 20 - 10))),
        }))
      );
      setTimeout(() => setIsUpdating(false), 500);
    };

    const interval = setInterval(updateTraffic, 5000);
    return () => clearInterval(interval);
  }, []);

  const averageDensity = Math.round(
    segments.reduce((acc, seg) => acc + seg.density, 0) / segments.length
  );

  const worstSegment = segments.reduce((worst, seg) => 
    seg.density > worst.density ? seg : worst
  , segments[0]);

  return {
    segments,
    isUpdating,
    averageDensity,
    worstSegment,
  };
}
