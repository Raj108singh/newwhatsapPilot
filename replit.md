# WhatsApp Pro - Business Messaging Platform

## Overview

WhatsApp Pro is a comprehensive business messaging platform that enables companies to manage WhatsApp communications at scale. The application provides features for bulk messaging campaigns, live chat management, message templates, and contact organization. Built as a full-stack web application, it integrates with the WhatsApp Business API to send and receive messages, while providing a modern dashboard interface for business users to manage their communications efficiently.

## User Preferences

Preferred communication style: Simple, everyday language.

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