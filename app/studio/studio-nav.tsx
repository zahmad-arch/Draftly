"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  locked?: boolean;
  lockedTitle?: string;
}

export function StudioNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-6xl gap-7 overflow-x-auto px-6 text-sm whitespace-nowrap">
      {items.map((item) => {
        const active =
          item.href === "/studio"
            ? pathname === "/studio"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.locked ? item.lockedTitle : undefined}
            className={
              active
                ? "-mb-px border-b-2 border-vermillion pb-3 font-medium text-ink"
                : item.locked
                  ? "pb-3 text-ink-soft/50 hover:text-ink-soft"
                  : "pb-3 text-ink-soft hover:text-ink"
            }
          >
            {item.label}
            {item.locked && <span className="ml-1 text-vermillion">✳</span>}
          </Link>
        );
      })}
    </nav>
  );
}
