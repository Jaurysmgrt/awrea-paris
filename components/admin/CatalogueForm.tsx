"use client";
/**
 * Nouvelle fiche par l'agent Catalogue : photos (redimensionnées dans le navigateur) + notes.
 * La pièce sera créée sur demande, sans stock : on choisit les tailles proposées, le prix et le
 * délai de fabrication (avec leurs indicateurs « provisoire »).
 */
import Link from "@/components/ui/Link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAtelier } from "./AtelierContext";
import { DEFAULT_LEAD_TIME } from "@/lib/commerce/availability";
import type { LeadTime } from "@/lib/commerce/types";

type Uploaded = { id: string; url: string; name: string };
const SIZES = ["XS", "S", "M", "L", "XL", "TU"] as const;

async function resize(file: File): Promise<{ data: string; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { data: dataUrl.split(",")[1], width, height };
}

/** Délai proposé selon la catégorie : délais provisoires de la Maison (lib/commerce/availability.ts). */
const LEAD = DEFAULT_LEAD_TIME as Record<string, LeadTime>;

export function CatalogueForm({ collections }: { collections: { handle: string; title: string }[] }) {
  const { api } = useAtelier();
  const router = useRouter();
  const [photos, setPhotos] = useState<Uploaded[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sizes, setSizes] = useState<Record<string, boolean>>(Object.fromEntries(SIZES.map((s) => [s, s !== "XL" && s !== "TU"])));
  const [lead, setLead] = useState(LEAD.robe);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [result, setResult] = useState("");

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files).slice(0, 8 - photos.length)) {
      const { data, width, height } = await resize(file);
      const res = await fetch(api("/media"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, mediaType: "image/jpeg", data, width, height }) });
      const j = await res.json();
      if (res.ok) setPhotos((p) => [...p, { id: j.id, url: j.url, name: file.name }]);
    }
    setUploading(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("busy");
    const body = {
      notes: String(f.get("notes") ?? ""),
      name: String(f.get("name") ?? "") || undefined,
      category: String(f.get("category") ?? "") || undefined,
      collection: String(f.get("collection") ?? "") || undefined,
      priceEuros: Number(String(f.get("price") ?? "").replace(",", ".")),
      priceProvisional: f.get("priceProvisional") === "on",
      leadTime: { min: Math.min(lead.min, lead.max), max: Math.max(lead.min, lead.max) },
      leadTimeProvisional: f.get("leadProvisional") === "on",
      sizes: SIZES.filter((s) => sizes[s]),
      mediaIds: photos.map((p) => p.id),
    };
    const res = await fetch(api("/catalogue"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState("error");
      setResult(j.error ?? "Échec.");
      return;
    }
    setState(j.run?.failed ? "error" : "done");
    setResult(j.run?.summary + (j.run?.errors?.length ? `. À revoir : ${j.run.errors.join(" ; ")}` : ""));
    router.refresh();
  }

  return (
    <form className="catalogue-form stack-m" onSubmit={onSubmit}>
      <div className="field">
        <span className="field__label">Photos (jusqu’à 8)</span>
        <label className="dropzone">
          <input type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} />
          <span className="t-body">{uploading ? "Préparation des photos…" : "Choisir ou déposer les photos de la pièce"}</span>
        </label>
        {photos.length ? (
          <ul className="thumbs">
            {photos.map((p) => (
              <li key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.name} width={80} height={120} />
                <button type="button" className="link link--quiet" onClick={() => setPhotos((x) => x.filter((y) => y.id !== p.id))}>
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="form__row form__row--3">
        <div className="field">
          <label className="field__label" htmlFor="c-name">Nom (facultatif)</label>
          <input id="c-name" name="name" className="field__input" placeholder="La robe Odessa" />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="c-cat">Catégorie</label>
          <select id="c-cat" name="category" className="field__input" defaultValue="" onChange={(e) => setLead(LEAD[e.target.value] ?? LEAD.robe)}>
            <option value="">À déduire des photos</option>
            <option value="robe">Robe</option>
            <option value="body">Body</option>
            <option value="top">Top</option>
            <option value="jupe">Jupe</option>
            <option value="accessoire">Accessoire</option>
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="c-col">Collection</label>
          <select id="c-col" name="collection" className="field__input">
            {collections.map((c) => (
              <option key={c.handle} value={c.handle}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form__row form__row--3">
        <div className="field">
          <label className="field__label" htmlFor="c-price">Prix (€)</label>
          <input id="c-price" name="price" type="number" min={1} step={0.01} required className="field__input" />
          <label className="check t-note">
            <input type="checkbox" name="priceProvisional" />
            <span>Prix provisoire, à confirmer</span>
          </label>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="c-lead-min">Délai de fabrication, au plus tôt (semaines)</label>
          <input id="c-lead-min" type="number" min={1} max={26} required className="field__input" value={lead.min} onChange={(e) => setLead((l) => ({ ...l, min: Number(e.target.value) }))} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="c-lead-max">Délai de fabrication, au plus tard (semaines)</label>
          <input id="c-lead-max" type="number" min={1} max={26} required className="field__input" value={lead.max} onChange={(e) => setLead((l) => ({ ...l, max: Number(e.target.value) }))} />
          <label className="check t-note">
            <input type="checkbox" name="leadProvisional" defaultChecked />
            <span>Délai provisoire, à confirmer</span>
          </label>
        </div>
      </div>
      <fieldset className="field">
        <legend className="field__label">Tailles proposées</legend>
        <p className="field__hint">La pièce est créée sur demande : chaque taille cochée se commande toujours, sans stock.</p>
        <div className="size-picker__options">
          {SIZES.map((s) => (
            <label key={s} className="check">
              <input type="checkbox" checked={sizes[s]} onChange={(e) => setSizes((x) => ({ ...x, [s]: e.target.checked }))} />
              <span>{s === "TU" ? "Taille unique" : s}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label className="field__label" htmlFor="c-notes">Vos notes</label>
        <textarea id="c-notes" name="notes" className="field__input" placeholder="Dentelle noire, drapé noué sur le buste, manches longues…" />
        <span className="field__hint">L’agent rédige la fiche complète (accroche, description, coupe, textes alternatifs, SEO) et la met en ligne. Les matières et l’entretien restent à compléter s’ils ne sont pas dans vos notes.</span>
      </div>
      <div>
        <button type="submit" className="btn btn--solid" disabled={state === "busy" || uploading || !photos.length || !SIZES.some((s) => sizes[s])}>
          {state === "busy" ? "L’agent rédige la fiche…" : "Rédiger et publier la fiche"}
        </button>
      </div>
      {state === "done" ? (
        <p className="notice t-body" role="status">
          {result} · <Link href="/boutique" className="text-link">voir la boutique</Link>
        </p>
      ) : state === "error" ? (
        <p className="field__error" role="alert">
          {result}
        </p>
      ) : null}
    </form>
  );
}
