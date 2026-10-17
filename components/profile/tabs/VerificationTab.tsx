'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Trash2,
  RefreshCw,
  Phone,
  Mail,
  User,
  GraduationCap,
  Building2,
  Stethoscope,
  Briefcase,
  X,
  ExternalLink,
  Info,
  HelpCircle,
  ArrowRight,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { PhoneInput, isValidIndianPhone } from '@/components/profile/PhoneInput';
import {
  VerificationState,
  ProfessionalProofType,
  ProfessionalProofItem,
} from '@/lib/data/types';

const PROFESSION_TYPES: { id: ProfessionalProofType; label: string; icon: any; placeholder: string }[] = [
  { id: 'Doctor', label: 'Doctor / Physician', icon: Stethoscope, placeholder: 'e.g. WBMC Reg. No. 12345' },
  { id: 'Nurse', label: 'Registered Nurse', icon: Briefcase, placeholder: 'e.g. Nursing Council Reg. No.' },
  { id: 'Pharmacist', label: 'Pharmacist', icon: Building2, placeholder: 'e.g. Pharmacy Council Reg. No.' },
  { id: 'Teacher', label: 'Teacher / Faculty', icon: GraduationCap, placeholder: 'e.g. College / School Faculty ID' },
  { id: 'Student', label: 'College Student', icon: GraduationCap, placeholder: 'e.g. MAKAUT / University Roll No.' },
  { id: 'Organisation', label: 'Verified NGO / Organisation', icon: Building2, placeholder: 'e.g. Trust / Society 12A Reg. No.' },
];

export function VerificationTab() {
  const { userProfile, updateUserProfile, updateVerificationState } = useKindLinkStore();

  // Verification request details from backend
  const [loading, setLoading] = useState(false);
  const [backendVerification, setBackendVerification] = useState<any>(null);
  const [professionalProofs, setProfessionalProofs] = useState<ProfessionalProofItem[]>([]);

  // Modals state
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [tempPhone, setTempPhone] = useState(userProfile.phone || '');

  const [idModalOpen, setIdModalOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('Student ID Card');
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [selectedProfession, setSelectedProfession] = useState<ProfessionalProofType>('Student');
  const [regNumber, setRegNumber] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);

  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Fetch current user verification and professional proofs status
  const fetchStatus = async () => {
    try {
      const [vRes, pRes] = await Promise.all([
        fetch('/api/verification'),
        fetch('/api/professional-proofs'),
      ]);

      if (vRes.ok) {
        const vData = await vRes.json();
        if (vData.verification) {
          setBackendVerification(vData.verification);
          if (vData.verification.status) {
            updateVerificationState(
              vData.verification.status as VerificationState,
              vData.verification.id_document_path
                ? vData.verification.id_document_path.split('/').pop()
                : userProfile.idDocumentName,
              vData.verification.document_type || userProfile.idDocumentType
            );
          }
        }
      }

      if (pRes.ok) {
        const pData = await pRes.json();
        setProfessionalProofs(pData.proofs || []);
      }
    } catch (err) {
      console.warn('[VerificationTab] Error loading backend verification:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Compute live step statuses
  const hasName = Boolean(userProfile.displayName || userProfile.name);
  const hasPhone = Boolean(userProfile.phone && userProfile.phone.trim().length >= 10);
  const hasEmail = Boolean(userProfile.email && userProfile.email.trim().length > 0);
  const profileComplete = hasName && hasPhone;

  // Phone status: Phone shows "Added" and only says "Verified" if a real verification exists.
  const isPhoneVerified = Boolean(
    userProfile.phoneVerified || userProfile.verificationState === 'verified'
  );

  // Document state
  const hasDocument = Boolean(
    backendVerification?.id_document_path ||
    (userProfile.idDocumentName && userProfile.idDocumentName.length > 0)
  );
  const documentName =
    backendVerification?.id_document_path?.split('/').pop() ||
    userProfile.idDocumentName ||
    'Document on file';
  const documentType =
    backendVerification?.document_type ||
    userProfile.idDocumentType ||
    'ID Document';

  // Admin Review state
  const reviewStatus: VerificationState =
    (backendVerification?.status as VerificationState) ||
    userProfile.verificationState ||
    'unverified';

  const reviewDate =
    backendVerification?.reviewed_at ||
    backendVerification?.created_at ||
    null;

  const formattedDate = reviewDate
    ? new Date(reviewDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const adminNote = backendVerification?.admin_note || null;

  // Save phone number
  const handleSavePhone = async () => {
    if (!isValidIndianPhone(tempPhone)) {
      toast.error('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: tempPhone.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update phone number');
      }

      updateUserProfile({ phone: tempPhone.trim() });
      toast.success('Phone number updated successfully!');
      setPhoneModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Could not update phone number');
    } finally {
      setLoading(false);
    }
  };

  // Upload or Replace ID Document
  const handleUploadOrReplaceDoc = async () => {
    if (!selectedDocFile) {
      toast.error('Please select an ID document file (JPG, PNG, or PDF)');
      return;
    }

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('phone', userProfile.phone || tempPhone || '');
      formData.append('documentType', selectedDocType);
      formData.append('file', selectedDocFile);

      const res = await fetch('/api/verification', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload document');
      }

      updateVerificationState('pending', selectedDocFile.name, selectedDocType);
      setIdModalOpen(false);
      setSelectedDocFile(null);
      await fetchStatus();
      toast.success('Document uploaded and submitted for review!');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploadingDoc(false);
    }
  };

  // Remove ID Document
  const handleRemoveDoc = async () => {
    if (!confirm('Are you sure you want to remove your uploaded ID document?')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/verification', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to remove document');
      }

      updateVerificationState('unverified', '', '');
      await fetchStatus();
      toast.success('ID document removed');
    } catch (err: any) {
      toast.error(err.message || 'Removal failed');
    } finally {
      setLoading(false);
    }
  };

  // Request verification
  const handleRequestVerification = async () => {
    if (!userProfile.phone) {
      toast.error('Please add your mobile number before requesting verification');
      setPhoneModalOpen(true);
      return;
    }

    setSubmittingRequest(true);
    try {
      const res = await fetch('/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: userProfile.phone,
          documentType: userProfile.idDocumentType || 'Student ID Card',
          idDocumentName: userProfile.idDocumentName || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to request verification');
      }

      updateVerificationState('pending');
      await fetchStatus();
      toast.success('Verification requested!', {
        description: 'Our community admins will review your profile shortly.',
      });
    } catch (err: any) {
      toast.error(err.message || 'Request failed');
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Submit professional proof
  const handleSubmitProof = async () => {
    if (!regNumber.trim()) {
      toast.error('Please enter your registration or identification number');
      return;
    }
    if (!proofFile) {
      toast.error('Please upload your proof document');
      return;
    }

    setSubmittingProof(true);
    try {
      const formData = new FormData();
      formData.append('professionType', selectedProfession);
      formData.append('registrationNumber', regNumber.trim());
      formData.append('file', proofFile);

      const res = await fetch('/api/professional-proofs', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit professional proof');
      }

      setProofModalOpen(false);
      setRegNumber('');
      setProofFile(null);
      await fetchStatus();
      toast.success('Professional proof submitted!', {
        description: 'Staff will review your proof to unlock specialized badges.',
      });
    } catch (err: any) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmittingProof(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. OVERALL STATUS HEADER */}
      <div
        className={`rounded-3xl border p-5 sm:p-6 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
          reviewStatus === 'verified'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-100'
            : reviewStatus === 'pending'
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-950 dark:text-amber-100'
            : reviewStatus === 'needs_info'
            ? 'bg-amber-500/15 border-amber-500/30 text-amber-950 dark:text-amber-100'
            : reviewStatus === 'rejected'
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-950 dark:text-rose-100'
            : 'bg-card border-border text-foreground'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`p-3 rounded-2xl shrink-0 ${
              reviewStatus === 'verified'
                ? 'bg-emerald-500 text-white'
                : reviewStatus === 'pending'
                ? 'bg-amber-500 text-white'
                : reviewStatus === 'needs_info'
                ? 'bg-amber-600 text-white'
                : reviewStatus === 'rejected'
                ? 'bg-rose-500 text-white'
                : 'bg-primary/10 text-primary'
            }`}
          >
            {reviewStatus === 'verified' ? (
              <ShieldCheck className="h-6 w-6 notranslate" />
            ) : reviewStatus === 'pending' ? (
              <Clock className="h-6 w-6 notranslate" />
            ) : reviewStatus === 'needs_info' ? (
              <AlertCircle className="h-6 w-6 notranslate" />
            ) : reviewStatus === 'rejected' ? (
              <ShieldAlert className="h-6 w-6 notranslate" />
            ) : (
              <FileCheck className="h-6 w-6 notranslate" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold">
                {reviewStatus === 'verified'
                  ? 'Identity Verified Volunteer'
                  : reviewStatus === 'pending'
                  ? 'Verification Under Admin Review'
                  : reviewStatus === 'needs_info'
                  ? 'More Information Requested'
                  : reviewStatus === 'rejected'
                  ? 'Verification Unsuccessful'
                  : 'Community Trust & Verification'}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {reviewStatus === 'verified'
                ? `Officially verified on ${formattedDate || 'record'}. You can respond to emergency blood donations and critical emergency requests.`
                : reviewStatus === 'pending'
                ? `Submitted on ${formattedDate || 'recently'}. Community administrators are currently auditing your verification submission.`
                : reviewStatus === 'needs_info'
                ? `Admin note: "${adminNote || 'Please update your details or provide higher quality document.'}"`
                : reviewStatus === 'rejected'
                ? `Declined: "${adminNote || 'Details did not meet community requirements.'}". You can update your details and resubmit.`
                : 'Build confidence in Asansol and neighboring areas by completing the 3-step verification protocol.'}
            </p>
          </div>
        </div>

        {/* Status Pill Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide border shadow-sm ${
              reviewStatus === 'verified'
                ? 'bg-emerald-500 text-white border-emerald-600'
                : reviewStatus === 'pending'
                ? 'bg-amber-500 text-white border-amber-600'
                : reviewStatus === 'needs_info'
                ? 'bg-amber-600 text-white border-amber-700'
                : reviewStatus === 'rejected'
                ? 'bg-rose-500 text-white border-rose-600'
                : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            {reviewStatus === 'verified' && <CheckCircle2 className="h-3.5 w-3.5" />}
            {reviewStatus === 'pending' && <Clock className="h-3.5 w-3.5" />}
            {reviewStatus === 'needs_info' && <Info className="h-3.5 w-3.5" />}
            {reviewStatus === 'rejected' && <ShieldAlert className="h-3.5 w-3.5" />}
            <span>
              {reviewStatus === 'needs_info' ? 'Needs Info' : reviewStatus}
            </span>
          </span>

          <button
            onClick={fetchStatus}
            title="Refresh status"
            className="p-1.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 2. THREE-STEP VERIFICATION STEPPER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* STEP 1: PROFILE DETAILS */}
        <div className="p-5 rounded-3xl bg-card border border-border shadow-soft flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-extrabold">
                  1
                </span>
                <span>Profile Details</span>
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  profileComplete
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-amber-500/10 text-amber-600'
                }`}
              >
                {profileComplete ? 'Complete' : 'Incomplete'}
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              People you help and volunteers who help you will see this for coordination.
            </p>

            {/* Sub-items */}
            <div className="space-y-2 pt-1">
              {/* Name */}
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-muted/40 border border-border/50">
                <div className="flex items-center gap-2 truncate pr-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate font-medium text-foreground">
                    {userProfile.displayName || userProfile.name || 'Full Name'}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    hasName
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-rose-500/10 text-rose-600'
                  }`}
                >
                  {hasName ? 'Added' : 'Missing'}
                </span>
              </div>

              {/* Phone */}
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-muted/40 border border-border/50">
                <div className="flex items-center gap-2 truncate pr-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate font-mono text-foreground">
                    {userProfile.phone || 'Phone number'}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    isPhoneVerified
                      ? 'bg-emerald-500 text-white'
                      : hasPhone
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-rose-500/10 text-rose-600'
                  }`}
                >
                  {isPhoneVerified ? 'Verified' : hasPhone ? 'Added' : 'Missing'}
                </span>
              </div>

              {/* Email */}
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-muted/40 border border-border/50">
                <div className="flex items-center gap-2 truncate pr-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate font-mono text-foreground">
                    {userProfile.email || 'Email address'}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    hasEmail
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {hasEmail ? 'Added' : 'Missing'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Mobile verification</span>
            <button
              onClick={() => {
                setTempPhone(userProfile.phone || '');
                setPhoneModalOpen(true);
              }}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 touch-target"
            >
              <Phone className="h-3 w-3" />
              <span>Update phone number →</span>
            </button>
          </div>
        </div>

        {/* STEP 2: ID DOCUMENT (OPTIONAL) */}
        <div className="p-5 rounded-3xl bg-card border border-border shadow-soft flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-foreground">
                <span className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center text-[11px] font-extrabold">
                  2
                </span>
                <span>ID Document</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600">
                Optional
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Student ID (AEC/MAKAUT) or Government Photo ID (Aadhaar / Voter ID).{' '}
              <strong className="text-foreground">Optional</strong> — adds extra trust badge for critical emergency calls.
            </p>

            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-muted-foreground uppercase">
                  Document Status
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    hasDocument
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {hasDocument ? 'Uploaded' : 'None Attached'}
                </span>
              </div>

              {hasDocument ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground truncate">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{documentName}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Type: <span className="font-medium text-foreground">{documentType}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No ID uploaded. You can still request verification based on your confirmed phone coordinates.
                </p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
            {hasDocument ? (
              <>
                <button
                  onClick={handleRemoveDoc}
                  disabled={loading}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 touch-target"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Remove</span>
                </button>
                <button
                  onClick={() => setIdModalOpen(true)}
                  className="text-xs font-bold text-primary hover:underline touch-target"
                >
                  Replace ID →
                </button>
              </>
            ) : (
              <button
                onClick={() => setIdModalOpen(true)}
                className="w-full text-center text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-teal-500/30 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload ID (optional)</span>
              </button>
            )}
          </div>
        </div>

        {/* STEP 3: ADMIN REVIEW */}
        <div className="p-5 rounded-3xl bg-card border border-border shadow-soft flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-foreground">
                <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-[11px] font-extrabold">
                  3
                </span>
                <span>Admin Review</span>
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  reviewStatus === 'verified'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : reviewStatus === 'pending'
                    ? 'bg-amber-500/10 text-amber-600'
                    : reviewStatus === 'needs_info'
                    ? 'bg-amber-600/15 text-amber-700'
                    : reviewStatus === 'rejected'
                    ? 'bg-rose-500/10 text-rose-600'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {reviewStatus === 'verified'
                  ? 'Verified'
                  : reviewStatus === 'pending'
                  ? 'Pending'
                  : reviewStatus === 'needs_info'
                  ? 'Needs Info'
                  : reviewStatus === 'rejected'
                  ? 'Rejected'
                  : 'Not Requested'}
              </span>
            </div>

            {/* Review status card */}
            <div className="space-y-2">
              {reviewStatus === 'verified' ? (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Verified Volunteer Active</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Verified on {formattedDate || 'record'}.
                  </p>
                </div>
              ) : reviewStatus === 'pending' ? (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span>Pending Admin Review</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Submitted on {formattedDate || 'recently'}. Queue turnaround is typically within 24 hours.
                  </p>
                </div>
              ) : reviewStatus === 'needs_info' ? (
                <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-950 dark:text-amber-100 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>Needs More Information</span>
                  </div>
                  <p className="text-[11px] italic bg-background/60 p-2 rounded-xl border border-border/40">
                    &quot;{adminNote || 'Please update your details or re-upload your document.'}&quot;
                  </p>
                </div>
              ) : reviewStatus === 'rejected' ? (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-900 dark:text-rose-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-rose-600">
                    <ShieldAlert className="h-4 w-4" />
                    <span>Submission Rejected</span>
                  </div>
                  <p className="text-[11px] italic bg-background/60 p-2 rounded-xl border border-border/40">
                    Reason: &quot;{adminNote || 'Could not be verified'}&quot;
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Verification has not been submitted yet. Once requested, community administrators will review your verification proof.
                </p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between">
            {reviewStatus === 'rejected' || reviewStatus === 'needs_info' ? (
              <button
                onClick={() => setIdModalOpen(true)}
                className="w-full py-1.5 px-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-soft transition flex items-center justify-center gap-1.5"
              >
                <span>Fix and resubmit →</span>
              </button>
            ) : reviewStatus === 'unverified' ? (
              <button
                onClick={handleRequestVerification}
                disabled={submittingRequest || !profileComplete}
                className="w-full py-1.5 px-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-soft transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{submittingRequest ? 'Submitting...' : 'Request verification'}</span>
              </button>
            ) : (
              <span className="text-[11px] font-semibold text-muted-foreground">
                {reviewStatus === 'verified' ? 'Identity Confirmed' : 'Review In Progress'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. PRIMARY ACTION TOOLBAR */}
      <div className="p-4 rounded-3xl bg-muted/30 border border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground">Verification Actions</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Request Verification button */}
          {reviewStatus !== 'verified' && reviewStatus !== 'pending' && (
            <button
              onClick={handleRequestVerification}
              disabled={submittingRequest || !profileComplete}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-soft transition disabled:opacity-50 flex items-center gap-1.5 touch-target"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{submittingRequest ? 'Submitting...' : 'Request verification'}</span>
            </button>
          )}

          {/* Update Phone Number button */}
          <button
            onClick={() => {
              setTempPhone(userProfile.phone || '');
              setPhoneModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-xs font-semibold transition flex items-center gap-1.5 touch-target"
          >
            <Phone className="h-3.5 w-3.5 text-emerald-500" />
            <span>Update phone number</span>
          </button>

          {/* Upload ID (Optional) button */}
          <button
            onClick={() => setIdModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-xs font-semibold transition flex items-center gap-1.5 touch-target"
          >
            <Upload className="h-3.5 w-3.5 text-teal-500" />
            <span>{hasDocument ? 'Replace ID' : 'Upload ID (optional)'}</span>
          </button>

          {/* Add Professional Proof button */}
          <button
            onClick={() => setProofModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-soft transition flex items-center gap-1.5 touch-target"
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Add professional proof</span>
          </button>
        </div>
      </div>

      {/* 4. PROFESSIONAL PROOFS SECTION */}
      {professionalProofs.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-indigo-500" />
              <span>Professional Proofs &amp; Documents ({professionalProofs.length})</span>
            </h3>
            <button
              onClick={() => setProofModalOpen(true)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              + Add another proof
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {professionalProofs.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-card border border-border shadow-soft flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{p.professionType}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        p.status === 'verified'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : p.status === 'rejected'
                          ? 'bg-rose-500/10 text-rose-600'
                          : p.status === 'needs_info'
                          ? 'bg-amber-500/15 text-amber-700'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    ID / Reg: <span className="text-foreground">{p.registrationNumber}</span>
                  </p>
                  {p.documentName && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span>{p.documentName}</span>
                    </p>
                  )}
                  {p.adminNote && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 italic">
                      Admin note: &quot;{p.adminNote}&quot;
                    </p>
                  )}
                </div>

                <div className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS
         ========================================================================= */}

      {/* 1. UPDATE PHONE MODAL (Using PhoneInput) */}
      {phoneModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Phone className="h-5 w-5 notranslate" />
                </div>
                <h3 className="text-base font-bold text-foreground">Update Phone Number</h3>
              </div>
              <button
                onClick={() => setPhoneModalOpen(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Your mobile number is used to coordinate emergency blood requests and medical volunteer escorts in Asansol.
            </p>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Mobile Number (10 digits)
              </label>
              <PhoneInput
                value={tempPhone}
                onChange={(val) => setTempPhone(val)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPhoneModalOpen(false)}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePhone}
                disabled={loading || !isValidIndianPhone(tempPhone)}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-soft transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Phone'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. UPLOAD / REPLACE ID MODAL */}
      {idModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600">
                  <ShieldCheck className="h-5 w-5 notranslate" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {hasDocument ? 'Replace ID Document' : 'Upload ID Document'}
                  </h3>
                  <span className="text-[11px] font-semibold text-teal-600">Optional extra trust</span>
                </div>
              </div>
              <button
                onClick={() => setIdModalOpen(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Uploading a Student ID or Government Photo ID unlocks the verified volunteer badge. Documents are stored in secure private storage and automatically audited.
            </p>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Document Category</label>
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
              >
                <option value="Student ID Card">College Student ID (AEC / MAKAUT / University)</option>
                <option value="Government Photo ID">Government Photo ID (Aadhaar / Voter ID / Passport)</option>
                <option value="Driving License">Driving License</option>
                <option value="Healthcare Certificate">Healthcare / First Responder Certificate</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Choose Document File (PDF, JPG, PNG - Max 5 MB)
              </label>
              <label className="p-5 rounded-2xl border-2 border-dashed border-border bg-muted/30 text-xs text-muted-foreground flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/60 transition">
                <Upload className="h-6 w-6 text-primary notranslate" />
                <span className="font-semibold text-foreground text-center">
                  {selectedDocFile ? selectedDocFile.name : 'Click to select document'}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {selectedDocFile
                    ? `${(selectedDocFile.size / 1024 / 1024).toFixed(2)} MB`
                    : 'PDF, JPG, PNG up to 5 MB'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      if (f.size > 5 * 1024 * 1024) {
                        toast.error('File size exceeds 5 MB limit');
                        return;
                      }
                      setSelectedDocFile(f);
                    }
                  }}
                />
              </label>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIdModalOpen(false)}
                disabled={uploadingDoc}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadOrReplaceDoc}
                disabled={uploadingDoc || !selectedDocFile}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-soft transition disabled:opacity-50"
              >
                {uploadingDoc ? 'Uploading...' : 'Submit Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ADD PROFESSIONAL PROOF MODAL */}
      {proofModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                  <Briefcase className="h-5 w-5 notranslate" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Add Professional Proof</h3>
                  <p className="text-xs text-muted-foreground">Doctor, Nurse, Pharmacist, Teacher, Student, or NGO</p>
                </div>
              </div>
              <button
                onClick={() => setProofModalOpen(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Profession Type Selection */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Select Profession / Affiliation
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PROFESSION_TYPES.map((pt) => {
                  const Icon = pt.icon;
                  const isSelected = selectedProfession === pt.id;
                  return (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => setSelectedProfession(pt.id)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                          : 'border-border bg-background text-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{pt.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Registration / ID Number */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Registration / Identification Number
              </label>
              <input
                type="text"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder={
                  PROFESSION_TYPES.find((p) => p.id === selectedProfession)?.placeholder ||
                  'Enter registration / ID number'
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target font-mono"
              />
            </div>

            {/* Credential Document Upload */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Attach Proof Document (ID Card, Certificate, or License)
              </label>
              <label className="p-4 rounded-2xl border-2 border-dashed border-border bg-muted/30 text-xs text-muted-foreground flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/60 transition">
                <Upload className="h-5 w-5 text-indigo-500 notranslate" />
                <span className="font-semibold text-foreground text-center">
                  {proofFile ? proofFile.name : 'Select proof file'}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {proofFile
                    ? `${(proofFile.size / 1024 / 1024).toFixed(2)} MB`
                    : 'PDF, JPG, PNG up to 5 MB'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      if (f.size > 5 * 1024 * 1024) {
                        toast.error('File size exceeds 5 MB limit');
                        return;
                      }
                      setProofFile(f);
                    }
                  }}
                />
              </label>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setProofModalOpen(false)}
                disabled={submittingProof}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitProof}
                disabled={submittingProof || !regNumber.trim() || !proofFile}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-soft transition disabled:opacity-50"
              >
                {submittingProof ? 'Submitting...' : 'Submit Proof'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VerificationTab;
