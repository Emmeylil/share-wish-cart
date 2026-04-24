import { create } from "zustand";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, limit, orderBy, getDoc } from "firebase/firestore";
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

    try {
      // Find latest active cart for this guest
      // Simplified query to avoid composite index requirement
      const q = query(
        collection(db, "carts"),
        where("owner_guest_id", "==", guestId)
      );
      const querySnapshot = await getDocs(q);
      
      const activeCarts = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Cart))
        .filter(c => c.status === "active")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      let cart: Cart | null = null;
      if (activeCarts.length > 0) {
        cart = activeCarts[0];
      } else {
        const newCart = {
          owner_guest_id: guestId,
          share_code: shortCode(),
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const docRef = await addDoc(collection(db, "carts"), newCart);
        cart = { id: docRef.id, ...newCart } as Cart;
      }

      set({ cart });
      await get().refreshItems(cart.id);
    } catch (error) {
      console.error("Error loading cart:", error);
    } finally {
      set({ loading: false });
    }
  },

  refreshItems: async (cartId: string) => {
    try {
      const q = query(collection(db, "cart_items"), where("cart_id", "==", cartId));
      const querySnapshot = await getDocs(q);
      
      const itemsWithProducts = await Promise.all(
        querySnapshot.docs.map(async (itemDoc) => {
          const itemData = itemDoc.data() as CartItem;
          // Fetch product details for each item (Firestore doesn't support joins)
          const productRef = doc(db, "products", itemData.product_id);
          const productSnap = await getDoc(productRef);
          return {
            ...itemData,
            id: itemDoc.id,
            product: { id: productSnap.id, ...productSnap.data() } as Product
          };
        })
      );

      set({ items: itemsWithProducts });
    } catch (error) {
      console.error("Error refreshing items:", error);
    }
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
      await addDoc(collection(db, "cart_items"), {
        cart_id: cart.id,
        product_id: product.id,
        quantity: qty,
      });
      await get().refreshItems(cart.id);
    }
  },

  updateQty: async (itemId, qty) => {
    if (qty < 1) return get().removeItem(itemId);
    const itemRef = doc(db, "cart_items", itemId);
    await updateDoc(itemRef, { quantity: qty });
    const cart = get().cart;
    if (cart) await get().refreshItems(cart.id);
  },

  removeItem: async (itemId) => {
    const itemRef = doc(db, "cart_items", itemId);
    await deleteDoc(itemRef);
    const cart = get().cart;
    if (cart) await get().refreshItems(cart.id);
  },

  total: () =>
    get().items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0),
  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));

