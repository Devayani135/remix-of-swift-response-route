import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowUp,
  ArrowRight,
  ArrowLeft,
  CornerUpRight,
  CornerUpLeft,
  MapPin,
  Navigation,
  Flag,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GraphNode } from "@/utils/graphAlgorithms";

interface TurnInstruction {
  step: number;
  instruction: string;
  distance: string;
  icon: typeof ArrowUp;
  nodeName: string;
  isActive: boolean;
  isPassed: boolean;
}

interface TurnByTurnPanelProps {
  pathNodes: GraphNode[];
  currentNodeIndex: number;
  totalDistance: number;
  totalTime: number;
  algorithm: "dijkstra" | "astar";
}

/**
 * Calculate turn direction based on coordinates
 */
function calculateTurn(
  prev: GraphNode,
  current: GraphNode,
  next: GraphNode
): { instruction: string; icon: typeof ArrowUp } {
  // Calculate bearing from prev to current
  const bearing1 = Math.atan2(
    current.lng - prev.lng,
    current.lat - prev.lat
  ) * 180 / Math.PI;

  // Calculate bearing from current to next
  const bearing2 = Math.atan2(
    next.lng - current.lng,
    next.lat - current.lat
  ) * 180 / Math.PI;

  // Calculate turn angle
  let turnAngle = bearing2 - bearing1;
  if (turnAngle > 180) turnAngle -= 360;
  if (turnAngle < -180) turnAngle += 360;

  // Determine turn direction
  if (Math.abs(turnAngle) < 30) {
    return { instruction: "Continue straight", icon: ArrowUp };
  } else if (turnAngle >= 30 && turnAngle < 70) {
    return { instruction: "Turn slight right", icon: CornerUpRight };
  } else if (turnAngle >= 70 && turnAngle < 120) {
    return { instruction: "Turn right", icon: ArrowRight };
  } else if (turnAngle >= 120) {
    return { instruction: "Turn sharp right", icon: ArrowRight };
  } else if (turnAngle <= -30 && turnAngle > -70) {
    return { instruction: "Turn slight left", icon: CornerUpLeft };
  } else if (turnAngle <= -70 && turnAngle > -120) {
    return { instruction: "Turn left", icon: ArrowLeft };
  } else {
    return { instruction: "Turn sharp left", icon: ArrowLeft };
  }
}

/**
 * Calculate distance between two nodes in km
 */
function calculateNodeDistance(node1: GraphNode, node2: GraphNode): number {
  const R = 6371; // Earth's radius in km
  const dLat = (node2.lat - node1.lat) * Math.PI / 180;
  const dLng = (node2.lng - node1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(node1.lat * Math.PI / 180) * Math.cos(node2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function TurnByTurnPanel({
  pathNodes,
  currentNodeIndex,
  totalDistance,
  totalTime,
  algorithm,
}: TurnByTurnPanelProps) {
  const instructions = useMemo((): TurnInstruction[] => {
    if (!pathNodes || pathNodes.length < 2) return [];

    const result: TurnInstruction[] = [];

    // Start instruction
    result.push({
      step: 1,
      instruction: "Start from",
      distance: "",
      icon: Circle,
      nodeName: pathNodes[0].name,
      isActive: currentNodeIndex === 0,
      isPassed: currentNodeIndex > 0,
    });

    // Turn-by-turn instructions
    for (let i = 1; i < pathNodes.length - 1; i++) {
      const prev = pathNodes[i - 1];
      const current = pathNodes[i];
      const next = pathNodes[i + 1];

      const turn = calculateTurn(prev, current, next);
      const distance = calculateNodeDistance(prev, current);

      result.push({
        step: i + 1,
        instruction: turn.instruction,
        distance: distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`,
        icon: turn.icon,
        nodeName: current.name,
        isActive: currentNodeIndex === i,
        isPassed: currentNodeIndex > i,
      });
    }

    // Destination instruction
    if (pathNodes.length >= 2) {
      const lastDistance = calculateNodeDistance(
        pathNodes[pathNodes.length - 2],
        pathNodes[pathNodes.length - 1]
      );
      
      result.push({
        step: pathNodes.length,
        instruction: "Arrive at",
        distance: lastDistance < 1 ? `${(lastDistance * 1000).toFixed(0)}m` : `${lastDistance.toFixed(1)}km`,
        icon: Flag,
        nodeName: pathNodes[pathNodes.length - 1].name,
        isActive: currentNodeIndex === pathNodes.length - 1,
        isPassed: false,
      });
    }

    return result;
  }, [pathNodes, currentNodeIndex]);

  if (pathNodes.length < 2) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 text-center">
          <Navigation className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Select source and destination to see turn-by-turn navigation
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Navigation className="h-4 w-4 text-primary" />
            Turn-by-Turn Navigation
          </CardTitle>
          <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary">
            {algorithm === "astar" ? "A*" : "Dijkstra"}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
          <span>{totalDistance.toFixed(1)} km</span>
          <span>•</span>
          <span>{Math.round(totalTime)} min</span>
          <span>•</span>
          <span>{pathNodes.length} waypoints</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-1">
            {instructions.map((instruction, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 p-2 rounded-lg transition-colors",
                  instruction.isActive && "bg-primary/10 border border-primary/30",
                  instruction.isPassed && "opacity-50"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-full flex-shrink-0",
                    instruction.isActive
                      ? "bg-primary text-primary-foreground"
                      : instruction.isPassed
                      ? "bg-muted text-muted-foreground"
                      : "bg-secondary text-foreground"
                  )}
                >
                  <instruction.icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-medium",
                      instruction.isActive && "text-primary"
                    )}>
                      {instruction.instruction}
                    </span>
                    {instruction.distance && (
                      <span className="text-xs text-muted-foreground">
                        {instruction.distance}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    at {instruction.nodeName}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  #{instruction.step}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
