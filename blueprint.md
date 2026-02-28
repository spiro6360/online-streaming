# **StreamX - Elite Live Streaming Platform (Supabase Integrated)**

## **Overview**
StreamX is a modern live streaming platform prototype integrated with Supabase for real-time data persistence and authentication. It handles user profiles, live broadcast metadata, and instant chat messaging.

## **Detailed Features & Design**
- **Aesthetic:** Dark theme with glassmorphism effects, high-contrast typography, and vibrant accent colors (Elite Blue/Purple).
- **Authentication:** 
  - Modal-based Sign Up and Login.
  - Integration with Supabase Auth.
  - Automatic profile creation via Postgres triggers.
- **Navigation:** Single Page Application (SPA) feel with dynamic view switching.
- **Streaming:**
  - Real-time stream grid with status indicators.
  - Dedicated player view with chat integration.
- **User Dashboard:** "My Page" for profile management and cash tracking.

## **Implementation Plan - Authentication Functionality**
1. **Robust Auth Logic:**
   - Update `main.js` to handle modal states using data attributes instead of brittle text content checks.
   - Implement loading states for authentication buttons to provide visual feedback.
   - Improve session management to handle cases where profiles might be delayed or missing.
2. **UI Enhancements:**
   - Ensure form validation (email format, password length) before sending requests.
   - Add clear error messaging for authentication failures.
3. **Verification:**
   - Test Sign Up process and verify profile creation in the `profiles` table.
   - Test Login process and verify session persistence.
   - Verify Logout functionality and UI reset.

## **Technical Debt & Future Work**
- [ ] Implement actual video streaming (HLS/WebRTC).
- [ ] Add real-time viewer count updates.
- [ ] Implement "Cash" recharge system with mock payment gateway.
- [ ] Add follower/following system.
