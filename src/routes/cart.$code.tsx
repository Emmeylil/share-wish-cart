import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
      const { data: c } = await supabase
        .from("carts")
        .select("*")
        .eq("share_code", code)
        .maybeSingle();
      if (!c) {
        setLoading(false);
        return;
      }
      setCart(c as Cart);
      const { data: its } = await supabase
        .from("cart_items")
        .select("*, product:products(*)")
        .eq("cart_id", c.id);
      setItems((its ?? []) as any);
      setLoading(false);
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
      <div className="mb-6 p-4 rounded-lg bg-accent/40 border border-accent">
        <p className="text-sm font-medium">
          🎁 Someone shared this cart with you. You can complete the purchase on their behalf.
        </p>
      </div>

      {cart.status === "fulfilled" && (
        <div className="mb-4 p-4 rounded-lg bg-success/10 border border-success/30 flex items-center gap-3">
          <CheckCircle2 className="size-5 text-success" />
          <span className="font-medium">This cart has already been fulfilled.</span>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-4">Shared cart ({items.length} items)</h1>

      <div className="space-y-3 mb-6">
        {items.map((i) => (
          <div key={i.id} className="flex gap-4 bg-card rounded-lg border border-border p-3">
            <img src={i.product.image_url} alt={i.product.name} className="size-20 rounded-md object-cover" />
            <div className="flex-1">
              <h3 className="font-medium">{i.product.name}</h3>
              <div className="text-sm text-muted-foreground">Qty: {i.quantity}</div>
            </div>
            <div className="font-bold">${(Number(i.product.price) * i.quantity).toFixed(2)}</div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-lg border border-border p-5 mb-4">
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      <Button
        disabled={cart.status === "fulfilled" || items.length === 0}
        onClick={() => navigate({ to: "/checkout/$code", params: { code } })}
        className="w-full bg-primary hover:bg-primary-dark"
        size="lg"
      >
        <ShoppingBag className="size-4 mr-2" />
        {cart.status === "fulfilled" ? "Already fulfilled" : "Checkout for them"}
      </Button>
    </div>
  );
}
