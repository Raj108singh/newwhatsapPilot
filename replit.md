# WhatsApp Pro - Business Messaging Platform

## Overview

WhatsApp Pro is a comprehensive business messaging platform that enables companies to manage WhatsApp communications at scale. The application provides features for bulk messaging campaigns, live chat management, message templates, and contact organization. Built as a full-stack web application, it integrates with the WhatsApp Business API to send and receive messages, while providing a modern dashboard interface for business users to manage their communications efficiently.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (August 18, 2025)

✓ **Database Migration Completed**: Successfully migrated from in-memory storage to PostgreSQL with Drizzle ORM
✓ **Settings System Enhanced**: Added persistent settings storage with database backend and local storage support
✓ **WhatsApp Business API Improved**: Enhanced integration with support for Business Account ID and proper template syncing
✓ **Template Management Enhanced**: Fixed template refreshing from WhatsApp Business API with better error handling
✓ **Local Storage Utilities**: Created comprehensive local storage system for frontend data persistence
✓ **API Routes Expanded**: Added complete CRUD operations for all entities with proper validation
✓ **Database Schema Updated**: Added settings table and relationships for production deployment
✓ **Credentials Management Fixed**: WhatsApp settings now properly save to database and are used for API calls
✓ **Settings UI Updated**: Added Business Account ID field and improved credential validation
✓ **Message Sending Fixed**: Added required messaging_product parameter and fixed credentials retrieval
✓ **Template Integration Working**: Successfully fetching and using templates from WhatsApp Business account
✓ **Full API Integration Complete**: Messages now send successfully with proper error handling and database storage
✓ **Replit Migration Completed**: Successfully migrated from Replit Agent to standard Replit environment with PostgreSQL database setup
✓ **Authentication Flow Fixed**: Resolved login redirect issues and API call formatting problems
✓ **TypeScript Errors Fixed**: Added missing AuthUser type to shared schema and corrected API request patterns
✓ **Migration Verification Complete**: Confirmed application runs without errors, authentication works, and dashboard loads properly
✓ **Template Refresh API Fixed**: Added missing template refresh route to modern-routes.ts and fixed API call formatting in frontend
✓ **Bulk Messaging JSON Issues Resolved**: Fixed incorrect API request patterns throughout the application
✓ **Admin Settings System Complete**: Implemented comprehensive admin settings with password change, profile update, and company logo upload
✓ **User Management Enhanced**: Added profile management with form validation, password security, and avatar support
✓ **Settings Authentication Fixed**: Resolved API authentication issues and standardized request handling across all settings endpoints
✓ **Dashboard Route Added**: Created dedicated `/dashboard` route and configured login to redirect there automatically for better UX
✓ **Webhook URL Fixed**: Updated webhook endpoint to use correct public domain for Meta verification
✓ **Template Processing Enhanced**: Improved template parameter handling to work with templates without dynamic parameters
✓ **Public Domain Integration**: Webhook now uses Replit dev domain for external access by Meta APIs

## Recent Changes (August 19, 2025)

✓ **Replit Agent Migration Completed**: Successfully migrated from Replit Agent to standard Replit environment
✓ **PostgreSQL Database Setup**: Created and configured PostgreSQL database with proper environment variables
✓ **Bulk Messaging API Fixed**: Added missing bulk messaging functionality to modern-routes.ts with enhanced error handling and logging
✓ **WhatsApp Service Enhanced**: Improved sendBulkTemplateMessages method with comprehensive debugging and parameter handling
✓ **Template Component Processing**: Fixed template parameter replacement for proper message content display
✓ **Campaign Status Tracking**: Enhanced campaign creation and status updates with real-time broadcasting
✓ **Bulk Messaging Functionality Restored**: Successfully fixed bulk messaging through templates with proper WhatsApp API integration
✓ **Template Processing Fixed**: Corrected component building logic to handle both parameterized and non-parameterized templates
✓ **WhatsApp API Integration Working**: Messages now send successfully with "accepted" status from WhatsApp Business API

✓ **Modern WhatsApp Business UI Complete**: Transformed entire chat interface to match WhatsApp Business design with green branding, message bubbles, contact avatars, and professional styling
✓ **Bulk Messaging System Fixed**: Enhanced template message handling and storage with proper content display in chat interface
✓ **MySQL Database Export Created**: Successfully exported complete database to MySQL format (whatsapp_pro_mysql_export.sql) with all messages, templates, campaigns, and settings
✓ **Template Message Processing Enhanced**: Improved template content handling and display in chat conversations
✓ **Real-time Messaging Interface Upgraded**: Modern WhatsApp-style message display with proper timestamps, status indicators, and conversation management

The application is now fully operational with working WhatsApp Business API integration, successful message delivery, complete database-backed functionality, robust authentication system, comprehensive admin settings management, proper dashboard routing, working webhook verification, stunning WhatsApp Business UI design, and MySQL export capability. Ready for production deployment on Replit.

## System Architecture

### Frontend Architecture
The client-side application is built using React 18 with TypeScript, leveraging modern React patterns and hooks. The UI framework utilizes shadcn/ui components built on top of Radix UI primitives, providing a consistent and accessible design system. The application uses Wouter for client-side routing, offering a lightweight alternative to React Router. State management is handled through TanStack Query (React Query) for server state synchronization, with local component state managed via React hooks.

The frontend follows a component-based architecture with clear separation of concerns:
- **Pages**: Route-level components for main application views (Dashboard, Bulk Messages, Chat, Templates)
- **Components**: Reusable UI components and business logic components
- **Hooks**: Custom hooks for shared logic and external integrations
- **Lib**: Utility functions and configuration

### Backend Architecture
The server is built using Express.js with TypeScript, providing a RESTful API for the frontend. The architecture follows a layered approach with clear separation between routing, business logic, and data access. The server includes WebSocket support for real-time messaging capabilities, enabling live chat functionality and instant message notifications.

Key architectural components:
- **Routes**: API endpoint definitions and request handling
- **Storage**: Data access layer with abstraction for different storage implementations
- **Services**: Business logic layer, including WhatsApp API integration
- **WebSocket**: Real-time communication layer for live updates

### Data Storage Solutions
The application uses PostgreSQL as the primary database, accessed through Drizzle ORM for type-safe database operations. The database schema includes tables for users, templates, messages, campaigns, and contacts. The ORM configuration supports migrations and provides a clean abstraction layer for database operations.

The storage layer implements an interface-based design, allowing for multiple storage implementations:
- **Production**: PostgreSQL with Drizzle ORM
- **Development**: In-memory storage for rapid development and testing

### Authentication and Authorization
The application includes a user management system with support for multiple users, though specific authentication mechanisms are not fully implemented in the current codebase. The schema defines user entities with username, password, and email fields, suggesting planned authentication features.

### Real-time Communication
WebSocket integration provides real-time messaging capabilities, enabling:
- Live chat message delivery
- Real-time campaign status updates
- Instant notifications for new messages
- Connection status monitoring

The WebSocket manager handles connection lifecycle, message routing, and automatic reconnection logic.

## External Dependencies

### WhatsApp Business API
Primary integration with Facebook's WhatsApp Business API for sending and receiving messages. The service supports both text messages and template-based messages, with proper error handling and status tracking. API credentials are managed through environment variables (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID).

### Database Services
PostgreSQL database integration through Neon Database serverless connector (@neondatabase/serverless). The database connection is configured via DATABASE_URL environment variable, supporting cloud-hosted PostgreSQL instances.

### UI Component Libraries
Extensive use of Radix UI primitives for accessible, unstyled components that form the foundation of the design system. Additional UI dependencies include:
- TailwindCSS for utility-first styling
- Lucide React for consistent iconography
- React Hook Form with Zod validation for form management
- Date-fns for date manipulation utilities

### Development and Build Tools
The application uses Vite as the build tool and development server, providing fast hot module replacement and optimized production builds. ESBuild handles server-side TypeScript compilation for production deployment. The development environment includes Replit-specific plugins for enhanced development experience within the Replit platform.

### Styling and Design System
TailwindCSS provides the styling foundation with a custom design system configuration. The application uses CSS custom properties for theme variables, enabling consistent colors, spacing, and typography throughout the interface. Font Awesome provides additional iconography alongside Lucide React icons.