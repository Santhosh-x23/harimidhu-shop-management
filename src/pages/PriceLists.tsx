import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus,
  Copy,
  Share2,
  Trash2,
  Edit,
  Search,
  X,
  MessageCircle,
  Tag,
} from "lucide-react";
import {
  priceListsCollection,
  productsCollection,
} from "@/firebase";
import {
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

interface PriceListProduct {
  productId: string;
  name: string;
  image: string;
  price: number;
  unit: string;
}

interface PriceList {
  id: string;
  name: string;
  products: PriceListProduct[];
  createdAt: any;
}

interface FirestoreProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  unit: string;
  category: string;
}

const formatForWhatsApp = (list: PriceList): string => {
  const numbers = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
  const lines: string[] = [
    `🌿 *HARIMIDHU ORGANIC*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `📋 *${list.name}*`,
    ``,
  ];

  list.products.forEach((p, i) => {
    const num = numbers[i] ?? `${i + 1}.`;
    lines.push(`${num} *${p.name}*`);
    lines.push(`   📦 1 ${p.unit} → ₹${p.price}`);
    lines.push(``);
  });

  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`✅ 100% Pure & Organic`);
  lines.push(`📲 DM us to place your order!`);

  return lines.join("\n");
};

const PriceLists = () => {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [allProducts, setAllProducts] = useState<FirestoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingList, setEditingList] = useState<PriceList | null>(null);

  // dialog state
  const [listName, setListName] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<PriceListProduct[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [plSnap, prodSnap] = await Promise.all([
        getDocs(query(priceListsCollection, orderBy("createdAt", "desc"))),
        getDocs(productsCollection),
      ]);

      setPriceLists(
        plSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PriceList, "id">) }))
      );
      setAllProducts(
        prodSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FirestoreProduct, "id">) }))
      );
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingList(null);
    setListName("");
    setSelectedProducts([]);
    setProductSearch("");
    setDialogOpen(true);
  };

  const openEdit = (list: PriceList) => {
    setEditingList(list);
    setListName(list.name);
    setSelectedProducts([...list.products]);
    setProductSearch("");
    setDialogOpen(true);
  };

  const addProduct = (p: FirestoreProduct) => {
    if (selectedProducts.find((s) => s.productId === p.id)) return;
    setSelectedProducts((prev) => [
      ...prev,
      { productId: p.id, name: p.name, image: p.image, price: p.price, unit: p.unit || "Kg" },
    ]);
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.productId !== productId));
  };

  const updatePrice = (productId: string, price: number) => {
    setSelectedProducts((prev) =>
      prev.map((p) => (p.productId === productId ? { ...p, price } : p))
    );
  };

  const handleSave = async () => {
    if (!listName.trim()) { toast.error("Enter a list name"); return; }
    if (selectedProducts.length === 0) { toast.error("Add at least one product"); return; }

    setSaving(true);
    try {
      const data = {
        name: listName.trim(),
        products: selectedProducts,
        createdAt: serverTimestamp(),
      };

      if (editingList) {
        await updateDoc(doc(priceListsCollection, editingList.id), data);
        toast.success("Price list updated");
      } else {
        await addDoc(priceListsCollection, data);
        toast.success("Price list created");
      }

      setDialogOpen(false);
      loadAll();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(priceListsCollection, deleteId));
      toast.success("Deleted");
      setDeleteId(null);
      loadAll();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleCopy = async (list: PriceList) => {
    const text = formatForWhatsApp(list);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied! Paste in WhatsApp or any app");
    } catch {
      toast.error("Copy failed — try the WhatsApp button");
    }
  };

  const handleShareImages = async (list: PriceList) => {
    const text = formatForWhatsApp(list);

    if (navigator.share) {
      try {
        const files: File[] = [];
        await Promise.all(
          list.products.map(async (p) => {
            if (!p.image) return;
            try {
              const res = await fetch(p.image);
              const blob = await res.blob();
              files.push(new File([blob], `${p.name}.jpg`, { type: blob.type }));
            } catch { /* skip broken image */ }
          })
        );

        const shareData: ShareData = { title: `Harimidhu Organic – ${list.name}`, text };
        if (files.length > 0 && navigator.canShare?.({ files })) {
          (shareData as any).files = files;
        }
        await navigator.share(shareData);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          await navigator.clipboard.writeText(text);
          toast.success("Copied to clipboard");
        }
      }
    } else {
      // Desktop: open WhatsApp web
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank");
    }
  };

  const handleWhatsApp = (list: PriceList) => {
    const text = formatForWhatsApp(list);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const filteredProducts = allProducts.filter(
    (p) =>
      p.name?.toLowerCase().includes(productSearch.toLowerCase()) &&
      !selectedProducts.find((s) => s.productId === p.id)
  );

  return (
    <DashboardLayout title="Price Lists">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">
              Create shareable product price lists for WhatsApp &amp; social media
            </p>
          </div>
          <Button
            className="gap-2 bg-organic-primary hover:bg-organic-dark"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4" />
            New Price List
          </Button>
        </div>

        {/* Lists */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary" />
          </div>
        ) : priceLists.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-48 text-center">
              <Tag className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No price lists yet</p>
              <Button className="mt-4 bg-organic-primary hover:bg-organic-dark" onClick={openCreate}>
                Create your first list
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {priceLists.map((list) => (
              <Card key={list.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    {/* Name + copy button together */}
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{list.name}</CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 gap-1 text-xs"
                        onClick={() => handleCopy(list)}
                        title="Copy formatted text"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </Button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{list.products.length} products</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => handleWhatsApp(list)}
                        title="Open in WhatsApp"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => handleShareImages(list)}
                        title="Share with images"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(list)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => setDeleteId(list.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {list.products.map((p) => (
                      <div
                        key={p.productId}
                        className="flex flex-col items-center text-center border rounded-lg p-2 gap-1"
                      >
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-14 h-14 object-cover rounded-md"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                        />
                        <p className="text-xs font-medium leading-tight line-clamp-2">{p.name}</p>
                        <p className="text-xs text-organic-primary font-semibold">₹{p.price}/{p.unit}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingList ? "Edit Price List" : "New Price List"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* List name */}
            <div className="space-y-1.5">
              <Label>List Name</Label>
              <Input
                placeholder="e.g. Oil Products, Weekly Special, Millet Offer"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
              />
            </div>

            {/* Product search */}
            <div className="space-y-1.5">
              <Label>Add Products</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search product name…"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>

              {productSearch && (
                <div className="border rounded-md divide-y max-h-44 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3">No products found</p>
                  ) : (
                    filteredProducts.slice(0, 10).map((p) => (
                      <button
                        key={p.id}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted text-left"
                        onClick={() => { addProduct(p); setProductSearch(""); }}
                      >
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-8 h-8 object-cover rounded"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">₹{p.price} / {p.unit || "Kg"}</p>
                        </div>
                        <Plus className="h-4 w-4 text-organic-primary shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Selected products with price edit */}
            {selectedProducts.length > 0 && (
              <div className="space-y-1.5">
                <Label>Selected Products — set price per unit</Label>
                <div className="border rounded-md divide-y">
                  {selectedProducts.map((p) => (
                    <div key={p.productId} className="flex items-center gap-3 px-3 py-2">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-9 h-9 object-cover rounded"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">per {p.unit || "Kg"}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          min="0"
                          className="w-24 h-8 text-sm"
                          value={p.price}
                          onChange={(e) => updatePrice(p.productId, parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400 hover:text-red-600"
                        onClick={() => removeProduct(p.productId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            {selectedProducts.length > 0 && (
              <div className="space-y-1.5">
                <Label>WhatsApp Preview</Label>
                <pre className="text-xs bg-muted rounded-md p-3 whitespace-pre-wrap font-mono leading-relaxed">
                  {formatForWhatsApp({ id: "", name: listName || "List Name", products: selectedProducts, createdAt: null })}
                </pre>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-organic-primary hover:bg-organic-dark"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : editingList ? "Update List" : "Create List"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Price List?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default PriceLists;
