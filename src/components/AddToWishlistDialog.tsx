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
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, orderBy, limit } from "firebase/firestore";
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
    const fetchWishlists = async () => {
      try {
        const guestId = getGuestId();
        const q = query(
          collection(db, "wishlists"),
          where("owner_guest_id", "==", guestId),
          orderBy("created_at", "desc")
        );
        const querySnapshot = await getDocs(q);
        const list = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Wishlist[];
        setWishlists(list);
        if (list.length > 0) {
          setSelectedId(list[0].id);
          setCreating(false);
        } else {
          setCreating(true);
        }
      } catch (error) {
        console.error("Error fetching wishlists:", error);
      }
    };
    fetchWishlists();
  }, [open]);

  const handleAdd = async () => {
    let wishlistId = selectedId;
    try {
      if (creating) {
        if (!newName.trim()) {
          toast.error("Please enter a wishlist name");
          return;
        }
        const newWishlist = {
          owner_guest_id: getGuestId(),
          name: newName.trim(),
          event_date: newDate || null,
          description: newDesc || null,
          share_code: shortCode(),
          created_at: new Date().toISOString(),
        };
        const docRef = await addDoc(collection(db, "wishlists"), newWishlist);
        wishlistId = docRef.id;
      }
      if (!wishlistId) {
        toast.error("Select a wishlist");
        return;
      }
      
      // Check for duplicate (optional in Firestore as it doesn't have unique constraints like Postgres)
      // but we can do a quick check if needed.
      
      await addDoc(collection(db, "wishlist_items"), {
        wishlist_id: wishlistId,
        product_id: product.id,
        priority,
        created_at: new Date().toISOString(),
      });
      
      toast.success("Added to wishlist");
      onOpenChange(false);
      setNewName("");
      setNewDate("");
      setNewDesc("");
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      toast.error("Could not add to wishlist");
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
