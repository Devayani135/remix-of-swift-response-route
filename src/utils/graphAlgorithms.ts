/**
 * Graph Algorithms for Emergency Vehicle Routing
 * 
 * This module implements Dijkstra's and A* algorithms for finding
 * optimal routes in a road network graph.
 * 
 * Graph Structure:
 * - Nodes: Intersections (vertices) with lat/lng coordinates
 * - Edges: Roads connecting intersections with distance and travel time
 */

import { VIZAG_LOCATIONS, type VizagLocation } from './vizagLocations';

// ============================================================
// GRAPH DATA STRUCTURES
// ============================================================

export interface GraphNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  distance: number; // in kilometers
  travelTime: number; // in minutes (base time without traffic)
  trafficMultiplier: number; // 1.0 = no traffic, 2.0 = double travel time
}

export interface Graph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge[]>; // adjacency list
}

// ============================================================
// PRIORITY QUEUE FOR ALGORITHMS
// ============================================================

interface PriorityQueueItem {
  nodeId: string;
  priority: number;
}

class PriorityQueue {
  private items: PriorityQueueItem[] = [];

  enqueue(nodeId: string, priority: number): void {
    this.items.push({ nodeId, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }

  dequeue(): PriorityQueueItem | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  contains(nodeId: string): boolean {
    return this.items.some(item => item.nodeId === nodeId);
  }

  updatePriority(nodeId: string, newPriority: number): void {
    const index = this.items.findIndex(item => item.nodeId === nodeId);
    if (index !== -1) {
      this.items[index].priority = newPriority;
      this.items.sort((a, b) => a.priority - b.priority);
    }
  }
}

// ============================================================
// BUILD GRAPH FROM OSM DATA (VIZAG LOCATIONS)
// ============================================================

/**
 * Calculate Haversine distance between two coordinates
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Build a graph from Vizag locations
 * Connects nearby nodes based on distance threshold
 */
export function buildGraphFromLocations(
  locations: VizagLocation[],
  connectionThreshold: number = 2.0 // km - connect nodes within this distance
): Graph {
  const graph: Graph = {
    nodes: new Map(),
    edges: new Map()
  };

  // Add all locations as nodes
  locations.forEach(loc => {
    const nodeId = loc.name.toLowerCase().replace(/\s+/g, '-');
    graph.nodes.set(nodeId, {
      id: nodeId,
      name: loc.name,
      lat: loc.lat,
      lng: loc.lng
    });
    graph.edges.set(nodeId, []);
  });

  // Create edges between nearby nodes
  const nodeArray = Array.from(graph.nodes.values());
  
  for (let i = 0; i < nodeArray.length; i++) {
    for (let j = i + 1; j < nodeArray.length; j++) {
      const nodeA = nodeArray[i];
      const nodeB = nodeArray[j];
      
      const distance = haversineDistance(
        nodeA.lat, nodeA.lng,
        nodeB.lat, nodeB.lng
      );

      if (distance <= connectionThreshold) {
        // Calculate travel time assuming average speed of 30 km/h in city
        const travelTime = (distance / 30) * 60; // Convert to minutes

        // Add bidirectional edges
        const edgeAB: GraphEdge = {
          from: nodeA.id,
          to: nodeB.id,
          distance,
          travelTime,
          trafficMultiplier: 1.0
        };

        const edgeBA: GraphEdge = {
          from: nodeB.id,
          to: nodeA.id,
          distance,
          travelTime,
          trafficMultiplier: 1.0
        };

        graph.edges.get(nodeA.id)?.push(edgeAB);
        graph.edges.get(nodeB.id)?.push(edgeBA);
      }
    }
  }

  return graph;
}

// ============================================================
// DIJKSTRA'S ALGORITHM
// ============================================================

export interface DijkstraResult {
  path: string[];
  pathNodes: GraphNode[];
  totalDistance: number;
  totalTime: number;
  algorithm: 'dijkstra';
  nodesVisited: number;
  executionTimeMs: number;
}

/**
 * Dijkstra's Algorithm Implementation
 * 
 * Finds the shortest path from source to destination using
 * TRAVEL TIME as the edge cost (not distance).
 * 
 * Time Complexity: O((V + E) log V) with priority queue
 * Space Complexity: O(V)
 * 
 * @param graph - The road network graph
 * @param sourceId - Starting node ID
 * @param destinationId - Target node ID
 * @returns Optimal path with total distance and time
 */
export function dijkstra(
  graph: Graph,
  sourceId: string,
  destinationId: string
): DijkstraResult | null {
  const startTime = performance.now();
  
  console.log('=== DIJKSTRA ALGORITHM START ===');
  console.log(`Source: ${sourceId}`);
  console.log(`Destination: ${destinationId}`);

  // Initialize distances and previous nodes
  const distances: Map<string, number> = new Map();
  const previous: Map<string, string | null> = new Map();
  const visited: Set<string> = new Set();
  const pq = new PriorityQueue();

  // Set initial distances to infinity
  graph.nodes.forEach((_, nodeId) => {
    distances.set(nodeId, Infinity);
    previous.set(nodeId, null);
  });

  // Source node has distance 0
  distances.set(sourceId, 0);
  pq.enqueue(sourceId, 0);

  let nodesVisited = 0;

  // Main Dijkstra loop
  while (!pq.isEmpty()) {
    const current = pq.dequeue();
    if (!current) break;

    const { nodeId } = current;
    
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    nodesVisited++;

    console.log(`Visiting node: ${nodeId}, distance: ${distances.get(nodeId)?.toFixed(2)} min`);

    // Found destination - reconstruct path
    if (nodeId === destinationId) {
      console.log('=== DESTINATION REACHED ===');
      break;
    }

    // Explore neighbors
    const edges = graph.edges.get(nodeId) || [];
    
    for (const edge of edges) {
      if (visited.has(edge.to)) continue;

      // Calculate new distance using travel time (with traffic)
      const effectiveTime = edge.travelTime * edge.trafficMultiplier;
      const newDistance = (distances.get(nodeId) || 0) + effectiveTime;

      // Relaxation step
      if (newDistance < (distances.get(edge.to) || Infinity)) {
        distances.set(edge.to, newDistance);
        previous.set(edge.to, nodeId);
        pq.enqueue(edge.to, newDistance);
        
        console.log(`  -> Updated ${edge.to}: ${newDistance.toFixed(2)} min`);
      }
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let current: string | null = destinationId;
  
  while (current !== null) {
    path.unshift(current);
    current = previous.get(current) || null;
  }

  // If no path found
  if (path[0] !== sourceId) {
    console.log('=== NO PATH FOUND ===');
    return null;
  }

  // Calculate total distance
  let totalDistance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const edges = graph.edges.get(path[i]) || [];
    const edge = edges.find(e => e.to === path[i + 1]);
    if (edge) {
      totalDistance += edge.distance;
    }
  }

  const pathNodes = path.map(id => graph.nodes.get(id)!).filter(Boolean);
  const executionTimeMs = performance.now() - startTime;

  console.log('=== DIJKSTRA ALGORITHM COMPLETE ===');
  console.log(`Path: ${path.join(' -> ')}`);
  console.log(`Total Distance: ${totalDistance.toFixed(2)} km`);
  console.log(`Total Time: ${distances.get(destinationId)?.toFixed(2)} min`);
  console.log(`Nodes Visited: ${nodesVisited}`);
  console.log(`Execution Time: ${executionTimeMs.toFixed(2)} ms`);

  return {
    path,
    pathNodes,
    totalDistance,
    totalTime: distances.get(destinationId) || 0,
    algorithm: 'dijkstra',
    nodesVisited,
    executionTimeMs
  };
}

// ============================================================
// A* ALGORITHM
// ============================================================

export interface AStarResult {
  path: string[];
  pathNodes: GraphNode[];
  totalDistance: number;
  totalTime: number;
  algorithm: 'astar';
  nodesVisited: number;
  executionTimeMs: number;
}

/**
 * Heuristic function for A*
 * Uses straight-line distance (Haversine) converted to estimated travel time
 */
function heuristic(node: GraphNode, destination: GraphNode): number {
  const distance = haversineDistance(
    node.lat, node.lng,
    destination.lat, destination.lng
  );
  // Assume optimistic speed of 40 km/h for heuristic (admissible)
  return (distance / 40) * 60; // Convert to minutes
}

/**
 * A* Algorithm Implementation
 * 
 * Enhanced pathfinding using heuristic function to guide search
 * towards the destination more efficiently than Dijkstra.
 * 
 * f(n) = g(n) + h(n)
 * - g(n): Actual cost from start to current node
 * - h(n): Estimated cost from current to destination (heuristic)
 * 
 * Time Complexity: O((V + E) log V) - typically faster than Dijkstra in practice
 * Space Complexity: O(V)
 * 
 * @param graph - The road network graph
 * @param sourceId - Starting node ID
 * @param destinationId - Target node ID
 * @param avoidNodes - Optional nodes to avoid (for rerouting around incidents)
 * @returns Optimal path with total distance and time
 */
export function astar(
  graph: Graph,
  sourceId: string,
  destinationId: string,
  avoidNodes: Set<string> = new Set()
): AStarResult | null {
  const startTime = performance.now();

  console.log('=== A* ALGORITHM START ===');
  console.log(`Source: ${sourceId}`);
  console.log(`Destination: ${destinationId}`);
  console.log(`Avoiding ${avoidNodes.size} nodes`);

  const destinationNode = graph.nodes.get(destinationId);
  if (!destinationNode) {
    console.log('Destination node not found');
    return null;
  }

  // g(n): Cost from start to node n
  const gScore: Map<string, number> = new Map();
  // f(n) = g(n) + h(n): Total estimated cost
  const fScore: Map<string, number> = new Map();
  const previous: Map<string, string | null> = new Map();
  const openSet = new PriorityQueue();
  const closedSet: Set<string> = new Set();

  // Initialize
  graph.nodes.forEach((_, nodeId) => {
    gScore.set(nodeId, Infinity);
    fScore.set(nodeId, Infinity);
    previous.set(nodeId, null);
  });

  const sourceNode = graph.nodes.get(sourceId);
  if (!sourceNode) {
    console.log('Source node not found');
    return null;
  }

  gScore.set(sourceId, 0);
  fScore.set(sourceId, heuristic(sourceNode, destinationNode));
  openSet.enqueue(sourceId, fScore.get(sourceId)!);

  let nodesVisited = 0;

  // Main A* loop
  while (!openSet.isEmpty()) {
    const current = openSet.dequeue();
    if (!current) break;

    const { nodeId } = current;
    
    if (closedSet.has(nodeId)) continue;
    closedSet.add(nodeId);
    nodesVisited++;

    const currentNode = graph.nodes.get(nodeId);
    console.log(`Visiting node: ${nodeId}, f=${fScore.get(nodeId)?.toFixed(2)}, g=${gScore.get(nodeId)?.toFixed(2)}`);

    // Found destination
    if (nodeId === destinationId) {
      console.log('=== DESTINATION REACHED ===');
      break;
    }

    // Explore neighbors
    const edges = graph.edges.get(nodeId) || [];

    for (const edge of edges) {
      // Skip avoided nodes (incidents)
      if (avoidNodes.has(edge.to)) {
        console.log(`  -> Avoiding ${edge.to} (incident)`);
        continue;
      }

      if (closedSet.has(edge.to)) continue;

      const neighborNode = graph.nodes.get(edge.to);
      if (!neighborNode) continue;

      // Calculate tentative g score
      const effectiveTime = edge.travelTime * edge.trafficMultiplier;
      const tentativeGScore = (gScore.get(nodeId) || 0) + effectiveTime;

      if (tentativeGScore < (gScore.get(edge.to) || Infinity)) {
        // This path is better
        previous.set(edge.to, nodeId);
        gScore.set(edge.to, tentativeGScore);
        
        // f(n) = g(n) + h(n)
        const h = heuristic(neighborNode, destinationNode);
        fScore.set(edge.to, tentativeGScore + h);

        if (!openSet.contains(edge.to)) {
          openSet.enqueue(edge.to, fScore.get(edge.to)!);
        } else {
          openSet.updatePriority(edge.to, fScore.get(edge.to)!);
        }

        console.log(`  -> Updated ${edge.to}: g=${tentativeGScore.toFixed(2)}, h=${h.toFixed(2)}, f=${fScore.get(edge.to)?.toFixed(2)}`);
      }
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let current: string | null = destinationId;

  while (current !== null) {
    path.unshift(current);
    current = previous.get(current) || null;
  }

  // If no path found
  if (path[0] !== sourceId) {
    console.log('=== NO PATH FOUND ===');
    return null;
  }

  // Calculate total distance
  let totalDistance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const edges = graph.edges.get(path[i]) || [];
    const edge = edges.find(e => e.to === path[i + 1]);
    if (edge) {
      totalDistance += edge.distance;
    }
  }

  const pathNodes = path.map(id => graph.nodes.get(id)!).filter(Boolean);
  const executionTimeMs = performance.now() - startTime;

  console.log('=== A* ALGORITHM COMPLETE ===');
  console.log(`Path: ${path.join(' -> ')}`);
  console.log(`Total Distance: ${totalDistance.toFixed(2)} km`);
  console.log(`Total Time: ${gScore.get(destinationId)?.toFixed(2)} min`);
  console.log(`Nodes Visited: ${nodesVisited}`);
  console.log(`Execution Time: ${executionTimeMs.toFixed(2)} ms`);

  return {
    path,
    pathNodes,
    totalDistance,
    totalTime: gScore.get(destinationId) || 0,
    algorithm: 'astar',
    nodesVisited,
    executionTimeMs
  };
}

// ============================================================
// TRAFFIC UPDATE FUNCTIONS
// ============================================================

/**
 * Update edge weights based on live traffic data
 */
export function updateTrafficOnEdges(
  graph: Graph,
  trafficData: { fromId: string; toId: string; multiplier: number }[]
): void {
  console.log('=== UPDATING TRAFFIC DATA ===');
  
  trafficData.forEach(({ fromId, toId, multiplier }) => {
    const edges = graph.edges.get(fromId);
    if (edges) {
      const edge = edges.find(e => e.to === toId);
      if (edge) {
        edge.trafficMultiplier = multiplier;
        console.log(`Traffic update: ${fromId} -> ${toId}, multiplier: ${multiplier}`);
      }
    }
  });
}

/**
 * Find nodes near incident locations
 */
export function findNodesNearIncident(
  graph: Graph,
  incidentLat: number,
  incidentLng: number,
  radius: number = 0.5 // km
): string[] {
  const nearbyNodes: string[] = [];

  graph.nodes.forEach((node, nodeId) => {
    const distance = haversineDistance(
      node.lat, node.lng,
      incidentLat, incidentLng
    );

    if (distance <= radius) {
      nearbyNodes.push(nodeId);
    }
  });

  return nearbyNodes;
}

// ============================================================
// PRE-BUILT VIZAG GRAPH
// ============================================================

let cachedGraph: Graph | null = null;

/**
 * Get the pre-built Vizag road network graph
 */
export function getVizagGraph(): Graph {
  if (!cachedGraph) {
    console.log('Building Vizag road network graph...');
    cachedGraph = buildGraphFromLocations(VIZAG_LOCATIONS, 2.5);
    console.log(`Graph built: ${cachedGraph.nodes.size} nodes, ${
      Array.from(cachedGraph.edges.values()).reduce((sum, edges) => sum + edges.length, 0)
    } edges`);
  }
  return cachedGraph;
}

/**
 * Find route using appropriate algorithm
 * - Dijkstra for initial route (no obstacles)
 * - A* for rerouting (with obstacles/incidents)
 */
export function findOptimalRoute(
  sourceName: string,
  destinationName: string,
  avoidIncidentLocations: { lat: number; lng: number }[] = []
): DijkstraResult | AStarResult | null {
  const graph = getVizagGraph();

  // Convert names to node IDs
  const sourceId = sourceName.toLowerCase().replace(/\s+/g, '-');
  const destinationId = destinationName.toLowerCase().replace(/\s+/g, '-');

  // Find nodes to avoid based on incident locations
  const avoidNodes = new Set<string>();
  avoidIncidentLocations.forEach(incident => {
    const nearbyNodes = findNodesNearIncident(graph, incident.lat, incident.lng, 0.5);
    nearbyNodes.forEach(nodeId => avoidNodes.add(nodeId));
  });

  // Use A* if we need to avoid nodes (rerouting), otherwise use Dijkstra
  if (avoidNodes.size > 0) {
    console.log('Using A* algorithm (avoiding incidents)');
    return astar(graph, sourceId, destinationId, avoidNodes);
  } else {
    console.log('Using Dijkstra algorithm (no obstacles)');
    return dijkstra(graph, sourceId, destinationId);
  }
}
