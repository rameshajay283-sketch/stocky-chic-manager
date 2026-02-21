import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(274,90%,37%)", "hsl(274,80%,55%)", "hsl(274,60%,70%)", "hsl(38,92%,50%)", "hsl(142,76%,36%)", "hsl(0,84%,60%)"];

const Reports = () => {
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [topMoved, setTopMoved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [prodRes, movRes] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("stock_movements").select("product_id, type, quantity, products(name)").eq("type", "OUT"),
      ]);
      const products = prodRes.data || [];
      const movements = movRes.data || [];

      // Category breakdown
      const catMap: Record<string, { count: number; stock: number }> = {};
      products.forEach((p) => {
        if (!catMap[p.category]) catMap[p.category] = { count: 0, stock: 0 };
        catMap[p.category].count++;
        catMap[p.category].stock += p.quantity;
      });
      setCategoryData(Object.entries(catMap).map(([name, v]) => ({ name, ...v })));

      // Low stock
      setLowStock(products.filter((p) => p.quantity <= 10).sort((a, b) => a.quantity - b.quantity).slice(0, 20));

      // Top moved (OUT)
      const moveMap: Record<string, { name: string; total: number }> = {};
      movements.forEach((m: any) => {
        const name = (m.products as any)?.name || "Unknown";
        if (!moveMap[m.product_id]) moveMap[m.product_id] = { name, total: 0 };
        moveMap[m.product_id].total += m.quantity;
      });
      setTopMoved(Object.values(moveMap).sort((a, b) => b.total - a.total).slice(0, 10));

      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reports & Analytics</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Stock by Category</CardTitle></CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="stock" fill="hsl(274,90%,37%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-sm">No data available</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Category Distribution</CardTitle></CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={categoryData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-sm">No data available</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Low Stock Alert</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">All products are well stocked!</TableCell></TableRow>
                ) : lowStock.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell className={`text-right font-semibold ${p.quantity === 0 ? "text-destructive" : "text-yellow-600"}`}>{p.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Most Moved Items (OUT)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Total Out</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topMoved.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">No movement data</TableCell></TableRow>
                ) : topMoved.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-right">{m.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
