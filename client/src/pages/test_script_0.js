
        const API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:5000/api' : '/api';
        
        function showToast(msg, type='success') {
            Toastify({ text: msg, duration: 3000, style: { background: type==='error'?'#ba1a1a':'#005da7' } }).showToast();
        }

        async function initTrainerDetails() {
            const params = new URLSearchParams(window.location.search);
            const providerId = params.get('id');
            const container = document.getElementById('trainer-details-container');
            
            if (!providerId) {
                container.innerHTML = '<p class="p-6 text-red-500">No provider ID specified.</p>';
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/providers/${providerId}`);
                if (!res.ok) throw new Error('Provider not found');
                
                const data = await res.json();
                const provider = data.provider;
                
                document.title = `${provider.first_name} ${provider.last_name} | PetPulse`;
                
                // Details HTML
                let detailsHTML = '';

                // Banner
                if (provider.cover_url) {
                    detailsHTML += `<div class="w-full h-48 md:h-64 bg-slate-200"><img src="${provider.cover_url}" class="w-full h-full object-cover" alt="Cover photo"></div>`;
                }

                detailsHTML += `
                    <div class="p-6 md:p-8 border-b border-gray-100 flex flex-col md:flex-row gap-6 items-center md:items-start ${provider.cover_url ? '-mt-16 md:-mt-20 relative z-10' : ''}">
                        <img src="${provider.profile_pic_url || 'https://ui-avatars.com/api/?name=' + provider.first_name}" class="w-32 h-32 rounded-full object-cover shadow-md border-4 border-white ${provider.cover_url ? 'bg-white' : ''}">
                        <div class="text-center md:text-left flex-1 ${provider.cover_url ? 'mt-4 md:mt-16' : ''}">
                            <div class="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                                <h1 class="text-3xl font-bold text-gray-900">${provider.first_name} ${provider.last_name}</h1>
                                <span class="badge-verified"><span class="material-symbols-outlined text-[16px]">verified</span> Verified ${provider.type === 'vet' ? 'Veterinarian' : 'Trainer'}</span>
                            </div>
                            <p class="text-blue-600 font-semibold mb-4">${provider.type === 'vet' ? (provider.clinic_name || 'Veterinary Clinic') : (provider.specialties ? provider.specialties.join(', ') : 'Professional Trainer')}</p>
                            <p class="text-gray-600 leading-relaxed">${provider.bio || 'No bio available for this provider.'}</p>
                        </div>
                    </div>
                `;

                // Add specializations section if trainer
                if (provider.type === 'trainer' && provider.specialties && provider.specialties.length > 0) {
                    detailsHTML += `
                        <div class="p-6 md:p-8 border-b border-gray-100">
                            <h2 class="text-xl font-bold mb-6">Specializations</h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                ${provider.specialties.map(spec => `
                                    <div class="flex items-start gap-3">
                                        <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                            <span class="material-symbols-outlined text-[18px]">check_circle</span>
                                        </div>
                                        <div>
                                            <h4 class="font-bold text-gray-900">${spec}</h4>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }

                // Add custom sections
                if (provider.custom_sections && provider.custom_sections.length > 0) {
                    const sectionsObj = typeof provider.custom_sections === 'string' ? JSON.parse(provider.custom_sections) : provider.custom_sections;
                    sectionsObj.forEach(sec => {
                        detailsHTML += `
                            <div class="p-6 md:p-8 border-b border-gray-100">
                                <h2 class="text-xl font-bold mb-4">${sec.title}</h2>
                                <p class="text-gray-600 leading-relaxed whitespace-pre-line">${sec.content}</p>
                            </div>
                        `;
                    });
                }

                container.innerHTML = detailsHTML;
                
                // Update booking title
                document.querySelector('h2.text-xl.font-bold').textContent = provider.type === 'vet' ? 'Book Consultation' : 'Book Training Session';
                
            } catch (error) {
                console.error(error);
                container.innerHTML = '<p class="p-6 text-red-500">Error loading provider details.</p>';
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            initTrainerDetails();
            
            const timeSlots = document.querySelectorAll('.time-slot');
            timeSlots.forEach(slot => {
                slot.addEventListener('click', () => {
                    timeSlots.forEach(s => s.classList.remove('selected'));
                    slot.classList.add('selected');
                });
            });

            document.getElementById('confirm-booking-btn').addEventListener('click', () => {
                const date = document.getElementById('booking-date').value;
                const time = document.querySelector('.time-slot.selected');
                const token = localStorage.getItem('token');
                
                if (!token) {
                    window.location.href = 'login.html';
                    return;
                }
                
                if (!date || !time) {
                    showToast('Please select both a date and a time slot.', 'error');
                    return;
                }
                
                const btn = document.getElementById('confirm-booking-btn');
                btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">refresh</span> Processing...';
                btn.disabled = true;
                
                setTimeout(() => {
                    btn.innerHTML = 'Booking Confirmed!';
                    btn.classList.replace('bg-blue-600', 'bg-green-600');
                    btn.classList.replace('hover:bg-blue-700', 'hover:bg-green-700');
                    showToast('Your session has been successfully booked!');
                }, 1500);
            });
            
            // Load Nav Profile
            const token = localStorage.getItem('token');
            if(token) {
                fetch(`${API_BASE}/users/profile`, { headers: { 'Authorization': `Bearer ${token}` } })
                .then(r => r.json())
                .then(d => {
                    if(d.user) document.getElementById('navAvatar').src = d.user.profile_pic_url || d.user.avatar_url || 'https://via.placeholder.com/40';
                }).catch(e=>console.error(e));
            }
        });
    