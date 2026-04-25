import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { DynamicTool } from "@langchain/core/tools";

// Mock tools for the Agent to use
const searchNearbyVetsTool = new DynamicTool({
    name: "search_vets_nearby",
    description: "Use this to search for nearby veterinary clinics based on user location. Returns a list of clinics with their IDs, names, distance, and current availability status. Input should be the word 'search'.",
    func: async (input) => {
        // In a real implementation, this would query the PostGIS database via the backend API.
        return JSON.stringify([
            { id: "v1", name: "Downtown Pet Hospital", distance: "2 miles", open_now: true, emergency: true },
            { id: "v2", name: "Happy Tails Clinic", distance: "4 miles", open_now: false, emergency: false }
        ]);
    },
});

const bookVetAppointmentTool = new DynamicTool({
    name: "book_appointment",
    description: "Use this to hold or book an appointment at a vet clinic. Input must be a JSON string with 'vet_id' and 'reason'.",
    func: async (input) => {
        // In a real implementation, this would call the internal backend booking endpoint.
        try {
            const { vet_id, reason } = JSON.parse(input);
            return `Successfully booked appointment at vet ${vet_id} for reason: ${reason}. Confirmation code: BKG-${Math.floor(Math.random()*1000)}`;
        } catch (e) {
            return "Failed to parse input. Ensure it is a valid JSON string with vet_id and reason.";
        }
    },
});

const tools = [searchNearbyVetsTool, bookVetAppointmentTool];

export async function runVetTriageAgent({ userId, petId, symptoms, userLocation }) {
    // 1. Initialize the LLM (ensure OPENAI_API_KEY is in your .env)
    // We are using gpt-4o-mini as it is highly capable for tool-calling but extremely cost-effective.
    const model = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0,
    });

    // 2. Create the Prompt Template
    const prompt = ChatPromptTemplate.fromMessages([
        [
            "system",
            `You are the PetPulse Autonomous Vet Triage Agent. Your goal is to help pet owners who report symptoms.
            1. First, analyze the symptoms briefly. Determine if it sounds like an emergency.
            2. If it sounds like an emergency or serious issue, you MUST use the search_vets_nearby tool to find open emergency clinics.
            3. Then, proactively use the book_appointment tool to hold a spot at the nearest open emergency vet for the user.
            4. Finally, summarize what you did for the user and provide the booking confirmation.
            
            Current context:
            User ID: {userId}
            Pet ID: {petId}
            User Location (Lat/Lng): {userLocation}`
        ],
        ["user", "My pet is experiencing the following symptoms: {input}"],
        new MessagesPlaceholder("agent_scratchpad"),
    ]);

    // 3. Create the Agent
    const agent = await createOpenAIToolsAgent({
        llm: model,
        tools,
        prompt,
    });

    const agentExecutor = new AgentExecutor({
        agent,
        tools,
        verbose: true, // Set to true to see the reasoning steps in console
    });

    // 4. Run the Agent
    const result = await agentExecutor.invoke({
        input: symptoms,
        userId: userId || "unknown",
        petId: petId || "unknown",
        userLocation: JSON.stringify(userLocation || { lat: 0, lng: 0 })
    });

    return result.output;
}
