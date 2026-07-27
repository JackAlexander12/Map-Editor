const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PID_FILE = path.join(ROOT, '.server.pid');
const LOG_FILE = path.join(ROOT, '.server.log');
const SERVER_ENTRY = path.join(ROOT, 'server.js');

function readPid() {
  try {
    return Number(fs.readFileSync(PID_FILE, 'utf8').trim());
  } catch {
    return null;
  }
}

function isRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function clearPidFile() {
  try {
    fs.unlinkSync(PID_FILE);
  } catch {}
}

function start() {
  const pid = readPid();
  if (isRunning(pid)) {
    console.log(`Backend already running with PID ${pid}`);
    return;
  }

  clearPidFile();

  const out = fs.openSync(LOG_FILE, 'a');
  const child = spawn(process.execPath, [SERVER_ENTRY], {
    cwd: ROOT,
    detached: true,
    stdio: ['ignore', out, out],
  });

  child.unref();
  fs.writeFileSync(PID_FILE, String(child.pid));
  console.log(`Backend started with PID ${child.pid}`);
  console.log(`Log file: ${LOG_FILE}`);
}

function stop() {
  const pid = readPid();
  if (!isRunning(pid)) {
    clearPidFile();
    console.log('Backend is not running');
    return;
  }

  process.kill(pid, 'SIGTERM');
  clearPidFile();
  console.log(`Stopped backend PID ${pid}`);
}

function status() {
  const pid = readPid();
  if (isRunning(pid)) {
    console.log(`Backend is running with PID ${pid}`);
    console.log(`Log file: ${LOG_FILE}`);
    return;
  }

  clearPidFile();
  console.log('Backend is not running');
}

function restart() {
  stop();
  start();
}

const command = process.argv[2];

switch (command) {
  case 'start':
    start();
    break;
  case 'stop':
    stop();
    break;
  case 'restart':
    restart();
    break;
  case 'status':
    status();
    break;
  default:
    console.error('Usage: node scripts/server-control.js <start|stop|restart|status>');
    process.exit(1);
}
