async function testUpdate() {
    try {
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'lolo@gmail.com', password: 'password123' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log("Logged in");

        const updateRes = await fetch('http://localhost:5000/api/auth/profile', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                first_name: 'Laila',
                last_name: 'Mohamed',
                bio: 'I have a Beautiful cat Named kity',
                custom_sections: []
            })
        });
        const updateData = await updateRes.json();
        if (!updateRes.ok) throw new Error(JSON.stringify(updateData));
        console.log("Success:", updateData);
    } catch (e) {
        console.error("Error:", e.message);
    }
}
testUpdate();
