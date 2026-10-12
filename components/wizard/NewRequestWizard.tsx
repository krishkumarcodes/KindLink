'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { HelpCategory, UrgencyLevel } from '@/lib/data/types';
import { calculateHelpGravity } from '@/lib/data/physics';

export function NewRequestWizard() {
  const { addRequest, setCurrentView } = useKindLinkStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form State
  const [category, setCategory] = useState<HelpCategory>('blood');
  const [urgency, setUrgency] = useState<UrgencyLevel>('critical');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [unitsNeeded, setUnitsNeeded] = useState(1);
  const [itemType, setItemType] = useState('Wheelchair');
  const [itemDuration, setItemDuration] = useState('3 days');
  const [patientAge, setPatientAge] = useState<number | ''>(45);

  const [locationName, setLocationName] = useState('Asansol District Hospital, SB Gorai Road');
  const [latitude, setLatitude] = useState(23.6845);
  const [longitude, setLongitude] = useState(86.9742);

  const [contactName, setContactName] = useState('Rahul Sen');
  const [contactRole, setContactRole] = useState('Volunteer Requester');
  const [phone, setPhone] = useState('+91 98320 12345');

  // Error validation
  const [errorMsg, setErrorMsg] = useState('');

  // Landmark presets in Asansol area
  const landmarks = [
    { name: 'Asansol District Hospital, SB Gorai Road', lat: 23.6845, lng: 86.9742 },
    { name: 'Asansol Engineering College, Kalyanpur', lat: 23.6889, lng: 86.9661 },
    { name: 'HLG Memorial Hospital, Sen Raleigh Road', lat: 23.7012, lng: 86.9554 },
    { name: 'Burnpur Riverside Road, Burnpur', lat: 23.6642, lng: 86.9388 },
    { name: 'Ushagram Main Crossing, Asansol', lat: 23.6791, lng: 86.9814 },
    { name: 'City Centre, Durgapur', lat: 23.5385, lng: 87.2941 },
    { name: 'SNMMCH Hospital, Dhanbad', lat: 23.8143, lng: 86.4412 },
  ];

  // Live estimated Help Gravity score (using 1.5 km estimated radius)
  const estimatedGravityScore = calculateHelpGravity(category, 5, 1.5);

  const handleNextFromStep1 = () => {
    // Default title based on category if empty
    if (!title) {
      if (category === 'blood') setTitle(`${bloodGroup} Blood Urgently Needed`);
      else if (category === 'equipment') setTitle(`${itemType} Needed`);
      else if (category === 'elderly') setTitle('Elderly Medicine Delivery & Care');
      else if (category === 'transport') setTitle('Emergency Hospital Escort');
      else setTitle('Study Textbooks Needed');
    }
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    if (!title.trim()) {
      setErrorMsg('Please enter a request title');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please enter a short description');
      return;
    }
    setErrorMsg('');
    setStep(3);
  };

  const handleNextFromStep3 = () => {
    if (!locationName.trim()) {
      setErrorMsg('Please specify the location or landmark');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Please provide a contact phone number');
      return;
    }
    setErrorMsg('');
    setStep(4);
  };

  const handleSubmit = () => {
    addRequest({
      title,
      description,
      category,
      urgency,
      waitingMinutes: 1,
      locationName,
      latitude,
      longitude,
      contactName,
      contactRole,
      phone,
      bloodGroup: category === 'blood' ? bloodGroup : undefined,
      unitsNeeded: category === 'blood' ? unitsNeeded : undefined,
      itemType: category === 'equipment' ? itemType : undefined,
      itemDuration: category === 'equipment' ? itemDuration : undefined,
      patientAge: patientAge ? Number(patientAge) : undefined,
      verified: true,
      verificationBadge: 'Phone Verified',
    });

    setIsSuccess(true);
    toast.success('Help Request Posted Successfully!', {
      description: 'Your request is now live and ranked at the top of the community feed.',
    });

    setTimeout(() => {
      setCurrentView('requests');
    }, 2200);
  };

  if (isSuccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-600 mb-4 animate-in zoom-in-75 duration-300">
          <CheckCircle2 className="h-12 w-12 notranslate" />
        </div>
        <h2 className="text-2xl font-black text-foreground">Request Broadcasted!</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
          Nearby helpers in Asansol and Burnpur are being alerted based on Help Gravity priority.
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
          <Atom className="h-4 w-4 notranslate" />
          <span>Help Gravity: {estimatedGravityScore}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full pb-24 sm:pb-8">
      {/* Wizard Header & Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground mb-2">
          <span>STEP {step} OF 4</span>
          <span className="text-primary">
            {step === 1 && '1. Choose Category'}
            {step === 2 && '2. Request Details'}
            {step === 3 && '3. Location & Contact'}
            {step === 4 && '4. Review & Confirm'}
          </span>
        </div>
        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft">
        {/* STEP 1: CATEGORY SELECTION */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                What kind of help is needed?
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Select the category. Urgency ranking is calibrated by task critical weight.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: 'blood' as HelpCategory,
                  title: 'Blood Donation',
                  desc: 'Emergency blood units, platelets, or replacement donors',
                  icon: <Droplets className="h-6 w-6 text-rose-500 notranslate" />,
                  weight: 'Weight 10/10',
                },
                {
                  id: 'transport' as HelpCategory,
                  title: 'Emergency Transport',
                  desc: 'Urgent hospital transit, clinic escort, vehicle help',
                  icon: <Car className="h-6 w-6 text-amber-500 notranslate" />,
                  weight: 'Weight 9/10',
                },
                {
                  id: 'elderly' as HelpCategory,
                  title: 'Elderly Care & Medicine',
                  desc: 'Prescription pickup, senior citizen companion, grocery',
                  icon: <Users className="h-6 w-6 text-blue-500 notranslate" />,
                  weight: 'Weight 6/10',
                },
                {
                  id: 'equipment' as HelpCategory,
                  title: 'Medical Equipment',
                  desc: 'Wheelchair, oxygen concentrator, walker, nebulizer',
                  icon: <Stethoscope className="h-6 w-6 text-teal-500 notranslate" />,
                  weight: 'Weight 5/10',
                },
                {
                  id: 'books' as HelpCategory,
                  title: 'Books & Study Material',
                  desc: 'School textbooks, competitive exam notes, stationery',
                  icon: <BookOpen className="h-6 w-6 text-emerald-500 notranslate" />,
                  weight: 'Weight 2/10',
                },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCategory(item.id);
                    // Critical default for blood and transport
                    if (item.id === 'blood' || item.id === 'transport') {
                      setUrgency('critical');
                    } else if (item.id === 'books') {
                      setUrgency('medium');
                    } else {
                      setUrgency('high');
                    }
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all touch-target flex flex-col justify-between ${
                    category === item.id
                      ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20'
                      : 'border-border bg-background hover:bg-muted/70'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-xl bg-card border border-border">{item.icon}</div>
                    <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-background border border-border">
                      {item.weight}
                    </span>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <button
                onClick={handleNextFromStep1}
                className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-soft hover:bg-primary/90 transition touch-target"
              >
                <span>Continue</span>
                <ChevronRight className="h-4 w-4 notranslate" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DYNAMIC DETAILS */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                Describe the specific requirement
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Provide clear details so local responders can prepare quickly.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-urgency-critical/10 border border-urgency-critical/20 text-urgency-critical text-xs font-semibold">
                {errorMsg}
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
                  placeholder="Explain the patient condition, specific timing, or item specifics..."
                  className="w-full rounded-2xl border border-border bg-background p-4 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary transition"
                />
              </div>

              {/* Category-specific fields */}
              {category === 'blood' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20">
                  <div>
                    <label className="text-xs font-bold text-rose-700 dark:text-rose-300 block mb-1.5">
                      Blood Group Required
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full rounded-xl border border-border bg-card p-2.5 text-xs font-bold text-foreground"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-rose-700 dark:text-rose-300 block mb-1.5">
                      Units Needed
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={unitsNeeded}
                      onChange={(e) => setUnitsNeeded(Number(e.target.value))}
                      className="w-full rounded-xl border border-border bg-card p-2.5 text-xs text-foreground"
                    >
                    </input>
                  </div>
                </div>
              )}

              {category === 'equipment' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-teal-500/5 border border-teal-500/20">
                  <div>
                    <label className="text-xs font-bold text-teal-700 dark:text-teal-300 block mb-1.5">
                      Equipment Type
                    </label>
                    <select
                      value={itemType}
                      onChange={(e) => setItemType(e.target.value)}
                      className="w-full rounded-xl border border-border bg-card p-2.5 text-xs font-bold text-foreground"
                    >
                      <option value="Wheelchair (Foldable)">Wheelchair (Foldable)</option>
                      <option value="Oxygen Concentrator (5L)">Oxygen Concentrator (5L)</option>
                      <option value="Walking Walker">Walking Walker</option>
                      <option value="Nebulizer Machine">Nebulizer Machine</option>
                      <option value="Hospital Bed Mattress">Hospital Bed Mattress</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-teal-700 dark:text-teal-300 block mb-1.5">
                      Estimated Duration
                    </label>
                    <input
                      type="text"
                      value={itemDuration}
                      onChange={(e) => setItemDuration(e.target.value)}
                      placeholder="e.g. 3 days / 1 week"
                      className="w-full rounded-xl border border-border bg-card p-2.5 text-xs text-foreground"
                    />
                  </div>
                </div>
              )}

              {/* Urgency Selector */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Initial Urgency Level
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['critical', 'high', 'medium', 'low'] as UrgencyLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setUrgency(lvl)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold capitalize transition ${
                        urgency === lvl
                          ? 'border-primary bg-primary text-white shadow-xs'
                          : 'border-border bg-background text-foreground hover:bg-muted'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
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
                className="flex items-center gap-1.5 rounded-2xl bg-primary px-6 py-3 text-xs font-bold text-white shadow-soft hover:bg-primary/90 transition"
              >
                <span>Location & Contact</span>
                <ChevronRight className="h-4 w-4 notranslate" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: LOCATION & CONTACT */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                Where is help required?
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Choose a landmark in Asansol or enter the location address.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-urgency-critical/10 border border-urgency-critical/20 text-urgency-critical text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Quick Landmark Buttons */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
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
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition ${
                      locationName === lm.name
                        ? 'border-primary bg-primary text-white font-bold'
                        : 'border-border bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    <MapPin className="h-3 w-3 notranslate" />
                    <span className="truncate max-w-[200px]">{lm.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Exact Address / Hospital Ward *
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Hospital ward, street name, house number..."
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary transition"
              />
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">Contact Name *</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">Phone Number *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98320 XXXXX"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary transition"
                />
              </div>
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
                className="flex items-center gap-1.5 rounded-2xl bg-primary px-6 py-3 text-xs font-bold text-white shadow-soft hover:bg-primary/90 transition"
              >
                <span>Review & Publish</span>
                <ChevronRight className="h-4 w-4 notranslate" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & CONFIRM */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                Review your help request
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Verify details before publishing to verified volunteers in Asansol.
              </p>
            </div>

            {/* Calculated Physics Gravity Score Preview Card */}
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-primary text-white">
                  <Atom className="h-5 w-5 notranslate" />
                </div>
                <div>
                  <span className="text-xs font-extrabold uppercase text-primary tracking-wide">
                    Estimated Help Gravity Rank Score
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    High gravity priority puts this at the top of the feed immediately.
                  </p>
                </div>
              </div>
              <div className="text-2xl font-black text-primary">{estimatedGravityScore}</div>
            </div>

            {/* Summary details */}
            <div className="space-y-3 rounded-2xl bg-muted/40 p-4 border border-border text-xs">
              <div className="flex justify-between border-b border-border/70 pb-2">
                <span className="text-muted-foreground">Category:</span>
                <span className="font-bold text-foreground uppercase">{category}</span>
              </div>
              <div className="flex justify-between border-b border-border/70 pb-2">
                <span className="text-muted-foreground">Title:</span>
                <span className="font-bold text-foreground text-right max-w-xs">{title}</span>
              </div>
              {category === 'blood' && (
                <div className="flex justify-between border-b border-border/70 pb-2">
                  <span className="text-muted-foreground">Blood Group & Units:</span>
                  <span className="font-bold text-rose-600">{bloodGroup} ({unitsNeeded} units)</span>
                </div>
              )}
              {category === 'equipment' && (
                <div className="flex justify-between border-b border-border/70 pb-2">
                  <span className="text-muted-foreground">Equipment:</span>
                  <span className="font-bold text-teal-600">{itemType} ({itemDuration})</span>
                </div>
              )}
              <div className="flex justify-between border-b border-border/70 pb-2">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-bold text-foreground text-right max-w-xs">{locationName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contact:</span>
                <span className="font-bold text-foreground">{contactName} ({phone})</span>
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
                onClick={handleSubmit}
                className="flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-sm font-bold text-white shadow-soft hover:bg-primary/90 transition active:scale-98 touch-target"
              >
                <Sparkles className="h-4 w-4 notranslate" />
                <span>Publish Request Now</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
