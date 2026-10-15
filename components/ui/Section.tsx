type Theme = "ink" | "ivory" | "paper" | "pearl";

/** Section de page : déclare son thème (noir, ivoire, papier, perle) pour la bascule au scroll. */
export function Section({
  theme = "ivory",
  as: Tag = "section",
  className,
  children,
  id,
  labelledBy,
  ...rest
}: {
  theme?: Theme;
  as?: "section" | "div" | "header" | "footer" | "aside" | "article";
  className?: string;
  children: React.ReactNode;
  id?: string;
  labelledBy?: string;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag data-theme={theme} className={`scene ${className ?? ""}`} id={id} aria-labelledby={labelledBy} {...rest}>
      {children}
    </Tag>
  );
}
