import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { execFile } from 'node:child_process';

const PORT = process.env.WEBHOOK_PORT || 9090;
const TOKEN = process.env.DEPLOY_WEBHOOK_TOKEN;
const COMPOSE_FILE = process.env.COMPOSE_FILE || '/workspace/docker-compose.yml';
const COMPOSE_SERVICE = process.env.COMPOSE_SERVICE || 'app';

if (!TOKEN) {
  console.error('DEPLOY_WEBHOOK_TOKEN is not set, refusing to start');
  process.exit(1);
}

function isAuthorized(req) {
  const expected = Buffer.from(`Bearer ${TOKEN}`);
  const actual = Buffer.from(req.headers['authorization'] || '');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function dockerCompose(args) {
  return new Promise((resolve, reject) => {
    execFile(
      'docker',
      ['compose', '-f', COMPOSE_FILE, ...args],
      { timeout: 120_000 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve(stdout);
      }
    );
  });
}

async function deploy() {
  const pullOut = await dockerCompose(['pull', COMPOSE_SERVICE]);
  const upOut = await dockerCompose(['up', '-d', '--remove-orphans', COMPOSE_SERVICE]);
  return `${pullOut}\n${upOut}`;
}

const server = createServer(async (req, res) => {
  const now = new Date().toISOString();

  if (req.method !== 'POST' || req.url !== '/deploy') {
    res.writeHead(404).end('not found');
    return;
  }

  if (!isAuthorized(req)) {
    console.log(`${now} unauthorized deploy attempt from ${req.socket.remoteAddress}`);
    res.writeHead(401).end('unauthorized');
    return;
  }

  console.log(`${now} deploy triggered`);
  try {
    const output = await deploy();
    console.log(`${now} deploy succeeded\n${output}`);
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end('deployed\n');
  } catch (err) {
    console.error(`${now} deploy failed: ${err.message}`);
    res.writeHead(500, { 'Content-Type': 'text/plain' }).end(`deploy failed: ${err.message}\n`);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`deploy webhook listening on :${PORT}`);
});
