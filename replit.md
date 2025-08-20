# WhatsApp Pro - Business Messaging Platform

## Overview
WhatsApp Pro is a comprehensive business messaging platform designed to manage WhatsApp communications at scale. It offers features for bulk messaging, live chat, message templates, and contact organization. The application integrates with the WhatsApp Business API, providing a modern dashboard for efficient communication management. Its vision is to streamline business-to-customer communication through WhatsApp, enhancing engagement and operational efficiency.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side is built with React 18 and TypeScript, using shadcn/ui (Radix UI) for components and Wouter for routing. State management is handled by TanStack Query for server state and React hooks for local state. It follows a component-based architecture, separating pages, reusable components, custom hooks, and utilities.

### Backend Architecture
The server is built with Express.js and TypeScript, providing a RESTful API. It uses a layered approach for routing, business logic, and data access. WebSocket support is included for real-time messaging, enabling live chat and instant notifications.

### Data Storage Solutions
The primary database is MySQL, accessed via Drizzle ORM for type-safe operations. The schema includes tables for users, templates, messages, campaigns, contacts, settings, conversations, and auto-reply rules. The storage layer supports multiple implementations, including production-ready MySQL with connection pooling and development configurations.

### Authentication and Authorization
The system supports user management with a schema defining user entities, indicating planned authentication features.

### Real-time Communication
WebSocket integration enables real-time messaging, including live chat message delivery, campaign status updates, new message notifications, and connection status monitoring.

## External Dependencies

### WhatsApp Business API
Integration with Facebook's WhatsApp Business API for sending and receiving messages, supporting text and template-based messages. Successfully configured with credentials for phone number ID 636589589532430.

### Database Services
Successfully connected to external VPS MySQL database at IP 103.38.50.233:3306. Uses `mysql2` driver with connection pooling. Database includes all required tables for users, messages, templates, campaigns, contacts, settings, conversations, and auto-reply rules.

### UI Component Libraries
Relies on Radix UI primitives for accessible components, complemented by:
- TailwindCSS for utility-first styling.
- Lucide React for iconography.
- React Hook Form with Zod validation for form management.
- Date-fns for date manipulation.

### Development and Build Tools
Vite is used as the build tool and development server. ESBuild handles server-side TypeScript compilation for production.

### Styling and Design System
TailwindCSS provides the styling foundation with a custom design system. CSS custom properties are used for theme variables, ensuring consistent styling. Font Awesome provides additional iconography.