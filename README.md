# **Senzor Console**

**Senzor** is a modern, high-performance infrastructure monitoring dashboard built with **Next.js** and **Tailwind CSS**. It provides real-time telemetry visualization for your VPS instances and Docker containers with a focus on UI/UX, security, and performance.

## **✨ Key Features**

### **🖥️ Infrastructure Monitoring**

- **Real-Time Telemetry:** Live streaming of CPU, Memory, Disk, and Network metrics via WebSocket.
- **Docker Deep-Dive:** Monitor container health, resource usage limits, and state.
- **Integrations:** Native dashboards for **Nginx** (Req/s, Connections) and **Traefik** (Routers/Services).
- **Web Terminal:** Secure, browser-based SSH access to your servers (xterm.js \+ node-pty).

### **🌐 Web Analytics**

- **Privacy-First:** Cookie-less tracking for Pageviews, Unique Visitors, and Sessions.
- **Geospatial Data:** Interactive World Maps and City-level breakdowns.
- **Traffic Insights:** Bounce rates, device breakdowns, and peak traffic heatmaps.

### **⏱️ Uptime Monitoring**

- **Global Checks:** Distributed heartbeat checks for HTTP/TCP endpoints.
- **Health Badges:** Automated categorization (Excellent, Degraded, Critical) based on latency/uptime.
- **Incident History:** Detailed logs of every check and response code.

### **🎨 UI/UX Excellence**

- **Theme Engine:** Switch between **Dark (Zinc)**, **Light**, **Nord**, and **Latte** themes.
- **Visualization Modes:** Toggle **Monochromatic Mode** for high-contrast, data-centric views.
- **Honeycomb Grid:** Unique fleet overview layout.

## **🛠 Tech Stack**

- **Framework:** Next.js 14 (Pages Router)
- **Styling:** Tailwind CSS \+ CSS Variables
- **State/Fetching:** SWR (Stale-While-Revalidate)
- **Real-time:** Socket.io Client
- **Terminal:** Xterm.js \+ Xterm-addon-fit
- **Charts:** Recharts
- **Maps:** React Simple Maps (TopoJSON)
- **Auth:** Firebase Auth (Google \+ Email/Pass)
- **UI Components:** Lucide React, Sonner (Toast)

## **⚙️ Prerequisites**

Before you begin, ensure you have the following:

- Node.js (v18 or higher)
- NPM or Yarn
- A Firebase Project (for Authentication)
- The running [Senzor Core](https://github.com/senzops/core)

## **🚀 Getting Started**

1. **Clone the Repository**

```sh
  git clone https://github.com/senzops/console.git
  cd console
```

2. **Install Dependencies**

```sh
  npm install
```

3. Configure Environment Variables  
   Create a .env.local file in the root directory and add your credentials:

```.env.local
  # The URL of your running Senzor Backend
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

## **🤝 Contributing**

We welcome contributions\! Please fork the repository and submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (git checkout \-b feature/AmazingFeature)
3. Commit your Changes (git commit \-m 'Add some AmazingFeature')
4. Push to the Branch (git push origin feature/AmazingFeature)
5. Open a Pull Request

## **📄 License**

Distributed under the MIT License. See LICENSE for more information.
