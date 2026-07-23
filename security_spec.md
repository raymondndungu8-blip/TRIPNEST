# Firestore Security Specification - Tripnest App

This security specification details the Data Invariants, the "Dirty Dozen" malicious payloads, and the validation tests that enforce secure, relational attribute-based access control (ABAC).

## 1. Data Invariants
- **Identity Integrity**: No user may read or write another user's private Passenger profile. The passenger's document ID must match their Firebase Auth UID (`request.auth.uid`).
- **Immutable Timestamps**: Dynamic status timestamps or creation events must align strictly with server-calculated times (`request.time`).
- **Booking Ownership**: Only the creator of a `Booking` (matching their Passenger identifier) can modify or cancel booking details.
- **Relational Integrity**: A driver can only accept or reject a Booking if they are assigned to it or part of its eligible candidate pool.
- **State Progression Integrity**: Once a booking status reaches terminal states (`completed`, `cancelled`, or `rejected_by_all`), no further modifications to status are permitted.
- **Role Isolation**: Standard passenger accounts can neither modify driver settings, vehicle classifications, nor designate themselves as drivers.

---

## 2. The "Dirty Dozen" Rogue Payloads
These payloads represent adversarial attempts to compromise the backend system. Our Firestore rules must comprehensively block these:

1. **Identity Theft Profile Edit (Spoofed UID)**
   - *Attempt*: Authenticated user `user-123` tries to write over `passengers/user-abc`.
   - *Result*: `PERMISSION_DENIED`.

2. **Self-Rating Booster**
   - *Attempt*: Passenger updates their own score rating directly to `rating: 5.0` without any trips count matching it.
   - *Result*: `PERMISSION_DENIED` (passengers profile attributes are protected by isOwner but shouldn't permit client overrides of rating unless authorized, or rating is updated server-side).

3. **Injected Shadows (Extra Keys / Ghost Fields)**
   - *Attempt*: User registers with `{ id: "user-123", name: "Bob", isSysAdmin: true }` when schemas do not define `isSysAdmin`.
   - *Result*: `PERMISSION_DENIED` (Keys length check prevents shadow fields).

4. **Spoofed Creation Timestamp**
   - *Attempt*: Client sends a `Booking` with `{ createdAt: "2020-01-01T00:00:00Z" }` instead of using the server timestamp placeholder.
   - *Result*: `PERMISSION_DENIED` (Validated against `request.time`).

5. **Unauthorized Trip Takeover**
   - *Attempt*: Driver `driver-789` updates `bookings/booking-111` setting `driverId = "driver-789"` when the event cascade is currently targeting `driver-222`.
   - *Result*: `PERMISSION_DENIED`.

6. **Status Shortcuts (Premature Completion)**
   - *Attempt*: Passenger cancels a trip that is already logged as `completed`.
   - *Result*: `PERMISSION_DENIED` (Terminal state locking blocks updates after completion).

7. **Negative Fare/Budget Hack**
   - *Attempt*: Passenger requests a premium vehicle booking with `{ budget: -100 }`.
   - *Result*: `PERMISSION_DENIED` (Static boundary validations reject sizes/values <= 0).

8. **Giant Payload Attacks (DoS Wallet)**
   - *Attempt*: Malicious actor populates passenger `id` with a 1.2MB garbage base64 string.
   - *Result*: `PERMISSION_DENIED` (Boundary length limits of max 128 characters on identifier sizes).

9. **Driver Self-Promotion to Premium Category**
   - *Attempt*: A standard class driver updates their profile category to `Premium` directly.
   - *Result*: `PERMISSION_DENIED` (Category updates locked or restricted strictly to system limits).

10. **Bypassing Cascade Pool**
    - *Attempt*: Driver accepts a trip request that has already removed them from the remaining `availableDriverPool` due to a prior rejection.
    - *Result*: `PERMISSION_DENIED`.

11. **Client Blanket Query Scraping**
    - *Attempt*: Listing all passenger documents across the service using a naked query without filtering by owner.
    - *Result*: `PERMISSION_DENIED`.

12. **PII Reading Leak**
    - *Attempt*: Regular user queries sensitive phone and contact records of passengers.
    - *Result*: `PERMISSION_DENIED`.

---

## 3. Specifications for Test Coverage
The rules file will be deployed and validated. It enforces the following gates:
- `ownerId == request.auth.uid`
- `isValidId()` limits on path variables
- `affectedKeys().hasOnly()` gates on state mutations
- Strict schema validation in helper functions `isValidPassenger`, `isValidDriver`, and `isValidBooking`
