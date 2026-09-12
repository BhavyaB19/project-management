import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { initSocketServer } from './websockets/socket.server.js';
import { initOverdueTaskScheduler } from './jobs/overdueTask.queue.js';
import { initOverdueTaskWorker } from './jobs/overdueTask.worker.js';

const server = http.createServer(app);

// Initialize Socket.io WebSockets
const io = initSocketServer(server);

// Initialize BullMQ Background Jobs
const overdueWorker = initOverdueTaskWorker();
initOverdueTaskScheduler();

server.listen(env.PORT, () => {
  console.log(`Server is running on http://localhost:${env.PORT}`);
  console.log(`WebSocket server initialized`);
});

// Graceful Shutdown
const shutdown = async () => {
  console.log('Shutting down server gracefully...');
  await overdueWorker.close();
  server.close(() => {
    console.log('HTTP and WebSocket server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);