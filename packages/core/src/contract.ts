// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
export const LIMITS = Object.freeze({
  requestBytes: 262144, sourceBytes: 131072, extractedBytes: 65536,
  headerBytes: 32768, headers: 100, headerFieldBytes: 8192,
  urls: 100, attachments: 32, subjectBytes: 2048, addressBytes: 512,
  urlBytes: 2048, filenameBytes: 255, typeBytes: 127,
  jsonDepth: 6, jsonTokens: 4096, outputBytes: 4096,
});
export const LIMIT_IDS = [
  'source_bytes', 'extracted_bytes', 'header_bytes', 'header_count',
  'header_field_bytes', 'url_count', 'attachment_count', 'field_bytes',
  'duplicate_header', 'control_chars', 'source_incomplete', 'html_uninspected',
  'auth_unknown',
] as const;
export type LimitId = typeof LIMIT_IDS[number];
export const REASONS = Object.freeze({ 'auth_failed': 'Verified transport evidence reports authentication failure.' });
export type ReasonId = keyof typeof REASONS;
export type AuthValue = 'pass' | 'fail' | 'unknown';
export interface ScoreInputV1 {
  schemaVersion: '1';
  policyVersion: string;
  subject: string;
  headers: Array<{name: string; value: string}>;
  text: string;
  html?: string;
  extractedText?: string;
  addresses?: {from?: string; replyTo?: string; envelopeFrom?: string};
  urls?: string[];
  attachments?: Array<{filename: string; mediaType: string}>;
  transport?: {provenance: 'unknown' | 'upstream'; complete: boolean; spf: AuthValue; dkim: AuthValue; dmarc: AuthValue};
  preferences?: {senderAllowed: boolean; senderBlocked: boolean};
  sourceComplete: boolean;
}
/** Trusted application context, NEVER deserialized from email or scoring request. */
export interface ScoreContext { transportVerified?: boolean }
export type Status = 'complete' | 'partial' | 'unavailable';
export interface ScoreResultV1 {
  schemaVersion: '1'; engineVersion: '0.1.0'; ruleSetVersion: 'foundation-1';
  status: Status;
  heuristicScore: number;
  signals: {spam: 'present' | 'unknown'; phishing: 'present' | 'unknown'; marketing: 'present' | 'unknown'};
  reasons: Array<{id: ReasonId; contribution: number; reason: typeof REASONS[ReasonId]}>;
  limitsHit: LimitId[];
  error: null | 'invalid_input' | 'request_limit' | 'invalid_json';
}
