import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

const BookingWidget = ({ prefilledReason = '', prefilledVetId = '', prefilledVetName = '' }) => {
    const { token, user, login } = useAuth();
    
    // UI steps & loading
    const [step, setStep] = useState('form'); // 'form', 'loading', 'success'
    const [loadingData, setLoadingData] = useState(true);
    
    // Options fetched from backend
    const [vets, setVets] = useState([]);
    const [myPets, setMyPets] = useState([]);
    
    // Booking Form State
    const [selectedVetId, setSelectedVetId] = useState(prefilledVetId || '');
    const [selectedPetId, setSelectedPetId] = useState('');
    
    // Guest Profile Creation fields (Active only if !token)
    const [guestFirstName, setGuestFirstName] = useState('');
    const [guestLastName, setGuestLastName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [guestPetName, setGuestPetName] = useState('');
    const [guestPetSpecies, setGuestPetSpecies] = useState('Dog');
    
    // Slot Selection
    const [availableDates, setAvailableDates] = useState([]);
    const [selectedDateIdx, setSelectedDateIdx] = useState(0); // 0 = Today, 1 = Tomorrow, 2 = Day After
    const [selectedSlot, setSelectedSlot] = useState('11:00 AM');
    
    const [reason, setReason] = useState(prefilledReason || '');
    const [errorMsg, setErrorMsg] = useState('');
    const [successPayload, setSuccessPayload] = useState(null);
    const [copied, setCopied] = useState(false);

    // Compute next 3 days
    useEffect(() => {
        const dates = [];
        const localeOpts = { weekday: 'short', month: 'short', day: 'numeric' };
        
        for (let i = 0; i < 3; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            dates.push({
                label: i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' })),
                subLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                isoString: d.toISOString().split('T')[0]
            });
        }
        setAvailableDates(dates);
    }, []);

    // Load Vets and Pets
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // 1. Fetch Vets
                const providersRes = await axios.get(`${API_BASE}/providers`);
                const allVets = providersRes.data?.vets || [];
                setVets(allVets);
                
                // Pre-select vet if match found
                if (prefilledVetId) {
                    setSelectedVetId(prefilledVetId);
                } else if (prefilledVetName && allVets.length > 0) {
                    const match = allVets.find(v => 
                        `${v.first_name} ${v.last_name}`.toLowerCase().includes(prefilledVetName.toLowerCase())
                    );
                    if (match) setSelectedVetId(match.id);
                } else if (allVets.length > 0) {
                    setSelectedVetId(allVets[0].id);
                }

                // 2. Fetch User Pets if logged in
                if (token) {
                    const headers = { Authorization: `Bearer ${token}` };
                    const petsRes = await axios.get(`${API_BASE}/pets`, { headers });
                    const petsList = petsRes.data?.pets || [];
                    setMyPets(petsList);
                    if (petsList.length > 0) {
                        setSelectedPetId(petsList[0].id);
                    }
                }
            } catch (err) {
                console.error("Failed to load booking widget data", err);
            } finally {
                setLoadingData(false);
            }
        };

        loadInitialData();
    }, [token, prefilledVetId, prefilledVetName]);

    const handleCopy = () => {
        if (successPayload?.temporary_password) {
            navigator.clipboard.writeText(successPayload.temporary_password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        
        if (!selectedVetId) {
            setErrorMsg('Please select a veterinary doctor.');
            return;
        }

        // Parse Time Slot to ISO timestamp
        const timeParts = selectedSlot.match(/(\d+):(\d+)\s*(AM|PM)/i);
        let hours = parseInt(timeParts[1], 10);
        const minutes = parseInt(timeParts[2], 10);
        const ampm = timeParts[3].toUpperCase();
        
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        
        const dateString = availableDates[selectedDateIdx].isoString;
        const appointmentTime = new Date(`${dateString}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`).toISOString();

        setStep('loading');

        try {
            if (token) {
                // Logged In Flow
                const headers = { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                };
                
                const response = await axios.post(`${API_BASE}/bookings/appointments`, {
                    vet_user_id: selectedVetId,
                    appointment_time: appointmentTime,
                    reason: reason || 'Routine Checkup',
                    pet_id: selectedPetId || null
                }, { headers });

                setSuccessPayload({
                    isGuest: false,
                    appointment: response.data.appointment,
                    vet: vets.find(v => v.id === selectedVetId),
                    petName: myPets.find(p => p.id === selectedPetId)?.name || 'Your Pet',
                    time: appointmentTime
                });
                setStep('success');
            } else {
                // Frictionless Guest Checkout Flow
                if (!guestFirstName || !guestLastName || !guestEmail || !guestPetName) {
                    setErrorMsg('Please complete all details to create your booking.');
                    setStep('form');
                    return;
                }

                const guestRes = await axios.post(`${API_BASE}/bookings/guest-appointment`, {
                    first_name: guestFirstName,
                    last_name: guestLastName,
                    email: guestEmail,
                    pet_name: guestPetName,
                    pet_species: guestPetSpecies,
                    vet_user_id: selectedVetId,
                    appointment_time: appointmentTime,
                    reason: reason || 'Guest Clinic Consultation'
                });

                // Auto-login on the frontend
                login(guestRes.data.token, guestRes.data.user);

                setSuccessPayload({
                    isGuest: true,
                    temporary_password: guestRes.data.temporary_password,
                    email: guestRes.data.email,
                    appointment: guestRes.data.appointment,
                    vet: vets.find(v => v.id === selectedVetId),
                    petName: guestPetName,
                    time: appointmentTime
                });
                setStep('success');
            }
        } catch (err) {
            console.error(err);
            setErrorMsg(err.response?.data?.error || 'Failed to submit appointment booking. Please try again.');
            setStep('form');
        }
    };

    if (loadingData) {
        return (
            <div className="flex flex-col items-center justify-center p-6 bg-white/60 backdrop-blur border border-slate-100 rounded-2xl gap-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Syncing Clinic Directory...</p>
            </div>
        );
    }

    if (step === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-[24px] shadow-lg gap-4 text-center">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-blue-600 text-[28px]">medical_services</span>
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 text-sm">Securing Your Consultation...</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-[220px]">Registering secure patient file & reserving professional clinic slot.</p>
                </div>
            </div>
        );
    }

    if (step === 'success') {
        const formattedTime = new Date(successPayload.time).toLocaleString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-300">
                {/* Ambient Glow Backdrops for Premium Aesthetics */}
                <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-[80px] -z-10 animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-[80px] -z-10 animate-pulse"></div>

                {/* Glassmorphic Receipt Container */}
                <div className="relative bg-white/95 backdrop-blur-xl border border-slate-200/50 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] rounded-[32px] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col p-6 sm:p-7 gap-5 text-left">
                    {/* Success Header and Icon Banner */}
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-14 h-14 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full flex items-center justify-center border-4 border-emerald-50 shadow-md text-white">
                            <span className="material-symbols-outlined text-[28px] font-bold">check</span>
                        </div>
                        <div>
                            <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Appointment Secured!</h3>
                            <p className="text-xs text-slate-500 font-medium">Your slot is reserved and recorded in our system.</p>
                        </div>
                    </div>

                    {/* Decorative Notch Line simulating a real receipt paper slip */}
                    <div className="relative flex items-center justify-center py-1">
                        <div className="absolute -left-10 w-5 h-5 bg-slate-950 rounded-full border-r border-slate-200/40"></div>
                        <div className="w-full border-t-2 border-dashed border-slate-200/80"></div>
                        <div className="absolute -right-10 w-5 h-5 bg-slate-950 rounded-full border-l border-slate-200/40"></div>
                    </div>

                    {/* Receipt Details Grid */}
                    <div className="flex flex-col gap-3">
                        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Consultation Receipt</h4>
                        
                        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100/75">
                                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-slate-400">medical_services</span>
                                    Practitioner
                                </span>
                                <strong className="text-slate-800 font-bold">
                                    Dr. {successPayload.vet ? `${successPayload.vet.first_name} ${successPayload.vet.last_name}` : 'Nour El-Din'}
                                </strong>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100/75">
                                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-slate-400">pets</span>
                                    Pet Patient
                                </span>
                                <strong className="text-slate-800 font-bold">
                                    🐾 {successPayload.petName}
                                </strong>
                            </div>
                            
                            <div className="flex flex-col gap-1 text-xs pt-1">
                                <span className="text-slate-500 font-semibold flex items-center gap-1.5 mb-1">
                                    <span className="material-symbols-outlined text-[16px] text-slate-400">calendar_today</span>
                                    Scheduled Date & Time
                                </span>
                                <strong className="text-blue-700 font-extrabold text-xs bg-blue-50/80 border border-blue-100 px-3 py-2 rounded-xl text-center">
                                    {formattedTime}
                                </strong>
                            </div>
                        </div>
                    </div>

                    {/* Auto-generated Welcome Credentials (Only for Frictionless Guest Flow) */}
                    {successPayload.isGuest && (
                        <div className="bg-gradient-to-tr from-blue-600/5 to-indigo-600/10 border border-blue-100/80 rounded-2xl p-4 flex flex-col gap-3">
                            <div className="flex items-start gap-2.5">
                                <span className="text-lg">✨</span>
                                <div>
                                    <h5 className="font-extrabold text-blue-900 text-xs m-0">Patient Account Activated!</h5>
                                    <p className="text-[10px] text-slate-600 mt-0.5 leading-relaxed font-medium">
                                        We created a secure profile using your details. You are automatically logged in!
                                    </p>
                                </div>
                            </div>
                            
                            <div className="bg-white border border-blue-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] rounded-xl p-3 flex flex-col gap-2.5">
                                <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-100/70">
                                    <span className="text-slate-500 font-semibold">User Email / ID</span>
                                    <strong className="text-slate-800 font-mono font-bold">{successPayload.email}</strong>
                                </div>
                                
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500 font-semibold">Temporary Password</span>
                                    <div className="flex items-center gap-1.5">
                                        <code className="text-xs bg-slate-50 px-2 py-0.5 rounded font-mono font-black text-slate-900 tracking-wide select-all border border-slate-150">
                                            {successPayload.temporary_password}
                                        </code>
                                        <button 
                                            onClick={handleCopy}
                                            type="button"
                                            className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-all active:scale-90 cursor-pointer ${
                                                copied 
                                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                                                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                                            }`}
                                            title="Copy Password"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">
                                                {copied ? 'check' : 'content_copy'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-semibold bg-white/40 border border-white/60 p-2.5 rounded-xl leading-relaxed">
                                <span className="material-symbols-outlined text-[13px] text-amber-500">info</span>
                                <span>Modify this random password inside your <strong>Profile Settings</strong> at any time.</span>
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2 mt-1">
                        <button 
                            onClick={() => window.location.reload()}
                            type="button"
                            className="w-full text-center bg-slate-900 text-white font-extrabold py-3.5 rounded-[18px] text-xs hover:bg-slate-800 active:scale-95 transition-all shadow-md shadow-slate-950/10 cursor-pointer"
                        >
                            Start Exploring PetPulse
                        </button>
                        <p className="text-[9px] text-slate-400 font-extrabold text-center m-0 uppercase tracking-widest">
                            🔒 HIPAA Compliant Security Shielded
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Available time slots options
    const slots = ['09:00 AM', '10:30 AM', '11:00 AM', '02:00 PM', '04:30 PM'];

    return (
        <form 
            onSubmit={handleSubmit}
            className="bg-white/95 backdrop-blur-xl border border-slate-100 rounded-[24px] shadow-[0_12px_45px_rgba(0,0,0,0.06)] p-4 sm:p-5 flex flex-col gap-4 text-left max-w-full overflow-hidden"
        >
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="material-symbols-outlined text-blue-600 text-[20px]">calendar_month</span>
                <span className="font-extrabold text-slate-800 text-[14px]">Live In-Chat Booking Wizard</span>
            </div>

            {/* ERROR DISPLAY */}
            {errorMsg && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-3 py-2.5 rounded-xl font-medium">
                    ⚠️ {errorMsg}
                </div>
            )}

            {/* STEP 1: VET SELECTION */}
            <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Medical Practitioner</label>
                <select
                    value={selectedVetId}
                    onChange={(e) => setSelectedVetId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                >
                    {vets.map(vet => (
                        <option key={vet.id} value={vet.id}>
                            Dr. {vet.first_name} {vet.last_name} ({vet.clinic_name || 'Veterinarian'})
                        </option>
                    ))}
                    {vets.length === 0 && <option>Dr. Nour El-Din (Certified Vet)</option>}
                </select>
            </div>

            {/* STEP 2: PATIENT DETAILS (Conditional on Auth status) */}
            {token ? (
                // LOGGED-IN: CHOOSE FROM PETS
                <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Choose Pet Patient</label>
                    <div className="flex flex-wrap gap-2">
                        {myPets.map(pet => (
                            <button
                                key={pet.id}
                                type="button"
                                onClick={() => setSelectedPetId(pet.id)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border active:scale-95 ${
                                    selectedPetId === pet.id
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                        : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                                }`}
                            >
                                🐾 {pet.name} ({pet.species})
                            </button>
                        ))}
                        {myPets.length === 0 && (
                            <div className="text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-100 rounded-xl p-2.5 w-full">
                                🐾 No registered pets found. We will automatically register one as "My Pet" for you.
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // GUEST: ENTER INFOMATION FLOW
                <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 flex flex-col gap-3">
                    <div className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">account_circle</span>
                        Frictionless Guest Checkout
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400">First Name</label>
                            <input
                                type="text"
                                placeholder="John"
                                value={guestFirstName}
                                onChange={(e) => setGuestFirstName(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/5 transition-all text-slate-800"
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400">Last Name</label>
                            <input
                                type="text"
                                placeholder="Doe"
                                value={guestLastName}
                                onChange={(e) => setGuestLastName(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/5 transition-all text-slate-800"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400">Your Email (For account & alerts)</label>
                        <input
                            type="email"
                            placeholder="john.doe@example.com"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/5 transition-all text-slate-800"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400">Pet Name</label>
                            <input
                                type="text"
                                placeholder="Charlie"
                                value={guestPetName}
                                onChange={(e) => setGuestPetName(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/5 transition-all text-slate-800"
                                required
                            />
                        </div>
                        
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400">Pet Species</label>
                            <select
                                value={guestPetSpecies}
                                onChange={(e) => setGuestPetSpecies(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/5 transition-all"
                            >
                                <option value="Dog">🐶 Dog</option>
                                <option value="Cat">🐱 Cat</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 3: DATE & TIME SLOT SELECTION */}
            <div className="flex flex-col gap-3">
                {/* Date Tab Selector */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Choose Date</label>
                    <div className="flex gap-2">
                        {availableDates.map((dateObj, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedDateIdx(idx)}
                                className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl border active:scale-95 transition-all cursor-pointer ${
                                    selectedDateIdx === idx
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                        : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                                }`}
                            >
                                <span className="text-[10px] font-bold uppercase tracking-wide">{dateObj.label}</span>
                                <span className="text-[11px] opacity-90 mt-0.5">{dateObj.subLabel}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Time Grid chips */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Available Clinic Hours</label>
                    <div className="grid grid-cols-3 gap-1.5">
                        {slots.map((slot, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedSlot(slot)}
                                className={`py-2 rounded-xl text-center text-xs font-bold border active:scale-95 transition-all cursor-pointer ${
                                    selectedSlot === slot
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                        : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                                }`}
                            >
                                {slot}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* STEP 4: REASON PRE-FILL */}
            <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Symptom Context / Reason</label>
                <textarea
                    rows="2"
                    placeholder="Enter diagnostic request details..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                />
            </div>

            {/* CONFIRM BUTTON */}
            <button
                type="submit"
                disabled={step === 'loading'}
                className="w-full text-center bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-extrabold py-3.5 rounded-[18px] text-xs shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 hover:brightness-105 active:scale-95 transition-all cursor-pointer mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {token ? 'Confirm & Reserve Slot' : 'Create Profile & Book Appointment'}
            </button>
        </form>
    );
};

export default BookingWidget;
