import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, ShoppingCart, Plus, Minus, X, ArrowLeft, Check,
  Settings, Package, ClipboardList, Trash2, Lock, Loader2,
  Pencil, ImagePlus, Tag, BarChart3, TrendingUp, DollarSign, Activity
} from "lucide-react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

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

// ========== EVENT TRACKING SYSTEM ==========
// Track key business events (purchases, searches, cart additions)
async function trackEvent(eventName, data = {}) {
  try {
    const snap = await getDoc(doc(db, "store", "events"));
    const events = snap.exists() ? snap.data().value || [] : [];
    
    const eventData = {
      name: eventName,
      timestamp: new Date().toISOString(),
      data,
      id: Math.random().toString(36).substr(2, 9)
    };
    
    events.push(eventData);
    // Keep only last 1000 events to avoid document size issues
    const recentEvents = events.slice(-1000);
    
    await setDoc(doc(db, "store", "events"), { value: recentEvents });
  } catch (err) {
    console.error("Track event error:", err);
  }
}

// ========== ANALYTICS COMPUTATION ==========
async function computeAnalytics() {
  try {
    const snap = await getDoc(doc(db, "store", "events"));
    const events = snap.exists() ? snap.data().value || [] : [];
    
    let totalRevenue = 0;
    let totalOrders = 0;
    let cartAdditions = 0;
    let searches = 0;
    let todayRevenue = 0;
    
    const today = new Date().toDateString();
    const eventCounts = {};
    
    events.forEach(e => {
      if (!eventCounts[e.name]) eventCounts[e.name] = 0;
      eventCounts[e.name]++;
      
      if (e.name === "order_completed") {
        totalRevenue += e.data.amount || 0;
        totalOrders++;
        
        if (new Date(e.timestamp).toDateString() === today) {
          todayRevenue += e.data.amount || 0;
        }
      }
      if (e.name === "cart_add") cartAdditions++;
      if (e.name === "search") searches++;
    });
    
    return {
      totalRevenue,
      totalOrders,
      cartAdditions,
      searches,
      todayRevenue,
      eventCounts,
      lastUpdated: new Date().toLocaleTimeString()
    };
  } catch (err) {
    console.error("Compute analytics error:", err);
    return null;
  }
}

async function storageGet(key) {
  const snap = await getDoc(doc(db, "store", key));
  return snap.exists() ? { value: snap.data().value } : null;
}

async function storageSet(key, value) {
  await setDoc(doc(db, "store", key), { value });
  return true;
}

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

// SAMPLE PRODUCTS
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

// ========== ANALYTICS DASHBOARD COMPONENT ==========
function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      const data = await computeAnalytics();
      setAnalytics(data);
    };
    
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (!analytics) return <div className="p-4">Loading analytics...</div>;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 size={24} className="text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">📊 Store Analytics</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Revenue Card */}
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">₹{analytics.totalRevenue}</p>
            </div>
            <DollarSign className="text-green-500" size={32} />
          </div>
        </div>

        {/* Orders Card */}
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Orders</p>
              <p className="text-2xl font-bold text-blue-600">{analytics.totalOrders}</p>
            </div>
            <Package className="text-blue-500" size={32} />
          </div>
        </div>

        {/* Today's Revenue */}
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Today's Revenue</p>
              <p className="text-2xl font-bold text-orange-600">₹{analytics.todayRevenue}</p>
            </div>
            <TrendingUp className="text-orange-500" size={32} />
          </div>
        </div>

        {/* Activity Card */}
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Cart Adds</p>
              <p className="text-2xl font-bold text-purple-600">{analytics.cartAdditions}</p>
            </div>
            <Activity className="text-purple-500" size={32} />
          </div>
        </div>
      </div>

      {/* Event Breakdown */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold text-gray-700 mb-3">📈 Event Breakdown</h3>
        <div className="space-y-2">
          {Object.entries(analytics.eventCounts).map(([event, count]) => (
            <div key={event} className="flex justify-between text-sm">
              <span className="text-gray-600">{event.replace(/_/g, ' ').toUpperCase()}</span>
              <span className="font-bold text-gray-800">{count}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">Last updated: {analytics.lastUpdated}</p>
      </div>
    </div>
  );
}

// ========== MAIN APP COMPONENT ==========
export default function ShauryaToyStore() {
  const [products, setProducts] = useState(SAMPLE_PRODUCTS);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  // Initialize Firestore listeners
  useEffect(() => {
    const unsubProducts = storageListen("products", (value) => {
      if (Array.isArray(value) && value.length > 0) setProducts(value);
    });
    
    const unsubOrders = storageListen("orders", (value) => {
      if (Array.isArray(value)) setOrders(value);
    });

    return () => {
      unsubProducts();
      unsubOrders();
    };
  }, []);

  // Track search events
  const handleSearch = useCallback((query) => {
    setSearch(query);
    if (query.trim()) {
      trackEvent("search", { query, timestamp: new Date().toISOString() });
    }
  }, []);

  // Track cart additions
  const handleAddToCart = useCallback((product) => {
    const existing = cart.find((p) => p.sku === product.sku);
    if (existing) {
      setCart(cart.map((p) => p.sku === product.sku ? { ...p, qty: p.qty + 1 } : p));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
    trackEvent("cart_add", { product: product.name, price: product.price });
  }, [cart]);

  // Track order completion
  const handleCheckout = useCallback(async (total) => {
    const order = {
      id: Date.now(),
      items: cart,
      total,
      timestamp: new Date().toISOString(),
      status: "pending"
    };

    const newOrders = [...orders, order];
    await storageSet("orders", newOrders);
    setOrders(newOrders);
    
    // Track order event
    trackEvent("order_completed", {
      orderId: order.id,
      amount: total,
      itemCount: cart.length
    });

    setCart([]);
    alert("✅ Order placed! Thank you for shopping at Shaurya's Toys Store!");
  }, [cart, orders]);

  // Search filtering
  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [cart]);

  // Render Admin Panel or Store
  if (showAdmin) {
    if (!adminUnlocked) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <Lock className="mx-auto mb-4 text-purple-600" size={48} />
            <h1 className="text-2xl font-bold text-center mb-6">Admin Panel</h1>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
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

        {/* Analytics Dashboard */}
        <AnalyticsDashboard />

        {/* Orders List */}
        <div className="bg-white p-6 rounded-lg shadow mt-6">
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
                  <p className="text-sm text-gray-600">{new Date(order.timestamp).toLocaleString()}</p>
                  <p className="text-sm">Items: {order.itemCount} | Total: ₹{order.total}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Store UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-yellow-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-pink-500 to-orange-500 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
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

      {/* Search */}
      <div className="max-w-6xl mx-auto p-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {filteredProducts.map((product) => (
            <div key={product.sku} className="bg-white rounded-lg shadow hover:shadow-lg transition">
              <div className="text-6xl text-center py-8">{product.img}</div>
              <div className="p-4">
                <h3 className="font-bold text-gray-800">{product.name}</h3>
                <p className="text-sm text-gray-500">{product.category}</p>
                <p className="text-lg font-bold text-pink-600 mt-2">₹{product.price}</p>
                <button
                  onClick={() => handleAddToCart(product)}
                  className="w-full mt-3 bg-pink-500 text-white py-2 rounded-lg hover:bg-pink-600 flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Sidebar */}
        <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl overflow-y-auto mt-24">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShoppingCart size={24} /> Cart ({cart.length})
            </h2>
            <div className="space-y-4 mb-6">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Cart is empty</p>
              ) : (
                cart.map((item) => (
                  <div key={item.sku} className="border-b pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-gray-800">{item.name}</span>
                      <button
                        onClick={() => setCart(cart.filter((p) => p.sku !== item.sku))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">₹{item.price}</p>
                    <div className="flex items-center gap-2 mt-2">
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
                      <span className="flex-1 text-center font-bold">{item.qty}</span>
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
                ))
              )}
            </div>

            {cart.length > 0 && (
              <>
                <div className="border-t pt-4 mb-4">
                  <div className="flex justify-between text-lg font-bold mb-4">
                    <span>Total:</span>
                    <span className="text-pink-600">₹{cartTotal}</span>
                  </div>
                  <button
                    onClick={() => handleCheckout(cartTotal)}
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
    </div>
  );
}
