/** Icônes au fil : un seul trait fin, sans remplissage. */
const paths = {
  close: "M5 5l14 14M19 5L5 19",
  menu: "M3 8h18M3 16h18",
  bag: "M5 8h14l-1 12H6L5 8zm4 0V6a3 3 0 016 0v2",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  arrow: "M4 12h16m-5-5l5 5-5 5",
  arrowLeft: "M20 12H4m5-5l-5 5 5 5",
  diamond: "M12 3l7 9-7 9-7-9 7-9z",
  search: "M10.5 17a6.5 6.5 0 100-13 6.5 6.5 0 000 13zM15.5 15.5L21 21",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c1-4 4-6 8-6s7 2 8 6",
  play: "M8 5l11 7-11 7V5z",
  pause: "M8 5v14M16 5v14",
  chat: "M4 5h16v11H9l-5 4V5z",
  sound: "M4 9h4l5-4v14l-5-4H4V9z",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className, title }: { name: IconName; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square" className={className} aria-hidden={title ? undefined : true} role={title ? "img" : undefined}>
      {title ? <title>{title}</title> : null}
      <path d={paths[name]} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
