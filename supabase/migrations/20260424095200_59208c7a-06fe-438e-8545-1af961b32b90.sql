
-- Products catalog (publicly readable, seeded)
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  rating NUMERIC(2,1) NOT NULL DEFAULT 4.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);

-- Carts: owner_guest_id identifies the creator (browser-stored UUID)
CREATE TABLE public.carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_code TEXT NOT NULL UNIQUE,
  owner_guest_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'fulfilled'
  fulfilled_by_guest_id TEXT,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Carts viewable by anyone (shareable)" ON public.carts FOR SELECT USING (true);
CREATE POLICY "Anyone can create carts" ON public.carts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update carts" ON public.carts FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete carts" ON public.carts FOR DELETE USING (true);

CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cart_id, product_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cart items viewable by anyone" ON public.cart_items FOR SELECT USING (true);
CREATE POLICY "Anyone can add cart items" ON public.cart_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update cart items" ON public.cart_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete cart items" ON public.cart_items FOR DELETE USING (true);

-- Wishlists tied to events
CREATE TABLE public.wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_code TEXT NOT NULL UNIQUE,
  owner_guest_id TEXT NOT NULL,
  name TEXT NOT NULL,
  event_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wishlists viewable by anyone" ON public.wishlists FOR SELECT USING (true);
CREATE POLICY "Anyone can create wishlists" ON public.wishlists FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update wishlists" ON public.wishlists FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete wishlists" ON public.wishlists FOR DELETE USING (true);

CREATE TABLE public.wishlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wishlist_id UUID NOT NULL REFERENCES public.wishlists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  priority TEXT NOT NULL DEFAULT 'nice_to_have', -- 'most_wanted' | 'nice_to_have'
  claimed_by_name TEXT,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(wishlist_id, product_id)
);

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wishlist items viewable by anyone" ON public.wishlist_items FOR SELECT USING (true);
CREATE POLICY "Anyone can add wishlist items" ON public.wishlist_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update wishlist items" ON public.wishlist_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete wishlist items" ON public.wishlist_items FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.carts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wishlist_items;
