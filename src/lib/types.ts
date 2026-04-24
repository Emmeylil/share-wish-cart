export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  rating: number;
};

export type Cart = {
  id: string;
  share_code: string;
  owner_guest_id: string;
  status: "active" | "fulfilled";
  fulfilled_by_guest_id: string | null;
  fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CartItem = {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  product?: Product;
};

export type Wishlist = {
  id: string;
  share_code: string;
  owner_guest_id: string;
  name: string;
  event_date: string | null;
  description: string | null;
  created_at: string;
};

export type Priority = "most_wanted" | "nice_to_have";

export type WishlistItem = {
  id: string;
  wishlist_id: string;
  product_id: string;
  priority: Priority;
  claimed_by_name: string | null;
  claimed_at: string | null;
  product?: Product;
};
