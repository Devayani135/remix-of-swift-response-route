import { useState, useCallback, useEffect } from "react";
import type { Alert } from "@/components/dashboard/AlertCard";

const initialAlerts: Alert[] = [
  {
    id: "alert-1",
    type: "accident",
    title: "Vehicle Collision Reported",
    message: "Two-vehicle accident blocking left lane. Emergency services dispatched.",
    location: "Mehdipatnam Junction",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    severity: "high",
    alternateRoute: "Via Masab Tank → Lakdikapul → Nampally",
  },
  {
    id: "alert-2",
    type: "congestion",
    title: "Heavy Traffic Detected",
    message: "YOLOv8 detected 87% lane occupancy. Expected delay: 12 minutes.",
    location: "Dilsukhnagar X-Roads",
    timestamp: new Date(Date.now() - 12 * 60 * 1000),
    severity: "medium",
  },
];

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);

  const addAlert = useCallback((alert: Omit<Alert, "id" | "timestamp">) => {
    const newAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}`,
      timestamp: new Date(),
    };
    setAlerts(prev => [newAlert, ...prev]);
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  // Simulate occasional new alerts
  useEffect(() => {
    const simulateAlert = () => {
      const alertTypes: Alert["type"][] = ["reroute", "accident", "congestion", "roadblock"];
      const severities: Alert["severity"][] = ["low", "medium", "high"];
      
      const randomAlerts = [
        {
          type: "reroute" as const,
          title: "Route Optimization Available",
          message: "Faster route detected via bypass road. Save 4 minutes.",
          location: "Tolichowki Junction",
          severity: "low" as const,
          alternateRoute: "Via Financial District → Nanakramguda",
        },
        {
          type: "roadblock" as const,
          title: "Road Construction Ahead",
          message: "Scheduled road work blocking main lane until 10:00 PM.",
          location: "Kothapet Bridge",
          severity: "medium" as const,
          alternateRoute: "Via Champapet → Sagar Ring Road",
        },
      ];

      const randomAlert = randomAlerts[Math.floor(Math.random() * randomAlerts.length)];
      addAlert(randomAlert);
    };

    // Add a new alert every 30-60 seconds (simulation)
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        simulateAlert();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [addAlert]);

  return {
    alerts,
    addAlert,
    dismissAlert,
    activeCount: alerts.filter(a => a.severity === "high" || a.severity === "critical").length,
  };
}
