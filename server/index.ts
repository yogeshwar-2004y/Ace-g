import { createServer } from 'node:http';
import next from 'next';
import { Server } from 'socket.io';
import { installRooms } from './rooms';

async function main() {
  const dev = process.env.NODE_ENV !== 'production';
  const port = Number(process.env.PORT ?? 3000);
  const hostname = process.env.HOSTNAME ?? '0.0.0.0';
  const app = next({ dev, hostname, port });
  await app.prepare();
  const handle = app.getRequestHandler();
  const server = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    handle(req, res);
  });
  const appOrigin =
    process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
  const io = new Server(server, {
    maxHttpBufferSize: 16_384,
    cors: {
      origin: appOrigin,
      methods: ['GET', 'POST'],
    },
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      const expected = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL;
      callback(
        null,
        !origin ||
          (expected
            ? origin === expected
            : origin === `http://localhost:${port}` || origin === `http://127.0.0.1:${port}`),
      );
    },
  });
  const manager = installRooms(io);
  server.listen(port, hostname, () => console.log(`Getaway is ready at http://localhost:${port}`));
  const close = () => {
    manager.close();
    io.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGTERM', close);
  process.on('SIGINT', close);
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
