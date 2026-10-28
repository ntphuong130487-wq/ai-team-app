// Hybrid orchestration foundation. Isolated from v2.1 production application.
// Pure deterministic state machine: no network calls, credentials or API access.
export const STATES = Object.freeze([
  'queued','assigned','running','result_received','qa_pending',
  'qa_passed','rework_required','blocked','released'
]);
const NEXT = Object.freeze({
  queued: ['assigned','blocked'],
  assigned: ['running','blocked'],
  running: ['result_received','blocked'],
  result_received: ['qa_pending','blocked'],
  qa_pending: ['qa_passed','rework_required','blocked'],
  qa_passed: ['released','blocked'],
  rework_required: ['assigned','blocked'],
  blocked: ['assigned'],
  released: []
});
function nonempty(v) { return typeof v === 'string' && v.trim().length > 0; }
function error(message) { throw new Error(message); }
export function createTask({taskId, roomId, provider, sourceDigest, acceptanceCriteria, maxReworks=2}) {
  if (![taskId,roomId,provider,sourceDigest].every(nonempty)) error('Required metadata missing');
  if (!Array.isArray(acceptanceCriteria) || !acceptanceCriteria.length || !acceptanceCriteria.every(nonempty)) error('Acceptance criteria required');
  if (!Number.isInteger(maxReworks) || maxReworks<0 || maxReworks>10) error('Invalid rework limit');
  return Object.freeze({
    taskId,roomId,provider,sourceDigest,acceptanceCriteria:[...acceptanceCriteria],
    maxReworks,reworks:0,state:'queued',version:1,artifact:null,qa:null,events:[]
  });
}
export function transition(task, to, payload={}) {
  if (!task || !STATES.includes(task.state) || !STATES.includes(to)) error('Invalid task/state');
  if (!NEXT[task.state].includes(to)) error('Transition not permitted');
  if (task.state==='blocked' && to==='assigned' && payload.authorized !== true) error('Recovery requires authorization');
  const updated={...task,state:to,events:[...task.events]};
  if (to==='result_received') {
    if (![payload.artifactId,payload.digest,payload.evidenceRef].every(nonempty)) error('Artifact evidence required');
    if (payload.taskId!==task.taskId || payload.version!==task.version) error('Stale/wrong task result');
    updated.artifact={artifactId:payload.artifactId,digest:payload.digest,evidenceRef:payload.evidenceRef,version:task.version,submissionMode:payload.submissionMode==='connector'?'connector':'manual'};
    updated.qa=null;
  }
  if (to==='qa_pending' && !updated.artifact) error('No artifact to QA');
  if (to==='qa_passed') {
    if (!task.artifact || !nonempty(payload.qaProvider) || payload.qaProvider===task.provider) error('QA independence failure');
    if (payload.digest!==task.artifact.digest || !nonempty(payload.evidenceRef) || payload.passed!==true) error('QA digest/evidence mismatch');
    updated.qa={provider:payload.qaProvider,digest:payload.digest,evidenceRef:payload.evidenceRef,passed:true};
  }
  if (to==='rework_required') {
    if (!nonempty(payload.qaProvider) || payload.qaProvider===task.provider || !nonempty(payload.evidenceRef) || payload.digest!==task.artifact?.digest) error('Invalid QA rework evidence');
    if (task.reworks>=task.maxReworks) error('Rework limit exceeded; block/escalate');
    updated.reworks=task.reworks+1;
    updated.version=task.version+1;
    updated.artifact=null;
    updated.qa=null;
  }
  if (to==='released') {
    if (!task.qa?.passed || !task.artifact || task.qa.digest!==task.artifact.digest || payload.authorized!==true) error('Release authorization or QA missing');
    if (!nonempty(payload.releaseRef)) error('Release reference required');
  }
  updated.events.push(Object.freeze({from:task.state,to,reason:payload.reason||null,evidenceRef:payload.evidenceRef||null}));
  return Object.freeze(updated);
}
