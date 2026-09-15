import { randomBytes, timingSafeEqual } from 'node:crypto';

/** Session-only, explicit browser selection. The marker is not a companion API token. */
export class ChromePairing {
  private token?: string;
  private issuedAt = 0;
  private selected = false;
  private origin?: string;
  constructor(private readonly now = Date.now) {}
  create(origin: string) {
    const url = new URL(origin);
    if (url.origin !== origin || url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port) throw new Error('Chrome pairing requires the local companion.');
    if (!this.token || this.origin !== origin || (!this.selected && this.now() - this.issuedAt > 15 * 60_000)) {
      this.token = randomBytes(32).toString('base64url'); this.issuedAt = this.now(); this.selected = false; this.origin = origin;
    }
    return `${origin}/browser/pair/${this.token}`;
  }
  accepts(token: string) {
    return Boolean(this.token && /^[a-zA-Z0-9_-]{43}$/.test(token) && timingSafeEqual(Buffer.from(token), Buffer.from(this.token)) && (this.selected || this.now() - this.issuedAt <= 15 * 60_000));
  }
  select(token: string) {
    if (!this.accepts(token)) throw new Error('This Chrome connection link expired. Start Connect Chrome again.');
    this.selected = true;
  }
  get markerUrl() { return this.selected && this.origin && this.token ? `${this.origin}/browser/pair/${this.token}` : undefined; }
  get status() { return this.selected ? 'selected' : this.token ? 'awaiting_selection' : 'not_connected'; }
}

export function chromePairingHtml(selected: boolean): string {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Connect Chrome · ContextDrop</title><style>body{font:17px/1.55 -apple-system,BlinkMacSystemFont,sans-serif;background:#f7f8fb;color:#152034;margin:0;padding:10vh 24px}main{max-width:510px;margin:auto;background:white;border:1px solid #e5e9f1;border-radius:24px;padding:36px}h1{font-size:29px;letter-spacing:-.7px;line-height:1.2}p{color:#526078}button{font:600 17px -apple-system,sans-serif;color:white;background:#2359ef;border:0;border-radius:12px;padding:16px 24px;cursor:pointer}small{display:block;margin-top:24px;color:#65718a}code{font-size:14px;overflow-wrap:anywhere}</style><main><b>ContextDrop</b><h1>${selected ? 'This is your Chrome.' : 'Use this Chrome?'}</h1>${selected ? '<p>Keep this tab open. ContextDrop will open task tabs in this profile.</p><p>If Chrome is not connected yet, open <code>chrome://inspect/#remote-debugging</code> yourself, enable Remote Debugging, and choose <b>Allow</b> when Chrome asks. Then retry your task.</p><small>Only task tabs are controlled. Chrome can still ask you to sign in or complete a CAPTCHA.</small>' : '<p>Open this page in the Chrome profile you want ContextDrop to use.</p><form method="post"><button type="submit">Connect this Chrome</button></form><small>This selects your browser. Chrome separately asks you to allow the connection.</small>'}</main></html>`;
}
