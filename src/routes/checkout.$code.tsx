import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getGuestId } from "@/lib/guest";
import type { Cart, CartItem, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/checkout/$code")({
  head: () => ({ meta: [{ title: "Checkout — Jumini" }] }),
  component: Checkout,
});

function Checkout() {
  const { code } = Route.useParams();
  const [cart, setCart] = useState<Cart | null>(null);
  const [items, setItems] = useState<(CartItem & { product: Product })[]>([]);
  const [done, setDone] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from("carts").select("*").eq("share_code", code).maybeSingle();
      if (!c) return;
      setCart(c as Cart);
      const { data: its } = await supabase
        .from("cart_items").select("*, product:products(*)").eq("cart_id", c.id);
      setItems((its ?? []) as any);
    })();
  }, [code]);

  const total = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);

  const placeOrder = async () => {
    if (!cart) return;
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 900));
    await supabase
      .from("carts")
      .update({
        status: "fulfilled",
        fulfilled_by_guest_id: getGuestId(),
        fulfilled_at: new Date().toISOString(),
      })
      .eq("id", cart.id);
    setProcessing(false);
    setDone(true);
  };

  if (!cart) {
    return <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Loading…</div>;
  }

  if (done) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md text-center">
        <div className="size-16 rounded-full bg-success/10 grid place-items-center mx-auto mb-4">
          <CheckCircle2 className="size-8 text-success" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Order confirmed!</h1>
        <p className="text-muted-foreground mb-6">
          Thanks — the cart owner has been notified. Order total: <strong>${total.toFixed(2)}</strong>
        </p>
        <Link to="/"><Button className="bg-primary hover:bg-primary-dark">Continue shopping</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <div className="bg-card rounded-lg border border-border p-5 mb-4">
        <h2 className="font-bold mb-3">Mock payment details</h2>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Card number" defaultValue="4242 4242 4242 4242" className="col-span-2 h-10 px-3 rounded-md border border-input bg-background text-sm" />
          <input placeholder="MM / YY" defaultValue="12/28" className="h-10 px-3 rounded-md border border-input bg-background text-sm" />
          <input placeholder="CVC" defaultValue="123" className="h-10 px-3 rounded-md border border-input bg-background text-sm" />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          This is a demo — no real payment will be processed.
        </p>
      </div>

      <div className="bg-card rounded-lg border border-border p-5 mb-6">
        <div className="flex justify-between mb-2 text-sm">
          <span className="text-muted-foreground">Items</span>
          <span>{items.reduce((s, i) => s + i.quantity, 0)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
          <span>Total</span><span>${total.toFixed(2)}</span>
        </div>
      </div>

      <Button onClick={placeOrder} disabled={processing || cart.status === "fulfilled"} className="w-full bg-primary hover:bg-primary-dark" size="lg">
        {processing ? <><Loader2 className="size-4 mr-2 animate-spin" />Processing…</> : `Place order · $${total.toFixed(2)}`}
      </Button>
    </div>
  );
}
