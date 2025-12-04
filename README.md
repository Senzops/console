This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app).

console/
├── .env.local                # Local environment variables (API URL, Firebase keys)
├── .eslintrc.json            # Linting config
├── package.json              # Dependencies (next, firebase, swr, recharts, etc.)
├── postcss.config.js         # PostCSS config for Tailwind
├── tailwind.config.js        # Tailwind theme customization (Colors, Radius)
├── tsconfig.json             # TypeScript configuration
├── next.config.js            # Next.js build configuration
│
├── components/               # Reusable React Components
│   ├── Layout.tsx            # Contains <Navbar> and <DashboardLayout>
│   └── ui/                   # "Shadcn"-style atomic components
│       └── core.tsx          # Card, Button, Badge, and 'cn' utility
│
├── lib/                      # Business Logic & Utilities
│   └── auth.tsx              # Firebase AuthProvider, User Context, and Axios instance
│
├── pages/                    # Routing (File-system based)
│   ├── _app.tsx              # Application entry point (Global Providers)
│   ├── _document.tsx         # (Optional) HTML/Body tag customization
│   ├── index.tsx             # Public Landing Page
│   └── dashboard/            # Protected Dashboard Routes
│       ├── index.tsx         # /dashboard - List of all servers
│       └── [id].tsx          # /dashboard/:id - Individual VPS Graphs & Stats
│
├── public/                   # Static Assets
│   ├── favicon.ico
│   └── vercel.svg
│
├── styles/                   # CSS
│   └── globals.css           # Global styles, Tailwind imports, CSS Variables
│
└── node_modules/             # Installed packages (not committed to git)
