import { prisma } from '../src/config/prisma.js';
import { hashPassword } from '../src/utils/password.js';

async function main() {
  console.log('Starting database seed according to technical assessment specs...');

  // Clean existing test data safely
  await prisma.activityLog.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});

  const defaultPassword = await hashPassword('Password123!');

  // 1. Seed Users (1 Admin, 2 PMs, 4 Developers)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@velozity.com',
      name: 'Admin Chief',
      password: defaultPassword,
      role: 'ADMIN',
    },
  });

  const pm1 = await prisma.user.create({
    data: {
      email: 'pm1@velozity.com',
      name: 'Sarah Connor (PM)',
      password: defaultPassword,
      role: 'PROJECT_MANAGER',
    },
  });

  const pm2 = await prisma.user.create({
    data: {
      email: 'pm2@velozity.com',
      name: 'John Miller (PM)',
      password: defaultPassword,
      role: 'PROJECT_MANAGER',
    },
  });

  const dev1 = await prisma.user.create({
    data: {
      email: 'dev1@velozity.com',
      name: 'Ravi Kumar',
      password: defaultPassword,
      role: 'DEVELOPER',
    },
  });

  const dev2 = await prisma.user.create({
    data: {
      email: 'dev2@velozity.com',
      name: 'Aisha Patel',
      password: defaultPassword,
      role: 'DEVELOPER',
    },
  });

  const dev3 = await prisma.user.create({
    data: {
      email: 'dev3@velozity.com',
      name: 'Lucas Vance',
      password: defaultPassword,
      role: 'DEVELOPER',
    },
  });

  const dev4 = await prisma.user.create({
    data: {
      email: 'dev4@velozity.com',
      name: 'Elena Rostova',
      password: defaultPassword,
      role: 'DEVELOPER',
    },
  });

  console.log('Created 1 Admin, 2 Project Managers, and 4 Developers');

  // Dates
  const now = new Date();
  const past3Days = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const past1Day = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const future2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const future5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const future10Days = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  // 2. Seed Projects (At least 3 projects)
  const project1 = await prisma.project.create({
    data: {
      name: 'E-Commerce Platform Redesign',
      description: 'Complete revamp of storefront, checkout flow, and inventory management.',
      clientId: 'Acme Retail Corp',
      ownerId: pm1.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Mobile Banking App 2.0',
      description: 'Next-gen biometric auth, transaction ledger, and real-time alerts.',
      clientId: 'Apex FinTech',
      ownerId: pm1.id,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'Healthcare Analytics Dashboard',
      description: 'HIPAA-compliant patient vitals aggregation and reporting platform.',
      clientId: 'Global Health Systems',
      ownerId: pm2.id,
    },
  });

  console.log('Created 3 Client Projects');

  // 3. Seed Tasks (5+ tasks per project across all statuses, including at least 2 OVERDUE)
  const tasksData = [
    // Project 1 Tasks (PM1)
    {
      title: 'Design Stripe payment gateway integration',
      description: 'Implement webhook listeners and 3D-secure confirmation modal.',
      priority: 'CRITICAL',
      status: 'OVERDUE', // Overdue Task 1
      dueDate: past3Days,
      projectId: project1.id,
      assigneeId: dev1.id,
    },
    {
      title: 'Setup automated Redis cart expiration worker',
      description: 'Use BullMQ to clean abandoned carts after 24 hours.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: future2Days,
      projectId: project1.id,
      assigneeId: dev1.id,
    },
    {
      title: 'Migrate PostgreSQL schema to Prisma v7',
      description: 'Run baseline migration and verify relations.',
      priority: 'HIGH',
      status: 'DONE',
      dueDate: past1Day,
      projectId: project1.id,
      assigneeId: dev2.id,
    },
    {
      title: 'Implement search autocompletion with Elasticsearch',
      description: 'Build index sync pipeline with PostgreSQL triggers.',
      priority: 'MEDIUM',
      status: 'IN_REVIEW',
      dueDate: future5Days,
      projectId: project1.id,
      assigneeId: dev2.id,
    },
    {
      title: 'Draft OpenAPI 3.0 documentation',
      description: 'Publish Swagger UI bundle on /api/docs route.',
      priority: 'LOW',
      status: 'TODO',
      dueDate: future10Days,
      projectId: project1.id,
      assigneeId: dev3.id,
    },
    {
      title: 'Optimize product thumbnail loading with WebP',
      description: 'Configure Cloudflare edge cache and resize pipelines.',
      priority: 'MEDIUM',
      status: 'TODO',
      dueDate: future5Days,
      projectId: project1.id,
      assigneeId: dev1.id,
    },

    // Project 2 Tasks (PM1)
    {
      title: 'Biometric FaceID handshake audit',
      description: 'Validate token exchange on iOS devices.',
      priority: 'CRITICAL',
      status: 'OVERDUE', // Overdue Task 2
      dueDate: past1Day,
      projectId: project2.id,
      assigneeId: dev3.id,
    },
    {
      title: 'Push notification worker via Firebase Cloud Messaging',
      description: 'Deliver instant push alerts for transfer events.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: future2Days,
      projectId: project2.id,
      assigneeId: dev4.id,
    },
    {
      title: 'Security penetration testing remediation',
      description: 'Patch CORS origins and sanitize header injection vectors.',
      priority: 'CRITICAL',
      status: 'IN_REVIEW',
      dueDate: future5Days,
      projectId: project2.id,
      assigneeId: dev3.id,
    },
    {
      title: 'Export monthly CSV bank statements',
      description: 'Stream report generation to prevent high memory spikes.',
      priority: 'MEDIUM',
      status: 'DONE',
      dueDate: past3Days,
      projectId: project2.id,
      assigneeId: dev4.id,
    },
    {
      title: 'KYC document verification upload UI',
      description: 'Direct S3 presigned URL client uploads with virus scans.',
      priority: 'HIGH',
      status: 'TODO',
      dueDate: future10Days,
      projectId: project2.id,
      assigneeId: dev4.id,
    },

    // Project 3 Tasks (PM2)
    {
      title: 'HL7 / FHIR data parser microservice',
      description: 'Ingest raw hospital feeds into normalized patient records.',
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      dueDate: future2Days,
      projectId: project3.id,
      assigneeId: dev2.id,
    },
    {
      title: 'Audit log encryption at rest',
      description: 'Apply AES-256 GCM encryption on medical notes columns.',
      priority: 'CRITICAL',
      status: 'DONE',
      dueDate: past1Day,
      projectId: project3.id,
      assigneeId: dev1.id,
    },
    {
      title: 'Real-time telemetry WebSocket gateway',
      description: 'Stream vital signs to nurse station dashboard.',
      priority: 'HIGH',
      status: 'IN_REVIEW',
      dueDate: future5Days,
      projectId: project3.id,
      assigneeId: dev2.id,
    },
    {
      title: 'Daily compliance PDF report emailer',
      description: 'Schedule nightly summary generation at midnight.',
      priority: 'MEDIUM',
      status: 'TODO',
      dueDate: future10Days,
      projectId: project3.id,
      assigneeId: dev3.id,
    },
    {
      title: 'Multi-factor authentication via TOTP',
      description: 'Provide authenticator app QR code generation and recovery keys.',
      priority: 'HIGH',
      status: 'TODO',
      dueDate: future5Days,
      projectId: project3.id,
      assigneeId: dev4.id,
    },
  ];

  const createdTasks = [];
  for (const t of tasksData) {
    const task = await prisma.task.create({
      data: t as any,
    });
    createdTasks.push(task);
  }

  console.log(`Created ${createdTasks.length} tasks (including 2 Overdue tasks)`);

  // 4. Seed Pre-existing Activity Log entries
  const activitiesData = [
    {
      taskId: createdTasks[0].id,
      userId: pm1.id,
      action: 'CREATED',
      details: { title: createdTasks[0].title, priority: 'CRITICAL', status: 'TODO' },
    },
    {
      taskId: createdTasks[0].id,
      userId: pm1.id,
      action: 'ASSIGNED',
      details: { to: dev1.id, title: createdTasks[0].title },
    },
    {
      taskId: createdTasks[0].id,
      userId: dev1.id,
      action: 'STATUS_CHANGE',
      details: { from: 'TODO', to: 'IN_PROGRESS' },
    },
    {
      taskId: createdTasks[0].id,
      userId: pm1.id,
      action: 'OVERDUE',
      details: { from: 'IN_PROGRESS', to: 'OVERDUE' },
    },
    {
      taskId: createdTasks[1].id,
      userId: pm1.id,
      action: 'CREATED',
      details: { title: createdTasks[1].title, priority: 'HIGH', status: 'TODO' },
    },
    {
      taskId: createdTasks[1].id,
      userId: dev1.id,
      action: 'STATUS_CHANGE',
      details: { from: 'TODO', to: 'IN_PROGRESS' },
    },
    {
      taskId: createdTasks[2].id,
      userId: dev2.id,
      action: 'STATUS_CHANGE',
      details: { from: 'IN_REVIEW', to: 'DONE' },
    },
    {
      taskId: createdTasks[3].id,
      userId: dev2.id,
      action: 'STATUS_CHANGE',
      details: { from: 'IN_PROGRESS', to: 'IN_REVIEW' },
    },
    {
      taskId: createdTasks[6].id,
      userId: pm1.id,
      action: 'OVERDUE',
      details: { from: 'TODO', to: 'OVERDUE' },
    },
    {
      taskId: createdTasks[7].id,
      userId: dev4.id,
      action: 'STATUS_CHANGE',
      details: { from: 'TODO', to: 'IN_PROGRESS' },
    },
    {
      taskId: createdTasks[8].id,
      userId: dev3.id,
      action: 'STATUS_CHANGE',
      details: { from: 'IN_PROGRESS', to: 'IN_REVIEW' },
    },
    {
      taskId: createdTasks[11].id,
      userId: dev2.id,
      action: 'STATUS_CHANGE',
      details: { from: 'TODO', to: 'IN_PROGRESS' },
    },
    {
      taskId: createdTasks[13].id,
      userId: dev2.id,
      action: 'STATUS_CHANGE',
      details: { from: 'IN_PROGRESS', to: 'IN_REVIEW' },
    },
  ];

  for (const a of activitiesData) {
    await prisma.activityLog.create({
      data: a,
    });
  }

  console.log(`Seeded ${activitiesData.length} activity log entries`);
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
