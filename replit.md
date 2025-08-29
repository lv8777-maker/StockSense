# Overview

CustomerConnect is a modern digital loyalty program web application that transforms traditional loyalty programs into a comprehensive digital experience. The application enables customers to earn points with purchases, redeem rewards, receive personalized offers, and manage their loyalty profiles through an intuitive web interface. Built as a full-stack solution, it provides both customer-facing features and administrative capabilities for program management.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Project Completion

## Enterprise-Grade Expansion (January 2025)
- Successfully expanded to enterprise-grade Maverick Telecom Loyalty App (MAV-LOY-2025)
- Implemented comprehensive database schema with 8 new enterprise tables
- Created three core enterprise services: NotificationService, CampaignService, PointsEngineService
- Enhanced storage layer with full enterprise feature support
- Maintained exact Maverick brand colors: #3C3C3B (Dark Gray), #FDC800 (Bright Yellow), #A7A9AC (Light Gray)
- Updated authentication system to South African phone number format (+27 XX XXX XXXX)
- Foundation ready for 5-week enterprise delivery timeline

## Current Development Phase
- Phase 1 focus: Core customer experience with enhanced points engine and reward catalog
- Comprehensive project plan established with 4 phases over 5 weeks
- Next priorities: Points engine enhancement, reward redemption system, mobile-first optimization

# System Architecture

## Frontend Architecture
The frontend is built using React with TypeScript, utilizing a component-based architecture. The application uses Wouter for client-side routing and TanStack Query for state management and API interactions. The UI is constructed with Radix UI components and styled using Tailwind CSS with the shadcn/ui component library. The design system follows the "new-york" style configuration with a neutral color scheme and consistent spacing using CSS custom properties.

## Backend Architecture
The backend follows a RESTful API design built on Express.js with TypeScript. The server implements middleware for request logging, JSON parsing, and error handling. Authentication is handled through Replit's OpenID Connect integration with session management using PostgreSQL-backed sessions. The API routes are organized around core business entities: users, rewards, transactions, redemptions, and offers.

## Database Design
The application uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations. The schema is centralized in a shared module and includes tables for user management, rewards catalog, transaction history, redemptions, offers, social connections, and session storage. The database supports features like membership tiers, points tracking, and comprehensive audit trails.

## Authentication and Authorization
User authentication is handled through Replit's OIDC integration, providing secure login capabilities. The system implements session-based authentication with PostgreSQL session storage using connect-pg-simple. User sessions are configured with HTTP-only cookies and proper security settings for production deployment.

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