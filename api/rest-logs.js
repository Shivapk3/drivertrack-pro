import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { trip_id } = req.query;
      let query = supabase.from('rest_logs').select('*').order('start_time', { ascending: true });
      
      if (trip_id) query = query.eq('trip_id', trip_id);
      
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }
    
    if (req.method === 'POST') {
      // Start rest - auto capture time and GPS
      const { trip_id, location_name, notes, gps_lat, gps_lng } = req.body;
      
      const { data, error } = await supabase
        .from('rest_logs')
        .insert({
          trip_id,
          start_time: new Date().toISOString(),
          start_gps_lat: gps_lat,
          start_gps_lng: gps_lng,
          location_name,
          notes
        })
        .select()
        .single();
      
      if (error) throw error;
      return res.status(201).json(data);
    }
    
    if (req.method === 'PUT') {
      // End rest - auto capture time, GPS, and calculate duration
      const { id, gps_lat, gps_lng } = req.body;
      
      const { data: rest } = await supabase.from('rest_logs').select('*').eq('id', id).single();
      const endTime = new Date();
      const startTime = new Date(rest.start_time);
      const duration_minutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
      
      const { data, error } = await supabase
        .from('rest_logs')
        .update({
          end_time: endTime.toISOString(),
          end_gps_lat: gps_lat,
          end_gps_lng: gps_lng,
          duration_minutes
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return res.status(200).json(data);
    }
    
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}