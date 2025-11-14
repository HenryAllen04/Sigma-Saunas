# Unmask Ontology

A Next.js application with shadcn/ui components and the sidebar-08 template.

## Getting Started

### 1. Install Dependencies

First, install all the required dependencies:

```bash
npm install
```

### 2. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 3. View the Dashboard

Navigate to [http://localhost:3000/dashboard](http://localhost:3000/dashboard) to see the sidebar-08 template in action.

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

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

