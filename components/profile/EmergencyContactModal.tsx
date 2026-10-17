'use client';

import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, AlertCircle, Info, Loader2, User, HeartHandshake } from 'lucide-react';
import { toast } from 'sonner';
import { EmergencyContact } from '@/lib/data/types';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { PhoneInput } from './PhoneInput';

export interface EmergencyContactModalProps {
  open: boolean;
  contact?: EmergencyContact | null;
  onClose: () => void;
  onSave?: (data: { name: string; phone: string; relationship: string }) => void;
}

const PRESET_RELATIONSHIPS = [
  'Parent',
  'Spouse',
  'Sibling',
  'Child',
  'Close friend',
  'Local neighbour',
  'Colleague',
  'Peer',
  'Custom',
] as const;

export function EmergencyContactModal({
  open,
  contact,
  onClose,
  onSave,
}: EmergencyContactModalProps) {
  const { addEmergencyContact, updateEmergencyContact } = useKindLinkStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [selectedRelation, setSelectedRelation] = useState<string>('Parent');
  const [customRelation, setCustomRelation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state whenever modal opens or contact changes
  useEffect(() => {
    if (open) {
      if (contact) {
        setName(contact.name || '');
        setPhone(contact.phone || '');
        const isPreset = PRESET_RELATIONSHIPS.includes(
          contact.relationship as (typeof PRESET_RELATIONSHIPS)[number]
        );
        if (isPreset && contact.relationship !== 'Custom') {
          setSelectedRelation(contact.relationship);
          setCustomRelation('');
        } else {
          setSelectedRelation('Custom');
          setCustomRelation(contact.relationship || '');
        }
      } else {
        setName('');
        setPhone('');
        setIsPhoneValid(false);
        setSelectedRelation('Parent');
        setCustomRelation('');
      }
    }
  }, [open, contact]);

  // Preserve window.scrollY across modal open and close
  useEffect(() => {
    if (!open) return;
    const savedScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    return () => {
      if (typeof window !== 'undefined' && window.scrollY !== savedScrollY) {
        window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior });
      }
    };
  }, [open]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      toast.error('Please enter the full name (at least 2 characters)');
      return;
    }

    if (!phone.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    if (!isPhoneValid) {
      toast.error('Please enter a valid complete phone number');
      return;
    }

    let finalRelationship = selectedRelation;
    if (selectedRelation === 'Custom') {
      const trimmedCustom = customRelation.trim();
      if (!trimmedCustom) {
        toast.error('Please specify the custom relationship (e.g. Doctor, Guardian)');
        return;
      }
      finalRelationship = trimmedCustom;
    }

    setIsSubmitting(true);

    const contactPayload = {
      name: trimmedName,
      phone: phone.trim(),
      relationship: finalRelationship,
    };

    if (onSave) {
      onSave(contactPayload);
    } else {
      if (contact?.id) {
        updateEmergencyContact({
          id: contact.id,
          ...contactPayload,
        });
        toast.success('Emergency contact updated successfully');
      } else {
        addEmergencyContact(contactPayload);
        toast.success('Emergency contact added successfully');
      }
    }

    setIsSubmitting(false);
    onClose();
  };

  const isFormValid =
    name.trim().length >= 2 &&
    phone.trim().length > 0 &&
    isPhoneValid &&
    (selectedRelation !== 'Custom' || customRelation.trim().length > 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-contact-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-card border border-border p-5 sm:p-6 shadow-2xl text-left flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 id="emergency-contact-modal-title" className="text-base font-bold text-foreground">
                {contact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Direct contacts for urgent emergency alerts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition touch-target"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 notranslate" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto space-y-4 py-4 flex-1">
          {/* Honest notice banner */}
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-3.5 w-3.5 notranslate shrink-0" />
              <span>Emergency Alert Information</span>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-800/90 dark:text-rose-300/90">
              When you start an SOS you can send your live location to these contacts in one tap on
              WhatsApp or SMS.
            </p>
          </div>

          {/* Contact Full Name */}
          <div>
            <label
              htmlFor="emergency-contact-name"
              className="block text-xs font-bold text-foreground mb-1"
            >
              Contact Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                id="emergency-contact-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Sharma, Dr. Sunita Roy"
                maxLength={60}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Real name of your parent, relative, doctor, or trusted responder.
            </p>
          </div>

          {/* Relationship Selector */}
          <div>
            <label
              htmlFor="emergency-contact-relationship"
              className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5"
            >
              <HeartHandshake className="h-3.5 w-3.5 text-primary notranslate" />
              <span>Relationship</span> <span className="text-rose-500">*</span>
            </label>
            <select
              id="emergency-contact-relationship"
              value={selectedRelation}
              onChange={(e) => setSelectedRelation(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
            >
              <option value="Parent">Parent</option>
              <option value="Spouse">Spouse</option>
              <option value="Sibling">Sibling</option>
              <option value="Child">Child</option>
              <option value="Close friend">Close friend</option>
              <option value="Local neighbour">Local neighbour</option>
              <option value="Colleague">Colleague</option>
              <option value="Peer">Peer</option>
              <option value="Custom">Custom (specify below)...</option>
            </select>
          </div>

          {/* Custom relationship input when 'Custom' is selected */}
          {selectedRelation === 'Custom' && (
            <div className="animate-fade-in pl-1">
              <label
                htmlFor="emergency-custom-relationship"
                className="block text-xs font-bold text-foreground mb-1"
              >
                Specify Relationship <span className="text-rose-500">*</span>
              </label>
              <input
                id="emergency-custom-relationship"
                type="text"
                required
                value={customRelation}
                onChange={(e) => setCustomRelation(e.target.value)}
                placeholder="e.g. Doctor, Guardian, Caregiver, Landlord"
                maxLength={40}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
              />
            </div>
          )}

          {/* Phone Number with International PhoneInput */}
          <div>
            <PhoneInput
              id="emergency-contact-phone"
              label="Contact Phone Number"
              required
              value={phone}
              onChange={(val, valid) => {
                setPhone(val);
                setIsPhoneValid(valid);
              }}
              helperText="International format with country picker. Used for 1-tap WhatsApp and SMS location alerts."
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-border flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted transition touch-target disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-soft transition touch-target disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin notranslate" />}
            <span>{isSubmitting ? 'Saving...' : 'Save Contact'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmergencyContactModal;
