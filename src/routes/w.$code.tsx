import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Wishlist, WishlistItem, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, CheckCircle2, Star, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/w/$code")({
  head: () => ({
    meta: [
      { title: "Event Wishlist — Jumini" },
      { property: "og:title", content: "You've been invited to a wishlist!" },
      { property: "og:description", content: "Pick a gift and claim it so no one duplicates." },
    ],
  }),
  component: PublicWishlist,
});

function PublicWishlist() {
  const { code } = Route.useParams();
  const [list, setList] = useState<Wishlist | null>(null);
  const [items, setItems] = useState<(WishlistItem & { product: Product })[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<WishlistItem | null>(null);
  const [name, setName] = useState("");

  const reload = async (wishlistId: string) => {
    const { data } = await supabase
      .from("wishlist_items")
      .select("*, product:products(*)")
      .eq("wishlist_id", wishlistId);
    setItems((data ?? []) as any);
  };

  useEffect(() => {
    (async () => {
      const { data: w } = await supabase
        .from("wishlists").select("*").eq("share_code", code).maybeSingle();
      if (!w) { setLoading(false); return; }
      setList(w as Wishlist);
      await reload((w as Wishlist).id);
      setLoading(false);
    })();
  }, [code]);

  useEffect(() => {
    if (!list) return;
    const channel = supabase
      .channel(`pub-wishlist-${list.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wishlist_items", filter: `wishlist_id=eq.${list.id}` },
        () => reload(list.id)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [list]);

  const submitClaim = async () => {
    if (!claiming || !name.trim()) { toast.error("Please enter your name"); return; }
    const { error } = await supabase
      .from("wishlist_items")
      .update({ claimed_by_name: name.trim(), claimed_at: new Date().toISOString() })
      .eq("id", claiming.id);
    if (error) { toast.error("Failed"); return; }
    toast.success("Thanks for claiming this gift!");
    setClaiming(null); setName("");
  };

  const unclaim = async (it: WishlistItem) => {
    await supabase
      .from("wishlist_items")
      .update({ claimed_by_name: null, claimed_at: null })
      .eq("id", it.id);
  };

  if (loading) return <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Loading…</div>;
  if (!list) return <div className="container mx-auto px-4 py-16 text-center"><h1 className="text-2xl font-bold">Wishlist not found</h1></div>;

  const sorted = [...items].sort((a, b) => (a.priority === "most_wanted" ? -1 : 1));

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 text-sm opacity-90 mb-2">
          <Gift className="size-4" /> You've been invited to a wishlist
        </div>
        <h1 className="text-3xl font-extrabold">{list.name}</h1>
        {list.event_date && (
          <div className="flex items-center gap-2 mt-2 opacity-95">
            <Calendar className="size-4" />
            {new Date(list.event_date).toLocaleDateString(undefined, { dateStyle: "full" })}
          </div>
        )}
        {list.description && <p className="mt-3 opacity-95">{list.description}</p>}
      </div>

      <div className="bg-accent/40 border border-accent rounded-lg p-3 mb-5 text-sm">
        💡 Click <strong>"I'll buy this"</strong> to claim a gift. Others will see it's taken so no one duplicates.
      </div>

      <div className="space-y-3">
        {sorted.map((it) => {
          const claimed = !!it.claimed_at;
          return (
            <div key={it.id} className={`flex gap-4 bg-card rounded-lg border p-3 ${claimed ? "border-success/30 bg-success/5" : "border-border"}`}>
              <img src={it.product.image_url} alt={it.product.name} className="size-20 rounded-md object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium">{it.product.name}</h3>
                  {it.priority === "most_wanted" && (
                    <Badge className="bg-primary text-primary-foreground"><Star className="size-3 mr-1" />Most wanted</Badge>
                  )}
                </div>
                <div className="text-lg font-bold mt-1">${Number(it.product.price).toFixed(2)}</div>
                {claimed && (
                  <div className="flex items-center gap-1 text-sm text-success mt-1">
                    <CheckCircle2 className="size-3" />
                    Claimed by <strong>{it.claimed_by_name}</strong>
                  </div>
                )}
              </div>
              <div className="self-center">
                {claimed ? (
                  <Button variant="outline" size="sm" onClick={() => unclaim(it)}>Unclaim</Button>
                ) : (
                  <Button size="sm" onClick={() => setClaiming(it)} className="bg-primary hover:bg-primary-dark">I'll buy this</Button>
                )}
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">This wishlist has no items yet.</div>
        )}
      </div>

      <Dialog open={!!claiming} onOpenChange={(v) => { if (!v) setClaiming(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Claim this gift</DialogTitle>
            <DialogDescription>{claiming?.product.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Your name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="So the recipient knows it's from you" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaiming(null)}>Cancel</Button>
            <Button onClick={submitClaim} className="bg-primary hover:bg-primary-dark">Confirm claim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
