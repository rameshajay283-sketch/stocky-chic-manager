import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, ArrowRightLeft, BarChart3, FileSpreadsheet, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Package, title: "Stock Tracking", desc: "Real-time inventory counts with low stock alerts" },
  { icon: FileSpreadsheet, title: "Import / Export", desc: "Bulk CSV & Excel operations for 1000+ records" },
  { icon: ArrowRightLeft, title: "Stock Movement", desc: "Track every IN/OUT with full audit trail" },
  { icon: BarChart3, title: "Reports & Analytics", desc: "Comprehensive insights into your inventory" },
  { icon: Shield, title: "Role-Based Access", desc: "Admin & staff roles with secure permissions" },
  { icon: Zap, title: "Lightning Fast", desc: "Optimized for speed with large datasets" },
];

const Landing = () => (
  <div className="min-h-screen bg-background">
    {/* Header */}
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">GarmentPro</span>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" asChild><Link to="/auth">Login</Link></Button>
          <Button asChild><Link to="/auth?tab=register">Get Started</Link></Button>
        </div>
      </div>
    </header>

    {/* Hero */}
    <section className="container mx-auto px-6 py-24 text-center">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6">
          Garments Inventory<br />
          <span className="text-primary">Management System</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          Professional stock control for garment businesses. Track products, manage stock movements, import/export data, and generate reports — all in one place.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" asChild><Link to="/auth?tab=register">Start Free →</Link></Button>
          <Button size="lg" variant="outline" asChild><Link to="/auth">Login</Link></Button>
        </div>
      </motion.div>
    </section>

    {/* Features */}
    <section className="container mx-auto px-6 pb-24">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow"
          >
            <div className="h-12 w-12 rounded-lg bg-accent flex items-center justify-center mb-4">
              <f.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
            <p className="text-muted-foreground text-sm">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>

    {/* Footer */}
    <footer className="border-t bg-card py-8">
      <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
        <p>© 2026 GarmentPro — Inventory Management System v1.0</p>
        <p>Built with care for garment businesses worldwide</p>
      </div>
    </footer>
  </div>
);

export default Landing;
