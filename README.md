# **SysSentinel Console**

**SysSentinel** is a modern, high-performance infrastructure monitoring dashboard built with **Next.js** and **Tailwind CSS**. It provides real-time telemetry visualization for your VPS instances and Docker containers with a focus on UI/UX, security, and performance.

## **✨ Key Features**

* **Real-Time Telemetry:** Live visualization of CPU, Memory, Disk, Network I/O, and Process states.  
* **Honeycomb Infrastructure Grid:** A unique, responsive hexagonal grid view for monitoring fleet health at a glance.  
* **Docker Integration:** Deep-dive into container metrics (CPU, Memory limits, State) with granular history.  
* **Advanced Charting:**  
  * Maximizable charts for detailed analysis.  
  * Historical data scrubbing with adjustable time ranges (1h \- 24h).  
  * Real-time uptime monitoring strips.  
* **Theme Engine:**  
  * **4 Presets:** Dark (Zinc), Light, Nord, and Latte.  
  * **Appearance Modes:** Toggle between **Colorful** and **Monochromatic** data visualization.  
* **Secure & Robust:**  
  * Client-side authentication via **Firebase**.  
  * Data fetching strategies using **SWR** (Stale-While-Revalidate).  
  * Zero-trust architecture (Frontend never sees Agent secrets after generation).

## **🛠 Tech Stack**

* **Framework:** Next.js (Pages Router)  
* **Styling:** Tailwind CSS, CSS Variables for Theming  
* **State/Fetching:** SWR, Context API  
* **Visualization:** Recharts  
* **Icons:** Lucide React  
* **Auth:** Firebase Authentication (Google Provider)  
* **HTTP Client:** Axios

## **⚙️ Prerequisites**

Before you begin, ensure you have the following:

* Node.js (v18 or higher)  
* NPM or Yarn  
* A Firebase Project (for Authentication)  
* The running [SysSentinel Core](https://github.com/SysSentinel/core)

## **🚀 Getting Started**

1. **Clone the Repository** 
  ```sh
    git clone https://github.com/SysSentinel/console.git
    cd console
  ```

2. **Install Dependencies**  
  ```sh
    npm install
  ```

3. Configure Environment Variables  
   Create a .env.local file in the root directory and add your credentials:  
  ```.env.local
    # The URL of your running SysSentinel Backend  
    NEXT_PUBLIC_API_URL=http://localhost:5000/api

    # Firebase Configuration (Get these from Firebase Console -> Project Settings)  
    NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...  
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com  
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
  ```
4. **Run Development Server**  

```sh
  npm run dev
```
  Open [http://localhost:3000](http://localhost:3000) with your browser.

## **📂 Project Structure**

```sh
console/  
├── components/  
│   ├── Layout.tsx          # Main Dashboard Layout (Sidebar, Navbar)  
│   └── ui/  
│       └── core.tsx        # Reusable UI (Card, Button, Dialog, Spinner)  
├── lib/  
│   ├── auth.tsx            # Firebase Auth & Axios Interceptor  
│   └── theme.tsx           # Theme Context & LocalStorage Logic  
├── pages/  
│   ├── index.tsx           # Public Landing Page  
│   ├── _app.tsx            # Global Providers  
│   └── dashboard/  
│       ├── index.tsx       # "Honeycomb" Fleet View  
│       ├── [id].tsx        # VPS Detail View  
│       └── [id]/docker/  
│           └── [containerId].tsx # Container Detail View  
├── public/                 # Static Assets  
└── styles/  
    └── globals.css         # Tailwind & CSS Variables (Theming)  
```