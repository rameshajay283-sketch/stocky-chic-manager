import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

const ImportExport = () => {
  const { isAdmin } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];
        if (data.length === 0) { toast.error("File is empty"); return; }
        setPreview(data.slice(0, 20));
        toast.info(`${data.length} rows found. Preview showing first 20.`);
        (window as any).__importData = data;
      } catch { toast.error("Invalid file format"); }
    };
    reader.readAsBinaryString(file);
  };

  const confirmImport = async () => {
    const data = (window as any).__importData as any[];
    if (!data?.length) return;
    setImporting(true);
    try {
      const rows = data.map((r: any) => ({
        name: String(r.name || r.Name || ""),
        category: String(r.category || r.Category || "Uncategorized"),
        size: String(r.size || r.Size || "M"),
        color: String(r.color || r.Color || ""),
        quantity: Math.max(0, Number(r.quantity || r.Quantity || 0)),
        cost_price: Math.max(0, Number(r.cost_price || r["Cost Price"] || 0)),
        selling_price: Math.max(0, Number(r.selling_price || r["Selling Price"] || 0)),
        supplier: String(r.supplier || r.Supplier || ""),
        barcode: r.barcode || r.Barcode || null,
      })).filter((r) => r.name);

      // Batch insert in chunks of 100
      for (let i = 0; i < rows.length; i += 100) {
        const chunk = rows.slice(i, i + 100);
        const { error } = await supabase.from("products").insert(chunk);
        if (error) throw error;
      }
      toast.success(`${rows.length} products imported successfully!`);
      setPreview([]);
      delete (window as any).__importData;
    } catch (err: any) {
      toast.error("Import failed: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const exportProducts = async () => {
    const { data } = await supabase.from("products").select("*");
    if (!data?.length) { toast.error("No products to export"); return; }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, `products_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Products exported!");
  };

  const exportMovements = async () => {
    const { data } = await supabase.from("stock_movements").select("*, products(name)");
    if (!data?.length) { toast.error("No movements to export"); return; }
    const flat = data.map((m: any) => ({ ...m, product_name: (m.products as any)?.name, products: undefined }));
    const ws = XLSX.utils.json_to_sheet(flat);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Movements");
    XLSX.writeFile(wb, `stock_movements_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Movements exported!");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Import / Export</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Import */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Import Products</CardTitle>
              <CardDescription>Upload CSV or Excel file with product data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
              <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />Choose File
              </Button>
              {preview.length > 0 && (
                <>
                  <div className="max-h-48 overflow-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>{Object.keys(preview[0]).map((k) => <TableHead key={k} className="text-xs">{k}</TableHead>)}</TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.map((row, i) => (
                          <TableRow key={i}>{Object.values(row).map((v, j) => <TableCell key={j} className="text-xs">{String(v)}</TableCell>)}</TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Button className="w-full" onClick={confirmImport} disabled={importing}>
                    {importing ? "Importing..." : "Confirm Import"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" />Export Data</CardTitle>
            <CardDescription>Download inventory data as Excel files</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full" onClick={exportProducts}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />Export All Products
            </Button>
            <Button variant="outline" className="w-full" onClick={exportMovements}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />Export Stock Movements
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ImportExport;
