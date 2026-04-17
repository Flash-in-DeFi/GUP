# Requirements Document

## Introduction

A React/TypeScript single-page application that provides both a user-facing off-ramp interface and an admin dashboard for a gasless USD → NGN conversion platform. Users deposit USDC on Stellar, view their balance, and withdraw to Nigerian bank accounts at a locked FX rate. Admins manage users, monitor liquidity, and handle manual recovery of unmatched deposits. The frontend communicates exclusively with the existing REST API at `http://localhost:3000`.

## Glossary

- **App**: The React/TypeScript frontend application living in `client/`
- **User**: An authenticated end-user of the off-ramp platform
- **Admin**: A privileged operator who manages the platform via the admin dashboard
- **USDC**: USD Coin stablecoin deposited via Stellar network
- **NGN**: Nigerian Naira, the target fiat currency
- **Deposit_Address**: The Stellar address + memo ID pair used to receive USDC
- **Locked_Rate**: An FX rate snapshot valid for 45 seconds, identified by a `lockId`
- **Withdrawal**: A request to convert USDC balance to NGN via bank transfer
- **KYC**: Know Your Customer identity verification status (`pending` | `approved` | `rejected`)
- **Manual_Recovery**: An unmatched deposit that requires admin intervention to assign to a user
- **Auth_Store**: Client-side storage (localStorage) holding the JWT token and user metadata
- **API_Client**: The React Query + fetch layer that communicates with the backend

---

## Requirements

### Requirement 1: Authentication

**User Story:** As a visitor, I want to sign up and log in, so that I can access my wallet and initiate withdrawals.

#### Acceptance Criteria

1. WHEN a visitor submits a valid email and password on the signup form, THE App SHALL call `POST /auth/signup` and redirect the user to the dashboard on success.
2. WHEN a visitor submits a valid email and password on the login form, THE App SHALL call `POST /auth/login`, store the returned JWT in Auth_Store, and redirect to the dashboard.
3. WHEN `POST /auth/signup` returns a 409 status, THE App SHALL display the message "Email already registered" inline on the signup form.
4. WHEN `POST /auth/login` returns a 401 status, THE App SHALL display the message "Invalid email or password" inline on the login form.
5. IF the email field is empty or not a valid email format, THEN THE App SHALL display a validation error before submitting the form.
6. IF the password field contains fewer than 8 characters, THEN THE App SHALL display a validation error before submitting the form.
7. WHEN a user clicks "Log out", THE App SHALL clear Auth_Store and redirect to the login page.
8. WHILE a user is unauthenticated, THE App SHALL redirect any protected route to the login page.
9. WHEN the stored JWT is expired, THE App SHALL clear Auth_Store and redirect to the login page.

---

### Requirement 2: Dashboard

**User Story:** As an authenticated user, I want a dashboard showing my balance, deposit address, and recent activity, so that I can monitor my account at a glance.

#### Acceptance Criteria

1. WHEN the dashboard loads, THE App SHALL call `GET /wallet` and display the USDC balance.
2. WHEN the dashboard loads, THE App SHALL call `GET /deposit-address` and display the Stellar address and memo ID.
3. THE App SHALL render a QR code encoding the Stellar deposit address alongside the text address and memo ID.
4. WHEN the dashboard loads, THE App SHALL call `GET /transactions?page=1&limit=5` and display the five most recent transactions.
5. WHEN a user clicks "Copy" next to the deposit address, THE App SHALL copy the address to the clipboard and show a brief confirmation toast.
6. WHEN a user clicks "Copy" next to the memo ID, THE App SHALL copy the memo ID to the clipboard and show a brief confirmation toast.
7. IF `GET /wallet` returns an error, THEN THE App SHALL display an inline error message and a retry button.
8. WHILE wallet data is loading, THE App SHALL display skeleton placeholder UI in place of the balance and deposit address.

---

### Requirement 3: Withdraw Page

**User Story:** As an authenticated user with approved KYC, I want to enter a USDC amount, see the NGN equivalent at a locked rate, and confirm the withdrawal, so that I can convert my balance to naira.

#### Acceptance Criteria

1. WHEN a user navigates to the withdraw page, THE App SHALL call `GET /rates` and display the current platform FX rate (NGN per USDC).
2. WHEN a user enters a USDC amount greater than zero, THE App SHALL display the estimated NGN output calculated as `amount × platformRate`.
3. WHEN a user clicks "Lock Rate & Preview", THE App SHALL call `POST /withdraw` with a `lockId` obtained from the rates endpoint and display a confirmation modal showing the locked NGN amount and a 45-second countdown timer.
4. WHEN the 45-second countdown reaches zero before confirmation, THE App SHALL dismiss the modal and display a message "Rate expired — please try again."
5. WHEN a user confirms the withdrawal in the modal, THE App SHALL submit the withdrawal and redirect to the Withdrawal Status page for that withdrawal ID.
6. IF the USDC amount exceeds the user's current balance, THEN THE App SHALL display "Insufficient balance" and disable the submit button.
7. IF `POST /withdraw` returns a 403 status, THEN THE App SHALL display "KYC approval required to withdraw."
8. IF `POST /withdraw` returns a 422 status with a daily limit message, THEN THE App SHALL display the daily limit error message returned by the API.
9. THE App SHALL require bank code, account number (10 digits), and account name fields before enabling the "Lock Rate & Preview" button.
10. IF the account number field contains a non-numeric character or is not exactly 10 digits, THEN THE App SHALL display a validation error before submission.

---

### Requirement 4: Transaction History

**User Story:** As an authenticated user, I want to browse my full transaction history with pagination, so that I can review all past deposits and withdrawals.

#### Acceptance Criteria

1. WHEN the transaction history page loads, THE App SHALL call `GET /transactions?page=1&limit=20` and display the results in a table.
2. THE App SHALL display each transaction's type, amount, asset, status, and creation date.
3. WHEN a user clicks "Next Page", THE App SHALL call `GET /transactions` with the incremented page number and update the table.
4. WHEN a user clicks "Previous Page", THE App SHALL call `GET /transactions` with the decremented page number and update the table.
5. WHILE on the first page, THE App SHALL disable the "Previous Page" button.
6. WHILE on the last page (page equals totalPages), THE App SHALL disable the "Next Page" button.
7. WHILE transaction data is loading, THE App SHALL display a loading indicator.
8. IF `GET /transactions` returns an error, THEN THE App SHALL display an inline error message and a retry button.

---

### Requirement 5: Withdrawal Status Page

**User Story:** As an authenticated user, I want to view the real-time status of a specific withdrawal, so that I know when my NGN transfer is complete.

#### Acceptance Criteria

1. WHEN the withdrawal status page loads, THE App SHALL call `GET /withdrawal/:id` and display the withdrawal's status, USDC amount, NGN amount, FX rate, and bank details.
2. THE App SHALL display the status as a human-readable label: "Pending", "Queued", "Completed", or "Failed".
3. WHILE the withdrawal status is "pending" or "queued", THE App SHALL poll `GET /withdrawal/:id` every 10 seconds.
4. WHEN the withdrawal status transitions to "completed" or "failed", THE App SHALL stop polling and display a final status banner.
5. WHEN the status is "failed", THE App SHALL display a message indicating the funds have been returned to the wallet.
6. IF `GET /withdrawal/:id` returns a 404 status, THEN THE App SHALL display "Withdrawal not found."

---

### Requirement 6: Admin — Overview

**User Story:** As an admin, I want an overview page showing platform-wide metrics, so that I can monitor the health of the off-ramp service.

#### Acceptance Criteria

1. THE App SHALL provide a separate admin route prefix (`/admin`) accessible only to users with admin role.
2. WHEN an unauthenticated user navigates to any `/admin` route, THE App SHALL redirect to the login page.
3. WHEN the admin overview page loads, THE App SHALL display total registered users, total withdrawal volume (USDC and NGN), and liquidity pool status.
4. THE App SHALL refresh the overview metrics every 30 seconds without a full page reload.

---

### Requirement 7: Admin — Users List

**User Story:** As an admin, I want to view all users and manage their KYC status, so that I can approve or reject identity verification requests.

#### Acceptance Criteria

1. WHEN the admin users page loads, THE App SHALL display a paginated list of users showing email, KYC status, registration date, and daily limit.
2. WHEN an admin clicks "Approve" on a user with `pending` KYC status, THE App SHALL call the appropriate API endpoint and update the displayed KYC status to "approved".
3. WHEN an admin clicks "Reject" on a user with `pending` KYC status, THE App SHALL call the appropriate API endpoint and update the displayed KYC status to "rejected".
4. THE App SHALL allow filtering the users list by KYC status (all, pending, approved, rejected).
5. IF a KYC status update API call fails, THEN THE App SHALL display an error toast and revert the displayed status to its previous value.

---

### Requirement 8: Admin — Manual Recovery Queue

**User Story:** As an admin, I want to view unmatched deposits and assign them to users, so that I can recover funds that arrived without a valid memo.

#### Acceptance Criteria

1. WHEN the manual recovery page loads, THE App SHALL display all unmatched deposit records showing tx_hash, amount, memo (if any), and received date.
2. WHEN an admin selects a recovery record and enters a user ID, THE App SHALL call the appropriate API endpoint to assign the deposit to that user.
3. WHEN a recovery record is successfully assigned, THE App SHALL remove it from the queue display.
4. IF the assignment API call fails, THEN THE App SHALL display an error message inline on that record.

---

### Requirement 9: Admin — Withdrawals List

**User Story:** As an admin, I want to view all withdrawals with status filtering, so that I can monitor and investigate payout activity.

#### Acceptance Criteria

1. WHEN the admin withdrawals page loads, THE App SHALL display a paginated list of all withdrawals showing user email, USDC amount, NGN amount, FX rate, bank details, status, and creation date.
2. THE App SHALL allow filtering the withdrawals list by status (all, pending, queued, completed, failed).
3. WHEN a status filter is applied, THE App SHALL update the list to show only withdrawals matching the selected status.
4. WHILE withdrawal data is loading, THE App SHALL display a loading indicator.

---

### Requirement 10: Navigation and Layout

**User Story:** As a user or admin, I want consistent navigation and layout, so that I can move between pages efficiently.

#### Acceptance Criteria

1. THE App SHALL render a persistent top navigation bar on all authenticated user pages containing links to Dashboard, Withdraw, and Transaction History.
2. THE App SHALL render a persistent sidebar on all admin pages containing links to Overview, Users, Manual Recovery, and Withdrawals.
3. WHEN a user navigates to `/`, THE App SHALL redirect authenticated users to `/dashboard` and unauthenticated users to `/login`.
4. THE App SHALL display a 404 page for any unrecognised route.
5. THE App SHALL be responsive and usable on viewport widths from 375px to 1440px.

---

### Requirement 11: API Error Handling

**User Story:** As a user, I want clear feedback when something goes wrong, so that I understand what happened and what to do next.

#### Acceptance Criteria

1. WHEN any API call returns a 401 status, THE App SHALL clear Auth_Store and redirect to the login page.
2. WHEN any API call returns a 500 status, THE App SHALL display a generic "Something went wrong. Please try again." toast notification.
3. WHEN any API call is in-flight, THE App SHALL disable the triggering button and show a loading spinner within it.
4. THE App SHALL not expose raw API error messages or stack traces to the user.
