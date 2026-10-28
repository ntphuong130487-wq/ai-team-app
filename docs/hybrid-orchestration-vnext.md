# AI Team App vNext — Hybrid Orchestration (draft)
Status: IMPLEMENTATION STARTED / NOT PRODUCTION APPROVED (2026-10-28)
Baseline: main v2.1. No changes to main, index.html or deployed GitHub Pages in this phase.

## Verified baseline
- Static app with browser localStorage and user-pasted responses; source: README.md and index.html.
- CSP explicitly includes `connect-src 'none'`. No browser-side API access is available under this policy.
- Existing roles: Director, Worker, Leader, independent QA; six-step workflow, round limit, escalation, export, SHA-256 sealing described. A seal alone is not a remotely trusted immutable audit log.
- UI already has an ingest box, room lifecycle and status dashboard. Preserve all original UX and data compatibility.

## Connection assessment (confirmed versus pending)
| Component | Confirmed | Unverified / restriction | First implementation |
|---|---|---|---|
| ChatGPT Plus | Human-facing ChatGPT, connected tools in eligible surfaces | Subscription does not provide autonomous third-party ChatGPT API calls | Manual adapter; approved app-connector actions only |
| Claude Pro / Claude Code | Subscription sign-in for Claude Code; cloud coding workflows available | No verified unattended remote job trigger from this static app using subscription alone | Manual + GitHub branch/PR artifact handoff |
| Google AI Pro | Gemini application available | Google deprecated consumer Google-login Gemini CLI/Code Assist on 2026-06-18; do not rely on CLI OAuth | Manual QA adapter; API only if separately approved |
| GitHub | Repo access, commits, branches, PRs | Never use GitHub Actions to circumvent provider terms | Artifact, PR, immutable source/version IDs |
| Google Drive | Connected file storage | Automatic third-party webhook/API access needs separate permission and testing | Optional artifact archive |
| Vercel | Deployment possible | Hosting/server costs and secrets must be evaluated | Not enabled in phase 1 |

References:
- https://developers.google.com/gemini-code-assist/docs/deprecations/code-assist-individuals
- https://docs.anthropic.com/en/docs/claude-code/getting-started
- https://help.openai.com/en/articles/11145903-connecting-github-to-chatgpt

## Control design
1. Each task has a unique task_id, room_id, source digest, expected artifact type, assigned provider, connector mode, authorized actions, version and explicit acceptance criteria.
2. Dispatcher is deterministic; it never accepts a model's assertion that QA passed as independent proof.
3. State machine: queued -> assigned -> running -> result_received -> qa_pending -> qa_passed OR rework_required; failure -> blocked. Release only from qa_passed on identical artifact digest with permitted authorization.
4. Each execution records input/output references, provider and model identity where verifiable, timestamps, artifact digest, evidence, and execution mode (manual/connector). Manual results must be marked user-submitted; cannot claim authenticated model identity.
5. Independent QA provider must differ from originating execution provider. QA must reference current artifact digest and acceptance criteria.
6. Fail closed on unknown state, unavailable connector, mismatched task/version/digest, missing evidence or exceeded retry budget; preserve manual fallback.
7. No credential/session scraping, unofficial browser automation of AI chat services, API spend or production deployment without explicit approval.
8. Confidentiality: public repository contains only architecture, schemas, synthetic test fixtures and non-sensitive code; no actual AgriS files.
9. Tamper resistance: store append-only audit events in a protected server-side store for production; browser localStorage is NOT sufficient.
10. Release authorization: explicitly approved low-risk artifacts may auto-release after evidence-backed QA; irreversible/external/high-impact actions require a separate approval gate.

## Incremental implementation
Phase 0: schema + deterministic transition validator + tests in isolated directory (this branch).
Phase 1: adapter interfaces and manual/GitHub artifact adapter, resumable queue, failure injection tests.
Phase 2: optional official connector integrations with per-provider eligibility and token security.
Phase 3: opt-in server storage and authenticated webhooks; staged QA before any merge.

## QA gates
- Contract: reject invalid ID/state, stale output, mismatched artifact hash, self-QA, missing evidence, unauthorized release.
- Reliability: replay/idempotency, partial failure, timeout and retry limit.
- Security: authorization, DLP, secret scanning and storage migration.
- Regression: existing app built-in Auto-Tests, import/export compatibility, no change to default manual workflow.
- Review: independent reviewer and PR checks; no automatic merge.
