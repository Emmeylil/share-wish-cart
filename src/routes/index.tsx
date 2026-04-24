import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  component: Index,
});

const CATEGORIES = ["All", "Electronics", "Fashion", "Home"] as const;

function Index() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<(typeof CATEGORIES)[number]>("All");
  const [queryText, setQueryText] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, "products"), orderBy("created_at", "asc"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        setProducts(data);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filtered = useMemo(() => {
    return products.filter(
      (p) =>
        (active === "All" || p.category === active) &&
        (!queryText || p.name.toLowerCase().includes(queryText.toLowerCase()))
    );
  }, [products, active, queryText]);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Hero */}
      <section className="rounded-xl bg-gradient-to-br from-primary to-primary-glow p-6 sm:p-10 text-primary-foreground mb-8 shadow-[var(--shadow-hover)]">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-90">
            New on Jumini
          </p>
          <h1 className="text-3xl sm:text-5xl font-extrabold mt-2 leading-tight">
            Share your cart. Wish together.
          </h1>
          <p className="mt-3 text-base sm:text-lg opacity-95">
            Send a cart link so a friend can checkout for you. Build event
            wishlists everyone can claim from — no duplicates, no surprises.
          </p>
        </div>
      </section>

      {/* How Share Cart works */}
      <section className="mb-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">How Share Cart works</h2>
            <p className="text-sm text-muted-foreground">Let someone else pay for your cart in 3 simple steps.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              step: "1",
              title: "Build your cart",
              body: "Add the products you want from the storefront. Quantities are saved automatically.",
              icon: "🛒",
            },
            {
              step: "2",
              title: "Share the link",
              body: "Open your cart and copy the share link. Send it to a parent, partner, or friend on WhatsApp.",
              icon: "🔗",
            },
            {
              step: "3",
              title: "They check out for you",
              body: "They open the link, see your exact cart, and pay. You get a live notification when it's done.",
              icon: "🎁",
            },
          ].map((s) => (
            <div key={s.step} className="relative bg-card border border-border rounded-lg p-5 shadow-[var(--shadow-card)]">
              <div className="absolute -top-3 -left-3 size-8 rounded-full bg-primary text-primary-foreground font-bold grid place-items-center shadow-md">
                {s.step}
              </div>
              <div className="text-3xl mb-2">{s.icon}</div>
              <h3 className="font-bold mb-1">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-5">
        <div className="flex gap-2 overflow-x-auto">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={`px-4 h-9 rounded-full text-sm font-medium border transition-colors whitespace-nowrap ${
                active === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:border-primary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search products..."
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Product grid */}
      <h2 className="text-xl font-bold mb-4">Trending products</h2>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
