import { query } from '../config/db.js';
import { getCompatClient } from '../ai/llmClient.js';
import { buildTools } from '../ai/tools.js';
import { toCairoISO } from '../ai/bookingFlow.js';
import dotenv from 'dotenv';
dotenv.config();

// HTML-escape any dynamic value before interpolating it into a card string —
// defense-in-depth against stored XSS (the client also DOMPurifies on render).
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Define the tools for the Agent
const agentTools = [
    {
        type: "function",
        function: {
            name: "query_doctor",
            description: "Search the database for a specific veterinarian or trainer by their first or last name.",
            parameters: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        description: "The name of the doctor or trainer to search for."
                    }
                },
                required: ["name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "check_availability",
            description: "Check if a specific time slot is available for a given doctor.",
            parameters: {
                type: "object",
                properties: {
                    vet_id: { type: "string", description: "The UUID of the doctor." },
                    datetime: { type: "string", description: "The requested appointment time (YYYY-MM-DD HH:MM:SS format)." }
                },
                required: ["vet_id", "datetime"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "book_appointment",
            description: "Book an appointment for the user with the specified doctor.",
            parameters: {
                type: "object",
                properties: {
                    vet_id: { type: "string", description: "The UUID of the doctor." },
                    datetime: { type: "string", description: "The appointment time." },
                    reason: { type: "string", description: "The reason for the appointment." }
                },
                required: ["vet_id", "datetime", "reason"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "send_push_notification",
            description: "Send a push notification to the user after a successful booking.",
            parameters: {
                type: "object",
                properties: {
                    message: { type: "string", description: "The notification message." }
                },
                required: ["message"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "find_mating_partners",
            description: "Search the database for active, compatible mating profiles of pets (same species, opposite gender).",
            parameters: {
                type: "object",
                properties: {
                    species: { type: "string", description: "The species of the pet to find a mate for (strictly required, e.g. 'Dog', 'Cat')." },
                    gender: { type: "string", description: "The opposite gender of the user's pet (strictly required, e.g., if user pet is male, gender should be 'female')." },
                    breed: { type: "string", description: "Optional breed filter." },
                    location: { type: "string", description: "Optional location filter." }
                },
                required: ["species", "gender"]
            }
        }
    }
];

const logTriage = async (userId, petId, symptoms, result) => {
    try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let validPetId = null;
        if (petId && uuidRegex.test(petId)) {
            const petCheck = await query('SELECT id FROM pets WHERE id = $1', [petId]);
            if (petCheck.rows.length > 0) {
                validPetId = petId;
            }
        }
        
        let validUserId = null;
        if (userId && uuidRegex.test(userId)) {
            const userCheck = await query('SELECT id FROM users WHERE id = $1', [userId]);
            if (userCheck.rows.length > 0) {
                validUserId = userId;
            }
        }

        await query(
            `INSERT INTO ai_triages (user_id, pet_id, symptoms, result) VALUES ($1, $2, $3, $4)`,
            [validUserId, validPetId, symptoms, result]
        );
    } catch (dbErr) {
        console.error('Error logging AI triage to database:', dbErr);
    }
};

export const agenticTriage = async (req, res) => {
    try {
        const { symptoms, petId, userLocation } = req.body;
        const userId = req.user ? req.user.id : null;

        if (!symptoms) {
            return res.status(400).json({ error: 'Symptoms are required for triage' });
        }

        // If no live AI provider is configured, gracefully mock the agent response for the demo
        const ai = getCompatClient();
        if (ai.isMock) {
            console.log("Mocking Agentic AI Response because no live AI provider is configured.");
            
            const isBookingQuery = /book|schedul|appoint|vet|doctor|nour|youssef|clinic|consult/i.test(symptoms);
            const isMatingQuery = /mate|mating|match|matchmaking/i.test(symptoms);
            
            let mockResponse = '';
            if (isMatingQuery) {
                // Determine species and gender filter dynamically
                let speciesFilter = 'Dog';
                if (/cat/i.test(symptoms)) speciesFilter = 'Cat';
                
                let targetGender = 'female';
                if (/female|girl|she/i.test(symptoms)) {
                    targetGender = 'female';
                } else if (/male|boy|he/i.test(symptoms)) {
                    targetGender = 'male';
                }
                
                // If user is logged in, query user's pets to find opposite gender automatically
                if (userId) {
                    try {
                        const userPets = await query('SELECT * FROM pets WHERE owner_id = $1', [userId]);
                        if (userPets.rows.length > 0) {
                            const firstPet = userPets.rows[0];
                            speciesFilter = firstPet.species || 'Dog';
                            targetGender = (firstPet.gender || 'male').toLowerCase() === 'male' ? 'female' : 'male';
                        }
                    } catch (err) {
                        console.error('Error fetching user pets for mock matchmaking:', err);
                    }
                }
                
                // Now query matching candidate pets in Pet Match (is_mating = true)
                let matches = [];
                try {
                    const matingRes = await query(
                        `SELECT p.*, u.first_name as owner_first_name, u.last_name as owner_last_name, u.profile_pic_url as owner_profile_pic 
                         FROM pets p 
                         JOIN users u ON p.owner_id = u.id 
                         WHERE p.is_mating = TRUE 
                           AND p.species ILIKE $1 
                           AND p.gender = $2
                           AND p.owner_id != $3`,
                        [speciesFilter, targetGender, userId || '00000000-0000-0000-0000-000000000000']
                    );
                    matches = matingRes.rows;
                    
                    // Fallback to general mating if no perfect species/gender matches are found
                    if (matches.length === 0) {
                        const generalRes = await query(
                            `SELECT p.*, u.first_name as owner_first_name, u.last_name as owner_last_name, u.profile_pic_url as owner_profile_pic 
                             FROM pets p 
                             JOIN users u ON p.owner_id = u.id 
                             WHERE p.is_mating = TRUE 
                               AND p.owner_id != $1
                             LIMIT 3`,
                            [userId || '00000000-0000-0000-0000-000000000000']
                        );
                        matches = generalRes.rows;
                    }
                } catch (dbErr) {
                    console.error('Mock matchmaking database error:', dbErr);
                }
                
                mockResponse = `I assessed your request: "${symptoms}". I've initiated my Agentic Matchmaking protocol to find compatible mating partners for your pet:`;
                
                if (matches.length === 0) {
                    mockResponse += `\n\nNo other active mating profiles were found in the database. Be the first to list your pet for mating in the Mating Center!`;
                } else {
                    matches.forEach(pet => {
                        mockResponse += `
                        <div class="mating-match-card bg-white border border-rose-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow mt-3 max-w-[280px]">
                            <div class="h-28 relative">
                                <img src="${esc(pet.avatar_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400')}" class="w-full h-full object-cover" />
                                <span class="absolute top-2 right-2 bg-pink-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">${esc(pet.gender || 'mating')}</span>
                            </div>
                            <div class="p-3">
                                <div class="font-extrabold text-slate-800 text-xs">${esc(pet.name)}, ${esc(pet.age_years)} yrs</div>
                                <div class="text-[10px] text-slate-500 font-semibold flex items-center gap-0.5 mb-1.5">
                                    <span class="material-symbols-outlined text-[12px] text-slate-400">location_on</span> ${esc(pet.location || 'Cairo, Egypt')}
                                </div>
                                <p class="text-[10px] text-slate-600 line-clamp-2 italic mb-2">"${esc(pet.bio || 'No description listed.')}"</p>
                                <button class="w-full bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 font-extrabold py-2 rounded-xl text-[10px] transition-all active:scale-95 propose-ai-match-btn" data-target-id="${esc(pet.id)}" data-target-name="${esc(pet.name)}" data-target-species="${esc(pet.species || 'Dog')}" data-target-gender="${esc(pet.gender || 'female')}">
                                    🐾 Propose Mating Match
                                </button>
                            </div>
                        </div>`;
                    });
                }
            } else if (isBookingQuery) {
                mockResponse = `I've analyzed your request: "${symptoms}". I highly recommend scheduling a consultation. You can select your preferred vet and complete the booking directly within this live chat panel below:`;
                mockResponse += `\n\n<div class="booking-flow" data-reason="${symptoms.replace(/"/g, '&quot;')}"></div>`;
            } else {
                // Mock standard response
                mockResponse = `I assessed your request: "${symptoms}". Since I am in demo mode without my OpenAI API key, I'm simulating my agentic workflow. I found an excellent vet for you and prepared a booking link:`;
                mockResponse += `
                <div class="bot-card mt-2">
                    <div class="p-3 flex items-center gap-3">
                        <img src="https://ui-avatars.com/api/?name=Sarah+Chen&background=0D8ABC&color=fff" class="w-10 h-10 rounded-full border border-gray-200" />
                        <div>
                            <div class="font-bold text-slate-800" style="font-size:14px;">Dr. Sarah Chen</div>
                            <div class="text-xs text-slate-500">Veterinary Surgeon • ⭐ 4.9</div>
                        </div>
                    </div>
                    <a href="/checkout" class="bot-card-btn block text-center bg-slate-50 py-2 border-t border-slate-200 text-blue-600 font-semibold hover:bg-slate-100 transition-colors">Book Consultation</a>
                </div>`;
            }

            await logTriage(userId, petId, symptoms, mockResponse);
            return res.status(200).json({ triage_result: mockResponse });
        }

        const messages = [
            {
                role: "system",
                content: `You are VetAI, the exclusive, intelligent agentic assistant for PetPulse.
Your goal is to act as a highly proactive, professional, and empathetic concierge.

### Your Core Capabilities:
1. Medical Triage & Vet Booking: If symptoms seem urgent, recommend an Emergency Vet. If not, use 'query_doctor' to find vets, 'check_availability', and 'book_appointment'.
2. Adoption Matchmaking: If users want to adopt, recommend pets and output adoption cards.
3. Behavioral Support: Suggest trainers and output trainer cards.
4. Navigation: Help users navigate the site.
5. Mating Matchmaking: If users want to find a mating partner for their pet, use 'find_mating_partners' and output mating match cards.

### Guardrails:
- NEVER output large walls of text.
- NEVER prescribe medication.

### UI Action Cards (Output these EXACT HTML blocks when recommending):
1. Recommending a Vet/Trainer:
<div class="bot-card mt-2">
    <div class="p-3 flex items-center gap-3">
        <img src="[PROFILE_PIC_URL]" class="w-10 h-10 rounded-full border border-gray-200" />
        <div>
            <div class="font-bold text-slate-800" style="font-size:14px;">[NAME]</div>
            <div class="text-xs text-slate-500">[CLINIC_OR_SPECIALTY] • ⭐ 4.9</div>
        </div>
    </div>
    <a href="/trainer-details?id=[PROVIDER_ID]" class="bot-card-btn">Book Consultation</a>
</div>

2. Recommending Adoption:
<div class="bot-card mt-2">
    <img src="[PET_IMAGE_URL]" style="width:100%; height:120px; object-fit:cover;" />
    <div class="p-3">
        <div class="font-bold text-slate-800">[PET_NAME]</div>
        <div class="text-xs text-slate-500">[BREED]</div>
    </div>
    <a href="/community#adoptions" class="bot-card-btn">View Adoption Center</a>
</div>

3. Vet Booking Flow Wizard:
If the user wants to book an appointment, or describes symptoms that need a vet consult, or asks to book a vet, output this EXACT block to launch the interactive live booking wizard:
<div class="booking-flow" data-vet-id="[VET_ID_OR_EMPTY]" data-vet-name="[VET_NAME_OR_EMPTY]" data-reason="[PRE_FILLED_REASON_OR_SYMPTOMS]"></div>

4. Mating Match Card:
If you are recommending a compatible mating partner (always opposite gender, same species), output this EXACT block for EACH pet you match:
<div class="mating-match-card bg-white border border-rose-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow mt-3 max-w-[280px]">
    <div class="h-28 relative">
        <img src="[AVATAR_URL_OR_DEFAULT_IMAGE]" class="w-full h-full object-cover" />
        <span class="absolute top-2 right-2 bg-pink-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">[GENDER]</span>
    </div>
    <div class="p-3">
        <div class="font-extrabold text-slate-800 text-xs">[NAME], [AGE] yrs</div>
        <div class="text-[10px] text-slate-500 font-semibold flex items-center gap-0.5 mb-1.5">
            <span class="material-symbols-outlined text-[12px] text-slate-400">location_on</span> [LOCATION]
        </div>
        <p class="text-[10px] text-slate-600 line-clamp-2 italic mb-2">"[BIO]"</p>
        <button class="w-full bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 font-extrabold py-2 rounded-xl text-[10px] transition-all active:scale-95 propose-ai-match-btn" data-target-id="[PET_ID]" data-target-name="[PET_NAME]" data-target-species="[SPECIES]" data-target-gender="[GENDER]">
            🐾 Propose Mating Match
        </button>
    </div>
</div>`
            },
            {
                role: "user",
                content: `My location is ${userLocation}. My pet's symptoms/request: ${symptoms}`
            }
        ];

        // 1. Initial call to the shared open-source provider (Groq/Ollama)
        const response = await ai.client.chat.completions.create({
            model: ai.model,
            messages: messages,
            tools: agentTools,
            tool_choice: "auto",
        });

        const responseMessage = response.choices[0].message;

        // 2. Check if the model decided to call a function
        if (responseMessage.tool_calls) {
            messages.push(responseMessage); // Append the tool call to history

            for (const toolCall of responseMessage.tool_calls) {
                const functionName = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments);
                let functionResult = "";

                try {
                    if (functionName === "query_doctor") {
                        const doctorRes = await query(
                            `SELECT id as user_id, first_name, last_name, role FROM users WHERE (first_name ILIKE $1 OR last_name ILIKE $1) AND role IN ('vet', 'trainer') LIMIT 1`,
                            [`%${args.name}%`]
                        );
                        if (doctorRes.rows.length > 0) {
                            functionResult = JSON.stringify(doctorRes.rows[0]);
                        } else {
                            functionResult = "Doctor or trainer not found.";
                        }
                    } 
                    else if (functionName === "check_availability") {
                        const aptQuery = await query(
                            `SELECT id FROM appointments WHERE vet_user_id = $1 AND appointment_time = $2`,
                            [args.vet_id, args.datetime]
                        );
                        if (aptQuery.rows.length > 0) {
                            functionResult = JSON.stringify({ available: false, message: "That time slot is already booked." });
                        } else {
                            functionResult = JSON.stringify({ available: true, slot: args.datetime });
                        }
                    }
                    else if (functionName === "book_appointment") {
                        if (!userId) {
                            functionResult = JSON.stringify({ error: "User is not logged in. Tell the user they must log in to book appointments or adopt pets." });
                        } else {
                            // Resolve the user's pet — never auto-create a junk "My Pet".
                            let final_pet_id = petId;
                            if (!final_pet_id) {
                                const petRes = await query('SELECT id FROM pets WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1', [userId]);
                                final_pet_id = petRes.rows[0]?.id || null;
                            }
                            if (!final_pet_id) {
                                functionResult = JSON.stringify({ error: "No pet on file. Ask the user to add a pet profile before booking." });
                            } else {
                                // Route through the hardened tool: pet-ownership + vet-role
                                // + Cairo working-hours + double-book checks, DST-correct time.
                                const secureTools = buildTools({ userId });
                                const r = await secureTools.bookAppointment.execute({
                                    pet_id: final_pet_id,
                                    vet_user_id: args.vet_id,
                                    appointment_time: toCairoISO(args.datetime),
                                    reason: args.reason || 'General check-up',
                                });
                                functionResult = JSON.stringify(r);
                            }
                        }
                    }
                    else if (functionName === "send_push_notification") {
                        console.log(`[PUSH NOTIFICATION TO USER ${userId}]: ${args.message}`);
                        functionResult = JSON.stringify({ success: true, delivered: true });
                    }
                    else if (functionName === "find_mating_partners") {
                        let matches = [];
                        try {
                            const matingRes = await query(
                                `SELECT p.*, u.first_name as owner_first_name, u.last_name as owner_last_name, u.profile_pic_url as owner_profile_pic 
                                 FROM pets p 
                                 JOIN users u ON p.owner_id = u.id 
                                 WHERE p.is_mating = TRUE 
                                   AND p.species ILIKE $1 
                                   AND p.gender = $2
                                   AND p.owner_id != $3`,
                                [args.species, args.gender, userId || '00000000-0000-0000-0000-000000000000']
                            );
                            matches = matingRes.rows;
                            
                            // Fallback to general mating if no perfect species/gender matches are found
                            if (matches.length === 0) {
                                const generalRes = await query(
                                    `SELECT p.*, u.first_name as owner_first_name, u.last_name as owner_last_name, u.profile_pic_url as owner_profile_pic 
                                     FROM pets p 
                                     JOIN users u ON p.owner_id = u.id 
                                     WHERE p.is_mating = TRUE 
                                       AND p.owner_id != $1
                                     LIMIT 3`,
                                    [userId || '00000000-0000-0000-0000-000000000000']
                                );
                                matches = generalRes.rows;
                            }
                            functionResult = JSON.stringify({ success: true, matches });
                        } catch (dbErr) {
                            console.error('Error fetching mating partners:', dbErr);
                            functionResult = JSON.stringify({ error: "Database operation failed." });
                        }
                    }
                } catch (dbErr) {
                    console.error(`Tool execution error for ${functionName}:`, dbErr);
                    functionResult = JSON.stringify({ error: "Database operation failed." });
                }

                // Append the function response
                messages.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: functionName,
                    content: functionResult,
                });
            }

            // 3. Get final response from the model after tool execution
            const secondResponse = await ai.client.chat.completions.create({
                model: ai.model,
                messages: messages,
            });

            const finalResult = secondResponse.choices[0].message.content;
            await logTriage(userId, petId, symptoms, finalResult);
            return res.status(200).json({ triage_result: finalResult });
        }

        // If no tool was called, return standard text response
        const finalResult = responseMessage.content;
        await logTriage(userId, petId, symptoms, finalResult);
        res.status(200).json({ triage_result: finalResult });

    } catch (error) {
        console.error('Agentic AI execution error:', error);
        res.status(500).json({ error: 'Failed to process agentic triage workflow.' });
    }
};
