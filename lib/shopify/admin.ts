/**
 * Client Shopify Admin API (GraphQL) — utilisé côté serveur uniquement :
 * agents de gestion, inscriptions newsletter, liste d'attente.
 * Activé si SHOPIFY_STORE_DOMAIN et SHOPIFY_ADMIN_ACCESS_TOKEN sont définis.
 * Portées nécessaires : read/write_products, read/write_inventory, read/write_orders,
 * read/write_customers, read/write_content (articles), read_analytics.
 */
const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const version = process.env.SHOPIFY_API_VERSION ?? "2025-10";

export const adminEnabled = Boolean(domain && token);

export async function admin<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  if (!adminEnabled) throw new Error("Shopify Admin n’est pas configuré");
  const res = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token! },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (!res.ok || json.errors?.length) throw new Error(`Shopify Admin : ${json.errors?.map((e) => e.message).join(" ; ") ?? res.status}`);
  return json.data as T;
}

/** Inscrit (ou met à jour) une cliente avec consentement marketing e-mail. */
export async function subscribeNewsletter(email: string): Promise<void> {
  if (!adminEnabled) return;
  await admin(
    `mutation Sub($input: CustomerInput!) { customerCreate(input: $input) { userErrors { field message } } }`,
    { input: { email, emailMarketingConsent: { marketingState: "SUBSCRIBED", marketingOptInLevel: "CONFIRMED_OPT_IN" }, tags: ["newsletter", "site"] } },
  );
}
