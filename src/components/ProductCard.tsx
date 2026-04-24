import { Star, ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/types";
import { useCartStore } from "@/store/cart";
import { toast } from "sonner";
import { useState } from "react";
import { AddToWishlistDialog } from "@/components/AddToWishlistDialog";

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);
  const [wishOpen, setWishOpen] = useState(false);

  return (
    <div className="group bg-card rounded-lg border border-border overflow-hidden flex flex-col shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-shadow">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <button
          onClick={() => setWishOpen(true)}
          aria-label="Add to wishlist"
          className="absolute top-2 right-2 size-9 rounded-full bg-background/90 backdrop-blur grid place-items-center hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Heart className="size-4" />
        </button>
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <h3 className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="size-3 fill-primary text-primary" />
          <span>{product.rating}</span>
          <span>·</span>
          <span>{product.category}</span>
        </div>
        <div className="text-lg font-bold text-foreground mt-auto">
          ₦{Number(product.price).toLocaleString()}
        </div>
        <Button
          size="sm"
          className="w-full mt-1 bg-primary hover:bg-primary-dark text-primary-foreground"
          onClick={async () => {
            await addItem(product, 1);
            toast.success(`Added ${product.name} to cart`);
          }}
        >
          <ShoppingCart className="size-4 mr-1" /> Add to cart
        </Button>
      </div>
      <AddToWishlistDialog
        product={product}
        open={wishOpen}
        onOpenChange={setWishOpen}
      />
    </div>
  );
}
