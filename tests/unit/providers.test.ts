/** Interrupteurs des services (lib/config/providers.ts) : jamais de plantage faute de clé. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveService } from "@/lib/config/providers";

const shopify = { SHOPIFY_STORE_DOMAIN: "awrea.myshopify.com", SHOPIFY_STOREFRONT_ACCESS_TOKEN: "jeton" };

test("sans interrupteur : le vrai prestataire dès que ses clés sont là, la simulation sinon", () => {
  assert.equal(resolveService("commerce", {}).provider, "mock");
  assert.equal(resolveService("commerce", shopify).provider, "shopify");
  assert.equal(resolveService("commerce", { SHOPIFY_STORE_DOMAIN: "awrea.myshopify.com" }).provider, "mock");
});

test("« mock » force la simulation, même avec toutes les clés", () => {
  assert.equal(resolveService("commerce", { ...shopify, COMMERCE_PROVIDER: "mock" }).provider, "mock");
  assert.equal(resolveService("ai", { ANTHROPIC_API_KEY: "cle", AI_PROVIDER: " Mock " }).provider, "mock");
});

test("prestataire demandé sans ses clés : simulation, et les clés manquantes sont nommées", () => {
  const s = resolveService("commerce", { COMMERCE_PROVIDER: "shopify", SHOPIFY_STORE_DOMAIN: "awrea.myshopify.com" });
  assert.equal(s.provider, "mock");
  assert.deepEqual(s.missing, ["SHOPIFY_STOREFRONT_PRIVATE_TOKEN ou SHOPIFY_STOREFRONT_ACCESS_TOKEN"]);
  assert.equal(s.requested, "shopify");
});

test("noms de clés équivalents acceptés (Upstash, Supabase, Anthropic)", () => {
  assert.equal(resolveService("store", { UPSTASH_REDIS_REST_URL: "https://kv", UPSTASH_REDIS_REST_TOKEN: "t" }).provider, "upstash");
  assert.equal(resolveService("customers", { SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "a", SUPABASE_SERVICE_ROLE_KEY: "s" }).provider, "supabase");
  assert.equal(resolveService("ai", { ANTHROPIC_AUTH_TOKEN: "t" }).provider, "anthropic");
});

test("plusieurs prestataires : l'interrupteur choisit, sinon le premier configuré", () => {
  const both = { BREVO_API_KEY: "b", KLAVIYO_PRIVATE_KEY: "k" };
  assert.equal(resolveService("marketing", both).provider, "brevo");
  assert.equal(resolveService("marketing", { ...both, MARKETING_PROVIDER: "klaviyo" }).provider, "klaviyo");
  assert.equal(resolveService("marketing", { KLAVIYO_PRIVATE_KEY: "k" }).provider, "klaviyo");
});

test("valeur inconnue : traitée comme absente", () => {
  assert.equal(resolveService("email", { EMAIL_PROVIDER: "sendgrid", RESEND_API_KEY: "r" }).provider, "resend");
  assert.equal(resolveService("email", { EMAIL_PROVIDER: "sendgrid" }).provider, "mock");
});

test("une clé vide ou faite d'espaces ne compte pas", () => {
  assert.equal(resolveService("email", { RESEND_API_KEY: "  " }).provider, "mock");
});

test("Shopify : le jeton privé du canal Headless suffit", () => {
  assert.equal(resolveService("commerce", { SHOPIFY_STORE_DOMAIN: "awrea.myshopify.com", SHOPIFY_STOREFRONT_PRIVATE_TOKEN: "p" }).provider, "shopify");
});
