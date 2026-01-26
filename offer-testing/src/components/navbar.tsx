"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function Navbar() {
  const pathname = usePathname()

  const links = [
    { href: "/", label: "LOGS" },
    { href: "/messages", label: "MESSAGES" },
    { href: "/campaigns", label: "CAMPAIGNS" },
    { href: "/offers", label: "OFFERS" },
    { href: "/companies", label: "COMPANIES" },
    { href: "/contacts", label: "CONTACTS" },
    { href: "/copy", label: "COPY" },
  ]

  return (
    <nav className="border-b bg-background sticky top-0 z-10 font-mono text-sm">
      <div className="flex h-14 items-center px-8 mx-auto max-w-[1400px]">
        <div className="mr-8 font-bold tracking-tighter text-lg">
          GTM_OS_v1
        </div>
        <div className="flex items-center space-x-1 h-full">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "h-full flex items-center px-4 transition-colors hover:bg-muted/50 border-b-2 border-transparent",
                pathname === link.href
                  ? "border-primary font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
