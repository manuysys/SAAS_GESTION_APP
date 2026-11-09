"use client";

import { Command } from "cmdk";
import { ArrowRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { NavItem } from "@/lib/navigation";

type CommandPaletteProps = {
  items: NavItem[];
};

export function CommandPalette({ items }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-mist text-slate hover:bg-paper hidden items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-medium md:flex"
        aria-label="Abrir búsqueda rápida"
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        Buscar
        <kbd className="bg-mist/70 text-ink rounded px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] translate-y-0 p-0">
          <DialogTitle className="sr-only">Búsqueda rápida</DialogTitle>
          <Command
            loop
            className="[&_[cmdk-group-heading]]:text-slate [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase"
          >
            <div className="border-mist flex items-center gap-2 border-b px-4">
              <Search className="text-slate h-4 w-4" aria-hidden="true" />
              <Command.Input
                autoFocus
                placeholder="Ir a un módulo o buscar una acción..."
                className="text-ink placeholder:text-slate/70 h-12 w-full bg-transparent text-sm outline-none"
              />
            </div>
            <Command.List className="max-h-80 overflow-y-auto p-2">
              <Command.Empty className="text-slate px-3 py-6 text-center text-sm">
                No encontré resultados.
              </Command.Empty>
              <Command.Group heading="Módulos">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Command.Item
                      key={item.href}
                      value={`${item.label} ${item.href}`}
                      onSelect={() => go(item.href)}
                      className="data-[selected=true]:bg-mist/60 text-ink flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm"
                    >
                      <Icon className="text-slate h-4 w-4" aria-hidden="true" />
                      {item.label}
                      <ArrowRight className="text-slate/50 ml-auto h-3.5 w-3.5" aria-hidden="true" />
                    </Command.Item>
                  );
                })}
              </Command.Group>
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
