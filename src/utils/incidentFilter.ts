// Incident types that should trigger alerts and display on map
export const MAJOR_INCIDENT_TYPES = [
  'ACCIDENT',
  'ROAD_WORK', 
  'CONSTRUCTION',
  'ROAD_CLOSURE',
  'CLOSED',
  'JAM',
  'CONGESTION',
] as const;

export type MajorIncidentType = 'ACCIDENT' | 'ROAD_WORK' | 'VERY_HEAVY_TRAFFIC' | 'ROAD_CLOSURE';

export interface FilteredIncident {
  id: string;
  type: MajorIncidentType;
  severity: number;
  description: string;
  location: { lat: number; lng: number };
  delay: number;
  iconType: 'accident' | 'roadwork' | 'traffic' | 'closure';
}

/**
 * Filter raw TomTom incidents to only include major ones:
 * - Accidents
 * - Road work/construction
 * - Very heavy traffic (severity >= 3)
 * - Road closures
 */
export function filterToMajorIncidents(rawIncidents: any[]): FilteredIncident[] {
  if (!rawIncidents || !Array.isArray(rawIncidents)) {
    return [];
  }

  return rawIncidents
    .filter(inc => {
      const type = String(inc.type || '').toUpperCase();
      const severity = Number(inc.severity) || 0;
      
      // Check if it's a major incident type
      const isAccident = type.includes('ACCIDENT') || type.includes('CRASH');
      const isRoadWork = type.includes('ROAD_WORK') || type.includes('CONSTRUCTION') || type.includes('WORKS');
      const isClosure = type.includes('CLOSURE') || type.includes('CLOSED') || type.includes('BLOCKED');
      const isHeavyTraffic = (type.includes('JAM') || type.includes('CONGESTION')) && severity >= 3;
      const isVerySevere = severity >= 4;
      
      return isAccident || isRoadWork || isClosure || isHeavyTraffic || isVerySevere;
    })
    .map(inc => {
      const type = String(inc.type || '').toUpperCase();
      
      // Determine incident category
      let incidentType: MajorIncidentType = 'ACCIDENT';
      let iconType: FilteredIncident['iconType'] = 'accident';
      
      if (type.includes('ROAD_WORK') || type.includes('CONSTRUCTION') || type.includes('WORKS')) {
        incidentType = 'ROAD_WORK';
        iconType = 'roadwork';
      } else if (type.includes('CLOSURE') || type.includes('CLOSED') || type.includes('BLOCKED')) {
        incidentType = 'ROAD_CLOSURE';
        iconType = 'closure';
      } else if (type.includes('JAM') || type.includes('CONGESTION')) {
        incidentType = 'VERY_HEAVY_TRAFFIC';
        iconType = 'traffic';
      }
      
      // Build description
      const desc = inc.description || `${incidentType.replace(/_/g, ' ')} reported on route`;
      
      return {
        id: inc.id || `inc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: incidentType,
        severity: Number(inc.severity) || 3,
        description: desc,
        location: inc.from || { lat: 0, lng: 0 },
        delay: Number(inc.delay) || 0,
        iconType,
      };
    });
}

/**
 * Get color for incident based on type
 */
export function getIncidentColor(type: MajorIncidentType): string {
  switch (type) {
    case 'ACCIDENT':
      return '#ef4444'; // Red
    case 'ROAD_CLOSURE':
      return '#dc2626'; // Dark red
    case 'ROAD_WORK':
      return '#f59e0b'; // Orange/amber
    case 'VERY_HEAVY_TRAFFIC':
      return '#f97316'; // Orange
    default:
      return '#ef4444';
  }
}

/**
 * Get icon SVG for incident type
 */
export function getIncidentIcon(type: MajorIncidentType): string {
  switch (type) {
    case 'ACCIDENT':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    case 'ROAD_WORK':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`;
    case 'ROAD_CLOSURE':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>`;
    case 'VERY_HEAVY_TRAFFIC':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  }
}
