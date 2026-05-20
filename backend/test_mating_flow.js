// Native fetch is global in Node v22

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log("🚀 Starting Mating Flow Option B End-to-End Tests...");
  let passed = 0;
  let failed = 0;

  const assert = (condition, name, details = '') => {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name} ${details}`);
      failed++;
    }
  };

  try {
    const timestamp = Date.now();
    const emailA = `owner_a_${timestamp}@example.com`;
    const emailB = `owner_b_${timestamp}@example.com`;
    const password = 'Password123!';

    // 1. Sign up User A
    let res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: 'Owner',
        last_name: 'Alpha',
        email: emailA,
        password: password,
        role: 'owner'
      })
    });
    const userAData = await res.json();
    assert(res.status === 201, 'Register User A', `Status: ${res.status}`);
    const tokenA = userAData.token;

    // 2. Sign up User B
    res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: 'Owner',
        last_name: 'Beta',
        email: emailB,
        password: password,
        role: 'owner'
      })
    });
    const userBData = await res.json();
    assert(res.status === 201, 'Register User B', `Status: ${res.status}`);
    const tokenB = userBData.token;

    if (!tokenA || !tokenB) {
      throw new Error('Registration failed, skipping subsequent tests');
    }

    // 3. Register Pet A (Dog, Male, listed for mating) for User A
    res = await fetch(`${API_BASE}/pets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: 'Rocky',
        species: 'Dog',
        breed: 'German Shepherd',
        age_years: 3.5,
        weight_kg: 32,
        gender: 'male',
        location: 'Zamalek, Cairo',
        bio: 'Healthy and pedigree certified male champion.',
        is_mating: true,
        avatar_url: 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95'
      })
    });
    const petAData = await res.json();
    assert(res.status === 201, 'Register and List Pet A', `Status: ${res.status}`);
    const petAId = petAData.pet.id;

    // 4. Register Pet B (Dog, Female, not listed for mating) for User B
    res = await fetch(`${API_BASE}/pets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        name: 'Bella',
        species: 'Dog',
        breed: 'German Shepherd',
        age_years: 2.8,
        weight_kg: 26,
        gender: 'female',
        location: 'Maadi, Cairo',
        bio: 'Playful and active female.',
        is_mating: false,
        avatar_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1'
      })
    });
    const petBData = await res.json();
    assert(res.status === 201, 'Register Pet B', `Status: ${res.status}`);
    const petBId = petBData.pet.id;

    // 5. User B fetches mating pets and verifies Rocky (Pet A) is there
    res = await fetch(`${API_BASE}/pets/mating`);
    const matingPetsData = await res.json();
    const hasRocky = matingPetsData.pets?.some(p => p.id === petAId);
    assert(hasRocky, 'Verify Pet A listed in mating feed');

    // 6. User B submits mating proposal to Rocky (Pet A) proposing Bella (Pet B)
    res = await fetch(`${API_BASE}/mating/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        pet_id: petAId,
        applicant_pet_id: petBId,
        message: 'Let us connect Rocky and Bella! They are both wonderful German Shepherds.'
      })
    });
    const proposalData = await res.json();
    assert(res.status === 201, 'Submit Mating Proposal', `Status: ${res.status}`);
    const proposalId = proposalData.request?.id;

    // 7. User A fetches incoming requests and checks if the proposal exists
    res = await fetch(`${API_BASE}/mating/incoming`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const incomingData = await res.json();
    const foundIncoming = incomingData.requests?.find(r => r.id === proposalId);
    assert(!!foundIncoming, 'User A retrieves incoming mating proposal');
    assert(foundIncoming?.status === 'pending', 'Proposal status should be pending');

    // 8. User B fetches outgoing requests and checks if the proposal exists
    res = await fetch(`${API_BASE}/mating/outgoing`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const outgoingData = await res.json();
    const foundOutgoing = outgoingData.requests?.find(r => r.id === proposalId);
    assert(!!foundOutgoing, 'User B retrieves outgoing mating proposal');

    // 9. User A approves the proposal
    res = await fetch(`${API_BASE}/mating/request/${proposalId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ status: 'approved' })
    });
    const approveData = await res.json();
    assert(res.status === 200, 'Approve Mating Request', `Status: ${res.status}`);

    // 10. Verify that a chat request was automatically created and accepted
    res = await fetch(`${API_BASE}/chat/status?receiver_id=${userAData.user.id}&pet_id=${petAId}`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const chatStatusData = await res.json();
    assert(chatStatusData.status === 'accepted', 'Chat request automatically unlocked and accepted', `Status: ${chatStatusData.status}`);

  } catch (err) {
    console.error("Test execution failed with error:", err);
  }

  console.log("\n====================================");
  console.log(`TEST RUN COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log("====================================\n");
}

runTests();
