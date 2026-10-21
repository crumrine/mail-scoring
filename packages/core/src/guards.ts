// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
import { LIMITS, type LimitId, type ScoreInputV1 } from './contract.js';

class InvalidInput extends Error { constructor() { super('invalid_input'); } }
const invalid = (): never => { throw new InvalidInput(); };
// Only parser-created, deeply frozen roots can reach structural enumeration.
// Identity checks do not inspect caller keys, prototypes, accessors or Proxy traps.
const parsedRoots = new WeakSet<object>();
function freezeParsed(value: unknown): void {
  // Called ONLY on JSON.parse output after byte/depth/token preflight. Enumeration
  // and recursion here therefore have hard bounds; never call on direct input.
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freezeParsed(child);
    Object.freeze(value);
  }
}
/** Bounded work even if a direct caller supplies a giant string. No giant encode allocation. */
export function boundedText(value: unknown, maxBytes: number): {text: string; bytes: number; truncated: boolean} {
  if (typeof value !== 'string' || !Number.isSafeInteger(maxBytes) || maxBytes < 0 || maxBytes > LIMITS.requestBytes) return invalid();
  // V8 may flatten an entire rope on the first codePointAt/slice. Read length
  // before either operation; larger sources are omitted, not prefix-materialized.
  if (value.length > LIMITS.requestBytes) return {text:'', bytes:0, truncated:true};
  let end = 0, bytes = 0;
  while (end < value.length && bytes < maxBytes) {
    const point = value.codePointAt(end)!;
    const width = point > 0xffff ? 2 : 1;
    const cost = point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
    if (bytes + cost > maxBytes) break;
    bytes += cost; end += width;
  }
  return {text: value.slice(0, end), bytes, truncated: end < value.length};
}
/** Data objects from JSON only; do not execute accessors or walk arbitrary nested values. */
function record(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return invalid();
  let count = 0;
  const copy: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key in value) {
    if (++count > allowed.length || !allowed.includes(key)) return invalid();
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor)) return invalid();
    copy[key] = descriptor.value as unknown;
  }
  return copy;
}
function bool(value: unknown): boolean { if (typeof value !== 'boolean') return invalid(); return value; }
function array(value: unknown): unknown[] { if (!Array.isArray(value)) return invalid(); return value; }
function item(values: unknown[], index: number): unknown {
  const descriptor=Object.getOwnPropertyDescriptor(values,String(index));
  if (!descriptor || !('value' in descriptor)) return invalid();
  return descriptor.value as unknown;
}
function auth(value: unknown): 'pass' | 'fail' | 'unknown' {
  if (value !== 'pass' && value !== 'fail' && value !== 'unknown') return invalid(); return value;
}
export type GuardedInput = {input: ScoreInputV1; limitsHit: LimitId[]};
export function guardInput(value: unknown): GuardedInput | null {
  try {
    if (!value || typeof value !== 'object' || !parsedRoots.has(value)) return null;
    const r = record(value, ['schemaVersion','policyVersion','subject','headers','text','html','extractedText','addresses','urls','attachments','transport','preferences','sourceComplete']);
    if (r.schemaVersion !== '1') return invalid();
    const limits = new Set<LimitId>();
    const read = (v: unknown, cap: number, id: LimitId, multiline = false): string => {
      const b = boundedText(v, cap);
      if (b.truncated) limits.add(id);
      // Controls are removed, never interpreted; UTF-16 lone surrogates become U+FFFD.
      const re = multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/g : /[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/g;
      if (re.test(b.text)) limits.add('control_chars');
      return b.text.replace(re, '').toWellFormed();
    };
    const policy = boundedText(r.policyVersion, 64);
    if (policy.truncated || !/^[a-zA-Z0-9._-]{1,64}$/.test(policy.text)) return invalid();
    const input: ScoreInputV1 = {schemaVersion:'1', policyVersion:policy.text,
      subject:read(r.subject,LIMITS.subjectBytes,'field_bytes'), headers:[],
      text:read(r.text,LIMITS.sourceBytes,'source_bytes',true), sourceComplete:bool(r.sourceComplete)};
    // Charge source bytes BEFORE control removal; never reclaim input budget.
    const sourceUsed = boundedText(r.text,LIMITS.sourceBytes).bytes;
    if (r.html !== undefined) {
      input.html = read(r.html,LIMITS.sourceBytes-sourceUsed,'source_bytes',true);
      if (r.html !== '') limits.add('html_uninspected');
    }
    if (r.extractedText !== undefined) input.extractedText = read(r.extractedText,LIMITS.extractedBytes,'extracted_bytes',true);
    const hs = array(r.headers);
    if (hs.length > LIMITS.headers) limits.add('header_count');
    let headerBytes = 0;
    const seen = new Set<string>();
    for (let i=0; i<Math.min(hs.length,LIMITS.headers); i++) {
      const h=record(item(hs,i),['name','value']);
      const name=boundedText(h.name,128);
      if (name.truncated || !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name.text)) return invalid();
      // Wire-equivalent accounting: name + ': ' + value + CRLF, including original controls.
      const overhead=name.bytes+4;
      const v=boundedText(h.value,LIMITS.headerFieldBytes-overhead);
      if (v.truncated) limits.add('header_field_bytes');
      if (headerBytes + overhead + v.bytes > LIMITS.headerBytes) { limits.add('header_bytes'); break; }
      headerBytes += overhead + v.bytes;
      const n=name.text.toLowerCase();
      if (seen.has(n)) limits.add('duplicate_header');
      seen.add(n);
      input.headers.push({name:n,value:read(v.text,LIMITS.headerFieldBytes,'header_field_bytes')});
    }
    if (r.addresses !== undefined) {
      const a=record(r.addresses,['from','replyTo','envelopeFrom']); input.addresses={};
      for (const key of ['from','replyTo','envelopeFrom'] as const) if (a[key] !== undefined) input.addresses[key]=read(a[key],LIMITS.addressBytes,'field_bytes');
    }
    if (r.urls !== undefined) {
      const urls=array(r.urls); input.urls=[];
      if (urls.length>LIMITS.urls) limits.add('url_count');
      for (let i=0;i<Math.min(urls.length,LIMITS.urls);i++) input.urls.push(read(item(urls,i),LIMITS.urlBytes,'field_bytes'));
    }
    if (r.attachments !== undefined) {
      const attachments=array(r.attachments); input.attachments=[];
      if (attachments.length>LIMITS.attachments) limits.add('attachment_count');
      for (let i=0;i<Math.min(attachments.length,LIMITS.attachments);i++) {
        const a=record(item(attachments,i),['filename','mediaType']);
        input.attachments.push({filename:read(a.filename,LIMITS.filenameBytes,'field_bytes'),mediaType:read(a.mediaType,LIMITS.typeBytes,'field_bytes')});
      }
    }
    if (r.transport !== undefined) {
      const t=record(r.transport,['provenance','complete','spf','dkim','dmarc']);
      if (t.provenance!=='unknown' && t.provenance!=='upstream') return invalid();
      input.transport={provenance:t.provenance,complete:bool(t.complete),spf:auth(t.spf),dkim:auth(t.dkim),dmarc:auth(t.dmarc)};
    }
    if (r.preferences !== undefined) {
      const p=record(r.preferences,['senderAllowed','senderBlocked']);
      input.preferences={senderAllowed:bool(p.senderAllowed),senderBlocked:bool(p.senderBlocked)};
    }
    if (!input.sourceComplete) limits.add('source_incomplete');
    return {input,limitsHit:[...limits]};
  } catch { return null; }
}
/** Check raw bytes and JSON structure BEFORE parsing. Fixed nesting/token ceilings. */
export function parseRequest(bytes: Uint8Array): {value?: unknown; error?: 'request_limit' | 'invalid_json'} {
  if (bytes.byteLength > LIMITS.requestBytes) return {error:'request_limit'};
  try {
    const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    let depth=0, tokens=0, quoted=false, escaped=false;
    for (let i=0;i<text.length;i++) {
      const c=text[i];
      if (quoted) { if (escaped) escaped=false; else if(c==='\\') escaped=true; else if(c==='"') quoted=false; continue; }
      if(c==='"') quoted=true;
      if(c==='{' || c==='[') { if (++depth>LIMITS.jsonDepth) return {error:'request_limit'}; }
      if(c==='}' || c===']') depth--;
      if(c==='{' || c==='[' || c===',' || c===':') { if (++tokens>LIMITS.jsonTokens) return {error:'request_limit'}; }
    }
    const value: unknown = JSON.parse(text);
    freezeParsed(value);
    if (value !== null && typeof value === 'object') parsedRoots.add(value);
    return {value};
  } catch { return {error:'invalid_json'}; }
}
/** Bounded request stream accumulation, independent of a spoofable Content-Length. */
export async function readRequest(stream: ReadableStream<Uint8Array> | null): Promise<Uint8Array | null> {
  if (!stream) return new Uint8Array();
  const reader=stream.getReader();
  const buffer=new Uint8Array(LIMITS.requestBytes);
  let size=0, chunks=0;
  try {
    while (true) {
      const {value,done}=await reader.read();
      if(done) return buffer.subarray(0,size);
      if(++chunks>4096 || value.byteLength>LIMITS.requestBytes-size) { void reader.cancel().catch(()=>{}); return null; }
      buffer.set(value,size); size+=value.byteLength;
    }
  } catch { return null; } finally { reader.releaseLock(); }
}
