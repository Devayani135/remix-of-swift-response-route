import { Activity, Bell, Radio, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  activeAlerts: number;
  systemStatus: "online" | "warning" | "offline";
}

export function Header({ activeAlerts, systemStatus }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo & Title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">SNSEV</h1>
              <p className="text-xs text-muted-foreground">Smart Navigation System for Emergency Vehicles</p>
            </div>
          </div>
        </div>

        {/* Center - System Status */}
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm">
            <Radio className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">CCTV Feed:</span>
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
              <span className="status-dot status-dot-active mr-1.5"></span>
              12 Active
            </Badge>
          </div>
          
          <div className="h-4 w-px bg-border" />
          
          <div className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">System:</span>
            <Badge 
              variant="outline" 
              className={
                systemStatus === "online" 
                  ? "bg-success/10 text-success border-success/20" 
                  : systemStatus === "warning"
                  ? "bg-warning/10 text-warning border-warning/20"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              }
            >
              <span className={`status-dot ${
                systemStatus === "online" ? "status-dot-active" : 
                systemStatus === "warning" ? "status-dot-warning" : "status-dot-emergency"
              } mr-1.5`}></span>
              {systemStatus.charAt(0).toUpperCase() + systemStatus.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {activeAlerts > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emergency text-[10px] font-bold text-emergency-foreground">
                {activeAlerts}
              </span>
            )}
          </Button>
          
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border">
            <span className="text-xs text-muted-foreground">Hyderabad, India</span>
            <span className="text-xs font-mono text-foreground">
              {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
