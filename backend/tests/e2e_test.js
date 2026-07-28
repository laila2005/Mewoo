import crypto from 'crypto';

const VERCEL_URL = 'https://petpulse-showcase.vercel.app/api';

async function runTests() {
  console.log("Starting E2E API Tests (Native Fetch)...");
  let passed = 0;
  let failed = 0;
  const results = [];
  
  let token = '';
  let userId = '';
  const testEmail = `test_e2e_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  const assert = (condition, name, details = '') => {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passed++;
      results.push({ name, status: 'PASS', details });
    } else {
      console.error(`❌ FAIL: ${name} ${details}`);
      failed++;
      results.push({ name, status: 'FAIL', details });
    }
  };

  try {
    // 1. Signup Flow
    try {
      const res = await fetch(`${VERCEL_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: 'Test',
          last_name: 'User',
          email: testEmail,
          password: testPassword,
          role: 'owner'
        })
      });
      const data = await res.json();
      assert(res.status === 201, 'User Registration', res.status !== 201 ? data.error || 'Status not 201' : 'Status should be 201');
      token = data.token;
      userId = data.user?.id;
      assert(!!token, 'JWT Token Generation', 'Token should exist');
    } catch (e) {
      assert(false, 'User Registration', e.message);
    }

    const headers = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    };

    // 2. Profile Fetch
    if (token) {
      try {
        const res = await fetch(`${VERCEL_URL}/auth/me`, { headers });
        const data = await res.json();
        assert(data.user?.email === testEmail, 'Fetch Authenticated User Profile', 'Email matches');
      } catch (e) {
        assert(false, 'Fetch Authenticated User Profile', e.message);
      }

      // 3. Community Post
      let postId = null;
      try {
        const res = await fetch(`${VERCEL_URL}/community/posts`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: 'This is an E2E automated test post.',
            image_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
          })
        });
        const data = await res.json();
        postId = data.post?.id;
        assert(!!postId, 'Create Community Post', 'Post should be created and return ID');
      } catch (e) {
        assert(false, 'Create Community Post', e.message);
      }

      // 4. Fetch Community Feed
      if (postId) {
          try {
            const res = await fetch(`${VERCEL_URL}/community/posts`, { headers });
            const data = await res.json();
            const postExists = data.posts?.some(p => String(p.id) === String(postId));
            assert(postExists, 'Fetch Community Feed', 'Newly created post should be in the feed');
          } catch (e) {
            assert(false, 'Fetch Community Feed', e.message);
          }
      } else {
          assert(false, 'Fetch Community Feed', 'Skipped because post was not created');
      }

      // 5. VetAI Triage (Chatbot)
      try {
        const res = await fetch(`${VERCEL_URL}/ai/triage`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            symptoms: "My dog is vomiting and lethargic."
          })
        });
        const data = await res.json();
        assert(!!data.triage_result, 'VetAI Symptoms Triage', 'Should return AI generated response');
      } catch (e) {
        assert(false, 'VetAI Symptoms Triage', e.message);
      }
    }

  } catch (globalError) {
    console.error("Global Test Failure", globalError);
  }

  console.log("\n====================================");
  console.log(`TEST RUN COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log("====================================\n");
}

runTests();
