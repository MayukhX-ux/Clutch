# Clutch Firestore Security Specification

This document outlines the security architecture and invariants for Clutch's collaborative document platform, specifying data validation, structural rules, and threat vectors.

## 1. Data Invariants & Access Control Rules

- **Pages Rules**:
  - Anyone can read/list pages to support open workspace collaboration in the applet.
  - Page titles, icons, and block order arrays can be modified under standard validation.
  - Document IDs must conform to proper standard identifiers (`^[a-zA-Z0-9_\-]+$`).

- **Blocks Subcollection Rules**:
  - Any collaborator can read and write blocks inside any active page.
  - Updates must use fine-grained validation to ensure that block structural properties (`id`, `type`) match proper type invariants.

- **Presence Subcollection Rules**:
  - Active users can publish their cursor location, guest name, color, and focused block ID.
  - Writes must validate that the document ID matches the session identifier, and the `updatedAt` is a valid timestamp.

---

## 2. The "Dirty Dozen" Threat Payloads

Here are twelve highly malicious payloads designed to test boundaries:

1. **Self-Elevated Privilege Hack**: A user attempts to create a page with a custom spoofed system field.
2. **Path ID Poisoning**: A client tries to inject a 500KB string as a subcollection block ID.
3. **Empty Struct Poisoning**: Writing a block without a type parameter.
4. **Incorrect Enum Injection**: Setting a block type to `'malicious-script-injector'`.
5. **Ghost Fields Update**: Attempting to inject extra properties (e.g. `{ isVerified: true }`) into a block document.
6. **Time Spoofing (Future Epoch)**: Providing a client-side timestamp 10 years in the future for `updatedAt`.
7. **Negative Array Index Invariant**: Injecting dummy negative numbers in block IDs order.
8. **Presence Hijack**: Overwriting another active session's presence document.
9. **Zombie Block Creation**: Creating an orphan block without a parent page context.
10. **Huge Content Exhaustion**: Injecting a 20MB block text block (which exceeds the 1MB Firestore limit).
11. **Type Distortion**: Setting `isTrash` field of a Page to a number or string.
12. **Circular Parent References**: Creating parentId loops that would crash the tree component.

---

## 3. Firestore Rules Structure

We will deploy our Fortress rules directly in `firestore.rules` and run the linter.
