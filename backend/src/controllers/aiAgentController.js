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
        const userId = req.user.id;

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
                content: "You are VetAI, an advanced agentic veterinary assistant for PetPulse. " +
                         "First, assess the severity of the pet's issue based on the user's description. " +
                         "If it is a critical emergency, advise them to go to an emergency clinic immediately. " +
                         "If it is not an emergency, extract any mentioned doctor names, use the 'query_doctor' tool to find them, " +
                         "use 'check_availability' to see if a requested time is open, and then use 'book_appointment' to book it. " +
                         "Finally, use 'send_push_notification' to alert the user."
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
