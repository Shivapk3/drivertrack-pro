import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, MapPin, Fuel, Clock, Camera, Navigation, Gauge, IndianRupee, FileText, CheckCircle2, LogOut, User, BarChart3, Image as ImageIcon, ArrowLeft, Play, Pause, Flag, Home, Plus, Users, Key, Trash2, Edit } from 'lucide-react';
import supabase from './lib/supabase';

type Driver = {
  id: string;
  mobile: string;
  name: string;
  vehicle_assigned?: string;
};

type Vehicle = {
  id: number;
  vehicle_number: string;
  model: string;
  type: string;
};

type Trip = {
  id: number;
  driver_id: string;
  driver_name: string;
  vehicle_id: number;
  vehicle_number: string;
  destination_name: string;
  starting_km: number;
  starting_km_image?: string;
  start_time: string;
  start_gps_lat?: number;
  start_gps_lng?: number;
  arrival_km?: number;
  arrival_km_image?: string;
  arrival_time?: string;
  arrival_gps_lat?: number;
  arrival_gps_lng?: number;
  final_km?: number;
  final_km_image?: string;
  end_time?: string;
  end_gps_lat?: number;
  end_gps_lng?: number;
  notes?: string;
  status: 'active' | 'destination_reached' | 'completed';
  total_distance?: number;
  total_fuel_used?: number;
  total_fuel_cost?: number;
  mileage?: number;
  duration_minutes?: number;
  created_at: string;
};

type FuelLog = {
  id: number;
  trip_id: number;
  fuel_quantity: number;
  fuel_amount: number;
  current_km: number;
  fuel_station_name: string;
  fuel_bill_image?: string;
  log_time: string;
  gps_lat?: number;
  gps_lng?: number;
};

type RestLog = {
  id: number;
  trip_id: number;
  start_time: string;
  end_time?: string;
  start_gps_lat?: number;
  start_gps_lng?: number;
  end_gps_lat?: number;
  end_gps_lng?: number;
  duration_minutes?: number;
  location_name?: string;
  notes?: string;
};

export default function App() {
  const [user, setUser] = useState<Driver | null>(null);
  const [view, setView] = useState<'login' | 'driver' | 'admin'>('login');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'start' | 'fuel' | 'destination' | 'end' | 'rest'>('home');
  const [gps, setGps] = useState<{lat: number, lng: number} | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState<'dashboard' | 'drivers'>('dashboard');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [newDriverMobile, setNewDriverMobile] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPassword, setNewDriverPassword] = useState('');
  const [newDriverVehicle, setNewDriverVehicle] = useState('');
  const [restLogs, setRestLogs] = useState<RestLog[]>([]);
  const [activeRest, setActiveRest] = useState<RestLog | null>(null);
  const [restLocation, setRestLocation] = useState('');
  const [restNotes, setRestNotes] = useState('');

  // Form states
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [destination, setDestination] = useState('');
  const [startingKm, setStartingKm] = useState('');
  const [startingKmImage, setStartingKmImage] = useState('');
  const [fuelQuantity, setFuelQuantity] = useState('');
  const [fuelAmount, setFuelAmount] = useState('');
  const [currentKm, setCurrentKm] = useState('');
  const [fuelStation, setFuelStation] = useState('');
  const [fuelBillImage, setFuelBillImage] = useState('');
  const [arrivalKm, setArrivalKm] = useState('');
  const [arrivalKmImage, setArrivalKmImage] = useState('');
  const [finalKm, setFinalKm] = useState('');
  const [finalKmImage, setFinalKmImage] = useState('');
  const [notes, setNotes] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<'start' | 'fuel' | 'arrival' | 'final' | null>(null);

  useEffect(() => {
    // Get GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('GPS denied')
      );
    }

    // Check auth
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user) {
        fetchDriver(session.user.id);
      }
    });

    supabase.auth.onAuthStateChange((_: any, session: any) => {
      if (session?.user) {
        fetchDriver(session.user.id);
      } else {
        setUser(null);
        setView('login');
      }
    });

    fetchVehicles();
    fetchAllTrips();
    fetchDrivers();
  }, []);

  const fetchDriver = async (id: string) => {
    const res = await fetch('/api/drivers');
    const drivers = await res.json();
    const driver = drivers.find((d: Driver) => d.id === id);
    if (driver) {
      setUser(driver);
      setView(driver.mobile === '9999999999' ? 'admin' : 'driver');
      fetchActiveTrip(id);
    }
  };

  const fetchVehicles = async () => {
    const res = await fetch('/api/vehicles');
    setVehicles(await res.json());
  };

  const fetchDrivers = async () => {
    const res = await fetch('/api/drivers');
    setDrivers(await res.json());
  };

  const fetchActiveTrip = async (driverId: string) => {
    const res = await fetch(`/api/trips?driver_id=${driverId}&status=active`);
    const data = await res.json();
    if (data.length > 0) {
      setActiveTrip(data[0]);
      setCurrentScreen('home');
      fetchFuelLogs(data[0].id);
      fetchRestLogs(data[0].id);
    }
  };

  const fetchAllTrips = async () => {
    const res = await fetch('/api/trips');
    setTrips(await res.json());
  };

  const fetchFuelLogs = async (tripId: number) => {
    const res = await fetch(`/api/fuel-logs?trip_id=${tripId}`);
    setFuelLogs(await res.json());
  };

  const fetchRestLogs = async (tripId: number) => {
    const res = await fetch(`/api/rest-logs?trip_id=${tripId}`);
    const logs = await res.json();
    setRestLogs(logs);
    const active = logs.find((r: RestLog) => !r.end_time);
    setActiveRest(active || null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Admin-created accounts only - no auto signup
      const { error } = await supabase.auth.signInWithPassword({
        email: `${mobile}@driver.local`,
        password: password
      });

      if (error) {
        throw new Error('Invalid mobile or password. Contact admin for credentials.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createDriver = async () => {
    if (!newDriverMobile || !newDriverName || !newDriverPassword) {
      alert('Fill all fields');
      return;
    }

    setLoading(true);
    try {
      // Create auth user
      const { data, error } = await supabase.auth.signUp({
        email: `${newDriverMobile}@driver.local`,
        password: newDriverPassword
      });

      if (error) throw error;

      if (data.user) {
        // Create driver record
        await fetch('/api/drivers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: data.user.id,
            mobile: newDriverMobile,
            name: newDriverName,
            vehicle_assigned: newDriverVehicle || null
          })
        });

        alert(`Driver created!\nMobile: ${newDriverMobile}\nPassword: ${newDriverPassword}`);
        
        setNewDriverMobile('');
        setNewDriverName('');
        setNewDriverPassword('');
        setNewDriverVehicle('');
        fetchDrivers();
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startRest = async () => {
    if (!activeTrip) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/rest-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: activeTrip.id,
          location_name: restLocation,
          notes: restNotes,
          gps_lat: gps?.lat,
          gps_lng: gps?.lng
        })
      });
      
      const rest = await res.json();
      setActiveRest(rest);
      fetchRestLogs(activeTrip.id);
      setCurrentScreen('home');
      setRestLocation('');
      setRestNotes('');
    } catch (err) {
      alert('Failed to start rest');
    } finally {
      setLoading(false);
    }
  };

  const endRest = async () => {
    if (!activeRest) return;
    
    setLoading(true);
    try {
      await fetch('/api/rest-logs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeRest.id,
          gps_lat: gps?.lat,
          gps_lng: gps?.lng
        })
      });
      
      setActiveRest(null);
      if (activeTrip) fetchRestLogs(activeTrip.id);
    } catch (err) {
      alert('Failed to end rest');
    } finally {
      setLoading(false);
    }
  };

  const handleImageCapture = (target: 'start' | 'fuel' | 'arrival' | 'final') => {
    setUploadTarget(target);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (uploadTarget === 'start') setStartingKmImage(dataUrl);
      if (uploadTarget === 'fuel') setFuelBillImage(dataUrl);
      if (uploadTarget === 'arrival') setArrivalKmImage(dataUrl);
      if (uploadTarget === 'final') setFinalKmImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const startTrip = async () => {
    if (!user || !selectedVehicle || !destination || !startingKm) {
      alert('Fill all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: user.id,
          driver_name: user.name,
          vehicle_id: selectedVehicle.id,
          vehicle_number: selectedVehicle.vehicle_number,
          destination_name: destination,
          starting_km: parseFloat(startingKm),
          starting_km_image: startingKmImage,
          start_gps_lat: gps?.lat,
          start_gps_lng: gps?.lng
        })
      });

      const trip = await res.json();
      setActiveTrip(trip);
      setCurrentScreen('home');
      fetchAllTrips();
      
      // Reset form
      setDestination('');
      setStartingKm('');
      setStartingKmImage('');
    } catch (err) {
      alert('Failed to start trip');
    } finally {
      setLoading(false);
    }
  };

  const addFuel = async () => {
    if (!activeTrip || !fuelQuantity || !fuelAmount || !currentKm) {
      alert('Fill all fields');
      return;
    }

    setLoading(true);
    try {
      await fetch('/api/fuel-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: activeTrip.id,
          fuel_quantity: parseFloat(fuelQuantity),
          fuel_amount: parseFloat(fuelAmount),
          current_km: parseFloat(currentKm),
          fuel_station_name: fuelStation,
          fuel_bill_image: fuelBillImage,
          gps_lat: gps?.lat,
          gps_lng: gps?.lng
        })
      });

      fetchFuelLogs(activeTrip.id);
      setCurrentScreen('home');
      
      // Reset
      setFuelQuantity('');
      setFuelAmount('');
      setCurrentKm('');
      setFuelStation('');
      setFuelBillImage('');
    } catch (err) {
      alert('Failed to log fuel');
    } finally {
      setLoading(false);
    }
  };

  const reachDestination = async () => {
    if (!activeTrip || !arrivalKm) return;

    setLoading(true);
    try {
      const res = await fetch('/api/trips', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeTrip.id,
          arrival_km: parseFloat(arrivalKm),
          arrival_km_image: arrivalKmImage,
          arrival_gps_lat: gps?.lat,
          arrival_gps_lng: gps?.lng,
          status: 'destination_reached',
          destination_name: destination || activeTrip.destination_name
        })
      });

      const updated = await res.json();
      setActiveTrip(updated);
      setCurrentScreen('home');
      fetchAllTrips();
    } catch (err) {
      alert('Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const endTrip = async () => {
    if (!activeTrip || !finalKm) return;

    setLoading(true);
    try {
      const res = await fetch('/api/trips', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeTrip.id,
          final_km: parseFloat(finalKm),
          final_km_image: finalKmImage,
          end_gps_lat: gps?.lat,
          end_gps_lng: gps?.lng,
          notes,
          status: 'completed'
        })
      });

      await res.json();
      setActiveTrip(null);
      setCurrentScreen('home');
      fetchAllTrips();
      
      // Reset
      setFinalKm('');
      setFinalKmImage('');
      setNotes('');
      setArrivalKm('');
      setFuelLogs([]);
    } catch (err) {
      alert('Failed to end trip');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveTrip(null);
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm"
          >
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-cyan-500 mb-6 shadow-2xl shadow-emerald-500/20">
                <Truck className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">DriverTrack Pro</h1>
              <p className="text-zinc-500 mt-2">Fleet mileage & fuel management</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block">Mobile Number</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
                <p className="text-xs text-zinc-600 mt-1.5">Admin: 9999999999 / admin123</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-semibold rounded-2xl py-3.5 hover:bg-zinc-200 transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? 'Signing in...' : 'Continue'}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-zinc-900">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-emerald-400 font-semibold">GPS</div>
                  <div className="text-xs text-zinc-600 mt-1">Auto-tracked</div>
                </div>
                <div>
                  <div className="text-cyan-400 font-semibold">Fraud</div>
                  <div className="text-xs text-zinc-600 mt-1">Protected</div>
                </div>
                <div>
                  <div className="text-amber-400 font-semibold">Real-time</div>
                  <div className="text-xs text-zinc-600 mt-1">Mileage</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (view === 'admin' || showAdmin) {
    const completedTrips = trips.filter(t => t.status === 'completed');
    
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white">
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0B0F19]/80 border-b border-zinc-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-semibold">Admin Dashboard</h1>
                <p className="text-xs text-zinc-500 -mt-0.5">Fleet overview</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user?.mobile !== '9999999999' && (
                <button
                  onClick={() => setShowAdmin(false)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-sm flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Driver View
                </button>
              )}
              <button onClick={logout} className="p-2 hover:bg-zinc-900 rounded-xl">
                <LogOut className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-4 sm:p-6">
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 border-b border-zinc-800">
            <button
              onClick={() => setAdminTab('dashboard')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                adminTab === 'dashboard' 
                  ? 'border-violet-500 text-white' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2 -mt-0.5" />
              Dashboard
            </button>
            <button
              onClick={() => setAdminTab('drivers')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                adminTab === 'drivers' 
                  ? 'border-violet-500 text-white' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2 -mt-0.5" />
              Manage Drivers
            </button>
          </div>

          {adminTab === 'dashboard' && (
            <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Trips', value: completedTrips.length, icon: Truck, color: 'from-emerald-500 to-teal-500' },
              { label: 'Total KM', value: Math.round(completedTrips.reduce((s, t) => s + (t.total_distance || 0), 0)).toLocaleString(), icon: Navigation, color: 'from-cyan-500 to-blue-500' },
              { label: 'Fuel Used', value: `${Math.round(completedTrips.reduce((s, t) => s + (t.total_fuel_used || 0), 0))} L`, icon: Fuel, color: 'from-amber-500 to-orange-500' },
              { label: 'Avg Mileage', value: `${(completedTrips.reduce((s, t) => s + (t.mileage || 0), 0) / (completedTrips.length || 1)).toFixed(1)} km/L`, icon: Gauge, color: 'from-violet-500 to-purple-500' },
            ].map((stat) => (
              <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-2xl font-semibold">{stat.value}</div>
                <div className="text-xs text-zinc-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Trips Table */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="font-semibold">Completed Trips</h2>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400">{completedTrips.length} trips</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-950/50 border-b border-zinc-800">
                  <tr className="text-left text-xs text-zinc-500">
                    <th className="px-5 py-3 font-medium">Driver</th>
                    <th className="px-5 py-3 font-medium">Vehicle</th>
                    <th className="px-5 py-3 font-medium">Route</th>
                    <th className="px-5 py-3 font-medium">Distance</th>
                    <th className="px-5 py-3 font-medium">Fuel</th>
                    <th className="px-5 py-3 font-medium">Mileage</th>
                    <th className="px-5 py-3 font-medium">Duration</th>
                    <th className="px-5 py-3 font-medium">Images</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {completedTrips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-sm">{trip.driver_name}</div>
                        <div className="text-xs text-zinc-500">{new Date(trip.start_time).toLocaleDateString()}</div>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-mono">{trip.vehicle_number}</td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm max-w-[140px] truncate">{trip.destination_name}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm font-medium">{trip.total_distance?.toFixed(0)} km</div>
                        <div className="text-xs text-zinc-500">{trip.starting_km} → {trip.final_km}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm">{trip.total_fuel_used?.toFixed(1)} L</div>
                        <div className="text-xs text-zinc-500">₹{trip.total_fuel_cost?.toFixed(0)}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                          (trip.mileage || 0) > 12 ? 'bg-emerald-500/10 text-emerald-400' :
                          (trip.mileage || 0) > 8 ? 'bg-amber-500/10 text-amber-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {trip.mileage?.toFixed(1)} km/L
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-zinc-400">
                        {trip.duration_minutes ? formatDuration(trip.duration_minutes) : '-'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1.5">
                          {trip.starting_km_image && (
                            <a href={trip.starting_km_image} target="_blank" className="p-1.5 hover:bg-zinc-800 rounded-lg" title="Start KM">
                              <ImageIcon className="w-3.5 h-3.5 text-zinc-500" />
                            </a>
                          )}
                          {trip.final_km_image && (
                            <a href={trip.final_km_image} target="_blank" className="p-1.5 hover:bg-zinc-800 rounded-lg" title="End KM">
                              <ImageIcon className="w-3.5 h-3.5 text-zinc-500" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {completedTrips.length === 0 && (
                <div className="py-16 text-center text-zinc-600">
                  <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No completed trips yet</p>
                </div>
              )}
            </div>
          </div>
          </>
          )}

          {adminTab === 'drivers' && (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Create Driver Form */}
              <div className="lg:col-span-1">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 sticky top-24">
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-violet-400" />
                    Create New Driver
                  </h3>
                  <p className="text-xs text-zinc-500 mb-5">Admin creates login credentials</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Mobile Number *</label>
                      <input
                        type="tel"
                        value={newDriverMobile}
                        onChange={(e) => setNewDriverMobile(e.target.value)}
                        placeholder="10 digits"
                        maxLength={10}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Driver Name *</label>
                      <input
                        type="text"
                        value={newDriverName}
                        onChange={(e) => setNewDriverName(e.target.value)}
                        placeholder="Full name"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Password *</label>
                      <input
                        type="text"
                        value={newDriverPassword}
                        onChange={(e) => setNewDriverPassword(e.target.value)}
                        placeholder="Set password"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Assign Vehicle</label>
                      <select
                        value={newDriverVehicle}
                        onChange={(e) => setNewDriverVehicle(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-500/50"
                      >
                        <option value="">No assignment</option>
                        {vehicles.map(v => (
                          <option key={v.id} value={v.vehicle_number}>{v.vehicle_number} • {v.model}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={createDriver}
                      disabled={loading || !newDriverMobile || !newDriverName || !newDriverPassword}
                      className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium rounded-xl py-2.5 text-sm transition-colors"
                    >
                      {loading ? 'Creating...' : 'Create Driver Account'}
                    </button>

                    <div className="pt-4 border-t border-zinc-800">
                      <div className="flex items-start gap-2 text-[11px] text-zinc-500">
                        <Key className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <p>Driver will login with mobile number and the password you set. No OTP required.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drivers List */}
              <div className="lg:col-span-2">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-zinc-800">
                    <h3 className="font-semibold">All Drivers ({drivers.filter(d => d.mobile !== '9999999999').length})</h3>
                  </div>
                  
                  <div className="divide-y divide-zinc-800/50">
                    {drivers.filter(d => d.mobile !== '9999999999').map((driver) => {
                      const driverTrips = trips.filter(t => t.driver_id === driver.id);
                      const completed = driverTrips.filter(t => t.status === 'completed');
                      
                      return (
                        <div key={driver.id} className="p-5 hover:bg-zinc-800/20 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex gap-3.5">
                              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                                <User className="w-5 h-5 text-zinc-600" />
                              </div>
                              <div>
                                <div className="font-medium">{driver.name}</div>
                                <div className="text-sm text-zinc-500 mt-0.5 flex items-center gap-3">
                                  <span className="font-mono">{driver.mobile}</span>
                                  {driver.vehicle_assigned && (
                                    <span className="flex items-center gap-1">
                                      <Truck className="w-3 h-3" />
                                      {driver.vehicle_assigned}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 mt-2.5">
                                  <div>
                                    <div className="text-[11px] text-zinc-600">Total Trips</div>
                                    <div className="text-sm font-medium">{completed.length}</div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-zinc-600">Total KM</div>
                                    <div className="text-sm font-medium">{Math.round(completed.reduce((s, t) => s + (t.total_distance || 0), 0))}</div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-zinc-600">Avg Mileage</div>
                                    <div className="text-sm font-medium text-emerald-400">
                                      {completed.length > 0 ? (completed.reduce((s, t) => s + (t.mileage || 0), 0) / completed.length).toFixed(1) : '0'} km/L
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span className="text-[11px] text-emerald-400 font-medium">Active</span>
                              </div>
                              <div className="text-[11px] text-zinc-600 mt-1.5">
                                Login: {driver.mobile}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {drivers.filter(d => d.mobile !== '9999999999').length === 0 && (
                      <div className="py-16 text-center text-zinc-600">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No drivers yet</p>
                        <p className="text-xs mt-1">Create your first driver account</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions */}
                <div className="mt-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                  <h4 className="text-sm font-medium text-amber-400 mb-2">How it works</h4>
                  <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside">
                    <li>Create driver with mobile number and password (you set both)</li>
                    <li>Share credentials with driver - they login directly, no OTP</li>
                    <li>Driver can start trips, log fuel, and complete journeys</li>
                    <li>All data auto-captures GPS and timestamps for fraud prevention</li>
                    <li>View reports in Dashboard tab</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // DRIVER VIEW
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col max-w-lg mx-auto relative">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
      
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-2xl bg-[#0B0F19]/70 border-b border-zinc-900">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Truck className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-[11px] text-zinc-500 leading-none">Driver</div>
              <div className="font-medium text-sm -mt-0.5">{user?.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {gps && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-medium">GPS</span>
              </div>
            )}
            <button onClick={() => setShowAdmin(true)} className="p-2 hover:bg-zinc-900 rounded-xl">
              <BarChart3 className="w-4.5 h-4.5 text-zinc-500" />
            </button>
            <button onClick={logout} className="p-2 hover:bg-zinc-900 rounded-xl">
              <LogOut className="w-4.5 h-4.5 text-zinc-500" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 pb-24">
        <AnimatePresence mode="wait">
          {/* HOME SCREEN */}
          {currentScreen === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {activeTrip ? (
                <>
                  {/* Active Trip Card */}
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600/20 to-cyan-600/20 border border-emerald-500/20 p-[1px]">
                    <div className="rounded-3xl bg-zinc-950 p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Active Trip</span>
                          </div>
                          <h2 className="text-xl font-semibold">{activeTrip.destination_name}</h2>
                          <p className="text-sm text-zinc-500 mt-0.5">{activeTrip.vehicle_number}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] text-zinc-600">Started</div>
                          <div className="text-sm font-medium">{new Date(activeTrip.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-zinc-900/50 rounded-2xl p-3 border border-zinc-800/50">
                          <Gauge className="w-4 h-4 text-zinc-600 mb-1.5" />
                          <div className="text-[11px] text-zinc-500">Start KM</div>
                          <div className="font-semibold">{activeTrip.starting_km}</div>
                        </div>
                        <div className="bg-zinc-900/50 rounded-2xl p-3 border border-zinc-800/50">
                          <Fuel className="w-4 h-4 text-zinc-600 mb-1.5" />
                          <div className="text-[11px] text-zinc-500">Fuel Stops</div>
                          <div className="font-semibold">{fuelLogs.length}</div>
                        </div>
                        <div className="bg-zinc-900/50 rounded-2xl p-3 border border-zinc-800/50">
                          <Clock className="w-4 h-4 text-zinc-600 mb-1.5" />
                          <div className="text-[11px] text-zinc-500">Duration</div>
                          <div className="font-semibold text-sm">{formatDuration(Math.round((Date.now() - new Date(activeTrip.start_time).getTime()) / 60000))}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active Rest Banner */}
                  {activeRest && (
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30 p-[1px]">
                      <div className="rounded-2xl bg-zinc-950 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center animate-pulse">
                              <Pause className="w-5 h-5 text-orange-400" />
                            </div>
                            <div>
                              <div className="text-xs font-medium text-orange-400 uppercase tracking-wider">On Rest Break</div>
                              <div className="text-sm mt-0.5">Started {new Date(activeRest.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              {activeRest.location_name && (
                                <div className="text-xs text-zinc-500">{activeRest.location_name}</div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={endRest}
                            disabled={loading}
                            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors"
                          >
                            Resume
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {/* Rest Button */}
                    {!activeRest ? (
                      <button
                        onClick={() => setCurrentScreen('rest')}
                        className="w-full group relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 p-4 hover:bg-zinc-800/50 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Pause className="w-6 h-6 text-orange-400" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium">Take Rest Break</div>
                            <div className="text-xs text-zinc-500 mt-0.5">Log rest stop • Auto tracks duration</div>
                          </div>
                        </div>
                      </button>
                    ) : null}

                    <button
                      onClick={() => setCurrentScreen('fuel')}
                      className="w-full group relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 p-4 hover:bg-zinc-800/50 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Fuel className="w-6 h-6 text-amber-400" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium">Add Fuel Entry</div>
                          <div className="text-xs text-zinc-500 mt-0.5">Log refill with bill photo • GPS auto-captured</div>
                        </div>
                      </div>
                    </button>

                    {!activeTrip.arrival_time ? (
                      <button
                        onClick={() => setCurrentScreen('destination')}
                        className="w-full group relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 p-4 hover:bg-zinc-800/50 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Flag className="w-6 h-6 text-cyan-400" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium">Destination Reached</div>
                            <div className="text-xs text-zinc-500 mt-0.5">Log arrival KM and time</div>
                          </div>
                        </div>
                      </button>
                    ) : (
                      <button
                        onClick={() => setCurrentScreen('end')}
                        className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 p-[1px]"
                      >
                        <div className="rounded-2xl bg-zinc-950 p-4 group-hover:bg-zinc-900/50 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                              <Home className="w-6 h-6 text-violet-400" />
                            </div>
                            <div className="flex-1 text-left">
                              <div className="font-medium">Return to Station</div>
                              <div className="text-xs text-zinc-500 mt-0.5">End trip & calculate mileage</div>
                            </div>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Rest Logs */}
                  {restLogs.length > 0 && (
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Pause className="w-4 h-4 text-zinc-600" />
                        Rest Breaks ({restLogs.length})
                      </h3>
                      <div className="space-y-2.5">
                        {restLogs.map((rest) => (
                          <div key={rest.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                            <div>
                              <div className="text-sm font-medium">
                                {rest.duration_minutes ? `${Math.floor(rest.duration_minutes / 60)}h ${rest.duration_minutes % 60}m` : 'In progress'}
                              </div>
                              <div className="text-[11px] text-zinc-500">
                                {rest.location_name || 'Rest stop'} • {new Date(rest.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {rest.end_time && ` - ${new Date(rest.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                              </div>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${rest.end_time ? 'bg-zinc-600' : 'bg-orange-400 animate-pulse'}`} />
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-zinc-800/50 text-[11px] text-zinc-500">
                        Total rest: {Math.floor(restLogs.reduce((s, r) => s + (r.duration_minutes || 0), 0) / 60)}h {restLogs.reduce((s, r) => s + (r.duration_minutes || 0), 0) % 60}m
                      </div>
                    </div>
                  )}

                  {/* Fuel Logs */}
                  {fuelLogs.length > 0 && (
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-zinc-600" />
                        Fuel History
                      </h3>
                      <div className="space-y-2.5">
                        {fuelLogs.map((log) => (
                          <div key={log.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                            <div>
                              <div className="text-sm font-medium">{log.fuel_quantity} L • ₹{log.fuel_amount}</div>
                              <div className="text-[11px] text-zinc-500">{log.fuel_station_name} • {log.current_km} km</div>
                            </div>
                            <div className="text-[11px] text-zinc-600">
                              {new Date(log.log_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* No Active Trip */}
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                      <Play className="w-10 h-10 text-zinc-700" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">No Active Trip</h2>
                    <p className="text-sm text-zinc-500 mb-6 max-w-[280px] mx-auto">Start a new trip to begin tracking mileage and fuel automatically</p>
                    <button
                      onClick={() => setCurrentScreen('start')}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-black font-medium hover:bg-zinc-200 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Start New Trip
                    </button>
                  </div>

                  {/* Recent Trips */}
                  {trips.filter(t => t.driver_id === user?.id).length > 0 && (
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                      <h3 className="text-sm font-medium mb-3">Recent Trips</h3>
                      <div className="space-y-2.5">
                        {trips.filter(t => t.driver_id === user?.id).slice(0, 3).map((trip) => (
                          <div key={trip.id} className="flex items-center justify-between">
                            <div>
                              <div className="text-sm">{trip.destination_name}</div>
                              <div className="text-[11px] text-zinc-500">{new Date(trip.start_time).toLocaleDateString()} • {trip.vehicle_number}</div>
                            </div>
                            {trip.status === 'completed' && (
                              <div className="text-right">
                                <div className="text-sm font-medium text-emerald-400">{trip.mileage?.toFixed(1)} km/L</div>
                                <div className="text-[11px] text-zinc-500">{trip.total_distance?.toFixed(0)} km</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* START TRIP SCREEN */}
          {currentScreen === 'start' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setCurrentScreen('home')} className="p-2 hover:bg-zinc-900 rounded-xl -ml-2">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-semibold">Start Trip</h2>
                  <p className="text-xs text-zinc-500">GPS & time auto-captured</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Vehicle</label>
                  <select
                    value={selectedVehicle?.id || ''}
                    onChange={(e) => setSelectedVehicle(vehicles.find(v => v.id === Number(e.target.value)) || null)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="">Select vehicle</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.vehicle_number} • {v.model}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Destination</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-600" />
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Enter destination name"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-10 pr-4 py-3.5 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Starting KM Reading</label>
                  <div className="relative">
                    <Gauge className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-600" />
                    <input
                      type="number"
                      value={startingKm}
                      onChange={(e) => setStartingKm(e.target.value)}
                      placeholder="Odometer reading"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-10 pr-4 py-3.5 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">KM Meter Photo (Required for fraud prevention)</label>
                  <button
                    type="button"
                    onClick={() => handleImageCapture('start')}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:bg-zinc-800/50 transition-colors"
                  >
                    {startingKmImage ? (
                      <div className="flex items-center gap-3">
                        <img src={startingKmImage} alt="KM" className="w-16 h-12 object-cover rounded-xl" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-emerald-400">Photo captured</div>
                          <div className="text-xs text-zinc-500">Tap to retake</div>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2.5 py-2">
                        <Camera className="w-5 h-5 text-zinc-600" />
                        <span className="text-zinc-400">Tap to capture odometer</span>
                      </div>
                    )}
                  </button>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3.5 mt-6">
                  <div className="flex gap-2.5">
                    <Navigation className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-amber-400 mb-1">Auto-captured data</div>
                      <div className="text-[11px] text-zinc-500 leading-relaxed">
                        Start time: {new Date().toLocaleString()}<br />
                        GPS: {gps ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : 'Acquiring...'}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={startTrip}
                  disabled={loading || !selectedVehicle || !destination || !startingKm || !startingKmImage}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-2xl py-3.5 mt-2 transition-colors"
                >
                  {loading ? 'Starting...' : 'Start Trip • Lock GPS & Time'}
                </button>
              </div>
            </motion.div>
          )}

          {/* FUEL ENTRY SCREEN */}
          {currentScreen === 'fuel' && (
            <motion.div
              key="fuel"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setCurrentScreen('home')} className="p-2 hover:bg-zinc-900 rounded-xl -ml-2">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-semibold">Fuel Entry</h2>
                  <p className="text-xs text-zinc-500">Trip #{activeTrip?.id} • {activeTrip?.vehicle_number}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1.5 block">Quantity (Liters)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fuelQuantity}
                      onChange={(e) => setFuelQuantity(e.target.value)}
                      placeholder="0.0"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-xl font-medium focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1.5 block">Amount (₹)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input
                        type="number"
                        value={fuelAmount}
                        onChange={(e) => setFuelAmount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-9 pr-4 py-3.5 text-xl font-medium focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Current KM Reading</label>
                  <input
                    type="number"
                    value={currentKm}
                    onChange={(e) => setCurrentKm(e.target.value)}
                    placeholder="Odometer now"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Fuel Station</label>
                  <input
                    type="text"
                    value={fuelStation}
                    onChange={(e) => setFuelStation(e.target.value)}
                    placeholder="HP, Indian Oil, etc."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Fuel Bill Photo</label>
                  <button
                    type="button"
                    onClick={() => handleImageCapture('fuel')}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:bg-zinc-800/50 transition-colors"
                  >
                    {fuelBillImage ? (
                      <div className="flex items-center gap-3">
                        <img src={fuelBillImage} alt="Bill" className="w-16 h-12 object-cover rounded-xl" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-amber-400">Bill captured</div>
                          <div className="text-xs text-zinc-500">Tap to retake</div>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-amber-400 ml-auto" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2.5 py-2">
                        <Camera className="w-5 h-5 text-zinc-600" />
                        <span className="text-zinc-400">Capture bill for verification</span>
                      </div>
                    )}
                  </button>
                </div>

                <button
                  onClick={addFuel}
                  disabled={loading || !fuelQuantity || !fuelAmount || !currentKm}
                  className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium rounded-2xl py-3.5 mt-2 transition-colors"
                >
                  {loading ? 'Saving...' : 'Log Fuel • Auto GPS'}
                </button>
              </div>
            </motion.div>
          )}

          {/* DESTINATION SCREEN */}
          {currentScreen === 'destination' && (
            <motion.div
              key="destination"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setCurrentScreen('home')} className="p-2 hover:bg-zinc-900 rounded-xl -ml-2">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-semibold">Destination Reached</h2>
                  <p className="text-xs text-zinc-500">Log arrival details</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Destination Name</label>
                  <input
                    type="text"
                    value={destination || activeTrip?.destination_name || ''}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Arrival KM Reading</label>
                  <input
                    type="number"
                    value={arrivalKm}
                    onChange={(e) => setArrivalKm(e.target.value)}
                    placeholder="Odometer at destination"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-xl font-medium focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">KM Meter Photo</label>
                  <button
                    type="button"
                    onClick={() => handleImageCapture('arrival')}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:bg-zinc-800/50 transition-colors"
                  >
                    {arrivalKmImage ? (
                      <div className="flex items-center gap-3">
                        <img src={arrivalKmImage} alt="KM" className="w-16 h-12 object-cover rounded-xl" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-cyan-400">Photo captured</div>
                          <div className="text-xs text-zinc-500">Tap to retake</div>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-cyan-400 ml-auto" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2.5 py-2">
                        <Camera className="w-5 h-5 text-zinc-600" />
                        <span className="text-zinc-400">Capture odometer</span>
                      </div>
                    )}
                  </button>
                </div>

                <button
                  onClick={reachDestination}
                  disabled={loading || !arrivalKm}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium rounded-2xl py-3.5 mt-2 transition-colors"
                >
                  {loading ? 'Saving...' : 'Confirm Arrival'}
                </button>
              </div>
            </motion.div>
          )}

          {/* REST SCREEN */}
          {currentScreen === 'rest' && (
            <motion.div
              key="rest"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setCurrentScreen('home')} className="p-2 hover:bg-zinc-900 rounded-xl -ml-2">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-semibold">Take Rest Break</h2>
                  <p className="text-xs text-zinc-500">For long distance trips</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4">
                  <div className="flex gap-3">
                    <Pause className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-orange-400 mb-1">Rest Timer</div>
                      <div className="text-xs text-zinc-400 leading-relaxed">
                        Tap "Start Rest" to begin tracking. GPS location and start time will be locked automatically. 
                        When you resume driving, tap "Resume" on the home screen.
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Location (Optional)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-600" />
                    <input
                      type="text"
                      value={restLocation}
                      onChange={(e) => setRestLocation(e.target.value)}
                      placeholder="e.g., Dhaba near Lonavala, Hotel"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-10 pr-4 py-3.5 focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Notes (Optional)</label>
                  <textarea
                    value={restNotes}
                    onChange={(e) => setRestNotes(e.target.value)}
                    placeholder="Meal break, overnight halt, etc."
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 focus:outline-none focus:border-orange-500/50 resize-none text-sm"
                  />
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-3.5">
                  <div className="flex gap-2.5">
                    <Navigation className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-zinc-400 mb-1">Will auto-capture</div>
                      <div className="text-[11px] text-zinc-500">
                        Start: {new Date().toLocaleTimeString()} • GPS: {gps ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : '...' }
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={startRest}
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium rounded-2xl py-3.5 transition-colors flex items-center justify-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  {loading ? 'Starting...' : 'Start Rest • Lock Time & GPS'}
                </button>
              </div>
            </motion.div>
          )}

          {/* END TRIP SCREEN */}
          {currentScreen === 'end' && (
            <motion.div
              key="end"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setCurrentScreen('home')} className="p-2 hover:bg-zinc-900 rounded-xl -ml-2">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-semibold">Return to Station</h2>
                  <p className="text-xs text-zinc-500">End trip & calculate mileage</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                  <h3 className="text-sm font-medium mb-3">Trip Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Distance so far</span>
                      <span className="font-medium">{activeTrip && arrivalKm ? (parseFloat(arrivalKm) - activeTrip.starting_km).toFixed(0) : '0'} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Fuel used</span>
                      <span className="font-medium">{fuelLogs.reduce((s, l) => s + l.fuel_quantity, 0).toFixed(1)} L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Total cost</span>
                      <span className="font-medium">₹{fuelLogs.reduce((s, l) => s + l.fuel_amount, 0).toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Final KM Reading</label>
                  <input
                    type="number"
                    value={finalKm}
                    onChange={(e) => setFinalKm(e.target.value)}
                    placeholder="Odometer at base"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-xl font-medium focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Final KM Photo</label>
                  <button
                    type="button"
                    onClick={() => handleImageCapture('final')}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:bg-zinc-800/50 transition-colors"
                  >
                    {finalKmImage ? (
                      <div className="flex items-center gap-3">
                        <img src={finalKmImage} alt="KM" className="w-16 h-12 object-cover rounded-xl" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-violet-400">Photo captured</div>
                          <div className="text-xs text-zinc-500">Tap to retake</div>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-violet-400 ml-auto" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2.5 py-2">
                        <Camera className="w-5 h-5 text-zinc-600" />
                        <span className="text-zinc-400">Capture final odometer</span>
                      </div>
                    )}
                  </button>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any issues, delays, or remarks..."
                    rows={3}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 focus:outline-none focus:border-violet-500/50 resize-none"
                  />
                </div>

                <button
                  onClick={endTrip}
                  disabled={loading || !finalKm || !finalKmImage}
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white font-medium rounded-2xl py-3.5 mt-2 transition-all"
                >
                  {loading ? 'Calculating...' : 'End Trip • Calculate Mileage'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav - only on home */}
      {currentScreen === 'home' && !activeTrip && (
        <div className="fixed bottom-0 inset-x-0 max-w-lg mx-auto p-4 pb-6">
          <button
            onClick={() => setCurrentScreen('start')}
            className="w-full bg-white text-black font-semibold rounded-2xl py-4 shadow-2xl shadow-white/10 hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            Start New Trip
          </button>
        </div>
      )}
    </div>
  );
}