import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, Share2, Copy, ShoppingBag, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your Cart — Jumini" }] }),
  component: CartPage,
});

function CartPage() {
  const { cart, items, loadOrCreate, updateQty, removeItem, total } = useCartStore();
  const navigate = useNavigate();
  const [shareUrl, setShareUrl] = useState("");
  const [fulfilledNotice, setFulfilledNotice] = useState(false);

  useEffect(() => {
    loadOrCreate();
  }, [loadOrCreate]);

  useEffect(() => {
    if (cart) setShareUrl(`${window.location.origin}/cart/${cart.share_code}`);
  }, [cart]);

  // Realtime: notify owner when their cart gets fulfilled
  useEffect(() => {
    if (!cart) return;
    
    const unsubscribe = onSnapshot(doc(db, "carts", cart.id), (docSnap) => {
      const updated = docSnap.data() as { status: string };
      if (updated?.status === "fulfilled") {
        setFulfilledNotice(true);
        toast.success("🎉 Your cart was fulfilled by a friend!");
      }
    });

    return () => unsubscribe();
  }, [cart]);

  const copyLink = () => {
    if (!shareUrl) return;
    
    const fallbackCopy = (text: string) => {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (successful) {
          toast.success("Link copied to clipboard");
        } else {
          toast.error("Failed to copy link");
        }
      } catch (err) {
        toast.error("Failed to copy link");
      }
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => toast.success("Link copied to clipboard"))
        .catch(() => fallbackCopy(shareUrl));
    } else {
      fallbackCopy(shareUrl);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBag className="mx-auto size-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-6">
          Browse products and add your favorites.
        </p>
        <Link to="/">
          <Button className="bg-primary hover:bg-primary-dark">Start shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Your cart ({items.length})</h1>

      {fulfilledNotice && (
        <div className="mb-4 p-4 rounded-lg bg-success/10 border border-success/30 flex items-center gap-3">
          <CheckCircle2 className="size-5 text-success" />
          <span className="font-medium">A friend completed your cart purchase!</span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 bg-card rounded-lg border border-border p-3 shadow-[var(--shadow-card)]"
            >
              <img
                src={item.product.image_url}
                alt={item.product.name}
                className="size-20 sm:size-24 rounded-md object-cover"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium line-clamp-2">{item.product.name}</h3>
                <div className="text-sm text-muted-foreground">
                  {item.product.category}
                </div>
                <div className="text-lg font-bold mt-1">
                  ₦{Number(item.product.price).toLocaleString()}
                </div>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remove"
                >
                  <Trash2 className="size-4" />
                </button>
                <div className="flex items-center gap-1 border border-border rounded-md">
                  <button
                    onClick={() => updateQty(item.id, item.quantity - 1)}
                    className="size-8 grid place-items-center hover:bg-secondary"
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQty(item.id, item.quantity + 1)}
                    className="size-8 grid place-items-center hover:bg-secondary"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card rounded-lg border border-border p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-bold mb-3">Order summary</h2>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₦{total().toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-muted-foreground">Shipping</span>
              <span className="text-success">Free</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>₦{total().toLocaleString()}</span>
            </div>
            <Button
              onClick={() => cart && navigate({ to: "/checkout/$code", params: { code: cart.share_code } })}
              className="w-full mt-4 bg-primary hover:bg-primary-dark"
              size="lg"
            >
              Checkout
            </Button>
          </div>

          <div className="bg-accent/40 rounded-lg border border-accent p-5">
            <div className="flex items-center gap-2 mb-2">
              <Share2 className="size-4 text-primary" />
              <h2 className="font-bold">Let someone pay for this</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Share this link with a friend or family member. They'll see your cart and can check out for you.
            </p>
            <div className="flex gap-2 mb-2">
              <input
                value={shareUrl}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-xs"
              />
              <Button onClick={copyLink} variant="outline" size="icon" aria-label="Copy link">
                <Copy className="size-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={copyLink} className="bg-primary hover:bg-primary-dark" size="sm">
                <Copy className="size-3 mr-1" /> Copy link
              </Button>
              {cart && (
                <Link to="/cart/$code" params={{ code: cart.share_code }} target="_blank">
                  <Button variant="outline" size="sm" className="w-full">
                    <Share2 className="size-3 mr-1" /> Preview
                  </Button>
                </Link>
              )}
            </div>
            <ol className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex gap-2"><span className="font-bold text-primary">1.</span> Send the link via WhatsApp, email or DM</li>
              <li className="flex gap-2"><span className="font-bold text-primary">2.</span> They open it and review your items</li>
              <li className="flex gap-2"><span className="font-bold text-primary">3.</span> They check out — you get notified live</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
