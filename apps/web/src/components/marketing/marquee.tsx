import { marqueeItems } from "@/lib/marketing/content";

/* Franja animada en teal. Solo CSS; con reduced motion se ve como lista que se acomoda. */
export function Marquee() {
  return (
    <section aria-label="Funciones principales" className="overflow-hidden bg-teal py-4 text-white">
      <div className="mk-marquee-mask">
        <div className="mk-marquee-track">
          <ul className="flex shrink-0 items-center">
            {marqueeItems.map((item) => (
              <li
                key={item}
                className="flex shrink-0 items-center gap-8 pr-8 font-display text-xl font-medium tracking-tight whitespace-nowrap sm:text-2xl"
              >
                {item}
                <span aria-hidden="true" className="size-2 rounded-full bg-amber" />
              </li>
            ))}
          </ul>
          <ul aria-hidden="true" className="mk-marquee-dup flex shrink-0 items-center">
            {marqueeItems.map((item) => (
              <li
                key={item}
                className="flex shrink-0 items-center gap-8 pr-8 font-display text-xl font-medium tracking-tight whitespace-nowrap sm:text-2xl"
              >
                {item}
                <span aria-hidden="true" className="size-2 rounded-full bg-amber" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
