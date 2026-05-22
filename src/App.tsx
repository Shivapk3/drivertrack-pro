import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, MapPin, Fuel, Clock, Camera, Navigation, Gauge, 
  IndianRupee, FileText, CheckCircle2, LogOut, User, BarChart3, 
  ArrowLeft, Play, Pause, Flag, Home, Plus, Users, Key, 
  RotateCw, Download, Calendar, Wallet, Trash2, AlertTriangle 
} from 'lucide-react';
import supabase from './lib/supabase';

// --- FLEET DATA CONFIGURATION ---
const FLEET_VEHICLES = [
  { id: 1, vehicle_number: 'TG30T6048', model: 'NEW EICHER-1', type: 'Truck' },
  { id: 2, vehicle_number: 'TG30T6408', model: 'NEW EICHER-1', type: 'Truck' },
  { id: 3, vehicle_number: 'TS08UG0979', model: 'RED EICHER', type: 'Truck' },
  { id: 4, vehicle_number: 'TS08UG4608', model: 'BOX EICHER', type: 'Truck' },
  { id: 5, vehicle_number: 'TS30TA4608', model: 'TATA ULTRA T11', type: 'Truck' },
  { id: 6, vehicle_number: 'TS30TA4680', model: 'TATA ULTRA T11', type: 'Truck' },
  { id: 7, vehicle_number: 'TS30TA6840', model: 'WHITE CONTIANER', type: 'Container' },
  { id: 8, vehicle_number: 'TS30TA5691', model: 'NEW DOST', type: 'Truck' },
  { id: 9, vehicle_number: 'TS08UG0229', model: 'DOST PLUS', type: 'Truck' }
];

// --- TYPE DEFINITIONS ---
type Driver = { id: string; mobile: string; name: string; role: 'driver' | 'admin'; };
type Vehicle = { id: number; vehicle_number: string; model: string; type: string; };

type Trip = {
  id: number; driver_id: string; driver_name: string; vehicle_id: number; vehicle_number: string;
  start_location_name: string; destination_name: string; starting_km: number; starting_km_image?: string;
  start_time: string; start_gps_lat?: number; start_gps_lng?: number; arrival_km?: number;
  arrival_km_image?: string; arrival_time?: string; arrival_gps_lat?: number; arrival_gps_lng?: number;
  final_km?: number; final_km_image?: string; end_time?: string; end_gps_lat?: number; end_gps_lng?: number;
  notes?: string; status: 'active' | 'destination_reached' | 'completed';
  total_distance?: number; outbound_distance?: number; inbound_distance?: number;
  total_fuel_used?: number; total_fuel_cost?: number; total_break_minutes?: number; total_expenses?: number;
  mileage?: number; duration_minutes?: number; created_at: string; rest_logs?: RestLog[]; expense_logs?: ExpenseLog[];
};

type FuelLog = { id: number; trip_id: number; fuel_quantity: number; fuel_amount: number; current_km: number; fuel_station_name: string; fuel_bill_image?: string; log_time: string; gps_lat?: number; gps_lng?: number; };
type RestLog = { id: number; trip_id: number; start_time: string; end_time?: string; start_gps_lat?: number; start_gps_lng?: number; end_gps_lat?: number; end_gps_lng?: number; duration_minutes?: number; location_name?: string; notes?: string; };
type ExpenseLog = { id: number; trip_id: number; amount: number; description: string; bill_image?: string; log_time: string; gps_lat?: number; gps_lng?: number; };

export default function App() {
  // --- APPLICATION STATE ---
  const [user, setUser] = useState<Driver | null>(null);
  const [view, setView] = useState<'login' | 'driver' | 'admin'>('login');
  const [isInitializing, setIsInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'start' | 'fuel' | 'destination' | 'end' | 'rest' | 'expense'>('home');

  // --- DATA STATE ---
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [restLogs, setRestLogs] = useState<RestLog[]>([]);
  const [expenseLogs, setExpenseLogs] = useState<ExpenseLog[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [activeRest, setActiveRest] = useState<RestLog | null>(null);
  
  // --- LIVE TRACKING & TIMERS ---
  const [gps, setGps] = useState<{lat: number, lng: number} | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [liveDuration, setLiveDuration] = useState<string>('0h 0m');

  // --- FORMS & INPUT STATE ---
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [adminTab, setAdminTab] = useState<'dashboard' | 'drivers'>('dashboard');
  const [restLocation, setRestLocation] = useState(''); const [restNotes, setRestNotes] = useState('');
  const [newDriverName, setNewDriverName] = useState(''); const [newDriverMobile, setNewDriverMobile] = useState(''); const [newDriverPassword, setNewDriverPassword] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null); const [destination, setDestination] = useState('');
  const [startingKm, setStartingKm] = useState(''); const [startingKmImage, setStartingKmImage] = useState('');
  const [fuelQuantity, setFuelQuantity] = useState(''); const [fuelAmount, setFuelAmount] = useState(''); const [currentKm, setCurrentKm] = useState(''); const [fuelStation, setFuelStation] = useState(''); const [fuelBillImage, setFuelBillImage] = useState('');
  const [arrivalKm, setArrivalKm] = useState(''); const [arrivalKmImage, setArrivalKmImage] = useState('');
  const [finalKm, setFinalKm] = useState(''); const [finalKmImage, setFinalKmImage] = useState(''); const [notes, setNotes] = useState('');
  const [expenseAmount, setExpenseAmount] = useState(''); const [expenseDesc, setExpenseDesc] = useState(''); const [expenseImage, setExpenseImage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<'start' | 'fuel' | 'arrival' | 'final' | 'expense' | null>(null);

  // --- EFFECT: INITIALIZATION & CONTINUOUS GPS WATCH ---
  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsError(null);
        },
        (err) => {
          let msg = "GPS Signal Lost";
          if (err.code === err.PERMISSION_DENIED) msg = "Please Enable Location Access";
          setGpsError(msg);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setGpsError("GPS Not Supported");
    }

    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user) { fetchDriver(session.user.id); } else { setIsInitializing(false); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (session?.user) { fetchDriver(session.user.id); } else if (event === 'SIGNED_OUT') { setUser(null); setView('login'); setIsInitializing(false); }
    });

    refreshAdminData();
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      subscription.unsubscribe();
    };
  }, []);

  // --- EFFECT: REAL-TIME ACTIVE TRIP TICKER ---
  useEffect(() => {
    if (!activeTrip || currentScreen !== 'home') return;
    const interval = setInterval(() => {
      const diffMins = Math.round((Date.now() - new Date(activeTrip.start_time).getTime()) / 60000);
      setLiveDuration(formatDuration(diffMins));
    }, 30000); // update every 30s to preserve battery life

    // Initial run setup
    const diffMins = Math.round((Date.now() - new Date(activeTrip.start_time).getTime()) / 60000);
    setLiveDuration(formatDuration(diffMins));

    return () => clearInterval(interval);
  }, [activeTrip, currentScreen]);

  // --- DATABASE HELPER FUNCTIONS ---
  const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  const openImageWindow = (base64Data: string) => { const w = window.open(); if (w) { w.document.write(`<img src="${base64Data}" style="max-width:100%; max-height:100vh; display:block; margin:auto; border-radius:8px; background:#000;" />`); } };

  const refreshAdminData = () => { fetchAllTrips(); fetchDrivers(); };

  const fetchDrivers = async () => {
    const { data } = await supabase.from('profiles').select('*');
    if (data) {
      const mappedDrivers = data.map(profile => ({
        id: profile.id,
        mobile: profile.phone?.replace('+91', '') || '',
        name: profile.full_name || 'Driver',
        role: profile.role || (profile.is_admin ? 'admin' : 'driver')
      })) as Driver[];
      setDrivers(mappedDrivers);
    }
  };

  const fetchDriver = async (id: string) => {
    try {
      const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (error) throw error;
      if (profile) {
        const currentDriver: Driver = { id: profile.id, mobile: profile.phone?.replace('+91', '') || '', name: profile.full_name || 'Fleet Member', role: profile.role || (profile.is_admin ? 'admin' : 'driver') };
        setUser(currentDriver);
        if (profile.is_admin === true || profile.role === 'admin' || currentDriver.mobile === '9492911408') {
          setView('admin'); refreshAdminData(); setIsInitializing(false);
        } else {
          setView('driver'); await fetchActiveTrip(id);
        }
      }
    } catch (e) { console.error(e); setIsInitializing(false); }
  };

  const fetchActiveTrip = async (driverId: string) => {
    const { data } = await supabase.from('trips').select('*').eq('driver_id', driverId).neq('status', 'completed').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setActiveTrip(data[0]); setCurrentScreen('home'); fetchFuelLogs(data[0].id); fetchRestLogs(data[0].id); fetchExpenseLogs(data[0].id);
    } else { setActiveTrip(null); }
    setIsInitializing(false);
  };

  const fetchAllTrips = async () => {
    const { data } = await supabase.from('trips').select('*, rest_logs(*), expense_logs(*)').order('created_at', { ascending: false });
    if (data) setTrips(data);
  };

  const fetchFuelLogs = async (tripId: number) => { const { data } = await supabase.from('fuel_logs').select('*').eq('trip_id', tripId); if (data) setFuelLogs(data); };
  const fetchExpenseLogs = async (tripId: number) => { const { data } = await supabase.from('expense_logs').select('*').eq('trip_id', tripId); if (data) setExpenseLogs(data); };
  const fetchRestLogs = async (tripId: number) => {
    const { data } = await supabase.from('rest_logs').select('*').eq('trip_id', tripId);
    if (data) { setRestLogs(data); const active = data.find(r => !r.end_time); setActiveRest(active || null); }
  };

  // --- AUTHENTICATION & USER MANAGEMENT ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: `${mobile.trim()}@driver.com`, password: password.trim() });
      if (error) throw new Error(error.message);
    } catch (err: any) { alert(`Login Error: ${err.message}`); } finally { setLoading(false); }
  };

  const logout = async () => { await supabase.auth.signOut(); setUser(null); setActiveTrip(null); setView('login'); };

  const createDriver = async () => {
    if (!newDriverMobile || !newDriverName || !newDriverPassword) { alert('Please fill all fields'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email: `${newDriverMobile.trim()}@driver.com`, password: newDriverPassword.trim() });
      if (error) throw error;
      if (data.user) {
        await supabase.from('profiles').insert({ id: data.user.id, phone: `+91${newDriverMobile.trim()}`, role: 'driver', full_name: newDriverName, is_admin: false });
        alert(`Driver added successfully!`); setNewDriverMobile(''); setNewDriverName(''); setNewDriverPassword(''); fetchDrivers();
      }
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const removeDriver = async (driverId: string, driverName: string) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete ${driverName} from the system?`)) return;
    setLoading(true);
    try {
      await supabase.from('profiles').delete().eq('id', driverId);
      alert('Driver removed.');
      fetchDrivers();
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  // --- IMAGE HANDLING & COMPRESSION ---
  const handleImageCapture = (target: 'start' | 'fuel' | 'arrival' | 'final' | 'expense') => { setUploadTarget(target); fileInputRef.current?.click(); };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !uploadTarget) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Optimal scaling factor for storage
        const scale = MAX_WIDTH / img.width;
        
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7); // 70% jpeg quality compression
          
          if (uploadTarget === 'start') setStartingKmImage(compressedBase64);
          if (uploadTarget === 'fuel') setFuelBillImage(compressedBase64);
          if (uploadTarget === 'arrival') setArrivalKmImage(compressedBase64);
          if (uploadTarget === 'final') setFinalKmImage(compressedBase64);
          if (uploadTarget === 'expense') setExpenseImage(compressedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // --- DRIVER WORKFLOW MUTATIONS ---
  const startTrip = async () => {
    if (!user || !selectedVehicle || !destination || !startingKm) { alert('Missing inputs'); return; }
    setLoading(true);
    try {
      const { data: trip, error } = await supabase.from('trips').insert({ driver_id: user.id, driver_name: user.name, vehicle_id: selectedVehicle.id, vehicle_number: selectedVehicle.vehicle_number, start_location_name: 'Station Base', destination_name: destination, starting_km: parseFloat(startingKm), starting_km_image: startingKmImage, start_gps_lat: gps?.lat, start_gps_lng: gps?.lng, status: 'active' }).select().single();
      if (error) throw error;
      setActiveTrip(trip); setCurrentScreen('home'); fetchAllTrips(); setDestination(''); setStartingKm(''); setStartingKmImage('');
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const startRest = async () => {
    if (!activeTrip) return; setLoading(true);
    try {
      const { data, error } = await supabase.from('rest_logs').insert({ trip_id: activeTrip.id, location_name: restLocation, notes: restNotes, start_gps_lat: gps?.lat, start_gps_lng: gps?.lng }).select().single();
      if (error) throw error;
      setActiveRest(data); fetchRestLogs(activeTrip.id); setCurrentScreen('home'); setRestLocation(''); setRestNotes('');
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const endRest = async () => {
    if (!activeRest) return; setLoading(true);
    try {
      const endTime = new Date(); const duration = Math.round((endTime.getTime() - new Date(activeRest.start_time).getTime()) / 60000);
      await supabase.from('rest_logs').update({ end_time: endTime.toISOString(), end_gps_lat: gps?.lat, end_gps_lng: gps?.lng, duration_minutes: duration }).eq('id', activeRest.id);
      setActiveRest(null); if (activeTrip) fetchRestLogs(activeTrip.id);
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const addFuel = async () => {
    if (!activeTrip || !fuelQuantity || !fuelAmount || !currentKm) { alert('Missing inputs'); return; }
    const parsedCurrentKm = parseFloat(currentKm);
    if (parsedCurrentKm < activeTrip.starting_km) {
      alert(`Invalid Odometer input. Value cannot be less than trip starting gauge metrics (${activeTrip.starting_km} KM).`);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await supabase.from('fuel_logs').insert({ trip_id: activeTrip.id, fuel_quantity: parseFloat(fuelQuantity), fuel_amount: parseFloat(fuelAmount), current_km: parsedCurrentKm, fuel_station_name: fuelStation, fuel_bill_image: fuelBillImage, gps_lat: gps?.lat, gps_lng: gps?.lng });
      fetchFuelLogs(activeTrip.id); setCurrentScreen('home'); setFuelQuantity(''); setFuelAmount(''); setCurrentKm(''); setFuelStation(''); setFuelBillImage('');
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const addExpense = async () => {
    if (!activeTrip || !expenseAmount || !expenseDesc) { alert('Amount and description required'); return; }
    setLoading(true);
    try {
      await supabase.from('expense_logs').insert({ trip_id: activeTrip.id, amount: parseFloat(expenseAmount), description: expenseDesc, bill_image: expenseImage, gps_lat: gps?.lat, gps_lng: gps?.lng });
      fetchExpenseLogs(activeTrip.id); setCurrentScreen('home'); setExpenseAmount(''); setExpenseDesc(''); setExpenseImage('');
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const reachDestination = async () => {
    if (!activeTrip || !arrivalKm) return;
    const arrKm = parseFloat(arrivalKm);
    if (arrKm < activeTrip.starting_km) {
      alert(`Invalid Odometer input. Value cannot be less than trip starting metrics (${activeTrip.starting_km} KM).`);
      return;
    }
    setLoading(true);
    try {
      const { data: updated, error } = await supabase.from('trips').update({ arrival_km: arrKm, outbound_distance: arrKm - activeTrip.starting_km, arrival_km_image: arrivalKmImage, arrival_time: new Date().toISOString(), arrival_gps_lat: gps?.lat, arrival_gps_lng: gps?.lng, status: 'destination_reached', destination_name: destination || activeTrip.destination_name }).eq('id', activeTrip.id).select().single();
      if (error) throw error;
      setActiveTrip(updated); setCurrentScreen('home'); fetchAllTrips();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const endTrip = async () => {
    if (!activeTrip || !finalKm) return;
    const finKm = parseFloat(finalKm); 
    const baseKm = activeTrip.arrival_km || activeTrip.starting_km;
    
    if (finKm < baseKm) {
      alert(`Invalid Odometer metrics. Value cannot be less than previous logged milestone (${baseKm} KM).`);
      return;
    }
    setLoading(true);
    try {
      const arrKm = activeTrip.arrival_km || activeTrip.starting_km;
      const totDistance = finKm - activeTrip.starting_km;
      const totalBreakMins = restLogs.reduce((acc, log) => acc + (log.duration_minutes || 0), 0);
      const totalFuelAmt = fuelLogs.reduce((acc, log) => acc + (log.fuel_amount || 0), 0);
      const totalFuelQty = fuelLogs.reduce((acc, log) => acc + (log.fuel_quantity || 0), 0);
      const totalExp = expenseLogs.reduce((acc, log) => acc + (log.amount || 0), 0);
      const endTime = new Date(); const totalMins = Math.round((endTime.getTime() - new Date(activeTrip.start_time).getTime()) / 60000);
      const mileage = totalFuelQty > 0 ? (totDistance / totalFuelQty) : 0;

      const { error } = await supabase.from('trips').update({ final_km: finKm, inbound_distance: finKm - arrKm, total_distance: totDistance, total_break_minutes: totalBreakMins, total_fuel_cost: totalFuelAmt, total_fuel_used: totalFuelQty, total_expenses: totalExp, duration_minutes: totalMins, mileage: mileage, final_km_image: finalKmImage, end_time: endTime.toISOString(), end_gps_lat: gps?.lat, end_gps_lng: gps?.lng, notes, status: 'completed' }).eq('id', activeTrip.id);
      if (error) throw error;
      setActiveTrip(null); setCurrentScreen('home'); fetchAllTrips(); setFinalKm(''); setFinalKmImage(''); setNotes(''); setArrivalKm(''); setFuelLogs([]); setRestLogs([]); setExpenseLogs([]);
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  // --- CSV EXPORT LOGIC ---
  const escapeCSV = (val: any) => {
    const str = val === null || val === undefined ? '' : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const exportToCSV = async () => {
    const completedTripsList = trips.filter(t => t.status === 'completed');
    if(completedTripsList.length === 0) return alert("No completed trips to export.");
    
    const headers = ["Driver Name", "Vehicle", "Start Location", "Destination", "Start Date/Time", "Arrival Time", "Return Date/Time", "Total Duration", "Total Breaks (Mins)", "Starting KM", "Arrival KM", "Final KM", "Outbound Distance (KM)", "Inbound Distance (KM)", "Total Distance (KM)", "Total Fuel Used (Liters)", "Total Fuel Cost (Rs)", "Total Expenses (Rs)", "Overall Mileage", "Closing Notes"];
    
    const rows = completedTripsList.map(t => [
      escapeCSV(t.driver_name),
      escapeCSV(t.vehicle_number),
      escapeCSV(t.start_location_name || 'Station'),
      escapeCSV(t.destination_name),
      escapeCSV(new Date(t.start_time).toLocaleString()),
      escapeCSV(t.arrival_time ? new Date(t.arrival_time).toLocaleString() : 'N/A'),
      escapeCSV(t.end_time ? new Date(t.end_time).toLocaleString() : 'N/A'),
      escapeCSV(t.duration_minutes ? formatDuration(t.duration_minutes) : '0h 0m'),
      escapeCSV(t.total_break_minutes || 0),
      escapeCSV(t.starting_km),
      escapeCSV(t.arrival_km || 'N/A'),
      escapeCSV(t.final_km || 'N/A'),
      escapeCSV(t.outbound_distance || 0),
      escapeCSV(t.inbound_distance || 0),
      escapeCSV(t.total_distance || 0),
      escapeCSV(t.total_fuel_used || 0),
      escapeCSV(t.total_fuel_cost || 0),
      escapeCSV(t.total_expenses || 0),
      escapeCSV(t.mileage ? t.mileage.toFixed(2) : 0),
      escapeCSV(t.notes || '')
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const fileName = `Fleet_Audit_Report_${new Date().toLocaleDateString()}.csv`;
    const file = new File([csvContent], fileName, { type: 'text/csv;charset=utf-8;' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Fleet Audit Report', text: 'Monthly Fleet Audit Data attached.' });
        return;
      } catch (err) { console.log('Share canceled', err); }
    }

    const link = document.createElement("a"); 
    link.setAttribute("href", URL.createObjectURL(file)); 
    link.setAttribute("download", fileName); 
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
  };


  // ==========================================
  // RENDER: LOADING STATE
  // ==========================================
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-zinc-400">Syncing live session security parameters...</p>
      </div>
    );
  }

  // ==========================================
  // RENDER: LOGIN VIEW
  // ==========================================
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
            <div className="text-center mb-10">
              <img src="https://sensationalagriinputs.com/wp-content/uploads/2026/05/Sensational-drivers.png" alt="Sensational Drivers Logo" className="w-24 h-24 mx-auto mb-6 object-contain drop-shadow-2xl" />
              <h1 className="text-3xl font-bold tracking-tight">Sensational Drivers</h1>
              <p className="text-zinc-500 mt-2">Fleet mileage & expenses management</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                  <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="10-digit mobile" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3.5 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all" required />
                </div>
              </div>
              <div>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all" required />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-white text-black font-semibold rounded-2xl py-3.5 hover:bg-zinc-200 transition-colors disabled:opacity-50 mt-2">
                {loading ? 'Verifying profile...' : 'Continue'}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: ADMIN CONTROL TOWER VIEW
  // ==========================================
  if (view === 'admin') {
    const activeTripsList = trips.filter(t => t.status === 'active' || t.status === 'destination_reached');
    const completedTripsList = trips.filter(t => t.status === 'completed');
    
    // Hardened aggregations
    const totalExpensesSum = completedTripsList.reduce((sum, t) => sum + (t.total_expenses || 0), 0);
    const tripsWithValidMileage = completedTripsList.filter(t => t.mileage && t.mileage > 0);
    const avgFleetMileage = tripsWithValidMileage.length > 0
      ? (tripsWithValidMileage.reduce((sum, t) => sum + (t.mileage || 0), 0) / tripsWithValidMileage.length).toFixed(1)
      : '0.0';

    return (
      <div className="min-h-screen bg-[#0B0F19] text-white">
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0B0F19]/80 border-b border-zinc-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="https://sensationalagriinputs.com/wp-content/uploads/2026/05/Sensational-drivers.png" alt="Sensational Logo" className="w-9 h-9 object-contain" />
              <div>
                <h1 className="font-semibold text-sm sm:text-base tracking-tight">Sensational Fleet Admin</h1>
                <p className="text-xs text-zinc-500 -mt-0.5">Control Tower Operations</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={refreshAdminData} className="p-2 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 flex items-center gap-1.5 text-xs font-medium transition-all">
                <RotateCw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Refresh Sync</span>
              </button>
              <button onClick={logout} className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 border border-transparent hover:border-red-500/20 rounded-xl transition-all">
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-800">
            <button onClick={() => setAdminTab('dashboard')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${adminTab === 'dashboard' ? 'border-violet-500 text-violet-400 font-semibold' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
              <BarChart3 className="w-4 h-4" /> Live Fleet Analytics
            </button>
            <button onClick={() => setAdminTab('drivers')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${adminTab === 'drivers' ? 'border-violet-500 text-violet-400 font-semibold' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
              <Users className="w-4 h-4" /> Manage Operators ({drivers.length})
            </button>
          </div>

          {adminTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Analytics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Completed Manifests', value: completedTripsList.length, icon: CheckCircle2, color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/10' },
                  { label: 'Active Runs On Road', value: activeTripsList.length, icon: Play, color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/10' },
                  { label: 'Total Paid Expenses', value: `₹${Math.round(totalExpensesSum).toLocaleString()}`, icon: Wallet, color: 'from-pink-500/20 to-rose-500/20 text-pink-400 border-pink-500/10' },
                  { label: 'True Fleet Mileage', value: `${avgFleetMileage} km/L`, icon: Gauge, color: 'from-violet-500/20 to-purple-500/20 text-violet-400 border-violet-500/10' },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="text-xs font-medium text-zinc-500 tracking-normal">{stat.label}</span>
                      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${stat.color} border flex items-center justify-center shrink-0`}><stat.icon className="w-4 h-4" /></div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Active Trips Table */}
              <div className="bg-zinc-900/20 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <h2 className="font-semibold text-sm text-zinc-200">Live Telematics Tracking</h2>
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-500/10 font-medium">{activeTripsList.length} Vehicles Moving</span>
                </div>
                
                {activeTripsList.length === 0 ? (
                  <div className="p-10 text-center text-zinc-500 text-sm">No vehicles are currently tracking out on live freight manifests.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-zinc-950/40 border-b border-zinc-800">
                        <tr className="text-xs text-zinc-500 tracking-wider font-medium uppercase">
                          <th className="px-5 py-3 font-semibold text-zinc-400">Operator Details</th>
                          <th className="px-5 py-3 font-semibold text-zinc-400">Vehicle Registrations</th>
                          <th className="px-5 py-3 font-semibold text-zinc-400">Assigned Destination</th>
                          <th className="px-5 py-3 font-semibold text-zinc-400">Departure Odometer</th>
                          <th className="px-5 py-3 font-semibold text-zinc-400">Proof Odo</th>
                          <th className="px-5 py-3 font-semibold text-zinc-400">Operational Phase</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                        {activeTripsList.map((trip) => {
                          const activeRestLog = trip.rest_logs?.find(r => !r.end_time);
                          const breakDurationMins = activeRestLog 
                            ? Math.round((Date.now() - new Date(activeRestLog.start_time).getTime()) / 60000)
                            : 0;

                          return (
                            <tr key={trip.id} className="hover:bg-zinc-800/10 transition-colors text-sm">
                              <td className="px-5 py-3.5">
                                <div className="font-semibold text-zinc-200">{trip.driver_name}</div>
                                <div className="text-xs text-zinc-500 mt-0.5">Dispatched: {new Date(trip.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                              </td>
                              <td className="px-5 py-3.5 font-mono text-xs font-semibold text-cyan-400 tracking-tight">{trip.vehicle_number}</td>
                              <td className="px-5 py-3.5 text-zinc-300 font-medium max-w-[180px] truncate" title={trip.destination_name}>{trip.destination_name}</td>
                              <td className="px-5 py-3.5 font-medium text-zinc-400 font-mono text-xs">{trip.starting_km.toLocaleString()} KM</td>
                              <td className="px-5 py-3.5">
                                {trip.starting_km_image ? (
                                  <img src={trip.starting_km_image} alt="Start Gauge" className="w-11 h-7 object-cover rounded-lg border border-zinc-800 cursor-pointer hover:border-zinc-600 transition-all active:scale-95" onClick={() => openImageWindow(trip.starting_km_image!)}/>
                                ) : (
                                  <span className="text-[11px] text-zinc-600 italic">No Upload</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5">
                                {activeRestLog ? (
                                  <div className="inline-flex flex-col">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse">
                                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" /> Stationary Rest
                                    </span>
                                    <span className="text-[10px] text-zinc-500 mt-0.5 font-mono pl-1">Duration: {breakDurationMins}m</span>
                                  </div>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${trip.status === 'destination_reached' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                    {trip.status === 'destination_reached' ? 'At Destination Yard' : 'En Route to Target'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Completed Manifests Table */}
              <div className="bg-zinc-900/20 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-3 bg-zinc-950/20">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-sm text-zinc-200">Closed Manifest Ledger</h2>
                    <span className="text-xs font-mono px-2 py-0.5 bg-zinc-800 rounded-lg text-zinc-400 border border-zinc-700/50">{completedTripsList.length} Entries</span>
                  </div>
                  <button onClick={exportToCSV} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all shadow-lg shadow-emerald-950/20 active:scale-95">
                    <Download className="w-3.5 h-3.5" /> Export Manifest Audit Ledger
                  </button>
                </div>

                {completedTripsList.length === 0 ? (
                  <div className="p-10 text-center text-zinc-500 text-sm">No historical closed manifests cataloged in this system state.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-zinc-950/40 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                        <tr>
                          <th className="px-5 py-3 font-semibold text-zinc-400">Operator Run Date</th>
                          <th className="px-5 py-3 font-semibold text-zinc-400">Asset / Point B</th>
                          <th className="px-5 py-3 font-semibold text-zinc-400">Distance Logs</th>
                          <th className="px-5 py-3 font-semibold text-zinc-400">Fuel & Expenses</th>
                          <th className="px-5 py-3 font-semibold text-zinc-400">Total Breaks</th>
                          <th className="px-5 py-3 font-semibold text-zinc-400">Odo Proofing Matrix</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40 text-sm">
                        {completedTripsList.map((trip) => (
                          <tr key={trip.id} className="hover:bg-zinc-800/20 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="font-medium text-zinc-200">{trip.driver_name}</div>
                              <div className="text-[11px] text-zinc-500 mt-0.5">{new Date(trip.start_time).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}</div>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="font-mono text-xs font-semibold text-cyan-400">{trip.vehicle_number}</div>
                              <div className="text-xs text-zinc-400 font-medium truncate max-w-[130px] mt-0.5" title={trip.destination_name}>{trip.destination_name}</div>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-xs">
                              <div className="font-semibold text-zinc-200">{trip.total_distance?.toFixed(1) || 0} KM</div>
                              <div className="text-[10px] text-zinc-500 flex gap-2 mt-0.5 font-sans">
                                <span><span className="text-zinc-600">OUT:</span> {trip.outbound_distance || 0}K</span>
                                <span><span className="text-zinc-600">IN:</span> {trip.inbound_distance || 0}K</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-xs font-mono">
                              <div className="font-bold text-pink-400">Exp: ₹{(trip.total_expenses || 0).toLocaleString()}</div>
                              <div className="text-[11px] text-zinc-400 mt-0.5">Fuel: ₹{(trip.total_fuel_cost || 0).toLocaleString()}</div>
                            </td>
                            <td className="px-5 py-3.5 font-medium text-orange-400 text-xs font-mono">
                              {trip.total_break_minutes ? formatDuration(trip.total_break_minutes) : '0h 0m'}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex gap-1.5 items-center">
                                {trip.starting_km_image && (
                                  <div className="text-center group">
                                    <img src={trip.starting_km_image} alt="Start Proof" className="w-9 h-6 object-cover rounded border border-zinc-800 cursor-pointer group-hover:border-zinc-500" onClick={() => openImageWindow(trip.starting_km_image!)}/>
                                    <div className="text-[9px] text-zinc-600 mt-0.5">Start</div>
                                  </div>
                                )}
                                {trip.arrival_km_image && (
                                  <div className="text-center group">
                                    <img src={trip.arrival_km_image} alt="Arrival Proof" className="w-9 h-6 object-cover rounded border border-zinc-800 cursor-pointer group-hover:border-zinc-500" onClick={() => openImageWindow(trip.arrival_km_image!)}/>
                                    <div className="text-[9px] text-zinc-600 mt-0.5">Arriv</div>
                                  </div>
                                )}
                                {trip.final_km_image && (
                                  <div className="text-center group">
                                    <img src={trip.final_km_image} alt="Final Proof" className="w-9 h-6 object-cover rounded border border-zinc-800 cursor-pointer group-hover:border-zinc-500" onClick={() => openImageWindow(trip.final_km_image!)}/>
                                    <div className="text-[9px] text-zinc-600 mt-0.5">End</div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {adminTab === 'drivers' && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800 rounded-2xl p-5 sticky top-24 space-y-4">
                  <div>
                    <h3 className="font-semibold text-zinc-200 flex items-center gap-2 text-sm sm:text-base"><Plus className="w-4 h-4 text-violet-400" /> Register Fleet Crew</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Creates authenticated database profiles.</p>
                  </div>
                  <div className="space-y-3.5">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block font-medium">Driver Full Name *</label>
                      <input type="text" value={newDriverName} onChange={(e) => setNewDriverName(e.target.value)} placeholder="Enter full name" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 transition-all text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block font-medium">Driver Phone (10-Digit) *</label>
                      <input type="tel" value={newDriverMobile} onChange={(e) => setNewDriverMobile(e.target.value)} maxLength={10} placeholder="9848022334" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 transition-all font-mono text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block font-medium">Secure Login Password *</label>
                      <input type="text" value={newDriverPassword} onChange={(e) => setNewDriverPassword(e.target.value)} placeholder="Minimum 6 characters" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 transition-all font-mono text-white" />
                    </div>
                    <button onClick={createDriver} disabled={loading || !newDriverMobile || !newDriverName || !newDriverPassword || newDriverMobile.length !== 10} className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:pointer-events-none text-white font-semibold rounded-xl py-2.5 text-sm transition-colors shadow-lg shadow-violet-950/20 pt-3">
                      {loading ? 'Executing Engine Hooks...' : 'Provision Driver Access'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2">
                <div className="bg-zinc-900/20 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm">
                  <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-950/20">
                    <h3 className="font-semibold text-sm text-zinc-200">Active Operators Roster</h3>
                  </div>
                  <div className="divide-y divide-zinc-800/40">
                    {drivers
                      .filter(d => d.mobile !== '9492911408' && d.mobile !== '9999999999')
                      .map((driver) => (
                        <div key={driver.id} className="p-4 sm:p-5 flex justify-between items-center gap-4 hover:bg-zinc-800/10 transition-colors">
                          <div className="flex gap-3 items-center min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800/60 border border-zinc-700/30 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-zinc-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm sm:text-base text-zinc-200 truncate">{driver.name}</div>
                              <div className="text-xs text-zinc-500 font-mono mt-0.5 flex items-center gap-1">
                                <span className="text-[10px] text-zinc-600 font-sans">ID:</span> {driver.mobile}
                              </div>
                            </div>
                          </div>
                          <button onClick={() => removeDriver(driver.id, driver.name)} className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/10 rounded-xl transition-all shrink-0 active:scale-95 shadow-md" title="Revoke Profile">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ==========================================
  // RENDER: DRIVER FLEET VIEW
  // ==========================================
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col max-w-lg mx-auto relative border-x border-zinc-900 shadow-2xl">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
      
      <header className="sticky top-0 z-30 backdrop-blur-2xl bg-[#0B0F19]/70 border-b border-zinc-900">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="https://sensationalagriinputs.com/wp-content/uploads/2026/05/Sensational-drivers.png" alt="Sensational Logo" className="w-8 h-8 object-contain" />
            <div>
              <div className="text-[11px] text-zinc-500 leading-none">Driver Profile</div>
              <div className="font-medium text-sm -mt-0.5">{user?.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {gpsError ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="text-[10px] text-red-400 font-medium uppercase">{gpsError}</span>
              </div>
            ) : gps ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-medium">GPS LOCK</span>
              </div>
            ) : (
              <div className="text-[10px] text-zinc-500">Awaiting GPS...</div>
            )}
            <button onClick={logout} className="p-2 hover:bg-zinc-900 rounded-xl"><LogOut className="w-4.5 h-4.5 text-zinc-500 hover:text-red-400" /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 pb-24">
        <AnimatePresence mode="wait">
          {currentScreen === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              {activeTrip ? (
                <>
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600/20 to-cyan-600/20 border border-emerald-500/20 p-[1px]">
                    <div className="rounded-3xl bg-zinc-950 p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Active Run</span>
                          </div>
                          <h2 className="text-xl font-semibold">{activeTrip.destination_name}</h2>
                          <p className="text-sm font-mono text-cyan-400 mt-0.5">{activeTrip.vehicle_number}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-zinc-900/50 rounded-2xl p-3 border border-zinc-800/50">
                          <Gauge className="w-4 h-4 text-zinc-600 mb-1.5" />
                          <div className="text-[11px] text-zinc-500">Initial KM</div>
                          <div className="font-semibold">{activeTrip.starting_km}</div>
                        </div>
                        <div className="bg-zinc-900/50 rounded-2xl p-3 border border-zinc-800/50">
                          <Wallet className="w-4 h-4 text-zinc-600 mb-1.5" />
                          <div className="text-[11px] text-zinc-500">Expenses</div>
                          <div className="font-semibold">{expenseLogs.length}</div>
                        </div>
                        <div className="bg-zinc-900/50 rounded-2xl p-3 border border-zinc-800/50">
                          <Clock className="w-4 h-4 text-zinc-600 mb-1.5" />
                          <div className="text-[11px] text-zinc-500">Duration</div>
                          <div className="font-semibold text-sm">{liveDuration}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button onClick={() => setCurrentScreen('expense')} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-all">
                      <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-pink-400" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">Log Travel Expense</div>
                        <div className="text-xs text-zinc-500 mt-0.5">Tolls, repairs, fines with receipt photo</div>
                      </div>
                    </button>
                    
                    {activeRest ? (
                      <button onClick={endRest} disabled={loading} className="w-full bg-orange-950/40 border border-orange-500/30 rounded-2xl p-4 flex items-center justify-between animate-pulse active:scale-[0.98] transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center"><Pause className="w-6 h-6 text-orange-400" /></div>
                          <div className="text-left">
                            <div className="font-medium text-orange-400">On Active Break...</div>
                            <div className="text-xs text-zinc-500 mt-0.5">Tap to resume driving duty</div>
                          </div>
                        </div>
                        <Play className="w-5 h-5 text-orange-400 mr-2" />
                      </button>
                    ) : (
                      <button onClick={() => setCurrentScreen('rest')} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-all">
                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center"><Pause className="w-6 h-6 text-orange-400" /></div>
                        <div className="text-left">
                          <div className="font-medium">Take Rest Break</div>
                          <div className="text-xs text-zinc-500 mt-0.5">Log downtime & rest locations</div>
                        </div>
                      </button>
                    )}
                    
                    <button onClick={() => setCurrentScreen('fuel')} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-all">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center"><Fuel className="w-6 h-6 text-amber-400" /></div>
                      <div className="text-left">
                        <div className="font-medium">Add Fuel Entry</div>
                        <div className="text-xs text-zinc-500 mt-0.5">Log liters, costs, and snap receipts</div>
                      </div>
                    </button>

                    {!activeTrip.arrival_time ? (
                      <button onClick={() => setCurrentScreen('destination')} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-all">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center"><Flag className="w-6 h-6 text-cyan-400" /></div>
                        <div className="text-left">
                          <div className="font-medium">Destination Reached</div>
                          <div className="text-xs text-zinc-500 mt-0.5">Arrived at customer yard / terminal</div>
                        </div>
                      </button>
                    ) : (
                      <button onClick={() => setCurrentScreen('end')} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl p-[1px] active:scale-[0.98] transition-all">
                        <div className="rounded-2xl bg-zinc-950 p-4 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center"><Home className="w-6 h-6 text-violet-400" /></div>
                          <div className="text-left">
                            <div className="font-medium">Return to Station Base & End Trip</div>
                            <div className="text-xs text-zinc-400 mt-0.5">Complete trip lifecycle metrics</div>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>

                  {expenseLogs.length > 0 && (
                    <div className="mt-6 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4">
                      <h3 className="text-xs font-semibold text-pink-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Expenses Logged</h3>
                      <div className="space-y-2">
                        {expenseLogs.map((log) => (
                          <div key={log.id} className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-900 text-xs">
                            <div className="font-medium text-zinc-200">{log.description}</div>
                            <div className="text-right font-semibold text-pink-400">₹{log.amount}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                    <Play className="w-10 h-10 text-zinc-700" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">No Active Manifest</h2>
                  <button onClick={() => setCurrentScreen('start')} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-black font-medium mt-4 shadow-lg active:scale-95 transition-all">
                    <Play className="w-4 h-4" /> Start New Trip
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {currentScreen === 'expense' && (
            <motion.div key="expense" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="flex items-center gap-3 mb-2"><button onClick={() => setCurrentScreen('home')} className="p-2 hover:bg-zinc-900 rounded-xl"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-xl font-semibold">Log Travel Expense</h2></div>
              <div><label className="text-xs text-zinc-500 mb-1 block">Expense Amount (₹) *</label><input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="0" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5" /></div>
              <div><label className="text-xs text-zinc-500 mb-1 block">Description (What was this for?) *</label><input type="text" value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} placeholder="e.g. Toll gate, puncture repair..." className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5" /></div>
              <div><label className="text-xs text-zinc-500 mb-1 block">Receipt Photo (Optional)</label><button type="button" onClick={() => handleImageCapture('expense')} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">{expenseImage ? <span className="text-pink-400 text-sm font-medium">✓ Receipt photo mapped</span> : <span className="text-zinc-400 text-sm">Take photo of bill/receipt</span>}</button></div>
              <button onClick={addExpense} disabled={loading || !expenseAmount || !expenseDesc} className="w-full bg-pink-600 py-3.5 rounded-2xl font-medium mt-2 active:scale-95 transition-all disabled:opacity-50">{loading ? 'Saving...' : 'Save Expense'}</button>
            </motion.div>
          )}

          {currentScreen === 'start' && (
            <motion.div key="start" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="flex items-center gap-3 mb-2"><button onClick={() => setCurrentScreen('home')} className="p-2 hover:bg-zinc-900 rounded-xl"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-xl font-semibold">Start New Trip</h2></div>
              <div><label className="text-xs text-zinc-500 mb-1 block">Select Vehicle *</label><select value={selectedVehicle?.id || ''} onChange={(e) => setSelectedVehicle(FLEET_VEHICLES.find(v => v.id === Number(e.target.value)) || null)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white"><option value="">Choose a truck...</option>{FLEET_VEHICLES.map(v => <option key={v.id} value={v.id}>{v.vehicle_number} • {v.model}</option>)}</select></div>
              <div><label className="text-xs text-zinc-500 mb-1 block">Destination *</label><input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Where are you going?" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5" /></div>
              <div><label className="text-xs text-zinc-500 mb-1 block">Starting KM Reading *</label><input type="number" value={startingKm} onChange={(e) => setStartingKm(e.target.value)} placeholder="e.g. 12450" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5" /></div>
              <div><label className="text-xs text-zinc-500 mb-1 block">Odometer Photo Proof *</label><button type="button" onClick={() => handleImageCapture('start')} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">{startingKmImage ? <span className="text-emerald-400 text-sm font-medium">✓ Photo attached successfully</span> : <span className="text-zinc-400 text-sm flex items-center justify-center gap-2"><Camera className="w-4 h-4"/> Tap to take photo of odometer</span>}</button></div>
              <button onClick={startTrip} disabled={loading || !selectedVehicle || !destination || !startingKm || !startingKmImage} className="w-full bg-emerald-600 py-3.5 rounded-2xl font-medium mt-2 active:scale-95 transition-all disabled:opacity-50">Start Trip</button>
            </motion.div>
          )}
          
          {currentScreen === 'rest' && (
            <motion.div key="rest" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="flex items-center gap-3 mb-2"><button onClick={() => setCurrentScreen('home')} className="p-2 hover:bg-zinc-900 rounded-xl"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-xl font-semibold">Start Rest Break</h2></div>
              <div><label className="text-xs text-zinc-500 mb-1 block">Location</label><input type="text" value={restLocation} onChange={(e) => setRestLocation(e.target.value)} placeholder="e.g. Highway Toll Plaza" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5" /></div>
              <button onClick={startRest} disabled={loading} className="w-full bg-orange-600 py-3.5 rounded-2xl font-medium mt-2 active:scale-95 transition-all">Start Break</button>
            </motion.div>
          )}
          
          {currentScreen === 'fuel' && (
            <motion.div key="fuel" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="flex items-center gap-3 mb-2"><button onClick={() => setCurrentScreen('home')} className="p-2 hover:bg-zinc-900 rounded-xl"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-xl font-semibold">Log Fuel</h2></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-zinc-500 mb-1 block">Liters</label><input type="number" step="0.1" value={fuelQuantity} onChange={(e) => setFuelQuantity(e.target.value)} placeholder="0.0" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5" /></div>
                <div><label className="text-xs text-zinc-500 mb-1 block">Cost (₹)</label><input type="number" value={fuelAmount} onChange={(e) => setFuelAmount(e.target.value)} placeholder="₹ Amount" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5" /></div>
              </div>
              <div><label className="text-xs text-zinc-500 mb-1 block">Current KM</label><input type="number" value={currentKm} onChange={(e) => setCurrentKm(e.target.value)} placeholder="Odometer" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5" /></div>
              <div><button type="button" onClick={() => handleImageCapture('fuel')} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">{fuelBillImage ? <span className="text-amber-400 text-sm font-medium">✓ Receipt mapped</span> : <span className="text-zinc-400 text-sm flex justify-center items-center gap-2"><Camera className="w-4 h-4"/> Take photo of bill</span>}</button></div>
              <button onClick={addFuel} disabled={loading || !fuelQuantity || !fuelAmount || !currentKm} className="w-full bg-amber-600 py-3.5 rounded-2xl font-medium active:scale-95 transition-all disabled:opacity-50">Save Fuel</button>
            </motion.div>
          )}
          
          {currentScreen === 'destination' && (
            <motion.div key="destination" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="flex items-center gap-3 mb-2"><button onClick={() => setCurrentScreen('home')} className="p-2 hover:bg-zinc-900 rounded-xl"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-xl font-semibold">Destination Reached</h2></div>
              <div><label className="text-xs text-zinc-500 mb-1 block">Arrival KM Reading</label><input type="number" value={arrivalKm} onChange={(e) => setArrivalKm(e.target.value)} placeholder="Odometer" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5" /></div>
              <div><button type="button" onClick={() => handleImageCapture('arrival')} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">{arrivalKmImage ? <span className="text-cyan-400 text-sm font-medium">✓ Proof logged</span> : <span className="text-zinc-400 text-sm flex justify-center items-center gap-2"><Camera className="w-4 h-4"/> Snap odometer gauge</span>}</button></div>
              <button onClick={reachDestination} disabled={loading || !arrivalKm} className="w-full bg-cyan-600 py-3.5 rounded-2xl font-medium active:scale-95 transition-all disabled:opacity-50">Submit</button>
            </motion.div>
          )}
          
          {currentScreen === 'end' && (
            <motion.div key="end" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="flex items-center gap-3 mb-2"><button onClick={() => setCurrentScreen('home')} className="p-2 hover:bg-zinc-900 rounded-xl"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-xl font-semibold">End Trip</h2></div>
              <div><label className="text-xs text-zinc-500 mb-1 block">Ending KM Reading</label><input type="number" value={finalKm} onChange={(e) => setFinalKm(e.target.value)} placeholder="Final odometer" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5" /></div>
              <div><button type="button" onClick={() => handleImageCapture('final')} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">{finalKmImage ? <span className="text-violet-400 text-sm font-medium">✓ Final proof linked</span> : <span className="text-zinc-400 text-sm flex justify-center items-center gap-2"><Camera className="w-4 h-4"/> Snap final gauge</span>}</button></div>
              <button onClick={endTrip} disabled={loading || !finalKm || !finalKmImage} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3.5 rounded-2xl font-medium active:scale-95 transition-all disabled:opacity-50">End Trip</button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
