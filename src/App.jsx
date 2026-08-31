import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, ShoppingCart, Plus, Minus, X, ArrowLeft, Check,
  Settings, Package, ClipboardList, Trash2, Lock, Loader2,
  Pencil, ImagePlus, Tag
} from "lucide-react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCc3Biv2uVjzDTFPr9ouFe2WL-KAw1ieOA",
  authDomain: "shaurya-s-toys-store.firebaseapp.com",
  projectId: "shaurya-s-toys-store",
  storageBucket: "shaurya-s-toys-store.firebasestorage.app",
  messagingSenderId: "832664456608",
  appId: "1:832664456608:web:7fd6cc1ff0d2936757e8c5",
  measurementId: "G-86L8EDT4DY"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const analytics = getAnalytics(firebaseApp);
// Note: photos are saved as base64 directly inside the Firestore product
// document (no Firebase Storage / Blaze plan needed) — same approach as
// the apni-dukan project. Firestore documents cap at 1MB, which is plenty
// for a normal product catalog's worth of photos.

// Firestore-backed storage — every key (products / orders / customCategories)
// is stored as one document inside the "store" collection, matching the
// Firestore security rules from the README (match /store/{docId}).
async function storageGet(key) {
  const snap = await getDoc(doc(db, "store", key));
  return snap.exists() ? { value: snap.data().value } : null;
}
async function storageSet(key, value) {
  await setDoc(doc(db, "store", key), { value });
  return true;
}
// Real-time listener — used for orders so the admin panel updates instantly
// on every device/session the moment a new order comes in, without needing
// a manual page refresh. This is what fixes "admin panel me order nahi dikhta".
function storageListen(key, onChange) {
  return onSnapshot(
    doc(db, "store", key),
    (snap) => {
      if (snap.exists()) onChange(snap.data().value);
    },
    (err) => {
      console.error("storageListen error for", key, err);
    }
  );
}

const CATEGORIES_DEFAULT = ["Soft Toys", "Action Figures", "Educational Toys", "Remote Control Toys", "Outdoor Toys", "Puzzles & Games", "Baby Toys", "Dolls", "બીજું"];
const ADMIN_PIN = "1609";

function resolveProductImage(p) {
  if (!p) return "";
  return p.image || "";
}

const SEED_PRODUCTS = [
  { id: "st-1", name: "Teddy Bear - Large (24 inch)", category: "Soft Toys", price: 499, mrp: 799, img: "🧸", stock: 20 },
  { id: "st-2", name: "Bunny Soft Toy", category: "Soft Toys", price: 249, mrp: 399, img: "🐰", stock: 25 },
  { id: "st-3", name: "Elephant Cushion Toy", category: "Soft Toys", price: 349, mrp: 549, img: "🐘", stock: 15 },
  { id: "af-1", name: "Superhero Action Figure", category: "Action Figures", price: 199, mrp: 349, img: "🦸", stock: 30 },
  { id: "af-2", name: "Dinosaur Figure Set (6 pcs)", category: "Action Figures", price: 299, mrp: 499, img: "🦖", stock: 18 },
  { id: "af-3", name: "Robot Warrior Figure", category: "Action Figures", price: 349, mrp: 599, img: "🤖", stock: 12 },
  { id: "et-1", name: "Alphabet Learning Blocks", category: "Educational Toys", price: 449, mrp: 699, img: "🔤", stock: 22 },
  { id: "et-2", name: "Math Counting Kit", category: "Educational Toys", price: 299, mrp: 449, img: "🔢", stock: 20 },
  { id: "et-3", name: "Science Experiment Kit", category: "Educational Toys", price: 799, mrp: 1199, img: "🧪", stock: 10 },
  { id: "rc-1", name: "RC Race Car", category: "Remote Control Toys", price: 899, mrp: 1499, img: "🚗", stock: 14 },
  { id: "rc-2", name: "RC Helicopter", category: "Remote Control Toys", price: 1299, mrp: 1999, img: "🚁", stock: 8 },
  { id: "rc-3", name: "RC Robot", category: "Remote Control Toys", price: 1099, mrp: 1699, img: "🤖", stock: 9 },
  { id: "ot-1", name: "Cricket Set for Kids", category: "Outdoor Toys", price: 399, mrp: 599, img: "🏏", stock: 18 },
  { id: "ot-2", name: "Football Size 3", category: "Outdoor Toys", price: 349, mrp: 549, img: "⚽", stock: 20 },
  { id: "ot-3", name: "Bicycle Kids 16 inch", category: "Outdoor Toys", price: 3499, mrp: 4999, img: "🚲", stock: 5 },
  { id: "pg-1", name: "Jigsaw Puzzle 500 pcs", category: "Puzzles & Games", price: 299, mrp: 449, img: "🧩", stock: 16 },
  { id: "pg-2", name: "Ludo & Snake Ladder Combo", category: "Puzzles & Games", price: 199, mrp: 299, img: "🎲", stock: 25 },
  { id: "pg-3", name: "Rubik's Cube", category: "Puzzles & Games", price: 249, mrp: 399, img: "🟦", stock: 22 },
  { id: "bt-1", name: "Baby Rattle Set", category: "Baby Toys", price: 199, mrp: 299, img: "🍼", stock: 30 },
  { id: "bt-2", name: "Soft Teether Toy", category: "Baby Toys", price: 149, mrp: 249, img: "🦷", stock: 28 },
  { id: "bt-3", name: "Musical Baby Gym", category: "Baby Toys", price: 899, mrp: 1399, img: "🎵", stock: 10 },
  { id: "dl-1", name: "Fashion Doll with Accessories", category: "Dolls", price: 549, mrp: 899, img: "👗", stock: 16 },
  { id: "dl-2", name: "Baby Doll with Feeding Set", category: "Dolls", price: 449, mrp: 699, img: "👶", stock: 14 },
  { id: "dl-3", name: "Princess Doll House", category: "Dolls", price: 1499, mrp: 2299, img: "🏰", stock: 6 },
];

function formatRs(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}
function uid(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function formatOrderDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
      " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ApniDukanApp() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("બધું");
  const [cart, setCart] = useState({});
  const [view, setView] = useState("home");
  const [lastOrderId, setLastOrderId] = useState("");

  // admin
  const [isAdmin, setIsAdmin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [newProduct, setNewProduct] = useState({ name: "", category: "કપડાં", price: "", img: "🛍️", image: "", stock: "" });
  const [editingProductId, setEditingProductId] = useState(null);
  const [customCategories, setCustomCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showProductList, setShowProductList] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkKeyword, setBulkKeyword] = useState("");
  const [bulkImage, setBulkImage] = useState("");
  const [bulkOnlyMissing, setBulkOnlyMissing] = useState(true);
  const [bulkStatus, setBulkStatus] = useState("");
  const [productStatus, setProductStatus] = useState("");
  const [deleteCategoryName, setDeleteCategoryName] = useState("");
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [mergeSourceCategories, setMergeSourceCategories] = useState([]);
  const [mergeTargetCategory, setMergeTargetCategory] = useState("");
  const [categoryOpStatus, setCategoryOpStatus] = useState("");

  // ---- load data on mount ----
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setLoadError("");
        const timeout = (ms) =>
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

        let prod = [];
        let timedOut = false;
        try {
          const res = await Promise.race([storageGet("products"), timeout(8000)]);
          prod = res ? JSON.parse(res.value) : [];
        } catch (e) {
          if (e && e.message === "timeout") timedOut = true;
          prod = [];
        }
        if (!prod || prod.length === 0) {
          prod = SEED_PRODUCTS;
          if (!timedOut) {
            try {
              await Promise.race([storageSet("products", JSON.stringify(prod)), timeout(8000)]);
            } catch {}
          }
        }
        setProducts(prod);

        let cats = [];
        try {
          const res3 = await Promise.race([storageGet("customCategories"), timeout(8000)]);
          cats = res3 ? JSON.parse(res3.value) : [];
        } catch (e) {
          if (e && e.message === "timeout") timedOut = true;
          cats = [];
        }
        setCustomCategories(cats || []);

        if (timedOut) {
          setLoadError("ડેટાબેઝ સાથે કનેક્ટ થવામાં તકલીફ થઈ (નેટવર્ક ધીમું અથવા બ્લોક છે). હાલ પુરાણું/ડિફોલ્ટ કેટલોગ બતાવ્યું છે — ફરી પ્રયત્ન કરો.");
        }
      } catch (e) {
        setLoadError("ડેટા લોડ કરવામાં તકલીફ થઈ. ફરી પ્રયત્ન કરો.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Live orders — real-time Firestore listener so every new order shows up
  // in the admin panel immediately, on any device, without a manual refresh.
  useEffect(() => {
    const unsubscribe = storageListen("orders", (rawValue) => {
      try {
        setOrders(JSON.parse(rawValue) || []);
      } catch {
        setOrders([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Live products — real-time Firestore listener so every device always has
  // the LATEST product list (including newly added photos) in memory. This
  // fixes the bug where an old browser tab/device, still holding stale data,
  // would overwrite fresh photos when it later saved anything (stock change,
  // new product, etc.) — because that stale array is now kept continuously
  // up to date instead of only being loaded once when the page first opened.
  useEffect(() => {
    const unsubscribe = storageListen("products", (rawValue) => {
      try {
        const fresh = JSON.parse(rawValue) || [];
        if (fresh.length > 0) setProducts(fresh);
      } catch {}
    });
    return () => unsubscribe();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    const ordered = CATEGORIES_DEFAULT.filter((c) => cats.has(c));
    const extra = Array.from(cats).filter((c) => !CATEGORIES_DEFAULT.includes(c));
    const extraCustom = customCategories.filter((c) => !ordered.includes(c) && !extra.includes(c));
    return ["બધું", ...ordered, ...extra, ...extraCustom];
  }, [products, customCategories]);

  // full list of category options for the admin add/edit-product dropdown
  const allCategoryOptions = useMemo(() => {
    const merged = new Set([...CATEGORIES_DEFAULT, ...customCategories, ...products.map((p) => p.category)]);
    return Array.from(merged);
  }, [customCategories, products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = category === "બધું" || p.category === category;
      const matchQuery = p.name.toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [products, query, category]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const p = products.find((x) => x.id === id);
        return p ? { ...p, qty } : null;
      })
      .filter(Boolean);
  }, [cart, products]);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);

  function addToCart(id) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  }
  function decFromCart(id) {
    setCart((prev) => {
      const next = { ...prev };
      if (!next[id]) return next;
      next[id] -= 1;
      if (next[id] <= 0) delete next[id];
      return next;
    });
  }
  function removeFromCart(id) {
    setCart((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  const [checkoutForm, setCheckoutForm] = useState({ name: "", phone: "", address: "" });
  const [checkoutError, setCheckoutError] = useState("");

  async function placeOrder() {
    if (!checkoutForm.name.trim() || !checkoutForm.phone.trim() || !checkoutForm.address.trim()) {
      setCheckoutError("કૃપા કરીને બધી વિગત ભરો.");
      return;
    }
    setCheckoutError("");
    setSaving(true);
    const order = {
      id: uid("ord"),
      items: cartItems.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
      total: cartTotal + (cartTotal > 999 ? 0 : 49),
      customer: { ...checkoutForm },
      payment: "કેશ ઓન ડિલિવરી",
      status: "નવો",
      createdAt: new Date().toISOString(),
    };
    try {
      let freshOrders = orders;
      try {
        const freshRes = await storageGet("orders");
        if (freshRes) freshOrders = JSON.parse(freshRes.value) || [];
      } catch {}
      const nextOrders = [order, ...freshOrders];
      const res = await storageSet("orders", JSON.stringify(nextOrders));
      setOrders(nextOrders);
      setCart({});
      setLastOrderId(String(nextOrders.length));
      setView("success");
      setCheckoutForm({ name: "", phone: "", address: "" });
      if (!res) {
        setLoadError("ઓર્ડર થઈ ગયો, પણ સર્વર પર સેવ કરવામાં તકલીફ પડી — એડમિન પેનલમાં કદાચ ના દેખાય.");
      }
    } catch (e) {
      // Even if storage sync fails, don't block the customer — complete the order locally
      const nextOrders = [order, ...orders];
      setOrders(nextOrders);
      setCart({});
      setLastOrderId(String(nextOrders.length));
      setView("success");
      setCheckoutForm({ name: "", phone: "", address: "" });
      setLoadError("ઓર્ડર થઈ ગયો, પણ સર્વર સાથે સેવ ના થયું: " + (e && e.message ? e.message : "અજાણી ભૂલ"));
    } finally {
      setSaving(false);
    }
  }

  async function updateOrderStatus(orderId, status) {
    let base = orders;
    try {
      const freshRes = await storageGet("orders");
      if (freshRes) base = JSON.parse(freshRes.value) || [];
    } catch {}
    const next = base.map((o) => (o.id === orderId ? { ...o, status } : o));
    setOrders(next);
    try {
      await storageSet("orders", JSON.stringify(next));
    } catch {}
  }

  async function importSeedCatalog() {
    setSaving(true);
    try {
      const existingIds = new Set(products.map((p) => p.id));
      const toAdd = SEED_PRODUCTS.filter((p) => !existingIds.has(p.id));
      const next = [...toAdd, ...products];
      const res = await storageSet("products", JSON.stringify(next));
      if (res) setProducts(next);
    } catch {} finally {
      setSaving(false);
    }
  }

  async function saveProduct() {
    if (!newProduct.name.trim()) {
      setProductStatus("⚠️ પ્રોડક્ટનું નામ ભરો");
      setTimeout(() => setProductStatus(""), 3000);
      return;
    }
    if (!newProduct.price) {
      setProductStatus("⚠️ ભાવ ભરો");
      setTimeout(() => setProductStatus(""), 3000);
      return;
    }
    const stockVal = newProduct.stock === "" ? undefined : Number(newProduct.stock);

    // Photo is saved directly as base64 inside the product document —
    // no Firebase Storage / upload step, no Blaze plan needed.
    const imageToSave = newProduct.image;

    let next;
    if (editingProductId) {
      next = products.map((p) =>
        p.id === editingProductId
          ? {
              ...p,
              name: newProduct.name.trim(),
              category: newProduct.category,
              price: Number(newProduct.price),
              img: newProduct.img || "🛍️",
              image: imageToSave || p.image,
              stock: stockVal,
            }
          : p
      );
    } else {
      const p = {
        id: uid("p"),
        name: newProduct.name.trim(),
        category: newProduct.category,
        price: Number(newProduct.price),
        img: newProduct.img || "🛍️",
        image: imageToSave || undefined,
        stock: stockVal,
      };
      next = [p, ...products];
    }
    setProducts(next);
    setNewProduct({ name: "", category: newProduct.category, price: "", img: "🛍️", image: "", stock: "" });
    setEditingProductId(null);
    setProductStatus("સેવ થાય છે...");
    try {
      await storageSet("products", JSON.stringify(next));
      setProductStatus("✅ સેવ થયું");
      setTimeout(() => setProductStatus(""), 2000);
    } catch {
      setProductStatus("⚠️ સેવ કરવામાં તકલીફ પડી");
      setTimeout(() => setProductStatus(""), 3000);
    }
  }

  function startEditProduct(p) {
    setEditingProductId(p.id);
    setNewProduct({
      name: p.name || "",
      category: p.category || allCategoryOptions[0] || "",
      price: p.price != null ? String(p.price) : "",
      img: p.img || "🛍️",
      image: p.image || "",
      stock: p.stock != null ? String(p.stock) : "",
    });
  }

  function cancelEditProduct() {
    setEditingProductId(null);
    setNewProduct({ name: "", category: newProduct.category, price: "", img: "🛍️", image: "", stock: "" });
  }

  function handleProductImageFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setNewProduct((f) => ({ ...f, image: reader.result }));
    };
    reader.readAsDataURL(file);
  }

  async function deleteAllProductsInCategory() {
    if (!deleteCategoryName) return;
    const next = products.filter((p) => p.category !== deleteCategoryName);
    const removedCount = products.length - next.length;
    setProducts(next);
    setCategoryOpStatus("ડિલીટ થાય છે...");
    try {
      const res = await storageSet("products", JSON.stringify(next));
      setCategoryOpStatus(res ? `✅ "${deleteCategoryName}" ના ${removedCount} પ્રોડક્ટ્સ ડિલીટ થયા (ટેબ રહેશે)` : "⚠️ તકલીફ પડી");
    } catch {
      setCategoryOpStatus("⚠️ તકલીફ પડી");
    }
    setDeleteConfirming(false);
    setDeleteCategoryName("");
    setTimeout(() => setCategoryOpStatus(""), 4000);
  }

  function toggleMergeSource(cat) {
    setMergeSourceCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function mergeCategoriesIntoNew() {
    if (mergeSourceCategories.length === 0 || !mergeTargetCategory.trim()) return;
    const targetName = mergeTargetCategory.trim();
    const next = products.map((p) =>
      mergeSourceCategories.includes(p.category) ? { ...p, category: targetName } : p
    );
    const movedCount = next.filter((p) => p.category === targetName).length;
    setProducts(next);
    setCategoryOpStatus("સેવ થાય છે...");
    try {
      const res = await storageSet("products", JSON.stringify(next));
      if (res && !CATEGORIES_DEFAULT.includes(targetName) && !customCategories.includes(targetName)) {
        const nextCats = [...customCategories, targetName];
        setCustomCategories(nextCats);
        await storageSet("customCategories", JSON.stringify(nextCats));
      }
      setCategoryOpStatus(res ? `✅ ${movedCount} પ્રોડક્ટ્સ "${targetName}" માં ખસેડાયા` : "⚠️ તકલીફ પડી");
    } catch {
      setCategoryOpStatus("⚠️ તકલીફ પડી");
    }
    setMergeSourceCategories([]);
    setMergeTargetCategory("");
    setTimeout(() => setCategoryOpStatus(""), 4000);
  }


  function handleBulkImageFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBulkImage(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function applyBulkCategoryImage() {
    if (!bulkCategory || !bulkImage) return;
    const uploadedUrl = bulkImage;
    const kw = bulkKeyword.trim().toLowerCase();
    const next = products.map((p) => {
      if (p.category !== bulkCategory) return p;
      if (kw && !p.name.toLowerCase().includes(kw)) return p;
      if (bulkOnlyMissing && p.image) return p;
      return { ...p, image: uploadedUrl };
    });
    setProducts(next);
    setBulkStatus("સેવ થાય છે...");
    try {
      const res = await storageSet("products", JSON.stringify(next));
      if (res) {
        const count = next.filter(
          (p) => p.category === bulkCategory && (!kw || p.name.toLowerCase().includes(kw))
        ).length;
        setBulkStatus(`✅ ${count} પ્રોડક્ટ્સમાં ફોટો લાગુ થયો`);
      } else {
        setBulkStatus("⚠️ સેવ કરવામાં તકલીફ પડી");
      }
    } catch {
      setBulkStatus("⚠️ સેવ કરવામાં તકલીફ પડી");
    }
    setTimeout(() => setBulkStatus(""), 3000);
  }

  async function deleteProduct(id) {
    const next = products.filter((p) => p.id !== id);
    setProducts(next);
    if (editingProductId === id) cancelEditProduct();
    try {
      await storageSet("products", JSON.stringify(next));
    } catch {}
  }

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    if (CATEGORIES_DEFAULT.includes(name) || customCategories.includes(name)) {
      setNewCategoryName("");
      return;
    }
    const next = [...customCategories, name];
    setCustomCategories(next);
    setNewCategoryName("");
    try {
      await storageSet("customCategories", JSON.stringify(next));
    } catch {}
  }

  async function deleteCategory(name) {
    const next = customCategories.filter((c) => c !== name);
    setCustomCategories(next);
    try {
      await storageSet("customCategories", JSON.stringify(next));
    } catch {}
  }

  function tryAdminLogin() {
    if (pinInput === ADMIN_PIN) {
      setIsAdmin(true);
      setPinError("");
      setView("admin");
    } else {
      setPinError("ખોટો PIN. ફરી પ્રયત્ન કરો.");
    }
  }

  if (loading) {
    return (
      <div style={styles.appShell} className="app-shell">
        <div style={{ ...styles.phoneFrame, alignItems: "center", justifyContent: "center", display: "flex" }} className="phone-frame">
          <Loader2 size={30} color="#2c2a26" className="spin" />
        </div>
        <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media (max-width:480px){
  .app-shell{padding:0 !important;}
  .phone-frame{width:100% !important;height:100vh !important;max-height:none !important;border:none !important;border-radius:0 !important;box-shadow:none !important;}
}`}</style>
      </div>
    );
  }

  return (
    <div style={styles.appShell} className="app-shell">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Hind+Vadodara:wght@400;500;600;700&family=Noto+Sans+Gujarati:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
@media (max-width:480px){
  .app-shell{padding:0 !important;}
  .phone-frame{width:100% !important;height:100vh !important;max-height:none !important;border:none !important;border-radius:0 !important;box-shadow:none !important;}
}`}</style>
      <div style={styles.phoneFrame} className="phone-frame">
        {/* TOP BAR */}
        <div style={styles.hazardStrip}>
          {[T.orange, T.marigold, T.green, T.orange, T.marigold, T.green, T.orange, T.marigold].map((c, i) => (
            <div key={i} style={{ ...styles.hazardBlock, background: c }} />
          ))}
        </div>
        <div style={styles.topBar}>
          <TopBarNature />
          <div style={styles.brandRow}>
            {view !== "home" ? (
              <button
                style={styles.iconBtn}
                onClick={() => setView(view === "checkout" ? "cart" : "home")}
                aria-label="પાછળ"
              >
                <ArrowLeft size={20} color={T.ink} />
              </button>
            ) : (
              <div style={styles.brand}>
                <span style={styles.brandDot} />
                Support Youth Support Nation
              </div>
            )}
            {view === "home" && (
              <div style={{ display: "flex", gap: 8 }}>
                <button style={styles.iconBtn} onClick={() => setView(isAdmin ? "admin" : "adminLogin")} aria-label="એડમિન">
                  <Settings size={18} color={T.ink} />
                </button>
                <button style={styles.cartIconBtn} onClick={() => setView("cart")} aria-label="કાર્ટ">
                  <ShoppingCart size={20} color={T.ink} />
                  {cartCount > 0 && <span style={styles.cartBadge}>{cartCount}</span>}
                </button>
              </div>
            )}
            {view === "cart" && <div style={styles.brand}>કાર્ટ</div>}
            {view === "checkout" && <div style={styles.brand}>ચેકઆઉટ</div>}
            {view === "adminLogin" && <div style={styles.brand}>એડમિન લોગિન</div>}
            {view === "admin" && <div style={styles.brand}>એડમિન પેનલ</div>}
          </div>
          {view === "home" && (
            <div style={styles.ecoSloganRow}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M12 22s7-4.5 7-12a7 7 0 0 0-14 0c0 7.5 7 12 7 12z" fill={T.greenDeep} />
                <path d="M12 22V10" stroke="#153D2A" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span style={styles.ecoSloganText}>Save Environment, Save Nation</span>
            </div>
          )}
        </div>

        {loadError && (
          <div style={styles.errorBanner}>
            {loadError}
            <button
              style={{ marginLeft: 8, background: "none", border: `1px solid currentColor`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "inherit" }}
              onClick={() => window.location.reload()}
            >
              ફરી પ્રયત્ન કરો
            </button>
          </div>
        )}

        {/* HOME */}
        {view === "home" && (
          <div style={styles.scrollArea}>
            <div style={styles.searchWrap}>
              <Search size={16} color="#8a8378" style={{ flexShrink: 0 }} />
              <input
                style={styles.searchInput}
                placeholder="પ્રોડક્ટ શોધો..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div style={styles.catRow}>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  style={{ ...styles.catChip, ...(category === c ? styles.catChipActive : {}) }}
                >
                  {c}
                </button>
              ))}
            </div>
            <div style={styles.grid}>
              {filtered.map((p) => (
                <div key={p.id} style={styles.card}>
                  <div style={styles.cardImgWrap}>
                    {resolveProductImage(p) ? (
                      <img src={resolveProductImage(p)} alt={p.name} style={styles.cardImg} />
                    ) : (
                      <span style={{ fontSize: 40 }}>{p.img}</span>
                    )}
                    {p.mrp && p.mrp > p.price ? (
                      <span style={styles.discountBadge}>
                        {Math.round((1 - p.price / p.mrp) * 100)}% OFF
                      </span>
                    ) : null}
                  </div>
                  <div style={styles.cardBody}>
                    <div style={styles.cardCat}>{p.category}</div>
                    <div style={styles.cardName}>{p.name}</div>
                    <div style={styles.cardBottomRow}>
                      <div>
                        <div style={styles.cardPrice}>{formatRs(p.price)}</div>
                        {p.mrp && p.mrp > p.price ? (
                          <div style={styles.cardMrp}>{formatRs(p.mrp)}</div>
                        ) : null}
                      </div>
                      {cart[p.id] ? (
                        <div style={styles.qtyControl}>
                          <button style={styles.qtyBtn} onClick={() => decFromCart(p.id)}>
                            <Minus size={13} color="#fff" />
                          </button>
                          <span style={styles.qtyNum}>{cart[p.id]}</span>
                          <button style={styles.qtyBtn} onClick={() => addToCart(p.id)}>
                            <Plus size={13} color="#fff" />
                          </button>
                        </div>
                      ) : (
                        <button style={styles.addBtn} onClick={() => addToCart(p.id)}>
                          ઉમેરો
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={styles.emptyState}>કંઈ મળ્યું નહીં.</div>
              )}
            </div>
            <div style={styles.missionStrip}>
              <div style={styles.missionStamp}>✦</div>
              <div>
                <div style={styles.missionText1}>દરેક ખરીદી યુવા રોજગારને ટેકો આપે છે</div>
                <div style={styles.missionText2}>Every order backs local youth livelihoods</div>
              </div>
            </div>
          </div>
        )}

        {/* CART */}
        {view === "cart" && (
          <div style={styles.scrollArea}>
            {cartItems.length === 0 ? (
              <div style={styles.emptyCart}>
                <ShoppingCart size={40} color="#c9c2b4" />
                <p style={{ color: "#8a8378", marginTop: 12 }}>તમારી કાર્ટ ખાલી છે</p>
                <button style={styles.primaryBtn} onClick={() => setView("home")}>ખરીદી શરૂ કરો</button>
              </div>
            ) : (
              <>
                <div style={{ padding: "4px 16px" }}>
                  {cartItems.map((item) => (
                    <div key={item.id} style={styles.cartRow}>
                      {resolveProductImage(item) ? (
                        <img src={resolveProductImage(item)} alt={item.name} style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 28 }}>{item.img}</span>
                      )}
                      <div style={{ flex: 1, marginLeft: 10 }}>
                        <div style={styles.cardName}>{item.name}</div>
                        <div style={styles.cardPrice}>{formatRs(item.price)}</div>
                      </div>
                      <div style={styles.qtyControl}>
                        <button style={styles.qtyBtn} onClick={() => decFromCart(item.id)}>
                          <Minus size={13} color="#fff" />
                        </button>
                        <span style={styles.qtyNum}>{item.qty}</span>
                        <button style={styles.qtyBtn} onClick={() => addToCart(item.id)}>
                          <Plus size={13} color="#fff" />
                        </button>
                      </div>
                      <button style={styles.removeBtn} onClick={() => removeFromCart(item.id)}>
                        <X size={16} color="#b23b3b" />
                      </button>
                    </div>
                  ))}
                </div>
                <div style={styles.summaryBox}>
                  <div style={styles.summaryRow}><span>સબટોટલ</span><span>{formatRs(cartTotal)}</span></div>
                  <div style={styles.summaryRow}><span>ડિલિવરી</span><span>{cartTotal > 999 ? "મફત" : formatRs(49)}</span></div>
                  <div style={{ ...styles.summaryRow, ...styles.summaryTotal }}>
                    <span>કુલ</span><span>{formatRs(cartTotal + (cartTotal > 999 ? 0 : 49))}</span>
                  </div>
                  <button style={styles.primaryBtn} onClick={() => setView("checkout")}>ચેકઆઉટ કરો</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* CHECKOUT */}
        {view === "checkout" && (
          <div style={styles.scrollArea}>
            <div style={{ padding: 16 }}>
              <label style={styles.label}>પૂરું નામ</label>
              <input
                style={styles.textInput}
                value={checkoutForm.name}
                onChange={(e) => setCheckoutForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="તમારું નામ"
              />
              <label style={styles.label}>મોબાઇલ નંબર</label>
              <input
                style={styles.textInput}
                value={checkoutForm.phone}
                onChange={(e) => setCheckoutForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="9XXXXXXXXX"
              />
              <label style={styles.label}>ડિલિવરી સરનામું</label>
              <textarea
                style={{ ...styles.textInput, height: 70 }}
                value={checkoutForm.address}
                onChange={(e) => setCheckoutForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="ઘર નં, શેરી, શહેર, પિનકોડ"
              />
              <label style={styles.label}>ચુકવણી પદ્ધતિ</label>
              <div style={styles.payOptions}>
                <div style={{ ...styles.payChip, ...styles.payChipActive }}>કેશ ઓન ડિલિવરી</div>
              </div>

              {checkoutError && <div style={styles.errorText}>{checkoutError}</div>}

              <div style={{ ...styles.summaryBox, marginTop: 20 }}>
                <div style={styles.summaryRow}><span>વસ્તુઓ ({cartCount})</span><span>{formatRs(cartTotal)}</span></div>
                <div style={{ ...styles.summaryRow, ...styles.summaryTotal }}>
                  <span>કુલ ચૂકવવાનું (ડિલિવરી વખતે)</span>
                  <span>{formatRs(cartTotal + (cartTotal > 999 ? 0 : 49))}</span>
                </div>
                <button style={styles.primaryBtn} onClick={placeOrder} disabled={saving}>
                  {saving ? "સેવ થાય છે..." : "ઓર્ડર કન્ફર્મ કરો"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {view === "success" && (
          <div style={styles.successWrap}>
            <div style={styles.successIcon}><Check size={36} color="#fff" /></div>
            <h2 style={{ color: "#2c2a26", margin: "16px 0 6px" }}>ઓર્ડર થઈ ગયો!</h2>
            <p style={{ color: "#8a8378", textAlign: "center", padding: "0 30px" }}>
              ઓર્ડર નંબર: {lastOrderId}<br />ડિલિવરી વખતે કેશ ચૂકવો.
            </p>
            <button style={styles.primaryBtn} onClick={() => setView("home")}>ખરીદી ચાલુ રાખો</button>
          </div>
        )}

        {/* ADMIN LOGIN */}
        {view === "adminLogin" && (
          <div style={styles.successWrap}>
            <Lock size={34} color="#8a8378" />
            <p style={{ color: "#6b6555", margin: "12px 0" }}>એડમિન PIN નાખો</p>
            <input
              style={{ ...styles.textInput, textAlign: "center", letterSpacing: 4, width: 140 }}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••"
              type="password"
            />
            {pinError && <div style={styles.errorText}>{pinError}</div>}
            <button style={styles.primaryBtn} onClick={tryAdminLogin}>લોગિન</button>
          </div>
        )}

        {/* ADMIN PANEL */}
        {view === "admin" && (
          <div style={styles.scrollArea}>
            <div style={{ padding: 16 }}>
              <button style={{ ...styles.primaryBtn, marginTop: 0, marginBottom: 16 }} onClick={importSeedCatalog} disabled={saving}>
                {saving ? "લોડ થાય છે..." : "ડિફોલ્ટ ટોય કેટલોગ લોડ/અપડેટ કરો"}
              </button>
              <div style={styles.adminSectionTitle}><ClipboardList size={16} /> ઓર્ડર્સ ({orders.length})</div>
              {orders.length === 0 && <p style={{ color: "#a49c88", fontSize: 13 }}>હજુ કોઈ ઓર્ડર નથી.</p>}
              {orders.map((o, idx) => (
                <div key={o.id} style={styles.orderCard}>
                  <div style={styles.orderTopRow}>
                    <span style={{ fontWeight: 700, fontSize: 12 }}>ઓર્ડર #{orders.length - idx} · {o.customer.name}</span>
                    <span style={styles.orderStatusTag}>{o.status}</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: "#a49c88", marginTop: 2 }}>{formatOrderDate(o.createdAt)}</div>
                  <div style={{ fontSize: 11, color: "#8a8378", marginTop: 4 }}>{o.customer.phone}</div>
                  <div style={{ fontSize: 11, color: "#8a8378", marginBottom: 4 }}>{o.customer.address}</div>
                  <div style={{ fontSize: 12, color: "#2c2a26" }}>
                    {o.items.map((i) => `${i.name} x${i.qty}`).join(", ")}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 13, margin: "4px 0" }}>{formatRs(o.total)}</div>
                  <div style={styles.statusRow}>
                    {["નવો", "કન્ફર્મ", "ડિલિવર થયો"].map((s) => (
                      <button
                        key={s}
                        onClick={() => updateOrderStatus(o.id, s)}
                        style={{ ...styles.statusBtn, ...(o.status === s ? styles.statusBtnActive : {}) }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div style={{ ...styles.adminSectionTitle, marginTop: 24 }}><Tag size={16} /> કેટેગરી મેનેજ કરો</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ ...styles.textInput, flex: 1 }}
                  placeholder="નવી કેટેગરીનું નામ"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <button
                  style={{ ...styles.primaryBtn, width: 80, marginTop: 0, padding: "0 10px" }}
                  onClick={addCategory}
                >
                  ઉમેરો
                </button>
              </div>
              {customCategories.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {customCategories.map((c) => (
                    <div
                      key={c}
                      style={{ display: "flex", alignItems: "center", gap: 4, background: T.surface2, border: `1px solid ${T.hairline}`, borderRadius: 999, padding: "4px 6px 4px 10px", fontSize: 11.5, color: T.ink }}
                    >
                      {c}
                      <button
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex" }}
                        onClick={() => deleteCategory(c)}
                        aria-label="કેટેગરી કાઢી નાખો"
                      >
                        <X size={12} color="#b23b3b" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ ...styles.adminSectionTitle, marginTop: 24 }}>
                <Trash2 size={16} /> કેટેગરીના બધા પ્રોડક્ટ્સ ડિલીટ કરો
              </div>
              <p style={{ fontSize: 11.5, color: "#8a8378", marginTop: -4, marginBottom: 10 }}>
                ટેબ/કેટેગરી રહેશે, ફક્ત એમાંના પ્રોડક્ટ્સ કાઢી નંખાશે.
              </p>
              <select
                style={styles.textInput}
                value={deleteCategoryName}
                onChange={(e) => { setDeleteCategoryName(e.target.value); setDeleteConfirming(false); }}
              >
                <option value="">-- કેટેગરી પસંદ કરો --</option>
                {allCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {!deleteConfirming ? (
                <button
                  style={{ ...styles.primaryBtn, background: "#b23b3b", opacity: deleteCategoryName ? 1 : 0.5 }}
                  disabled={!deleteCategoryName}
                  onClick={() => setDeleteConfirming(true)}
                >
                  {deleteCategoryName ? `"${deleteCategoryName}" ના પ્રોડક્ટ્સ ડિલીટ કરો` : "કેટેગરી પસંદ કરો"}
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    style={{ ...styles.primaryBtn, background: "#b23b3b", flex: 1, marginTop: 0 }}
                    onClick={deleteAllProductsInCategory}
                  >
                    હા, પાક્કું ડિલીટ કરો
                  </button>
                  <button
                    style={{ ...styles.primaryBtn, background: T.surface2, color: T.ink, flex: 1, marginTop: 0 }}
                    onClick={() => setDeleteConfirming(false)}
                  >
                    રદ કરો
                  </button>
                </div>
              )}

              <div style={{ ...styles.adminSectionTitle, marginTop: 24 }}>
                <Tag size={16} /> કેટેગરીઝને નવી કેટેગરીમાં ભેગી કરો
              </div>
              <p style={{ fontSize: 11.5, color: "#8a8378", marginTop: -4, marginBottom: 10 }}>
                એક કે વધુ કેટેગરી પસંદ કરો, પછી નવું નામ આપો — બધા પ્રોડક્ટ્સ ત્યાં ખસી જશે.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {allCategoryOptions.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleMergeSource(c)}
                    style={{
                      border: `1px solid ${mergeSourceCategories.includes(c) ? T.ink : T.hairline}`,
                      background: mergeSourceCategories.includes(c) ? T.ink : T.surface2,
                      color: mergeSourceCategories.includes(c) ? "#fff" : T.ink,
                      borderRadius: 999,
                      padding: "5px 12px",
                      fontSize: 11.5,
                      cursor: "pointer",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <input
                style={styles.textInput}
                placeholder="નવી કેટેગરીનું નામ (દા.ત. V Belt)"
                value={mergeTargetCategory}
                onChange={(e) => setMergeTargetCategory(e.target.value)}
              />
              <button
                style={{ ...styles.primaryBtn, opacity: mergeSourceCategories.length && mergeTargetCategory.trim() ? 1 : 0.5 }}
                disabled={!mergeSourceCategories.length || !mergeTargetCategory.trim()}
                onClick={mergeCategoriesIntoNew}
              >
                {mergeSourceCategories.length
                  ? `${mergeSourceCategories.join(", ")} → "${mergeTargetCategory || "..."}"માં ખસેડો`
                  : "કેટેગરી પસંદ કરો"}
              </button>
              {categoryOpStatus && <p style={{ fontSize: 12, marginTop: 6, fontWeight: 700 }}>{categoryOpStatus}</p>}

              <div style={{ ...styles.adminSectionTitle, marginTop: 24 }}>
                <ImagePlus size={16} /> કેટેગરી પ્રમાણે ફોટો લગાવો (Bulk)
              </div>
              <p style={{ fontSize: 11.5, color: "#8a8378", marginTop: -4, marginBottom: 10 }}>
                એક કેટેગરીના બધા પ્રોડક્ટ્સમાં એક જ ફોટો એકસાથે લગાવો.
              </p>
              <select
                style={styles.textInput}
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
              >
                <option value="">-- કેટેગરી પસંદ કરો --</option>
                {allCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                style={{ ...styles.textInput, marginTop: 8 }}
                placeholder="નામમાં આ શબ્દ હોય એ જ (દા.ત. 'A' અથવા 'V-Belt A') — ખાલી રાખો બધા માટે"
                value={bulkKeyword}
                onChange={(e) => setBulkKeyword(e.target.value)}
              />
              <label
                style={{
                  ...styles.textInput,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 8,
                  cursor: "pointer",
                  color: bulkImage ? T.ink : "#8a8378",
                }}
              >
                <ImagePlus size={15} />
                {bulkImage ? "ફોટો પસંદ થયો ✓" : "ફોટો પસંદ કરો"}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleBulkImageFile(e.target.files?.[0])}
                />
              </label>
              {bulkImage && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                  <img src={bulkImage} alt="preview" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: `1px solid ${T.hairline}` }} />
                  <button
                    style={{ background: "none", border: "none", color: "#b23b3b", fontSize: 12, cursor: "pointer" }}
                    onClick={() => setBulkImage("")}
                  >
                    હટાવો
                  </button>
                </div>
              )}
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12.5, color: T.inkSoft }}>
                <input
                  type="checkbox"
                  checked={bulkOnlyMissing}
                  onChange={(e) => setBulkOnlyMissing(e.target.checked)}
                />
                ફક્ત જેમાં ફોટો નથી એમાં જ લગાવો (existing ફોટો સેફ રહેશે)
              </label>
              <button
                style={{ ...styles.primaryBtn, opacity: bulkCategory && bulkImage ? 1 : 0.5 }}
                onClick={applyBulkCategoryImage}
                disabled={!bulkCategory || !bulkImage}
              >
                {bulkCategory ? `"${bulkCategory}" ના બધા પ્રોડક્ટ્સમાં લગાવો` : "કેટેગરી પસંદ કરો"}
              </button>
              {bulkStatus && <p style={{ fontSize: 12, marginTop: 6, fontWeight: 700 }}>{bulkStatus}</p>}

              <div style={{ ...styles.adminSectionTitle, marginTop: 24 }}>
                <Package size={16} /> {editingProductId ? "પ્રોડક્ટ અપડેટ કરો" : "પ્રોડક્ટ ઉમેરો"}
              </div>
              <input
                style={styles.textInput}
                placeholder="પ્રોડક્ટનું નામ"
                value={newProduct.name}
                onChange={(e) => setNewProduct((f) => ({ ...f, name: e.target.value }))}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <select
                  style={{ ...styles.textInput, flex: 1 }}
                  value={newProduct.category}
                  onChange={(e) => setNewProduct((f) => ({ ...f, category: e.target.value }))}
                >
                  {allCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  style={{ ...styles.textInput, width: 90 }}
                  placeholder="ભાવ ₹"
                  type="number"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input
                  style={{ ...styles.textInput, flex: 1 }}
                  placeholder="ઇમોજી (દા.ત. 👕)"
                  value={newProduct.img}
                  onChange={(e) => setNewProduct((f) => ({ ...f, img: e.target.value }))}
                />
                <input
                  style={{ ...styles.textInput, width: 90 }}
                  placeholder="સ્ટોક"
                  type="number"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct((f) => ({ ...f, stock: e.target.value }))}
                />
              </div>

              <label style={{ ...styles.label, margin: "12px 0 6px" }}>પ્રોડક્ટ ફોટો</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {newProduct.image ? (
                  <img src={newProduct.image} alt="preview" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, border: `1px solid ${T.hairline}` }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 8, border: `1px dashed ${T.hairline}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                    {newProduct.img || "🛍️"}
                  </div>
                )}
                <label
                  style={{ ...styles.textInput, flex: 1, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: T.inkSoft }}
                >
                  <ImagePlus size={15} />
                  {newProduct.image ? "ફોટો બદલો" : "ફોટો અપલોડ કરો"}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleProductImageFile(e.target.files && e.target.files[0])}
                  />
                </label>
                {newProduct.image && (
                  <button
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                    onClick={() => setNewProduct((f) => ({ ...f, image: "" }))}
                    aria-label="ફોટો કાઢી નાખો"
                  >
                    <X size={16} color="#b23b3b" />
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...styles.primaryBtn, flex: 1 }} onClick={saveProduct}>
                  {editingProductId ? "અપડેટ કરો" : "પ્રોડક્ટ ઉમેરો"}
                </button>
                {editingProductId && (
                  <button
                    style={{ ...styles.primaryBtn, flex: 1, background: T.surface2, color: T.inkSoft, boxShadow: "none" }}
                    onClick={cancelEditProduct}
                  >
                    રદ કરો
                  </button>
                )}
              </div>
              {productStatus && <p style={{ fontSize: 12, marginTop: 6, fontWeight: 700 }}>{productStatus}</p>}

              <button
                style={{
                  ...styles.adminSectionTitle,
                  marginTop: 24,
                  width: "100%",
                  background: T.surface2,
                  border: `1px solid ${T.hairline}`,
                  borderRadius: 10,
                  padding: "12px 12px",
                  cursor: "pointer",
                  justifyContent: "space-between",
                  fontFamily: "inherit",
                  textTransform: "none",
                  letterSpacing: 0,
                }}
                onClick={() => setShowProductList((v) => !v)}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Package size={16} /> બધા પ્રોડક્ટ્સ ({products.length})
                </span>
                <span style={{ fontSize: 11, color: T.inkSoft, fontWeight: 700 }}>
                  {showProductList ? "છુપાવો ▲" : "જુઓ ▼"}
                </span>
              </button>
              {showProductList && products.map((p) => (
                <div key={p.id} style={{ ...styles.productRow, ...(editingProductId === p.id ? { background: T.surface2, borderRadius: 8 } : {}) }}>
                  {resolveProductImage(p) ? (
                    <img src={resolveProductImage(p)} alt={p.name} style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 6 }} />
                  ) : (
                    <span style={{ fontSize: 20 }}>{p.img}</span>
                  )}
                  <div style={{ flex: 1, marginLeft: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "#8a8378" }}>
                      {p.category} · {formatRs(p.price)}
                      {p.stock != null && p.stock !== "" ? ` · સ્ટોક: ${p.stock}` : ""}
                    </div>
                  </div>
                  <button style={styles.removeBtn} onClick={() => startEditProduct(p)} aria-label="એડિટ કરો">
                    <Pencil size={15} color={T.inkSoft} />
                  </button>
                  <button style={styles.removeBtn} onClick={() => deleteProduct(p.id)} aria-label="કાઢી નાખો">
                    <Trash2 size={15} color="#b23b3b" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <WalkingDuckBanner />
    </div>
  );
}

/* ---- design tokens: "Kite & Building Blocks" toy-shop theme ---- */
const T = {
  bg: "#FFF7EA",
  surface: "#FFFFFF",
  surface2: "#FCEFD8",
  ink: "#232B54",
  inkSoft: "#5D6088",
  orange: "#FF6B4A",
  orangeDeep: "#D94A2B",
  green: "#1E9C90",
  greenDeep: "#0F6E64",
  greenLight: "#E4F5F1",
  greenLight2: "#C3E9E1",
  marigold: "#FFB627",
  hairline: "#F0E2C4",
};

const styles = {
  appShell: { minHeight: "100vh", width: "100%", background: `radial-gradient(circle at 15% 0%, #e3e0d3 0%, transparent 45%), ${T.bg}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Hind Vadodara','Noto Sans Gujarati','Segoe UI',sans-serif", padding: "12px 0" },
  phoneFrame: { width: 390, maxWidth: "100%", height: 780, maxHeight: "95vh", background: T.surface, borderRadius: 28, overflow: "hidden", boxShadow: "0 20px 50px rgba(40,35,20,0.3)", display: "flex", flexDirection: "column", border: `6px solid ${T.ink}`, position: "relative" },
  hazardStrip: { height: 9, flexShrink: 0, display: "flex", background: T.ink },
  hazardBlock: { flex: 1, height: "100%" },
  topBar: { background: `linear-gradient(180deg, ${T.greenLight}, ${T.greenLight2})`, padding: "14px 16px 12px", position: "relative", overflow: "hidden", flexShrink: 0 },
  topBarLeaf: { position: "absolute", right: -10, top: -10, width: 130, height: 100, opacity: 0.85, pointerEvents: "none" },
  brandRow: { display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" },
  brand: { color: T.ink, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, lineHeight: 1.2, maxWidth: 210 },
  brandDot: { width: 9, height: 9, borderRadius: "50%", background: T.orangeDeep, display: "inline-block" },
  iconBtn: { background: "rgba(255,255,255,0.55)", border: `1px solid rgba(31,92,64,0.25)`, borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.ink },
  cartIconBtn: { position: "relative", background: "rgba(255,255,255,0.55)", border: `1px solid rgba(31,92,64,0.25)`, borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  cartBadge: { position: "absolute", top: -6, right: -6, background: T.orange, color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 10, minWidth: 17, height: 17, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: `2px solid ${T.greenLight}` },
  ecoSloganRow: { display: "flex", alignItems: "center", gap: 6, marginTop: 10, paddingTop: 9, borderTop: "1px solid rgba(31,92,64,0.22)" },
  ecoSloganText: { fontFamily: "'Noto Sans Gujarati',sans-serif", fontWeight: 700, fontSize: 11.5, color: T.greenDeep, letterSpacing: "0.01em" },
  scrollArea: { flex: 1, overflowY: "auto" },
  errorBanner: { background: "#f6d9d9", color: "#8a2b2b", fontSize: 12, padding: "8px 16px" },
  errorText: { color: "#b23b3b", fontSize: 12, marginTop: 6 },
  searchWrap: { display: "flex", alignItems: "center", gap: 8, background: T.surface, border: `1.5px solid ${T.hairline}`, margin: "14px 16px 10px", padding: "10px 14px", borderRadius: 11 },
  searchInput: { border: "none", background: "transparent", outline: "none", fontSize: 14, flex: 1, color: T.ink, fontFamily: "inherit" },
  catRow: { display: "flex", gap: 8, padding: "0 16px 14px", overflowX: "auto" },
  catChip: { flexShrink: 0, fontFamily: "'Baloo 2',sans-serif", border: `1px solid ${T.hairline}`, background: T.surface2, color: T.inkSoft, padding: "8px 15px", borderRadius: 999, fontSize: 12, fontWeight: 600, letterSpacing: "0.03em", cursor: "pointer" },
  catChipActive: { background: T.ink, color: "#fff", borderColor: T.ink },
  missionStrip: { margin: "2px 16px 16px", background: `linear-gradient(120deg, ${T.green}, ${T.greenDeep})`, borderRadius: 13, padding: "13px 14px", display: "flex", alignItems: "center", gap: 12 },
  missionStamp: { width: 38, height: 38, borderRadius: "50%", border: `2px solid ${T.marigold}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.marigold, fontSize: 16, flexShrink: 0, transform: "rotate(-6deg)" },
  missionText1: { color: "#fff", fontWeight: 700, fontSize: 12, fontFamily: "'Noto Sans Gujarati',sans-serif" },
  missionText2: { color: "rgba(255,255,255,0.72)", fontSize: 10, marginTop: 2 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "0 16px 20px" },
  card: { background: T.surface, borderRadius: 12, overflow: "hidden", border: `1px solid ${T.hairline}`, display: "flex", flexDirection: "column", position: "relative" },
  cardImgWrap: { position: "relative", background: "linear-gradient(160deg, #FDEFD9, #F6DCB4)", display: "flex", alignItems: "center", justifyContent: "center", height: 84, overflow: "hidden", borderBottom: `1px dashed ${T.hairline}` },
  cardImg: { width: "100%", height: "100%", objectFit: "cover" },
  cardBody: { padding: "9px 10px 11px" },
  cardCat: { fontFamily: "'Baloo 2',sans-serif", fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", color: T.green, fontWeight: 700, marginBottom: 2 },
  cardName: { fontSize: 13, fontWeight: 600, color: T.ink, lineHeight: 1.3, minHeight: 34 },
  cardBottomRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  cardPrice: { fontFamily: "'Baloo 2',sans-serif", fontSize: 14.5, fontWeight: 700, color: T.ink },
  cardMrp: { fontFamily: "'Baloo 2',sans-serif", fontSize: 11, color: "#a39c8c", textDecoration: "line-through" },
  discountBadge: { position: "absolute", top: 5, left: 5, background: T.marigold, color: T.ink, fontFamily: "'Baloo 2',sans-serif", fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 6, letterSpacing: "0.02em" },
  addBtn: { background: T.orange, color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 2px 0 ${T.orangeDeep}` },
  qtyControl: { display: "flex", alignItems: "center", gap: 6, background: T.ink, borderRadius: 8, padding: "3px 6px" },
  qtyBtn: { background: T.orange, border: "none", borderRadius: 5, width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  qtyNum: { color: "#fff", fontSize: 12, fontWeight: 700, minWidth: 14, textAlign: "center" },
  emptyState: { gridColumn: "1 / -1", textAlign: "center", color: T.inkSoft, padding: "40px 0", fontSize: 13 },
  emptyCart: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "70px 20px" },
  cartRow: { display: "flex", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${T.surface2}` },
  removeBtn: { background: "none", border: "none", cursor: "pointer", marginLeft: 6, padding: 4 },
  summaryBox: { background: T.surface2, margin: 16, padding: 16, borderRadius: 14, border: `1px solid ${T.hairline}` },
  summaryRow: { display: "flex", justifyContent: "space-between", fontSize: 13, color: T.inkSoft, marginBottom: 8 },
  summaryTotal: { fontSize: 15, fontWeight: 800, color: T.ink, borderTop: `1px solid ${T.hairline}`, paddingTop: 10, marginTop: 4 },
  primaryBtn: { width: "100%", background: T.orange, color: "#fff", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 700, marginTop: 12, cursor: "pointer", fontFamily: "'Baloo 2',sans-serif", letterSpacing: "0.03em", boxShadow: `0 3px 0 ${T.orangeDeep}` },
  label: { display: "block", fontSize: 12, fontWeight: 700, color: T.inkSoft, margin: "14px 0 6px" },
  textInput: { width: "100%", border: `1px solid ${T.hairline}`, background: "#fff", borderRadius: 10, padding: "11px 12px", fontSize: 13, color: T.ink, outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  payOptions: { display: "flex", gap: 8 },
  payChip: { flex: 1, textAlign: "center", border: `1px solid ${T.hairline}`, background: "#fff", color: T.inkSoft, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 600 },
  payChipActive: { background: T.ink, color: "#fff", borderColor: T.ink },
  successWrap: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 20px" },
  successIcon: { width: 64, height: 64, borderRadius: "50%", background: T.green, display: "flex", alignItems: "center", justifyContent: "center" },
  adminSectionTitle: { display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 13, color: T.ink, marginBottom: 10, fontFamily: "'Baloo 2',sans-serif", textTransform: "uppercase", letterSpacing: "0.04em" },
  orderCard: { background: "#fff", border: `1px solid ${T.hairline}`, borderRadius: 12, padding: 10, marginBottom: 10 },
  orderTopRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  orderStatusTag: { fontSize: 10, background: T.surface2, color: T.inkSoft, padding: "2px 8px", borderRadius: 999, fontWeight: 700 },
  statusRow: { display: "flex", gap: 6, marginTop: 6 },
  statusBtn: { flex: 1, fontSize: 10, border: `1px solid ${T.hairline}`, background: "#fff", color: T.inkSoft, borderRadius: 8, padding: "5px 0", cursor: "pointer", fontFamily: "inherit" },
  statusBtnActive: { background: T.green, color: "#fff", borderColor: T.green },
  productRow: { display: "flex", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.surface2}` },
};

/* signature illustration: a kite on a curved string, tying the toy-shop
   identity to Gujarat's own kite-flying tradition — used in the top strip */
/* Walking duck — animated GIF from /duck-animation.gif in the public folder,
   pinned along the very bottom edge of the phone screen (no box/frame),
   with a lively walking bob+tilt gait while it crosses left to right. */
function WalkingDuckBanner() {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 0, overflow: "visible", pointerEvents: "none", zIndex: 5 }}>
      <style>{`
        @keyframes duckMoveAcross { 0% { left: -150px; } 100% { left: 100%; } }
        @keyframes duckWalkBob { 0%, 100% { transform: translateY(0) rotate(-6deg); } 50% { transform: translateY(-14px) rotate(6deg); } }
      `}</style>
      <img src="/duck-animation.gif" alt="Walking duck" style={{
        position: "absolute", left: "-150px", bottom: 0, height: 130, width: "auto",
        animation: "duckMoveAcross 6s linear infinite, duckWalkBob 0.3s ease-in-out infinite",
        transformOrigin: "bottom center",
        filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.25))",
      }} />
    </div>
  );
}

function TopBarNature() {
  return (
    <svg style={styles.topBarLeaf} viewBox="0 0 160 120" fill="none">
      <path d="M20 118c14-30 34-46 46-70" stroke="#C9BB98" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <g transform="translate(96,34) rotate(18)">
        <path d="M0 -30 L24 0 L0 30 L-24 0 Z" fill="#FF6B4A" />
        <path d="M0 -30 L24 0 L0 0 Z" fill="#FFB627" />
        <path d="M0 30 L-24 0 L0 0 Z" fill="#1E9C90" />
        <path d="M0 -30 L0 30 M-24 0 L24 0" stroke="#FFFFFF" strokeWidth="1.5" />
        <path d="M0 30c-3 8 3 10 0 18c-3 8 3 10 0 18" stroke="#C9BB98" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      </g>
      <circle cx="26" cy="24" r="3.5" fill="#FFB627" />
      <circle cx="14" cy="40" r="3" fill="#FF6B4A" />
      <circle cx="34" cy="46" r="2.6" fill="#1E9C90" />
    </svg>
  );
}
