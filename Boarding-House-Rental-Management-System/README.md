# Boarding House Rental Management System

A role-based mobile property management application designed for boarding houses, apartment-style rental operations, and tenant administration. The system is built with React Native + Expo and uses Firebase Authentication and Firestore for secure login, multi-role access, and real-time property management.

## Overview

This project helps property owners, caretakers, and tenants manage boarding house operations from one platform. It supports room management, lease tracking, billing, utility charges, complaints handling, announcements, tenant approvals, and financial monitoring.

The current version includes a unified landlord portal for owner/caretaker operations and a dedicated tenant portal for personal account management, billing, notifications, and service requests.

## Project Status

Current release focuses on a complete operational workflow for:
- landlord dashboard and management
- tenant self-registration and approval flow
- room and lease administration
- billing and payment monitoring
- complaint and update handling
- announcement broadcasting and notifications
- multi-device responsive mobile UI

## Functional Features

### Landlord / Owner / Caretaker Features
- Dashboard overview of occupancy, financials, and active property status
- Manage rooms and room assignments
- Track tenant records and approval states
- Create and review leases
- Monitor billing, invoices, and utility charges
- Record payments and review tenant financial activity
- Review complaints/issues and update their status
- Publish announcements and property updates
- Generate reports and summaries for property operations
- Review pending tenant registrations and approvals
- Manage tenant finance details and payment history

### Tenant Features
- Login and account registration
- View personal dashboard and room information
- View lease details and monthly billing
- Check financial statements and due balances
- Submit payment proof documents
- File complaints or maintenance issues
- Request room changes
- Receive announcements and personalized notifications
- Update account profile and settings
- View unread alerts and reminders

### Shared Features
- Firebase-based authentication and session management
- Role-based access control
- Firestore database integration
- Responsive design for mobile and desktop layouts
- Dark mode support
- Real-time data refresh
- Modular service and screen architecture

## System Architecture

The application follows a layered architecture:

1. Presentation Layer
   - React Native screens for landlord and tenant interfaces
   - Reusable header, navigation, and UI components
   - Theme support and responsive design utilities

2. Application Layer
   - Role-based routing
   - Screen handlers for dashboards, rooms, billing, complaints, and announcements
   - Business logic for approvals, finance, and notifications

3. Data & Authentication Layer
   - Firebase Authentication for login and account management
   - Firestore collections for users, tenants, rooms, leases, invoices, complaints, and announcements
   - Optional Supabase support for assignment-related workflows and integration helpers

4. Persistence Model
   - Normalized data collections to reduce duplication and maintain consistency
   - Document-based design aligned with parcelled operations such as tenants, leases, rooms, and payments

## Database Structure

The system uses a normalized Firestore schema with collections such as:
- users
- staff_profiles
- tenants
- boarding_houses
- room_types
- rooms
- leases
- utility_readings
- invoices
- payments
- payment_proofs
- complaints
- room_change_requests
- room_assignment_requests
- announcements
- tenant_notifications

## Role-Based Module Design

### Landlord Portal
The landlord portal combines the functions of owner and caretaker into one operational workspace.

Modules include:
- Dashboard
- Rooms
- Billing and Utilities
- Complaints
- Announcements
- Reports
- Pending Approvals
- Tenant Financial Management

### Tenant Portal
The tenant portal provides account-specific functionality and communication.

Modules include:
- Home
- Complaints
- Updates
- My Finances
- Notifications
- Settings

## Methodology

The project follows a modular mobile application development approach, using:
- React Native + Expo for the client interface
- Firebase for authentication and cloud database services
- Firestore document-based modeling for business entities
- Component-driven UI design
- Role-based access separation for owner, caretaker, and tenant workflows
- Service-based architecture to keep data logic organized

This methodology supports maintainability, easier future extensions, and a clear separation between business logic and user interface modules.

## Project Structure

```text
Boarding-House-Rental-Management-System/
├── app/
│   ├── components/
│   ├── screens/
│   ├── services/
│   ├── utils/
│   ├── AppRouter / entry screens
│   ├── LandlordApp.js
│   ├── TenantApp.js
│   └── RoleSelector.js
├── assets/
├── functions/
├── supabase/
├── App.js
├── FIRESTORE_SETUP.md
├── Database.MD
├── README.md
├── package.json
├── firebase.json
├── firestore.rules
├── index.js
├── metro.config.js
├── .firebaserc
└── LICENSE
```

## Tech Stack

- React Native
- Expo
- Firebase Authentication
- Firestore Database
- JavaScript
- React Native Styling and Components
- Responsive mobile UI utilities
- Dark mode / theme system

## Setup and Run

### Prerequisites
- Node.js 18+
- npm
- Expo CLI
- Firebase project

### Installation
```bash
npm install
```

### Start app
```bash
npm start
```

Or run platform-specific:
```bash
npm run android
npm run ios
npm run web
```

### Firebase configuration
1. Create a Firebase project.
2. Enable Email/Password authentication.
3. Enable Firestore.
4. Deploy the Firestore rules.
5. Configure your app credentials in the Firebase setup files.

## Security and Data Integrity

The project includes:
- role-based access checks
- Firestore validation patterns
- structured collection relationships
- normalized schema to reduce duplicate and conflicting records
- user profile verification and session handling

## Application Use Cases

Typical end-user scenarios include:
- landlord reviews occupancy and finances
- caretaker handles complaints and room issues
- tenant signs up and waits for approval
- tenant pays due bills and uploads proof
- landlord approves room assignment requests
- tenant receives updates and notices
- landlord produces operational reports

## Future Enhancements

The current project already covers the core rental management workflow and is structured for future expansion such as:
- automated invoice generation
- stronger analytics and charts
- mobile notification push support
- improved payment verification workflows
- multi-property support
- export and reporting features

## License

This project is provided under the project license included in the repository.

## Last Updated

October 2026

Version: 2.0
