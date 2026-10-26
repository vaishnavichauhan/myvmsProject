const BASE_URL = 'http://localhost:5050/api';

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { raw: text };
  }

  return {
    status: res.status,
    ok: res.ok,
    data,
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('MYVMS SUPER ADMIN & MULTI-SOCIETY E2E VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Super Admin Authentication
    console.log('1. Testing Super Admin Authentication...');
    const superAdminLoginRes = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: {
        phone: '9900000000',
        password: 'Password@123',
      },
    });

    const superAdminToken = superAdminLoginRes.data?.data?.token;
    const superAdminUser = superAdminLoginRes.data?.data?.user;

    assert(superAdminUser && superAdminUser.role === 'SUPER_ADMIN', 'Super Admin role is SUPER_ADMIN');
    assert(superAdminUser && superAdminUser.features && superAdminUser.features.length >= 10, 'Super Admin has all platform features');
    const superAdminHeaders = { Authorization: `Bearer ${superAdminToken}` };

    // 2. Super Admin Overview API
    console.log('\n2. Testing Super Admin Overview API...');
    const overviewRes = await request(`${BASE_URL}/super-admin/overview`, {
      headers: superAdminHeaders,
    });
    assert(overviewRes.data.success === true, 'Super Admin overview API returns success');
    assert(overviewRes.data.data.stats.totalSocieties >= 1, 'Real DB reports at least 1 total society');
    assert(overviewRes.data.data.stats.activePlans >= 3, 'Real DB reports seeded plans');

    // 3. Society & Society Admin Creation with Essential Plan (id: 1)
    console.log('\n3. Testing Transactional Society & Admin Creation...');
    const timestamp = Date.now().toString().slice(-4);
    const testCode = `TST${timestamp}`;
    const testAdminPhone = `91${timestamp}0000`.slice(0, 10);

    const createSocRes = await request(`${BASE_URL}/super-admin/societies`, {
      method: 'POST',
      headers: superAdminHeaders,
      body: {
        name: `Test Eco City ${timestamp}`,
        code: testCode,
        address: '100 Green Boulevard',
        city: 'Bengaluru',
        planId: 1, // Essential Plan (RESIDENTS, WORKERS, POLLS)
        maxUnits: 2, // low limit for limit testing
        maxUsers: 2,
        maxWorkers: 2,
        trialDays: 14,
        adminName: `Admin ${timestamp}`,
        adminPhone: testAdminPhone,
        adminEmail: `admin${timestamp}@ecocity.com`,
        adminPassword: 'Password@123',
      },
    });

    const newSocId = createSocRes.data?.data?.society?.id;
    assert(createSocRes.data.success === true, 'Society and Society Admin created successfully');
    assert(newSocId > 0, `Created Society ID: ${newSocId}`);

    // 4. Society Admin Authentication & Scope Isolation
    console.log('\n4. Testing Society Admin Login & Data Scope...');
    const socAdminLoginRes = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: {
        phone: testAdminPhone,
        password: 'Password@123',
      },
    });
    const socAdminToken = socAdminLoginRes.data?.data?.token;
    const socAdminUser = socAdminLoginRes.data?.data?.user;

    assert(socAdminUser.role === 'ADMIN', 'Society user role is ADMIN');
    assert(socAdminUser.societyId === newSocId, `Society Admin bound strictly to Society ${newSocId}`);
    assert(socAdminUser.features.includes('RESIDENTS'), 'Essential plan includes RESIDENTS');
    assert(socAdminUser.features.includes('WORKERS'), 'Essential plan includes WORKERS');
    assert(socAdminUser.features.includes('POLLS'), 'Essential plan includes POLLS');
    assert(!socAdminUser.features.includes('SOCIETY_FINANCE'), 'Essential plan strictly excludes SOCIETY_FINANCE');
    assert(!socAdminUser.features.includes('AMENITIES'), 'Essential plan strictly excludes AMENITIES');

    const socAdminHeaders = { Authorization: `Bearer ${socAdminToken}` };

    // 5. Backend Feature Entitlement Enforcement
    console.log('\n5. Testing Backend Feature Entitlement Blocking (403 FEATURE_LOCKED)...');
    const maintCheck = await request(`${BASE_URL}/maintenance/plans`, { headers: socAdminHeaders });
    assert(
      maintCheck.status === 403 && maintCheck.data?.code === 'FEATURE_LOCKED',
      'Blocked access to SOCIETY_FINANCE with 403 FEATURE_LOCKED'
    );

    const amenityCheck = await request(`${BASE_URL}/amenities`, { headers: socAdminHeaders });
    assert(
      amenityCheck.status === 403 && amenityCheck.data?.code === 'FEATURE_LOCKED',
      'Blocked access to AMENITIES with 403 FEATURE_LOCKED'
    );

    // Accessible feature on Essential plan
    const pollAccessRes = await request(`${BASE_URL}/polls`, { headers: socAdminHeaders });
    assert(pollAccessRes.status === 200, 'Allowed access to POLLS module on Essential plan');

    // 6. Capacity Limit Enforcement (Units Limit = 2)
    console.log('\n6. Testing Resource Capacity Limit Enforcement...');
    // Create unit 1
    const unit1Res = await request(`${BASE_URL}/societies/${newSocId}/homes`, {
      method: 'POST',
      headers: socAdminHeaders,
      body: { homeNumber: 'A-101', floor: 1, buildingOrWing: 'Tower A' },
    });
    assert(unit1Res.data.success === true, 'Created Unit 1 (1/2)');

    // Create unit 2
    const unit2Res = await request(`${BASE_URL}/societies/${newSocId}/homes`, {
      method: 'POST',
      headers: socAdminHeaders,
      body: { homeNumber: 'A-102', floor: 1, buildingOrWing: 'Tower A' },
    });
    assert(unit2Res.data.success === true, 'Created Unit 2 (2/2 - Capacity Reached)');

    // Attempt to create unit 3 (should fail with 409 LIMIT_EXCEEDED)
    const unit3Attempt = await request(`${BASE_URL}/societies/${newSocId}/homes`, {
      method: 'POST',
      headers: socAdminHeaders,
      body: { homeNumber: 'A-103', floor: 1, buildingOrWing: 'Tower A' },
    });
    assert(
      unit3Attempt.status === 409 && unit3Attempt.data?.code === 'LIMIT_EXCEEDED',
      'Rejected creation with 409 LIMIT_EXCEEDED (2/2 units capacity reached)'
    );

    // 7. Limit Override
    console.log('\n7. Testing Super Admin Limit Override...');
    const overrideRes = await request(`${BASE_URL}/super-admin/societies/${newSocId}/limits/override`, {
      method: 'POST',
      headers: superAdminHeaders,
      body: {
        limitType: 'UNITS',
        overrideValue: 5,
        reason: 'Authorized expansion test',
      },
    });
    assert(overrideRes.data.success === true, 'Super Admin granted UNITS override to 5');

    // Now creation of unit 3 should succeed
    const unit3Res = await request(`${BASE_URL}/societies/${newSocId}/homes`, {
      method: 'POST',
      headers: socAdminHeaders,
      body: { homeNumber: 'A-103', floor: 1, buildingOrWing: 'Tower A' },
    });
    assert(unit3Res.data.success === true, 'Unit 3 created successfully under expanded limit override (3/5)');

    // 8. Plan Upgrade & Entitlement Changes
    console.log('\n8. Testing Subscription Upgrade to Professional Plan (id: 2)...');
    const assignRes = await request(`${BASE_URL}/super-admin/subscriptions/assign`, {
      method: 'POST',
      headers: superAdminHeaders,
      body: {
        societyId: newSocId,
        planId: 2, // Professional (includes SOCIETY_FINANCE)
        billingCycle: 'MONTHLY',
        notes: 'Upgraded to Professional for society finance',
      },
    });
    assert(assignRes.data.success === true, 'Upgraded society to Professional plan');

    // Now verify Society Admin has access to SOCIETY_FINANCE
    const financeRes = await request(`${BASE_URL}/maintenance/plans`, { headers: socAdminHeaders });
    assert(financeRes.status === 200, 'SOCIETY_FINANCE is now accessible immediately without code changes');

    // 9. Subscription Billing and Verified Payment
    console.log('\n9. Testing Subscription Billing & Payments...');
    const invoicesRes = await request(`${BASE_URL}/super-admin/billing/invoices?societyId=${newSocId}`, {
      headers: superAdminHeaders,
    });
    const invoices = invoicesRes.data?.data?.invoices || [];
    assert(invoices.length >= 1, 'Generated platform subscription invoice exists');

    const inv = invoices[0];
    const payRes = await request(`${BASE_URL}/super-admin/billing/invoices/${inv.id}/payments`, {
      method: 'POST',
      headers: superAdminHeaders,
      body: {
        amount: inv.amount,
        paymentMethod: 'BANK_TRANSFER',
        transactionRef: `TEST-TXN-${Date.now()}`,
        notes: 'E2E verified settlement',
      },
    });
    if (!payRes.data.success) {
      console.log('Payment response error details:', payRes.data);
    }
    assert(payRes.data.success === true, `Recorded verified payment of ₹${inv.amount}`);

    // 10. Secure Society Admin Password Reset
    console.log('\n10. Testing Secure Password Reset by Super Admin...');
    const adminUserRes = await request(`${BASE_URL}/super-admin/admins?search=${testAdminPhone}`, {
      headers: superAdminHeaders,
    });
    const adminUserId = adminUserRes.data?.data?.admins?.[0]?.id;

    const resetRes = await request(`${BASE_URL}/super-admin/admins/${adminUserId}/reset-password`, {
      method: 'POST',
      headers: superAdminHeaders,
      body: { newPassword: 'NewPassword@456' },
    });
    assert(resetRes.data.success === true, 'Admin password reset executed');

    // Verify login with new password
    const newLoginRes = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: {
        phone: testAdminPhone,
        password: 'NewPassword@456',
      },
    });
    assert(newLoginRes.data.success === true, 'Society Admin successfully logged in with new reset password');

  } catch (err) {
    console.error('Unhandled test error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`E2E TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
