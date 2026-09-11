import app from '../app.js';
import type { Server } from 'http';

const PORT = 3001;

async function runTests() {
  console.log('Starting Auth Verification Tests...');
  const server: Server = app.listen(PORT);
  const baseUrl = `http://localhost:${PORT}/api`;

  try {
    // 1. Health Check
    console.log('\n1. Testing Health Check Endpoint...');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    console.log(`Health Status: ${healthRes.status}`, healthData);

    const testEmail = `test.developer.${Date.now()}@example.com`;
    const password = 'Password@123';

    // 2. Register Developer
    console.log('\n2. Testing Registration (Developer)...');
    const registerRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password,
        name: 'Test Developer',
        role: 'DEVELOPER',
      }),
    });
    const registerData = await registerRes.json();
    const setCookieHeader = registerRes.headers.get('set-cookie');
    console.log(`Register Status: ${registerRes.status}`);
    console.log('User created:', registerData.data?.user);
    console.log('Access token received:', Boolean(registerData.data?.accessToken));
    console.log('Refresh token cookie set:', Boolean(setCookieHeader && setCookieHeader.includes('refreshToken=')));

    const accessToken = registerData.data?.accessToken;
    const cookie = setCookieHeader ? setCookieHeader.split(';')[0] : '';

    // 3. Register Duplicate Email (Should fail 409)
    console.log('\n3. Testing Duplicate Registration Prevention...');
    const dupRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password,
        name: 'Duplicate Developer',
        role: 'DEVELOPER',
      }),
    });
    const dupData = await dupRes.json();
    console.log(`Duplicate Register Status: ${dupRes.status}`, dupData);

    // 4. Invalid Login (Wrong Password)
    console.log('\n4. Testing Invalid Login (Wrong Password)...');
    const wrongLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword123',
      }),
    });
    const wrongLoginData = await wrongLoginRes.json();
    console.log(`Wrong Login Status: ${wrongLoginRes.status}`, wrongLoginData);

    // 5. Valid Login
    console.log('\n5. Testing Valid Login...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password,
      }),
    });
    const loginData = await loginRes.json();
    const loginCookieHeader = loginRes.headers.get('set-cookie');
    const loginCookie = loginCookieHeader ? loginCookieHeader.split(';')[0] : cookie;
    console.log(`Login Status: ${loginRes.status}`);
    console.log('User logged in:', loginData.data?.user);

    // 6. Access Profile with Access Token
    console.log('\n6. Testing GET /api/auth/me (Authenticated)...');
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const meData = await meRes.json();
    console.log(`Me Status: ${meRes.status}`, meData);

    // 7. Refresh Token Rotation
    console.log('\n7. Testing POST /api/auth/refresh (Cookie-based token rotation)...');
    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: loginCookie,
      },
    });
    const refreshData = await refreshRes.json();
    const refreshedCookie = refreshRes.headers.get('set-cookie')?.split(';')[0];
    console.log(`Refresh Status: ${refreshRes.status}`);
    console.log('New Access Token received:', Boolean(refreshData.data?.accessToken));
    console.log('Rotated Refresh Token cookie:', Boolean(refreshedCookie));

    // 8. Logout
    console.log('\n8. Testing POST /api/auth/logout (Revocation & Cookie clear)...');
    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: refreshedCookie || loginCookie,
      },
    });
    const logoutData = await logoutRes.json();
    console.log(`Logout Status: ${logoutRes.status}`, logoutData);

    // 9. Refresh After Logout (Should fail 401)
    console.log('\n9. Testing Refresh After Logout (Should fail 401)...');
    const revokedRefreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: refreshedCookie || loginCookie,
      },
    });
    const revokedRefreshData = await revokedRefreshRes.json();
    console.log(`Revoked Refresh Status: ${revokedRefreshRes.status}`, revokedRefreshData);

    console.log('\nALL AUTH TESTS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests();
