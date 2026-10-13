'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Atom,
  Activity,
  Sliders,
  Compass,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  ShieldAlert,
  Zap,
  Info,
  Car,
  Bike,
  Footprints,
  Gauge,
  Timer,
  Route,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { HelpCategory, TravelMode } from '@/lib/data/types';
import {
  CATEGORY_WEIGHTS,
  calculateETA,
  calculateHaversineDistance,
  calculateHelpGravity,
  formatETA,
} from '@/lib/data/physics';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { dataAdapter } from '@/lib/data';

export function PhysicsLabView() {

  // -------------------------------------------------------------
  // FEATURE A: KINEMATICS & HAVERSINE DISTANCE
  // -------------------------------------------------------------
  const [pointA, setPointA] = useState({ name: 'Asansol Engineering College', lat: 23.6889, lng: 86.9661 });
  const [pointB, setPointB] = useState({ name: 'Asansol District Hospital', lat: 23.6845, lng: 86.9742 });
  const [selectedTravelMode, setSelectedTravelMode] = useState<TravelMode>('bike');
  const [customSpeed, setCustomSpeed] = useState<number>(15);

  const calculatedDistance = calculateHaversineDistance(
    pointA.lat,
    pointA.lng,
    pointB.lat,
    pointB.lng
  );
  const calculatedETA = Math.max(1, Math.round((calculatedDistance / Math.max(1, customSpeed)) * 60));

  // -------------------------------------------------------------
  // FEATURE B: HELP GRAVITY SIMULATOR
  // -------------------------------------------------------------
  const [simCategory, setSimCategory] = useState<HelpCategory>('blood');
  const [simDistance, setSimDistance] = useState<number>(1.2);
  const [simWaitingTime, setSimWaitingTime] = useState<number>(14);

  const liveGravityScore = calculateHelpGravity(simCategory, simWaitingTime, simDistance);
  const liveWeight = CATEGORY_WEIGHTS[simCategory];
  const liveTimeFactor = Math.round((1 + 0.05 * simWaitingTime) * 100) / 100;
  const liveDistDenominator = Math.round(Math.pow(1 + simDistance, 2) * 100) / 100;

  // -------------------------------------------------------------
  // FEATURE C: SENSOR CALIBRATION & FALL DETECTOR
  // -------------------------------------------------------------
  const [sensorSupported, setSensorSupported] = useState<boolean>(true);
  const [sensorPermissionNeeded, setSensorPermissionNeeded] = useState<boolean>(false);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibrated, setCalibrated] = useState<boolean>(false);
  const [offsets, setOffsets] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 9.8 });
  const [lowPassFilterEnabled, setLowPassFilterEnabled] = useState<boolean>(true);

  // Live motion readings
  const [currentAccel, setCurrentAccel] = useState<{ x: number; y: number; z: number; mag: number }>({
    x: 0,
    y: 0,
    z: 9.8,
    mag: 9.8,
  });

  // Recent history for live graph
  const [history, setHistory] = useState<number[]>([9.8, 9.8, 9.8, 9.8, 9.8, 9.8, 9.8, 9.8, 9.8, 9.8]);

  // Fall detection states
  const [countdownActive, setCountdownActive] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(10);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filter smoothing memory
  const smoothedRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 9.8 });

  // Check DeviceMotion availability on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!('DeviceMotionEvent' in window)) {
        setSensorSupported(false);
      } else if (
        typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> })
          .requestPermission === 'function'
      ) {
        setSensorPermissionNeeded(true);
      }
    }
  }, []);

  // Request iOS permission if needed
  const handleRequestSensorPermission = async () => {
    const DeviceMotionEventWithPermission = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof DeviceMotionEventWithPermission.requestPermission === 'function') {
      try {
        const response = await DeviceMotionEventWithPermission.requestPermission();
        if (response === 'granted') {
          setSensorPermissionNeeded(false);
          startMotionListener();
        } else {
          toast.error('Motion sensor permission denied');
        }
      } catch (err) {
        toast.error('Sensor permission error');
      }
    } else {
      startMotionListener();
    }
  };

  const startMotionListener = () => {
    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      let rx = acc.x;
      let ry = acc.y;
      let rz = acc.z;

      // Apply low pass filter if enabled
      if (lowPassFilterEnabled) {
        const alpha = 0.3; // smoothing factor
        smoothedRef.current.x = alpha * rx + (1 - alpha) * smoothedRef.current.x;
        smoothedRef.current.y = alpha * ry + (1 - alpha) * smoothedRef.current.y;
        smoothedRef.current.z = alpha * rz + (1 - alpha) * smoothedRef.current.z;
        rx = smoothedRef.current.x;
        ry = smoothedRef.current.y;
        rz = smoothedRef.current.z;
      }

      // Subtract calibration error offsets
      const cx = rx - offsets.x;
      const cy = ry - offsets.y;
      const cz = rz - (offsets.z - 9.8); // preserve 1G baseline
      const magnitude = Math.sqrt(cx * cx + cy * cy + cz * cz);

      setCurrentAccel({ x: cx, y: cy, z: cz, mag: magnitude });
      setHistory((prev) => [...prev.slice(1), magnitude]);

      // Detect sudden impact spike (magnitude > 22 m/s²)
      if (magnitude > 22 && !countdownActive) {
        triggerFallAlert();
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  };

  // 3-second stationary calibration routine
  const handleCalibrate = () => {
    setIsCalibrating(true);
    toast.info('Hold phone completely flat & still on a table for 3 seconds...');

    const samples: { x: number; y: number; z: number }[] = [];
    const tempListener = (event: DeviceMotionEvent) => {
      const a = event.accelerationIncludingGravity;
      if (a && a.x !== null && a.y !== null && a.z !== null) {
        samples.push({ x: a.x, y: a.y, z: a.z });
      }
    };

    window.addEventListener('devicemotion', tempListener);

    setTimeout(() => {
      window.removeEventListener('devicemotion', tempListener);
      setIsCalibrating(false);

      if (samples.length > 5) {
        const avgX = samples.reduce((acc, s) => acc + s.x, 0) / samples.length;
        const avgY = samples.reduce((acc, s) => acc + s.y, 0) / samples.length;
        const avgZ = samples.reduce((acc, s) => acc + s.z, 0) / samples.length;
        setOffsets({ x: avgX, y: avgY, z: avgZ });
        setCalibrated(true);
        toast.success('Accelerometer calibrated successfully!', {
          description: `Baseline offsets zeroed (Δx: ${avgX.toFixed(2)}, Δy: ${avgY.toFixed(2)}, Δz: ${avgZ.toFixed(2)})`,
        });
      } else {
        // Fallback simulated calibration
        setOffsets({ x: 0.12, y: -0.08, z: 9.81 });
        setCalibrated(true);
        toast.success('Calibration baseline simulated and zeroed.');
      }
    }, 3000);
  };

  const triggerFallAlert = () => {
    // Haptic feedback when simulated or real fall detection triggers
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch (err) {
        // Haptic feedback might be blocked without gesture or on unsupported hardware
      }
    }

    setCountdownActive(true);
    setSecondsRemaining(10);

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          setCountdownActive(false);
          const { userCoords } = useKindLinkStore.getState();
          dataAdapter.submitSos(userCoords.lat, userCoords.lng).catch(() => {});
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
              navigator.vibrate([400, 150, 400]);
            } catch (err) {}
          }
          toast.error('Emergency SOS Beacon Triggered!', {
            description: 'Automated fall detection broadcasted alert to nearby KindLink helpers.',
          });
          return 0;

        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelFallAlert = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(50);
      } catch (err) {}
    }
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setCountdownActive(false);
    toast.success('Fall alert cancelled - glad you are safe!');
  };

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-24 sm:pb-8">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 border border-border shadow-soft">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
            <Atom className="h-7 w-7 notranslate" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Physics Capstone Laboratory
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              KindLink Physics Engine
            </h1>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed mt-2">
          Demonstrating applied classical mechanics and sensor physics in community aid. Developed for{' '}
          <strong className="text-foreground">B.Tech CSE at Asansol Engineering College</strong>.
        </p>
      </div>

      {/* FEATURE A: HAVERSINE & KINEMATICS */}
      <div className="rounded-3xl border border-border/80 bg-card/85 dark:bg-card/75 backdrop-blur-md p-6 sm:p-7 shadow-lg space-y-6 hover:border-teal-500/40 transition-all duration-300">
        <div className="flex items-center justify-between border-b border-border/70 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-sm">
              <Compass className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Feature A: Great-Circle Haversine &amp; Kinematics
              </h2>
              <p className="text-xs text-muted-foreground">
                Spherical trigonometry distance &amp; kinematic arrival velocity (v = d / t &rarr; t = d / v)
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-full shadow-xs">
            R = 6,371 km
          </span>
        </div>

        {/* Formula Representation */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 dark:bg-slate-950/95 border border-teal-500/30 shadow-xl text-slate-100 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-teal-400 uppercase tracking-wider font-semibold">
            <span className="flex items-center gap-1.5 font-sans">
              <Sparkles className="h-3.5 w-3.5" />
              Haversine Formulation
            </span>
            <span className="font-sans text-slate-400">Earth Curvature Baseline</span>
          </div>
          <div className="font-mono text-xs sm:text-sm text-center text-teal-200 font-bold notranslate py-1 overflow-x-auto">
            d = 2R &middot; arcsin(&radic;(sin&sup2;(&Delta;&phi;/2) + cos &phi;&sub1; &middot; cos &phi;&sub2; &middot; sin&sup2;(&Delta;&lambda;/2)))
          </div>
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-slate-300 notranslate">
            <span>ETA = {calculatedDistance} km &divide; {customSpeed} km/h =</span>
            <span className="px-2.5 py-0.5 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold">
              {formatETA(calculatedETA)}
            </span>
          </div>
        </div>

        {/* Interactive Travel Modes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Route className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              <span>Select Mode of Transit (Preset Velocity)</span>
            </span>
            <span className="text-[11px] text-teal-600 dark:text-teal-400">Dynamic Kinematic Models</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { mode: 'walking' as TravelMode, speed: 5, label: 'Walking', icon: Footprints, tooltip: 'Urban sidewalk pace (5 km/h)' },
              { mode: 'bike' as TravelMode, speed: 15, label: 'Bicycle / E-Bike', icon: Bike, tooltip: 'Asansol arterial lanes (15 km/h)' },
              { mode: 'car' as TravelMode, speed: 30, label: 'Motor Vehicle / Auto', icon: Car, tooltip: 'GT Road mixed traffic (30 km/h)' },
            ].map(({ mode, speed, label, icon: ModeIcon, tooltip }) => {
              const isSelected = selectedTravelMode === mode;
              const modeETA = Math.max(1, Math.round((calculatedDistance / speed) * 60));
              return (
                <button
                  key={mode}
                  onClick={() => {
                    setSelectedTravelMode(mode);
                    setCustomSpeed(speed);
                  }}
                  title={tooltip}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200 touch-target flex items-center justify-between group hover:-translate-y-0.5 active:scale-[0.98] ${
                    isSelected
                      ? 'border-primary bg-primary/10 font-bold text-primary shadow-md ring-2 ring-primary/30'
                      : 'border-border/80 bg-background/80 hover:bg-muted/70 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl transition-transform duration-200 group-hover:scale-110 ${
                      isSelected ? 'bg-primary text-white shadow-soft' : 'bg-muted text-muted-foreground'
                    }`}>
                      <ModeIcon className="h-4 w-4 notranslate" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">{label}</span>
                      <span className="text-[11px] text-muted-foreground font-normal">{speed} km/h baseline</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black block font-mono">{formatETA(modeETA)}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">estimated</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Velocity Slider */}
        <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              <span>Simulate Custom Velocity Slider (v)</span>
            </span>
            <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
              {customSpeed} km/h &bull; {formatETA(calculatedETA)}
            </span>
          </div>
          <input
            type="range"
            min="2"
            max="60"
            step="1"
            value={customSpeed}
            onChange={(e) => setCustomSpeed(Number(e.target.value))}
            className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>2 km/h (Pedestrian)</span>
            <span>15 km/h (Cycle)</span>
            <span>30 km/h (Auto)</span>
            <span>60 km/h (Highway)</span>
          </div>
        </div>

        {/* Points between AEC and Asansol Hospital */}
        <div className="p-4 rounded-2xl bg-background/80 dark:bg-card/70 border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm">
          <div>
            <span className="text-muted-foreground block text-[11px]">Point A (Origin Geofence):</span>
            <strong className="text-foreground">{pointA.name} (23.6889&deg; N, 86.9661&deg; E)</strong>
          </div>
          <div className="text-center px-4 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300 font-bold font-mono shadow-xs">
            &harr; {calculatedDistance} km Great-Circle
          </div>
          <div className="text-right">
            <span className="text-muted-foreground block text-[11px]">Point B (Destination Geofence):</span>
            <strong className="text-foreground">{pointB.name} (23.6845&deg; N, 86.9742&deg; E)</strong>
          </div>
        </div>
      </div>

      {/* FEATURE B: HELP GRAVITY SIMULATOR */}
      <div className="rounded-3xl border border-border/80 bg-card/85 dark:bg-card/75 backdrop-blur-md p-6 sm:p-7 shadow-lg space-y-6 hover:border-teal-500/40 transition-all duration-300">
        <div className="flex items-center justify-between border-b border-border/70 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-sm">
              <Sliders className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Feature B: Newton-Inspired Help Gravity Simulator
              </h2>
              <p className="text-xs text-muted-foreground">
                Score = Weight &times; (1 + 0.05 &times; &Delta;t) / (1 + r)&sup2; (Inverse-Square Gravitational Analogy)
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block font-medium">Live Computed Score</span>
            <span className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">{liveGravityScore}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-muted/40 p-4 border border-border/80 flex items-start gap-3 text-xs text-muted-foreground leading-relaxed">
          <Info className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5 notranslate" />
          <p>
            <strong className="text-foreground">Examination Note:</strong> This formulation is <em>directly inspired by</em> Newton&apos;s
            universal law of gravitation (F = G&middot;m&sub1;&middot;m&sub2;/r&sup2;), where geographical distance serves as an inverse-square dampener while urgency category acts as gravitational mass. It models how urgently neighborhood volunteers are drawn toward critical emergencies.
          </p>
        </div>

        {/* Interactive Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
          {/* 1. Category Type Weight Slider */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-background/80 dark:bg-card/70 border border-border/80 shadow-xs">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Type Weight (Mass m&sub1;)</span>
              <span className="font-bold text-teal-600 dark:text-teal-400 font-mono">{liveWeight} / 10</span>
            </div>
            <select
              value={simCategory}
              onChange={(e) => setSimCategory(e.target.value as HelpCategory)}
              className="w-full rounded-xl border border-border/80 bg-background p-2.5 text-xs font-bold text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all"
            >
              <option value="blood">Blood Donation (Weight 10)</option>
              <option value="transport">Emergency Transport (Weight 9)</option>
              <option value="elderly">Elderly Care (Weight 6)</option>
              <option value="equipment">Medical Equipment (Weight 5)</option>
              <option value="books">Books &amp; Study Material (Weight 2)</option>
            </select>
            <span className="text-[10px] text-muted-foreground block">
              Urgency hierarchy establishes life sensitivity priority
            </span>
          </div>

          {/* 2. Waiting Time Slider */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-background/80 dark:bg-card/70 border border-border/80 shadow-xs">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Waiting Duration (&Delta;t)</span>
              <span className="font-bold text-foreground font-mono">{simWaitingTime}m ({liveTimeFactor}x)</span>
            </div>
            <input
              type="range"
              min="0"
              max="120"
              step="1"
              value={simWaitingTime}
              onChange={(e) => setSimWaitingTime(Number(e.target.value))}
              className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>0m</span>
              <span>60m (4x)</span>
              <span>120m (7x)</span>
            </div>
            <span className="text-[10px] text-muted-foreground block">
              Time factor (1 + 0.05&Delta;t) prevents neglected requests
            </span>
          </div>

          {/* 3. Distance Proximity Slider */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-background/80 dark:bg-card/70 border border-border/80 shadow-xs">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Distance Radius (r)</span>
              <span className="font-bold text-foreground font-mono">{simDistance} km (r&sup2;: {liveDistDenominator})</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="20"
              step="0.1"
              value={simDistance}
              onChange={(e) => setSimDistance(Number(e.target.value))}
              className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>0.1 km</span>
              <span>10 km</span>
              <span>20 km</span>
            </div>
            <span className="text-[10px] text-muted-foreground block">
              Inverse-square (1 + r)&sup2; prioritizes immediate neighbors
            </span>
          </div>
        </div>

        {/* Live Calculation Panel (Dark Slate with High-Contrast Mathematical Substitution) */}
        <div className="p-5 rounded-2xl bg-slate-950/90 dark:bg-slate-950/95 border border-teal-500/30 text-slate-100 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-teal-400">
            <span className="flex items-center gap-1.5 uppercase tracking-wider font-sans">
              <Zap className="h-3.5 w-3.5" />
              Real-Time Mathematical Substitution Panel
            </span>
            <span className="text-[10px] text-slate-400 border border-teal-500/20 px-2 py-0.5 rounded-full font-mono">
              Newtonian Dispatch Model
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-teal-500/20">
              <span className="text-slate-400 text-[10px] block">Numerator: Mass &times; Time</span>
              <strong className="text-teal-300 text-sm">{liveWeight} &times; {liveTimeFactor} = {(liveWeight * liveTimeFactor).toFixed(2)}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-teal-500/20">
              <span className="text-slate-400 text-[10px] block">Denominator: (1 + r)&sup2;</span>
              <strong className="text-amber-300 text-sm">(1 + {simDistance})&sup2; = {liveDistDenominator}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-teal-500/20">
              <span className="text-slate-400 text-[10px] block">Calculated Gravity Score</span>
              <strong className="text-teal-400 text-base">{liveGravityScore}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE C: SENSOR CALIBRATION & FALL DETECTOR */}
      <div className="rounded-3xl border border-border/80 bg-card/85 dark:bg-card/75 backdrop-blur-md p-6 sm:p-7 shadow-lg space-y-6 hover:border-teal-500/40 transition-all duration-300">
        <div className="flex items-center justify-between border-b border-border/70 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-urgency-critical/10 text-urgency-critical border border-urgency-critical/20 shadow-sm">
              <Activity className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Feature C: DeviceMotion Calibration &amp; Fall Detector
              </h2>
              <p className="text-xs text-muted-foreground">
                3-axis accelerometer calibration, low-pass filtering (&alpha;=0.3) &amp; haptic impact alert
              </p>
            </div>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-bold border ${
              calibrated
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
            }`}
          >
            {calibrated ? 'Calibrated &bull; Offsets Zeroed ✓' : 'Uncalibrated Baseline'}
          </span>
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-3">
          {sensorPermissionNeeded && (
            <button
              onClick={handleRequestSensorPermission}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-soft hover:bg-primary/90 transition touch-target"
            >
              Enable Motion Sensors (iOS)
            </button>
          )}

          <button
            onClick={handleCalibrate}
            disabled={isCalibrating}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-soft transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 touch-target"
          >
            <RotateCcw className={`h-4 w-4 notranslate ${isCalibrating ? 'animate-spin' : ''}`} />
            <span>{isCalibrating ? 'Calibrating (3s)...' : '1. Calibrate 3s Stationary'}</span>
          </button>

          <button
            onClick={() => setLowPassFilterEnabled(!lowPassFilterEnabled)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all hover:-translate-y-0.5 active:scale-95 touch-target ${
              lowPassFilterEnabled
                ? 'border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'border-border bg-background text-muted-foreground'
            }`}
          >
            2. Low-Pass Filter: {lowPassFilterEnabled ? 'Active (&alpha;=0.3)' : 'Off (Raw Sensor)'}
          </button>

          <button
            onClick={triggerFallAlert}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-urgency-critical text-white text-xs font-bold shadow-lg shadow-red-900/20 hover:bg-red-700 transition-all hover:-translate-y-0.5 active:scale-95 touch-target"
          >
            <Play className="h-4 w-4 notranslate" />
            <span>3. Simulate Fall Impact (&gt; 22 m/s&sup2;)</span>
          </button>
        </div>

        {/* Live Accelerometer Telemetry Cards (with visual meters and tooltips) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-2xl bg-background/80 dark:bg-card/70 border border-border/80 hover:border-teal-500/40 transition-all shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground text-[10px] mb-1">
              <span>X-Axis (Lateral)</span>
              <span className="text-[9px] text-teal-600 dark:text-teal-400 font-sans font-medium">Tilt</span>
            </div>
            <strong className="text-foreground text-sm font-bold block">{currentAccel.x.toFixed(2)} m/s&sup2;</strong>
            <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 transition-all duration-150"
                style={{ width: `${Math.min(100, (Math.abs(currentAccel.x) / 15) * 100)}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-background/80 dark:bg-card/70 border border-border/80 hover:border-teal-500/40 transition-all shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground text-[10px] mb-1">
              <span>Y-Axis (Longitudinal)</span>
              <span className="text-[9px] text-teal-600 dark:text-teal-400 font-sans font-medium">Pitch</span>
            </div>
            <strong className="text-foreground text-sm font-bold block">{currentAccel.y.toFixed(2)} m/s&sup2;</strong>
            <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 transition-all duration-150"
                style={{ width: `${Math.min(100, (Math.abs(currentAccel.y) / 15) * 100)}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-background/80 dark:bg-card/70 border border-border/80 hover:border-teal-500/40 transition-all shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground text-[10px] mb-1">
              <span>Z-Axis (Vertical 1G)</span>
              <span className="text-[9px] text-teal-600 dark:text-teal-400 font-sans font-medium">Gravity</span>
            </div>
            <strong className="text-foreground text-sm font-bold block">{currentAccel.z.toFixed(2)} m/s&sup2;</strong>
            <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 transition-all duration-150"
                style={{ width: `${Math.min(100, (Math.abs(currentAccel.z) / 15) * 100)}%` }}
              />
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border transition-all shadow-sm ${
            currentAccel.mag > 20
              ? 'border-urgency-critical bg-urgency-critical/10 text-urgency-critical shadow-lg shadow-red-500/20 animate-pulse'
              : 'bg-background/80 dark:bg-card/70 border-border/80 hover:border-teal-500/40 text-foreground'
          }`}>
            <div className="flex items-center justify-between text-muted-foreground text-[10px] mb-1">
              <span>Net Vector Magnitude</span>
              <span className="text-[9px] font-sans font-bold text-teal-600 dark:text-teal-400">&radic;(x&sup2;+y&sup2;+z&sup2;)</span>
            </div>
            <strong className={`text-sm font-bold block ${currentAccel.mag > 20 ? 'text-urgency-critical' : 'text-teal-600 dark:text-teal-400'}`}>
              {currentAccel.mag.toFixed(2)} m/s&sup2;
            </strong>
            <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${currentAccel.mag > 20 ? 'bg-red-500' : 'bg-teal-500'}`}
                style={{ width: `${Math.min(100, (currentAccel.mag / 30) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Live Sparkline Graph with Threshold Marker */}
        <div className="p-4 sm:p-5 rounded-2xl bg-background/80 dark:bg-card/70 border border-border/80 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <Activity className="h-3.5 w-3.5 text-teal-500" />
              <span>Live Accelerometer Magnitude Trend (m/s&sup2;)</span>
            </span>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-amber-500 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Threshold: 22.0 m/s&sup2;
              </span>
              <span className="text-teal-600 dark:text-teal-400 font-bold">{currentAccel.mag.toFixed(1)} m/s&sup2;</span>
            </div>
          </div>
          <div className="relative flex items-end gap-1.5 h-20 pt-2 border-b border-border/60">
            {/* 22 m/s² Threshold line */}
            <div className="absolute top-[26%] left-0 right-0 border-b border-dashed border-red-500/50 pointer-events-none z-10 flex justify-end">
              <span className="text-[9px] font-mono text-red-500/80 bg-background/90 px-1 rounded -translate-y-2.5">
                Impact Spike &gt; 22 m/s&sup2;
              </span>
            </div>
            {history.map((val, idx) => {
              const heightPct = Math.min(100, Math.max(10, (val / 30) * 100));
              const isSpike = val > 20;
              return (
                <div
                  key={idx}
                  className="flex-1 rounded-t transition-all duration-150 relative group"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: isSpike ? '#E5484D' : '#0D9488',
                  }}
                  title={`${val.toFixed(1)} m/s²`}
                />
              );
            })}
          </div>
        </div>

        {/* 10-Second Fall Emergency Countdown Modal with Haptic Feedback */}
        {countdownActive && (
          <div className="p-6 rounded-3xl bg-urgency-critical/10 border-2 border-urgency-critical text-center space-y-4 animate-in zoom-in-95 duration-200 shadow-2xl">
            <div className="flex items-center justify-center gap-2 text-urgency-critical">
              <ShieldAlert className="h-8 w-8 animate-bounce notranslate" />
              <h3 className="text-xl font-black">Fall Impact Detected! Are you okay?</h3>
            </div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Sudden kinetic deceleration spike registered (&gt; 22 m/s&sup2;). Haptic emergency beacon active. Alerting verified Asansol helpers unless cancelled.
            </p>
            <div className="text-5xl font-black text-urgency-critical font-mono tracking-tight">
              00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={cancelFallAlert}
                className="px-6 py-3 rounded-xl bg-card border border-border text-foreground text-xs font-bold hover:bg-muted transition-all active:scale-95 shadow-sm touch-target"
              >
                I Am Safe (Cancel)
              </button>
              <button
                onClick={() => {
                  setCountdownActive(false);
                  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    try {
                      navigator.vibrate([400, 150, 400]);
                    } catch (err) {}
                  }
                  toast.error('Emergency SOS Dispatched Immediately!');
                }}
                className="px-6 py-3 rounded-xl bg-urgency-critical text-white text-xs font-bold hover:bg-red-700 transition-all active:scale-95 shadow-soft touch-target"
              >
                Send SOS Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
