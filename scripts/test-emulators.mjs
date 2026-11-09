import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { connect } from 'node:net';

const exec = promisify(execFile);
const project = 'demo-medicare-foundation';
const rulesPath = resolve('firestore.rules').toLowerCase();
const probe = port => new Promise(resolve => {
  const socket = connect({ host: '127.0.0.1', port });
  socket.setTimeout(500);
  socket.once('connect', () => { socket.destroy(); resolve(true); });
  socket.once('error', () => resolve(false));
  socket.once('timeout', () => { socket.destroy(); resolve(false); });
});
for (const port of [8080, 9099]) {
  if (await probe(port)) throw new Error(`Port ${port} is occupied. Stop your own emulator or choose free ports. This runner will not kill an unrelated process.`);
}
// Constant command, not constructed from untrusted input. shell is needed for
// the globally installed Firebase .cmd launcher on Windows.
const command = `firebase emulators:exec --only firestore,auth --project ${project} "node --test --test-concurrency=1 tests/firestore.test.mjs tests/database.test.mjs tests/browser.test.mjs"`;
const cli = spawn(command, { shell: true, stdio: ['inherit', 'pipe', 'pipe'] });
const owned = new Set([cli.pid]);
const java = new Set();
let snapshotChain = Promise.resolve();
const snapshot = async () => {
  if (process.platform !== 'win32') return;
  const { stdout } = await exec('powershell.exe', ['-NoProfile', '-Command',
    "Get-CimInstance Win32_Process -Filter \"Name = 'java.exe' OR Name = 'node.exe' OR Name = 'cmd.exe'\" | Select-Object ProcessId, ParentProcessId, CommandLine | ConvertTo-Json -Compress"], { maxBuffer: 2_000_000 });
  const result = JSON.parse(stdout || '[]'); const processes = Array.isArray(result) ? result : [result];
  let changed;
  do {
    changed = false;
    for (const process of processes) if (owned.has(process.ParentProcessId) && !owned.has(process.ProcessId)) { owned.add(process.ProcessId); changed = true; }
  } while (changed);
  for (const process of processes) {
    const command = process.CommandLine?.toLowerCase() || '';
    if (owned.has(process.ProcessId) && command.includes('cloud-firestore-emulator') && command.includes(project) && command.includes(rulesPath)) java.add(process.ProcessId);
  }
};
let output = '';
let trackedStart = false;
let trackedReady = false;
cli.stdout.on('data', chunk => {
  process.stdout.write(chunk); output = (output + chunk.toString()).slice(-5000);
  if (!trackedStart && output.includes('Starting emulators')) { trackedStart = true; snapshotChain = snapshotChain.then(snapshot); }
  if (!trackedReady && output.includes('Firestore Emulator was started')) { trackedReady = true; snapshotChain = snapshotChain.then(snapshot); }
});
cli.stderr.on('data', chunk => process.stderr.write(chunk));
const exitCode = await new Promise(resolve => { cli.once('error', error => { console.error(error.message); resolve(1); }); cli.once('close', code => resolve(code ?? 1)); });
try {
  await snapshotChain; await snapshot();
  for (const pid of java) {
    const escaped = rulesPath.replaceAll("'", "''");
    await exec('powershell.exe', ['-NoProfile', '-Command',
      `Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}' | Where-Object { $_.CommandLine -like '*cloud-firestore-emulator*' -and $_.CommandLine -like '*${project}*' -and $_.CommandLine.ToLower().Contains('${escaped}') } | ForEach-Object { Stop-Process -Id $_.ProcessId }`]);
  }
} catch (error) { console.error(`Owned-emulator cleanup needs attention: ${error.message}`); process.exitCode = 1; }
process.exitCode ||= exitCode;
