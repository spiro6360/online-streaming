# **StreamX - Elite Live Streaming Platform**

## **Overview**
StreamX is a modern, high-performance web-based live streaming platform prototype. It features a responsive layout, SPA-like view switching, a simulated live chat, and a sleek dark theme. The application is built using standard web technologies (HTML, CSS, JavaScript) and follows modern design principles.

## **Current Features**
- **SPA View Switching:** Seamlessly switch between Home, Live, Explore, VOD, and Player views.
- **Live Chat Simulation:** Real-time chat messages appear in the player view.
- **Responsive Design:** Adapts to desktop and mobile screens with a dedicated mobile navigation bar.
- **Search:** A search bar that filters broadcasts by title and channel.
- **Auth Modals:** Placeholder login and registration modals.
- **Follow & Donation Simulation:** Interactive follow buttons and "Star Balloon" (별풍선) donation effects.

## **Planned Improvements**

### **1. Data Cleanup**
- Refine the `DATA.streams` array to ensure all broadcast entries feel realistic and high-quality.
- Remove any redundant or obviously placeholder-only entries if necessary.

### **2. Enhanced Search Functionality**
- Ensure the search function is robust and updates the UI correctly across different views.
- Improve the "No results found" state visually.

### **3. Detailed Signup Form**
- Update the registration modal to include:
    - **ID (Username)**
    - **Email**
    - **Password**
- Add basic validation or UI feedback for these fields.

### **4. Currency Rebranding: Star Balloons to Cash**
- Rename "별풍선" (Star Balloons) to "캐시" (Cash) throughout the UI.
- Update icons (e.g., from ⭐ to 💰 or 💵) and CSS variable names where appropriate for consistency.

### **5. Login-Restricted Donations**
- Implement a simulated login state tracking in `App.state`.
- Restrict the donation button (`캐시 후원`) to logged-in users only.
- Show an alert or prompt the login modal if a guest tries to donate.

## **Technical Implementation Plan**

1. **Step 1: UI & Text Updates**
    - Modify `index.html` to update the registration fields.
    - Rename "별풍선" to "캐시" in `index.html` and `main.js`.
    - Update CSS variables in `style.css` if necessary.

2. **Step 2: Logic Updates in `main.js`**
    - Update `App.state` to include `isLoggedIn` and `currentUser`.
    - Update `toggleModal` and `bind` to handle the new signup fields.
    - Implement the donation restriction check in `simulateDonation`.
    - Refine the `DATA.streams` list.

3. **Step 3: Verification**
    - Test the search functionality.
    - Test the new signup form layout.
    - Verify that donations only work when "logged in."
