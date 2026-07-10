# Evenflow Feature Development Plan

This plan tracks the implementation of user authentication and personalization features in Evenflow.

## Phase 1: User Authentication & Account Management
- [ ] **Default User Setup**
    - [ ] Implement a default `user` table in SQLite schema.
    - [ ] Create an initialization script (or update `create` command) to seed the first admin user.
- [ ] **Authentication Flow**
    - [ ] Build a Login page (`/login`).
    - [ ] Implement session management using browser cookies or local storage + token-based approach if needed (though SQLite WASM is local).
    - [ ] Secure API routes for authentication (verifying credentials).
- [ ] **User Profile Management**
    - [ ] Create a "Profile" view in the Admin dashboard.
    - [ ] Implement "Change Password" functionality:
        - [ ] UI for entering current, new, and confirm passwords.
        - [ ] Backend verification and hashed password update in `user` table.

## Phase 2: Media & Personalization
- [ ] **Image Support**
    - [ ] Update Content schema to handle image URLs or references (OPFS/Blob).
    - [ ] Add an Image Upload component for the Admin area.
    - [ ] Implement image rendering in the frontend post views.
- [ ] **Visual Customization (Theming)**
    - [ ] Extend `settings` table to store theme configurations (primary color, font families).
    - [ ] Create a "Theme Editor" in Admin Settings:
        - [ ] Color picker for primary/accent colors.
        - [ ] Dropdown for typography selection (Google Fonts integration or local system fonts).
    - [ ] Implement dynamic CSS injection in `Layout.astro` based on retrieved settings.

## Phase 3: Refinement & Testing
- [ ] **Security Audit**
    - [ ] Ensure password hashing is robust (e.g., using a library compatible with WASM/Web Worker).
    - [ ] Validate all authenticated routes.
- [ ] **UI/UX Polish**
    - [ ] Add loading states and success/error feedback for theme changes.
    - [ ] Ensure responsive design for the new settings components.
