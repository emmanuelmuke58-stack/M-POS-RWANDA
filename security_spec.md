# Security Specification & Threat Model — Fresh & More M-POS

## 1. Data Invariants

1. **System Default Deny**: Every document in the database is closed by default unless explicitly matched and granted.
2. **Product Integrity**: Products require a valid ID (`isValidId`), non-empty name, category, positive pricing, and valid stock. Products cannot have arbitrary rogue fields.
3. **Transaction Immutability**: Once created, sales records cannot be modified or deleted by arbitrary staff. Financial totals (`subtotal`, `tax`, `total`) must be positive numbers.
4. **Audit Trail Security**: `auditLogs` are append-only audit trail documents. Updates and deletions are strictly forbidden for audit preservation.
5. **Customer Protection**: Customer records protect debtor information; credit limits and balances are numeric and bounded.
6. **Role Governance**: Regular cashiers and managers cannot escalate privileges or mutate staff roles or custom permissions.

## 2. The Dirty Dozen Threat Payloads

1. **ID Injection Attack**: `{ id: "../../../etc/shadow" }` -> Denied by `isValidId(id)`.
2. **Oversized String Bomb**: `{ name: "A".repeat(500000) }` -> Denied by `data.name.size() <= 200`.
3. **Shadow Field Injection**: `{ id: "p1", name: "Milk", sellingPrice: 1500, stock: 10, unit: "L", status: "Active", isSuperAdminBackdoor: true }` -> Denied by strict keys check.
4. **Negative Price Exploit**: `{ id: "p2", name: "Bread", sellingPrice: -5000, stock: 10, unit: "pcs", status: "Active" }` -> Denied by price boundary checks.
5. **Tampered Sale Total**: Submitting a sale where total is negative or not numeric -> Denied by `isValidSale()`.
6. **Unauthorized Sale Erasure**: Non-admin attempting to delete completed sale -> Denied by `allow delete: if false;`.
7. **Audit Log Modification**: Attempting `update` on `/auditLogs/{logId}` -> Denied by `allow update: if false;`.
8. **Audit Log Deletion**: Attempting `delete` on `/auditLogs/{logId}` -> Denied by `allow delete: if false;`.
9. **Role Self-Escalation**: Cashier attempting to update own role to "Super Admin" -> Denied by role lock.
10. **Orphaned Cart Record**: Creating a held sale with empty or corrupted reference -> Denied by `isValidHeldSale()`.
11. **Settings Poisoning**: Non-admin modifying tax rate or business details -> Denied by admin guard.
12. **Anonymous Data Scrape**: Unauthenticated client querying `/customers` or `/users` -> Denied by `isSignedIn()` and ABAC rules.
