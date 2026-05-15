# PetPulse: AI Features & Implementation Guide

This document outlines the Artificial Intelligence capabilities integrated into the PetPulse platform, specifically focusing on the **Agentic AI Engine** for smart triage and autonomous appointment booking.

---

## 1. Overview of AI Features

The core AI feature in PetPulse is **Agentic Triage**. When a pet owner inputs their pet's symptoms, the AI doesn't just return static text; it acts as an autonomous agent capable of executing backend functions to help the user immediately.

The AI uses **OpenAI's `gpt-4o-mini` model** combined with **Function Calling (Tool Use)** to perform the following tasks:
1. **Symptom Assessment**: Determines the severity of the issue (e.g., critical emergency vs. routine checkup).
2. **Doctor Discovery**: Queries the PostgreSQL database to find available veterinarians matching the user's needs or requested names.
3. **Availability Checking**: Verifies if specific time slots are open.
4. **Autonomous Booking**: Automatically creates an appointment record in the database.
5. **Notifications**: Triggers push notifications to alert the user of successful bookings.

---

## 2. The Agentic Workflow

The workflow is handled in `backend/src/controllers/aiAgentController.js` and follows a multi-step process:

1. **Initial Prompt**: The user sends their location, pet ID, and a natural language description of the symptoms.
2. **First AI Pass**: The backend sends this data to the OpenAI API along with a list of available "tools" (functions). 
3. **Tool Execution**: If the AI decides a tool is needed (e.g., it needs to find a doctor), it pauses and asks the backend to run the `query_doctor` tool.
4. **Database Interaction**: The Node.js backend executes the SQL query against the database and returns the result (the doctor's ID and name) back to the AI.
5. **Final AI Pass**: The AI processes the database result, finalizes the booking using the `book_appointment` tool, and generates a human-readable summary.
6. **Response**: The final summary is returned to the frontend.

---

## 3. Available AI Tools

The Agent has access to the following backend tools defined in the controller:

- **`query_doctor(name)`**: Searches the database (`users` joined with `vet_profiles`) for a specific veterinarian or trainer by their first or last name.
- **`check_availability(vet_id, datetime)`**: Checks if a specific time slot is available for a given doctor.
- **`book_appointment(vet_id, datetime, reason)`**: Inserts a new record into the `appointments` table for the user's pet and the chosen doctor.
- **`send_push_notification(message)`**: Simulates sending a push notification to the user after a successful booking.

---

## 4. How to Implement & Test

### Step 1: Environment Configuration
To enable the live OpenAI integration, you must provide a valid API key. If the key is missing, the system will gracefully fall back to a **Mock Demo Mode**.

1. Open your `backend/.env` file.
2. Add your OpenAI API key:
   ```env
   OPENAI_API_KEY=sk-your-real-openai-api-key-here
   ```

### Step 2: API Endpoint Usage
The AI triage feature is exposed via a protected REST API endpoint.

**Endpoint:** `POST /api/ai/triage`
**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <your_jwt_token>` (User must be logged in)

**Request Body:**
```json
{
  "symptoms": "My dog max is limping and seems to be in pain when walking.",
  "petId": "uuid-of-the-pet-optional",
  "userLocation": "Cairo, Egypt"
}
```

**Successful Response (200 OK):**
```json
{
  "triage_result": "I have assessed Max's limping. I found Dr. Smith available tomorrow at 10:00 AM and have successfully booked an appointment for you. You will receive a push notification shortly with the details."
}
```

### Step 3: Frontend Integration
To implement this on the frontend:
1. Create a chat interface or a "Smart Triage" form.
2. Capture the user's symptoms in a text area.
3. Make an Axios `POST` request to `/api/ai/triage` with the required payload.
4. Display the `triage_result` string returned by the API to the user in the chat UI.

---

## 5. Security & Rate Limiting

Because the AI endpoint calls external paid APIs (OpenAI) and interacts directly with the database, it is heavily protected:
- **Authentication**: `requireAuth` middleware ensures only verified users can trigger the AI.
- **Input Validation**: `validateBody(schemas.aiTriage)` ensures that the payload is properly formatted and prevents prompt injection attacks.
- **Abuse Monitoring**: Protected by global rate limiters in `server.js` to prevent spamming the OpenAI API and incurring high billing costs.
