import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, ShoppingCart, Plus, Minus, X, ArrowLeft, Check,
  Settings, Package, ClipboardList, Trash2, Lock, Loader2,
  Pencil, ImagePlus, Tag
} from "lucide-react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

// ============ GOOGLE ANALYTICS 4 SETUP ============
// Add this to your HTML <head> section:
// <script async src="https://www.googletagmanager.com/gtag/js?id=G-86L8EDT4DY"></script>
// Then add this script in your index.html or here:
// <script>
//   window.dataLayer = window.dataLayer || [];
//   function gtag(){dataLayer.push(arguments);}
//   gtag('js', new Date());
//   gtag('config', 'G-86L8EDT4DY');
// </script>

// Wrapper to track GA events
const trackGA = (eventName, eventData = {}) => {
  if (window.gtag) {
    window.gtag('event', eventName, eventData);
  }
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
    sku: "SKU001"
  },
  {
    name: "Soft Teddy Bear",
    category: "Soft Toys",
    price: 299,
    img: "🐻",
    sku: "SKU002"
  },
  {
    name: "Remote Control Car",
    category: "Remote Control Toys",
    price: 599,
    img: "🚗",
    sku: "SKU003"
  },
  {
    name: "Building Blocks",
    category: "Puzzles & Games",
    price: 199,
    img: "🎲",
    sku: "SKU004"
  }
];

export default function App() {
  const [products, setProducts] = useState(SAMPLE_PRODUCTS);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: CATEGORIES_DEFAULT[0],
    price: 0,
    img: "🧸",
    sku: ""
  });
  const [customCategories, setCustomCategories] = useState([]);

  // Initialize Firestore listeners
  useEffect(() => {
    const unsubProducts = storageListen("products", (value) => {
      if (Array.isArray(value) && value.length > 0) {
        setProducts(value);
      }
    });

    const unsubOrders = storageListen("orders", (value) => {
      if (Array.isArray(value)) {
        setOrders(value);
      }
    });

    const unsubCategories = storageListen("customCategories", (value) => {
      if (Array.isArray(value)) {
        setCustomCategories(value);
      }
    });

    return () => {
      unsubProducts();
      unsubOrders();
      unsubCategories();
    };
  }, []);

  // PAGE VIEW TRACKING (when store loads)
  useEffect(() => {
    trackGA('page_view', {
      page_title: 'Shaurya Toys Store',
      page_location: window.location.href
    });
  }, []);

  const availableCategories = useMemo(
    () => [...CATEGORIES_DEFAULT, ...customCategories],
    [customCategories]
  );

  // SEARCH TRACKING
  const handleSearch = useCallback((query) => {
    setSearch(query);
    if (query.trim()) {
      trackGA('search', {
        search_term: query,
        results_count: filteredProducts.length
      });
    }
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  // ADD TO CART TRACKING
  const handleAddToCart = useCallback((product) => {
    const existing = cart.find((p) => p.sku === product.sku);
    let newQty = 1;
    if (existing) {
      newQty = existing.qty + 1;
      setCart(cart.map((p) => p.sku === product.sku ? { ...p, qty: newQty } : p));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }

    // TRACK: add_to_cart event
    trackGA('add_to_cart', {
      currency: 'INR',
      value: product.price,
      items: [{
        item_id: product.sku,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        quantity: newQty
      }]
    });
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [cart]);

  // PURCHASE/CHECKOUT TRACKING
  const handleCheckout = useCallback(async () => {
    if (cart.length === 0) return;

    const order = {
      id: Date.now(),
      items: cart,
      total: cartTotal,
      timestamp: new Date().toISOString(),
      status: "pending"
    };

    const newOrders = [...orders, order];
    await storageSet("orders", newOrders);
    setOrders(newOrders);

    // TRACK: purchase event with REVENUE
    trackGA('purchase', {
      transaction_id: order.id.toString(),
      currency: 'INR',
      value: cartTotal,
      items: cart.map(item => ({
        item_id: item.sku,
        item_name: item.name,
        item_category: item.category,
        price: item.price,
        quantity: item.qty
      }))
    });

    // ALSO TRACK: view_cart (good for funnel analysis)
    trackGA('begin_checkout', {
      currency: 'INR',
      value: cartTotal,
      items: cart.map(item => ({
        item_id: item.sku,
        item_name: item.name
      }))
    });

    setCart([]);
    alert("✅ Order #" + order.id + " placed! Thank you!");
  }, [cart, cartTotal, orders]);

  const handleDeleteProduct = useCallback(async (sku) => {
    const updated = products.filter((p) => p.sku !== sku);
    await storageSet("products", updated);
    setProducts(updated);
  }, [products]);

  const handleEditProduct = useCallback(
    async (sku, updatedData) => {
      const updated = products.map((p) =>
        p.sku === sku ? { ...p, ...updatedData } : p
      );
      await storageSet("products", updated);
      setProducts(updated);
      setEditingProduct(null);
    },
    [products]
  );

  const handleAddProduct = useCallback(async () => {
    if (!newProduct.name || !newProduct.sku || newProduct.price <= 0) {
      alert("Please fill in all fields!");
      return;
    }

    const isDuplicate = products.some((p) => p.sku === newProduct.sku);
    if (isDuplicate) {
      alert("SKU already exists!");
      return;
    }

    const updated = [...products, newProduct];
    await storageSet("products", updated);
    setProducts(updated);
    setNewProduct({
      name: "",
      category: CATEGORIES_DEFAULT[0],
      price: 0,
      img: "🧸",
      sku: ""
    });
    setShowAddProduct(false);
  }, [products, newProduct]);

  const handleAddCategory = useCallback(async () => {
    const newCategory = prompt("Enter new category name:");
    if (newCategory && !availableCategories.includes(newCategory)) {
      const updated = [...customCategories, newCategory];
      await storageSet("customCategories", updated);
      setCustomCategories(updated);
    }
  }, [customCategories, availableCategories]);

  // ADMIN PANEL
  if (showAdmin) {
    if (!adminUnlocked) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <Lock className="mx-auto mb-4 text-purple-600" size={48} />
            <h1 className="text-2xl font-bold text-center mb-6">🔐 Admin Panel</h1>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && adminPassword === "1234") {
                  setAdminUnlocked(true);
                }
              }}
              placeholder="Enter admin password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
            <button
              onClick={() => {
                if (adminPassword === "1234") {
                  setAdminUnlocked(true);
                } else {
                  alert("❌ Wrong password!");
                }
              }}
              className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700"
            >
              Unlock Admin
            </button>
            <button
              onClick={() => setShowAdmin(false)}
              className="w-full mt-3 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400"
            >
              Back to Store
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <button
          onClick={() => {
            setShowAdmin(false);
            setAdminUnlocked(false);
            setAdminPassword("");
          }}
          className="mb-6 flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
        >
          <ArrowLeft size={20} /> Exit Admin
        </button>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600">Total Orders</p>
            <p className="text-3xl font-bold text-blue-600">{orders.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600">Total Products</p>
            <p className="text-3xl font-bold text-green-600">{products.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600">Total Revenue</p>
            <p className="text-3xl font-bold text-orange-600">
              ₹{orders.reduce((sum, o) => sum + o.total, 0)}
            </p>
          </div>
        </div>

        {/* Orders */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ClipboardList size={24} /> Orders ({orders.length})
          </h2>
          <div className="space-y-4">
            {orders.length === 0 ? (
              <p className="text-gray-500">No orders yet</p>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="border-l-4 border-blue-500 pl-4 py-3">
                  <p className="font-semibold">Order #{order.id}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(order.timestamp).toLocaleString()}
                  </p>
                  <p className="text-sm">
                    Items: {order.items.length} | Total: ₹{order.total}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Status: <span className="font-semibold">{order.status}</span>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Products Management */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Package size={24} /> Products ({products.length})
            </h2>
            <div className="space-x-2">
              <button
                onClick={handleAddCategory}
                className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600"
              >
                + Category
              </button>
              <button
                onClick={() => setShowAddProduct(!showAddProduct)}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
              >
                + Product
              </button>
            </div>
          </div>

          {showAddProduct && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-300">
              <h3 className="font-bold mb-4">Add New Product</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Product Name"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="text"
                  placeholder="SKU (e.g., SKU001)"
                  value={newProduct.sku}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, sku: e.target.value })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={newProduct.price || ""}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      price: parseFloat(e.target.value) || 0
                    })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <select
                  value={newProduct.category}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, category: e.target.value })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Emoji (e.g., 🧸)"
                  value={newProduct.img}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, img: e.target.value })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAddProduct}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                >
                  ✅ Add Product
                </button>
                <button
                  onClick={() => setShowAddProduct(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {products.map((product) => (
              <div key={product.sku} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{product.img}</span>
                  <div>
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-gray-600">
                      {product.category} • SKU: {product.sku} • ₹{product.price}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingProduct(product.sku)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 flex items-center gap-1"
                  >
                    <Pencil size={16} /> Edit
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Delete this product?")) {
                        handleDeleteProduct(product.sku);
                      }
                    }}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 flex items-center gap-1"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>

                {/* Edit Form */}
                {editingProduct === product.sku && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                      <h3 className="text-lg font-bold mb-4">Edit Product</h3>
                      <div className="space-y-3">
                        <input
                          type="text"
                          defaultValue={product.name}
                          onChange={(e) => {
                            const updated = { ...product, name: e.target.value };
                            handleEditProduct(product.sku, updated);
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="Product Name"
                        />
                        <input
                          type="number"
                          defaultValue={product.price}
                          onChange={(e) => {
                            const updated = { ...product, price: parseFloat(e.target.value) };
                            handleEditProduct(product.sku, updated);
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="Price"
                        />
                        <button
                          onClick={() => setEditingProduct(null)}
                          className="w-full bg-gray-500 text-white py-2 rounded-lg"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // CUSTOMER STORE VIEW
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-yellow-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-pink-500 to-orange-500 text-white p-4 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🧸 Shaurya's Toys Store
          </h1>
          <button
            onClick={() => setShowAdmin(true)}
            className="bg-white text-pink-600 px-4 py-2 rounded-lg font-semibold hover:bg-pink-100 flex items-center gap-2"
          >
            <Settings size={20} /> Admin
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 pb-96">
        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-3 text-gray-400" size={20} />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search toys by name or category..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <div
                key={product.sku}
                className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer transform hover:scale-105"
                onClick={() => handleAddToCart(product)}
              >
                <div className="text-6xl text-center py-8 bg-gradient-to-b from-gray-100 to-white">
                  {product.img}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-500">{product.category}</p>
                  <p className="text-lg font-bold text-pink-600 mt-2">
                    ₹{product.price}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                    className="w-full mt-3 bg-pink-500 text-white py-2 rounded-lg hover:bg-pink-600 flex items-center justify-center gap-2 font-semibold"
                  >
                    <Plus size={18} /> Add to Cart
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 text-lg">No toys found 😢</p>
            </div>
          )}
        </div>
      </main>

      {/* Cart Sidebar */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl overflow-y-auto z-50">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ShoppingCart size={24} /> Cart
          </h2>

          {cart.length === 0 ? (
            <p className="text-gray-500 text-center py-8">🛒 Empty Cart</p>
          ) : (
            <>
              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.sku} className="border-b pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">
                          {item.name}
                        </p>
                        <p className="text-sm text-gray-600">₹{item.price}</p>
                      </div>
                      <button
                        onClick={() =>
                          setCart(cart.filter((p) => p.sku !== item.sku))
                        }
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setCart(
                            cart.map((p) =>
                              p.sku === item.sku && p.qty > 1
                                ? { ...p, qty: p.qty - 1 }
                                : p
                            )
                          )
                        }
                        className="bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="flex-1 text-center font-bold">
                        {item.qty}
                      </span>
                      <button
                        onClick={() =>
                          setCart(
                            cart.map((p) =>
                              p.sku === item.sku
                                ? { ...p, qty: p.qty + 1 }
                                : p
                            )
                          )
                        }
                        className="bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Checkout Section */}
              <div className="border-t pt-4">
                <div className="mb-4 p-3 bg-pink-50 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span>Subtotal:</span>
                    <span>₹{cartTotal}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-pink-600">
                    <span>Total:</span>
                    <span>₹{cartTotal}</span>
                  </div>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-green-500 text-white py-3 rounded-lg font-bold hover:bg-green-600 flex items-center justify-center gap-2"
                >
                  <Check size={20} /> Checkout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
