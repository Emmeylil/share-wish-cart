import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getGuestId, shortCode } from "@/lib/guest";
import type { Wishlist } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Gift, Plus, Calendar, ArrowRight } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/wishlists")({
  head: () => ({ meta: [{ title: "Your Wishlists — Jumini" }] }),
  component: WishlistsPage,
});

function WishlistsPage() {
  const [lists, setLists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [desc, setDesc] = useState("");

  const load = async () => {
    const guestId = getGuestId();
    const { data } = await supabase
      .from("wishlists")
      .select("*")
      .eq("owner_guest_id", guestId)
      .order("created_at", { ascending: false });
    setLists((data ?? []) as Wishlist[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    const { error } = await supabase.from("wishlists").insert({
      owner_guest_id: getGuestId(),
      name: name.trim(),
      event_date: date || null,
      description: desc || null,
      share_code: shortCode(),
    });
    if (error) { toast.error("Failed to create"); return; }
    toast.success("Wishlist created");
    setOpen(false); setName(""); setDate(""); setDesc("");
    load();
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Your wishlists</h1>
          <p className="text-muted-foreground text-sm">For birthdays, weddings, and every occasion.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary-dark"><Plus className="size-4 mr-1" />New wishlist</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create event wishlist</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My 30th Birthday" /></div>
              <div><Label>Event date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Tell friends about your event..." /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={create} className="bg-primary hover:bg-primary-dark">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Loading…</div>
      ) : lists.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-lg border border-border">
          <Gift className="size-16 mx-auto text-muted-foreground mb-3" />
          <h2 className="font-bold text-lg mb-1">No wishlists yet</h2>
          <p className="text-muted-foreground text-sm mb-4">Create one to start collecting gift ideas.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {lists.map((w) => (
            <Link key={w.id} to="/wishlists/$id" params={{ id: w.id }}
              className="block bg-card rounded-lg border border-border p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-shadow group"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{w.name}</h3>
                <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              {w.event_date && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                  <Calendar className="size-3" />
                  {new Date(w.event_date).toLocaleDateString(undefined, { dateStyle: "long" })}
                </div>
              )}
              {w.description && <p className="text-sm text-muted-foreground line-clamp-2">{w.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
