// Adapted from Sarv/mailguard src/verdict.ts at ae51a1ddee18649ef729a4195313cbf57db22e87.
// Copyright (c) 2026 Sarv
// SPDX-License-Identifier: MIT
// Full original notice: THIRD_PARTY_NOTICES.md. Only the argument type is narrowed.
import type { AuthValue } from '../contract.js';
export function authenticationFailed(auth: {spf: AuthValue; dkim: AuthValue; dmarc: AuthValue}): boolean {
  const dmarcKnown = auth.dmarc === 'pass' || auth.dmarc === 'fail';
  return auth.dmarc === 'fail' || (!dmarcKnown && auth.spf === 'fail' && auth.dkim === 'fail');
}
