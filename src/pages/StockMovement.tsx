import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus } from "lucide-react";
import { toast } from "sonner";

const StockMovement = () => {
  const { user } = useAuth();
  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [moveType, setMoveType] = useState<"IN" | "OUT">("IN");
  const [form, setForm] = useState({ product_id: "", quantity: 1, reason: "", notes: "" });

  const fetchData = async () => {
    const [movRes, prodRes] = await Promise.all([
      supabase.from("stock_movements").select("*, products(name)").order("created_at", { ascending: false }).limit(100),
      supabase.from("products").select("id, name, quantity"),
    ]);
    setMovements(movRes.data || []);
    setProducts(prodRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openDialog = (type: "IN" | "OUT") => {
    setMoveType(type);
    setForm({ product_id: "", quantity: 1, reason: "", notes: "" });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.product_id) { toast.error("Select a product"); return; }
    if (form.quantity <= 0) { toast.error("Quantity must be positive"); return; }
    if (!form.reason) { toast.error("Select a reason"); return; }

    const product = products.find((p) => p.id === form.product_id);
    if (!product) return;

    if (moveType === "OUT" && product.quantity < form.quantity) {
      toast.error("Not enough stock! Available: " + product.quantity);
      return;
    }

    const newQty = moveType === "IN" ? product.quantity + form.quantity : product.quantity - form.quantity;

    const { error: moveErr } = await supabase.from("stock_movements").insert({
      product_id: form.product_id,
      type: moveType,
      quantity: form.quantity,
      reason: form.reason,
      notes: form.notes,
      created_by: user?.id,
    });
    if (moveErr) { toast.error(moveErr.message); return; }

    const { error: updateErr } = await supabase.from("products").update({ quantity: newQty }).eq("id", form.product_id);
    if (updateErr) { toast.error(updateErr.message); return; }

    toast.success(`Stock ${moveType === "IN" ? "added" : "removed"} successfully`);
    setDialogOpen(false);
    fetchData();
  };

  const inReasons = ["Purchase", "Return", "Adjustment"];
  const outReasons = ["Sale", "Damage", "Transfer"];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Stock Movement</h1>
        <div className="flex gap-3">
          <Button onClick={() => openDialog("IN")} className="bg-green-600 hover:bg-green-700"><Plus className="h-4 w-4 mr-2" />Stock In</Button>
          <Button onClick={() => openDialog("OUT")} variant="destructive"><Minus className="h-4 w-4 mr-2" />Stock Out</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Movement History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No movements recorded</TableCell></TableRow>
              ) : movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{(m.products as any)?.name || "—"}</TableCell>
                  <TableCell><span className={`px-2 py-1 rounded text-xs font-semibold ${m.type === "IN" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>{m.type}</span></TableCell>
                  <TableCell className="text-right">{m.quantity}</TableCell>
                  <TableCell>{m.reason}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{m.notes}</TableCell>
                  <TableCell>{new Date(m.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Stock {moveType === "IN" ? "In" : "Out"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} (Qty: {p.quantity})</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Math.max(1, Number(e.target.value)) })} min={1} />
            <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v })}>
              <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
              <SelectContent>
                {(moveType === "IN" ? inReasons : outReasons).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className={moveType === "IN" ? "bg-green-600 hover:bg-green-700" : ""}>
              {moveType === "IN" ? "Add Stock" : "Remove Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockMovement;
