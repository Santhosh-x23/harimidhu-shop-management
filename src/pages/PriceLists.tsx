import { useState, useEffect } from "react";
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
import { Plus, Copy, Trash2, Edit, Search, X, MessageCircle, Tag, Languages, Loader2, ImageDown } from "lucide-react";
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

  // Nuts & seeds
  "ground nut": "வேர்க்கடலை",
  "groundnut": "வேர்க்கடலை",
  "peanut": "வேர்க்கடலை",
  "peanuts": "வேர்க்கடலை",
  "cashew": "முந்திரி",
  "cashew nut": "முந்திரி பருப்பு",
  "almond": "பாதாம்",
  "walnut": "வால்நட்",

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

  // Millets & grains
  "thinnai": "தினை",
  "foxtail millet": "தினை",
  "kambu": "கம்பு",
  "pearl millet": "கம்பு",
  "cholam": "சோளம்",
  "sorghum": "சோளம்",
  "ragi": "கேழ்வரகு",
  "finger millet": "கேழ்வரகு",
  "kuthiraivali": "குதிரைவாலி",
  "barnyard millet": "குதிரைவாலி",
  "varagu": "வரகு",
  "kodo millet": "வரகு",
  "samai": "சாமை",
  "little millet": "சாமை",
  "thinai": "தினை",
  "corn": "சோளம்",
  "maize": "மக்காச்சோளம்",
  "wheat": "கோதுமை",
  "oats": "ஓட்ஸ்",
  "barley": "வாற்கோதுமை",

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

// Clean text: decode HTML entities, strip invisible/control chars, NFC-normalise
const clean = (s: string): string =>
  s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#\d+;/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\u00AD/g, "")
    .replace(/[\u200B-\u200F]/g, "")
    .replace(/[\u202A-\u202E]/g, "")
    .replace(/[\u2028\u2029]/g, " ")
    .replace(/\uFEFF/g, "")
    .normalize("NFC")
    .trim();

const applyDict = (text: string): string | null => {
  const key = text.toLowerCase().trim();
  const val = TAMIL_DICT[key];
  return val ? clean(val) : null;
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
      const dictResult = applyDict(text);
      if (dictResult) { results[text] = dictResult; return; }

      try {
        const res = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ta`
        );
        const data = await res.json();
        const raw = data.responseData?.translatedText;
        const t = raw ? clean(raw) : null;
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

// Plain numbers — emoji keycaps show as boxes on many Android WhatsApp versions

const unitTamil = (u: string) =>
  ({ Litre: "லிட்டர்", Kilogram: "கிலோ", Kg: "கிலோ", Gram: "கிராம்", Piece: "துண்டு" }[u] ?? u);

const formatText = (
  list: PriceList,
  lang: Lang,
  tr: Record<string, string>,
  companyName: string
): string => {
  // Company name always stays in English — never translated
  const brand = companyName;
  const title = lang === "tamil" ? (tr[list.name] || list.name) : list.name;
  const sep = "--------------------";
  const f1 = lang === "tamil" ? "100% தூய்மையான & இயற்கை" : "100% Pure & Organic";
  const f2 = lang === "tamil"
    ? "வாங்க எங்களை தொடர்பு கொள்ளுங்கள் அல்லது மெசேஜ் செய்யுங்கள்!"
    : "Message us or Contact us for buying products!";

  const lines = [
    `*${brand}*`,
    sep,
    ``,
    `*${title}*`,
    ``,
  ];

  // Skip products with no price set
  const pricedProducts = list.products.filter((p) => p.price > 0);
  pricedProducts.forEach((p, i) => {
    const pName = lang === "tamil" ? (tr[p.name] || p.name) : p.name;
    const pUnit = lang === "tamil" ? unitTamil(p.unit) : p.unit;
    lines.push(`${i + 1}. *${pName}* - 1 ${pUnit} - Rs.${p.price}`);
  });

  lines.push(``);
  lines.push(sep);
  lines.push(f1);
  lines.push(f2);
  return lines.join("\n");
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<PriceList | null>(null);
  const [listName, setListName] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<PriceListProduct[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);

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

  // ── Share actions ────────────────────────────────────────────────────────

  const handleCopy = async (list: PriceList) => {
    await navigator.clipboard.writeText(formatText(list, lang, translations, companyName));
    toast.success("Copied! Paste in WhatsApp or any app");
  };

  const handleWhatsApp = (list: PriceList) => {
    const text = formatText(list, lang, translations, companyName);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleShareImage = async (list: PriceList) => {
    setGeneratingImage(true);
    try {
      // Wait for Noto Sans Tamil (already loaded via index.html link tag)
      await document.fonts.load('400 20px "Noto Sans Tamil"');
      await document.fonts.load('700 20px "Noto Sans Tamil"');

      const text = formatText(list, lang, translations, companyName);
      const rawLines = text.split("\n");

      const W = 680;
      const FONT_SIZE = 20;
      const LINE_H = Math.round(FONT_SIZE * 1.75);
      const PAD = 44;

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = rawLines.length * LINE_H + PAD * 2;
      const ctx = canvas.getContext("2d")!;

      // Warm background
      ctx.fillStyle = "#fff8ee";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Green top stripe
      ctx.fillStyle = "#2d6a4f";
      ctx.fillRect(0, 0, W, 8);
      ctx.fillRect(0, canvas.height - 8, W, 8);

      rawLines.forEach((rawLine, i) => {
        const y = PAD + i * LINE_H + FONT_SIZE;

        if (rawLine === "--------------------") {
          ctx.strokeStyle = "#b5936b";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(PAD, y - FONT_SIZE * 0.4);
          ctx.lineTo(W - PAD, y - FONT_SIZE * 0.4);
          ctx.stroke();
          ctx.setLineDash([]);
          return;
        }

        // *bold* text — WhatsApp asterisk markers
        const isBold = rawLine.startsWith("*") && rawLine.endsWith("*") && rawLine.length > 2;
        const lineText = isBold ? rawLine.slice(1, -1) : rawLine;

        ctx.font = `${isBold ? "700" : "400"} ${FONT_SIZE}px "Noto Sans Tamil", sans-serif`;
        ctx.fillStyle = isBold ? "#1a4731" : "#2d2d2d";
        ctx.fillText(lineText, PAD, y);
      });

      canvas.toBlob(async (blob) => {
        if (!blob) { toast.error("Failed to generate image"); setGeneratingImage(false); return; }
        const file = new File([blob], `${list.name.replace(/\s+/g, "-")}-prices.png`, { type: "image/png" });
        try {
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: list.name });
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = file.name; a.click();
            URL.revokeObjectURL(url);
            toast.success("Image saved! Open it and share in WhatsApp");
          }
        } catch { /* user cancelled share */ }
        setGeneratingImage(false);
      }, "image/png");
    } catch {
      toast.error("Could not generate image");
      setGeneratingImage(false);
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

  const addAllProducts = () => {
    const toAdd = allProducts.filter((p) => !selectedProducts.find((s) => s.productId === p.id));
    if (!toAdd.length) { toast.info("All products already added"); return; }
    setSelectedProducts((prev) => [
      ...prev,
      ...toAdd.map((p) => ({
        productId: p.id, name: p.name, image: p.image, price: p.price, unit: p.unit || "Kg",
      })),
    ]);
    toast.success(`Added ${toAdd.length} products`);
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
            const displayName = lang === "tamil" ? (translations[list.name] || list.name) : list.name;
            return (
              <div key={list.id}>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{displayName}</CardTitle>
                        <Badge variant="secondary">
                          {list.products.filter((p) => p.price > 0).length} products
                        </Badge>
                        {list.products.some((p) => p.price === 0) && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                            {list.products.filter((p) => p.price === 0).length} no price (skipped)
                          </Badge>
                        )}
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

                        <Button size="sm" variant="outline"
                          className="h-8 gap-1 text-xs text-purple-600 border-purple-200 hover:bg-purple-50"
                          disabled={generatingImage}
                          onClick={() => handleShareImage(list)}>
                          {generatingImage
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <ImageDown className="h-3.5 w-3.5" />}
                          {generatingImage ? "Generating..." : "Share Image"}
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
                        const noPrice = p.price === 0;
                        return (
                          <div key={p.productId}
                            className={`flex flex-col items-center text-center border rounded-lg p-2 gap-1.5 relative ${noPrice ? "opacity-50" : ""}`}>
                            {noPrice && (
                              <span className="absolute top-1 right-1 text-[9px] bg-amber-100 text-amber-700 rounded px-1 leading-tight">
                                no price
                              </span>
                            )}
                            <img src={p.image} alt={p.name}
                              className="w-16 h-16 object-cover rounded-md"
                              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                            <p className="text-xs font-medium leading-tight line-clamp-2">{pName}</p>
                            <p className={`text-xs font-semibold ${noPrice ? "text-amber-500" : "text-organic-primary"}`}>
                              {noPrice ? "Price not set" : `₹${p.price}/${pUnit}`}
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
              <div className="flex items-center justify-between">
                <Label>Add Products</Label>
                <Button type="button" size="sm" variant="outline"
                  className="h-7 text-xs gap-1 border-organic-primary text-organic-primary hover:bg-organic-primary hover:text-white"
                  onClick={addAllProducts}>
                  <Plus className="h-3 w-3" /> Add All Products
                </Button>
              </div>
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
                <div className="flex items-center justify-between">
                  <Label>
                    Selected Products ({selectedProducts.length})
                  </Label>
                  {selectedProducts.some((p) => p.price === 0) && (
                    <span className="text-xs text-amber-600">
                      ⚠ Set price — ₹0 products won't be copied
                    </span>
                  )}
                </div>
                <div className="border rounded-md divide-y">
                  {selectedProducts.map((p, idx) => (
                    <div key={p.productId}
                      className={`flex items-center gap-3 px-3 py-2 ${p.price === 0 ? "bg-amber-50" : ""}`}>
                      <span className="text-xs text-muted-foreground w-4 shrink-0">{idx + 1}.</span>
                      <img src={p.image} alt={p.name}
                        className="w-9 h-9 object-cover rounded shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">per {p.unit || "Kg"}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-sm ${p.price === 0 ? "text-amber-500" : "text-muted-foreground"}`}>₹</span>
                        <Input type="number" min="0"
                          className={`w-20 h-8 text-sm ${p.price === 0 ? "border-amber-300 focus-visible:ring-amber-400" : ""}`}
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
