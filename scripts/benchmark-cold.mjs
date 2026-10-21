// Copyright (c) 2026 Brian Crumrine
// SPDX-License-Identifier: Apache-2.0
// Child process: independently imported core and first scoring invocation.
import {performance} from 'node:perf_hooks';
const input=new TextEncoder().encode(JSON.stringify({schemaVersion:'1',policyVersion:'synthetic-1',subject:'Synthetic contact',headers:[],text:'Hello, here is the information.',sourceComplete:true}));
const start=performance.now();
const {scoreRequest}=await import('../packages/core/dist/index.js');
const imported=performance.now();const result=scoreRequest(input);
process.stdout.write(JSON.stringify({importMs:imported-start,firstScoreMs:performance.now()-imported,status:result.status}));
