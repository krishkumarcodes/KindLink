'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Droplets,
  Stethoscope,
  Users,
  BookOpen,
  Car,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Atom,
  AlertTriangle,
  MapPin,
  Sparkles,
  Clock,
  ShieldCheck,
  LocateFixed,
  Loader2,
  Lock,
  Trash2,
  Info,
  Calendar,
  Navigation,
  Accessibility,
  Luggage,
} from 'lucide-react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { HelpCategory, UrgencyLevel, DraftRequest } from '@/lib/data/types';
import { calculateHelpGravity } from '@/lib/data/physics';
import { dataAdapter } from '@/lib/data';

const DRAFT_STORAGE_KEY = 'kindlink_new_request_draft_v2';

export function NewRequestWizard() {
  const { addRequest, setCurrentView, userProfile, userCoords } = useKindLinkStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraftRestored, setIsDraftRestored] = useState(false);

  // Form State
  const [category, setCategory] = useState<HelpCategory>('blood');
  const [urgency, setUrgency] = useState<UrgencyLevel>('critical');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Blood
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [unitsNeeded, setUnitsNeeded] = useState(1);
  const [hospitalName, setHospitalName] = useState('Asansol District Hospital, SB Gorai Road');
  const [bloodNeededBy, setBloodNeededBy] = useState('Within 2 hours');

  // Equipment
  const [itemType, setItemType] = useState('Wheelchair');
  const [itemDuration, setItemDuration] = useState('3 days');

  // Elderly
  const [elderlyAidType, setElderlyAidType] = useState('Medicine Pickup');
  const [elderlyDuration, setElderlyDuration] = useState('1 hour');
  const [scheduledTime, setScheduledTime] = useState('Today 4:00 PM');

  // Books
  const [booksClassSubject, setBooksClassSubject] = useState('Class 10 CBSE Mathematics');
  const [bookTitle, setBookTitle] = useState('NCERT Mathematics (Standard)');
  const [bookCondition, setBookCondition] = useState('Gently Used');

  // Transport
  const [pickupAddress, setPickupAddress] = useState('Asansol Railway Station (Platform 1 Exit)');
  const [dropAddress, setDropAddress] = useState('Asansol District Hospital, SB Gorai Road');
  const [passengerCount, setPassengerCount] = useState(1);
  const [hasLuggage, setHasLuggage] = useState(false);
  const [wheelchairAccessible, setWheelchairAccessible] = useState(true);

  // General Needed By Time (Step 3)
  const [neededByTime, setNeededByTime] = useState('Immediate (0-2 hours)');

  // Location & Contact (Step 4)
  const [locationName, setLocationName] = useState('Asansol District Hospital, SB Gorai Road');
  const [latitude, setLatitude] = useState(userCoords?.lat || 23.6845);
  const [longitude, setLongitude] = useState(userCoords?.lng || 86.9742);
  const [isLocating, setIsLocating] = useState(false);

  const [contactName, setContactName] = useState(userProfile?.name || '');
  const [contactRole, setContactRole] = useState('Volunteer Requester');
  const [phone, setPhone] = useState(userProfile?.phone || '');

  // Validation
  const [errorMsg, setErrorMsg] = useState('');

  // Review & Submit (Step 5)
  const [nearbyHelpersCount, setNearbyHelpersCount] = useState(14);

  // Landmark presets in Asansol and surrounding coalfield zone
  const landmarks = [
    { name: 'Asansol District Hospital, SB Gorai Road', lat: 23.6845, lng: 86.9742 },
    { name: 'Asansol Engineering College, Kalyanpur', lat: 23.6889, lng: 86.9661 },
    { name: 'HLG Memorial Hospital, Sen Raleigh Road', lat: 23.7012, lng: 86.9554 },
    { name: 'Burnpur Riverside Road, Burnpur', lat: 23.6642, lng: 86.9388 },
    { name: 'Ushagram Main Crossing, Asansol', lat: 23.6791, lng: 86.9814 },
    { name: 'City Centre, Durgapur', lat: 23.5385, lng: 87.2941 },
    { name: 'SNMMCH Hospital, Dhanbad', lat: 23.8143, lng: 86.4412 },
  ];

  // Load draft from localStorage on initial render
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const draft: DraftRequest = JSON.parse(raw);
        if (draft.title || draft.description) {
          setCategory(draft.category || 'blood');
          setUrgency(draft.urgency || 'critical');
          setTitle(draft.title || '');
          setDescription(draft.description || '');
          setBloodGroup(draft.bloodGroup || 'O+');
          setUnitsNeeded(draft.unitsNeeded || 1);
          setHospitalName(draft.hospitalName || 'Asansol District Hospital');
          setBloodNeededBy(draft.neededByTime || 'Within 2 hours');
          setItemType(draft.itemType || 'Wheelchair');
          setItemDuration(draft.itemDuration || '3 days');
          setElderlyAidType(draft.elderlyAidType || 'Medicine Pickup');
          setElderlyDuration(draft.elderlyDuration || '1 hour');
          setScheduledTime(draft.scheduledTime || 'Today 4:00 PM');
          setBooksClassSubject(draft.booksClassSubject || 'Class 10 CBSE Mathematics');
          setBookTitle(draft.bookTitle || 'NCERT Mathematics');
          setBookCondition(draft.bookCondition || 'Gently Used');
          setPickupAddress(draft.pickupAddress || 'Asansol Railway Station');
          setDropAddress(draft.dropAddress || 'Asansol District Hospital');
          setPassengerCount(draft.passengerCount || 1);
          setHasLuggage(Boolean(draft.hasLuggage));
          setWheelchairAccessible(Boolean(draft.wheelchairAccessible));
          setLocationName(draft.locationName || 'Asansol District Hospital');
          if (draft.latitude) setLatitude(draft.latitude);
          if (draft.longitude) setLongitude(draft.longitude);
          if (draft.contactName) setContactName(draft.contactName);
          if (draft.contactRole) setContactRole(draft.contactRole);
          if (draft.phone) setPhone(draft.phone);
          setIsDraftRestored(true);
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }, []);

  // Autosave to localStorage on form changes
  const saveDraft = useCallback(() => {
    try {
      const draft: DraftRequest = {
        category,
        urgency,
        title,
        description,
        bloodGroup,
        unitsNeeded,
        hospitalName,
        neededByTime: category === 'blood' ? bloodNeededBy : neededByTime,
        itemType,
        itemDuration,
        elderlyAidType,
        elderlyDuration,
        scheduledTime,
        booksClassSubject,
        bookTitle,
        bookCondition,
        pickupAddress,
        dropAddress,
        passengerCount,
        hasLuggage,
        wheelchairAccessible,
        locationName,
        latitude,
        longitude,
        contactName,
        contactRole,
        phone,
        savedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Ignore localStorage quotas
    }
  }, [
    category,
    urgency,
    title,
    description,
    bloodGroup,
    unitsNeeded,
    hospitalName,
    bloodNeededBy,
    neededByTime,
    itemType,
    itemDuration,
    elderlyAidType,
    elderlyDuration,
    scheduledTime,
    booksClassSubject,
    bookTitle,
    bookCondition,
    pickupAddress,
    dropAddress,
    passengerCount,
    hasLuggage,
    wheelchairAccessible,
    locationName,
    latitude,
    longitude,
    contactName,
    contactRole,
    phone,
  ]);

  useEffect(() => {
    saveDraft();
  }, [saveDraft]);

  // Fetch nearby verified helpers count for Step 5
  useEffect(() => {
    dataAdapter
      .getNearbyVerifiedHelpersCount(latitude, longitude, 10)
      .then((count) => setNearbyHelpersCount(count))
      .catch(() => setNearbyHelpersCount(14));
  }, [latitude, longitude]);

  const discardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setIsDraftRestored(false);
      setTitle('');
      setDescription('');
      toast.info('Draft discarded');
    } catch {}
  };

  // Live estimated Help Gravity score (using 1.5 km estimated radius)
  const estimatedGravityScore = calculateHelpGravity(category, 5, 1.5);

  // Category switch with smart default urgency
  const handleSelectCategory = (cat: HelpCategory) => {
    setCategory(cat);
    // Smart defaults: blood and transport default to critical
    if (cat === 'blood') {
      setUrgency('critical');
      setNeededByTime('Immediate (0-2 hours)');
    } else if (cat === 'transport') {
      setUrgency('critical');
      setNeededByTime('Immediate (0-2 hours)');
    } else if (cat === 'books') {
      setUrgency('medium');
      setNeededByTime('Within 24 hours');
    } else {
      setUrgency('high');
      setNeededByTime('Within 2-4 hours');
    }
  };

  // Step 1 -> Step 2
  const handleNextFromStep1 = () => {
    if (!title) {
      if (category === 'blood') setTitle(`${bloodGroup} Blood Urgently Needed`);
      else if (category === 'equipment') setTitle(`${itemType} Needed`);
      else if (category === 'elderly') setTitle(`Elderly Care: ${elderlyAidType}`);
      else if (category === 'transport') setTitle('Emergency Hospital Escort');
      else setTitle(`${bookTitle} Textbook Needed`);
    }
    setErrorMsg('');
    setStep(2);
  };

  // Step 2 -> Step 3
  const handleNextFromStep2 = () => {
    if (!title.trim()) {
      setErrorMsg('Please enter a request headline');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please enter a brief description of the requirement');
      return;
    }
    setErrorMsg('');
    setStep(3);
  };

  // Step 3 -> Step 4
  const handleNextFromStep3 = () => {
    setErrorMsg('');
    setStep(4);
  };

  // Step 4 -> Step 5
  const handleNextFromStep4 = () => {
    if (category === 'transport') {
      if (!pickupAddress.trim()) {
        setErrorMsg('Please enter the pickup location for transit');
        return;
      }
      if (!dropAddress.trim()) {
        setErrorMsg('Please enter the destination hospital/clinic');
        return;
      }
    } else {
      if (!locationName.trim()) {
        setErrorMsg('Please specify the location or hospital ward');
        return;
      }
    }
    if (!contactName.trim()) {
      setErrorMsg('Please provide a contact person name');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Please provide a valid phone number');
      return;
    }
    setErrorMsg('');
    setStep(5);
  };

  // Current GPS Geolocation
  const handleUseCurrentGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lng = Number(pos.coords.longitude.toFixed(4));
        setLatitude(lat);
        setLongitude(lng);
        setLocationName(`Current GPS (${lat}, ${lng}) - Near Asansol`);
        if (category === 'transport') {
          setPickupAddress(`Current GPS Location (${lat}, ${lng})`);
        }
        toast.success('Accurate GPS location locked!');
      },
      (err) => {
        setIsLocating(false);
        toast.error('Unable to fetch live GPS. You can select a landmark below.', {
          description: err.message,
        });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Submit to Supabase / Adapter
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await addRequest({
        title,
        description,
        category,
        urgency,
        waitingMinutes: 1,
        locationName: category === 'transport' ? `${pickupAddress} → ${dropAddress}` : locationName,
        latitude,
        longitude,
        contactName,
        contactRole,
        phone,
        bloodGroup: category === 'blood' ? bloodGroup : undefined,
        unitsNeeded: category === 'blood' ? unitsNeeded : undefined,
        hospitalName: category === 'blood' ? hospitalName : undefined,
        neededByTime: category === 'blood' ? bloodNeededBy : neededByTime,
        itemType: category === 'equipment' ? itemType : undefined,
        itemDuration: category === 'equipment' ? itemDuration : undefined,
        elderlyAidType: category === 'elderly' ? elderlyAidType : undefined,
        elderlyDuration: category === 'elderly' ? elderlyDuration : undefined,
        scheduledTime: category === 'elderly' ? scheduledTime : undefined,
        booksClassSubject: category === 'books' ? booksClassSubject : undefined,
        bookTitle: category === 'books' ? bookTitle : undefined,
        bookCondition: category === 'books' ? bookCondition : undefined,
        pickupAddress: category === 'transport' ? pickupAddress : undefined,
        dropAddress: category === 'transport' ? dropAddress : undefined,
        passengerCount: category === 'transport' ? passengerCount : undefined,
        hasLuggage: category === 'transport' ? hasLuggage : undefined,
        wheelchairAccessible: category === 'transport' ? wheelchairAccessible : undefined,
        verified: true,
        verificationBadge: 'Requester Verified',
      });

      // Clear draft on success
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}

      setIsSuccess(true);
      toast.success('Help Request Broadcasted Successfully!', {
        description: 'Nearby volunteers in Asansol and Burnpur are being alerted by Help Gravity.',
      });

      setTimeout(() => {
        setCurrentView('requests');
      }, 2400);
    } catch (err: any) {
      toast.error('Could not broadcast request', {
        description: err.message || 'Please check network connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto min-h-[60vh]">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-emerald-500/15 text-emerald-600 mb-5 animate-in zoom-in-75 duration-300 ring-8 ring-emerald-500/10">
          <CheckCircle2 className="h-14 w-14 notranslate" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
          Request Broadcasted!
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
          Your request is now live in the community feed. Verified volunteers within 10 km are being notified.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/10 text-primary text-xs font-bold border border-primary/20">
          <Atom className="h-4 w-4 notranslate animate-spin" />
          <span>Help Gravity Urgency Score: {estimatedGravityScore}</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-4">
          Redirecting to Live Requests feed...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full pb-24 sm:pb-12">
      {/* Draft Restored Banner */}
      {isDraftRestored && (
        <div className="mb-4 flex items-center justify-between p-3 rounded-2xl bg-primary/10 border border-primary/20 text-xs">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Sparkles className="h-4 w-4 shrink-0 notranslate" />
            <span>Unsaved draft restored from your last session.</span>
          </div>
          <button
            onClick={discardDraft}
            className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-rose-500 transition px-2 py-1 rounded-lg"
          >
            <Trash2 className="h-3 w-3 notranslate" />
            <span>Discard</span>
          </button>
        </div>
      )}

      {/* 5-Step Progress Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground mb-2">
          <span className="uppercase tracking-wider">Step {step} of 5</span>
          <span className="text-primary font-extrabold">
            {step === 1 && '1. Choose Category'}
            {step === 2 && '2. Specific Details'}
            {step === 3 && '3. Urgency & Timing'}
            {step === 4 && '4. Location & Contact'}
            {step === 5 && '5. Review & Publish'}
          </span>
        </div>
        <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300 rounded-full"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Step dots */}
        <div className="grid grid-cols-5 gap-1.5 mt-2 text-[10px] text-center font-bold text-muted-foreground">
          <span className={step >= 1 ? 'text-primary' : ''}>Category</span>
          <span className={step >= 2 ? 'text-primary' : ''}>Details</span>
          <span className={step >= 3 ? 'text-primary' : ''}>Urgency</span>
          <span className={step >= 4 ? 'text-primary' : ''}>Location</span>
          <span className={step >= 5 ? 'text-primary' : ''}>Review</span>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 sm:p-8 shadow-soft">
        {/* =========================================================================
            STEP 1: CATEGORY SELECTION
           ========================================================================= */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                What kind of help is needed?
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Select a category. The Newtonian Help Gravity algorithm prioritizes requests based on task criticality and distance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                {
                  id: 'blood' as HelpCategory,
                  title: 'Blood Donation',
                  desc: 'Emergency blood units, platelets, or replacement donors',
                  icon: <Droplets className="h-6 w-6 text-rose-500 notranslate" />,
                  weight: 'Weight 10/10 · Critical',
                  tagBg: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
                },
                {
                  id: 'transport' as HelpCategory,
                  title: 'Emergency Transit',
                  desc: 'Urgent hospital transit, clinic escort, wheelchair accessible transit',
                  icon: <Car className="h-6 w-6 text-amber-500 notranslate" />,
                  weight: 'Weight 9/10 · High Priority',
                  tagBg: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                },
                {
                  id: 'elderly' as HelpCategory,
                  title: 'Elderly Care',
                  desc: 'Prescription pickup, senior citizen companion, grocery delivery',
                  icon: <Users className="h-6 w-6 text-blue-500 notranslate" />,
                  weight: 'Weight 6/10 · Medium',
                  tagBg: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                },
                {
                  id: 'equipment' as HelpCategory,
                  title: 'Medical Equipment',
                  desc: 'Wheelchairs, oxygen concentrators, walkers, nebulizers, crutches',
                  icon: <Stethoscope className="h-6 w-6 text-teal-500 notranslate" />,
                  weight: 'Weight 5/10 · Essential',
                  tagBg: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
                },
                {
                  id: 'books' as HelpCategory,
                  title: 'Books & Study',
                  desc: 'School textbooks, competitive exam notes, reference guides',
                  icon: <BookOpen className="h-6 w-6 text-emerald-500 notranslate" />,
                  weight: 'Weight 2/10 · Community',
                  tagBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectCategory(item.id)}
                  className={`p-4 rounded-2xl border text-left transition-all touch-target flex flex-col justify-between ${
                    category === item.id
                      ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20'
                      : 'border-border bg-background hover:bg-muted/70'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-2xl bg-card border border-border shadow-xs">
                      {item.icon}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.tagBg}`}
                    >
                      {item.weight}
                    </span>
                  </div>
                  <div className="mt-3.5">
                    <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <button
                onClick={handleNextFromStep1}
                className="flex items-center gap-2 rounded-2xl bg-primary px-7 py-3.5 text-sm font-bold text-white shadow-soft hover:bg-primary/90 transition touch-target"
              >
                <span>Continue to Details</span>
                <ChevronRight className="h-4 w-4 notranslate" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 2: DYNAMIC CATEGORY-SPECIFIC FIELDS
           ========================================================================= */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
                <Sparkles className="h-3.5 w-3.5 notranslate" />
                <span className="capitalize">{category} Specific Information</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Describe the specific requirement
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Provide accurate specifics so local responders in Asansol can confirm availability immediately.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-urgency-critical/10 border border-urgency-critical/20 text-urgency-critical text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 notranslate" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Request Headline *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. O+ Blood Needed at Asansol District Hospital"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Detailed Description *
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain patient status, timing specifics, or specific instructions for volunteers..."
                  className="w-full rounded-2xl border border-border bg-background p-4 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary transition"
                />
              </div>

              {/* 1. BLOOD SPECIFIC FIELDS */}
              {category === 'blood' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-4">
                  <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wide">
                    <Droplets className="h-4 w-4 notranslate" />
                    <span>Blood Requirement Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">
                        Blood Group Required *
                      </label>
                      <select
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        className="w-full rounded-xl border border-border bg-card p-3 text-xs font-bold text-foreground"
                      >
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                          <option key={bg} value={bg}>
                            {bg}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">
                        Units Needed *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="6"
                        value={unitsNeeded}
                        onChange={(e) => setUnitsNeeded(Math.max(1, Number(e.target.value)))}
                        className="w-full rounded-xl border border-border bg-card p-3 text-xs font-bold text-foreground"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">
                        Hospital Name *
                      </label>
                      <input
                        type="text"
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        placeholder="e.g. Asansol District Hospital / HLG Memorial"
                        className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">
                        Needed By Datetime *
                      </label>
                      <input
                        type="text"
                        value={bloodNeededBy}
                        onChange={(e) => setBloodNeededBy(e.target.value)}
                        placeholder="e.g. Within 2 hours / Today by 6 PM"
                        className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. EQUIPMENT SPECIFIC FIELDS */}
              {category === 'equipment' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-teal-500/5 border border-teal-500/20 space-y-4">
                  <div className="flex items-center gap-2 text-teal-600 font-bold text-xs uppercase tracking-wide">
                    <Stethoscope className="h-4 w-4 notranslate" />
                    <span>Medical Equipment Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">
                        Equipment Name / Type *
                      </label>
                      <select
                        value={itemType}
                        onChange={(e) => setItemType(e.target.value)}
                        className="w-full rounded-xl border border-border bg-card p-3 text-xs font-bold text-foreground"
                      >
                        <option value="Wheelchair (Foldable)">Wheelchair (Foldable)</option>
                        <option value="Walking Walker">Walking Walker</option>
                        <option value="Oxygen Concentrator (5L)">Oxygen Concentrator (5L)</option>
                        <option value="Nebulizer Machine">Nebulizer Machine</option>
                        <option value="Crutches (Pair)">Crutches (Pair)</option>
                        <option value="Hospital Bed & Mattress">Hospital Bed & Mattress</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">
                        Duration Needed *
                      </label>
                      <input
                        type="text"
                        value={itemDuration}
                        onChange={(e) => setItemDuration(e.target.value)}
                        placeholder="e.g. 3 days / 1 week / 2 weeks"
                        className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. ELDERLY CARE SPECIFIC FIELDS */}
              {category === 'elderly' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-4">
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wide">
                    <Users className="h-4 w-4 notranslate" />
                    <span>Elderly Assistance Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">
                        Type of Aid *
                      </label>
                      <select
                        value={elderlyAidType}
                        onChange={(e) => setElderlyAidType(e.target.value)}
                        className="w-full rounded-xl border border-border bg-card p-3 text-xs font-bold text-foreground"
                      >
                        <option value="Medicine Pickup">Medicine Pickup</option>
                        <option value="Grocery Delivery">Grocery Delivery</option>
                        <option value="Tech Help / Smartphone">Tech Help / Smartphone</option>
                        <option value="Companionship & Walk">Companionship & Walk</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">
                        Duration *
                      </label>
                      <input
                        type="text"
                        value={elderlyDuration}
                        onChange={(e) => setElderlyDuration(e.target.value)}
                        placeholder="e.g. 1 hour / 2 hours"
                        className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">
                        Scheduled Time *
                      </label>
                      <input
                        type="text"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        placeholder="e.g. Today 4:00 PM"
                        className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. BOOKS SPECIFIC FIELDS */}
              {category === 'books' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wide">
                    <BookOpen className="h-4 w-4 notranslate" />
                    <span>Study Material Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">
                        Class / Subject *
                      </label>
                      <input
                        type="text"
                        value={booksClassSubject}
                        onChange={(e) => setBooksClassSubject(e.target.value)}
                        placeholder="e.g. Class 10 CBSE Maths"
                        className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">
                        Textbook Title *
                      </label>
                      <input
                        type="text"
                        value={bookTitle}
                        onChange={(e) => setBookTitle(e.target.value)}
                        placeholder="e.g. NCERT Mathematics"
                        className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">
                        Condition *
                      </label>
                      <select
                        value={bookCondition}
                        onChange={(e) => setBookCondition(e.target.value)}
                        className="w-full rounded-xl border border-border bg-card p-3 text-xs font-bold text-foreground"
                      >
                        <option value="New">New</option>
                        <option value="Like New">Like New</option>
                        <option value="Gently Used">Gently Used</option>
                        <option value="Readable">Readable</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. TRANSPORT SPECIFIC FIELDS */}
              {category === 'transport' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-4">
                  <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wide">
                    <Car className="h-4 w-4 notranslate" />
                    <span>Emergency Transit Specifications</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">
                        Pickup Address *
                      </label>
                      <input
                        type="text"
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                        placeholder="e.g. Asansol Railway Station (Platform 1 Exit)"
                        className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">
                        Drop / Destination Address *
                      </label>
                      <input
                        type="text"
                        value={dropAddress}
                        onChange={(e) => setDropAddress(e.target.value)}
                        placeholder="e.g. Asansol District Hospital, SB Gorai Road"
                        className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">
                        Passengers
                      </label>
                      <select
                        value={passengerCount}
                        onChange={(e) => setPassengerCount(Number(e.target.value))}
                        className="w-full rounded-xl border border-border bg-card p-3 text-xs font-bold text-foreground"
                      >
                        <option value={1}>1 Passenger</option>
                        <option value={2}>2 Passengers</option>
                        <option value={3}>3 Passengers</option>
                        <option value={4}>4+ Passengers</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <Luggage className="h-4 w-4 text-muted-foreground notranslate" />
                        <span>Luggage</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={hasLuggage}
                        onChange={(e) => setHasLuggage(e.target.checked)}
                        className="h-4 w-4 rounded text-primary focus:ring-primary"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <Accessibility className="h-4 w-4 text-muted-foreground notranslate" />
                        <span>Wheelchair Accessible</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={wheelchairAccessible}
                        onChange={(e) => setWheelchairAccessible(e.target.checked)}
                        className="h-4 w-4 rounded text-primary focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 rounded-2xl border border-border px-5 py-3 text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                <ChevronLeft className="h-4 w-4 notranslate" />
                <span>Back</span>
              </button>
              <button
                onClick={handleNextFromStep2}
                className="flex items-center gap-1.5 rounded-2xl bg-primary px-6 py-3.5 text-xs font-bold text-white shadow-soft hover:bg-primary/90 transition"
              >
                <span>Urgency & Timing</span>
                <ChevronRight className="h-4 w-4 notranslate" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 3: URGENCY SELECTION & SMART DEFAULTS
           ========================================================================= */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Select urgency & response window
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Help Gravity prioritizes immediate critical aid at the top of responders&apos; map feeds.
              </p>
            </div>

            {/* Smart Default explanation tag */}
            {(category === 'blood' || category === 'transport') && (
              <div className="p-3.5 rounded-2xl bg-urgency-critical/10 border border-urgency-critical/20 text-xs text-urgency-critical font-medium flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 notranslate" />
                <span>
                  <strong>Smart Default Applied:</strong> Blood and emergency transport requests are automatically assigned <strong>Critical</strong> priority.
                </span>
              </div>
            )}

            {/* Urgency Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                {
                  id: 'critical' as UrgencyLevel,
                  label: 'Critical Priority',
                  window: '0 – 2 Hours',
                  desc: 'Immediate life risk, acute medical distress, blood shortage, or emergency transit',
                  badgeBg: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
                },
                {
                  id: 'high' as UrgencyLevel,
                  label: 'High Priority',
                  window: '2 – 6 Hours',
                  desc: 'Urgent medical aid, required medicine delivery, same-day support needed',
                  badgeBg: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
                },
                {
                  id: 'medium' as UrgencyLevel,
                  label: 'Medium Priority',
                  window: 'Within 24 Hours',
                  desc: 'Essential community aid needed today, medical equipment loan or elder visit',
                  badgeBg: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
                },
                {
                  id: 'low' as UrgencyLevel,
                  label: 'Low Priority',
                  window: '2 – 3 Days',
                  desc: 'Flexible timeline, textbook donation, educational notes, or routine aid',
                  badgeBg: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
                },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setUrgency(lvl.id)}
                  className={`p-4 rounded-2xl border text-left transition-all touch-target flex flex-col justify-between ${
                    urgency === lvl.id
                      ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20'
                      : 'border-border bg-background hover:bg-muted/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">{lvl.label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${lvl.badgeBg}`}>
                      {lvl.window}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {lvl.desc}
                  </p>
                </button>
              ))}
            </div>

            {/* Needed by time */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
              <label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary notranslate" />
                <span>When is this needed by? *</span>
              </label>

              <div className="flex flex-wrap gap-2">
                {[
                  'Immediate (0-2 hours)',
                  'Within 4 hours',
                  'Today by Evening',
                  'Tomorrow Morning',
                  'This Weekend',
                ].map((timeOption) => (
                  <button
                    key={timeOption}
                    type="button"
                    onClick={() => setNeededByTime(timeOption)}
                    className={`px-3 py-1.5 rounded-xl border text-xs transition ${
                      neededByTime === timeOption
                        ? 'border-primary bg-primary text-white font-bold'
                        : 'border-border bg-card text-foreground hover:bg-muted'
                    }`}
                  >
                    {timeOption}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={neededByTime}
                onChange={(e) => setNeededByTime(e.target.value)}
                placeholder="Or specify custom time (e.g. Today 5:30 PM sharp)"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 rounded-2xl border border-border px-5 py-3 text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                <ChevronLeft className="h-4 w-4 notranslate" />
                <span>Back</span>
              </button>
              <button
                onClick={handleNextFromStep3}
                className="flex items-center gap-1.5 rounded-2xl bg-primary px-6 py-3.5 text-xs font-bold text-white shadow-soft hover:bg-primary/90 transition"
              >
                <span>Location & Contact</span>
                <ChevronRight className="h-4 w-4 notranslate" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 4: LOCATION & CONTACT INFORMATION
           ========================================================================= */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Where is help required?
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Provide GPS coordinates or select a landmark in Asansol to calculate proximity ETA.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-urgency-critical/10 border border-urgency-critical/20 text-urgency-critical text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 notranslate" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* GPS Lock Button */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <button
                type="button"
                onClick={handleUseCurrentGPS}
                disabled={isLocating}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary/90 transition shadow-xs touch-target disabled:opacity-50"
              >
                {isLocating ? (
                  <Loader2 className="h-4 w-4 animate-spin notranslate" />
                ) : (
                  <LocateFixed className="h-4 w-4 notranslate" />
                )}
                <span>{isLocating ? 'Locking GPS...' : 'Use Current Live GPS'}</span>
              </button>
              <span className="text-xs text-muted-foreground">
                Lat: {latitude.toFixed(4)}, Lng: {longitude.toFixed(4)}
              </span>
            </div>

            {/* Transport has both pickup and destination */}
            {category === 'transport' ? (
              <div className="space-y-3.5 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <Navigation className="h-4 w-4 notranslate" />
                  <span>Transit Route (Pickup to Destination)</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Pickup Location Address *
                  </label>
                  <input
                    type="text"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="e.g. Asansol Railway Station (Platform 1 Exit)"
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Drop / Hospital Destination *
                  </label>
                  <input
                    type="text"
                    value={dropAddress}
                    onChange={(e) => setDropAddress(e.target.value)}
                    placeholder="e.g. Asansol District Hospital, SB Gorai Road"
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Exact Address / Hospital Ward *
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Hospital ward, bed number, street name, landmark..."
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary transition"
                />
              </div>
            )}

            {/* Landmark Quick Selection */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-2">
                Quick Landmark Selection (Asansol & Nearby)
              </label>
              <div className="flex flex-wrap gap-2">
                {landmarks.map((lm) => (
                  <button
                    key={lm.name}
                    type="button"
                    onClick={() => {
                      setLocationName(lm.name);
                      setLatitude(lm.lat);
                      setLongitude(lm.lng);
                      if (category === 'transport') {
                        setDropAddress(lm.name);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition ${
                      locationName === lm.name
                        ? 'border-primary bg-primary text-white font-bold'
                        : 'border-border bg-card hover:bg-muted text-foreground'
                    }`}
                  >
                    <MapPin className="h-3 w-3 notranslate" />
                    <span className="truncate max-w-[200px]">{lm.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Contact Person Details */}
            <div className="pt-2 border-t border-border space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Requester Contact Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Contact Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98320 XXXXX"
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-1.5 rounded-2xl border border-border px-5 py-3 text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                <ChevronLeft className="h-4 w-4 notranslate" />
                <span>Back</span>
              </button>
              <button
                onClick={handleNextFromStep4}
                className="flex items-center gap-1.5 rounded-2xl bg-primary px-6 py-3.5 text-xs font-bold text-white shadow-soft hover:bg-primary/90 transition"
              >
                <span>Review & Submit</span>
                <ChevronRight className="h-4 w-4 notranslate" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 5: REVIEW, HELP GRAVITY ESTIMATE & SUBMIT
           ========================================================================= */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Review your help request
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Verify specifications before publishing to nearby verified volunteers.
              </p>
            </div>

            {/* Help Gravity Score Preview Banner */}
            <div className="p-4 sm:p-5 rounded-3xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-primary text-white shadow-soft">
                  <Atom className="h-6 w-6 notranslate animate-pulse" />
                </div>
                <div>
                  <span className="text-xs font-extrabold uppercase text-primary tracking-wide block">
                    Help Gravity Rank Estimate
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    Rank Score: {estimatedGravityScore}
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Calibrated by Newtonian formula: Weight × Waiting Acceleration ÷ Distance²
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center px-3.5 py-1.5 rounded-2xl bg-background border border-border text-xs font-bold text-foreground">
                <Users className="h-4 w-4 text-emerald-500 notranslate" />
                <span>{nearbyHelpersCount} Verified Helpers Nearby</span>
              </div>
            </div>

            {/* Live Request Preview Card */}
            <div className="p-5 rounded-3xl bg-muted/40 border border-border space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      urgency === 'critical'
                        ? 'bg-rose-500/15 text-rose-600 border border-rose-500/20'
                        : urgency === 'high'
                        ? 'bg-amber-500/15 text-amber-600 border border-amber-500/20'
                        : 'bg-blue-500/15 text-blue-600 border border-blue-500/20'
                    }`}
                  >
                    <AlertTriangle className="h-3 w-3 notranslate" />
                    {urgency} Priority
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-foreground mt-1.5">
                    {title}
                  </h3>
                </div>
                <div className="p-2.5 rounded-2xl bg-card border border-border text-primary font-bold text-xs uppercase">
                  {category}
                </div>
              </div>

              <p className="text-xs text-foreground/80 leading-relaxed bg-card p-3 rounded-2xl border border-border">
                {description}
              </p>

              {/* Dynamic specs chips */}
              <div className="flex flex-wrap gap-2 text-xs">
                {category === 'blood' && (
                  <span className="px-3 py-1 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold border border-rose-500/20">
                    🩸 {bloodGroup} · {unitsNeeded} Unit(s) needed
                  </span>
                )}
                {category === 'equipment' && (
                  <span className="px-3 py-1 rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-300 font-bold border border-teal-500/20">
                    🩺 {itemType} ({itemDuration})
                  </span>
                )}
                {category === 'elderly' && (
                  <span className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/20">
                    👵 {elderlyAidType} ({elderlyDuration})
                  </span>
                )}
                {category === 'books' && (
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">
                    📚 {bookTitle} · {bookCondition}
                  </span>
                )}
                {category === 'transport' && (
                  <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/20">
                    🚗 {passengerCount} Pax · {wheelchairAccessible ? 'Wheelchair Ready' : 'Standard'}
                  </span>
                )}

                <span className="px-3 py-1 rounded-xl bg-card text-foreground font-semibold border border-border">
                  ⏰ Needed: {category === 'blood' ? bloodNeededBy : neededByTime}
                </span>
              </div>

              {/* Location & Requester Summary */}
              <div className="pt-2 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="h-4 w-4 text-primary shrink-0 notranslate" />
                  <span className="truncate">
                    {category === 'transport' ? `${pickupAddress} → ${dropAddress}` : locationName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 notranslate" />
                  <span>Requester: {contactName}</span>
                </div>
              </div>
            </div>

            {/* Privacy Notice Card */}
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
              <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 notranslate" />
              <div>
                <strong className="font-bold block">Privacy & Phone Masking Notice</strong>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  Your phone number ({phone}) is securely masked. It will <strong>only</strong> be revealed to a verified volunteer once you review and accept their offer of help.
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <button
                onClick={() => setStep(4)}
                className="flex items-center gap-1.5 rounded-2xl border border-border px-5 py-3 text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                <ChevronLeft className="h-4 w-4 notranslate" />
                <span>Back</span>
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-sm font-bold text-white shadow-soft hover:bg-primary/90 transition active:scale-98 touch-target disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin notranslate" />
                ) : (
                  <Sparkles className="h-4 w-4 notranslate" />
                )}
                <span>{isSubmitting ? 'Broadcasting...' : 'Broadcast Request Now'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
