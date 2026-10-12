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

export function PhysicsLabView() {
  // -------------------------------------------------------------
  // FEATURE A: KINEMATICS & HAVERSINE DISTANCE
  // -------------------------------------------------------------
  const [pointA, setPointA] = useState({ name: 'Asansol Engineering College', lat: 23.6889, lng: 86.9661 });
  const [pointB, setPointB] = useState({ name: 'Asansol District Hospital', lat: 23.6845, lng: 86.9742 });
  const [selectedTravelMode, setSelectedTravelMode] = useState<TravelMode>('bike');

  const calculatedDistance = calculateHaversineDistance(
    pointA.lat,
    pointA.lng,
    pointB.lat,
    pointB.lng
  );
  const calculatedETA = calculateETA(calculatedDistance, selectedTravelMode);

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
    setCountdownActive(true);
    setSecondsRemaining(10);

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          setCountdownActive(false);
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
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Compass className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Feature A: Great-Circle Haversine & Kinematics
              </h2>
              <p className="text-xs text-muted-foreground">
                Spherical trigonometry distance & arrival time (v = d / t)
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
            R = 6,371 km
          </span>
        </div>

        {/* Formula Representation */}
        <div className="p-4 rounded-2xl bg-muted/50 border border-border">
          <div className="font-mono text-xs sm:text-sm text-center text-foreground font-semibold notranslate">
            d = 2R · arcsin(√(sin²(Δφ/2) + cos φ₁ · cos φ₂ · sin²(Δλ/2)))
          </div>
          <div className="mt-2 text-center font-mono text-xs text-primary notranslate">
            ETA = distance / speed = {calculatedDistance} km ÷{' '}
            {selectedTravelMode === 'walking' ? '5 km/h' : selectedTravelMode === 'bike' ? '15 km/h' : '30 km/h'}
            {' = '}
            <strong>{formatETA(calculatedETA)}</strong>
          </div>
        </div>

        {/* Interactive Travel Modes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(['walking', 'bike', 'car'] as TravelMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedTravelMode(mode)}
              className={`p-3.5 rounded-2xl border text-left transition touch-target flex items-center justify-between ${
                selectedTravelMode === mode
                  ? 'border-primary bg-primary/10 font-bold text-primary shadow-xs'
                  : 'border-border bg-background text-foreground hover:bg-muted'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {mode === 'walking' && <Footprints className="h-4 w-4 notranslate" />}
                {mode === 'bike' && <Bike className="h-4 w-4 notranslate" />}
                {mode === 'car' && <Car className="h-4 w-4 notranslate" />}
                <span className="text-xs capitalize">{mode} ({mode === 'walking' ? '5 km/h' : mode === 'bike' ? '15 km/h' : '30 km/h'})</span>
              </div>
              <span className="text-xs font-black">{formatETA(calculateETA(calculatedDistance, mode))}</span>
            </button>
          ))}
        </div>

        {/* Points between AEC and Asansol Hospital */}
        <div className="p-4 rounded-2xl bg-background border border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Point A (Origin):</span>
            <strong className="text-foreground">{pointA.name} (23.6889° N, 86.9661° E)</strong>
          </div>
          <div className="text-center px-4 py-1.5 rounded-xl bg-primary/10 text-primary font-bold">
            ↔ {calculatedDistance} km
          </div>
          <div className="text-right">
            <span className="text-muted-foreground block text-[11px]">Point B (Destination):</span>
            <strong className="text-foreground">{pointB.name} (23.6845° N, 86.9742° E)</strong>
          </div>
        </div>
      </div>

      {/* FEATURE B: HELP GRAVITY SIMULATOR */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Sliders className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Feature B: Newton-Inspired Help Gravity Simulator
              </h2>
              <p className="text-xs text-muted-foreground">
                Score = Weight × (1 + 0.05 × t) / (1 + r)² (Inspired by inverse-square gravitation)
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block">Simulated Score</span>
            <span className="text-2xl font-black text-primary">{liveGravityScore}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-muted/40 p-4 border border-border flex items-start gap-2.5 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5 notranslate" />
          <p>
            <strong>Note for Examiners:</strong> This formula is <em>inspired by</em> Newton&apos;s
            universal law of gravitation (F = G·m₁·m₂/r²), where distance acts as an inverse-square dampener while urgency acts as mass. It models how urgently community volunteers are pulled toward nearby emergencies.
          </p>
        </div>

        {/* Interactive Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* 1. Category Type Weight Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Type Weight (Mass m₁)</span>
              <span className="font-bold text-primary">{liveWeight} / 10</span>
            </div>
            <select
              value={simCategory}
              onChange={(e) => setSimCategory(e.target.value as HelpCategory)}
              className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-bold text-foreground"
            >
              <option value="blood">Blood Donation (Weight 10)</option>
              <option value="transport">Emergency Transport (Weight 9)</option>
              <option value="elderly">Elderly Care (Weight 6)</option>
              <option value="equipment">Medical Equipment (Weight 5)</option>
              <option value="books">Books & Study Material (Weight 2)</option>
            </select>
          </div>

          {/* 2. Waiting Time Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Waiting Duration (Time Factor)</span>
              <span className="font-bold text-foreground">{simWaitingTime} min ({liveTimeFactor}x)</span>
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
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0m</span>
              <span>60m</span>
              <span>120m</span>
            </div>
          </div>

          {/* 3. Distance Proximity Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Distance (Radius r)</span>
              <span className="font-bold text-foreground">{simDistance} km (r²: {liveDistDenominator})</span>
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
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0.1 km</span>
              <span>10 km</span>
              <span>20 km</span>
            </div>
          </div>
        </div>

        {/* Live Calculation Gauge */}
        <div className="p-4 rounded-2xl bg-background border border-border flex items-center justify-between text-xs font-mono">
          <div>
            Score = ({liveWeight} × {liveTimeFactor}) ÷ {liveDistDenominator}
          </div>
          <div className="text-primary font-black text-base">
            = {liveGravityScore}
          </div>
        </div>
      </div>

      {/* FEATURE C: SENSOR CALIBRATION & FALL DETECTOR */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-urgency-critical/10 text-urgency-critical">
              <Activity className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Feature C: DeviceMotion Calibration & Fall Detector
              </h2>
              <p className="text-xs text-muted-foreground">
                3-axis accelerometer calibration, low-pass filtering & impact trigger
              </p>
            </div>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-bold ${
              calibrated
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-amber-500/10 text-amber-600'
            }`}
          >
            {calibrated ? 'Calibrated ✓' : 'Uncalibrated'}
          </span>
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-3">
          {sensorPermissionNeeded && (
            <button
              onClick={handleRequestSensorPermission}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-soft"
            >
              Enable Motion Sensors (iOS)
            </button>
          )}

          <button
            onClick={handleCalibrate}
            disabled={isCalibrating}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-soft hover:bg-primary/90 transition disabled:opacity-50 touch-target"
          >
            <RotateCcw className={`h-4 w-4 notranslate ${isCalibrating ? 'animate-spin' : ''}`} />
            <span>{isCalibrating ? 'Calibrating (3s)...' : '1. Calibrate 3s Stationary'}</span>
          </button>

          <button
            onClick={() => setLowPassFilterEnabled(!lowPassFilterEnabled)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition touch-target ${
              lowPassFilterEnabled
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground'
            }`}
          >
            2. Low-Pass Filter: {lowPassFilterEnabled ? 'Active (α=0.3)' : 'Off'}
          </button>

          <button
            onClick={triggerFallAlert}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-urgency-critical text-white text-xs font-bold shadow-soft hover:bg-red-700 transition touch-target"
          >
            <Play className="h-4 w-4 notranslate" />
            <span>3. Simulate Fall Impact (Spike)</span>
          </button>
        </div>

        {/* Live Accelerometer Telemetry */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-2xl bg-background border border-border">
            <span className="text-muted-foreground block text-[10px]">X-Axis (Lateral)</span>
            <strong className="text-foreground text-sm">{currentAccel.x.toFixed(2)} m/s²</strong>
          </div>
          <div className="p-3 rounded-2xl bg-background border border-border">
            <span className="text-muted-foreground block text-[10px]">Y-Axis (Longitudinal)</span>
            <strong className="text-foreground text-sm">{currentAccel.y.toFixed(2)} m/s²</strong>
          </div>
          <div className="p-3 rounded-2xl bg-background border border-border">
            <span className="text-muted-foreground block text-[10px]">Z-Axis (Vertical)</span>
            <strong className="text-foreground text-sm">{currentAccel.z.toFixed(2)} m/s²</strong>
          </div>
          <div className="p-3 rounded-2xl bg-background border border-border">
            <span className="text-muted-foreground block text-[10px]">Net Vector Magnitude</span>
            <strong className="text-primary text-sm">{currentAccel.mag.toFixed(2)} m/s²</strong>
          </div>
        </div>

        {/* Live Sparkline Graph */}
        <div className="p-4 rounded-2xl bg-background border border-border space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Live Accelerometer Magnitude Trend (m/s²)</span>
            <span className="font-mono text-primary">{currentAccel.mag.toFixed(1)} m/s²</span>
          </div>
          <div className="flex items-end gap-1.5 h-16 pt-2">
            {history.map((val, idx) => {
              const heightPct = Math.min(100, Math.max(10, (val / 30) * 100));
              const isSpike = val > 20;
              return (
                <div
                  key={idx}
                  className="flex-1 rounded-t transition-all duration-150"
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

        {/* 10-Second Fall Emergency Countdown Modal */}
        {countdownActive && (
          <div className="p-6 rounded-3xl bg-urgency-critical/10 border-2 border-urgency-critical text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center gap-2 text-urgency-critical">
              <ShieldAlert className="h-8 w-8 animate-bounce notranslate" />
              <h3 className="text-xl font-black">Fall Impact Detected! Are you okay?</h3>
            </div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Sudden kinetic deceleration spike registered. Alerting 48 nearby Asansol helpers unless cancelled.
            </p>
            <div className="text-5xl font-black text-urgency-critical font-mono">
              00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={cancelFallAlert}
                className="px-6 py-3 rounded-xl bg-card border border-border text-foreground text-xs font-bold hover:bg-muted transition shadow-sm touch-target"
              >
                I Am Safe (Cancel)
              </button>
              <button
                onClick={() => {
                  setCountdownActive(false);
                  toast.error('Emergency SOS Dispatched Immediately!');
                }}
                className="px-6 py-3 rounded-xl bg-urgency-critical text-white text-xs font-bold hover:bg-red-700 transition shadow-soft touch-target"
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
