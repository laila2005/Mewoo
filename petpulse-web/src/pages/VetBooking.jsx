import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import DiscoverySidebar from '../components/layout/DiscoverySidebar';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const VetBooking = () => {
    const navigate = useNavigate();
    
    const [vets, setVets] = useState([]);
    const [trainers, setTrainers] = useState([]);
    const [adoptablePets, setAdoptablePets] = useState([]);
    const [matingPets, setMatingPets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [providersRes, adoptableRes, matingRes] = await Promise.all([
                    axios.get(`${API_BASE}/providers`).catch(() => ({ data: { vets: [], trainers: [] } })),
                    axios.get(`${API_BASE}/pets/adoptable`).catch(() => ({ data: { pets: [] } })),
                    axios.get(`${API_BASE}/pets/mating`).catch(() => ({ data: { pets: [] } }))
                ]);

                setVets(providersRes.data.vets || []);
                setTrainers(providersRes.data.trainers || []);
                setAdoptablePets(adoptableRes.data.pets || []);
                setMatingPets(matingRes.data.pets || []);
            } catch (error) {
                console.error("Error fetching explore data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)] w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
            <DiscoverySidebar />
            
            <main className="flex-1 min-w-0 space-y-12 sm:space-y-16">
                
                {/* Header section */}
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div className="space-y-2">
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Explore Local Care</h1>
                            <div className="flex items-center gap-2 text-slate-500">
                                <span className="material-symbols-outlined text-sm sm:text-base text-blue-600">location_on</span>
                                <p className="text-xs sm:text-sm">Showing services near <span className="font-bold text-slate-800">Current Location</span></p>
                            </div>
                        </div>
                        <button className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all text-xs sm:text-sm bg-white shadow-sm">
                            <span className="material-symbols-outlined text-[18px]">edit_location</span>
                            Change Location
                        </button>
                    </div>
                </section>

                {/* Vets Section */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-blue-600">medical_services</span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Nearby Veterinarians</h2>
                        </div>
                    </div>
                    
                    <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 hide-scrollbar snap-x">
                        {loading ? (
                            <p className="text-slate-500 text-sm p-4">Loading veterinarians...</p>
                        ) : vets.length > 0 ? (
                            vets.map(vet => (
                                <div key={vet.id} onClick={() => navigate(`/owner-profile?id=${vet.id}`)} className="min-w-[280px] sm:min-w-[320px] bg-white rounded-2xl p-6 border border-slate-100 snap-start shrink-0 shadow-sm hover:shadow-xl transition-all cursor-pointer">
                                    <div className="flex items-start gap-4 mb-4">
                                        <img src={vet.profile_pic_url || 'https://ui-avatars.com/api/?name=Vet'} alt="Vet" className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-50" />
                                        <div>
                                            <h3 className="font-bold text-slate-900">Dr. {vet.first_name} {vet.last_name}</h3>
                                            <p className="text-slate-500 text-sm">{vet.clinic_name || 'Veterinary Clinic'}</p>
                                            <div className="flex items-center gap-1 mt-1 text-amber-500">
                                                <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                                <span className="font-bold text-sm">4.9</span>
                                                <span className="text-slate-400 text-xs">(120)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-600">General Practice</span>
                                        {vet.is_emergency && <span className="px-2.5 py-1 bg-red-100 text-red-600 rounded-md text-xs font-bold">Emergency</span>}
                                    </div>
                                    <button className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm">
                                        Book Consult
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-500 text-sm p-4">No veterinarians found nearby.</p>
                        )}
                    </div>
                </section>

                {/* Trainers Section */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-emerald-600">sports_score</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Professional Trainers</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {loading ? (
                            <p className="text-slate-500 text-sm p-4 col-span-full">Loading trainers...</p>
                        ) : trainers.length > 0 ? (
                            trainers.map(trainer => (
                                <div key={trainer.id} onClick={() => navigate(`/owner-profile?id=${trainer.id}`)} className="group bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 text-center shadow-sm hover:shadow-xl transition-all cursor-pointer">
                                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5">
                                        <img src={trainer.profile_pic_url || `https://ui-avatars.com/api/?name=${trainer.first_name}`} alt="Trainer" className="w-full h-full rounded-full object-cover border-4 border-slate-50" />
                                        <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center border-4 border-white">
                                            <span className="material-symbols-outlined text-sm">verified</span>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-900">{trainer.first_name} {trainer.last_name}</h3>
                                    <p className="text-emerald-600 font-bold text-xs sm:text-sm mb-4">{trainer.specialties ? trainer.specialties.join(', ') : 'Professional Trainer'}</p>
                                    <button className="w-full bg-emerald-50 text-emerald-600 py-2.5 rounded-xl font-bold hover:bg-emerald-600 hover:text-white transition-colors text-sm">
                                        View Profile
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-500 text-sm p-4 col-span-full">No trainers found nearby.</p>
                        )}
                    </div>
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
                    {/* Adoptable Pets */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-blue-600">volunteer_activism</span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Pets for Adoption</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {loading ? (
                                <p className="text-slate-500 text-sm p-4">Loading adoptable pets...</p>
                            ) : adoptablePets.length > 0 ? (
                                adoptablePets.slice(0, 4).map(pet => (
                                    <Link key={pet.id} to={`/pet-profile?id=${pet.id}`} className="bg-white rounded-2xl overflow-hidden border border-slate-100 flex shadow-sm hover:shadow-xl transition-all group">
                                        <div className="w-1/3 bg-slate-100 overflow-hidden">
                                            <img src={pet.avatar_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200'} alt={pet.name} className="w-full h-full object-cover min-h-[120px] group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col justify-center">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{pet.name}</h3>
                                            </div>
                                            <p className="text-slate-500 text-xs sm:text-sm mb-2">{pet.breed || 'Mixed'} • {pet.age_years || '?'} yrs</p>
                                            <span className="text-blue-600 font-bold text-xs mt-auto">Available Now</span>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-slate-500 text-sm p-4">No adoptable pets found.</p>
                            )}
                        </div>
                    </div>

                    {/* Mating Pets */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-pink-600">pets</span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Pets for Mating</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {loading ? (
                                <p className="text-slate-500 text-sm p-4">Loading mating pets...</p>
                            ) : matingPets.length > 0 ? (
                                matingPets.slice(0, 4).map(pet => (
                                    <Link key={pet.id} to={`/pet-profile?id=${pet.id}`} className="bg-white rounded-2xl overflow-hidden border border-slate-100 flex shadow-sm hover:shadow-xl transition-all group">
                                        <div className="w-1/3 bg-slate-100 overflow-hidden">
                                            <img src={pet.avatar_url || 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=200'} alt={pet.name} className="w-full h-full object-cover min-h-[120px] group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col justify-center">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-bold text-slate-900 group-hover:text-pink-600 transition-colors">{pet.name}</h3>
                                            </div>
                                            <p className="text-slate-500 text-xs sm:text-sm mb-2">{pet.breed || 'Purebred'} • {pet.age_years || '?'} yrs</p>
                                            <span className="text-pink-600 font-bold text-xs mt-auto">Seeking Mate</span>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-slate-500 text-sm p-4">No pets seeking mating found.</p>
                            )}
                        </div>
                    </div>
                </section>

                <section className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
                    <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Service Map</h2>
                            <p className="text-slate-500 text-sm mt-1">Showing veterinarians, trainers & shelters near you</p>
                        </div>
                    </div>
                    <div className="h-64 sm:h-80 md:h-96 w-full bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined text-5xl mb-3">map</span>
                        <p className="font-bold text-slate-500">Interactive Map View</p>
                        <p className="text-sm">Location services integration placeholder.</p>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default VetBooking;
