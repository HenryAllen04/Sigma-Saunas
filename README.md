# Sigma Saunas - Smart Sauna Monitoring & AI Coach

A Next.js application for monitoring sauna sessions with real-time sensors, session tracking, and AI-powered coaching using Google Gemini.

## ✨ Key Features

- 🌡️ **Real-time Sauna Monitoring** - Live temperature, humidity, and presence detection
- 📊 **Session History & Analytics** - Track your sauna sessions over time
- 🧠 **AI Sauna Coach** - Personalized guidance powered by Google Gemini
- 🏆 **Social & Leaderboards** - Compete with friends and community
- 🎙️ **Voice Interface** - Hands-free interaction during sessions
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

## Getting Started

### 1. Install Dependencies

First, install all the required dependencies:

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Required for AI Sauna Coach feature
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: For Redis session storage
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Optional: For voice features
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

**Get your Gemini API Key:**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Add it to your `.env.local` file

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

### 4. Try the AI Sauna Coach

Navigate to [http://localhost:3000/ai-coach](http://localhost:3000/ai-coach) to interact with your personalized AI coach powered by Google Gemini!

## Project Structure

```
unmask-ontology/
├── app/
│   ├── dashboard/
│   │   └── page.tsx          # Dashboard page with sidebar
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home page
│   └── globals.css            # Global styles with Tailwind
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── app-sidebar.tsx        # Main sidebar component
│   ├── nav-main.tsx           # Main navigation
│   ├── nav-projects.tsx       # Projects navigation
│   ├── nav-secondary.tsx      # Secondary navigation
│   └── nav-user.tsx           # User dropdown
├── hooks/
│   └── use-mobile.tsx         # Mobile detection hook
├── lib/
│   └── utils.ts               # Utility functions
└── components.json            # shadcn configuration
```

## Technologies Used

- **Next.js 15** - React framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI component library
- **Radix UI** - Headless UI primitives
- **Lucide React** - Icons
- **Google Gemini AI** - AI-powered coaching and insights
- **Recharts** - Data visualization
- **Framer Motion** - Animations

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Adding More Components

To add more shadcn components:

```bash
npx shadcn@latest add [component-name]
```

For example:
```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

## 🧠 AI Sauna Coach Feature

The AI Sauna Coach is powered by **Google Gemini** and provides:

- **Personalized Analysis** - Reviews your session history and current conditions
- **Safety Guidance** - Expert advice on safe sauna practices
- **Optimization Tips** - Maximize health benefits from your sessions
- **Quick Prompts** - Pre-built questions for common scenarios
- **Context-Aware** - Understands your progress and patterns

[Read full documentation →](docs/ai-coach-feature.md)

## Project Structure

```
sigma-saunas/
├── app/
│   ├── ai-coach/              # 🧠 AI Coach interface (NEW!)
│   │   └── page.tsx
│   ├── api/
│   │   ├── ai-coach/          # Gemini API integration (NEW!)
│   │   │   └── route.ts
│   │   ├── chat/              # Voice chat API
│   │   └── sensor/            # Sensor data endpoints
│   ├── sauna/                 # Live sauna monitoring
│   ├── history/               # Session history
│   ├── social/                # Leaderboards
│   └── voice/                 # Voice interface
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── app-sidebar.tsx        # Main navigation
│   └── leaderboard/           # Leaderboard components
├── docs/
│   └── ai-coach-feature.md    # AI Coach documentation (NEW!)
├── lib/
│   ├── harvia-client.ts       # Sauna device client
│   └── redis-client.ts        # Redis integration
└── types/
    └── sensor.ts              # TypeScript types
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Google Gemini AI](https://ai.google.dev/)
- [AI Coach Feature Docs](docs/ai-coach-feature.md)

