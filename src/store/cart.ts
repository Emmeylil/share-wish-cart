import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { getGuestId, shortCode } from "@/lib/guest";
import type { Cart, CartItem, Product } from "@/lib/types";

type CartState = {
  cart: Cart | null;
  items: (CartItem & { product: Product })[];
  loading: boolean;
  loadOrCreate: () => Promise<void>;
  addItem: (product: Product, qty?: number) => Promise<void>;
  updateQty: (itemId: string, qty: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refreshItems: (cartId: string) => Promise<void>;
  total: () => number;
  itemCount: () => number;
};

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  items: [],
  loading: false,

  loadOrCreate: async () => {
    const guestId = getGuestId();
    if (!guestId) return;
    set({ loading: true });

    // Find latest active cart for this guest
    const { data: existing } = await supabase
      .from("carts")
      .select("*")
      .eq("owner_guest_id", guestId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let cart = existing as Cart | null;
    if (!cart) {
      const { data: created, error } = await supabase
        .from("carts")
        .insert({ owner_guest_id: guestId, share_code: shortCode() })
        .select()
        .single();
      if (error) {
        set({ loading: false });
        return;
      }
      cart = created as Cart;
    }
    set({ cart });
    await get().refreshItems(cart.id);
    set({ loading: false });
  },

  refreshItems: async (cartId: string) => {
    const { data } = await supabase
      .from("cart_items")
      .select("*, product:products(*)")
      .eq("cart_id", cartId);
    set({ items: (data ?? []) as (CartItem & { product: Product })[] });
  },

  addItem: async (product, qty = 1) => {
    let cart = get().cart;
    if (!cart) {
      await get().loadOrCreate();
      cart = get().cart;
      if (!cart) return;
    }
    const existing = get().items.find((i) => i.product_id === product.id);
    if (existing) {
      await get().updateQty(existing.id, existing.quantity + qty);
    } else {
      await supabase.from("cart_items").insert({
        cart_id: cart.id,
        product_id: product.id,
        quantity: qty,
      });
      await get().refreshItems(cart.id);
    }
  },

  updateQty: async (itemId, qty) => {
    if (qty < 1) return get().removeItem(itemId);
    await supabase.from("cart_items").update({ quantity: qty }).eq("id", itemId);
    const cart = get().cart;
    if (cart) await get().refreshItems(cart.id);
  },

  removeItem: async (itemId) => {
    await supabase.from("cart_items").delete().eq("id", itemId);
    const cart = get().cart;
    if (cart) await get().refreshItems(cart.id);
  },

  total: () =>
    get().items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0),
  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
