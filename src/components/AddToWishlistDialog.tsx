import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getGuestId, shortCode } from "@/lib/guest";
import type { Product, Wishlist } from "@/lib/types";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function AddToWishlistDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [priority, setPriority] = useState<"most_wanted" | "nice_to_have">(
    "nice_to_have"
  );
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    if (!open) return;
    const guestId = getGuestId();
    supabase
      .from("wishlists")
      .select("*")
      .eq("owner_guest_id", guestId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = (data ?? []) as Wishlist[];
        setWishlists(list);
        if (list.length > 0) {
          setSelectedId(list[0].id);
          setCreating(false);
        } else {
          setCreating(true);
        }
      });
  }, [open]);

  const handleAdd = async () => {
    let wishlistId = selectedId;
    if (creating) {
      if (!newName.trim()) {
        toast.error("Please enter a wishlist name");
        return;
      }
      const { data, error } = await supabase
        .from("wishlists")
        .insert({
          owner_guest_id: getGuestId(),
          name: newName.trim(),
          event_date: newDate || null,
          description: newDesc || null,
          share_code: shortCode(),
        })
        .select()
        .single();
      if (error || !data) {
        toast.error("Failed to create wishlist");
        return;
      }
      wishlistId = data.id;
    }
    if (!wishlistId) {
      toast.error("Select a wishlist");
      return;
    }
    const { error } = await supabase.from("wishlist_items").insert({
      wishlist_id: wishlistId,
      product_id: product.id,
      priority,
    });
    if (error) {
      if (error.code === "23505") {
        toast.info("Already in this wishlist");
      } else {
        toast.error("Could not add to wishlist");
      }
    } else {
      toast.success("Added to wishlist");
      onOpenChange(false);
      setNewName("");
      setNewDate("");
      setNewDesc("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to wishlist</DialogTitle>
          <DialogDescription>{product.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {wishlists.length > 0 && !creating && (
            <div className="space-y-2">
              <Label>Select wishlist</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {wishlists.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCreating(true)}
                className="text-primary"
              >
                <Plus className="size-4 mr-1" /> Create new wishlist
              </Button>
            </div>
          )}

          {creating && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="w-name">Wishlist name</Label>
                <Input
                  id="w-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Sarah's Birthday"
                />
              </div>
              <div>
                <Label htmlFor="w-date">Event date (optional)</Label>
                <Input
                  id="w-date"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="w-desc">Description (optional)</Label>
                <Textarea
                  id="w-desc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                />
              </div>
              {wishlists.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCreating(false)}
                >
                  Use existing
                </Button>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="most_wanted">⭐ Most Wanted</SelectItem>
                <SelectItem value="nice_to_have">💝 Nice to Have</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} className="bg-primary hover:bg-primary-dark">
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
