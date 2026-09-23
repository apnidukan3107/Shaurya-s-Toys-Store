import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, ShoppingCart, Plus, Minus, X, ArrowLeft, Check,
  Settings, Package, ClipboardList, Trash2, Lock, Loader2,
  Pencil, ImagePlus, Tag
} from "lucide-react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

// ============ GOOGLE ANALYTICS 4 TRACKING (ENHANCED) ============
const trackGA = (eventName, eventData = {}) => {
  if (window.gtag) {
    window.gtag('event', eventName, eventData);
  }
};

// Custom event tracking function for detailed analytics
const trackCustomEvent = (eventName, properties = {}) => {
  trackGA(eventName, {
    timestamp: new Date().toISOString(),
    ...properties
  });
};

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

const SAMPLE_PRODUCTS = [
  {
    name: "Barbie Phone",
    category: "Dolls",
    price: 149,
    img: "🧸",
  },
  {
    name: "Barbie Car",
    category: "Dolls",
    price: 149,
    img: "🚗",
  },
];

function uid(prefix = "") {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
}

function App() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState({});
  const [view, setView] = useState("shop"); // shop | cart | admin | success
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("બધું");
  const [lastOrderId, setLastOrderId] = useState(null);
  const [customCategories, setCustomCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showProductList, setShowProductList] = useState(true);
  const [showOrders, setShowOrders] = useState(false);
  const [productStatus, setProductStatus] = useState("");

  // ---- Products Editor ----
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: CATEGORIES_DEFAULT[0],
    price: "",
    img: "🛍️",
    image: "",
    stock: "",
  });
  const [editingProductId, setEditingProductId] = useState(null);

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
        // Note: we never auto-fill with demo/placeholder products here.
        // A slow network causing a false "empty" read must never overwrite
        // real store data — if it's genuinely empty, the admin can add
        // products manually or use the sample-products button.
        setProducts(prod || []);

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

  // GA: Track page view on mount
  useEffect(() => {
    trackGA('page_view', {
      page_title: 'Shaurya\'s Toys Store',
      page_location: window.location.href
    });
  }, []);

  // GA: Track view changes
  useEffect(() => {
    trackCustomEvent('page_navigation', {
      page: view,
      cart_items: Object.values(cart).reduce((a, b) => a + b, 0)
    });
  }, [view]);

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
    // GA: Track add to cart
    const product = products.find(p => p.id === id);
    if (product) {
      trackGA('add_to_cart', {
        currency: 'INR',
        value: product.price,
        items: [{ item_id: product.id, item_name: product.name, price: product.price }]
      });
    }
  }

  // GA: Track product view
  function trackProductView(product) {
    trackGA('view_item', {
      items: [{
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        item_category: product.category
      }]
    });
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
    // GA: Track remove from cart
    const product = products.find(p => p.id === id);
    if (product) {
      trackCustomEvent('remove_from_cart', {
        item_id: product.id,
        item_name: product.name,
        price: product.price
      });
    }
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
    const totalWithDelivery = cartTotal + (cartTotal > 999 ? 0 : 49);
    const order = {
      id: uid("ord"),
      items: cartItems.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
      total: totalWithDelivery,
      customer: { ...checkoutForm },
      payment: "કેશ ઓન ડિલિવરી",
      status: "નવો",
      createdAt: new Date().toISOString(),
    };
    // GA: Track purchase with revenue
    trackGA('purchase', {
      transaction_id: order.id,
      currency: 'INR',
      value: totalWithDelivery,
      shipping: cartTotal > 999 ? 0 : 49,
      tax: 0,
      items: cartItems.map(i => ({
        item_id: i.id,
        item_name: i.name,
        price: i.price,
        quantity: i.qty,
        item_category: i.category
      }))
    });

    // GA: Track checkout
    trackCustomEvent('begin_checkout', {
      currency: 'INR',
      value: totalWithDelivery,
      items_count: cartItems.length
    });

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

  async function seedSampleProducts() {
    const existingNames = new Set(products.map((p) => p.name));
    const toAdd = SAMPLE_PRODUCTS.filter((sp) => !existingNames.has(sp.name)).map((sp) => ({
      id: uid("p"),
      ...sp,
    }));
    if (toAdd.length === 0) {
      setProductStatus("આ પ્રોડક્ટ્સ પહેલેથી જ ઉમેરાયેલા છે");
      setTimeout(() => setProductStatus(""), 3000);
      return;
    }
    const next = [...toAdd, ...products];
    setProducts(next);
    setProductStatus("સેવ થાય છે...");
    try {
      await storageSet("products", JSON.stringify(next));
      setProductStatus(`✅ ${toAdd.length} નમૂના પ્રોડક્ટ્સ ઉમેરાયા`);
      setTimeout(() => setProductStatus(""), 3000);
    } catch {
      setProductStatus("⚠️ સેવ કરવામાં તકલીફ પડી");
      setTimeout(() => setProductStatus(""), 3000);
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
      const img = new Image();
      img.onload = () => {
        const maxDim = 700;
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.7);
        setNewProduct((f) => ({ ...f, image: compressed }));
      };
      img.onerror = () => {
        setNewProduct((f) => ({ ...f, image: reader.result }));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  // ---- Bulk add: multiple products at once ----
  const emptyBulkRow = () => ({ name: "", price: "", stock: "", category: CATEGORIES_DEFAULT[0], image: "", img: "🛍️" });
  const [bulkRows, setBulkRows] = useState([emptyBulkRow(), emptyBulkRow(), emptyBulkRow()]);
  const [bulkAddStatus, setBulkAddStatus] = useState("");
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  function updateBulkRow(idx, field, value) {
    setBulkRows((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function handleBulkRowImageFile(idx, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 700;
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.7);
        updateBulkRow(idx, "image", compressed);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function addBulkRow() {
    setBulkRows((rows) => (rows.length >= 10 ? rows : [...rows, emptyBulkRow()]));
  }

  function removeBulkRow(idx) {
    setBulkRows((rows) => rows.filter((_, i) => i !== idx));
  }

  async function saveBulkProducts() {
    const toAdd = bulkRows
      .filter((r) => r.name.trim() && r.price)
      .map((r) => ({
        id: uid("p"),
        name: r.name.trim(),
        category: r.category || CATEGORIES_DEFAULT[0],
        price: Number(r.price),
        img: r.img || "🛍️",
        image: r.image || undefined,
        stock: r.stock ? Number(r.stock) : undefined,
      }));
    if (toAdd.length === 0) {
      setBulkAddStatus("⚠️ નમૂનાઓમાં નામ અને ભાવ ભરો");
      setTimeout(() => setBulkAddStatus(""), 3000);
      return;
    }
    const next = [...toAdd, ...products];
    setProducts(next);
    setBulkAddStatus("સેવ થાય છે...");
    try {
      await storageSet("products", JSON.stringify(next));
      setBulkAddStatus(`✅ ${toAdd.length} પ્રોડક્ટ્સ ઉમેરાયા`);
      setBulkRows([emptyBulkRow(), emptyBulkRow(), emptyBulkRow()]);
      setTimeout(() => setBulkAddStatus(""), 2000);
    } catch {
      setBulkAddStatus("⚠️ સેવ કરવામાં તકલીફ પડી");
      setTimeout(() => setBulkAddStatus(""), 3000);
    }
  }

  async function deleteProduct(id) {
    const next = products.filter((p) => p.id !== id);
    setProducts(next);
    try {
      await storageSet("products", JSON.stringify(next));
    } catch {
      setProductStatus("⚠️ ડીલીટ કરવામાં તકલીફ પડી");
      setTimeout(() => setProductStatus(""), 3000);
    }
  }

  async function saveCustomCategory() {
    if (!newCategoryName.trim()) return;
    const next = [newCategoryName.trim(), ...customCategories];
    setCustomCategories(next);
    setNewCategoryName("");
    try {
      await storageSet("customCategories", JSON.stringify(next));
    } catch {}
  }

  async function deleteCustomCategory(cat) {
    const next = customCategories.filter((c) => c !== cat);
    setCustomCategories(next);
    try {
      await storageSet("customCategories", JSON.stringify(next));
    } catch {}
  }

  // GA: Track search
  const handleSearch = useCallback((newQuery) => {
    setQuery(newQuery);
    if (newQuery.trim()) {
      trackCustomEvent('search', {
        search_term: newQuery,
        results_count: filtered.filter(p => p.name.toLowerCase().includes(newQuery.toLowerCase())).length
      });
    }
  }, [filtered]);

  // GA: Track category filter
  const handleCategoryFilter = useCallback((cat) => {
    setCategory(cat);
    trackCustomEvent('view_item_list', {
      item_category: cat,
      items_count: products.filter(p => p.category === cat || cat === "બધું").length
    });
  }, [products]);

  // GA: Track cart abandonment
  useEffect(() => {
    if (cartCount > 0 && view === 'shop') {
      const timer = setTimeout(() => {
        trackCustomEvent('cart_abandonment', {
          cart_value: cartTotal,
          items_count: cartCount,
          items: cartItems.map(i => ({
            item_id: i.id,
            item_name: i.name,
            price: i.price,
            quantity: i.qty
          }))
        });
      }, 180000); // 3 minutes of inactivity
      return () => clearTimeout(timer);
    }
  }, [cart, view, cartTotal, cartCount, cartItems]);

  // Design styles remain unchanged
  const T = {
    bg: "#FFF8F0",
    surface: "#FFFAF7",
    surface2: "#F5EEEA",
    hairline: "#D9C4B8",
    inkSoft: "#A89080",
    ink: "#6D5F57",
  };

  const styles = {
    container: {
      background: T.bg,
      color: T.ink,
      minHeight: "100vh",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: 14,
      lineHeight: 1.5,
      WebkitFontSmoothing: "antialiased",
    },
    topBar: {
      background: T.surface,
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      borderBottom: `1px solid ${T.hairline}`,
      position: "sticky",
      top: 0,
      zIndex: 10,
      backdropFilter: "blur(4px)",
    },
    topBarLeaf: {
      width: 24,
      height: 24,
      minWidth: 24,
    },
    menuBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 0,
      display: "flex",
      alignItems: "center",
      gap: 4,
    },
    searchInput: {
      flex: 1,
      padding: "6px 12px",
      border: `1px solid ${T.hairline}`,
      borderRadius: 20,
      background: T.surface,
      color: T.ink,
      fontSize: 13,
      outline: "none",
    },
    cartBtn: {
      background: "#FF6B4A",
      color: "#FFF",
      border: "none",
      borderRadius: "50%",
      width: 40,
      height: 40,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      position: "relative",
    },
    mainContent: {
      padding: "16px",
      paddingBottom: "80px",
    },
    categoryBar: {
      display: "flex",
      gap: 8,
      overflowX: "auto",
      marginBottom: 16,
      paddingBottom: 8,
      scrollBehavior: "smooth",
    },
    categoryBtn: (isActive) => ({
      padding: "8px 16px",
      border: isActive ? "none" : `1px solid ${T.hairline}`,
      borderRadius: 20,
      background: isActive ? "#FF6B4A" : T.surface,
      color: isActive ? "#FFF" : T.ink,
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      whiteSpace: "nowrap",
      flexShrink: 0,
    }),
    productGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
      gap: 12,
    },
    productCard: {
      background: T.surface,
      border: `1px solid ${T.hairline}`,
      borderRadius: 12,
      padding: 12,
      textAlign: "center",
      cursor: "pointer",
      transition: "all 0.2s",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    },
    productImage: {
      fontSize: 48,
      minHeight: 80,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: T.surface2,
      borderRadius: 8,
    },
    productActualImage: {
      width: "100%",
      height: 80,
      objectFit: "cover",
      borderRadius: 8,
    },
    productName: {
      fontSize: 13,
      fontWeight: 600,
      color: T.ink,
    },
    productPrice: {
      fontSize: 14,
      fontWeight: 700,
      color: "#FF6B4A",
    },
    addBtn: {
      padding: "6px 12px",
      background: "#FFB627",
      color: "#FFF",
      border: "none",
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
    },
    cartPage: {
      maxWidth: 600,
      margin: "0 auto",
    },
    cartItem: {
      background: T.surface,
      border: `1px solid ${T.hairline}`,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      display: "flex",
      gap: 12,
    },
    cartItemImage: {
      fontSize: 48,
      width: 80,
      height: 80,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: T.surface2,
      borderRadius: 8,
      flexShrink: 0,
    },
    cartItemActualImage: {
      width: 80,
      height: 80,
      objectFit: "cover",
      borderRadius: 8,
      flexShrink: 0,
    },
    cartItemBody: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 6,
    },
    quantityControl: {
      display: "flex",
      gap: 6,
      alignItems: "center",
    },
    quantityBtn: {
      background: T.surface2,
      border: "none",
      width: 24,
      height: 24,
      borderRadius: 4,
      cursor: "pointer",
      fontSize: 12,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    textInput: {
      padding: "10px 12px",
      border: `1px solid ${T.hairline}`,
      borderRadius: 8,
      background: T.surface,
      color: T.ink,
      fontSize: 14,
      fontFamily: "inherit",
      outline: "none",
    },
    primaryBtn: {
      padding: "12px 16px",
      background: "#FF6B4A",
      color: "#FFF",
      border: "none",
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
    },
    adminPanel: {
      background: T.surface,
      border: `1px solid ${T.hairline}`,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    adminSectionTitle: {
      fontSize: 16,
      fontWeight: 700,
      color: T.ink,
      margin: "12px 0",
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    label: {
      fontSize: 12,
      fontWeight: 600,
      color: T.inkSoft,
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    productRow: {
      background: T.surface2,
      border: `1px solid ${T.hairline}`,
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
    },
    productRowImage: {
      fontSize: 32,
      width: 64,
      height: 64,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: T.surface,
      borderRadius: 6,
      flexShrink: 0,
    },
    productRowActualImage: {
      width: 64,
      height: 64,
      objectFit: "cover",
      borderRadius: 6,
      flexShrink: 0,
    },
    productRowBody: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 4,
    },
  };

  // Now render the actual UI — layout is 100% unchanged
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.topBar}>
          <TopBarNature />
          <span style={{ fontSize: 16, fontWeight: 700 }}>Shaurya's Toys Store</span>
          <div />
        </div>
        <div style={styles.mainContent}>
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <Loader2 size={32} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
            <p>ડેટા લોડ થાય છે...</p>
          </div>
        </div>
      </div>
    );
  }

  // All view branches remain exactly the same — SHOP, CART, ADMIN, SUCCESS
  if (view === "success") {
    return (
      <div style={styles.container}>
        <div style={styles.topBar}>
          <TopBarNature />
          <span style={{ fontSize: 16, fontWeight: 700 }}>Shaurya's Toys Store</span>
          <div />
        </div>
        <div style={styles.mainContent}>
          <div style={{ textAlign: "center", marginTop: 80 }}>
            <div style={{ fontSize: 80, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>આપનો ઓર્ડર સફળ થયો!</div>
            <p style={{ color: T.inkSoft, marginBottom: 24 }}>આમ કાલ ૧-૨ કલાકમાં આપનો ડિલીવરી આવી જશે. તમારી ઓર્ડર ID: <strong>{lastOrderId}</strong></p>
            <button
              style={styles.primaryBtn}
              onClick={() => {
                setView("shop");
                setCart({});
              }}
            >
              ફરીથી શોપિંગ કરો
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "admin") {
    return (
      <div style={styles.container}>
        <div style={styles.topBar}>
          <button style={styles.menuBtn} onClick={() => setView("shop")}>
            <ArrowLeft size={18} /> પાછું
          </button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>એડમિન પેનલ</span>
          <div />
        </div>
        <div style={styles.mainContent}>
          {loadError && (
            <div style={{ background: "#FFE0DC", border: "1px solid #FF9880", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12 }}>
              ⚠️ {loadError}
            </div>
          )}

          <div style={styles.adminPanel}>
            <div style={styles.adminSectionTitle}>
              <Settings size={16} /> સેટિંગ્સ
            </div>

            <label style={{ ...styles.label, display: "block", marginBottom: 8 }}>નિયમ વર્ગ ઉમેરો</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ ...styles.textInput, flex: 1 }}
                placeholder="દા.ત. 'રમણ સામગ્રી'"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <button style={styles.primaryBtn} onClick={saveCustomCategory}>
                <Plus size={14} />
              </button>
            </div>
            {customCategories.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {customCategories.map((cat) => (
                  <div key={cat} style={{ background: T.surface, border: `1px solid ${T.hairline}`, borderRadius: 8, padding: "6px 12px", display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12 }}>{cat}</span>
                    <button style={{ background: "none", border: "none", cursor: "pointer", color: "#b23b3b" }} onClick={() => deleteCustomCategory(cat)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.adminPanel}>
            <div style={styles.adminSectionTitle}>
              <Package size={16} /> નવું પ્રોડક્ટ ઉમેરો
            </div>
            <label style={{ ...styles.label, display: "block", marginBottom: 8 }}>પ્રોડક્ટનું નામ</label>
            <input
              style={styles.textInput}
              placeholder="દા.ત. 'બાર્બી ઘર'"
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
                {p.image ? (
                  <img src={p.image} alt={p.name} style={styles.productRowActualImage} />
                ) : (
                  <div style={styles.productRowImage}>{p.img || "🛍️"}</div>
                )}
                <div style={styles.productRowBody}>
                  <div style={{ fontWeight: 700, color: T.ink }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: T.inkSoft }}>
                    {p.category} • ₹{p.price} {p.stock !== undefined && `• સ્ટોક: ${p.stock}`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    style={{ background: "none", border: "none", cursor: "pointer", color: T.inkSoft }}
                    onClick={() => startEditProduct(p)}
                    aria-label="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#b23b3b" }}
                    onClick={() => deleteProduct(p.id)}
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

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
              onClick={() => setShowBulkAdd((v) => !v)}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={16} /> બલ્ક ઉમેરો
              </span>
              <span style={{ fontSize: 11, color: T.inkSoft, fontWeight: 700 }}>
                {showBulkAdd ? "છુપાવો ▲" : "જુઓ ▼"}
              </span>
            </button>
            {showBulkAdd && (
              <div style={{ marginTop: 12 }}>
                {bulkRows.map((r, idx) => (
                  <div key={idx} style={{ ...styles.productRow, marginTop: 8 }}>
                    <input
                      style={{ ...styles.textInput, flex: 1, fontSize: 12 }}
                      placeholder="નામ"
                      value={r.name}
                      onChange={(e) => updateBulkRow(idx, "name", e.target.value)}
                    />
                    <input
                      style={{ ...styles.textInput, width: 60, fontSize: 12 }}
                      placeholder="ભાવ ₹"
                      type="number"
                      value={r.price}
                      onChange={(e) => updateBulkRow(idx, "price", e.target.value)}
                    />
                    <button
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#b23b3b" }}
                      onClick={() => removeBulkRow(idx)}
                      aria-label="Remove"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <button style={{ ...styles.primaryBtn, marginTop: 12, width: "100%" }} onClick={addBulkRow}>
                  <Plus size={14} /> પંક્તિ ઉમેરો
                </button>
                <button style={{ ...styles.primaryBtn, marginTop: 12, width: "100%" }} onClick={saveBulkProducts}>
                  બધું સેવ કરો
                </button>
                {bulkAddStatus && <p style={{ fontSize: 12, marginTop: 6, fontWeight: 700 }}>{bulkAddStatus}</p>}
              </div>
            )}

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
              onClick={() => setShowOrders((v) => !v)}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ClipboardList size={16} /> ઓર્ડર્સ ({orders.length})
              </span>
              <span style={{ fontSize: 11, color: T.inkSoft, fontWeight: 700 }}>
                {showOrders ? "છુપાવો ▲" : "જુઓ ▼"}
              </span>
            </button>
            {showOrders && (
              <div style={{ marginTop: 12 }}>
                {orders.length === 0 ? (
                  <p style={{ color: T.inkSoft, textAlign: "center", marginTop: 16 }}>કોઈ ઓર્ડર નથી</p>
                ) : (
                  orders.map((order) => (
                    <div key={order.id} style={{ ...styles.adminPanel }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <strong>Order #{orders.indexOf(order) + 1}</strong>
                        <span style={{ color: T.inkSoft, fontSize: 12 }}>₹{order.total}</span>
                      </div>
                      <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 8 }}>
                        {order.customer.name} • {order.customer.phone}
                      </div>
                      <div style={{ fontSize: 12, marginBottom: 8 }}>
                        {order.items.map((item) => (
                          <div key={item.id}>
                            {item.name} × {item.qty}
                          </div>
                        ))}
                      </div>
                      <select
                        style={{ ...styles.textInput, width: "100%", fontSize: 12 }}
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      >
                        <option value="નવો">નવો</option>
                        <option value="પ્રોસેસીંગ">પ્રોસેસીંગ</option>
                        <option value="ડિલીવર થયો">ડિલીવર થયો</option>
                        <option value="કેન્સલ">કેન્સલ</option>
                      </select>
                    </div>
                  ))
                )}
              </div>
            )}

            <button style={{ ...styles.primaryBtn, width: "100%", marginTop: 24 }} onClick={() => seedSampleProducts()}>
              નમૂના પ્રોડક્ટ્સ ઉમેરો
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "cart") {
    return (
      <div style={styles.container}>
        <div style={styles.topBar}>
          <button style={styles.menuBtn} onClick={() => setView("shop")}>
            <ArrowLeft size={18} /> પાછું
          </button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>શોપિંગ કાર્ટ</span>
          <div />
        </div>
        <div style={styles.mainContent}>
          {cartItems.length === 0 ? (
            <div style={{ textAlign: "center", marginTop: 80 }}>
              <div style={{ fontSize: 64, marginBottom: 12 }}>🛒</div>
              <p style={{ color: T.inkSoft }}>તમારી કાર્ટ ખાલી છે</p>
              <button style={styles.primaryBtn} onClick={() => setView("shop")}>
                શોપિંગ શરૂ કરો
              </button>
            </div>
          ) : (
            <div style={styles.cartPage}>
              {cartItems.map((item) => (
                <div key={item.id} style={styles.cartItem}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} style={styles.cartItemActualImage} />
                  ) : (
                    <div style={styles.cartItemImage}>{item.img || "🛍️"}</div>
                  )}
                  <div style={styles.cartItemBody}>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: T.inkSoft }}>{item.category}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#FF6B4A" }}>₹{item.price * item.qty}</div>
                    <div style={styles.quantityControl}>
                      <button style={styles.quantityBtn} onClick={() => decFromCart(item.id)}>
                        <Minus size={12} />
                      </button>
                      <span style={{ fontSize: 12, fontWeight: 600, minWidth: 20, textAlign: "center" }}>{item.qty}</span>
                      <button style={styles.quantityBtn} onClick={() => addToCart(item.id)}>
                        <Plus size={12} />
                      </button>
                      <button
                        style={{ ...styles.quantityBtn, marginLeft: "auto", background: "none", color: "#b23b3b" }}
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ ...styles.adminPanel, marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span>આઇટમ્સ ક્ષમતા</span>
                  <strong>₹{cartTotal}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, borderBottom: `1px solid ${T.hairline}`, paddingBottom: 8 }}>
                  <span>ડિલીવરી</span>
                  <strong>{cartTotal > 999 ? "FREE" : "₹49"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700 }}>
                  <span>કુલ</span>
                  <strong>₹{cartTotal + (cartTotal > 999 ? 0 : 49)}</strong>
                </div>
              </div>

              <div style={{ ...styles.adminPanel, marginTop: 16 }}>
                <label style={{ ...styles.label, display: "block", marginBottom: 8 }}>અમે તમને ક્યાં અપલોડ કરીએ?</label>
                <input
                  style={styles.textInput}
                  placeholder="નામ"
                  value={checkoutForm.name}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, name: e.target.value })}
                />
                <input
                  style={{ ...styles.textInput, marginTop: 8 }}
                  placeholder="ફોન નંબર"
                  value={checkoutForm.phone}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                />
                <input
                  style={{ ...styles.textInput, marginTop: 8 }}
                  placeholder="સરનામું"
                  value={checkoutForm.address}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                />
                {checkoutError && <p style={{ color: "#b23b3b", fontSize: 12, marginTop: 8 }}>⚠️ {checkoutError}</p>}
                <button
                  style={{ ...styles.primaryBtn, width: "100%", marginTop: 12 }}
                  onClick={placeOrder}
                  disabled={saving}
                >
                  {saving ? "ઓર્ડર થઈ રહ્યો..." : "ઓર્ડર કરો"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default shop view
  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button style={styles.menuBtn} onClick={() => setView("admin")}>
          <Lock size={18} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <Search size={16} color={T.inkSoft} />
          <input
            style={styles.searchInput}
            placeholder="શોધો..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <button style={styles.cartBtn} onClick={() => setView("cart")}>
          <ShoppingCart size={16} />
          {cartCount > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: "#FFB627", width: 20, height: 20, borderRadius: "50%", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>}
        </button>
      </div>

      {loadError && (
        <div style={{ background: "#FFE0DC", border: "1px solid #FF9880", borderRadius: 8, padding: 12, margin: 16, fontSize: 12 }}>
          ⚠️ {loadError}
        </div>
      )}

      <div style={{ ...styles.mainContent, paddingTop: 0 }}>
        <div style={styles.categoryBar}>
          {categories.map((cat) => (
            <button
              key={cat}
              style={styles.categoryBtn(category === cat)}
              onClick={() => handleCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <p style={{ color: T.inkSoft }}>કોઈ પરિણામ નથી</p>
          </div>
        ) : (
          <div style={styles.productGrid}>
            {filtered.map((p) => (
              <div
                key={p.id}
                style={styles.productCard}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                {p.image ? (
                  <img src={p.image} alt={p.name} style={styles.productActualImage} onClick={() => trackProductView(p)} />
                ) : (
                  <div style={styles.productImage} onClick={() => trackProductView(p)}>
                    {p.img || "🛍️"}
                  </div>
                )}
                <div style={styles.productName}>{p.name}</div>
                <div style={styles.productPrice}>₹{p.price}</div>
                {p.stock === 0 ? (
                  <div style={{ fontSize: 12, color: "#b23b3b", fontWeight: 600 }}>સ્ટોક ચૂક્યું</div>
                ) : (
                  <button style={styles.addBtn} onClick={() => addToCart(p.id)}>
                    <Plus size={12} /> ઉમેરો
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <LoadingDuck />
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function LoadingDuck() {
  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      height: 120,
      background: "linear-gradient(to top, #FFF8F0, transparent)",
      pointerEvents: "none",
      zIndex: 1,
    }}>
      <svg viewBox="0 0 400 100" style={{ width: "100%", height: "100%" }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>{`
            @keyframes duckWalk {
              0%   { left: 0%; }
              14%  { left: calc(50% - 65px); }
              24%  { left: calc(50% - 65px); }
              38%  { left: 100%; }
              43%  { left: 100%; }
              48%  { left: calc(100% - 130px); }
              62%  { left: calc(50% - 65px); }
              72%  { left: calc(50% - 65px); }
              86%  { left: -130px; }
              91%  { left: -130px; }
              96%  { left: 0%; }
              100% { left: 0%; }
            }
            @keyframes duckFlip {
              0%   { transform: scaleX(1); }
              23%  { transform: scaleX(1); }
              25%  { transform: scaleX(1); }
              47%  { transform: scaleX(1); }
              49%  { transform: scaleX(-1); }
              71%  { transform: scaleX(-1); }
              73%  { transform: scaleX(-1); }
              95%  { transform: scaleX(-1); }
              97%  { transform: scaleX(1); }
              100% { transform: scaleX(1); }
            }
            @keyframes duckBubble {
              0%   { transform: translateX(-50%) scale(0); opacity: 0; }
              12%  { transform: translateX(-50%) scale(0); opacity: 0; }
              15%  { transform: translateX(-50%) scale(1.15); opacity: 1; }
              18%  { transform: translateX(-50%) scale(1); opacity: 1; }
              23%  { transform: translateX(-50%) scale(1); opacity: 1; }
              25%  { transform: translateX(-50%) scale(0); opacity: 0; }
              60%  { transform: translateX(-50%) scale(0); opacity: 0; }
              63%  { transform: translateX(-50%) scale(1.15); opacity: 1; }
              66%  { transform: translateX(-50%) scale(1); opacity: 1; }
              71%  { transform: translateX(-50%) scale(1); opacity: 1; }
              73%  { transform: translateX(-50%) scale(0); opacity: 0; }
              100% { transform: translateX(-50%) scale(0); opacity: 0; }
            }
          `}</style>
        </defs>
      </svg>
    </div>
  );
}

function TopBarNature() {
  return (
    <svg style={{ width: 24, height: 24, minWidth: 24 }} viewBox="0 0 160 120" fill="none">
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

export default App;
