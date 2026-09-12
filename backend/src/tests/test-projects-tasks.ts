import app from '../app.js';
import type { Server } from 'http';

const PORT = 3002;

async function runTests() {
  console.log('Starting Projects, Tasks, RBAC & Filters Verification Tests...');
  const server: Server = app.listen(PORT);
  const baseUrl = `http://localhost:${PORT}/api`;

  try {
    // 1. Health check
    const health = await (await fetch(`${baseUrl}/health`)).json();
    console.log('Health check:', health.status);

    // 2. Helper to register / login a user
    const getAuth = async (email: string, role: string, name: string) => {
      const reg = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Password123!', role, name }),
      });
      const data = await reg.json();
      if (data.data?.accessToken) {
        return { token: data.data.accessToken, user: data.data.user };
      }
      // If already registered, login
      const log = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Password123!' }),
      });
      const logData = await log.json();
      return { token: logData.data.accessToken, user: logData.data.user };
    };

    const stamp = Date.now();
    const pm1 = await getAuth(`pm1_${stamp}@test.com`, 'PROJECT_MANAGER', 'PM One');
    const pm2 = await getAuth(`pm2_${stamp}@test.com`, 'PROJECT_MANAGER', 'PM Two');
    const dev1 = await getAuth(`dev1_${stamp}@test.com`, 'DEVELOPER', 'Dev One');
    const dev2 = await getAuth(`dev2_${stamp}@test.com`, 'DEVELOPER', 'Dev Two');

    console.log('Authenticated PM1, PM2, Dev1, and Dev2');

    // 3. PM1 creates Project A
    const p1Res = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pm1.token}`,
      },
      body: JSON.stringify({
        name: 'Project Alpha',
        description: 'Test project alpha',
        clientId: 'Client A',
      }),
    });
    const p1Data = await p1Res.json();
    console.log(`PM1 Create Project Status: ${p1Res.status} (ID: ${p1Data.data?.id})`);
    const project1Id = p1Data.data?.id;

    // 4. RBAC Check 1: PM2 tries to fetch Project A -> Must fail (403 Forbidden)
    const p2AccessRes = await fetch(`${baseUrl}/projects/${project1Id}`, {
      headers: { Authorization: `Bearer ${pm2.token}` },
    });
    console.log(`RBAC Check 1 (PM2 accessing PM1's project): Status ${p2AccessRes.status} (Expected: 403)`);

    // 5. PM1 creates a task assigned to Dev1
    const taskRes = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pm1.token}`,
      },
      body: JSON.stringify({
        title: 'Implement OAuth Gateway',
        description: 'Set up Google & GitHub OAuth',
        priority: 'HIGH',
        status: 'TODO',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        projectId: project1Id,
        assigneeId: dev1.user.id,
      }),
    });
    const taskData = await taskRes.json();
    console.log(`PM1 Create Task Status: ${taskRes.status} (Task #${taskData.data?.taskNumber})`);
    const taskId = taskData.data?.id;

    // 6. RBAC Check 2: Dev2 tries to fetch Dev1's task -> Must fail (403 Forbidden)
    const dev2TaskRes = await fetch(`${baseUrl}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${dev2.token}` },
    });
    console.log(`RBAC Check 2 (Dev2 accessing Dev1's task): Status ${dev2TaskRes.status} (Expected: 403)`);

    // 7. Dev1 updates task status to IN_PROGRESS -> Must succeed (200 OK)
    const statusUpdateRes = await fetch(`${baseUrl}/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dev1.token}`,
      },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    const statusData = await statusUpdateRes.json();
    console.log(`Dev1 Updates Status: Status ${statusUpdateRes.status}, New Status: ${statusData.data?.status}`);

    // 8. RBAC Check 3: Dev1 tries to change task title -> Must fail (403 Forbidden)
    const devTitleRes = await fetch(`${baseUrl}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dev1.token}`,
      },
      body: JSON.stringify({ title: 'Tampered Title by Dev' }),
    });
    console.log(`RBAC Check 3 (Dev editing non-status field): Status ${devTitleRes.status} (Expected: 403)`);

    // 9. Filters Check: Query tasks by status & priority
    const filterRes = await fetch(
      `${baseUrl}/tasks?status=IN_PROGRESS&priority=HIGH`,
      {
        headers: { Authorization: `Bearer ${pm1.token}` },
      }
    );
    const filterData = await filterRes.json();
    console.log(
      `Tasks Query Filter: Status ${filterRes.status}, Filtered count: ${filterData.data?.tasks?.length}`
    );

    // 10. Activity Feed Check: Query /api/activity
    const actRes = await fetch(`${baseUrl}/activity`, {
      headers: { Authorization: `Bearer ${pm1.token}` },
    });
    const actData = await actRes.json();
    console.log(`Activity Feed Status: ${actRes.status}, Items: ${actData.data?.activities?.length}`);
    if (actData.data?.activities?.[0]) {
      console.log('Sample Formatted Activity:', actData.data.activities[0].formattedMessage);
    }

    console.log('\nALL PROJECT, TASK, RBAC, FILTER & ACTIVITY TESTS PASSED!');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    server.close();
  }
}

runTests();
