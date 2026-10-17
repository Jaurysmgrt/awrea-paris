/** Données structurées Schema.org (JSON-LD), rendues côté serveur. */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(Array.isArray(data) && data.length === 1 ? data[0] : data).replace(/</g, "\\u003c") }}
    />
  );
}
