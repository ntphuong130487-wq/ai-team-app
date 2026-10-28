import test from 'node:test';
import assert from 'node:assert/strict';
import {createTask,transition} from './orchestrator.mjs';
const base=()=>createTask({taskId:'T1',roomId:'R1',provider:'claude',sourceDigest:'sha256:source',acceptanceCriteria:['Has test evidence']});
const step=(x,to,p={})=>transition(x,to,p);
const submitted=(x)=>step(x,'result_received',{taskId:'T1',version:x.version,artifactId:'PR1',digest:'sha256:artifact',evidenceRef:'github:PR1'});
test('valid run -> independent QA -> authorized release',()=>{
 let t=base();t=step(t,'assigned');t=step(t,'running');t=submitted(t);t=step(t,'qa_pending');
 t=step(t,'qa_passed',{qaProvider:'gemini',digest:'sha256:artifact',evidenceRef:'QA-1',passed:true});
 t=step(t,'released',{authorized:true,releaseRef:'release:1'});
 assert.equal(t.state,'released'); assert.equal(t.events.length,6);
});
test('self QA cannot pass',()=>{
 let t=step(step(submitted(step(step(base(),'assigned'),'running')),'qa_pending'),'blocked');
 assert.equal(t.state,'blocked');
 let a=base(); a=step(a,'assigned'); a=step(a,'running');a=submitted(a);a=step(a,'qa_pending');
 assert.throws(()=>step(a,'qa_passed',{qaProvider:'claude',digest:'sha256:artifact',evidenceRef:'Q1',passed:true}),/independence/);
});
test('stale result and QA digest cannot pass',()=>{
 let t=step(step(base(),'assigned'),'running');
 assert.throws(()=>step(t,'result_received',{taskId:'T1',version:0,artifactId:'A',digest:'D',evidenceRef:'E'}),/Stale/);
 t=step(submitted(t),'qa_pending');
 assert.throws(()=>step(t,'qa_passed',{qaProvider:'gemini',digest:'different',evidenceRef:'E',passed:true}),/mismatch/);
 assert.throws(()=>step(t,'released',{authorized:true,releaseRef:'R'}),/Transition/);
});
test('rework increments version and invalidates old evidence',()=>{
 let t=step(submitted(step(step(base(),'assigned'),'running')),'qa_pending');
 t=step(t,'rework_required',{qaProvider:'gemini',digest:'sha256:artifact',evidenceRef:'qa:fail'});
 assert.equal(t.version,2);assert.equal(t.artifact,null);
 t=step(step(t,'assigned'),'running');
 assert.throws(()=>step(t,'result_received',{taskId:'T1',version:1,artifactId:'A',digest:'D',evidenceRef:'E'}),/Stale/);
});
test('recovery, missing evidence and release need controls',()=>{
 let t=step(base(),'blocked');
 assert.throws(()=>step(t,'assigned'),/authorization/);
 t=step(t,'assigned',{authorized:true}); t=step(t,'running');
 assert.throws(()=>step(t,'result_received',{taskId:'T1',version:1,artifactId:'A',digest:'D'}),/evidence/);
});
