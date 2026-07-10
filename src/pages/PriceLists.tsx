import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Plus, Copy, Share2, Trash2, Edit, Search, X, MessageCircle, Tag, Image, Languages,
} from "lucide-react";
import { priceListsCollection, productsCollection } from "@/firebase";
import {
  addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy,
} from "firebase/firestore";

// ── Types ──────────────────────────────────────────────────────────────────

interface PriceListProduct {
  productId: string;
  name: string;
  tamilName?: string;
  image: string;
  price: number;
  unit: string;
}

interface PriceList {
  id: string;
  name: string;
  tamilName?: string;
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

// ── Language config ────────────────────────────────────────────────────────

type Lang = "english" | "tamil";

const LANG = {
  english: {
    label: "English",
    brand: "HARIMIDHU ORGANIC",
    footer1: "✅ 100% Pure & Organic",
    footer2: "📲 DM us to place your order!",
    unit: (u: string) => u,
    productName: (p: PriceListProduct) => p.name,
    listName: (pl: PriceList) => pl.name,
  },
  tamil: {
    label: "தமிழ்",
    brand: "ஹரிமிட்டு ஆர்கானிக்",
    footer1: "✅ 100% தூய்மையான & இயற்கை",
    footer2: "📲 ஆர்டர் செய்ய தொடர்பு கொள்ளுங்கள்!",
    unit: (u: string) => ({ Litre: "லிட்டர்", Kilogram: "கிலோ", Kg: "கிலோ", Piece: "துண்டு" }[u] ?? u),
    productName: (p: PriceListProduct) => p.tamilName || p.name,
    listName: (pl: PriceList) => pl.tamilName || pl.name,
  },
};

const NUMS = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];

const formatText = (list: PriceList, lang: Lang): string => {
  const L = LANG[lang];
  const lines = [
    `🌿 *${L.brand}*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `📋 *${L.listName(list)}*`,
    ``,
  ];
  list.products.forEach((p, i) => {
    lines.push(`${NUMS[i] ?? `${i + 1}.`} *${L.productName(p)}*`);
    lines.push(`   📦 1 ${L.unit(p.unit)} → ₹${p.price}`);
    lines.push(``);
  });
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(L.footer1);
  lines.push(L.footer2);
  return lines.join("\n");
};

// ── Price Card (for html2canvas) ───────────────────────────────────────────

const PriceCard = ({
  list,
  lang,
  cardRef,
}: {
  list: PriceList;
  lang: Lang;
  cardRef: React.RefObject<HTMLDivElement>;
}) => {
  const L = LANG[lang];
  return (
    <div
      ref={cardRef}
      style={{
        position: "fixed",
        top: "-9999px",
        left: "-9999px",
        width: "600px",
        background: "#fff",
        fontFamily: "sans-serif",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ background: "#3d6b35", padding: "20px 24px", textAlign: "center" }}>
        <p style={{ color: "#a8d5a2", fontSize: "12px", margin: 0, letterSpacing: "2px" }}>🌿 HARIMIDHU ORGANIC 🌿</p>
        <h2 style={{ color: "#fff", fontSize: "22px", margin: "6px 0 0", fontWeight: 700 }}>
          {L.listName(list)}
        </h2>
      </div>

      {/* Products grid */}
      <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {list.products.map((p) => (
          <div key={p.productId} style={{ textAlign: "center", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px 8px" }}>
            <img
              src={p.image}
              alt={p.name}
              crossOrigin="anonymous"
              style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", marginBottom: "8px" }}
              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
            />
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#1f2937", margin: "0 0 4px", lineHeight: 1.3 }}>
              {L.productName(p)}
            </p>
            <p style={{ fontSize: "13px", color: "#3d6b35", fontWeight: 700, margin: 0 }}>
              ₹{p.price} / {L.unit(p.unit)}
            </p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ background: "#f0f7ee", padding: "14px 24px", textAlign: "center", borderTop: "1px solid #d1e8cc" }}>
        <p style={{ fontSize: "12px", color: "#3d6b35", margin: 0, fontWeight: 600 }}>
          ✅ {lang === "tamil" ? "100% தூய்மையான & இயற்கை" : "100% Pure & Organic"}
        </p>
        <p style={{ fontSize: "11px", color: "#6b7280", margin: "4px 0 0" }}>
          {lang === "tamil" ? "ஆர்டர் செய்ய தொடர்பு கொள்ளுங்கள்" : "DM us to place your order!"}
        </p>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────

const PriceLists = () => {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [allProducts, setAllProducts] = useState<FirestoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Lang>("english");
  const [withImageMap, setWithImageMap] = useState<Record<string, boolean>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingList, setEditingList] = useState<PriceList | null>(null);
  const [listName, setListName] = useState("");
  const [listTamilName, setListTamilName] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<PriceListProduct[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // card refs per list
  const cardRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});

  useEffect(() => { loadAll(); }, []);

  const getCardRef = (id: string) => {
    if (!cardRefs.current[id]) cardRefs.current[id] = { current: null } as any;
    return cardRefs.current[id];
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [plSnap, prodSnap] = await Promise.all([
        getDocs(query(priceListsCollection, orderBy("createdAt", "desc"))),
        getDocs(productsCollection),
      ]);
      setPriceLists(plSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PriceList, "id">) })));
      setAllProducts(prodSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FirestoreProduct, "id">) })));
    } catch { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  };

  const generateCardBlob = async (list: PriceList): Promise<Blob | null> => {
    const ref = cardRefs.current[list.id];
    if (!ref?.current) return null;
    try {
      const canvas = await html2canvas(ref.current, { useCORS: true, scale: 2, logging: false });
      return new Promise((res) => canvas.toBlob((b) => res(b), "image/png"));
    } catch { return null; }
  };

  const handleCopy = async (list: PriceList) => {
    const text = formatText(list, lang);
    await navigator.clipboard.writeText(text);
    toast.success("Text copied — paste in WhatsApp or anywhere");
  };

  const handleShare = async (list: PriceList) => {
    const text = formatText(list, lang);
    const withImg = withImageMap[list.id];
    setGeneratingId(list.id);

    try {
      if (withImg) {
        const blob = await generateCardBlob(list);
        if (blob && navigator.share) {
          const file = new File([blob], `${list.name}-price-list.png`, { type: "image/png" });
          const canShareFiles = navigator.canShare?.({ files: [file] });
          if (canShareFiles) {
            await navigator.share({ title: `Harimidhu Organic – ${list.name}`, text, files: [file] });
            return;
          }
        }
        if (blob) {
          // Desktop fallback — download the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${list.name}-price-list.png`;
          a.click();
          URL.revokeObjectURL(url);
          toast.info("Image downloaded — send it along with the copied text");
          await navigator.clipboard.writeText(text);
          return;
        }
      }

      // text-only share
      if (navigator.share) {
        await navigator.share({ title: `Harimidhu Organic – ${list.name}`, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
      }
    } finally {
      setGeneratingId(null);
    }
  };

  const handleWhatsApp = (list: PriceList) => {
    const text = formatText(list, lang);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Dialog helpers
  const openCreate = () => {
    setEditingList(null); setListName(""); setListTamilName("");
    setSelectedProducts([]); setProductSearch(""); setDialogOpen(true);
  };
  const openEdit = (list: PriceList) => {
    setEditingList(list); setListName(list.name); setListTamilName(list.tamilName || "");
    setSelectedProducts([...list.products]); setProductSearch(""); setDialogOpen(true);
  };
  const addProduct = (p: FirestoreProduct) => {
    if (selectedProducts.find((s) => s.productId === p.id)) return;
    setSelectedProducts((prev) => [...prev, { productId: p.id, name: p.name, tamilName: "", image: p.image, price: p.price, unit: p.unit || "Kg" }]);
  };
  const removeProduct = (id: string) => setSelectedProducts((prev) => prev.filter((p) => p.productId !== id));
  const updateField = (id: string, field: keyof PriceListProduct, value: any) =>
    setSelectedProducts((prev) => prev.map((p) => p.productId === id ? { ...p, [field]: value } : p));

  const handleSave = async () => {
    if (!listName.trim()) { toast.error("Enter a list name"); return; }
    if (!selectedProducts.length) { toast.error("Add at least one product"); return; }
    setSaving(true);
    try {
      const data = { name: listName.trim(), tamilName: listTamilName.trim(), products: selectedProducts, createdAt: serverTimestamp() };
      if (editingList) await updateDoc(doc(priceListsCollection, editingList.id), data);
      else await addDoc(priceListsCollection, data);
      toast.success(editingList ? "Updated" : "Created");
      setDialogOpen(false); loadAll();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteDoc(doc(priceListsCollection, deleteId));
    toast.success("Deleted"); setDeleteId(null); loadAll();
  };

  const filteredProducts = allProducts.filter(
    (p) => p.name?.toLowerCase().includes(productSearch.toLowerCase()) && !selectedProducts.find((s) => s.productId === p.id)
  );

  return (
    <DashboardLayout title="Price Lists">
      <div className="flex flex-col gap-6">

        {/* ── Top bar: language + new button ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm">Message Language:</Label>
            <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
              <SelectTrigger className="w-36 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">🇬🇧 English</SelectItem>
                <SelectItem value="tamil">🇮🇳 தமிழ்</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="gap-2 bg-organic-primary hover:bg-organic-dark" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Price List
          </Button>
        </div>

        {/* ── Lists ── */}
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
          priceLists.map((list) => (
            <div key={list.id}>
              {/* Hidden price card for image generation */}
              <PriceCard list={list} lang={lang} cardRef={getCardRef(list.id) as any} />

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">

                    {/* Name + copy */}
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {lang === "tamil" && list.tamilName ? list.tamilName : list.name}
                      </CardTitle>
                      <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs"
                        onClick={() => handleCopy(list)}>
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{list.products.length} products</Badge>

                      {/* With image toggle */}
                      <div className="flex items-center gap-1.5 border rounded-md px-2 py-1">
                        <Image className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">With image</span>
                        <Switch
                          checked={!!withImageMap[list.id]}
                          onCheckedChange={(v) => setWithImageMap((prev) => ({ ...prev, [list.id]: v }))}
                          className="scale-75"
                        />
                      </div>

                      <Button size="sm" variant="outline"
                        className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => handleWhatsApp(list)}>
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </Button>

                      <Button size="sm" variant="outline" className="gap-1"
                        onClick={() => handleShare(list)}
                        disabled={generatingId === list.id}>
                        <Share2 className="h-3.5 w-3.5" />
                        {generatingId === list.id ? "Generating…" : "Share"}
                      </Button>

                      <Button size="sm" variant="outline" onClick={() => openEdit(list)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline"
                        className="text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => setDeleteId(list.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {list.products.map((p) => (
                      <div key={p.productId}
                        className="flex flex-col items-center text-center border rounded-lg p-2 gap-1">
                        <img src={p.image} alt={p.name}
                          className="w-14 h-14 object-cover rounded-md"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                        <p className="text-xs font-medium leading-tight line-clamp-2">
                          {lang === "tamil" && p.tamilName ? p.tamilName : p.name}
                        </p>
                        <p className="text-xs text-organic-primary font-semibold">
                          ₹{p.price}/{LANG[lang].unit(p.unit)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingList ? "Edit Price List" : "New Price List"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* List names */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>List Name (English)</Label>
                <Input placeholder="e.g. Oil Products" value={listName}
                  onChange={(e) => setListName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>List Name (Tamil) <span className="text-muted-foreground text-xs">optional</span></Label>
                <Input placeholder="எ.கா. எண்ணெய் பட்டியல்" value={listTamilName}
                  onChange={(e) => setListTamilName(e.target.value)} />
              </div>
            </div>

            {/* Product search */}
            <div className="space-y-1.5">
              <Label>Add Products</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search product…"
                  value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
              </div>
              {productSearch && (
                <div className="border rounded-md divide-y max-h-44 overflow-y-auto">
                  {filteredProducts.length === 0
                    ? <p className="text-xs text-muted-foreground p-3">No products found</p>
                    : filteredProducts.slice(0, 10).map((p) => (
                      <button key={p.id}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted text-left"
                        onClick={() => { addProduct(p); setProductSearch(""); }}>
                        <img src={p.image} alt={p.name}
                          className="w-8 h-8 object-cover rounded"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">₹{p.price} / {p.unit || "Kg"}</p>
                        </div>
                        <Plus className="h-4 w-4 text-organic-primary shrink-0" />
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Selected products */}
            {selectedProducts.length > 0 && (
              <div className="space-y-1.5">
                <Label>Selected Products</Label>
                <div className="border rounded-md divide-y">
                  {selectedProducts.map((p, idx) => (
                    <div key={p.productId} className="px-3 py-2 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                        <img src={p.image} alt={p.name}
                          className="w-9 h-9 object-cover rounded"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">per {p.unit || "Kg"}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">₹</span>
                          <Input type="number" min="0" className="w-20 h-8 text-sm"
                            value={p.price}
                            onChange={(e) => updateField(p.productId, "price", parseFloat(e.target.value) || 0)} />
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600"
                          onClick={() => removeProduct(p.productId)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {/* Tamil name input */}
                      <div className="flex items-center gap-2 pl-7">
                        <Input placeholder="Tamil name (optional) — தமிழ் பெயர்"
                          className="h-7 text-xs"
                          value={p.tamilName || ""}
                          onChange={(e) => updateField(p.productId, "tamilName", e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WhatsApp preview */}
            {selectedProducts.length > 0 && (
              <div className="space-y-1.5">
                <Label>Preview ({LANG[lang].label})</Label>
                <pre className="text-xs bg-muted rounded-md p-3 whitespace-pre-wrap font-mono leading-relaxed">
                  {formatText({ id: "", name: listName || "List Name", tamilName: listTamilName, products: selectedProducts, createdAt: null }, lang)}
                </pre>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-organic-primary hover:bg-organic-dark" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editingList ? "Update List" : "Create List"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this price list?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default PriceLists;
