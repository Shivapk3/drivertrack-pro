import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, MapPin, Fuel, Clock, Camera, Navigation, Gauge, IndianRupee, FileText, CheckCircle2, LogOut, User, BarChart3, Image as ImageIcon, ArrowLeft, Play, Pause, Flag, Home, Plus, Users, Key, Trash2, Edit } from 'lucide-react';
import supabase from './lib/supabase';

type Driver = {
  id: string;
  mobile: string;
  name: string;
  role: 'driver' | 'admin';
  vehicle_name?: string;
  vehicle_number?: string;
  vehicle_type?: string;
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
  const [adminTab, setAdminTab] = useState<'dashboard' | 'drivers'>('dashboard');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [restLogs, setRestLogs] = useState<RestLog[]>([]);
  const [activeRest, setActiveRest] = useState<RestLog | null>(null);
  const [restLocation, setRestLocation] = useState('');
  const [restNotes, setRestNotes] = useState('');

  // Enhanced Form states for creating new drivers requested by Admin
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverMobile, setNewDriverMobile] = useState('');
  const [newDriverPassword, setNewDriverPassword] = useState('');
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehicleNumber, setNewVehicleNumber] = useState('');
  const [newVehicleType, setNewVehicleType] = useState('Truck');

  // Trip form states
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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('GPS access denied')
      );
    }

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
    try {
      const res = await fetch('/api/drivers');
      const driversData = await res.json();
      const currentDriver = driversData.find((d: Driver) => d.id === id);
      if (currentDriver) {
        setUser(currentDriver);
        // Explicitly check role flag or admin credential pattern
        if (currentDriver.role === 'admin' || currentDriver.mobile === '9492911408') {
          setView('admin');
        } else {
          setView('driver');
          fetchActiveTrip(id);
        }
      }
    } catch (e) {
      console.error("Error identifying driver session", e);
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

  const fetchActiveTripLogs = async () => {
    if (activeTrip) {
      fetchFuelLogs(activeTrip.id);
    }
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
      const { error } = await supabase.auth.signInWithPassword({
        email: `${mobile}@driver.local`,
        password: password
      });

      if (error) {
        throw new Error('Invalid credentials. Access Denied.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createDriver = async () => {
    if (!newDriverMobile || !newDriverName || !newDriverPassword || !newVehicleNumber) {
      alert('Fill all required fields (*)');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: `${newDriverMobile}@driver.local`,
        password: newDriverPassword
      });

      if (error) throw error;

      if (data.user) {
        // Post full extended credentials directly into database via API layer
        await fetch('/api/drivers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: data.user.id,
            mobile: newDriverMobile,
            name: newDriverName,
            role: 'driver',
            vehicle_name: newVehicleName || null,
            vehicle_number: newVehicleNumber,
            vehicle_type: newVehicleType
          })
        });

        // Also add vehicle data instantly to list if unique
        await fetch('/api/vehicles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicle_number: newVehicleNumber,
            model: newVehicleName || 'Standard Fleet',
            type: newVehicleType
          })
        });

        alert(`Driver Successfully Registered!\nName: ${newDriverName}\nMobile: ${newDriverMobile}`);
        
        // Reset configuration forms
        setNewDriverMobile('');
        setNewDriverName('');
        setNewDriverPassword('');
        setNewVehicleName('');
        setNewVehicleNumber('');
        setNewVehicleType('Truck');
        
        fetchDrivers();
        fetchVehicles();
      }
    } catch (err: any) {
      alert('Registration Failed: ' + err.message);
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
      alert('Failed to initialize rest log');
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
      alert('Failed to close rest protocol');
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
      alert('Provide all metrics to initialize');
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
      
      setDestination('');
      setStartingKm('');
      setStartingKmImage('');
    } catch (err) {
      alert('Odometer submission failed');
    } finally {
      setLoading(false);
    }
  };

  const addFuel = async () => {
    if (!activeTrip || !fuelQuantity || !fuelAmount || !currentKm) {
      alert('Complete all text fields');
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
      
      setFuelQuantity('');
      setFuelAmount('');
      setCurrentKm('');
      setFuelStation('');
      setFuelBillImage('');
    } catch (err) {
      alert('Fuel telemetry upload failed');
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
      alert('Failed to reach target terminal');
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
      
      setFinalKm('');
      setFinalKmImage('');
      setNotes('');
      setArrivalKm('');
      setFuelLogs([]);
    } catch (err) {
      alert('Failed to execute telemetry save');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveTrip(null);
    setView('login');
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
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-semibold rounded-2xl py-3.5 hover:bg-zinc-200 transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? 'Validating ID...' : 'Continue'}
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

  if (view === 'admin') {
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
                <h1 className="font-semibold">Admin Panel</h1>
                <p className="text-xs text-zinc-500 -mt-0.5">Control Tower</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={logout} className="p-2 hover:bg-zinc-900 rounded-xl" title="Logout">
                <LogOut className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-4 sm:p-6">
          {/* Top Admin View Switcher tabs */}
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
              Dashboard Report
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
              {/* Aggregated Analytical Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Total Trips', value: completedTrips.length, icon: Truck, color: 'from-emerald-500 to-teal-500' },
                  { label: 'Total KM Run', value: Math.round(completedTrips.reduce((s, t) => s + (t.total_distance || 0), 0)).toLocaleString(), icon: Navigation, color: 'from-cyan-500 to-blue-500' },
                  { label: 'Fuel Dispatched', value: `${Math.round(completedTrips.reduce((s, t) => s + (t.total_fuel_used || 0), 0))} L`, icon: Fuel, color: 'from-amber-500 to-orange-500' },
                  { label: 'Avg Fleet Mileage', value: `${(completedTrips.reduce((s, t) => s + (t.mileage || 0), 0) / (completedTrips.length || 1)).toFixed(1)} km/L`, icon: Gauge, color: 'from-violet-500 to-purple-500' },
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

              {/* Master Data Log Table */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                  <h2 className="font-semibold">Fleet Manifest Records</h2>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400">{completedTrips.length} entries</span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-950/50 border-b border-zinc-800">
                      <tr className="text-left text-xs text-zinc-500">
                        <th className="px-5 py-3 font-medium">Driver Profile</th>
                        <th className="px-5 py-3 font-medium">Vehicle ID</th>
                        <th className="px-5 py-3 font-medium">Route Terminal</th>
                        <th className="px-5 py-3 font-medium">Odometer Traveled</th>
                        <th className="px-5 py-3 font-medium">Fuel Stats</th>
                        <th className="px-5 py-3 font-medium">Performance Metrics</th>
                        <th className="px-5 py-3 font-medium">Time Elapsed</th>
                        <th className="px-5 py-3 font-medium">Odometer Proof</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {completedTrips.map((trip) => (
                        <tr key={trip.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-medium text-sm">{trip.driver_name}</div>
                            <div className="text-xs text-zinc-500">{new Date(trip.start_time).toLocaleDateString()}</div>
                          </td>
                          <td className="px-5 py-3.5 text-sm font-mono text-cyan-400">{trip.vehicle_number}</td>
                          <td className="px-5 py-3.5 text-sm max-w-[140px] truncate">{trip.destination_name}</td>
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
                                <a href={trip.starting_km_image} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-zinc-800 rounded-lg" title="View Initial KM Odometer">
                                  <ImageIcon className="w-3.5 h-3.5 text-zinc-500 hover:text-white" />
                                </a>
                              )}
                              {trip.final_km_image && (
                                <a href={trip.final_km_image} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-zinc-800 rounded-lg" title="View Closing KM Odometer">
                                  <ImageIcon className="w-3.5 h-3.5 text-zinc-500 hover:text-white" />
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
                      <p>Database table is currently unpopulated</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {adminTab === 'drivers' && (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Comprehensive Upgraded Driver Registration Module */}
              <div className="lg:col-span-1">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 sticky top-24">
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-violet-400" />
                    Register Fleet Crew
                  </h3>
                  <p className="text-xs text-zinc-500 mb-5">Provide secure driver & vehicle profiles</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1.5 block">Driver Full Name *</label>
                      <input
                        type="text"
                        value={newDriverName}
                        onChange={(e) => setNewDriverName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-500/50"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 mb-1.5 block">Driver Login Phone Number *</label>
                      <input
                        type="tel"
                        value={newDriverMobile}
                        onChange={(e) => setNewDriverMobile(e.target.value)}
                        placeholder="10-digit number"
                        maxLength={10}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-zinc-400 mb-1.5 block">Secure Login Password *</label>
                      <input
                        type="text"
                        value={newDriverPassword}
                        onChange={(e) => setNewDriverPassword(e.target.value)}
                        placeholder="Password string"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-zinc-400 mb-1.5 block">Vehicle Name / Model</label>
                      <input
                        type="text"
                        value={newVehicleName}
                        onChange={(e) => setNewVehicleName(e.target.value)}
                        placeholder="BharatBenz 3523R / Tata Ace"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-500/50"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 mb-1.5 block">Vehicle License Number *</label>
                      <input
                        type="text"
                        value={newVehicleNumber}
                        onChange={(e) => setNewVehicleNumber(e.target.value)}
                        placeholder="TS-09-EX-1234"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-cyan-400 focus:outline-none focus:border-violet-500/50"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 mb-1.5 block">Vehicle Body Type</label>
                      <select
                        value={newVehicleType}
                        onChange={(e) => setNewVehicleType(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-500/50"
                      >
                        <option value="Truck">Truck Carrier</option>
                        <option value="Auto">Auto Tipper</option>
                        <option value="Container">Container Trailer</option>
                      </select>
                    </div>

                    <button
                      onClick={createDriver}
                      disabled={loading || !newDriverMobile || !newDriverName || !newDriverPassword || !newVehicleNumber}
                      className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium rounded-xl py-2.5 text-sm transition-colors mt-2"
                    >
                      {loading ? 'Publishing Profile...' : 'Authorize and Create Account'}
                    </button>

                    <div className="pt-3 border-t border-zinc-800">
                      <div className="flex items-start gap-2 text-[11px] text-zinc-500">
                        <Key className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                        <p>Credentials validate automatically on the login panel bypassing external third-party mobile SMS gatekeepers.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Registered Drivers Overview */}
              <div className="lg:col-span-2">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-zinc-800">
                    <h3 className="font-semibold">Registered Operators ({drivers.filter(d => d.mobile !== '9492911408' && d.mobile !== '9999999999').length})</h3>
                  </div>
                  
                  <div className="divide-y divide-zinc-800/50">
                    {drivers.filter(d => d.mobile !== '9492911408' && d.mobile !== '9999999999').map((driver) => {
                      const driverTrips = trips.filter(t => t.driver_id === driver.id);
                      const completed = driverTrips.filter(t => t.status === 'completed');
                      
                      return (
                        <div key={driver.id} className="p-5 hover:bg-zinc-800/20 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex gap-3.5">
                              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                                <User className="w-5 h-5 text-zinc-500" />
                              </div>
                              <div>
                                <div className="font-medium text-base">{driver.name}</div>
                                <div className="text-sm text-zinc-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span className="font-mono text-zinc-400">Mobile: {driver.mobile}</span>
                                  {(driver.vehicle_number || driver.vehicle_assigned) && (
                                    <span className="flex items-center gap-1 text-cyan-400 font-mono">
                                      <Truck className="w-3 h-3 text-zinc-500" />
                                      {driver.vehicle_number || driver.vehicle_assigned} {driver.vehicle_name ? `(${driver.vehicle_name})` : ''}
                                    </span>
                                  )}
                                  {driver.vehicle_type && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">{driver.vehicle_type}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-5 mt-3">
                                  <div>
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Trips</div>
                                    <div className="text-sm font-medium text-zinc-300">{completed.length}</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Total KM</div>
                                    <div className="text-sm font-medium text-zinc-300">{Math.round(completed.reduce((s, t) => s + (t.total_distance || 0), 0))}</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Fuel Mileage</div>
                                    <div className="text-sm font-medium text-emerald-400">
                                      {completed.length > 0 ? (completed.reduce((s, t) => s + (t.mileage || 0), 0) / completed.length).toFixed(1) : '0'} km/L
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                                <span className="text-[10px] text-emerald-400 font-medium">Synced</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {drivers.filter(d => d.mobile !== '9492911408' && d.mobile !== '9999999999').length === 0 && (
                      <div className="py-16 text-center text-zinc-600">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No drivers configured in database yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // STANDARD DRIVER TELEMETRY WORKFLOW INTERFACE
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col max-w-lg mx-auto relative border-x border-zinc-900 shadow-2xl">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
      
      {/* Header Profile Status Row */}
      <header className="sticky top-0 z-30 backdrop-blur-2xl bg-[#0B0F19]/70 border-b border-zinc-900">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Truck className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-[11px] text-zinc-500 leading-none">Driver Identity</div>
              <div className="font-medium text-sm -mt-0.5">{user?.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {gps && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-medium">GPS LOCK</span>
              </div>
            )}
            <button onClick={logout} className="p-2 hover:bg-zinc-900 rounded-xl" title="Exit App">
              <LogOut className="w-4.5 h-4.5 text-zinc-500 hover:text-red-400" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 pb-24">
        <AnimatePresence mode="wait">
          {/* HOME COMPONENT VIEW */}
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
                  {/* Current Active Manifest Metrics */}
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600/20 to-cyan-600/20 border border-emerald-500/20 p-[1px]">
                    <div className="rounded-3xl bg-zinc-950 p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Active Run</span>
                          </div>
                          <h2 className="text-xl font-semibold">{activeTrip.destination_name}</h2>
                          <p className="text-sm text-zinc-500 mt-0.5 font-mono text-cyan-400">{activeTrip.vehicle_number}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] text-zinc-600">Dispatched</div>
                          <div className="text-sm font-medium">{new Date(activeTrip.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-zinc-900/50 rounded-2xl p-3 border border-zinc-800/50">
                          <Gauge className="w-4 h-4 text-zinc-600 mb-1.5" />
                          <div className="text-[11px] text-zinc-500">Initial KM</div>
                          <div className="font-semibold">{activeTrip.starting_km}</div>
                        </div>
                        <div className="bg-zinc-900/50 rounded-2xl p-3 border border-zinc-800/50">
                          <Fuel className="w-4 h-4 text-zinc-600 mb-1.5" />
                          <div className="text-[11px] text-zinc-500">Fuel Entries</div>
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

                  {/* Operational Rest Sub-Banner */}
                  {activeRest && (
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30 p-[1px]">
                      <div className="rounded-2xl bg-zinc-950 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center animate-pulse">
                              <Pause className="w-5 h-5 text-orange-400" />
                            </div>
                            <div>
                              <div className="text-xs font-medium text-orange-400 uppercase tracking-wider">Rest Stop Active</div>
                              <div className="text-sm mt-0.5">Clocked {new Date(activeRest.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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
                            Resume Trip
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Standard Driver Layout Functional Navigation Grid */}
                  <div className="space-y-3">
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
                            <div className="text-xs text-zinc-500 mt-0.5">Halt tracking interval • Logs location profiles</div>
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
                          <div className="text-xs text-zinc-500 mt-0.5">Submit refill receipt data with camera capture verification</div>
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
                            <div className="text-xs text-zinc-500 mt-0.5">Log arrival odometer reading at target checkpoint</div>
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
                              <div className="font-medium">Return to Station Base</div>
                              <div className="text-xs text-zinc-500 mt-0.5">Close active loop manifest and analyze efficiency</div>
                            </div>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Standby State Display */}
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                      <Play className="w-10 h-10 text-zinc-700" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">System Standing By</h2>
                    <p className="text-sm text-zinc-500 mb-6 max-w-[280px] mx-auto">Initialize a manifest sequence to start recording fleet parameters</p>
                    <button
                      onClick={() => setCurrentScreen('start')}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-black font-medium hover:bg-zinc-200 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Initialize Route Run
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* TRIP COMMENCEMENT PROFILE LAYOUT */}
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
                  <h2 className="text-xl font-semibold">Start Route Tracking</h2>
                  <p className="text-xs text-zinc-500">Security parameters active</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Select Truck/Auto/Container ID</label>
                  <select
                    value={selectedVehicle?.id || ''}
                    onChange={(e) => setSelectedVehicle(vehicles.find(v => v.id === Number(e.target.value)) || null)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="">Select vehicle reference</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.vehicle_number} • {v.model}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Route Destination Name</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-600" />
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="e.g. Warehouse B Terminal"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-10 pr-4 py-3.5 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Starting Odometer KM Reading</label>
                  <div className="relative">
                    <Gauge className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-600" />
                    <input
                      type="number"
                      value={startingKm}
                      onChange={(e) => setStartingKm(e.target.value)}
                      placeholder="Current dashboard mileage"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-10 pr-4 py-3.5 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Dashboard KM Meter Camera Proof *</label>
                  <button
                    type="button"
                    onClick={() => handleImageCapture('start')}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:bg-zinc-800/50 transition-colors"
                  >
                    {startingKmImage ? (
                      <div className="flex items-center gap-3">
                        <img src={startingKmImage} alt="Odometer" className="w-16 h-12 object-cover rounded-xl" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-emerald-400">Odometer file verified</div>
                          <div className="text-xs text-zinc-500">Tap to cycle camera</div>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2.5 py-2">
                        <Camera className="w-5 h-5 text-zinc-600" />
                        <span className="text-zinc-400">Trigger snapshot authentication</span>
                      </div>
                    )}
                  </button>
                </div>

                <button
                  onClick={startTrip}
                  disabled={loading || !selectedVehicle || !destination || !startingKm || !startingKmImage}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-2xl py-3.5 mt-2 transition-colors"
                >
                  {loading ? 'Locking Parameters...' : 'Deploy Route Run'}
                </button>
              </div>
            </motion.div>
          )}

          {/* FUEL LOGGING PANEL COMPONENT */}
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
                  <h2 className="text-xl font-semibold">Log Fuel Refill</h2>
                  <p className="text-xs text-zinc-500">Vehicle link: {activeTrip?.vehicle_number}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1.5 block">Refuel Quantity (Liters)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fuelQuantity}
                      onChange={(e) => setFuelQuantity(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-xl font-medium focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1.5 block">Total Cash/Slip Cost (₹)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input
                        type="number"
                        value={fuelAmount}
                        onChange={(e) => setFuelAmount(e.target.value)}
                        placeholder="0000"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-9 pr-4 py-3.5 text-xl font-medium focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Odometer KM at Refill Station</label>
                  <input
                    type="number"
                    value={currentKm}
                    onChange={(e) => setCurrentKm(e.target.value)}
                    placeholder="Odometer metrics"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Vendor Retail Station Station Name</label>
                  <input
                    type="text"
                    value={fuelStation}
                    onChange={(e) => setFuelStation(e.target.value)}
                    placeholder="HP Petrol Pump / Indian Oil Station"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Refuel Invoice Slip Photo</label>
                  <button
                    type="button"
                    onClick={() => handleImageCapture('fuel')}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:bg-zinc-800/50 transition-colors"
                  >
                    {fuelBillImage ? (
                      <div className="flex items-center gap-3">
                        <img src={fuelBillImage} alt="Bill receipt" className="w-16 h-12 object-cover rounded-xl" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-amber-400">Invoice uploaded</div>
                          <div className="text-xs text-zinc-500">Tap to override photo</div>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-amber-400 ml-auto" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2.5 py-2">
                        <Camera className="w-5 h-5 text-zinc-600" />
                        <span className="text-zinc-400">Capture official fuel invoice slip</span>
                      </div>
                    )}
                  </button>
                </div>

                <button
                  onClick={addFuel}
                  disabled={loading || !fuelQuantity || !fuelAmount || !currentKm}
                  className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-medium rounded-2xl py-3.5 mt-2 transition-colors"
                >
                  {loading ? 'Transmitting Data...' : 'Log Telemetry Entry'}
                </button>
              </div>
            </motion.div>
          )}

          {/* CHECKPOINT DESTINATION ARRIVAL VIEW */}
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
                  <h2 className="text-xl font-semibold">Arrived at Terminal Point</h2>
                  <p className="text-xs text-zinc-500">Record matching coordinates</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Terminal Node Name</label>
                  <input
                    type="text"
                    value={destination || activeTrip?.destination_name || ''}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Arrival Odometer KM Metrics</label>
                  <input
                    type="number"
                    value={arrivalKm}
                    onChange={(e) => setArrivalKm(e.target.value)}
                    placeholder="Dashboard odometer reading"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-xl font-medium focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Odometer Gauge Snapshot</label>
                  <button
                    type="button"
                    onClick={() => handleImageCapture('arrival')}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:bg-zinc-800/50 transition-colors"
                  >
                    {arrivalKmImage ? (
                      <div className="flex items-center gap-3">
                        <img src={arrivalKmImage} alt="Arrival proof" className="w-16 h-12 object-cover rounded-xl" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-cyan-400">Snapshot captured</div>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-cyan-400 ml-auto" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2.5 py-2">
                        <Camera className="w-5 h-5 text-zinc-600" />
                        <span className="text-zinc-400">Take verify snapshot</span>
                      </div>
                    )}
                  </button>
                </div>

                <button
                  onClick={reachDestination}
                  disabled={loading || !arrivalKm}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-medium rounded-2xl py-3.5 mt-2 transition-colors"
                >
                  {loading ? 'Recording Timestamp...' : 'Confirm Milestone Arrival'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ACTIVE BREAK PROTOCOL INTERFACE */}
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
                  <h2 className="text-xl font-semibold">Activate Break Protocol</h2>
                  <p className="text-xs text-zinc-500">Fleet tracking holds automatically</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Halt Landmark Point (Optional)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-600" />
                    <input
                      type="text"
                      value={restLocation}
                      onChange={(e) => setRestLocation(e.target.value)}
                      placeholder="e.g. Expressway Plaza Toll plaza"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-10 pr-4 py-3.5 focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Break Remarks/Notes (Optional)</label>
                  <textarea
                    value={restNotes}
                    onChange={(e) => setRestNotes(e.target.value)}
                    placeholder="Meal break or overnight driver sleep cycle"
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 focus:outline-none focus:border-orange-500/50 resize-none text-sm"
                  />
                </div>

                <button
                  onClick={startRest}
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-medium rounded-2xl py-3.5 transition-colors flex items-center justify-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  {loading ? 'Suspending Manifest...' : 'Lock Position & Halt Run'}
                </button>
              </div>
            </motion.div>
          )}

          {/* CLOSING MANIFEST DISPATCH COMPONENT */}
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
                  <h2 className="text-xl font-semibold">Terminate Run Route</h2>
                  <p className="text-xs text-zinc-500">Calculate fuel metrics parameters</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                  <h3 className="text-xs font-medium uppercase text-zinc-400 mb-3 tracking-wider">Run Summary Telemetry</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Est. Vector Distance</span>
                      <span className="font-mono text-cyan-400">{activeTrip && arrivalKm ? (parseFloat(arrivalKm) - activeTrip.starting_km).toFixed(0) : '0'} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Refuel Volume Quantified</span>
                      <span className="font-mono text-zinc-300">{fuelLogs.reduce((s, l) => s + l.fuel_quantity, 0).toFixed(1)} L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Refuel Outlay Cumulative</span>
                      <span className="font-mono text-amber-400">₹{fuelLogs.reduce((s, l) => s + l.fuel_amount, 0).toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Final Return Base Odometer KM Reading</label>
                  <input
                    type="number"
                    value={finalKm}
                    onChange={(e) => setFinalKm(e.target.value)}
                    placeholder="Dashboard gauge odometer metrics"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-xl font-medium focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Odometer Gauge Camera Photo Proof *</label>
                  <button
                    type="button"
                    onClick={() => handleImageCapture('final')}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:bg-zinc-800/50 transition-colors"
                  >
                    {finalKmImage ? (
                      <div className="flex items-center gap-3">
                        <img src={finalKmImage} alt="Final proof" className="w-16 h-12 object-cover rounded-xl" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-violet-400">Final proof verified</div>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-violet-400 ml-auto" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2.5 py-2">
                        <Camera className="w-5 h-5 text-zinc-600" />
                        <span className="text-zinc-400">Snap closing odometer gauge</span>
                      </div>
                    )}
                  </button>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Trip Remarks / Closing Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Provide comments regarding route bottlenecks or vehicle mechanical delays..."
                    rows={3}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 focus:outline-none focus:border-violet-500/50 resize-none text-sm text-zinc-300"
                  />
                </div>

                <button
                  onClick={endTrip}
                  disabled={loading || !finalKm || !finalKmImage}
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 text-white font-medium rounded-2xl py-3.5 mt-2 transition-all"
                >
                  {loading ? 'Processing Performance Array...' : 'Close Manifest and Calculate Efficiency'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Dynamic Trigger Bottom Bar */}
      {currentScreen === 'home' && !activeTrip && (
        <div className="fixed bottom-0 inset-x-0 max-w-lg mx-auto p-4 pb-6 backdrop-blur-sm bg-gradient-to-t from-[#0B0F19] to-transparent">
          <button
            onClick={() => setCurrentScreen('start')}
            className="w-full bg-white text-black font-semibold rounded-2xl py-4 shadow-2xl shadow-white/5 hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-current" />
            Initialize Route Run
          </button>
        </div>
      )}
    </div>
  );
}
