import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

const categories = ["Shirts", "Pants", "Kids Wear", "Dresses", "Jackets", "Accessories", "Uncategorized"];
const sizes = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];

interface Product {
  id: string;
  name: string;
  category: string;
  size: string;
  color: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  supplier: string;
  barcode: string | null;
  created_at: string;
  updated_at: string;
}

const emptyProduct = { name: "", category: "Uncategorized", size: "M", color: "", quantity: 0, cost_price: 0, selling_price: 0, supplier: "", barcode: "" };

const Products = () => {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterSize, setFilterSize] = useState("all");
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const pageSize = 20;

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === "all" || p.category === filterCat;
      const matchSize = filterSize === "all" || p.size === filterSize;
      return matchSearch && matchCat && matchSize;
    });
  }, [products, search, filterCat, filterSize]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const openAdd = () => { setEditing(null); setForm(emptyProduct); setDialogOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setForm({ name: p.name, category: p.category, size: p.size, color: p.color, quantity: p.quantity, cost_price: p.cost_price, selling_price: p.selling_price, supplier: p.supplier, barcode: p.barcode || "" }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Product name is required"); return; }
    if (editing) {
      const { error } = await supabase.from("products").update({ name: form.name, category: form.category, size: form.size, color: form.color, quantity: form.quantity, cost_price: form.cost_price, selling_price: form.selling_price, supplier: form.supplier, barcode: form.barcode || null }).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Product updated");
    } else {
      const { error } = await supabase.from("products").insert({ name: form.name, category: form.category, size: form.size, color: form.color, quantity: form.quantity, cost_price: form.cost_price, selling_price: form.selling_price, supplier: form.supplier, barcode: form.barcode || null });
      if (error) { toast.error(error.message); return; }
      toast.success("Product added");
    }
    setDialogOpen(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product deleted");
    fetchProducts();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Products</h1>
        {isAdmin && <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Product</Button>}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or ID..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <Select value={filterCat} onValueChange={(v) => { setFilterCat(v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSize} onValueChange={(v) => { setFilterSize(v); setPage(0); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Size" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sizes</SelectItem>
            {sizes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Sell</TableHead>
                <TableHead>Supplier</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow><TableCell colSpan={isAdmin ? 9 : 8} className="text-center text-muted-foreground py-8">No products found</TableCell></TableRow>
              ) : paged.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell>{p.size}</TableCell>
                  <TableCell>{p.color}</TableCell>
                  <TableCell className={`text-right ${p.quantity <= 10 ? "text-destructive font-semibold" : ""}`}>{p.quantity}</TableCell>
                  <TableCell className="text-right">{p.cost_price}</TableCell>
                  <TableCell className="text-right">{p.selling_price}</TableCell>
                  <TableCell>{p.supplier}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{filtered.length} products total</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="flex items-center text-sm px-2">Page {page + 1} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Input placeholder="Product Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.size} onValueChange={(v) => setForm({ ...form, size: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{sizes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              <Input type="number" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Math.max(0, Number(e.target.value)) })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Cost Price" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: Math.max(0, Number(e.target.value)) })} />
              <Input type="number" placeholder="Selling Price" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: Math.max(0, Number(e.target.value)) })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
              <Input placeholder="Barcode (optional)" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Save Changes" : "Add Product"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
