-- Routes table for storing predefined routes
CREATE TABLE public.routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_point TEXT NOT NULL,
  end_point TEXT NOT NULL,
  waypoints JSONB NOT NULL DEFAULT '[]',
  distance_km DECIMAL(10,2) NOT NULL,
  estimated_time_minutes INTEGER NOT NULL,
  route_type TEXT NOT NULL DEFAULT 'primary' CHECK (route_type IN ('primary', 'alternate1', 'alternate2')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Traffic data table for real-time traffic conditions
CREATE TABLE public.traffic_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_name TEXT NOT NULL,
  density INTEGER NOT NULL CHECK (density >= 0 AND density <= 100),
  vehicle_count INTEGER NOT NULL DEFAULT 0,
  average_speed DECIMAL(5,2),
  coordinates JSONB NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Alerts table for incidents/accidents
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('accident', 'congestion', 'roadwork', 'weather', 'emergency')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  coordinates JSONB,
  affected_route_id UUID REFERENCES public.routes(id),
  alternate_route_id UUID REFERENCES public.routes(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vehicles table for emergency vehicle tracking
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('ambulance', 'fire', 'police', 'rescue')),
  vehicle_number TEXT NOT NULL UNIQUE,
  driver_name TEXT NOT NULL,
  driver_contact TEXT,
  current_route_id UUID REFERENCES public.routes(id),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'dispatched', 'en_route', 'arrived', 'returning')),
  current_position JSONB,
  dispatched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CCTV cameras table
CREATE TABLE public.cctv_cameras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  coordinates JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'maintenance')),
  vehicle_count INTEGER NOT NULL DEFAULT 0,
  density INTEGER NOT NULL DEFAULT 0 CHECK (density >= 0 AND density <= 100),
  feed_url TEXT,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (public read for simulation)
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cctv_cameras ENABLE ROW LEVEL SECURITY;

-- Public read policies for all tables (simulation mode)
CREATE POLICY "Public read access for routes" ON public.routes FOR SELECT USING (true);
CREATE POLICY "Public read access for traffic_data" ON public.traffic_data FOR SELECT USING (true);
CREATE POLICY "Public read access for alerts" ON public.alerts FOR SELECT USING (true);
CREATE POLICY "Public read access for vehicles" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Public read access for cctv_cameras" ON public.cctv_cameras FOR SELECT USING (true);

-- Public insert/update for simulation (in production, these would require auth)
CREATE POLICY "Public insert for vehicles" ON public.vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update for vehicles" ON public.vehicles FOR UPDATE USING (true);
CREATE POLICY "Public insert for alerts" ON public.alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update for alerts" ON public.alerts FOR UPDATE USING (true);
CREATE POLICY "Public update for traffic_data" ON public.traffic_data FOR UPDATE USING (true);
CREATE POLICY "Public insert for traffic_data" ON public.traffic_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update for cctv_cameras" ON public.cctv_cameras FOR UPDATE USING (true);

-- Enable realtime for traffic updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.traffic_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;

-- Insert initial route data (Gachibowli to LB Nagar)
INSERT INTO public.routes (name, start_point, end_point, waypoints, distance_km, estimated_time_minutes, route_type) VALUES
('Primary Route via ORR', 'Gachibowli', 'LB Nagar', '[{"lat": 17.4435, "lng": 78.3489}, {"lat": 17.4156, "lng": 78.4347}, {"lat": 17.3616, "lng": 78.5483}]', 24.5, 35, 'primary'),
('Alternate via Mehdipatnam', 'Gachibowli', 'LB Nagar', '[{"lat": 17.4435, "lng": 78.3489}, {"lat": 17.3950, "lng": 78.4424}, {"lat": 17.3616, "lng": 78.5483}]', 27.2, 42, 'alternate1'),
('Alternate via Attapur', 'Gachibowli', 'LB Nagar', '[{"lat": 17.4435, "lng": 78.3489}, {"lat": 17.3789, "lng": 78.4156}, {"lat": 17.3616, "lng": 78.5483}]', 29.8, 48, 'alternate2');

-- Insert initial traffic segment data
INSERT INTO public.traffic_data (segment_name, density, vehicle_count, average_speed, coordinates) VALUES
('Gachibowli Junction', 45, 234, 35.5, '{"lat": 17.4435, "lng": 78.3489}'),
('Biodiversity Junction', 62, 312, 28.0, '{"lat": 17.4239, "lng": 78.3697}'),
('Raidurg Metro', 38, 189, 42.0, '{"lat": 17.4156, "lng": 78.3847}'),
('Financial District', 71, 456, 22.5, '{"lat": 17.4189, "lng": 78.3947}'),
('Nanakramguda', 55, 278, 32.0, '{"lat": 17.4089, "lng": 78.3747}'),
('Tolichowki', 48, 245, 38.0, '{"lat": 17.3950, "lng": 78.4124}'),
('Mehdipatnam', 78, 512, 18.5, '{"lat": 17.3950, "lng": 78.4424}'),
('Attapur', 42, 198, 40.0, '{"lat": 17.3789, "lng": 78.4156}'),
('LB Nagar Junction', 65, 389, 25.0, '{"lat": 17.3616, "lng": 78.5483}');

-- Insert CCTV camera data (AI City dataset simulation)
INSERT INTO public.cctv_cameras (name, location, coordinates, status, vehicle_count, density) VALUES
('CAM-001 (AI City Track4)', 'Gachibowli Junction', '{"lat": 17.4435, "lng": 78.3489}', 'online', 234, 45),
('CAM-002 (AI City Track2)', 'Biodiversity Junction', '{"lat": 17.4239, "lng": 78.3697}', 'online', 312, 62),
('CAM-003 (AI City Track4)', 'Financial District', '{"lat": 17.4189, "lng": 78.3947}', 'online', 456, 71),
('CAM-004 (AI City Track2)', 'Mehdipatnam Circle', '{"lat": 17.3950, "lng": 78.4424}', 'online', 512, 78),
('CAM-005 (AI City Track4)', 'Attapur Flyover', '{"lat": 17.3789, "lng": 78.4156}', 'online', 198, 42),
('CAM-006 (AI City Track2)', 'LB Nagar Main', '{"lat": 17.3616, "lng": 78.5483}', 'online', 389, 65);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON public.routes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();