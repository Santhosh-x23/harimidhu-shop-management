import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Copy, Share2, Trash2, Edit, Search, X, MessageCircle, Tag, Languages, Loader2 } from "lucide-react";
import { priceListsCollection, productsCollection, companySettingsCollection } from "@/firebase";
import {
  addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy,
} from "firebase/firestore";

// ── Types ───────────────────────────────────────────────────────────────────

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

type Lang = "english" | "tamil";

// ── Local dictionary for Tamil food/product names the API misses ─────────────

const TAMIL_DICT: Record<string, string> = {
  // Rice varieties
  "ponni raw rice": "பொன்னி பச்சை அரிசி",
  "ponni rice": "பொன்னி அரிசி",
  "raw rice": "பச்சை அரிசி",
  "boiled rice": "வேகவைத்த அரிசி",
  "idli rice": "இட்லி அரிசி",
  "sona masoori rice": "சோனா மசூரி அரிசி",
  "basmati rice": "பாஸ்மதி அரிசி",
  "red rice": "சிவப்பு அரிசி",
  "brown rice": "பழுப்பு அரிசி",

  // Flours & rava
  "idli rava": "இட்லி ரவை",
  "wheat rava": "கோதுமை ரவை",
  "rava": "ரவை",
  "wheat flour": "கோதுமை மாவு",
  "rice flour": "அரிசி மாவு",
  "corn flour": "சோள மாவு",
  "maida": "மைதா",
  "ragi flour": "கேழ்வரகு மாவு",
  "besan": "கடலை மாவு",
  "chickpea flour": "கடலை மாவு",

  // Oils
  "groundnut oil": "கடலை எண்ணெய்",
  "coconut oil": "தேங்காய் எண்ணெய்",
  "sesame oil": "நல்லெண்ணெய்",
  "gingelly oil": "நல்லெண்ணெய்",
  "neem oil": "வேப்ப எண்ணெய்",
  "castor oil": "ஆமணக்கு எண்ணெய்",
  "mustard oil": "கடுகு எண்ணெய்",
  "sunflower oil": "சூரியகாந்தி எண்ணெய்",
  "cold pressed oil": "கோல்டு ப்ரஸ்ட் எண்ணெய்",
  "butter tree oil": "இல்லுப்பை எண்ணெய்",
  "wood pressed oil": "மர செக்கு எண்ணெய்",

  // Dals & pulses
  "toor dal": "துவரம் பருப்பு",
  "urad dal": "உளுந்து பருப்பு",
  "urad dal whole": "உளுந்து முழு",
  "urad dal whole (white)": "உளுந்து தால் முழு (வெள்ளை)",
  "moong dal": "பச்சை பருப்பு",
  "chana dal": "கடலை பருப்பு",
  "masoor dal": "மசூர் பருப்பு",
  "rajma": "ராஜ்மா",
  "black gram": "உளுந்து",
  "green gram": "பச்சை பயறு",
  "horse gram": "கொள்ளு",

  // Spices
  "turmeric": "மஞ்சள்",
  "turmeric powder": "மஞ்சள் தூள்",
  "red chilli": "சிவப்பு மிளகாய்",
  "red chilli powder": "மிளகாய் தூள்",
  "coriander powder": "தனியா தூள்",
  "cumin": "சீரகம்",
  "mustard": "கடுகு",
  "pepper": "மிளகு",
  "black pepper": "கருப்பு மிளகு",
  "cardamom": "ஏலக்காய்",
  "cloves": "கிராம்பு",
  "cinnamon": "பட்டை",
  "fenugreek": "வெந்தயம்",

  // Sugars & jaggery
  "jaggery": "வெல்லம்",
  "palm jaggery": "பனை வெல்லம்",
  "coconut sugar": "தேங்காய் சர்க்கரை",
  "sugar": "சர்க்கரை",
  "brown sugar": "பழுப்பு சர்க்கரை",

  // Others
  "honey": "தேன்",
  "coconut": "தேங்காய்",
  "dried coconut": "உலர்ந்த தேங்காய்",
  "tamarind": "புளி",
  "salt": "உப்பு",
  "rock salt": "கல் உப்பு",
  "black salt": "கருப்பு உப்பு",
};

// ── Translation (dictionary first, then MyMemory API) ────────────────────────

const applyDict = (text: string): string | null => {
  const key = text.toLowerCase().trim();
  if (TAMIL_DICT[key]) return TAMIL_DICT[key];
  // partial match — if any dictionary key is contained in the text
  for (const [k, v] of Object.entries(TAMIL_DICT)) {
    if (key === k) return v;
  }
  return null;
};

// Check if a string is mostly Tamil (Unicode range 0x0B80–0x0BFF)
const isTamil = (s: string) => {
  const tamilChars = (s.match(/[஀-௿]/g) || []).length;
  return tamilChars / s.length > 0.3;
};

const translateToTamil = async (texts: string[]): Promise<Record<string, string>> => {
  const results: Record<string, string> = {};
  await Promise.all(
    texts.map(async (text) => {
      // Dictionary takes priority
      const dictResult = applyDict(text);
      if (dictResult) { results[text] = dictResult; return; }

      try {
        const res = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ta`
        );
        const data = await res.json();
        const t = data.responseData?.translatedText;
        // Accept only if it contains actual Tamil characters and isn't an error
        results[text] =
          t && isTamil(t) && !t.startsWith("MYMEMORY") ? t : text;
      } catch {
        results[text] = text;
      }
    })
  );
  return results;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const NUMS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

const unitTamil = (u: string) =>
  ({ Litre: "லிட்டர்", Kilogram: "கிலோ", Kg: "கிலோ", Gram: "கிராம்", Piece: "துண்டு" }[u] ?? u);

const formatText = (
  list: PriceList,
  lang: Lang,
  tr: Record<string, string>,
  companyName: string
): string => {
  const brand = lang === "tamil" ? (tr[companyName] || "ஹரிமிட்டு ஆர்கானிக்") : companyName;
  const title = lang === "tamil" ? (tr[list.name] || list.name) : list.name;
  const f1 = lang === "tamil" ? "✅ 100% தூய்மையான & இயற்கை" : "✅ 100% Pure & Organic";
  const f2 = lang === "tamil" ? "📲 ஆர்டர் செய்ய தொடர்பு கொள்ளுங்கள்!" : "📲 DM us to place your order!";

  const lines = [`🌿 *${brand}*`, `━━━━━━━━━━━━━━━━━━━━`, ``, `📋 *${title}*`, ``];

  list.products.forEach((p, i) => {
    const pName = lang === "tamil" ? (tr[p.name] || p.name) : p.name;
    const pUnit = lang === "tamil" ? unitTamil(p.unit) : p.unit;
    // Single line per product — no indented second line so font stays consistent
    lines.push(`${NUMS[i] ?? `${i + 1}.`} *${pName}* — 1 ${pUnit} — ₹${p.price}`);
  });

  lines.push(``);
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(f1);
  lines.push(f2);
  return lines.join("\n");
};

// ── Hidden price card (captured by html2canvas) ──────────────────────────────

interface PriceCardProps {
  list: PriceList;
  lang: Lang;
  tr: Record<string, string>;
  companyName: string;
  companyLogo: string;
  cardRef: React.RefObject<HTMLDivElement | null>;
}

const PriceCard = ({ list, lang, tr, companyName, companyLogo, cardRef }: PriceCardProps) => {
  const brand = lang === "tamil" ? (tr[companyName] || "ஹரிமிட்டு ஆர்கானிக்") : companyName;
  const title = lang === "tamil" ? (tr[list.name] || list.name) : list.name;
  const f1 = lang === "tamil" ? "100% தூய்மையான & இயற்கை" : "100% Pure & Organic";
  const f2 = lang === "tamil" ? "ஆர்டர் செய்ய தொடர்பு கொள்ளுங்கள்" : "DM us to place your order!";

  return (
    <div
      ref={cardRef as React.RefObject<HTMLDivElement>}
      style={{
        position: "fixed", top: "-9999px", left: "-9999px",
        width: "640px", background: "#ffffff",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        borderRadius: "16px", overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #2d5a27 0%, #3d6b35 60%, #4a7a40 100%)",
        padding: "22px 24px", display: "flex", alignItems: "center", gap: "16px",
      }}>
        {companyLogo && (
          <img
            src={companyLogo}
            alt="logo"
            crossOrigin="anonymous"
            style={{
              width: "64px", height: "64px", objectFit: "contain",
              borderRadius: "10px", background: "#fff", padding: "6px", flexShrink: 0,
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <div>
          <p style={{ color: "#a8d5a2", fontSize: "10px", margin: 0, letterSpacing: "2px", textTransform: "uppercase" }}>
            🌿 Organic
          </p>
          <h1 style={{ color: "#fff", fontSize: "22px", margin: "4px 0 2px", fontWeight: 700 }}>
            {brand}
          </h1>
          <p style={{ color: "#c8e6c4", fontSize: "13px", margin: 0 }}>{title}</p>
        </div>
      </div>

      {/* Product grid */}
      <div style={{
        padding: "18px", display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", background: "#f9fafb",
      }}>
        {list.products.map((p) => {
          const pName = lang === "tamil" ? (tr[p.name] || p.name) : p.name;
          const pUnit = lang === "tamil" ? unitTamil(p.unit) : p.unit;
          return (
            <div key={p.productId} style={{
              background: "#fff", borderRadius: "12px", padding: "12px 8px",
              textAlign: "center", border: "1px solid #e5e7eb",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <img
                src={p.image} alt={p.name} crossOrigin="anonymous"
                style={{
                  width: "80px", height: "80px", objectFit: "cover",
                  borderRadius: "10px", display: "block", margin: "0 auto 8px",
                }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#111827", margin: "0 0 4px", lineHeight: 1.3 }}>
                {pName}
              </p>
              <p style={{ fontSize: "14px", color: "#2d5a27", fontWeight: 700, margin: 0 }}>
                ₹{p.price}
              </p>
              <p style={{ fontSize: "10px", color: "#6b7280", margin: "2px 0 0" }}>
                per {pUnit}
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        background: "#ecf5eb", padding: "12px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderTop: "1px solid #d1e8cc",
      }}>
        <p style={{ fontSize: "12px", color: "#2d5a27", margin: 0, fontWeight: 600 }}>✅ {f1}</p>
        <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>📲 {f2}</p>
      </div>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────

const PriceLists = () => {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [allProducts, setAllProducts] = useState<FirestoreProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [lang, setLang] = useState<Lang>("english");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState(false);

  const [companyName, setCompanyName] = useState("HARIMIDHU ORGANIC");
  const [companyLogo, setCompanyLogo] = useState("");

  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<PriceList | null>(null);
  const [listName, setListName] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<PriceListProduct[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const cardRefs = useRef<Record<string, React.RefObject<HTMLDivElement | null>>>({});

  const getCardRef = (id: string): React.RefObject<HTMLDivElement | null> => {
    if (!cardRefs.current[id]) cardRefs.current[id] = { current: null };
    return cardRefs.current[id];
  };

  // ── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [plSnap, prodSnap, compSnap] = await Promise.all([
        getDocs(query(priceListsCollection, orderBy("createdAt", "desc"))),
        getDocs(productsCollection),
        getDocs(companySettingsCollection),
      ]);
      setPriceLists(plSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PriceList, "id">) })));
      setAllProducts(prodSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FirestoreProduct, "id">) })));
      if (!compSnap.empty) {
        const cd = compSnap.docs[0].data();
        setCompanyName(cd.name || "HARIMIDHU ORGANIC");
        setCompanyLogo(cd.logo || "");
      }
    } catch { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  };

  // ── Auto-translate when Tamil is selected ────────────────────────────────

  useEffect(() => {
    if (lang !== "tamil" || !priceLists.length) return;

    const allTexts = new Set<string>();
    allTexts.add(companyName);
    priceLists.forEach((l) => {
      allTexts.add(l.name);
      l.products.forEach((p) => allTexts.add(p.name));
    });

    const untranslated = [...allTexts].filter((t) => !translations[t]);
    if (!untranslated.length) return;

    setTranslating(true);
    translateToTamil(untranslated).then((res) => {
      setTranslations((prev) => ({ ...prev, ...res }));
      setTranslating(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, priceLists]);

  // ── Image generation ─────────────────────────────────────────────────────

  const generateBlob = async (list: PriceList): Promise<Blob | null> => {
    const ref = cardRefs.current[list.id];
    if (!ref?.current) return null;
    try {
      const canvas = await html2canvas(ref.current, {
        useCORS: true, scale: 2, logging: false, backgroundColor: "#ffffff",
      });
      return new Promise((res) => canvas.toBlob((b) => res(b), "image/png"));
    } catch { return null; }
  };

  // ── Share actions ────────────────────────────────────────────────────────

  const handleCopy = async (list: PriceList) => {
    await navigator.clipboard.writeText(formatText(list, lang, translations, companyName));
    toast.success("Copied! Paste in WhatsApp or any app");
  };

  const handleWhatsApp = (list: PriceList) => {
    const text = formatText(list, lang, translations, companyName);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleShare = async (list: PriceList) => {
    setGeneratingId(list.id);
    const text = formatText(list, lang, translations, companyName);
    try {
      const blob = await generateBlob(list);

      if (blob && navigator.share) {
        const file = new File([blob], `${list.name}-price-list.png`, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: `${companyName} – ${list.name}`, text, files: [file] });
          return;
        }
      }

      // Desktop: download image + copy text
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${list.name}-price-list.png`;
        a.click();
        URL.revokeObjectURL(url);
        await navigator.clipboard.writeText(text);
        toast.success("Image saved & text copied — send them together!");
        return;
      }

      // Fallback: text only
      if (navigator.share) await navigator.share({ title: companyName, text });
      else {
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

  // ── Dialog helpers ───────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingList(null); setListName(""); setSelectedProducts([]);
    setProductSearch(""); setDialogOpen(true);
  };

  const openEdit = (list: PriceList) => {
    setEditingList(list); setListName(list.name);
    setSelectedProducts([...list.products]);
    setProductSearch(""); setDialogOpen(true);
  };

  const addProduct = (p: FirestoreProduct) => {
    if (selectedProducts.find((s) => s.productId === p.id)) return;
    setSelectedProducts((prev) => [
      ...prev,
      { productId: p.id, name: p.name, image: p.image, price: p.price, unit: p.unit || "Kg" },
    ]);
    setProductSearch("");
  };

  const removeProduct = (id: string) =>
    setSelectedProducts((prev) => prev.filter((p) => p.productId !== id));

  const updatePrice = (id: string, price: number) =>
    setSelectedProducts((prev) => prev.map((p) => p.productId === id ? { ...p, price } : p));

  const handleSave = async () => {
    if (!listName.trim()) { toast.error("Enter a list name"); return; }
    if (!selectedProducts.length) { toast.error("Add at least one product"); return; }
    setSaving(true);
    try {
      const data = { name: listName.trim(), products: selectedProducts, createdAt: serverTimestamp() };
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
    (p) =>
      p.name?.toLowerCase().includes(productSearch.toLowerCase()) &&
      !selectedProducts.find((s) => s.productId === p.id)
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title="Price Lists">
      <div className="flex flex-col gap-6">

        {/* Top bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Language:</Label>
            <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">🇬🇧 English</SelectItem>
                <SelectItem value="tamil">🇮🇳 தமிழ்</SelectItem>
              </SelectContent>
            </Select>
            {translating && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Translating…
              </span>
            )}
          </div>
          <Button className="gap-2 bg-organic-primary hover:bg-organic-dark" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Price List
          </Button>
        </div>

        {/* Lists */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-organic-primary" />
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
          priceLists.map((list) => {
            const cardRef = getCardRef(list.id);
            const displayName = lang === "tamil" ? (translations[list.name] || list.name) : list.name;
            return (
              <div key={list.id}>
                {/* Hidden card rendered off-screen for html2canvas */}
                <PriceCard
                  list={list} lang={lang} tr={translations}
                  companyName={companyName} companyLogo={companyLogo}
                  cardRef={cardRef}
                />

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{displayName}</CardTitle>
                        <Badge variant="secondary">{list.products.length} products</Badge>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs"
                          onClick={() => handleCopy(list)}>
                          <Copy className="h-3 w-3" /> Copy Text
                        </Button>

                        <Button size="sm" variant="outline"
                          className="h-8 gap-1 text-xs text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handleWhatsApp(list)}>
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </Button>

                        <Button size="sm"
                          className="h-8 gap-1 text-xs bg-organic-primary hover:bg-organic-dark"
                          onClick={() => handleShare(list)}
                          disabled={generatingId === list.id}>
                          {generatingId === list.id ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                          ) : (
                            <><Share2 className="h-3.5 w-3.5" /> Share with Image</>
                          )}
                        </Button>

                        <Button size="sm" variant="outline" className="h-8" onClick={() => openEdit(list)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline"
                          className="h-8 text-red-500 border-red-200 hover:bg-red-50"
                          onClick={() => setDeleteId(list.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {list.products.map((p) => {
                        const pName = lang === "tamil" ? (translations[p.name] || p.name) : p.name;
                        const pUnit = lang === "tamil" ? unitTamil(p.unit) : p.unit;
                        return (
                          <div key={p.productId}
                            className="flex flex-col items-center text-center border rounded-lg p-2 gap-1.5">
                            <img src={p.image} alt={p.name}
                              className="w-16 h-16 object-cover rounded-md"
                              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                            <p className="text-xs font-medium leading-tight line-clamp-2">{pName}</p>
                            <p className="text-xs font-semibold text-organic-primary">
                              ₹{p.price}/{pUnit}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })
        )}
      </div>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingList ? "Edit Price List" : "New Price List"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label>List Name</Label>
              <Input placeholder="e.g. Oil Products" value={listName}
                onChange={(e) => setListName(e.target.value)} />
            </div>

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
                        onClick={() => addProduct(p)}>
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

            {selectedProducts.length > 0 && (
              <div className="space-y-1.5">
                <Label>Selected Products ({selectedProducts.length})</Label>
                <div className="border rounded-md divide-y">
                  {selectedProducts.map((p, idx) => (
                    <div key={p.productId} className="flex items-center gap-3 px-3 py-2">
                      <span className="text-xs text-muted-foreground w-4 shrink-0">{idx + 1}.</span>
                      <img src={p.image} alt={p.name}
                        className="w-9 h-9 object-cover rounded shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">per {p.unit || "Kg"}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-sm text-muted-foreground">₹</span>
                        <Input type="number" min="0" className="w-20 h-8 text-sm"
                          value={p.price}
                          onChange={(e) => updatePrice(p.productId, parseFloat(e.target.value) || 0)} />
                      </div>
                      <Button size="icon" variant="ghost"
                        className="h-7 w-7 text-red-400 hover:text-red-600 shrink-0"
                        onClick={() => removeProduct(p.productId)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedProducts.length > 0 && (
              <div className="space-y-1.5">
                <Label>WhatsApp Preview</Label>
                <pre className="text-xs bg-muted rounded-md p-3 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                  {formatText(
                    { id: "", name: listName || "List Name", products: selectedProducts, createdAt: null },
                    "english", {}, companyName
                  )}
                </pre>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-organic-primary hover:bg-organic-dark" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editingList ? "Update" : "Create"}
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
