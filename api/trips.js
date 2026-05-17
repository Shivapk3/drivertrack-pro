import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { driver_id, status } = req.query;
      let query = supabase.from('trips').select('*').order('created_at', { ascending: false });
      
      if (driver_id) query = query.eq('driver_id', driver_id);
      if (status) query = query.eq('status', status);
      
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }
    
    if (req.method === 'POST') {
      // Start Trip - CRITICAL: Auto-capture timestamp and GPS
      const {
        driver_id, driver_name, vehicle_id, vehicle_number,
        destination_name, starting_km, starting_km_image,
        start_gps_lat, start_gps_lng
      } = req.body;
      
      const { data, error } = await supabase
        .from('trips')
        .insert({
          driver_id,
          driver_name,
          vehicle_id,
          vehicle_number,
          destination_name,
          starting_km,
          starting_km_image,
          start_time: new Date().toISOString(), // AUTO CAPTURE
          start_gps_lat,
          start_gps_lng,
          status: 'active'
        })
        .select()
        .single();
      
      if (error) throw error;
      return res.status(201).json(data);
    }
    
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      
      // Handle destination reached
      if (updates.status === 'destination_reached') {
        updates.arrival_time = new Date().toISOString(); // AUTO CAPTURE
      }
      
      // Handle trip completion - RUN CALCULATIONS
      if (updates.status === 'completed') {
        updates.end_time = new Date().toISOString(); // AUTO CAPTURE
        
        // Fetch trip to get starting_km
        const { data: trip } = await supabase.from('trips').select('*').eq('id', id).single();
        
        // Fetch all fuel logs for this trip
        const { data: fuelLogs } = await supabase
          .from('fuel_logs')
          .select('*')
          .eq('trip_id', id);
        
        // CALCULATIONS
        const total_distance = parseFloat(updates.final_km) - parseFloat(trip.starting_km);
        const total_fuel_used = fuelLogs.reduce((sum, log) => sum + parseFloat(log.fuel_quantity || 0), 0);
        const total_fuel_cost = fuelLogs.reduce((sum, log) => sum + parseFloat(log.fuel_amount || 0), 0);
        const mileage = total_fuel_used > 0 ? total_distance / total_fuel_used : 0;
        
        const startTime = new Date(trip.start_time);
        const endTime = new Date(updates.end_time);
        const duration_minutes = Math.round((endTime - startTime) / 60000);
        
        updates.total_distance = total_distance;
        updates.total_fuel_used = total_fuel_used;
        updates.total_fuel_cost = total_fuel_cost;
        updates.mileage = Math.round(mileage * 100) / 100;
        updates.duration_minutes = duration_minutes;
      }
      
      const { data, error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return res.status(200).json(data);
    }
    
    if (req.method === 'DELETE') {
      const { id } = req.body;
      const { error } = await supabase.from('trips').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}