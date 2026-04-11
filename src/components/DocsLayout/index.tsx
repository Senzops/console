import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Navbar, Footer } from "../Layout"; // Assuming your public Navbar is exported here
import { DOCS_DATA } from "../../static/docsData";
import { cn } from "../Core";
import * as Icons from "lucide-react";

// Dynamic Icon Renderer
const renderIcon = (iconName: string, className: string) => {
  const IconComponent = (Icons as any)[iconName] || Icons.Box;
  return <IconComponent className={className} />;
};

export const DocsLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();

  const isCurrent = (path: string) => router.asPath === path;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Top spacing to account for fixed Navbar */}
      <div className="pt-16 flex-1 flex w-full max-w-[1400px] mx-auto">
        {/* LEFT SIDEBAR (Navigation) */}
        <aside className="hidden md:block w-64 shrink-0 border-r border-border/40 py-8 px-4 overflow-y-auto h-[calc(100vh-4rem)] sticky top-16">
          <div className="space-y-8">
            {/* Getting Started */}
            <div>
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 px-2">
                Getting Started
              </h4>
              <ul className="space-y-1">
                <li>
                  <Link
                    href="/docs"
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                      isCurrent("/docs")
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                    )}
                  >
                    <Icons.BookOpen className="w-4 h-4" /> Introduction
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/faq"
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                      isCurrent("/docs/faq")
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                    )}
                  >
                    <Icons.HelpCircle className="w-4 h-4" /> FAQs
                  </Link>
                </li>
              </ul>
            </div>

            {/* Platform Services (Dynamically mapped from JSON) */}
            <div>
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 px-2">
                Platform Services
              </h4>
              <ul className="space-y-1">
                {DOCS_DATA.services.map((service) => (
                  <li key={service.id}>
                    <Link
                      href={`/docs/${service.id}`}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                        isCurrent(`/docs/${service.id}`)
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                      )}
                    >
                      {renderIcon(service.iconName, "w-4 h-4")}

                      <span className="truncate whitespace-nowrap overflow-hidden">
                        {service.title.split("(")[0].trim()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 py-8 px-6 md:px-12 lg:px-16 overflow-y-auto">
          <div className="max-w-3xl">{children}</div>
        </main>
      </div>

      <Footer />
    </div>
  );
};
