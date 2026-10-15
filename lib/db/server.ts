/**
 * Client Supabase lié à la session de la cliente (cookies) : toutes les requêtes passent
 * par la sécurité par ligne (RLS). À créer à chaque requête, jamais partagé.
 */
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./supabase";

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // appel depuis un composant serveur : le proxy se charge du rafraîchissement
        }
      },
    },
  });
}
