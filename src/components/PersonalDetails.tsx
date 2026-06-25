import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  User as UserIcon,
  Mail,
  Phone,
  Briefcase,
  FileText,
  Save,
  LogOut,
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  Calendar,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { auth, db, doc, getDoc, setDoc } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';

interface PersonalDetailsProps {
  onBack: () => void;
}

interface UserProfileData {
  displayName: string;
  email: string;
  phone: string;
  role: string;
  bio: string;
  updatedAt: number;
}

export default function PersonalDetails({ onBack }: PersonalDetailsProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Profile fields state
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');

  // Track Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        setDisplayName(user.displayName || '');
        // Fetch additional profile data from Firestore
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfileData;
            if (data.displayName) setDisplayName(data.displayName);
            if (data.phone) setPhone(data.phone);
            if (data.role) setRole(data.role);
            if (data.bio) setBio(data.bio);
          }
        } catch (err) {
          console.error('Failed to fetch user profile from Firestore', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle Google Sign In
  const handleSignIn = async () => {
    setAuthLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Auth Sign In Error', err);
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Reset local fields
      setDisplayName('');
      setPhone('');
      setRole('');
      setBio('');
    } catch (err) {
      console.error('Auth Sign Out Error', err);
    }
  };

  // Save changes to Firestore
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSaveLoading(true);
    setSaveSuccess(false);

    const userProfile: UserProfileData = {
      displayName: displayName.trim(),
      email: currentUser.email || '',
      phone: phone.trim(),
      role: role.trim(),
      bio: bio.trim(),
      updatedAt: Date.now()
    };

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, userProfile, { merge: true });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save profile details', err);
    } finally {
      setSaveLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-xs text-[#787774] dark:text-[#91918e] mt-2 font-medium">Loading security profile...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent select-none">
      {/* Top Banner/Header */}
      <div className="px-6 lg:px-8 py-4 border-b border-zinc-200/80 dark:border-white/10 flex items-center justify-between bg-transparent shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-white/10 text-[#787774] dark:text-[#91918e] hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-[#37352f] dark:hover:text-[#ebebea] transition-all cursor-pointer"
            title="Back to Workspace"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="text-sm font-bold text-[#37352f] dark:text-[#ebebea] tracking-tight">
              Personal Profile & Details
            </span>
          </div>
        </div>

        {currentUser && (
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/10 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-2xl mx-auto w-full custom-scrollbar">
        {!currentUser ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 px-6 border border-dashed border-zinc-200 dark:border-white/10 rounded-2xl glass-panel bg-white/20 dark:bg-black/10 shadow-lg"
          >
            <div className="w-12 h-12 bg-indigo-500/10 dark:bg-indigo-400/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6 text-indigo-600 dark:text-indigo-405" />
            </div>
            <h2 className="text-lg font-bold text-[#37352f] dark:text-[#ebebea] tracking-tight">Access Restricted</h2>
            <p className="text-xs text-[#787774] dark:text-[#91918e] mt-1.5 max-w-sm mx-auto leading-relaxed">
              Sign in with your verified Google Account to view your secure profile details, save your preferences, and sync with Firestore.
            </p>
            <button
              onClick={handleSignIn}
              className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 mx-auto cursor-pointer"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Connect Google Account</span>
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* User Avatar & Google Auth header */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-5 glass-panel rounded-2xl shadow-md">
              <div className="relative group select-none">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User Profile'}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-2xl object-cover ring-2 ring-indigo-500/20"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-450 flex items-center justify-center font-bold text-3xl">
                    {currentUser.displayName ? currentUser.displayName[0] : currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>

              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1.5">
                  <h2 className="text-base font-bold text-[#37352f] dark:text-[#ebebea]">
                    {currentUser.displayName || 'Google Account Linked'}
                  </h2>
                  <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 px-1.5 py-0.5 rounded">
                    Verified
                  </span>
                </div>
                <p className="text-xs text-[#787774] dark:text-[#91918e] mt-1 flex items-center justify-center sm:justify-start gap-1">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{currentUser.email}</span>
                </p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                  ID: <span className="font-mono">{currentUser.uid}</span>
                </p>
              </div>
            </div>

            {/* Editing Form */}
            <form onSubmit={handleSave} className="space-y-5">
              <h3 className="text-xs font-bold text-[#37352f] dark:text-[#ebebea] uppercase tracking-wider border-b border-zinc-200/80 dark:border-white/10 pb-2">
                Profile Properties
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Display Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#787774] dark:text-[#91918e] uppercase tracking-wider">
                    Full Name / Alias
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full pl-9 pr-3 py-2 bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/10 rounded-lg text-xs text-[#37352f] dark:text-[#ebebea] focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Role / Job Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#787774] dark:text-[#91918e] uppercase tracking-wider">
                    Occupation / Role
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g. Lead Designer"
                      className="w-full pl-9 pr-3 py-2 bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/10 rounded-lg text-xs text-[#37352f] dark:text-[#ebebea] focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#787774] dark:text-[#91918e] uppercase tracking-wider">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 019-2834"
                    className="w-full pl-9 pr-3 py-2 bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/10 rounded-lg text-xs text-[#37352f] dark:text-[#ebebea] focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#787774] dark:text-[#91918e] uppercase tracking-wider">
                  Biography / Notes
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    className="w-full pl-9 pr-3 py-2 bg-white/50 dark:bg-black/25 border border-zinc-200 dark:border-white/10 rounded-lg text-xs text-[#37352f] dark:text-[#ebebea] focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-200/80 dark:border-white/10">
                <div className="flex items-center gap-1.5">
                  {saveSuccess && (
                    <motion.div
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold"
                    >
                      <Check className="w-4 h-4" />
                      <span>Profile updated successfully!</span>
                    </motion.div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onBack}
                    className="px-4 py-2 border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 text-xs font-semibold rounded-lg text-zinc-600 dark:text-zinc-300 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {saveLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
