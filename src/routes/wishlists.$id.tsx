import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import type { Wishlist, WishlistItem, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Calendar, Share2, Copy, Trash2, CheckCircle2, Star, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/wishlists/$id")({
  head: () => ({ meta: [{ title: "Wishlist — Jumini" }] }),
  component: WishlistDetail,
});

function WishlistDetail() {
  const { id } = Route.useParams();
  const [list, setList] = useState<Wishlist | null>(null);
  const [items, setItems] = useState<(WishlistItem & { product: Product })[]>([]);
  const [shareUrl, setShareUrl] = useState("");

  const loadItems = async () => {
    try {
      const q = query(collection(db, "wishlist_items"), where("wishlist_id", "==", id));
      const querySnapshot = await getDocs(q);
      const itemsWithProducts = await Promise.all(
        querySnapshot.docs.map(async (itemDoc) => {
          const itemData = itemDoc.data() as WishlistItem;
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
      console.error("Error loading wishlist items:", error);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const docRef = doc(db, "wishlists", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Wishlist;
          setList(data);
          setShareUrl(`${window.location.origin}/w/${data.share_code}`);
        }
        loadItems();
      } catch (error) {
        console.error("Error fetching wishlist:", error);
      }
    })();

    const q = query(collection(db, "wishlist_items"), where("wishlist_id", "==", id));
    const unsubscribe = onSnapshot(q, () => {
      loadItems();
    });

    return () => unsubscribe();
  }, [id]);

  const removeItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, "wishlist_items", itemId));
      loadItems();
    } catch (error) {
      console.error("Error removing wishlist item:", error);
    }
  };

  const copyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      toast.success("Wishlist link copied");
    } catch (err) {
      console.error("Failed to copy: ", err);
      toast.error("Failed to copy link");
    }
  };

  if (!list) return <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Loading…</div>;

  const sorted = [...items].sort((a, b) => (a.priority === "most_wanted" ? -1 : 1));
  const claimedCount = items.filter((i) => i.claimed_at).length;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <Link to="/wishlists" className="text-sm text-muted-foreground hover:text-primary">← All wishlists</Link>

      <div className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground rounded-xl p-6 mt-3 mb-6">
        <h1 className="text-3xl font-extrabold">{list.name}</h1>
        {list.event_date && (
          <div className="flex items-center gap-2 mt-2 opacity-95">
            <Calendar className="size-4" />
            {new Date(list.event_date).toLocaleDateString(undefined, { dateStyle: "full" })}
          </div>
        )}
        {list.description && <p className="mt-3 opacity-95">{list.description}</p>}
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="bg-primary-foreground/20 px-3 py-1 rounded-full">{items.length} items</span>
          <span className="bg-primary-foreground/20 px-3 py-1 rounded-full">{claimedCount} claimed</span>
        </div>
      </div>

      <div className="bg-accent/40 rounded-lg border border-accent p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Share2 className="size-4 text-primary" />
          <h2 className="font-bold">Share with friends & family</h2>
        </div>
        <div className="flex gap-2">
          <input value={shareUrl} readOnly className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-xs" />
          <Button onClick={copyLink} variant="outline" size="icon"><Copy className="size-4" /></Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <Heart className="size-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-3">No items yet. Browse products to add them.</p>
          <Link to="/"><Button className="bg-primary hover:bg-primary-dark">Shop products</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((it) => (
            <div key={it.id} className="flex gap-4 bg-card rounded-lg border border-border p-3">
              <img src={it.product.image_url} alt={it.product.name} className="size-20 rounded-md object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium">{it.product.name}</h3>
                  {it.priority === "most_wanted" && (
                    <Badge className="bg-primary text-primary-foreground"><Star className="size-3 mr-1" />Most wanted</Badge>
                  )}
                </div>
                <div className="text-lg font-bold mt-1">₦{Number(it.product.price).toLocaleString()}</div>
                {it.claimed_at && (
                  <div className="flex items-center gap-1 text-sm text-success mt-1">
                    <CheckCircle2 className="size-3" />
                    Claimed by <strong>{it.claimed_by_name}</strong>
                  </div>
                )}
              </div>
              <button onClick={() => removeItem(it.id)} className="text-muted-foreground hover:text-destructive self-start" aria-label="Remove">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
