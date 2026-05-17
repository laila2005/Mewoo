import OpenAI from 'openai';
import { query } from '../config/db.js';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'missing_key'
});

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
    }
];

export const agenticTriage = async (req, res) => {
    try {
        const { symptoms, petId, userLocation } = req.body;
        const userId = req.user ? req.user.id : null;

        if (!symptoms) {
            return res.status(400).json({ error: 'Symptoms are required for triage' });
        }

        // If no API key is provided, gracefully mock the agent response for the demo
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'missing_key') {
            console.log("Mocking Agentic AI Response because OPENAI_API_KEY is missing.");
            return res.status(200).json({
                triage_result: `[Agentic AI Demo Mode] I assessed the symptoms: "${symptoms}". I searched the database for an available doctor and booked an appointment for tomorrow. A push notification has been sent! (Note: Add OPENAI_API_KEY to .env to enable real GPT-4o-mini agent workflow).`
            });
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
    <a href="trainer-details.html?id=[PROVIDER_ID]" class="bot-card-btn">Book Consultation</a>
</div>

2. Recommending Adoption:
<div class="bot-card mt-2">
    <img src="[PET_IMAGE_URL]" style="width:100%; height:120px; object-fit:cover;" />
    <div class="p-3">
        <div class="font-bold text-slate-800">[PET_NAME]</div>
        <div class="text-xs text-slate-500">[BREED]</div>
    </div>
    <a href="community.html#adoptions" class="bot-card-btn">View Adoption Center</a>
</div>`
            },
            {
                role: "user",
                content: `My location is ${userLocation}. My pet's symptoms/request: ${symptoms}`
            }
        ];

        // 1. Initial Call to GPT-4o-mini
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
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
                            `SELECT user_id, first_name, last_name FROM users JOIN vet_profiles ON users.id = vet_profiles.user_id WHERE first_name ILIKE $1 OR last_name ILIKE $1 LIMIT 1`,
                            [`%${args.name}%`]
                        );
                        if (doctorRes.rows.length > 0) {
                            functionResult = JSON.stringify(doctorRes.rows[0]);
                        } else {
                            functionResult = "Doctor not found.";
                        }
                    } 
                    else if (functionName === "check_availability") {
                        // In a real app, query existing appointments. Assuming available for demo purposes.
                        functionResult = JSON.stringify({ available: true, slot: args.datetime });
                    }
                    else if (functionName === "book_appointment") {
                        if (!userId) {
                            functionResult = JSON.stringify({ error: "User is not logged in. Tell the user they must log in to book appointments or adopt pets." });
                        } else {
                            // Ensure pet exists
                            let final_pet_id = petId;
                            if (!final_pet_id) {
                                const petRes = await query('SELECT id FROM pets WHERE owner_id = $1 LIMIT 1', [userId]);
                                if (petRes.rows.length > 0) {
                                    final_pet_id = petRes.rows[0].id;
                                } else {
                                    const newPet = await query('INSERT INTO pets (owner_id, name, species) VALUES ($1, $2, $3) RETURNING id', [userId, 'My Pet', 'Unknown']);
                                    final_pet_id = newPet.rows[0].id;
                                }
                            }
                            
                            // Create appointment
                            const aptRes = await query(
                                `INSERT INTO appointments (pet_id, vet_user_id, appointment_time, reason) VALUES ($1, $2, $3, $4) RETURNING id`,
                                [final_pet_id, args.vet_id, args.datetime, args.reason]
                            );
                            functionResult = JSON.stringify({ success: true, appointment_id: aptRes.rows[0].id });
                        }
                    }
                    else if (functionName === "send_push_notification") {
                        console.log(`[PUSH NOTIFICATION TO USER ${userId}]: ${args.message}`);
                        functionResult = JSON.stringify({ success: true, delivered: true });
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
            const secondResponse = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: messages,
            });

            return res.status(200).json({ triage_result: secondResponse.choices[0].message.content });
        }

        // If no tool was called, return standard text response
        res.status(200).json({ triage_result: responseMessage.content });

    } catch (error) {
        console.error('Agentic AI execution error:', error);
        res.status(500).json({ error: 'Failed to process agentic triage workflow.' });
    }
};
