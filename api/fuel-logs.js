import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { trip_id } = req.query;
      let query = supabase.from('fuel_logs').select('*').order('log_time', { ascending: true });
      
      if (trip_id) query = query.eq('trip_id', trip_id);
      
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }
    
    if (req.method === 'POST') {
      // Fuel Entry - CRITICAL: Auto-capture timestamp and GPS
      const {
        trip_id, fuel_quantity, fuel_amount,
        current_km, fuel_station_name, fuel_bill_image,
        gps_lat, gps_lng
      } = req.body;
      
      const { data, error } = await supabase
        .from('fuel_logs')
        .insert({
          trip_id,
          fuel_quantity,
          fuel_amount,
          current_km,
          fuel_station_name,
          fuel_bill_image,
          log_time: new Date().toISOString(), // AUTO CAPTURE
          gps_lat,
          gps_lng
        })
        .select()
        .single();
      
      if (error) throw error;
      return res.status(201).json(data);
    }
    
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}