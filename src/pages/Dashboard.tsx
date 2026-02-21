import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingDown, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface Stats {
  totalProducts: number;
  totalStock: number;
  lowStock: number;
  recentMovements: any[];
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({ totalProducts: 0, totalStock: 0, lowStock: 0, recentMovements: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [prodRes, movRes] = await Promise.all([
        supabase.from("products").select("id, name, quantity"),
        supabase.from("stock_movements").select("id, type, quantity, reason, created_at, products(name)").order("created_at", { ascending: false }).limit(10),
      ]);
      const products = prodRes.data || [];
      setStats({
        totalProducts: products.length,
        totalStock: products.reduce((s, p) => s + (p.quantity || 0), 0),
        lowStock: products.filter((p) => (p.quantity || 0) <= 10).length,
        recentMovements: movRes.data || [],
      });
      setLoading(false);
    };
    fetch();
  }, []);

  const cards = [
    { title: "Total Products", value: stats.totalProducts, icon: Package, color: "text-primary" },
    { title: "Total Stock", value: stats.totalStock, icon: TrendingDown, color: "text-primary" },
    { title: "Low Stock Items", value: stats.lowStock, icon: AlertTriangle, color: "text-destructive" },
    { title: "Recent Movements", value: stats.recentMovements.length, icon: ArrowRightLeft, color: "text-primary" },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{c.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Stock Activity</CardTitle></CardHeader>
        <CardContent>
          {stats.recentMovements.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {stats.recentMovements.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{(m.products as any)?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{m.reason} — {new Date(m.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-sm font-semibold ${m.type === "IN" ? "text-green-600" : "text-destructive"}`}>
                    {m.type === "IN" ? "+" : "-"}{m.quantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
