import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Sparkles } from "lucide-react";

export default function Home() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-transparent">
        <header className="flex h-20 shrink-0 items-center">
          <div className="flex w-full items-center justify-between px-6 md:px-12">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-2" />
              <div className="hidden md:block h-6 w-px bg-white/10" />
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                  Welcome to SigmaSaunas
                </h1>
                <p className="text-sm text-white/60">Your sauna wellness journey starts here</p>
              </div>
            </div>
            <Link
              href="#"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/80 backdrop-blur-md hover:bg-white/15"
            >
              <Sparkles className="h-4 w-4" />
              Profile
            </Link>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 px-6 md:px-12 pb-10">
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
            <h2 className="text-4xl font-bold">Get Started</h2>
            <Link
              href="/dashboard"
              className="rounded-xl bg-white/20 px-8 py-3 text-base font-medium text-white hover:bg-white/25 backdrop-blur-md"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

