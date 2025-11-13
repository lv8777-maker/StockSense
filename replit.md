# Overview
CustomerConnect is a modern digital loyalty program web application that transforms traditional loyalty programs into a comprehensive digital experience. It enables customers to earn points, redeem rewards, receive personalized offers, and manage loyalty profiles through an intuitive web interface. As a full-stack solution, it provides customer-facing features and administrative capabilities, including a robust 4-tier loyalty system (Starter, Explorer, Champion, Elite) and automated receipt processing with OCR for instant point rewards. The application is designed to be an enterprise-grade loyalty solution, initially expanded for Maverick Telecom.

# User Preferences
Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built with React, TypeScript, Wouter for routing, and TanStack Query for state management. It uses Radix UI components and Tailwind CSS with shadcn/ui for styling, following a "new-york" design configuration.

## Backend Architecture
The backend is a RESTful API built with Express.js and TypeScript. It includes middleware for logging, JSON parsing, and error handling. Authentication leverages Replit's OpenID Connect with PostgreSQL-backed session management. Routes are organized around users, rewards, transactions, redemptions, and offers.

## Database Design
PostgreSQL is the primary database, utilizing Drizzle ORM for type-safe operations. The schema includes tables for user management, a rewards catalog, transaction history, redemptions, offers, and session storage, supporting membership tiers and points tracking.

## Authentication and Authorization
The system supports dual authentication:
1.  **Phone Authentication**: South African (+27 format) numbers via Replit OIDC.
2.  **Email Authentication**: Email/password with plan selection and automatic tier assignment.
Both use session-based authentication with `connect-pg-simple` for PostgreSQL session storage, secured with HTTP-only cookies. An enterprise-grade role-based access control (RBAC) system is implemented for the admin dashboard, supporting roles like `super_admin`, `admin`, `manager`, and `analyst`.

## Component Organization
The frontend features a structured component hierarchy with reusable UI components, page-specific components, and layout components. Custom hooks manage authentication and API interactions.

## Data Management
A layered data access pattern with a storage interface abstracts database operations, including user, rewards, transaction, and redemption management. Real-time updates are handled via query invalidation and optimistic updates.

## UI/UX Decisions
The design incorporates Maverick brand colors: #3C3C3B (Dark Gray), #FDC800 (Bright Yellow), and #A7A9AC (Light Gray). The application features a unified, responsive navigation system with a dark background and yellow accents, including a hamburger menu for mobile. Mobile optimization ensures a consistent user experience across devices, with touch targets meeting accessibility standards.

## Technical Implementations
-   **Receipt Processing**: Utilizes Tesseract.js OCR for text extraction from receipt images, enabling automated point calculation based on product categories (Airtime, Accessories, Plans).
-   **Security Hardening**: Implements `bcrypt` hashing (10 salt rounds) for passwords and `express-rate-limit` middleware for authentication endpoints and receipt uploads to prevent brute-force attacks.
-   **Admin Dashboard**: Features role-based access control (RBAC) with protected API endpoints and a dedicated `admin_users` table for managing administrative roles.

# External Dependencies

## Core Framework Dependencies
-   **React 18**
-   **Express.js**
-   **Vite**
-   **Wouter**

## Database and ORM
-   **PostgreSQL** (configured for Neon Database)
-   **Drizzle ORM**
-   **@neondatabase/serverless**

## UI and Styling
-   **Tailwind CSS**
-   **Radix UI**
-   **shadcn/ui**
-   **Lucide React**

## State Management and API
-   **TanStack React Query**
-   **React Hook Form**
-   **Zod**

## Authentication and Security
-   **Replit OIDC**
-   **Passport.js**
-   **Express Session**

## OCR Technology
-   **Tesseract.js**