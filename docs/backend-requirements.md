# Requirements Document

## Introduction

A gasless USD → NGN off-ramp platform built on Stellar, where senders deposit USDC and receivers withdraw NGN to their bank accounts. The platform abstracts all blockchain fees, handles FX conversion with a spread-based revenue model, and provides instant crediting via a transaction listener. The MVP uses custodial wallets per user, identified by Stellar address + memo.

## Glossary

- **Platform**: The gasless off-ramp system described in this document
- **Sender**: A person or entity sending USDC to a user's platform deposit address
- **Receiver**: A registered user withdrawing NGN to a bank account
- **User**: A registered account holder on the Platform
- **Wallet**: A custodial balance record per user per asset (USDC)
- **Memo_ID**: A unique identifier embedded in Stellar transactions to route deposits to the correct user
- **Anchor**: A Stellar-network fiat bridge (e.g., Flutterwave or a Stellar SEP-24 anchor) that converts USDC to NGN and sends to a bank
- **FX_Rate**: The platform's quoted USDC → NGN exchange rate, inclusive of spread
- **Spread**: The difference between market rate and platform rate, representing platform revenue
- **Gas_Sponsor**: The platform's XLM reserve account that pays all Stellar network fees on behalf of users
- **Transaction_Listener**: The service that monitors the Stellar network for incoming USDC deposits
- **Ledger**: An append-only record of every balance movement on the Platform
- **KYC**: Know Your Customer identity verification required before fiat payouts
- **Hot_Wallet**: Online wallet used for active transaction processing
- **Cold_Wallet**: Offline wallet used for long-term reserve storage

---

## Requirements

### Requirement 1: User Registration and Authentication

**User Story:** As a new user, I want to register and log in securely, so that I can access my wallet and initiate withdrawals.

#### Acceptance Criteria

1. WHEN a user submits a valid email and password via POST /auth/signup, THE Platform SHALL create a new user account, assign a unique Stellar address and Memo_ID, and return a success response
2. WHEN a user submits a valid email and password via POST /auth/login, THE Platform SHALL authenticate the user and return a signed JWT token
3. IF a user submits a duplicate email during signup, THEN THE Platform SHALL return a 409 Conflict error with a descriptive message
4. IF a user submits an invalid or expired JWT token, THEN THE Platform SHALL return a 401 Unauthorized error
5. THE Platform SHALL store passwords using a cryptographic hashing algorithm with salt (e.g., bcrypt with cost factor ≥ 12)

---

### Requirement 2: Custodial Wallet and Deposit Address

**User Story:** As a user, I want a unique deposit address, so that senders can send USDC directly to my account.

#### Acceptance Criteria

1. THE Platform SHALL assign each user a unique Stellar address and a unique Memo_ID at account creation
2. WHEN a user calls GET /deposit-address, THE Platform SHALL return the shared platform Stellar address and the user's unique Memo_ID
3. THE Platform SHALL maintain a Wallet record per user per supported asset (USDC) with a balance initialized to zero
4. WHEN a user calls GET /wallet, THE Platform SHALL return the user's current USDC balance and asset type

---

### Requirement 3: Transaction Listener and Deposit Crediting

**User Story:** As a user, I want my USDC balance credited automatically when a sender deposits to my address, so that I don't need to manually confirm deposits.

#### Acceptance Criteria

1. WHILE the Platform is running, THE Transaction_Listener SHALL continuously monitor the platform Stellar address for incoming transactions
2. WHEN an incoming Stellar transaction is detected with asset=USDC and a valid Memo_ID, THE Transaction_Listener SHALL credit the corresponding user's Wallet balance by the received amount
3. WHEN an incoming Stellar transaction is detected with asset=USDC and an invalid or missing Memo_ID, THE Platform SHALL flag the transaction for manual recovery and NOT credit any user balance
4. IF a Stellar transaction has already been processed (duplicate tx_hash), THEN THE Transaction_Listener SHALL skip it and NOT credit the balance again
5. WHEN a deposit is credited, THE Platform SHALL create a Transaction record of type "deposit" with status "completed" and the Stellar tx_hash
6. WHEN a deposit is credited, THE Platform SHALL append an entry to the Ledger recording the balance increase

---

### Requirement 4: FX Rate Engine

**User Story:** As a user, I want to see exactly how much NGN I will receive before confirming a withdrawal, so that I can make an informed decision.

#### Acceptance Criteria

1. WHEN a user calls GET /rates, THE FX_Engine SHALL return the current platform FX_Rate (USDC → NGN) inclusive of spread
2. THE FX_Engine SHALL calculate the FX_Rate by applying a spread to the current market rate such that the platform rate is below the market rate
3. WHEN a user initiates a withdrawal, THE FX_Engine SHALL lock the FX_Rate for a period between 30 and 60 seconds
4. IF the locked FX_Rate expires before the user confirms the withdrawal, THEN THE Platform SHALL require the user to request a new rate before proceeding
5. WHEN a withdrawal is confirmed within the lock window, THE Platform SHALL apply the locked FX_Rate to calculate the NGN payout amount
6. THE FX_Engine SHALL source market rate data from an external price feed and refresh it at an interval no greater than 60 seconds

---

### Requirement 5: Withdrawal Request and Processing

**User Story:** As a user, I want to withdraw my USDC balance as NGN to my bank account, so that I can access my funds in local currency.

#### Acceptance Criteria

1. WHEN a user submits POST /withdraw with a valid amount and bank details, THE Platform SHALL validate that the user's USDC balance is sufficient to cover the withdrawal amount
2. IF the user's USDC balance is insufficient, THEN THE Platform SHALL return a 422 error with a descriptive message and NOT initiate a withdrawal
3. WHEN a withdrawal is confirmed, THE Platform SHALL atomically deduct the USDC amount from the user's Wallet balance and create a Withdrawal record with status "pending"
4. WHEN a Withdrawal record is created, THE Platform SHALL submit the USDC to the Anchor with all Stellar network fees paid by the Gas_Sponsor
5. WHEN the Anchor confirms the NGN bank transfer, THE Platform SHALL update the Withdrawal status to "completed" and append a Ledger entry
6. WHEN a user calls GET /withdrawal/:id, THE Platform SHALL return the current status and details of that withdrawal
7. THE Platform SHALL only process withdrawals for users with KYC status "approved"
8. IF a user without approved KYC attempts a withdrawal, THEN THE Platform SHALL return a 403 error with a message indicating KYC is required

---

### Requirement 6: Gas Sponsorship Engine

**User Story:** As a user, I want all blockchain fees to be handled by the platform, so that I never need to hold XLM or think about gas.

#### Acceptance Criteria

1. THE Gas_Sponsor SHALL maintain an XLM reserve sufficient to cover all pending and anticipated Stellar network fees
2. WHEN any Stellar transaction is submitted on behalf of a user, THE Gas_Sponsor SHALL pay the network fee from the XLM reserve
3. THE Platform SHALL NOT require users to hold XLM or any asset other than USDC
4. WHEN the Gas_Sponsor XLM reserve falls below a configurable minimum threshold, THE Platform SHALL emit an alert to platform operators

---

### Requirement 7: Failed Withdrawal Handling

**User Story:** As a user, I want my funds returned if a bank transfer fails, so that I don't lose money due to technical errors.

#### Acceptance Criteria

1. IF a bank transfer via the Anchor fails, THEN THE Platform SHALL retry the transfer up to 3 times with exponential backoff
2. IF all retry attempts fail, THEN THE Platform SHALL refund the deducted USDC amount back to the user's Wallet balance
3. WHEN a refund is issued, THE Platform SHALL update the Withdrawal status to "failed" and append a Ledger entry recording the refund
4. WHEN a refund is issued, THE Platform SHALL notify the user via email that the withdrawal failed and the USDC has been returned

---

### Requirement 8: Low Liquidity Handling

**User Story:** As a platform operator, I want withdrawal requests queued when liquidity is low, so that users are served in order when funds become available.

#### Acceptance Criteria

1. WHEN a withdrawal is requested and the platform NGN liquidity pool is below the required payout amount, THE Platform SHALL queue the withdrawal with status "queued"
2. WHILE a withdrawal is in "queued" status, THE Platform SHALL process it in FIFO order as liquidity becomes available
3. WHEN a queued withdrawal is processed, THE Platform SHALL notify the user via email that their withdrawal is being processed

---

### Requirement 9: Transaction History

**User Story:** As a user, I want to view my transaction history, so that I can track all deposits and withdrawals on my account.

#### Acceptance Criteria

1. WHEN a user calls GET /transactions, THE Platform SHALL return a paginated list of all Transaction records associated with that user
2. THE Platform SHALL include transaction type, amount, asset, status, and timestamp in each Transaction record returned
3. THE Ledger SHALL record every balance movement including deposits, withdrawals, refunds, and fee deductions

---

### Requirement 10: Security and Fraud Controls

**User Story:** As a platform operator, I want security controls in place, so that the platform is protected against fraud and unauthorized access.

#### Acceptance Criteria

1. THE Platform SHALL enforce per-user daily withdrawal limits configurable by platform operators
2. IF a withdrawal request exceeds the user's daily withdrawal limit, THEN THE Platform SHALL reject it with a 422 error
3. THE Platform SHALL separate treasury funds into Hot_Wallet and Cold_Wallet with the Hot_Wallet holding only the minimum required for active operations
4. THE Platform SHALL require multi-signature authorization for Cold_Wallet transactions
5. WHEN a suspicious transaction pattern is detected (e.g., rapid successive withdrawals above a threshold), THE Platform SHALL flag the account for review and temporarily suspend withdrawals
