import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <main className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold">Welcome to Unmask Ontology</h1>
        <p className="text-muted-foreground text-lg">
          Your Next.js app with shadcn/ui is ready!
        </p>
        <Link
          href="/dashboard"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-8 py-3 text-sm font-medium transition-colors"
        >
          Go to Dashboard
        </Link>
      </main>
    </div>
  );
}

