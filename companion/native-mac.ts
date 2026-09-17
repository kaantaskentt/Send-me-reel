import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import sharp from 'sharp';

// Reviewed against the tagged CLI source, not the moving website examples.
export const PEEKABOO_VERSION = '4.4.0';
export const PEEKABOO_RELEASE = 'https://github.com/openclaw/Peekaboo/releases/tag/v4.4.0';
// codesign treats -R values as file paths unless inline requirements start with '='.
export const PEEKABOO_SIGNATURE_REQUIREMENT = '=anchor apple generic and certificate leaf[subject.OU] = "FWJYW4S8P8"';
const execFileAsync = promisify(execFile);
export interface ComputerSetup {
  configured: boolean; available: boolean;
  status: 'unsupported' | 'not_installed' | 'wrong_version' | 'host_unavailable' | 'needs_permissions' | 'needs_model' | 'ready';
  message: string; version: string | null;
  permissions: { screenRecording: boolean; accessibility: boolean; eventSynthesizing: boolean };
  setupSteps: string[];
}
export interface NativeApp { id: string; name: string; pid?: number; }
export interface NativeWindow { id: string; title: string; }
export interface NativeElement { id: string; role: string; label: string; value: string; actionable: boolean; enabled: boolean; settable: boolean; bounds: { x: number; y: number; width: number; height: number }; }
export interface NativeObservation {
  app: NativeApp; window: NativeWindow; snapshotId: string; screenshot: string;
  elements: NativeElement[]; fingerprint: string; capturedAt: number;
}
export interface NativeAction {
  type: 'open_app' | 'select_window' | 'click' | 'type' | 'press' | 'scroll' | 'ask_user' | 'finish';
  description: string; targetId: string | null; text: string | null; url: null;
}
export interface NativeAdapter {
  inspect(): Promise<ComputerSetup>;
  apps(signal: AbortSignal): Promise<NativeApp[]>;
  openApp(app: NativeApp, signal: AbortSignal): Promise<void>;
  windows(app: NativeApp, signal: AbortSignal): Promise<NativeWindow[]>;
  observe(app: NativeApp, window: NativeWindow, signal: AbortSignal): Promise<NativeObservation>;
  act(action: NativeAction, observation: NativeObservation, signal: AbortSignal): Promise<void>;
}
type JsonObject = Record<string, any>;
export type NativeCommand = (binary: string, args: string[], signal?: AbortSignal) => Promise<string>;
export const nativeCommand: NativeCommand = (binary, args, signal) => new Promise((resolve, reject) => {
  // No shell, inherited stdin, arbitrary arguments, or automatic mutation retries.
  execFile(binary, args, { timeout: 25_000, maxBuffer: 2 * 1024 * 1024, signal, encoding: 'utf8', env: { HOME: os.homedir(), PATH: '/usr/bin:/bin:/usr/sbin:/sbin', TMPDIR: os.tmpdir(), LANG: 'en_US.UTF-8' } }, (error, stdout) => {
    if (error) {
      // Provider/CLI diagnostics can contain private text; expose a bounded error code only.
      let code = 'COMMAND_FAILED';
      try { const parsed = JSON.parse(stdout); if (typeof parsed?.error?.code === 'string') code = parsed.error.code.replace(/[^A-Z0-9_]/g, '').slice(0, 80); } catch { /* non-JSON */ }
      reject(new Error(`Mac action stopped (${code}). Inspect the app before retrying; part of the action may already have happened.`));
    } else resolve(stdout);
  });
});
function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Unexpected Mac helper response');
  return value as JsonObject;
}
function payload(text: string): JsonObject {
  const result = object(JSON.parse(text));
  if (result.success !== true) throw new Error('Mac helper could not verify this operation. Inspect the app before continuing.');
  return { ...object(result.data), _targetReceipt: result.target_receipt };
}
const clean = (v: unknown, limit = 300): string => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, limit) : '';
const bundleId = /^[A-Za-z0-9][A-Za-z0-9_.-]{2,199}$/;
export const snapshotIdPattern = /^ps1_[a-f0-9]{32}$/;
// Native GUI typing must not become an unsandboxed coding/shell execution channel.
export function isBlockedNativeApp(app: NativeApp): boolean {
  return /terminal|iterm|warp|ghostty|alacritty|wezterm|kitty|keychain|password|1password|bitwarden|systempreferences|system settings|automator|script editor|scripteditor|visual studio code|cursor|windsurf|zed|com\.microsoft\.vscode|com\.apple\.shortcuts/i.test(`${app.id} ${app.name}`);
}
export function privateElement(element: NativeElement): boolean {
  return /secure|password|passcode|one.time|verification code|credit card|card number|cvv|cvc|secret|api.?key|access.?token|recovery|seed phrase/i.test(`${element.role} ${element.label}`);
}
export function parseNativeApps(data: JsonObject): NativeApp[] {
  if (!Array.isArray(data.apps)) throw new Error('The Mac app list is unavailable');
  return data.apps.flatMap((row: unknown) => {
    const a = object(row);
    if (typeof a.bundle_id !== 'string' || !bundleId.test(a.bundle_id) || !Number.isSafeInteger(a.pid) || a.pid <= 0) return [];
    const app = { id: a.bundle_id, name: clean(a.name), pid: a.pid };
    return app.name && !isBlockedNativeApp(app) ? [app] : [];
  }).slice(0, 80);
}
export function parseNativeObservation(data: JsonObject, app: NativeApp, window: NativeWindow, screenshot: string): NativeObservation {
  if (!snapshotIdPattern.test(data.snapshot_id) || data.snapshot_reusable !== true || data.mutation_targeting_available !== true || data.semantic_scope !== 'exact_or_requested' || !Array.isArray(data.ui_elements)) throw new Error('This window cannot be controlled reliably. Use its browser flow or choose another app.');
  const receipt = object(data._targetReceipt);
  if (receipt.pid !== app.pid || String(receipt.window_id) !== window.id || typeof receipt.process_start_identity_decimal !== 'string' || !/^[1-9][0-9]{0,19}$/.test(receipt.process_start_identity_decimal)) throw new Error('The helper did not verify the exact app process and window.');
  const elements: NativeElement[] = data.ui_elements.slice(0, 300).map((value: unknown) => {
    const e = object(value), b = object(e.bounds);
    if (typeof e.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(e.id) || !['x', 'y', 'width', 'height'].every(k => typeof b[k] === 'number' && Number.isFinite(b[k]))) throw new Error('Invalid Mac control geometry');
    const item = { id: e.id, role: clean(e.ax_role || e.role), label: clean(e.title || e.label || e.description), value: clean(e.value, 500), actionable: e.is_actionable === true, enabled: e.is_enabled !== false, settable: e.is_value_settable === true, bounds: { x: b.x, y: b.y, width: b.width, height: b.height } };
    if (privateElement(item)) item.value = '[private field]';
    return item;
  });
  // A secure input screen is not sent to the model as a screenshot.
  if (elements.some(privateElement)) throw new Error('Complete the private field in the app yourself. Then continue from a screen without passwords or verification codes.');
  const fingerprint = JSON.stringify({ app: app.id, pid: app.pid, generation: receipt.process_start_identity_decimal, window: window.id, elements: elements.map(e => ({ ...e, id: undefined })) });
  return { app, window, snapshotId: data.snapshot_id, screenshot, elements, fingerprint, capturedAt: Date.now() };
}
export const allowedNativeKeys = ['Return', 'Tab', 'Escape', 'Space', 'Up', 'Down', 'Left', 'Right', 'cmd+n', 'cmd+f', 'cmd+a'] as const;
export function nativeActionArgs(action: NativeAction, observation: NativeObservation): string[] {
  if (isBlockedNativeApp(observation.app) || !snapshotIdPattern.test(observation.snapshotId)) throw new Error('Use a coding task for Terminal or editor commands.');
  const ref = ['--snapshot', observation.snapshotId];
  if (action.type === 'click' || action.type === 'scroll') {
    const element = observation.elements.find(e => e.id === action.targetId);
    if (!element || !element.enabled || privateElement(element) || (action.type === 'click' && !element.actionable)) throw new Error('The selected Mac control is unavailable or private.');
    return action.type === 'click' ? ['click', '--on', element.id, ...ref] : ['scroll', '--on', element.id, '--direction', action.text!, '--amount', '3', ...ref];
  }
  if (action.type === 'type') {
    // Peekaboo interprets escaped newlines/tabs as keystrokes. Keep submissions explicit.
    if (!action.text || action.text.length > 1200 || /[\r\n\t\x00-\x1f]|\\[nrt]/.test(action.text) || action.text.startsWith('-')) throw new Error('Type one short line of plain text; submit it as a separate action.');
    return ['type', action.text, ...ref];
  }
  if (action.type === 'press' && allowedNativeKeys.includes(action.text as typeof allowedNativeKeys[number])) return ['press', action.text!, ...ref];
  throw new Error('Unsupported Mac action');
}
export class PeekabooAdapter implements NativeAdapter {
  private binary: string;
  private socket: string;
  private command: NativeCommand;
  constructor(private options: { binary?: string; socket?: string; platform?: string; configured: boolean; command?: NativeCommand }) {
    this.binary = options.binary || process.env.CONTEXTDROP_PEEKABOO_BINARY || path.join(os.homedir(), '.local/share/contextdrop/peekaboo', PEEKABOO_VERSION, 'peekaboo');
    this.socket = options.socket || process.env.CONTEXTDROP_PEEKABOO_SOCKET || path.join(os.homedir(), 'Library/Application Support/Peekaboo/bridge.sock');
    if (![this.binary, this.socket].every(path.isAbsolute)) throw new Error('The Mac helper paths must be absolute trusted local paths.');
    this.command = options.command || nativeCommand;
  }
  private async json(args: string[], signal?: AbortSignal) {
    signal?.throwIfAborted();
    return payload(await this.command(this.binary, [...args, '--bridge-socket', this.socket, '--json'], signal));
  }
  async inspect(): Promise<ComputerSetup> {
    const base: ComputerSetup = { configured: this.options.configured, available: false, status: 'not_installed', message: 'Set up Mac control to use your apps.', version: null, permissions: { screenRecording: false, accessibility: false, eventSynthesizing: false }, setupSteps: [
      `Install the signed Peekaboo ${PEEKABOO_VERSION} app and matching CLI from ${PEEKABOO_RELEASE}.`,
      'Open Peekaboo. In its Permissions settings, allow Screen Recording and Accessibility. You choose these permissions in macOS.',
      'Keep Peekaboo open, then check again. Screen images and app text are sent to your existing AI provider only during a reviewed Mac task.',
    ] };
    if ((this.options.platform || process.platform) !== 'darwin') return { ...base, status: 'unsupported', message: 'Mac control requires macOS 15 or newer.' };
    try { await fs.access(this.binary, constants.X_OK); } catch { return base; }
    try {
      const signal = AbortSignal.timeout(8_000);
      const version = await this.command(this.binary, ['--version'], signal);
      if (!new RegExp(`(?:^|\\s)${PEEKABOO_VERSION.replaceAll('.', '\\.')}($|\\s|\\()`).test(version.trim())) return { ...base, status: 'wrong_version', message: `Use Peekaboo ${PEEKABOO_VERSION}; this helper version has not been checked.` };
      base.version = PEEKABOO_VERSION;
      if (!(await fs.lstat(this.socket)).isSocket()) throw new Error('Missing bridge');
      const result = await this.json(['permissions', 'status'], signal);
      if (result.source !== 'bridge' || !Array.isArray(result.permissions)) throw new Error('Wrong permission host');
      const granted = (name: string) => result.permissions.some((p: JsonObject) => p?.name === name && p.isGranted === true);
      base.permissions = { screenRecording: granted('Screen Recording'), accessibility: granted('Accessibility'), eventSynthesizing: granted('Event Synthesizing') };
      if (!base.permissions.screenRecording || !base.permissions.accessibility) return { ...base, status: 'needs_permissions', message: 'Allow Screen Recording and Accessibility for Peekaboo in macOS, then check again.' };
      if (!base.configured) return { ...base, status: 'needs_model', message: 'Add the existing OpenAI key to the companion to plan Mac actions.' };
      return { ...base, available: true, status: 'ready', message: 'Mac control is ready. Each action asks before it runs.' };
    } catch { return { ...base, status: 'host_unavailable', message: 'Open Peekaboo and keep it running. Its Mac connection is not ready yet.' }; }
  }
  async apps(signal: AbortSignal) {
    const apps = parseNativeApps(await this.json(['app', 'list'], signal));
    for (const app of [{ id: 'com.apple.calculator', name: 'Calculator' }, { id: 'com.apple.TextEdit', name: 'TextEdit' }]) if (!apps.some(a => a.id === app.id)) apps.push(app);
    return apps;
  }
  async openApp(app: NativeApp, signal: AbortSignal) {
    if (!bundleId.test(app.id) || isBlockedNativeApp(app)) throw new Error('Choose a normal Mac app. Coding and private settings use separate flows.');
    const data = await this.json(['app', 'launch', '--bundle-id', app.id, '--foreground', '--wait-for-window'], signal);
    if (!Number.isSafeInteger(data.pid) || data.pid <= 0) throw new Error('The app did not return a verified process.');
    app.pid = data.pid;
  }
  async windows(app: NativeApp, signal: AbortSignal) {
    if (!app.pid || isBlockedNativeApp(app)) throw new Error('Select an app first.');
    const data = await this.json(['window', 'list', '--pid', String(app.pid)], signal);
    if (!Array.isArray(data.windows)) throw new Error('Could not read this app’s windows.');
    return data.windows.filter((w: JsonObject) => Number.isSafeInteger(w.window_id) && w.window_id > 0 && w.is_on_screen === true).slice(0, 30).map((w: JsonObject) => ({ id: String(w.window_id), title: clean(w.window_title) || 'Untitled window' }));
  }
  async observe(app: NativeApp, window: NativeWindow, signal: AbortSignal) {
    if (!app.pid || !/^\d{1,10}$/.test(window.id) || isBlockedNativeApp(app)) throw new Error('Choose an exact app window before reading its screen.');
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-mac-'));
    await fs.chmod(directory, 0o700);
    const screenshotPath = path.join(directory, `${randomUUID()}.png`);
    try {
      const data = await this.json(['see', '--pid', String(app.pid), '--window-id', window.id, '--path', screenshotPath, '--max-elements', '300'], signal);
      // Only read our requested artifact, never a filename returned by a model/helper.
      const handle = await fs.open(screenshotPath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      let screenshot: string;
      try {
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw new Error('The app image is too large to inspect.');
        const bytes = await handle.readFile();
        if (!bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('Invalid app screenshot.');
        // The planner only targets AX IDs, so a bounded preview does not change action coordinates.
        const preview = await sharp(bytes, { limitInputPixels: 32_000_000 }).resize({ width: 1600, height: 1200, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
        screenshot = `data:image/jpeg;base64,${preview.toString('base64')}`;
      } finally { await handle.close(); }
      signal.throwIfAborted();
      return parseNativeObservation(data, app, window, screenshot);
    } finally { await fs.rm(directory, { recursive: true, force: true }); }
  }
  async act(action: NativeAction, observation: NativeObservation, signal: AbortSignal) {
    await this.json(nativeActionArgs(action, observation), signal);
  }
}

/** An explicit setup click opens only the reviewed signed helper, never a model-selected app. */
export async function openMacHelper(): Promise<void> {
  if (process.platform !== 'darwin') throw new Error('Mac control is available on macOS only.');
  for (const app of [path.join(os.homedir(), 'Applications/Peekaboo.app'), '/Applications/Peekaboo.app']) {
    try { if (!(await fs.lstat(app)).isDirectory()) continue; } catch { continue; }
    try {
      const real = await fs.realpath(app);
      if (real !== app) throw new Error('Unexpected helper path');
      const { stdout } = await execFileAsync('/usr/bin/plutil', ['-extract', 'CFBundleShortVersionString', 'raw', '-o', '-', path.join(app, 'Contents/Info.plist')], { timeout: 5_000, maxBuffer: 16_384 });
      if (stdout.trim() !== PEEKABOO_VERSION) throw new Error('Unexpected helper version');
      // The signature check enforces the reviewed publisher, rather than trusting a file name.
      await execFileAsync('/usr/bin/codesign', ['--verify', '--deep', '--strict', '-R', PEEKABOO_SIGNATURE_REQUIREMENT, app], { timeout: 10_000, maxBuffer: 16_384 });
      await execFileAsync('/usr/bin/open', ['-a', app], { timeout: 5_000, maxBuffer: 16_384 });
      return;
    } catch { throw new Error(`Install the signed Peekaboo ${PEEKABOO_VERSION} app from the official release before opening Mac control.`); }
  }
  throw new Error(`Install Peekaboo ${PEEKABOO_VERSION} in your Applications folder first.`);
}
