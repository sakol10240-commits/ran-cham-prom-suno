// services/songStudioDb.js  -  reviewed and fixed version of the Supabase service.
//
// What changed from the original (details in REVIEW.md):
//   * No supabase-js, no anon key and no Vite env in the browser. Every call goes to /api/library,
//     which holds the service key, checks the access code, re-validates the content and enforces ownership.
//   * validateSunoPackage is now a real module (./sunoSanitizer.js) and the server re-checks the same rules.
//   * Public reads are paginated, searchable and never include owner information.
//   * Errors are turned into short messages instead of leaking raw database errors.
import { validateSunoPackage } from "./sunoSanitizer.js";

const API = "/api/library";
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

export function deviceId() {
  let d = lsGet("dsa_dev");
  if (!d || !/^[A-Za-z0-9-]{16,64}$/.test(d)) {
    d = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}0000000000000000`;
    lsSet("dsa_dev", d);
  }
  return d;
}

async function call(payload) {
  let res, json;
  try {
    res = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-code": (lsGet("dsa_code") || "").trim(),
        "x-device-id": deviceId(),
      },
      body: JSON.stringify(payload),
    });
    json = await res.json();
  } catch {
    throw new Error("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองอีกครั้ง");
  }
  if (!json || !json.ok) {
    const err = new Error((json && json.message) || "คลังออนไลน์ขัดข้อง ลองอีกครั้ง");
    err.code = json && json.code;
    throw err;
  }
  return json;
}

/** Public packages, newest first. Returns { items, hasMore }. No access code needed. */
export async function fetchPublicSongPackages({ q = "", offset = 0, limit = 12 } = {}) {
  const { items, hasMore } = await call({ action: "list", q, offset, limit });
  return { items, hasMore };
}

/** Packages saved from this device (private and public). Needs the access code. */
export async function fetchMySongPackages() {
  return (await call({ action: "mine" })).items;
}

/**
 * Create or update a package. Pass `id` to update one of your own rows.
 * Public packages are checked more strictly (no links or email addresses).
 */
export async function upsertSongPackage(rawPkg, { id, isPublic = false } = {}) {
  const check = validateSunoPackage(rawPkg, { forPublic: isPublic }); // instant feedback; the server re-checks
  if (!check.isValid) throw new Error(check.errors.join(" | "));
  return (await call({ action: "save", id, is_public: isPublic, pkg: rawPkg })).item;
}

export async function setSongPackageVisibility(id, isPublic) {
  return (await call({ action: "visibility", id, is_public: isPublic })).item;
}

export async function deleteSongPackage(id) {
  await call({ action: "delete", id });
}
