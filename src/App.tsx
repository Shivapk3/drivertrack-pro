import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Fuel, Clock, Camera, Navigation, Gauge, IndianRupee, FileText, CheckCircle2, LogOut, User, BarChart3, ArrowLeft, Play, Pause, Flag, Home, Plus, Users, Key, RotateCw, Download, Calendar, Wallet, Trash2 } from 'lucide-react';
import supabase from './lib/supabase';

// --- YOUR EXCEL SHEET FLEET DATA ---
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
  const [user, setUser] = useState<Driver | null>(null);
  const [view, setView] = useState<'login' | 'driver' | 'admin'>('login');
  const [isInitializing, setIsInitializing] = useState(true);

  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [restLogs, setRestLogs] = useState<RestLog[]>([]);
  const [expenseLogs, setExpenseLogs] = useState<ExpenseLog[]>([]);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'start' | 'fuel' | 'destination' | 'end' | 'rest' | 'expense'>('home');
  const [gps, setGps] = useState<{lat: number, lng: number} | null>(null);
  const [adminTab, setAdminTab] = useState<'dashboard' | 'drivers'>('dashboard');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [activeRest, setActiveRest] = useState<RestLog | null>(null);
  
  // Forms
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

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }), () => console.log('GPS denied'));
    }

    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user) { fetchDriver(session.user.id); } else { setIsInitializing(false); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (session?.user) { fetchDriver(session.user.id); } else if (event === 'SIGNED_OUT') { setUser(null); setView('login'); setIsInitializing(false); }
    });

    refreshAdminData();
    return () => subscription.unsubscribe();
  }, []);

  const refreshAdminData = () => { fetchAllTrips(); fetchDrivers(); };

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
    const { data, error } = await supabase.from('trips').select('*').eq('driver_id', driverId).neq('status', 'completed').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setActiveTrip(data[0]); setCurrentScreen('home'); fetchFuelLogs(data[0].id); fetchRestLogs(data[0].id); fetchExpenseLogs(data[0].id);
    } else { setActiveTrip(null); }
    setIsInitializing(false);
  };

  const fetchAllTrips = async () => {
    const { data, error } = await supabase.from('trips').select('*, rest_logs(*), expense_logs(*)').order('created_at', { ascending: false });
    if (data) setTrips(data);
  };

  const fetchFuelLogs = async (tripId: number) => { const { data } = await supabase.from('fuel_logs').select('*').eq('trip_id', tripId); if (data) setFuelLogs(data); };
  const fetchExpenseLogs = async (tripId: number) => { const { data } = await supabase.from('expense_logs').select('*').eq('trip_id', tripId); if (data) setExpenseLogs(data); };
  const fetchRestLogs = async (tripId: number) => {
    const { data } = await supabase.from('rest_logs').select('*').eq('trip_id', tripId);
    if (data) { setRestLogs(data); const active = data.find(r => !r.end_time); setActiveRest(active || null); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: `${mobile.trim()}@driver.com`, password: password.trim() });
      if (error) throw new Error(error.message);
    } catch (err: any) { alert(`Login Error: ${err.message}`); } finally { setLoading(false); }
  };

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

  const handleImageCapture = (target: 'start' | 'fuel' | 'arrival' | 'final' | 'expense') => { setUploadTarget(target); fileInputRef.current?.click(); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !uploadTarget) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (uploadTarget === 'start') setStartingKmImage(dataUrl);
      if (uploadTarget === 'fuel') setFuelBillImage(dataUrl);
      if (uploadTarget === 'arrival') setArrivalKmImage(dataUrl);
      if (uploadTarget === 'final') setFinalKmImage(dataUrl);
      if (uploadTarget === 'expense') setExpenseImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const startTrip = async () => {
    if (!user || !selectedVehicle || !destination || !startingKm) { alert('Missing inputs'); return; }
    setLoading(true);
    try {
      const { data: trip, error } = await supabase.from('trips').insert({ driver_id: user.id, driver_name: user.name, vehicle_id: selectedVehicle.id, vehicle_number: selectedVehicle.vehicle_number, start_location_name: 'Station Base', destination_name: destination, starting_km: parseFloat(startingKm), starting_km_image: startingKmImage, start_gps_lat: gps?.lat, start_gps_lng: gps?.lng, status: 'active' }).select().single();
      if (error) throw error;
      setActiveTrip(trip); setCurrentScreen('home'); fetchAllTrips(); setDestination(''); setStartingKm(''); setStartingKmImage('');
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const addFuel = async () => {
    if (!activeTrip || !fuelQuantity || !fuelAmount || !currentKm) { alert('Missing inputs'); return; }
    setLoading(true);
    try {
      await supabase.from('fuel_logs').insert({ trip_id: activeTrip.id, fuel_quantity: parseFloat(fuelQuantity), fuel_amount: parseFloat(fuelAmount), current_km: parseFloat(currentKm), fuel_station_name: fuelStation, fuel_bill_image: fuelBillImage, gps_lat: gps?.lat, gps_lng: gps?.lng });
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
    if (!activeTrip || !arrivalKm) return; setLoading(true);
    try {
      const arrKm = parseFloat(arrivalKm);
      const { data: updated, error } = await supabase.from('trips').update({ arrival_km: arrKm, outbound_distance: arrKm - activeTrip.starting_km, arrival_km_image: arrivalKmImage, arrival_time: new Date().toISOString(), arrival_gps_lat: gps?.lat, arrival_gps_lng: gps?.lng, status: 'destination_reached', destination_name: destination || activeTrip.destination_name }).eq('id', activeTrip.id).select().single();
      if (error) throw error;
      setActiveTrip(updated); setCurrentScreen('home'); fetchAllTrips();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const endTrip = async () => {
    if (!activeTrip || !finalKm) return; setLoading(true);
    try {
      const finKm = parseFloat(finalKm); const arrKm = activeTrip.arrival_km || activeTrip.starting_km;
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

  const logout = async () => { await supabase.auth.signOut(); setUser(null); setActiveTrip(null); setView('login'); };
  const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  const openImageWindow = (base64Data: string) => { const w = window.open(); if (w) { w.document.write(`<img src="${base64Data}" style="max-width:100%; max-height:100vh; display:block; margin:auto; border-radius:8px;" />`); } };

  const exportToCSV = async () => {
    const completedTripsList = trips.filter(t => t.status === 'completed');
    if(completedTripsList.length === 0) return alert("No completed trips to export.");
    
    const headers = ["Driver Name", "Vehicle", "Start Location", "Destination", "Start Date/Time", "Arrival Time", "Return Date/Time", "Total Duration", "Total Breaks (Mins)", "Starting KM", "Arrival KM", "Final KM", "Outbound Distance (KM)", "Inbound Distance (KM)", "Total Distance (KM)", "Total Fuel Used (Liters)", "Total Fuel Cost (Rs)", "Total Expenses (Rs)", "Overall Mileage", "Closing Notes"];
    const rows = completedTripsList.map(t => [ t.driver_name, t.vehicle_number, t.start_location_name || 'Station', t.destination_name, new Date(t.start_time).toLocaleString(), t.arrival_time ? new Date(t.arrival_time).toLocaleString() : 'N/A', t.end_time ? new Date(t.end_time).toLocaleString() : 'N/A', t.duration_minutes ? formatDuration(t.duration_minutes) : '0h 0m', t.total_break_minutes || 0, t.starting_km, t.arrival_km || 'N/A', t.final_km || 'N/A', t.outbound_distance || 0, t.inbound_distance || 0, t.total_distance || 0, t.total_fuel_used || 0, t.total_fuel_cost || 0, t.total_expenses || 0, t.mileage ? t.mileage.toFixed(2) : 0, `"${(t.notes || '').replace(/"/g, '""')}"` ]);
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

  if (isInitializing) {
    return (<div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div><p className="text-sm text-zinc-400">Syncing live session security parameters...</p></div>);
  }

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
            <div className="text-center mb-10">
              {/* BRANDING: CUSTOM LOGO INSTEAD OF TRUCK ICON */}
              <img src="/https://sensationalagriinputs.com/wp-content/uploads/2026/05/Sensational-drivers.png" alt="Sensational Driver Logo" className="w-24 h-24 mx-auto mb-6 object-contain drop-shadow-2xl" />
              <h1 className="text-3xl font-bold tracking-tight">Sensational Driver</h1>
              <p className="text-zinc-500 mt-2">Fleet mileage & expenses management</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div><div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" /><input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="10-digit mobile" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3.5 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all" required /></div></div>
              <div><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all" required /></div>
              <button type="submit" disabled={loading} className="w-full bg-white text-black font-semibold rounded-2xl py-3.5 hover:bg-zinc-200 transition-colors disabled:opacity-50 mt-2">{loading ? 'Verifying profile...' : 'Continue'}</button>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  if (view === 'admin') {
    const activeTripsList = trips.filter(t => t.status === 'active' || t.status === 'destination_reached');
    const completedTripsList = trips.filter(t => t.status === 'completed');
    
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white">
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0B0F19]/80 border-b border-zinc-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* BRANDING: CUSTOM LOGO FOR ADMIN HEADER */}
              <img src="/https://sensationalagriinputs.com/wp-content/uploads/2026/05/Sensational-drivers.png" alt="Sensational Logo" className="w-9 h-9 object-contain" />
              <div><h1 className="font-semibold">Sensational Admin</h1><p className="text-xs text-zinc-500 -mt-0.5">Control Tower</p></div>
            </div>
            <div className="flex items-center gap-3"><button onClick={refreshAdminData} className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 flex items-center gap-1 text-xs"><RotateCw className="w-4 h-4" /> Refresh</button><button onClick={logout} className="p-2 hover:bg-zinc-900 rounded-xl"><LogOut className="w-5 h-5 text-zinc-500" /></button></div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-6 border-b border-zinc-800">
            <button onClick={() => setAdminTab('dashboard')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${adminTab === 'dashboard' ? 'border-violet-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}><BarChart3 className="w-4 h-4 inline mr-2 -mt-0.5" /> Dashboard Report</button>
            <button onClick={() => setAdminTab('drivers')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${adminTab === 'drivers' ? 'border-violet-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}><Users className="w-4 h-4 inline mr-2 -mt-0.5" /> Manage Drivers</button>
          </div>

          {adminTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Total Completed Trips', value: completedTripsList.length, icon: Truck, color: 'from-emerald-500 to-teal-500' },
                  { label: 'Active Fleet Moving', value: activeTripsList.length, icon: Play, color: 'from-cyan-500 to-blue-500' },
                  { label: 'Total Driver Expenses', value: `₹${Math.round(completedTripsList.reduce((s, t) => s + (t.total_expenses || 0), 0)).toLocaleString()}`, icon: Wallet, color: 'from-pink-500 to-rose-500' },
                  { label: 'Avg Fleet Mileage', value: `${(completedTripsList.reduce((s, t) => s + (t.mileage || 0), 0) / (completedTripsList.length || 1)).toFixed(1)} km/L`, icon: Gauge, color: 'from-violet-500 to-purple-500' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}><stat.icon className="w-5 h-5 text-white" /></div>
                    <div className="text-2xl font-semibold">{stat.value}</div>
                    <div className="text-xs text-zinc-500 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" /><h2 className="font-semibold text-cyan-400">Live Ongoing Trips (On Road)</h2></div>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-400 font-medium">{activeTripsList.length} Drivers Active</span>
                </div>
                {activeTripsList.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-sm">No vehicles are currently tracking out on the road.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-zinc-950/50 border-b border-zinc-800"><tr className="text-left text-xs text-zinc-500"><th className="px-5 py-3 font-medium">Driver</th><th className="px-5 py-3 font-medium">Vehicle</th><th className="px-5 py-3 font-medium">Destination Reference</th><th className="px-5 py-3 font-medium">Odometer Metrics</th><th className="px-5 py-3 font-medium">Initial Proof</th><th className="px-5 py-3 font-medium">Status Stage</th></tr></thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {activeTripsList.map((trip) => {
                          const isOnBreak = trip.rest_logs?.some(r => !r.end_time);
                          return (
                            <tr key={trip.id} className="hover:bg-zinc-800/20 transition-colors">
                              <td className="px-5 py-3.5"><div className="font-medium text-sm text-white">{trip.driver_name}</div><div className="text-xs text-zinc-500">Started: {new Date(trip.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div></td>
                              <td className="px-5 py-3.5 text-sm font-mono text-cyan-400">{trip.vehicle_number}</td>
                              <td className="px-5 py-3.5 text-sm text-zinc-300 font-medium">{trip.destination_name}</td>
                              <td className="px-5 py-3.5 text-sm text-zinc-400">{trip.starting_km} KM</td>
                              <td className="px-5 py-3.5">{trip.starting_km_image ? <img src={trip.starting_km_image} alt="Proof" className="w-12 h-8 object-cover rounded cursor-pointer hover:scale-105" onClick={() => openImageWindow(trip.starting_km_image!)}/> : <span className="text-xs text-zinc-600">No Image</span>}</td>
                              <td className="px-5 py-3.5">{isOnBreak ? <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse">On Break</span> : <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${trip.status === 'destination_reached' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>{trip.status === 'destination_reached' ? 'At Terminal Destination' : 'Moving to Terminal'}</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3"><h2 className="font-semibold">Historical Manifest Audits</h2><span className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400">{completedTripsList.length} closed manifests</span></div>
                  <button onClick={exportToCSV} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"><Download className="w-3.5 h-3.5" /> Export Audit CSV</button>
                </div>
                {completedTripsList.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-sm">No completed ride manifests found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-zinc-950/50 border-b border-zinc-800"><tr className="text-left text-xs text-zinc-500 whitespace-nowrap"><th className="px-5 py-3 font-medium">Driver & Date</th><th className="px-5 py-3 font-medium">Vehicle / Terminal</th><th className="px-5 py-3 font-medium">Distance Routing</th><th className="px-5 py-3 font-medium">Expenses / Fuel</th><th className="px-5 py-3 font-medium">Break Audits</th><th className="px-5 py-3 font-medium">Odometer Snap Proofs</th></tr></thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {completedTripsList.map((trip) => (
                          <tr key={trip.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-5 py-3.5"><div className="font-medium text-sm">{trip.driver_name}</div><div className="text-[11px] text-zinc-500 mt-0.5">{new Date(trip.start_time).toLocaleDateString()}</div></td>
                            <td className="px-5 py-3.5"><div className="text-sm font-mono text-cyan-400">{trip.vehicle_number}</div><div className="text-xs text-zinc-300 font-medium truncate max-w-[140px] mt-0.5">{trip.destination_name}</div></td>
                            <td className="px-5 py-3.5"><div className="text-sm font-medium text-white">{trip.total_distance?.toFixed(0)} KM Total</div><div className="text-[10px] text-zinc-500 flex gap-2 mt-0.5"><span><span className="text-zinc-600">OUT:</span> {trip.outbound_distance || 0}</span><span><span className="text-zinc-600">IN:</span> {trip.inbound_distance || 0}</span></div></td>
                            <td className="px-5 py-3.5"><div className="text-sm font-medium text-pink-400">Exp: ₹{trip.total_expenses?.toFixed(0) || 0}</div><div className="text-[10px] text-zinc-500 mt-0.5">Fuel: ₹{trip.total_fuel_cost?.toFixed(0) || 0}</div></td>
                            <td className="px-5 py-3.5"><div className="text-sm font-medium text-orange-400">{trip.total_break_minutes ? formatDuration(trip.total_break_minutes) : '0h 0m'}</div></td>
                            <td className="px-5 py-3.5">
                              <div className="flex gap-2 items-center">
                                {trip.starting_km_image && (<div className="text-center"><img src={trip.starting_km_image} alt="Start" className="w-10 h-7 object-cover rounded cursor-pointer hover:scale-105" onClick={() => openImageWindow(trip.starting_km_image!)}/><div className="text-[9px] text-zinc-600 mt-0.5">Start</div></div>)}
                                {trip.final_km_image && (<div className="text-center"><img src={trip.final_km_image} alt="End" className="w-10 h-7 object-cover rounded cursor-pointer hover:scale-105" onClick={() => openImageWindow(trip.final_km_image!)}/><div className="text-[9px] text-zinc-600 mt-0.5">End</div></div>)}
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
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 sticky top-24">
                  <h3 className="font-semibold mb-1 flex items-center gap-2"><Plus className="w-4 h-4 text-violet-400" /> Register New Fleet Crew</h3>
                  <div className="space-y-4 mt-5">
                    <div><label className="text-xs text-zinc-400 mb-1.5 block">Driver Name *</label><input type="text" value={newDriverName} onChange={(e) => setNewDriverName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm" /></div>
                    <div><label className="text-xs text-zinc-400 mb-1.5 block">Driver Phone *</label><input type="tel" value={newDriverMobile} onChange={(e) => setNewDriverMobile(e.target.value)} maxLength={10} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm" /></div>
                    <div><label className="text-xs text-zinc-400 mb-1.5 block">Login Password *</label><input type="text" value={newDriverPassword} onChange={(e) => setNewDriverPassword(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm" /></div>
                    <button onClick={createDriver} disabled={loading || !newDriverMobile || !newDriverName || !newDriverPassword} className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium rounded-xl py-2.5 text-sm transition-colors mt-2">{loading ? 'Creating...' : 'Create Driver'}</button>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-zinc-800"><h3 className="font-semibold">Manage Active Operators</h3></div>
                  <div className="divide-y divide-zinc-800/50">
                    {drivers.filter(d => d.mobile !== '9492911408' && d.mobile !== '9999999999').map((driver) => (
                      <div key={driver.id} className="p-5 flex justify-between items-center">
                        <div className="flex gap-3 items-center">
                          <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0"><User className="w-5 h-5 text-zinc-500" /></div>
                          <div><div className="font-medium text-base">{driver.name}</div><div className="text-sm text-zinc-500 font-mono mt-0.5">Login: {driver.mobile}</div></div>
                        </div>
                        <button onClick={() => removeDriver(driver.id, driver.name)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
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

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col max-w-lg mx-auto relative border-x border-zinc-900 shadow-2xl">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
      
      <header className="sticky top-0 z-30 backdrop-blur-2xl bg-[#0B0F19]/70 border-b border-zinc-900">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* BRANDING: DRIVER HEADER LOGO */}
            <img src="/https://sensationalagriinputs.com/wp-content/uploads/2026/05/Sensational-drivers.png" alt="Sensational Logo" className="w-8 h-8 object-contain" />
            <div><div className="text-[11px] text-zinc-500 leading-none">Driver Profile</div><div className="font-medium text-sm -mt-0.5">{user?.name}</div></div>
          </div>
          <div className="flex items-center gap-2">
            {gps && <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-[10px] text-emerald-400 font-medium">GPS LOCK</span></div>}
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
                          <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Active Run</span></div>
                          <h2 className="text-xl font-semibold">{activeTrip.destination_name}</h2><p className="text-sm font-mono text-cyan-400 mt-0.5">{activeTrip.vehicle_number}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-zinc-900/50 rounded-2xl p-3 border border-zinc-800/50"><Gauge className="w-4 h-4 text-zinc-600 mb-1.5" /><div className="text-[11px] text-zinc-500">Initial KM</div><div className="font-semibold">{activeTrip.starting_km}</div></div>
                        <div className="bg-zinc-900/50 rounded-2xl p-3 border border-zinc-800/50"><Wallet className="w-4 h-4 text-zinc-600 mb-1.5" /><div className="text-[11px] text-zinc-500">Expenses</div><div className="font-semibold">{expenseLogs.length}</div></div>
                        <div className="bg-zinc-900/50 rounded-2xl p-3 border border-zinc-800/50"><Clock className="w-4 h-4 text-zinc-600 mb-1.5" /><div className="text-[11px] text-zinc-500">Duration</div><div className="font-semibold text-sm">{formatDuration(Math.round((Date.now() - new Date(activeTrip.start_time).getTime()) / 60000))}</div></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button onClick={() => setCurrentScreen('expense')} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center"><Wallet className="w-6 h-6 text-pink-400" /></div><div className="text-left"><div className="font-medium">Log Travel Expense</div><div className="text-xs text-zinc-500 mt-0.5">Tolls, repairs, fines with receipt photo</div></div></button>
                    {!activeRest && (<button onClick={() => setCurrentScreen('rest')} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center"><Pause className="w-6 h-6 text-orange-400" /></div><div className="text-left"><div className="font-medium">Take Rest Break</div></div></button>)}
                    <button onClick={() => setCurrentScreen('fuel')} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center"><Fuel className="w-6 h-6 text-amber-400" /></div><div className="text-left"><div className="font-medium">Add Fuel Entry</div></div></button>
                    {!activeTrip.arrival_time ? (<button onClick={() => setCurrentScreen('destination')} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center"><Flag className="w-6 h-6 text-cyan-400" /></div><div className="text-left"><div className="font-medium">Destination Reached</div></div></button>) : (<button onClick={() => setCurrentScreen('end')} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl p-[1px]"><div className="rounded-2xl bg-zinc-950 p-4 flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center"><Home className="w-6 h-6 text-violet-400" /></div><div className="text-left"><div className="font-medium">Return to Station Base & End Trip</div></div></div></button>)}
                  </div>

                  <div className="mt-6 space-y-4">
                     {expenseLogs.length > 0 && (
                      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4">
                        <h3 className="text-xs font-semibold text-pink-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Expenses Logged</h3>
                        <div className="space-y-2">{expenseLogs.map((log) => (<div key={log.id} className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-900 text-xs"><div><div className="font-medium text-zinc-200">{log.description}</div></div><div className="text-right font-semibold text-pink-400">₹{log.amount}</div></div>))}</div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4"><Play className="w-10 h-10 text-zinc-700" /></div>
                  <h2 className="text-xl font-semibold mb-2">No Active Manifest</h2>
                  <button onClick={() => setCurrentScreen('start')} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-black font-medium mt-4"><Play className="w-4 h-4" /> Start New Trip</button>
                </div>
              )}
            </motion.div>
          )}

          {/* NEW EXPENSE SCREEN */}
          {currentScreen === 'expense' && (
            <motion.div key="expense" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="flex items-center gap-3 mb-2"><button onClick={() => setCurrentScreen('home')} className="p-2 hover:bg-zinc-900 rounded-xl"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-xl font-semibold">Log Travel Expense</h2></div>
              <div><label className="text-xs text-zinc-500 mb-1 block">Expense Amount (₹) *</label><input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="0" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5" /></div>
              <div><label className="text-xs text-zinc-500 mb-1 block">Description (What was this for?) *</label><input type="text" value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} placeholder="e.g. Toll gate, puncture repair..." className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5" /></div>
              <div><label className="text-xs text-zinc-500 mb-1 block">Receipt Photo (Optional)</label><button type="button" onClick={() => handleImageCapture('expense')} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">{expenseImage ? <span className="text-pink-400 text-sm">✓ Receipt photo mapped</span> : <span className="text-zinc-400 text-sm">Take photo of bill/receipt</span>}</button></div>
              <button onClick={addExpense} disabled={loading || !expenseAmount || !expenseDesc} className="w-full bg-pink-600 py-3.5 rounded-2xl font-medium mt-2">{loading ? 'Saving...' : 'Save Expense'}</button>
            </motion.div>
          )}

          {currentScreen === 'start' && (
            <motion.div key="start" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="flex items-center gap-3 mb-2"><button onClick={() => setCurrentScreen('home')} className="p-2 hover:bg-zinc-900 rounded-xl"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-xl font-semibold">Start New Trip</h2></div>
              <div><label className="text-xs text-zinc-500 mb-1 block">Select Vehicle</label><select value={selectedVehicle?.id || ''} onChange={(e) => setSelectedVehicle(FLEET_VEHICLES.find(v => v.id === Number(e.target.value)) || null)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white"><option value="">Choose a truck...</option>{FLEET_VEHICLES.map(v => <option key={v.id} value={v.id}>{v.vehicle_number} • {v.model}</option>)}</select></div>
              <div><label className="text-xs text-zinc-500 mb-1 block">Destination</label><input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Where are you going?" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5" /></div>
              
              {/* BRANDING: ODOMETER PLACEHOLDER SET TO 55 */}
              <div><label className="text-xs text-zinc-500 mb-1 block">Starting KM Reading</label><input type="number" value={startingKm} onChange={(e) => setStartingKm(e.target.value)} placeholder="55" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5" /></div>
              
              <div><label className="text-xs text-zinc-500 mb-1 block">Odometer Photo Proof *</label><button type="button" onClick={() => handleImageCapture('start')} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">{startingKmImage ? <span className="text-emerald-400 text-sm">✓ Photo attached successfully</span> : <span className="text-zinc-400 text-sm">Tap to take photo of odometer</span>}</button></div>
              <button onClick={startTrip} disabled={loading || !selectedVehicle || !destination || !startingKm || !startingKmImage} className="w-full bg-emerald-600 py-3.5 rounded-2xl font-medium mt-2">Start Trip</button>
            </motion.div>
          )}
          {currentScreen === 'rest' && (<motion.div key="rest" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4"><div className="flex items-center gap-3 mb-2"><button onClick={() => setCurrentScreen('home')} className="p-2 hover:bg-zinc-900 rounded-xl"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-xl font-semibold">Start Rest Break</h2></div><div><label className="text-xs text-zinc-500 mb-1 block">Location</label><input type="text" value={restLocation} onChange={(e) => setRestLocation(e.target.value)} placeholder="e.g. Highway Toll Plaza" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5" /></div><button onClick={startRest} disabled={loading} className="w-full bg-orange-600 py-3.5 rounded-2xl font-medium mt-2">Start Break</button></motion.div>)}
          {currentScreen === 'fuel' && (<motion.div key="fuel" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4"><div className="flex items-center gap-3 mb-2"><button onClick={() => setCurrentScreen('home')} className="p-2 hover:bg-zinc-900 rounded-xl"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-xl font-semibold">Log Fuel</h2></div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-zinc-500 mb-1 block">Liters</label><input type="number" step="0.1" value={fuelQuantity} onChange={(e) => setFuelQuantity(e.target.value)} placeholder="0.0" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5" /></div><div><label className="text-xs text-zinc-500 mb-1 block">Cost (₹)</label><input type="number" value={fuelAmount} onChange={(e) => setFuelAmount(e.target.value)} placeholder="₹ Amount" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5" /></div></div><div><label className="text-xs text-zinc-500 mb-1 block">Current KM</label><input type="number" value={currentKm} onChange={(e) => setCurrentKm(e.target.value)} placeholder="Odometer" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5" /></div><div><button type="button" onClick={() => handleImageCapture('fuel')} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">{fuelBillImage ? <span className="text-amber-400 text-sm">✓ Receipt mapped</span> : <span className="text-zinc-400 text-sm">Take photo of bill</span>}</button></div><button onClick={addFuel} disabled={loading || !fuelQuantity || !fuelAmount || !currentKm} className="w-full bg-amber-600 py-3.5 rounded-2xl font-medium">Save Fuel</button></motion.div>)}
          {currentScreen === 'destination' && (<motion.div key="destination" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4"><div className="flex items-center gap-3 mb-2"><button onClick={() => setCurrentScreen('home')} className="p-2 hover:bg-zinc-900 rounded-xl"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-xl font-semibold">Destination Reached</h2></div><div><label className="text-xs text-zinc-500 mb-1 block">Arrival KM Reading</label><input type="number" value={arrivalKm} onChange={(e) => setArrivalKm(e.target.value)} placeholder="Odometer" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5" /></div><div><button type="button" onClick={() => handleImageCapture('arrival')} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">{arrivalKmImage ? <span className="text-cyan-400 text-sm">✓ Proof logged</span> : <span className="text-zinc-400 text-sm">Snap odometer gauge</span>}</button></div><button onClick={reachDestination} disabled={loading || !arrivalKm} className="w-full bg-cyan-600 py-3.5 rounded-2xl font-medium">Submit</button></motion.div>)}
          {currentScreen === 'end' && (<motion.div key="end" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4"><div className="flex items-center gap-3 mb-2"><button onClick={() => setCurrentScreen('home')} className="p-2 hover:bg-zinc-900 rounded-xl"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-xl font-semibold">End Trip</h2></div><div><label className="text-xs text-zinc-500 mb-1 block">Ending KM Reading</label><input type="number" value={finalKm} onChange={(e) => setFinalKm(e.target.value)} placeholder="Final odometer" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5" /></div><div><button type="button" onClick={() => handleImageCapture('final')} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">{finalKmImage ? <span className="text-violet-400 text-sm">✓ Final proof linked</span> : <span className="text-zinc-400 text-sm">Snap final gauge</span>}</button></div><button onClick={endTrip} disabled={loading || !finalKm || !finalKmImage} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3.5 rounded-2xl font-medium">End Trip</button></motion.div>)}
        </AnimatePresence>
      </main>
    </div>
  );
}
