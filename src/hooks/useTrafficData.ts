import { useState, useEffect } from "react";

interface TrafficSegment {
  id: string;
  name: string;
  location: string;
  density: number;
}

const initialSegments: TrafficSegment[] = [
  { id: "seg-1", name: "Gachibowli - Tolichowki", location: "Outer Ring Road", density: 35 },
  { id: "seg-2", name: "Tolichowki - Mehdipatnam", location: "Mehdipatnam Road", density: 62 },
  { id: "seg-3", name: "Mehdipatnam - Dilsukhnagar", location: "NH65", density: 78 },
  { id: "seg-4", name: "Dilsukhnagar - Kothapet", location: "Inner Ring Road", density: 45 },
  { id: "seg-5", name: "Kothapet - LB Nagar", location: "LB Nagar Road", density: 28 },
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
