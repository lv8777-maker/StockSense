# Overview

CustomerConnect is a modern digital loyalty program web application that transforms traditional loyalty programs into a comprehensive digital experience. The application enables customers to earn points with purchases, redeem rewards, receive personalized offers, and manage their loyalty profiles through an intuitive web interface. Built as a full-stack solution, it provides both customer-facing features and administrative capabilities for program management.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Project Completion

## Unified Navigation System (October 2025)
- **COMPLETED**: Implemented consistent navigation component across all authenticated pages
- **Navbar Component**: Created unified Navbar replacing old Navigation component with Maverick branding
- **Design**: Dark background (#3C3C3B), Maverick yellow accents (#FDC800), user info display, points total
- **Navigation**: Links to Dashboard, Rewards, Submit Receipt, History, Notifications, Profile pages
- **Logout Functionality**: Added POST /api/auth/logout endpoint, session destruction, cookie clearing
- **Mobile Responsive**: Hamburger menu for mobile devices with full navigation drawer
- **Bug Fixes**: Fixed SelectItem empty value error on profile page, implemented proper logout flow
- **Testing**: End-to-end verification confirmed navbar displays correctly on all pages and logout works

## Security Hardening & Rate Limiting (October 2025)
- **COMPLETED**: Implemented enterprise-grade security enhancements for authentication system
- **Password Security**: bcrypt hashing (10 salt rounds) for all email/password authentication
- **Rate Limiting**: express-rate-limit middleware protecting all auth endpoints and receipt uploads
- **Configuration**: Login (5 attempts/hour), Registration (10/15min), Receipt uploads (10/15min)
- **Routing Fix**: Resolved redirect issue - EmailRegistration now properly navigates to dashboard after auth
- **Testing**: End-to-end verification confirmed password hashing, rate limiting (429 responses), and user feedback
- **Production Ready**: Security audit passed with robust protection against brute force and OCR abuse

## Receipt Upload & OCR Points System (October 2025)
- **COMPLETED**: Implemented automated receipt processing with OCR technology for instant point rewards
- **Technology**: Tesseract.js OCR engine for text extraction from receipt images
- **Points Calculation**: Airtime (1pt per R1, min R100), Accessories (tiered: 100/250/500pts), Plans (100-500pts)
- **Backend**: File upload with multer, OCR processing, automatic transaction creation and points allocation
- **Frontend**: SubmitPurchase page with drag-drop upload, real-time processing, upload history
- **Database**: receipt_uploads table tracking all submissions with OCR results and point awards
- **Edge Cases**: Robust parsing handles thousands separators (commas), non-breaking spaces, varied currency formats

## Client Feedback Documentation (September 2025)
- **COMPLETED**: Created comprehensive CLIENT_FEEDBACK_REPORT.md for client presentation
- **Report Content**: Executive summary, technical architecture, system capabilities, business impact
- **Deliverables**: Documented all completed features including Maverick tier system integration
- **Customer Journey**: Detailed reward claiming process and user experience flow
- **Metrics**: Performance indicators and business value propositions
- **Next Steps**: Recommendations for future enhancements and deployment roadmap

## Maverick Tier System Integration (January 2025)
- **COMPLETED**: Successfully adapted sophisticated loyalty app to new Maverick 4-tier system
- **Database Schema**: Updated with password and currentPlan fields for email authentication
- **Authentication System**: Dual system supporting both SA phone numbers (+27) and email/password
- **Tier System**: Implemented exact 4-tier Maverick system (Starter, Explorer, Champion, Elite)
- **Plan Integration**: Complete plan-to-tier mapping with automatic point allocation
- **Point System**: Plan selection rewards (100-500 points) and cumulative upgrade bonuses
- **Landing Page**: Fully updated to showcase tier system and dual authentication options
- **Components**: Created EmailRegistration and PlanUpgrade components with tier preview

## Enterprise-Grade Foundation (January 2025)
- Successfully expanded to enterprise-grade Maverick Telecom Loyalty App (MAV-LOY-2025)
- Implemented comprehensive database schema with 8 new enterprise tables
- Created three core enterprise services: NotificationService, CampaignService, PointsEngineService
- Enhanced storage layer with full enterprise feature support
- Maintained exact Maverick brand colors: #3C3C3B (Dark Gray), #FDC800 (Bright Yellow), #A7A9AC (Light Gray)
- Foundation ready for 5-week enterprise delivery timeline

## Current Development Phase
- **Phase 1 COMPLETED**: Core customer experience with Maverick tier system and dual authentication
- **Transaction Simulation**: Live testing system for telecom purchases with real-time point calculation
- **Authentication Options**: Both phone (SA format) and email/password with plan selection
- **Tier Management**: Complete 4-tier system with upgrade functionality and benefit tracking
- **Next Phase**: Advanced personalization & engagement features (campaign management, intelligent notifications)

# System Architecture

## Frontend Architecture
The frontend is built using React with TypeScript, utilizing a component-based architecture. The application uses Wouter for client-side routing and TanStack Query for state management and API interactions. The UI is constructed with Radix UI components and styled using Tailwind CSS with the shadcn/ui component library. The design system follows the "new-york" style configuration with a neutral color scheme and consistent spacing using CSS custom properties.

## Backend Architecture
The backend follows a RESTful API design built on Express.js with TypeScript. The server implements middleware for request logging, JSON parsing, and error handling. Authentication is handled through Replit's OpenID Connect integration with session management using PostgreSQL-backed sessions. The API routes are organized around core business entities: users, rewards, transactions, redemptions, and offers.

## Database Design
The application uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations. The schema is centralized in a shared module and includes tables for user management, rewards catalog, transaction history, redemptions, offers, social connections, and session storage. The database supports features like membership tiers, points tracking, and comprehensive audit trails.

## Authentication and Authorization
The system supports dual authentication methods:
1. **Phone Authentication**: South African phone numbers (+27 format) via Replit OIDC integration
2. **Email Authentication**: Email/password with plan selection and automatic tier assignment

Both systems use session-based authentication with PostgreSQL session storage via connect-pg-simple. User sessions are configured with HTTP-only cookies and proper security settings. The combined authentication middleware accepts users from either system seamlessly.

## Component Organization
The frontend follows a structured component hierarchy with reusable UI components, page-specific components, and layout components. Custom hooks manage authentication state and API interactions. The application supports both authenticated and unauthenticated views with conditional routing based on authentication status.

## Data Management
The application implements a layered data access pattern with a storage interface that abstracts database operations. This includes user management, rewards catalog management, transaction tracking, and redemption processing. The system supports real-time updates through query invalidation and optimistic updates.

# External Dependencies

## Core Framework Dependencies
- **React 18** with TypeScript for the frontend framework
- **Express.js** for the backend server framework
- **Vite** for build tooling and development server
- **Wouter** for client-side routing

## Database and ORM
- **PostgreSQL** as the primary database (configured for Neon Database)
- **Drizzle ORM** for type-safe database operations and migrations
- **@neondatabase/serverless** for serverless PostgreSQL connections

## UI and Styling
- **Tailwind CSS** for utility-first styling
- **Radix UI** for accessible component primitives
- **shadcn/ui** component library for consistent design system
- **Lucide React** for iconography

## State Management and API
- **TanStack React Query** for server state management and caching
- **React Hook Form** with Zod for form validation
- **Zod** for runtime type validation and schema definition

## Authentication and Security
- **Replit OIDC** integration for user authentication
- **Passport.js** with OpenID Connect strategy
- **Express Session** with PostgreSQL session store for session management

## Development and Build Tools
- **TypeScript** for type safety across the stack
- **ESBuild** for server-side bundling
- **PostCSS** with Autoprefixer for CSS processing
- **Replit-specific plugins** for development environment integration