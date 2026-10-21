// Adapted from Sarv/mailguard src/headers/bulk.ts at ae51a1ddee18649ef729a4195313cbf57db22e87.
// Copyright (c) 2026 Sarv
// SPDX-License-Identifier: MIT
// Full notice: THIRD_PARTY_NOTICES.md. Only list-id/list-unsubscribe and precedence
// predicates retained. No ESP table/regex; auto-submitted receipts aren't marketing.
export function marketingHeaders(headers:readonly {name:string;value:string}[]):boolean {
  return headers.some(({name,value})=>{
    const v=value.trim().toLowerCase();
    return ((name==='list-id' || name==='list-unsubscribe') && v!=='') ||
      (name==='precedence' && (v==='bulk' || v==='list' || v==='junk'));
  });
}
