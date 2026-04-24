import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, limit } from "firebase/firestore";
import type { Cart, CartItem, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ShoppingBag, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/cart/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Shared Cart — Jumini` },
      { name: "description", content: "A friend shared their cart with you. Help them checkout!" },
      { property: "og:title", content: "A friend shared their cart with you" },
      { property: "og:description", content: "Open the cart and complete the purchase on their behalf." },
    ],
  }),
  component: SharedCart,
});

function SharedCart() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null);
  const [items, setItems] = useState<(CartItem & { product: Product })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const cartQuery = query(collection(db, "carts"), where("share_code", "==", code), limit(1));
        const cartSnap = await getDocs(cartQuery);
        
        if (cartSnap.empty) {
          setLoading(false);
          return;
        }

        const cartDoc = cartSnap.docs[0];
        const cartData = { id: cartDoc.id, ...cartDoc.data() } as Cart;
        setCart(cartData);

        const itemsQuery = query(collection(db, "cart_items"), where("cart_id", "==", cartDoc.id));
        const itemsSnap = await getDocs(itemsQuery);
        
        const itemsWithProducts = await Promise.all(
          itemsSnap.docs.map(async (itemDoc) => {
            const itemData = itemDoc.data() as CartItem;
            const productRef = doc(db, "products", itemData.product_id);
            const productSnap = await getDoc(productRef);
            return {
              ...itemData,
              id: itemDoc.id,
              product: { id: productSnap.id, ...productSnap.data() } as Product
            };
          })
        );
        
        setItems(itemsWithProducts);
      } catch (error) {
        console.error("Error fetching shared cart:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  if (loading) {
    return <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Loading…</div>;
  }

  if (!cart) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Cart not found</h1>
        <Link to="/" className="text-primary mt-4 inline-block">Go home</Link>
      </div>
    );
  }

  const total = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      {/* Hero banner explaining the share flow */}
      <div className="mb-6 rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground p-6 shadow-[var(--shadow-hover)]">
        <div className="text-3xl mb-2">🎁</div>
        <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
          A friend shared their cart with you
        </h1>
        <p className="mt-2 opacity-95 text-sm sm:text-base">
          Below are the exact items they want. Review them, then check out on their behalf.
          They'll get a notification the moment you complete the purchase.
        </p>
      </div>

      {/* Progress stepper */}
      <ol className="flex items-center gap-2 mb-6 text-xs sm:text-sm">
        <li className="flex items-center gap-2 text-success">
          <span className="size-6 rounded-full bg-success text-success-foreground grid place-items-center font-bold">✓</span>
          <span className="hidden sm:inline">Cart shared</span>
        </li>
        <span className="flex-1 h-px bg-success" />
        <li className="flex items-center gap-2 text-primary font-semibold">
          <span className="size-6 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">2</span>
          <span className="hidden sm:inline">Review & pay</span>
        </li>
        <span className="flex-1 h-px bg-border" />
        <li className="flex items-center gap-2 text-muted-foreground">
          <span className="size-6 rounded-full bg-muted text-muted-foreground grid place-items-center font-bold">3</span>
          <span className="hidden sm:inline">Owner notified</span>
        </li>
      </ol>

      {cart.status === "fulfilled" && (
        <div className="mb-4 p-4 rounded-lg bg-success/10 border border-success/30 flex items-center gap-3">
          <CheckCircle2 className="size-5 text-success" />
          <span className="font-medium">This cart has already been paid for. Thanks!</span>
        </div>
      )}

      <h2 className="text-lg font-bold mb-3">
        Their cart · {items.length} {items.length === 1 ? "item" : "items"}
      </h2>

      <div className="space-y-3 mb-6">
        {items.map((i) => (
          <div key={i.id} className="flex gap-4 bg-card rounded-lg border border-border p-3 shadow-[var(--shadow-card)]">
            <img src={i.product.image_url} alt={i.product.name} className="size-20 rounded-md object-cover" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium line-clamp-2">{i.product.name}</h3>
              <div className="text-sm text-muted-foreground mt-1">
                ₦{Number(i.product.price).toLocaleString()} × {i.quantity}
              </div>
            </div>
            <div className="font-bold text-right">₦{(Number(i.product.price) * i.quantity).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-lg border border-border p-5 mb-4 shadow-[var(--shadow-card)]">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Subtotal</span>
          <span>₦{total.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm mb-3">
          <span className="text-muted-foreground">Shipping</span>
          <span className="text-success">Free</span>
        </div>
        <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
          <span>Total to pay</span>
          <span>₦{total.toLocaleString()}</span>
        </div>
      </div>

      <Button
        disabled={cart.status === "fulfilled" || items.length === 0}
        onClick={() => navigate({ to: "/checkout/$code", params: { code } })}
        className="w-full bg-primary hover:bg-primary-dark"
        size="lg"
      >
        <ShoppingBag className="size-5 mr-2" />
        {cart.status === "fulfilled"
          ? "Already paid for"
          : `Pay ₦${total.toLocaleString()} on their behalf`}
      </Button>

      <p className="text-xs text-muted-foreground text-center mt-3">
        This is a demo checkout — no real payment will be charged.
      </p>
    </div>
  );
}
