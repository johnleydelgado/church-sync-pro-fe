# Church Sync Pro — Feature Overview

Church Sync Pro automatically syncs church giving and financial data between **Planning Center**, **QuickBooks Online**, and **Stripe** — eliminating manual data entry and keeping the books accurate.

---

## 1. Accounts & Sign-In
- Email & password registration and login
- Sign in with Google (one-click OAuth)
- Secure session management with automatic session expiry
- Forgot password / password reset via email
- Profile management with photo upload
- Church and personal details (church name, first/last name, contact info)

## 2. Integrations (Connect Your Systems)
- **Connect QuickBooks Online** via secure OAuth
- **Connect Planning Center** via secure OAuth
- **Connect Stripe** via secure OAuth
- View all connected accounts in one place
- Update or disconnect any integration at any time
- Connection status checks so you always know what's linked

## 3. Donation & Giving Sync
- Pull donation **batches** and **funds** from Planning Center
- Map Planning Center funds to QuickBooks accounts, classes, and customers
- Push donations into QuickBooks Online as **deposits**
- View synced QuickBooks data (accounts, classes, customers)
- Look up deposit references and match customers
- Remove/undo a synced deposit when needed
- Sync history tracking to prevent duplicate entries

## 4. Stripe Payout Sync
- View Stripe **payouts** and transaction lists
- Sync Stripe payouts into QuickBooks
- Sync Stripe **registration** payments separately from general giving
- Multi-step sync with a final confirmation step before posting
- Account for **bank charges / processing fees** in the synced records

## 5. Automation
- **Automated background sync** — keep data flowing without manual action
- Turn auto-sync on or off per account
- Separate automation for **funds/donations** and **registrations**
- Set a **start date** so only data from a chosen point forward is synced
- Drag-and-drop **mapping interface** to configure how funds map into QuickBooks
- **Archive** view of past automated activity
- Automatic detection of **new funds** and **new registrations**
- Email notifications when new funds or registrations are found
- Duplicate-email protection (notifications are logged so they're never sent twice)

## 6. Transactions & Reporting
- Transaction list with filtering by date range (this month, last month, last 7/30 days, last 3/6 months, by year, or custom)
- Detailed transaction view for donation batches
- Detailed transaction view for Stripe payouts
- Dashboard overview
- Home screen summary

## 7. Bookkeeper & Multi-User Access
- Two roles: **Client** (church) and **Bookkeeper**
- Invite a bookkeeper by email to manage your books
- Secure invitation links with validation and accept/decline flow
- Bookkeepers can act on behalf of one or more client churches
- Grant or revoke a bookkeeper's access to your integrations
- View and manage the list of bookkeepers
- Remove a bookkeeper at any time

## 8. Client Management
- Client list for bookkeepers managing multiple churches
- Search and filter clients
- Activate / deactivate client accounts
- Paginated, sortable client table

## 9. Settings
- **Account / profile** settings
- **Integrations** management
- **Fund mapping** configuration
- **Registration mapping** configuration
- **Bank account** settings
- **Bank charges / fee** settings
- **Projects** (QuickBooks projects/customers) management
- **Email recipients** — choose who receives new-fund and new-registration notifications

## 10. Billing & Subscription
- Subscription plans powered by Stripe
- Secure in-app payment (Stripe payment intents)
- Billing information management (name, address, contact, zip)
- View billing details
- Subscription status tracking

## 11. Support & Onboarding
- **Quick Start Guide** to walk new users through setup
- **Ask Us** support/contact page
- Guided first-time setup flow

## 12. Platform & Security
- Separate development, staging, and production environments
- Encrypted OAuth token storage for all integrations
- Security hardening (HTTPS enforcement, secure headers, CORS protection)
- Automatic cleanup/expiry of cached data
- Email delivery via SendGrid
- Secure cloud file storage for uploaded images
- Deployed on Google Cloud Run for scalability

---

*Church Sync Pro consists of a web application (client) and a backend API server that securely connects to Planning Center, QuickBooks Online, and Stripe on your behalf.*
