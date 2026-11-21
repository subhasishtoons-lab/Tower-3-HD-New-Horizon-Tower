# Security Specification — Tower 3 HD Oil Housing Society

## 1. Data Invariants
1. **PII Isolation**: Resident profiles (`/residents/{uid}`) contain `email` and `phone`. Only the authenticated owner (`request.auth.uid == uid`) or a verified admin may read or modify a resident document. No other collection stores resident email or phone numbers.
2. **Self-Assigned Role Prevention**: During `/residents/{uid}` creation, `role` must equal `'resident'`, and users cannot mutate `role` or `uid` on update.
3. **Society Scope Enforcement**: Every shared collection (`notices`, `expenses`, `payments`, `maintenanceRequests`, `discussions`, `activities`) requires `societyId == 'tower3-duliajan'`, and `allow list` rules explicitly evaluate `resource.data.societyId == 'tower3-duliajan'` (or `resource.data.actorUid == request.auth.uid`) rather than blanket `isSignedIn()`.
4. **Master Gate for Subcollections**: Every reply under `/discussions/{topicId}/replies/{replyId}` verifies that the parent `/discussions/{topicId}` exists and is not `resolved` before creation.
5. **Terminal State Locking**: Paid receipts (`/payments/{paymentId}`) are immutable once created (`status == 'paid'`), and `resolved` maintenance requests or discussions cannot be reopened or mutated by non-admin residents.
6. **Temporal Integrity & Path Hardening**: Every single-document operation validates `isValidId()` on document IDs (`^[a-zA-Z0-9_\-]+$`, max 128 chars), enforces `.size()` bounds on every string, and mandates `createdAt == request.time` on create and `updatedAt == request.time` on update.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unverified Admin Email Spoof**: Auth token claims admin email `subhasish.toons@gmail.com` with `email_verified: false`.
2. **Cross-User PII Read**: Resident A attempts `get` on `/residents/{residentB_uid}`.
3. **Self-Role Escalation on Signup**: Resident creates `/residents/{uid}` with `role: "representative"` or `isAdmin: true`.
4. **Shadow Field Injection on Notice**: Resident posts to `/notices/{id}` with an undeclared ghost field `approvedByAdmin: true`.
5. **Author UID Spoofing on Expense**: Resident creates `/expenses/{id}` with `addedByUid` set to another resident's UID.
6. **Oversized ID Poisoning**: Client writes to `/notices/` with a 300-character document ID containing spaces/symbols.
7. **Invalid Unit Number Injection**: Resident sets `unitNumber: "099"` (outside Tower 3 range `049`–`072`).
8. **Backdated Timestamp Spoofing**: Resident creates `/payments/{id}` with client-supplied past `createdAt != request.time`.
9. **Mutation of Paid Receipt**: Resident attempts `update` on `/payments/{id}` to alter `totalAmount` after payment.
10. **Orphaned Discussion Reply**: Resident creates `/discussions/nonexistent-topic/replies/r1`.
11. **Resolved Maintenance Tampering**: Non-admin resident updates a `maintenanceRequests/{id}` whose existing `status == 'resolved'`.
12. **Oversized String DoS**: Resident writes a 10,000-character `content` field to `/notices/{id}`.
