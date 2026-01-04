import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "emergency" | "info";
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  variant = "default" 
}: StatCardProps) {
  const variantStyles = {
    default: {
      iconBg: "bg-primary/10 border-primary/20",
      iconColor: "text-primary",
    },
    success: {
      iconBg: "bg-success/10 border-success/20",
      iconColor: "text-success",
    },
    warning: {
      iconBg: "bg-warning/10 border-warning/20",
      iconColor: "text-warning",
    },
    emergency: {
      iconBg: "bg-emergency/10 border-emergency/20",
      iconColor: "text-emergency",
    },
    info: {
      iconBg: "bg-info/10 border-info/20",
      iconColor: "text-info",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold font-mono tracking-tight">{value}</p>
            {trend && (
              <span className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-success" : "text-emergency"
              )}>
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110",
          styles.iconBg
        )}>
          <Icon className={cn("h-6 w-6", styles.iconColor)} />
        </div>
      </div>
    </div>
  );
}
