// Anonymous guest identifier persisted in localStorage.
// Used to attribute carts/wishlists to a "browser user" without auth.

const KEY = "jumini_guest_id";

export function getGuestId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function shortCode(): string {
  // 8-char URL-friendly share code
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}
