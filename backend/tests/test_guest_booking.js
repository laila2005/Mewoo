// Using native global fetch


async function testGuestBooking() {
    console.log("=== STARTING programmatical guest booking E2E test ===");
    
    const randomSuffix = Math.floor(Math.random() * 10000);
    const guestPayload = {
        first_name: "John",
        last_name: "Doe",
        email: `john.doe.${randomSuffix}@example.com`,
        pet_name: "Charlie",
        pet_species: "Dog",
        vet_user_id: "165aa56c-cf65-436c-b5a8-a1b6b1470d54", // Dr. Nour El-Din
        appointment_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
        reason: "Routine diagnostic checkup via automated E2E test script"
    };

    console.log("1. Sending guest appointment request to backend...");
    console.log("Payload:", JSON.stringify(guestPayload, null, 2));

    try {
        const res = await fetch("http://localhost:5000/api/bookings/guest-appointment", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(guestPayload)
        });

        const data = await res.json();
        if (!res.ok) {
            console.error(`FAILED to create guest booking! Status: ${res.status}`);
            console.error("Error data:", data);
            process.exit(1);
        }

        console.log("SUCCESS! Guest booking confirmed successfully!");
        console.log("Received data structure:");
        console.log("User Email:", data.user?.email);
        console.log("Role:", data.user?.role);
        console.log("Temporary Password:", data.temporary_password);
        console.log("Appointment ID:", data.appointment?.id);
        console.log("Pet ID:", data.appointment?.pet_id);
        console.log("Token length:", data.token?.length);

        if (!data.token || !data.temporary_password || !data.appointment?.id) {
            console.error("FAILED! Missing crucial elements in the response.");
            process.exit(1);
        }

        console.log("\n2. Verifying the session using the returned JWT token...");
        const apptRes = await fetch("http://localhost:5000/api/bookings/appointments", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${data.token}`
            }
        });

        const apptData = await apptRes.json();
        if (!apptRes.ok) {
            console.error(`FAILED to get appointments using JWT! Status: ${apptRes.status}`);
            console.error("Error data:", apptData);
            process.exit(1);
        }

        console.log(`SUCCESS! Retrieved ${apptData.appointments?.length} appointments for the new account.`);
        const found = apptData.appointments?.find(a => a.id === data.appointment.id);
        if (!found) {
            console.error("FAILED! The newly created appointment was not found in the user's booking history.");
            process.exit(1);
        }

        console.log("Found booked appointment match in history:");
        console.log(`- Pet: ${found.pet_name} (${found.species})`);
        console.log(`- Scheduled Time: ${found.appointment_time}`);
        console.log(`- Clinic: ${found.clinic_name}`);
        console.log(`- Status: ${found.status}`);

        console.log("\n3. Testing duplicate email check...");
        const duplicateRes = await fetch("http://localhost:5000/api/bookings/guest-appointment", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(guestPayload)
        });

        const duplicateData = await duplicateRes.json();
        if (duplicateRes.status === 409) {
            console.log("SUCCESS! Duplicate email checkout blocked with status 409 as expected.");
            console.log("Message:", duplicateData.error);
        } else {
            console.error(`FAILED! Expected status 409, but got ${duplicateRes.status}`);
            console.error("Data:", duplicateData);
            process.exit(1);
        }

        console.log("\n=== ALL Programmatic Guest Booking Verification Tests PASSED successfully! ===");
        process.exit(0);
    } catch (err) {
        console.error("E2E Test encountered exception:", err.message);
        process.exit(1);
    }
}

testGuestBooking();
