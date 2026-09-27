/* =========================================================
   J2 - v7.0 · Modo Demo + PWA + Bienvenida + Actualizaciones
   by Sakura · Solución IT SAS
========================================================= */

/* =========================================================
   PLANES
========================================================= */
const PLAN_FEATURES = {
    basic: {
        name: "Básico",
        maxProducts: 20,
        features: ["sales", "inventory_basic", "change"]
    },
    pro: {
        name: "Pro", maxProducts: Infinity,
        features: ["sales", "inventory", "change", "credits", "reports",
                   "cash_register", "backup", "transfer", "providers"]
    },
    promax: {
        name: "ProMax", maxProducts: Infinity,
        features: ["sales", "inventory", "change", "credits", "reports",
                   "cash_register", "backup", "transfer", "providers",
                   "barcode", "multi_user", "suggest_buy", "whatsapp",
                   "receipts", "weight_sales", "priority_support"]
    }
};

/* =========================================================
   CONFIGURACIÓN SAKURA
========================================================= */
const SAKURA_CONFIG = {
    phone: "573332688336",
    phoneDisplay: "+57 333 268 8336",
    email: "soporte@sakura-it.com"
};

// Clave secreta para firmar códigos temporales (debe coincidir con el generador)
const TEMP_CODE_SECRET = "SAKURA-j2-2026-JH32JN23";

// Ventana de validez del código temporal (en minutos)
const TEMP_CODE_WINDOW = 15;

/* =========================================================
   CONFIGURACIÓN DEL MODO DEMO
========================================================= */
const DEMO_CONFIG = {
    duration: 7,
    plan: "promax",
    storageKey: "j2_demo_used"
};

/* =========================================================
   CONFIGURACIÓN DE ACTUALIZACIONES
========================================================= */
const UPDATE_CONFIG = {
    versionUrl: "https://delfos1209.github.io/j2-versions/version.json",
    currentVersion: "7.0",
    checkIntervalHours: 6,
    lastCheckKey: "j2_last_update_check"
};

/* =========================================================
   LICENCIAS
========================================================= */
const VALID_PREFIXES = { "B": "basic", "P": "pro", "PM": "promax" };
const VALID_DURATIONS = { "7": 7, "30": 30, "90": 90, "180": 180, "365": 365 };

function validateLicenseCode(code) {
    const cleanCode = code.trim().toUpperCase();
    const parts = cleanCode.split("-");
    if (parts.length !== 5) return null;
    if (parts[0] !== "J2") return null;

    const planKey = parts[1];
    const random = parts[2];
    const duration = parts[3];
    const providedCheck = parts[4];

    if (!VALID_PREFIXES[planKey]) return null;
    if (!VALID_DURATIONS[duration]) return null;
    if (random.length !== 8) return null;
    if (providedCheck.length !== 4) return null;

    const expectedCheck = generateChecksum(planKey, random, duration);
    if (expectedCheck !== providedCheck) return null;

    return {
        plan: VALID_PREFIXES[planKey],
        days: VALID_DURATIONS[duration],
        code: cleanCode
    };
}

function generateChecksum(planKey, random, duration) {
    const str = `${planKey}${random}${duration}sakura2025`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, "0");
    return hex.substring(0, 4);
}

/* =========================================================
   ESTADO LICENCIA
========================================================= */
let license = JSON.parse(localStorage.getItem("j2_license")) || null;
let usedCodes = JSON.parse(localStorage.getItem("j2_used_codes")) || [];

function isCodeUsed(code) { return usedCodes.includes(code.toUpperCase()); }
function markCodeAsUsed(code) {
    usedCodes.push(code.toUpperCase());
    localStorage.setItem("j2_used_codes", JSON.stringify(usedCodes));
}

function isLicenseValid() {
    if (!license || !license.expiry) return false;
    return new Date(license.expiry) > new Date();
}

function getCurrentPlan() {
    if (!isLicenseValid()) return null;
    return PLAN_FEATURES[license.plan] || PLAN_FEATURES.basic;
}

function hasFeature(feature) {
    const plan = getCurrentPlan();
    if (!plan) return false;
    return plan.features.includes(feature);
}

function daysUntilExpiry() {
    if (!license || !license.expiry) return 0;
    const diff = new Date(license.expiry) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function activateLicense(code) {
    const cleanCode = code.trim().toUpperCase();
    if (isCodeUsed(cleanCode)) {
        return { success: false, message: "Este código ya fue utilizado." };
    }
    const data = validateLicenseCode(cleanCode);
    if (!data) return { success: false, message: "Código inválido o mal formado." };

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + data.days);

    license = {
        code: cleanCode,
        plan: data.plan,
        activatedAt: new Date().toISOString(),
        expiry: expiry.toISOString(),
        days: data.days,
        isDemo: false
    };

    localStorage.setItem("j2_license", JSON.stringify(license));
    markCodeAsUsed(cleanCode);
    return { success: true, license };
}

/* =========================================================
   MODO DEMO
========================================================= */
function isDemoUsed() {
    return localStorage.getItem(DEMO_CONFIG.storageKey) === "true";
}

function markDemoAsUsed() {
    localStorage.setItem(DEMO_CONFIG.storageKey, "true");
}

function activateDemo() {
    if (isDemoUsed()) {
        return {
            success: false,
            message: "Ya usaste tu prueba gratis en este dispositivo.\n\nPara continuar, activa una licencia."
        };
    }

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + DEMO_CONFIG.duration);

    license = {
        code: "DEMO-GRATIS-7DIAS",
        plan: DEMO_CONFIG.plan,
        activatedAt: new Date().toISOString(),
        expiry: expiry.toISOString(),
        days: DEMO_CONFIG.duration,
        isDemo: true
    };

    localStorage.setItem("j2_license", JSON.stringify(license));
    markDemoAsUsed();

    return { success: true, license };
}

function isDemo() {
    return license && license.isDemo === true;
}

function requireFeature(featureName, featureDisplayName) {
    if (hasFeature(featureName)) return true;
    const plan = getCurrentPlan();
    const planName = plan ? plan.name : "ninguno";
    if (confirm(`🔒 "${featureDisplayName}" requiere un plan superior.\n\nTu plan actual: ${planName}\n\n¿Ver planes disponibles?`)) {
        document.getElementById("plansModal").classList.add("show");
    }
    return false;
}

function checkProductLimit() {
    const plan = getCurrentPlan();
    if (!plan) return true;
    if (plan.maxProducts === Infinity) return true;
    const active = products.filter(p => p.active !== false).length;
    if (active >= plan.maxProducts) {
        alert(`🔒 Tu plan ${plan.name} permite máximo ${plan.maxProducts} productos.`);
        document.getElementById("plansModal").classList.add("show");
        return false;
    }
    return true;
}

/* =========================================================
   SISTEMA DE CONTRASEÑAS TEMPORALES
========================================================= */
function generateTempRequestCode() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");

    const random = String(Math.floor(100000 + Math.random() * 900000));
    const timestamp = `${year}${month}${day}${hour}${min}`;
    return `${random}-${timestamp}`;
}

function validateUnlockCode(unlockCode, tempCode) {
    if (!unlockCode || !tempCode) return false;
    const cleanUnlock = unlockCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanUnlock)) return false;

    const parts = tempCode.split("-");
    if (parts.length !== 2) return false;
    const timestamp = parts[1];

    const year = parseInt(timestamp.substring(0, 4));
    const month = parseInt(timestamp.substring(4, 6)) - 1;
    const day = parseInt(timestamp.substring(6, 8));
    const hour = parseInt(timestamp.substring(8, 10));
    const min = parseInt(timestamp.substring(10, 12));

    const codeTime = new Date(year, month, day, hour, min);
    const now = new Date();
    const diffMinutes = (now - codeTime) / (1000 * 60);

    if (diffMinutes > TEMP_CODE_WINDOW) return false;
    if (diffMinutes < -2) return false;

    const expected = generateUnlockCode(tempCode);
    return cleanUnlock === expected;
}

function generateUnlockCode(tempCode) {
    const str = `${tempCode}${TEMP_CODE_SECRET}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, "0");
    return `${hex.substring(0, 4)}-${hex.substring(4, 8)}`;
}

function getCancellationsToday() {
    const today = todayString();
    return sales.filter(s => s.cancelled && s.cancelledAt && s.cancelledAt.startsWith(today)).length;
}

function applyUnlockPassword(tempCode) {
    const expiresAt = new Date(Date.now() + TEMP_CODE_WINDOW * 60 * 1000);
    sessionStorage.setItem("j2_unlock_session", JSON.stringify({
        tempCode,
        expiresAt: expiresAt.toISOString(),
        usesLeft: 1
    }));
}

function hasActiveUnlockSession() {
    const session = JSON.parse(sessionStorage.getItem("j2_unlock_session"));
    if (!session) return false;
    if (new Date(session.expiresAt) <= new Date()) {
        sessionStorage.removeItem("j2_unlock_session");
        return false;
    }
    if (session.usesLeft <= 0) {
        sessionStorage.removeItem("j2_unlock_session");
        return false;
    }
    return true;
}

function consumeUnlockSession() {
    const session = JSON.parse(sessionStorage.getItem("j2_unlock_session"));
    if (!session) return;
    session.usesLeft--;
    if (session.usesLeft <= 0) {
        sessionStorage.removeItem("j2_unlock_session");
    } else {
        sessionStorage.setItem("j2_unlock_session", JSON.stringify(session));
    }
}

/* =========================================================
   CONVERSIONES DE PESO
========================================================= */
const WEIGHT_CONVERSIONS = {
    kg_to_lb: 2.20462, lb_to_kg: 0.453592,
    arroba_to_lb: 25, arroba_to_kg: 11.3398,
    kg_to_arroba: 1 / 11.3398, lb_to_arroba: 1 / 25
};

function convertWeight(amount, fromUnit, toUnit) {
    if (fromUnit === toUnit) return amount;
    let kg;
    if (fromUnit === "kg") kg = amount;
    else if (fromUnit === "lb") kg = amount * WEIGHT_CONVERSIONS.lb_to_kg;
    else if (fromUnit === "arroba") kg = amount * WEIGHT_CONVERSIONS.arroba_to_kg;
    if (toUnit === "kg") return kg;
    if (toUnit === "lb") return kg * WEIGHT_CONVERSIONS.kg_to_lb;
    if (toUnit === "arroba") return kg * WEIGHT_CONVERSIONS.kg_to_arroba;
    return amount;
}

function formatWeight(amount, unit) {
    const symbols = { kg: "kg", lb: "lb", arroba: "@" };
    return `${parseFloat(amount).toFixed(2)} ${symbols[unit] || unit}`;
}

/* =========================================================
   UTILIDADES
========================================================= */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2200);
}

function formatMoney(value) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency", currency: "COP", maximumFractionDigits: 0
    }).format(value || 0);
}

function todayString() { return new Date().toISOString().split("T")[0]; }

function getCurrentTime() {
    return new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function normalizeText(text) {
    return (text || "").toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[\s\-_]/g, "");
}

function fuzzyMatch(haystack, needle) {
    const h = normalizeText(haystack);
    const n = normalizeText(needle);
    if (!n) return true;
    return h.includes(n);
}

function playSound(type) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        gain.gain.value = 0.08;
        if (type === "add") {
            osc.frequency.value = 880;
            osc.start();
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.stop(ctx.currentTime + 0.15);
        } else if (type === "sale") {
            osc.frequency.value = 660;
            osc.start();
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
            osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.stop(ctx.currentTime + 0.4);
        }
    } catch (e) {}
}

function vibrate(pattern = 30) {
    if (navigator.vibrate) navigator.vibrate(pattern);
}

/* =========================================================
   ESTADO GLOBAL
========================================================= */
let products = JSON.parse(localStorage.getItem("j2_products")) || [];
let sales = JSON.parse(localStorage.getItem("j2_sales")) || [];
let clients = JSON.parse(localStorage.getItem("j2_clients")) || [];
let providers = JSON.parse(localStorage.getItem("j2_providers")) || [];

let categories = JSON.parse(localStorage.getItem("j2_categories")) || [
    { name: "Comida", weight: false },
    { name: "Aseo", weight: false },
    { name: "Bebidas", weight: false },
    { name: "Alcohol", weight: false },
    { name: "Verduras y Frutas", weight: true },
    { name: "Carnes y Pescados", weight: true },
    { name: "Granos y Cereales", weight: true },
    { name: "Otro", weight: false }
];

let storeSettings = JSON.parse(localStorage.getItem("j2_store_settings")) || {
    name: "", slogan: "", phone: "", address: "", logo: ""
};

let appSettings = JSON.parse(localStorage.getItem("j2_app_settings")) || {
    theme: "auto", accent: "#1e40af"
};

let cart = [];
let currentWeightProduct = null;
let pendingSaleForReceipt = null;
let saleToCancel = null;
let currentTempCode = null;
let tempCodeTimerInterval = null;

let salesChartInstance = null;
let topProductsChartInstance = null;
let categoryChartInstance = null;
let html5QrCode = null;

/* =========================================================
   PERSISTENCIA
========================================================= */
function saveData() {
    localStorage.setItem("j2_products", JSON.stringify(products));
    localStorage.setItem("j2_sales", JSON.stringify(sales));
    localStorage.setItem("j2_clients", JSON.stringify(clients));
    localStorage.setItem("j2_providers", JSON.stringify(providers));
    localStorage.setItem("j2_categories", JSON.stringify(categories));
}

function saveSettings() {
    localStorage.setItem("j2_store_settings", JSON.stringify(storeSettings));
    localStorage.setItem("j2_app_settings", JSON.stringify(appSettings));
}

/* =========================================================
   APLICAR TEMA Y COLOR
========================================================= */
function applyTheme() {
    document.body.classList.remove("theme-light", "theme-dark", "theme-auto");
    document.body.classList.add(`theme-${appSettings.theme}`);

    const accentMap = {
        "#1e40af": null, "#16a34a": "green", "#dc2626": "red",
        "#9333ea": "purple", "#ea580c": "orange", "#0d9488": "teal",
        "#db2777": "pink", "#111827": "black"
    };
    const accentKey = accentMap[appSettings.accent];
    if (accentKey) {
        document.body.dataset.accent = accentKey;
        document.documentElement.style.removeProperty("--primary");
        document.documentElement.style.removeProperty("--primary-dark");
    } else {
        delete document.body.dataset.accent;
        document.documentElement.style.setProperty("--primary", appSettings.accent);
        const darkMap = {
            "#1e40af": "#1e3a8a", "#16a34a": "#15803d", "#dc2626": "#b91c1c",
            "#9333ea": "#7e22ce", "#ea580c": "#c2410c", "#0d9488": "#0f766e",
            "#db2777": "#be185d", "#111827": "#000000"
        };
        document.documentElement.style.setProperty("--primary-dark", darkMap[appSettings.accent] || appSettings.accent);
    }
}

function applyStoreBranding() {
    const nameEl = document.getElementById("topbarStoreName");
    const subtitleEl = document.getElementById("topbarStoreSubtitle");
    const logoEl = document.getElementById("topbarLogo");

    if (!nameEl || !subtitleEl || !logoEl) return;

    if (storeSettings.name) {
        nameEl.textContent = storeSettings.name;
        subtitleEl.textContent = storeSettings.slogan || "Punto de venta e inventario";
    } else {
        nameEl.textContent = "J2";
        subtitleEl.textContent = "Punto de venta e inventario";
    }

    if (storeSettings.logo) {
        logoEl.src = storeSettings.logo;
    } else {
        logoEl.src = "logo.png";
    }
}

/* =========================================================
   FECHA / BADGE
========================================================= */
function updateDate() {
    const el = document.getElementById("currentDate");
    if (!el) return;
    el.textContent = new Date().toLocaleDateString("es-CO", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
}

function updatePlanBadge() {
    const badge = document.getElementById("planBadge");
    if (!badge) return;
    const plan = getCurrentPlan();
    if (!plan) { badge.textContent = ""; return; }
    const days = daysUntilExpiry();

    if (isDemo()) {
        badge.textContent = `🎁 Demo · ${days}d`;
        badge.style.background = "rgba(245, 158, 11, 0.2)";
        badge.style.color = "#fbbf24";
        badge.style.borderColor = "rgba(245, 158, 11, 0.4)";
    } else {
        badge.textContent = `${plan.name} · ${days}d`;
        badge.style.background = "";
        badge.style.color = "";
        badge.style.borderColor = "";
    }
}

/* =========================================================
   NAVEGACIÓN
========================================================= */
document.querySelectorAll(".menu-btn").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".menu-btn").forEach(btn => btn.classList.remove("active"));
        document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
        button.classList.add("active");
        document.getElementById(button.dataset.section).classList.add("active");
        renderAll();
    });
});

function goToInventory() {
    document.querySelectorAll(".menu-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.querySelector('.menu-btn[data-section="inventario"]').classList.add("active");
    document.getElementById("inventario").classList.add("active");
    renderAll();
}

/* =========================================================
   CATEGORÍAS
========================================================= */
function getCategoryByName(name) { return categories.find(c => c.name === name); }
function categoryIsWeight(name) {
    const cat = getCategoryByName(name);
    return cat ? cat.weight === true : false;
}

function renderCategoryOptions() {
    const select = document.getElementById("productCategory");
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = "";
    categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.name;
        opt.textContent = cat.name + (cat.weight ? " ⚖️" : "");
        select.appendChild(opt);
    });
    if (currentValue && categories.find(c => c.name === currentValue)) {
        select.value = currentValue;
    }

    const filterSelect = document.getElementById("inventoryCategoryFilter");
    if (filterSelect) {
        const currentFilter = filterSelect.value;
        filterSelect.innerHTML = '<option value="">Todas las categorías</option>';
        categories.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat.name;
            opt.textContent = cat.name;
            filterSelect.appendChild(opt);
        });
        if (currentFilter) filterSelect.value = currentFilter;
    }
}

function openCategoryModal() {
    document.getElementById("categoryForm").reset();
    document.getElementById("newCategoryWeight").checked = false;
    document.getElementById("categoryModal").classList.add("show");
}

function closeCategoryModal() {
    document.getElementById("categoryModal").classList.remove("show");
}

function saveCategory(event) {
    event.preventDefault();
    const name = document.getElementById("newCategoryName").value.trim();
    const isWeight = document.getElementById("newCategoryWeight").checked;
    if (!name) { alert("Escribe un nombre."); return; }
    if (categories.find(c => c.name === name)) {
        alert("Esa categoría ya existe."); return;
    }
    categories.push({ name, weight: isWeight });
    saveData();
    renderCategoryOptions();
    document.getElementById("productCategory").value = name;
    closeCategoryModal();
    toggleCategoryFields();
    showToast("✅ Categoría agregada");
}

function toggleCategoryFields() {
    const category = document.getElementById("productCategory").value;
    const isWeight = categoryIsWeight(category);
    const unitFields = document.getElementById("unitFields");
    const weightFields = document.getElementById("weightFields");
    const hint = document.getElementById("categoryHint");

    if (isWeight) {
        unitFields.style.display = "none";
        weightFields.style.display = "block";
        hint.textContent = "⚖️ Esta categoría se vende por peso. Configura el precio en la unidad base.";
        hint.classList.add("show");
        updateBaseUnitLabels();
    } else {
        unitFields.style.display = "block";
        weightFields.style.display = "none";
        hint.classList.remove("show");
    }
}

/* =========================================================
   PRODUCTOS
========================================================= */
function getTopProducts(limit = 4) {
    const counts = {};
    sales.forEach(sale => {
        if (sale.cancelled) return;
        sale.products.forEach(p => {
            const baseName = p.name.split(" (")[0];
            counts[baseName] = (counts[baseName] || 0) + 1;
        });
    });

    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(x => x[0]);

    const top = sorted
        .map(name => products.find(p => p.name === name && p.active !== false))
        .filter(Boolean);

    if (top.length < limit) {
        const activeProducts = products.filter(p => p.active !== false && !top.includes(p));
        return [...top, ...activeProducts].slice(0, limit);
    }
    return top;
}

function renderProducts() {
    const container = document.getElementById("productsGrid");
    if (!container) return;
    const search = document.getElementById("productSearch").value.trim();

    let filtered;
    if (search) {
        filtered = products.filter(p => p.active !== false && fuzzyMatch(p.name, search));
    } else {
        filtered = getTopProducts(4);
    }

    container.innerHTML = "";

    if (filtered.length === 0) {
        container.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:20px; color:var(--muted);">
            ${search ? "No se encontraron productos." : "No hay productos. Agrega el primero en Inventario."}
        </p>`;
        return;
    }

    filtered.forEach(product => {
        const card = document.createElement("div");
        card.className = "product-card";
        const isWeight = product.saleType === "weight";
        let priceDisplay, stockDisplay;
        if (isWeight) {
            priceDisplay = formatMoney(product.salePriceKg) + '<small style="font-size:11px;color:var(--muted);font-weight:normal;">/kg</small>';
            stockDisplay = `Peso: ${formatWeight(product.stock, product.baseUnit || "kg")}`;
        } else {
            priceDisplay = formatMoney(product.salePrice);
            stockDisplay = `Stock: ${product.stock}`;
        }
        card.innerHTML = `
            ${isWeight ? '<span class="weight-badge">⚖️ PESO</span>' : ''}
            <h4>${product.name}</h4>
            <div class="product-price">${priceDisplay}</div>
            <div class="product-stock">${stockDisplay}</div>
        `;
        card.addEventListener("click", () => handleProductClick(product));
        if ((product.stock || 0) <= 0) {
            card.style.opacity = "0.5";
            card.style.pointerEvents = "none";
        }
        container.appendChild(card);
    });
}

function handleProductClick(product) {
    if (product.saleType === "weight") {
        openWeightModal(product);
    } else {
        addToCart(product.id);
    }
}

/* =========================================================
   MODAL TODOS LOS PRODUCTOS
========================================================= */
function openAllProductsModal() {
    document.getElementById("allProductsModal").classList.add("show");
    renderAllProductsList();
}

function closeAllProductsModal() {
    document.getElementById("allProductsModal").classList.remove("show");
    document.getElementById("allProductsSearch").value = "";
}

function renderAllProductsList() {
    const container = document.getElementById("allProductsList");
    if (!container) return;
    const search = document.getElementById("allProductsSearch").value.trim();
    const filtered = products.filter(p => p.active !== false && fuzzyMatch(p.name, search));

    container.innerHTML = "";
    if (filtered.length === 0) {
        container.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:20px;">No hay productos.</p>`;
        return;
    }

    filtered.forEach(product => {
        const card = document.createElement("div");
        card.className = "product-card";
        const isWeight = product.saleType === "weight";
        let priceDisplay, stockDisplay;
        if (isWeight) {
            priceDisplay = formatMoney(product.salePriceKg) + '<small style="font-size:11px;color:var(--muted);font-weight:normal;">/kg</small>';
            stockDisplay = `Peso: ${formatWeight(product.stock, product.baseUnit || "kg")}`;
        } else {
            priceDisplay = formatMoney(product.salePrice);
            stockDisplay = `Stock: ${product.stock}`;
        }
        card.innerHTML = `
            ${isWeight ? '<span class="weight-badge">⚖️ PESO</span>' : ''}
            <h4>${product.name}</h4>
            <div class="product-price">${priceDisplay}</div>
            <div class="product-stock">${stockDisplay}</div>
        `;
        card.addEventListener("click", () => {
            handleProductClick(product);
            closeAllProductsModal();
        });
        if ((product.stock || 0) <= 0) {
            card.style.opacity = "0.5";
            card.style.pointerEvents = "none";
        }
        container.appendChild(card);
    });
}

/* =========================================================
   CARRITO
========================================================= */
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    if (product.stock <= 0) { alert("Producto agotado."); return; }

    const existing = cart.find(item => item.productId === productId && !item.isWeight);
    if (existing) {
        if (existing.quantity >= product.stock) {
            alert("No hay más unidades disponibles."); return;
        }
        existing.quantity++;
    } else {
        cart.push({
            productId: product.id, name: product.name,
            price: product.salePrice, purchasePrice: product.purchasePrice,
            quantity: 1, isWeight: false
        });
    }
    showToast(`✅ ${product.name} agregado`);
    playSound("add"); vibrate(30);
    renderCart();
}

function addWeightToCart(product, unit, amount) {
    const baseUnit = product.baseUnit || "kg";
    const amountInBase = convertWeight(amount, unit, baseUnit);
    if (amountInBase > product.stock) {
        alert(`No hay suficiente peso. Disponible: ${formatWeight(product.stock, baseUnit)}`);
        return;
    }
    const pricePerUnit = getPricePerUnit(product, unit);
    const subtotal = Math.round(pricePerUnit * amount);
    const purchasePerKg = product.purchasePriceKg || 0;
    const amountInKg = convertWeight(amount, unit, "kg");
    const purchaseCost = Math.round(purchasePerKg * amountInKg);

    cart.push({
        productId: product.id,
        name: `${product.name} (${formatWeight(amount, unit)})`,
        price: subtotal, purchasePrice: purchaseCost,
        quantity: 1, isWeight: true,
        weight: amount, weightUnit: unit,
        weightInBase: amountInBase, baseUnit: baseUnit
    });
    showToast(`✅ ${formatWeight(amount, unit)} de ${product.name}`);
    playSound("add"); vibrate(30);
    renderCart();
}

function getPricePerUnit(product, unit) {
    if (unit === "kg") return product.salePriceKg || 0;
    if (unit === "lb") return product.salePriceLb || 0;
    if (unit === "arroba") return product.salePriceArroba || 0;
    return 0;
}

function openWeightModal(product) {
    if (!requireFeature("weight_sales", "Ventas por peso")) return;
    currentWeightProduct = product;
    document.getElementById("weightProductName").textContent = product.name;
    const baseUnit = product.baseUnit || "kg";
    const stockDisplay = formatWeight(product.stock, baseUnit);
    document.getElementById("weightProductPrices").textContent =
        `💵 Precios:\n• Por kg: ${formatMoney(product.salePriceKg)}\n• Por libra: ${formatMoney(product.salePriceLb)}\n• Por arroba: ${formatMoney(product.salePriceArroba)}\n\n📦 Stock disponible: ${stockDisplay}`;
    document.getElementById("weightUnit").value = "kg";
    document.getElementById("weightAmount").value = "";
    updateWeightSubtotal();
    document.getElementById("weightModal").classList.add("show");
}

function closeWeightModal() {
    document.getElementById("weightModal").classList.remove("show");
    currentWeightProduct = null;
}

function updateWeightSubtotal() {
    if (!currentWeightProduct) return;
    const unit = document.getElementById("weightUnit").value;
    const amount = parseFloat(document.getElementById("weightAmount").value) || 0;
    const pricePerUnit = getPricePerUnit(currentWeightProduct, unit);
    const subtotal = Math.round(pricePerUnit * amount);
    document.getElementById("weightSubtotal").textContent = formatMoney(subtotal);
    const baseUnit = currentWeightProduct.baseUnit || "kg";
    const inBase = convertWeight(amount, unit, baseUnit);
    const conversionText = document.getElementById("weightConversion");
    if (amount > 0 && unit !== baseUnit) {
        conversionText.textContent = `≈ ${formatWeight(inBase, baseUnit)} (stock en ${baseUnit})`;
    } else {
        conversionText.textContent = "";
    }
}

function confirmWeight() {
    if (!currentWeightProduct) return;
    const unit = document.getElementById("weightUnit").value;
    const amount = parseFloat(document.getElementById("weightAmount").value);
    if (!amount || amount <= 0) { alert("Ingresa una cantidad válida."); return; }
    addWeightToCart(currentWeightProduct, unit, amount);
    closeWeightModal();
}

function addQuickProduct() {
    const input = document.getElementById("quickPrice");
    const price = Number(input.value);
    if (!price || price <= 0 || isNaN(price)) { alert("Ingresa un precio válido."); return; }
    cart.push({
        productId: null, name: "Producto rápido",
        price: Math.round(price), purchasePrice: 0,
        quantity: 1, isWeight: false
    });
    input.value = "";
    showToast("✅ Producto rápido agregado");
    playSound("add");
    renderCart();
}

function changeQuantity(index, amount) {
    const item = cart[index];
    if (!item) return;
    if (item.isWeight) { if (amount < 0) removeFromCart(index); return; }
    if (amount > 0 && item.productId) {
        const product = products.find(p => p.id === item.productId);
        if (product && item.quantity >= product.stock) {
            alert("No hay más unidades disponibles."); return;
        }
    }
    item.quantity += amount;
    if (item.quantity <= 0) cart.splice(index, 1);
    renderCart();
}

function removeFromCart(index) { cart.splice(index, 1); renderCart(); }

function getCartTotal() {
    return cart.reduce((t, i) => t + i.price * i.quantity, 0);
}

function renderCart() {
    const container = document.getElementById("cartItems");
    if (!container) return;
    const count = cart.reduce((t, i) => t + i.quantity, 0);
    document.getElementById("cartCount").textContent =
        `${count} producto${count !== 1 ? "s" : ""}`;
    container.innerHTML = "";
    if (cart.length === 0) {
        container.innerHTML = `<div class="empty-cart">No hay productos en la venta.</div>`;
    } else {
        cart.forEach((item, index) => {
            const row = document.createElement("div");
            row.className = "cart-item";
            row.innerHTML = `
                <div class="cart-item-info">
                    <strong>${item.name}</strong>
                    <span>${formatMoney(item.price)}</span>
                </div>
                ${item.isWeight
                    ? `<button class="remove-item" onclick="removeFromCart(${index})">✕</button>`
                    : `<div class="quantity-controls">
                        <button onclick="changeQuantity(${index}, -1)">-</button>
                        <strong>${item.quantity}</strong>
                        <button onclick="changeQuantity(${index}, 1)">+</button>
                       </div>
                       <strong>${formatMoney(item.price * item.quantity)}</strong>
                       <button class="remove-item" onclick="removeFromCart(${index})">✕</button>`
                }
            `;
            container.appendChild(row);
        });
    }
    document.getElementById("saleTotal").textContent = formatMoney(getCartTotal());
    updateCreditClientSelect();
    calculateChange();
}

/* =========================================================
   CAMBIO / TIPO PAGO
========================================================= */
function calculateChange() {
    const total = getCartTotal();
    const type = document.querySelector('input[name="paymentType"]:checked').value;
    document.getElementById("cashBox").style.display = type === "cash" ? "block" : "none";
    document.getElementById("transferBox").style.display = type === "transfer" ? "block" : "none";
    document.getElementById("creditClientBox").style.display = type === "credit" ? "block" : "none";

    if (type === "credit") {
        document.getElementById("changeAmount").textContent = "Fiado";
        document.getElementById("completeSale").disabled = cart.length === 0;
        return;
    }
    if (type === "transfer") {
        document.getElementById("changeAmount").textContent = "Transferencia";
        document.getElementById("completeSale").disabled = cart.length === 0;
        return;
    }
    const received = Number(document.getElementById("cashReceived").value) || 0;
    const change = received - total;
    const el = document.getElementById("changeAmount");
    el.textContent = change >= 0 ? formatMoney(change) : "Falta dinero";
    document.getElementById("completeSale").disabled = cart.length === 0 || received < total;
}

function togglePaymentMode() {
    const type = document.querySelector('input[name="paymentType"]:checked').value;
    if (type === "credit" && !hasFeature("credits")) {
        alert("🔒 Las ventas fiadas requieren plan Pro o superior.");
        document.querySelector('input[name="paymentType"][value="cash"]').checked = true;
        document.getElementById("plansModal").classList.add("show");
        return;
    }
    if (type === "transfer" && !hasFeature("transfer")) {
        alert("🔒 Los pagos por transferencia requieren plan Pro o superior.");
        document.querySelector('input[name="paymentType"][value="cash"]').checked = true;
        document.getElementById("plansModal").classList.add("show");
        return;
    }
    document.getElementById("cashReceived").value = "";
    calculateChange();
}

/* =========================================================
   FINALIZAR VENTA
========================================================= */
function completeSale() {
    const total = getCartTotal();
    const type = document.querySelector('input[name="paymentType"]:checked').value;
    if (cart.length === 0) { alert("No hay productos."); return; }

    let received = 0, change = 0, clientId = null, clientName = null;
    const saleClientName = document.getElementById("saleClientName").value.trim();
    const saleClientId = document.getElementById("saleClientId").value.trim();

    if (type === "credit") {
        clientId = document.getElementById("creditClient").value;
        if (!clientId) { alert("Selecciona un cliente para el fiado."); return; }
        const client = clients.find(c => c.id === clientId);
        clientName = client ? client.name : "";
    } else if (type === "cash") {
        received = Number(document.getElementById("cashReceived").value);
        if (isNaN(received) || received < total) { alert("Dinero insuficiente."); return; }
        change = received - total;
    } else if (type === "transfer") {
        received = total;
        change = 0;
    }

    cart.forEach(item => {
        if (!item.productId) return;
        const product = products.find(p => p.id === item.productId);
        if (product) {
            if (item.isWeight) {
                product.stock -= item.weightInBase;
                if (product.stock < 0) product.stock = 0;
            } else {
                product.stock -= item.quantity;
                if (product.stock < 0) product.stock = 0;
            }
        }
    });

    const profit = cart.reduce((t, i) =>
        t + ((i.price - i.purchasePrice) * (i.isWeight ? 1 : i.quantity)), 0);

    const sale = {
        id: generateId(),
        date: todayString(),
        time: getCurrentTime(),
        total, received, change,
        paymentType: type,
        clientId, clientName,
        saleClientName: saleClientName || null,
        saleClientId: saleClientId || null,
        cancelled: false,
        products: cart.map(i => ({
            name: i.name, quantity: i.quantity, price: i.price,
            isWeight: i.isWeight || false,
            weight: i.weight, weightUnit: i.weightUnit,
            weightInBase: i.weightInBase, baseUnit: i.baseUnit,
            productId: i.productId
        })),
        quantity: cart.reduce((s, i) => s + i.quantity, 0),
        profit
    };

    sales.push(sale);

    if (type === "credit" && clientId) {
        const client = clients.find(c => c.id === clientId);
        if (client) {
            if (!client.movements) client.movements = [];
            client.movements.push({
                type: "credit",
                amount: total,
                date: todayString(),
                time: getCurrentTime(),
                saleId: sale.id
            });
            client.balance = (client.balance || 0) + total;
        }
    }

    saveData();
    playSound("sale");
    vibrate([50, 30, 50]);

    pendingSaleForReceipt = sale;
    showSuccessModal(sale);

    cart = [];
    document.getElementById("cashReceived").value = "";
    document.getElementById("saleClientName").value = "";
    document.getElementById("saleClientId").value = "";
    document.querySelector('input[name="paymentType"][value="cash"]').checked = true;
    togglePaymentMode();
    renderAll();
}

/* =========================================================
   MODAL VENTA EXITOSA
========================================================= */
function showSuccessModal(sale) {
    const modal = document.getElementById("successModal");
    const details = document.getElementById("successDetails");

    let paymentLine = "";
    if (sale.paymentType === "credit") {
        paymentLine = `<div class="detail-row"><span>Tipo:</span><strong>📝 Fiado a ${sale.clientName}</strong></div>`;
    } else if (sale.paymentType === "transfer") {
        paymentLine = `<div class="detail-row"><span>Tipo:</span><strong>📱 Transferencia</strong></div>`;
    } else {
        paymentLine = `
            <div class="detail-row"><span>Recibido:</span><strong>${formatMoney(sale.received)}</strong></div>
            <div class="detail-row change"><span>Cambio:</span><strong>${formatMoney(sale.change)}</strong></div>
        `;
    }

    details.innerHTML = `
        <div class="detail-row"><span>Recibo #:</span><strong>${sale.id.slice(-6).toUpperCase()}</strong></div>
        <div class="detail-row"><span>Hora:</span><strong>${sale.time}</strong></div>
        <div class="detail-row"><span>Productos:</span><strong>${sale.quantity}</strong></div>
        ${paymentLine}
        <div class="detail-row total"><span>Total:</span><span>${formatMoney(sale.total)}</span></div>
    `;

    modal.classList.add("show");
}

function closeSuccessModal() {
    document.getElementById("successModal").classList.remove("show");
    pendingSaleForReceipt = null;
}

/* =========================================================
   RECIBO
========================================================= */
function showReceipt(sale) {
    if (!requireFeature("receipts", "Impresión de recibos")) return;

    const modal = document.getElementById("receiptModal");
    const content = document.getElementById("receiptContent");

    const buildReceiptHTML = (copyLabel) => {
        const productsHTML = sale.products.map(p => {
            let qtyText = p.isWeight ? p.name.match(/\(([^)]+)\)/)?.[1] || "" : `x${p.quantity}`;
            let nameClean = p.name.replace(/\s*\([^)]*\)/, "");
            return `<div class="receipt-row"><span>${nameClean} ${qtyText}</span><span>${formatMoney(p.price * (p.isWeight ? 1 : p.quantity))}</span></div>`;
        }).join("");

        let paymentHTML = "";
        if (sale.paymentType === "credit") {
            paymentHTML = `<div class="receipt-row"><span>Fiado a:</span><span>${sale.clientName}</span></div>`;
        } else if (sale.paymentType === "transfer") {
            paymentHTML = `<div class="receipt-row"><span>Pago:</span><span>Transferencia</span></div>`;
        } else {
            paymentHTML = `
                <div class="receipt-row"><span>Recibido:</span><span>${formatMoney(sale.received)}</span></div>
                <div class="receipt-row"><span>Cambio:</span><span>${formatMoney(sale.change)}</span></div>
            `;
        }

        let clientHTML = "";
        if (sale.saleClientName) clientHTML = `<div class="receipt-row"><span>Cliente:</span><span>${sale.saleClientName}</span></div>`;
        if (sale.saleClientId) clientHTML += `<div class="receipt-row"><span>CC/NIT:</span><span>${sale.saleClientId}</span></div>`;

        const storeName = storeSettings.name || "J2 · PUNTO DE VENTA";
        const storeSlogan = storeSettings.slogan ? `<p class="receipt-store-slogan">${storeSettings.slogan}</p>` : "";
        const contactLines = [];
        if (storeSettings.address) contactLines.push(storeSettings.address);
        if (storeSettings.phone) contactLines.push("Tel: " + storeSettings.phone);
        const storeContact = contactLines.length > 0
            ? `<p class="receipt-store-contact">${contactLines.join(" · ")}</p>` : "";

        const logoHTML = storeSettings.logo
            ? `<img src="${storeSettings.logo}" alt="${storeName}" class="receipt-logo" onerror="this.style.display='none'">`
            : `<img src="logo.png" alt="J2" class="receipt-logo" onerror="this.style.display='none'">`;

        return `
            <div class="receipt-print-area">
                ${logoHTML}
                <p class="receipt-store-name">${storeName}</p>
                ${storeSlogan}
                ${storeContact}
                <div style="text-align:center;"><span class="copy-label">${copyLabel}</span></div>
                <div class="receipt-row"><span>Fecha:</span><span>${sale.date}</span></div>
                <div class="receipt-row"><span>Hora:</span><span>${sale.time}</span></div>
                <div class="receipt-row"><span>Recibo #:</span><span>${sale.id.slice(-6).toUpperCase()}</span></div>
                ${clientHTML}
                <hr>
                ${productsHTML}
                <hr>
                <div class="receipt-row total"><span>TOTAL</span><span>${formatMoney(sale.total)}</span></div>
                ${paymentHTML}
                <hr>
                <p class="receipt-footer">¡Gracias por su compra!</p>
                <div class="receipt-branding">
                    Powered by <strong>Sakura · Solución IT SAS</strong><br>
                    ¿Quieres una app así para tu negocio? 💬 ${SAKURA_CONFIG.phoneDisplay}
                </div>
            </div>
        `;
    };

    content.innerHTML = `
        ${buildReceiptHTML("COPIA - CLIENTE")}
        ${buildReceiptHTML("COPIA - TIENDA")}
        <div class="receipt-actions">
            <button class="btn-print" onclick="window.print()">🖨️ Imprimir (2 copias)</button>
            <button class="btn-close" onclick="closeReceipt()">Cerrar</button>
        </div>
    `;
    modal.classList.add("show");
}

function closeReceipt() {
    document.getElementById("receiptModal").classList.remove("show");
}

/* =========================================================
   INVENTARIO
========================================================= */
function renderInventory() {
    const table = document.getElementById("inventoryTable");
    if (!table) return;
    table.innerHTML = "";

    const search = document.getElementById("inventorySearch").value.trim();
    const catFilter = document.getElementById("inventoryCategoryFilter").value;
    const sortBy = document.getElementById("inventorySort").value;

    let filtered = products.filter(p => p.active !== false);
    if (search) filtered = filtered.filter(p => fuzzyMatch(p.name, search));
    if (catFilter) filtered = filtered.filter(p => p.category === catFilter);

    filtered.sort((a, b) => {
        const priceA = a.saleType === "weight" ? a.salePriceKg : a.salePrice;
        const priceB = b.saleType === "weight" ? b.salePriceKg : b.salePrice;
        switch (sortBy) {
            case "name": return a.name.localeCompare(b.name);
            case "name_desc": return b.name.localeCompare(a.name);
            case "stock": return a.stock - b.stock;
            case "stock_desc": return b.stock - a.stock;
            case "price": return priceA - priceB;
            case "price_desc": return priceB - priceA;
            default: return 0;
        }
    });

    if (filtered.length === 0) {
        table.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--muted);">No hay productos que coincidan.</td></tr>`;
    } else {
        filtered.forEach(product => {
            let status = "";
            if (product.stock <= 0) status = `<span class="status out">Agotado</span>`;
            else if (product.stock <= product.minimumStock) status = `<span class="status low">Stock bajo</span>`;
            else status = `<span class="status ok">Disponible</span>`;

            const isWeight = product.saleType === "weight";
            let priceDisplay, purchaseDisplay, stockDisplay;
            if (isWeight) {
                const baseUnit = product.baseUnit || "kg";
                priceDisplay = `${formatMoney(product.salePriceKg)}/kg`;
                purchaseDisplay = `${formatMoney(product.purchasePriceKg)}/kg`;
                stockDisplay = formatWeight(product.stock, baseUnit);
            } else {
                priceDisplay = formatMoney(product.salePrice);
                purchaseDisplay = formatMoney(product.purchasePrice);
                stockDisplay = product.stock;
            }

            const row = document.createElement("tr");
            row.innerHTML = `
                <td><strong>${product.name}</strong>${isWeight ? ' <span style="font-size:11px;color:var(--warning);">⚖️</span>' : ''}</td>
                <td>${product.category || "-"}</td>
                <td>${purchaseDisplay}</td>
                <td>${priceDisplay}</td>
                <td>${stockDisplay}</td>
                <td>${status}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="editProduct('${product.id}')">Editar</button>
                    <button class="action-btn delete-btn" onclick="deleteProduct('${product.id}')">Archivar</button>
                </td>
            `;
            table.appendChild(row);
        });
    }

    const active = products.filter(p => p.active !== false);
    document.getElementById("totalProducts").textContent = active.length;
    document.getElementById("totalStock").textContent =
        active.reduce((s, p) => s + (p.saleType === "weight" ? 0 : p.stock), 0);
    document.getElementById("lowStock").textContent =
        active.filter(p => p.stock > 0 && p.stock <= p.minimumStock).length;
    document.getElementById("outStock").textContent =
        active.filter(p => p.stock <= 0).length;

    renderStockAlert();
}

function clearInventoryFilters() {
    document.getElementById("inventorySearch").value = "";
    document.getElementById("inventoryCategoryFilter").value = "";
    document.getElementById("inventorySort").value = "name";
    renderInventory();
}

function renderStockAlert() {
    const box = document.getElementById("stockAlert");
    if (!box) return;
    const active = products.filter(p => p.active !== false);
    const out = active.filter(p => p.stock <= 0);
    const low = active.filter(p => p.stock > 0 && p.stock <= p.minimumStock);
    if (out.length === 0 && low.length === 0) { box.classList.remove("show"); return; }
    box.classList.add("show");
    box.classList.toggle("danger", out.length > 0);
    let msg = "";
    if (out.length > 0 && low.length > 0) msg = `🚫 ${out.length} agotado(s) y ⚠️ ${low.length} con stock bajo.`;
    else if (out.length > 0) msg = `🚫 ${out.length} producto(s) agotado(s). ¡Reponer urgente!`;
    else msg = `⚠️ ${low.length} producto(s) con stock bajo.`;
    box.innerHTML = `<span>${msg}</span><button onclick="goToInventory()">Ver inventario</button>`;
}

/* =========================================================
   PRODUCTOS SIN MOVIMIENTO
========================================================= */
function showDeadProducts() {
    const last30 = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last30.push(d.toISOString().split("T")[0]);
    }

    const soldProductIds = new Set();
    sales.filter(s => !s.cancelled && last30.includes(s.date))
        .forEach(s => s.products.forEach(p => {
            if (p.productId) soldProductIds.add(p.productId);
        }));

    const dead = products.filter(p =>
        p.active !== false && p.stock > 0 && !soldProductIds.has(p.id)
    );

    const content = document.getElementById("deadProductsContent");
    if (dead.length === 0) {
        content.innerHTML = "<p style='text-align:center; padding:20px;'>🎉 Todos tus productos tuvieron movimiento en los últimos 30 días. ¡Excelente!</p>";
    } else {
        content.innerHTML = `
            <p style="margin-bottom:15px; color:var(--muted); font-size:14px;">
                Estos productos no se han vendido en los últimos 30 días. Considera promocionarlos o bajar su precio.
            </p>
            ${dead.map(p => `
                <div class="dead-product-item">
                    <div>
                        <strong>${p.name}</strong>
                        <small>Stock: ${p.saleType === "weight" ? formatWeight(p.stock, p.baseUnit || "kg") : p.stock} · ${p.category || "Sin categoría"}</small>
                    </div>
                    <button class="action-btn edit-btn" onclick="closeDeadProductsModal(); editProduct('${p.id}');">Ajustar precio</button>
                </div>
            `).join("")}
        `;
    }
    document.getElementById("deadProductsModal").classList.add("show");
}

function closeDeadProductsModal() {
    document.getElementById("deadProductsModal").classList.remove("show");
}

/* =========================================================
   SUGERENCIA
========================================================= */
function suggestBuy() {
    if (!requireFeature("suggest_buy", "Sugerencia de compra")) return;
    const active = products.filter(p => p.active !== false);
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7.push(d.toISOString().split("T")[0]);
    }
    const suggestions = [];
    active.forEach(product => {
        const sold7 = sales.filter(s => !s.cancelled && last7.includes(s.date))
            .flatMap(s => s.products)
            .filter(p => p.name.startsWith(product.name))
            .reduce((sum, p) => sum + (p.quantity || 1), 0);
        const dailyAvg = sold7 / 7;
        const daysOfStock = dailyAvg > 0 ? product.stock / dailyAvg : 999;
        if (product.stock <= product.minimumStock || daysOfStock < 3) {
            const suggestedQty = Math.max(10, Math.ceil(dailyAvg * 7) + product.minimumStock - product.stock);
            suggestions.push({
                name: product.name,
                currentStock: product.stock.toFixed(2),
                dailyAvg: dailyAvg.toFixed(1),
                suggestedQty
            });
        }
    });
    const content = document.getElementById("suggestContent");
    if (suggestions.length === 0) {
        content.innerHTML = "<p style='text-align:center; padding:20px;'>✅ No hay productos urgentes por comprar.</p>";
    } else {
        content.innerHTML = suggestions.map(s => `
            <div class="suggest-item">
                <strong>${s.name}</strong>
                <small>Stock actual: ${s.currentStock} | Venta diaria: ~${s.dailyAvg}</small>
                <div style="margin-top:8px; color: var(--primary); font-weight:bold;">
                    💡 Comprar aprox: ${s.suggestedQty}
                </div>
            </div>
        `).join("");
    }
    document.getElementById("suggestModal").classList.add("show");
}

/* =========================================================
   MODAL PRODUCTO
========================================================= */
const modal = document.getElementById("productModal");

function openProductModal() {
    document.getElementById("modalTitle").textContent = "Nuevo producto";
    document.getElementById("productForm").reset();
    document.getElementById("productId").value = "";
    document.getElementById("minimumStock").value = 5;
    document.getElementById("baseUnit").value = "kg";
    renderCategoryOptions();
    toggleCategoryFields();
    updateBaseUnitLabels();
    modal.classList.add("show");
}

function closeProductModal() { modal.classList.remove("show"); }

function updateBaseUnitLabels() {
    const unit = document.getElementById("baseUnit").value;
    const labels = { kg: "por kg", lb: "por lb", arroba: "por arroba (@)" };
    const unitName = labels[unit] || "por kg";
    document.getElementById("labelPurchaseUnit").textContent = unitName;
    document.getElementById("labelSaleUnit").textContent = unitName;
    const stockLabels = { kg: "kg", lb: "libras", arroba: "arrobas (@)" };
    document.getElementById("stockLabelWeight").textContent = `Peso disponible (${stockLabels[unit]})`;
    updateWeightEquivalences();
}

function updateWeightEquivalences() {
    const unit = document.getElementById("baseUnit").value;
    const salePriceBase = Number(document.getElementById("salePriceBase").value) || 0;
    if (salePriceBase <= 0) {
        document.getElementById("eqPriceKg").textContent = "$0";
        document.getElementById("eqPriceLb").textContent = "$0";
        document.getElementById("eqPriceArroba").textContent = "$0";
        return;
    }
    let priceKg;
    if (unit === "kg") priceKg = salePriceBase;
    else if (unit === "lb") priceKg = salePriceBase * WEIGHT_CONVERSIONS.kg_to_lb;
    else if (unit === "arroba") priceKg = salePriceBase * WEIGHT_CONVERSIONS.kg_to_arroba;
    const priceLb = priceKg / WEIGHT_CONVERSIONS.kg_to_lb;
    const priceArroba = priceLb * 25;
    document.getElementById("eqPriceKg").textContent = formatMoney(Math.round(priceKg));
    document.getElementById("eqPriceLb").textContent = formatMoney(Math.round(priceLb));
    document.getElementById("eqPriceArroba").textContent = formatMoney(Math.round(priceArroba));
}

function editProduct(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    document.getElementById("modalTitle").textContent = "Editar producto";
    document.getElementById("productId").value = p.id;
    document.getElementById("productName").value = p.name;
    document.getElementById("productBarcode").value = p.barcode || "";
    renderCategoryOptions();
    document.getElementById("productCategory").value = p.category || categories[0].name;

    const isWeight = p.saleType === "weight";
    if (isWeight) {
        const baseUnit = p.baseUnit || "kg";
        document.getElementById("baseUnit").value = baseUnit;
        let purchasePriceBase = 0, salePriceBase = 0;
        if (baseUnit === "kg") {
            purchasePriceBase = p.purchasePriceKg || 0;
            salePriceBase = p.salePriceKg || 0;
        } else if (baseUnit === "lb") {
            purchasePriceBase = p.purchasePriceKg ? Math.round(p.purchasePriceKg / WEIGHT_CONVERSIONS.kg_to_lb) : 0;
            salePriceBase = p.salePriceLb || 0;
        } else if (baseUnit === "arroba") {
            purchasePriceBase = p.purchasePriceKg ? Math.round(p.purchasePriceKg * WEIGHT_CONVERSIONS.kg_to_arroba) : 0;
            salePriceBase = p.salePriceArroba || 0;
        }
        document.getElementById("purchasePriceBase").value = purchasePriceBase;
        document.getElementById("salePriceBase").value = salePriceBase;
        document.getElementById("stockWeight").value = p.stock || 0;
    } else {
        document.getElementById("purchasePrice").value = p.purchasePrice;
        document.getElementById("salePrice").value = p.salePrice;
        document.getElementById("stock").value = p.stock;
    }
    document.getElementById("minimumStock").value = p.minimumStock;
    toggleCategoryFields();
    updateBaseUnitLabels();
    modal.classList.add("show");
}

function saveProduct(event) {
    event.preventDefault();
    const id = document.getElementById("productId").value;
    const name = document.getElementById("productName").value.trim();
    const barcode = document.getElementById("productBarcode").value.trim();
    const category = document.getElementById("productCategory").value;
    const minStock = Number(document.getElementById("minimumStock").value);

    if (!name) { alert("Nombre obligatorio."); return; }
    if (isNaN(minStock) || minStock < 0) { alert("Stock mínimo inválido."); return; }

    const isWeightCategory = categoryIsWeight(category);
    let data = { name, barcode, category, minimumStock: minStock };

    if (isWeightCategory) {
        const baseUnit = document.getElementById("baseUnit").value;
        const ppBase = Number(document.getElementById("purchasePriceBase").value);
        const spBase = Number(document.getElementById("salePriceBase").value);
        const stockWeight = Number(document.getElementById("stockWeight").value);

        if (isNaN(ppBase) || ppBase < 0) { alert("Precio de compra inválido."); return; }
        if (isNaN(spBase) || spBase <= 0) { alert("Precio de venta inválido."); return; }
        if (isNaN(stockWeight) || stockWeight < 0) { alert("Peso inválido."); return; }

        let priceKgPurchase, priceKgSale, priceLbSale, priceArrobaSale;
        if (baseUnit === "kg") {
            priceKgPurchase = ppBase; priceKgSale = spBase;
            priceLbSale = Math.round(spBase / WEIGHT_CONVERSIONS.kg_to_lb);
            priceArrobaSale = Math.round(priceLbSale * 25);
        } else if (baseUnit === "lb") {
            priceKgPurchase = Math.round(ppBase * WEIGHT_CONVERSIONS.kg_to_lb);
            priceKgSale = Math.round(spBase * WEIGHT_CONVERSIONS.kg_to_lb);
            priceLbSale = spBase;
            priceArrobaSale = Math.round(spBase * 25);
        } else {
            priceKgPurchase = Math.round(ppBase * WEIGHT_CONVERSIONS.kg_to_arroba);
            priceKgSale = Math.round(spBase * WEIGHT_CONVERSIONS.kg_to_arroba);
            priceLbSale = Math.round(spBase / 25);
            priceArrobaSale = spBase;
        }

        data = {
            ...data, saleType: "weight", baseUnit,
            purchasePriceKg: priceKgPurchase, salePriceKg: priceKgSale,
            salePriceLb: priceLbSale, salePriceArroba: priceArrobaSale,
            stock: stockWeight,
            purchasePrice: priceKgPurchase, salePrice: priceKgSale
        };
    } else {
        const pp = Number(document.getElementById("purchasePrice").value);
        const sp = Number(document.getElementById("salePrice").value);
        const stock = Number(document.getElementById("stock").value);
        if (isNaN(pp) || pp < 0) { alert("Precio compra inválido."); return; }
        if (isNaN(sp) || sp <= 0) { alert("Precio venta inválido."); return; }
        if (isNaN(stock) || stock < 0) { alert("Stock inválido."); return; }
        if (sp < pp && !confirm("⚠️ Precio venta < precio compra. ¿Continuar?")) return;
        data = { ...data, saleType: "unit", purchasePrice: pp, salePrice: sp, stock };
    }

    if (barcode && !hasFeature("barcode")) {
        alert("🔒 El código de barras requiere plan ProMax.");
        document.getElementById("productBarcode").value = "";
        data.barcode = "";
    }
    if (barcode) {
        const exists = products.find(p => p.barcode === barcode && p.id !== id && p.active !== false);
        if (exists) { alert(`Código ya asignado a "${exists.name}".`); return; }
    }
    if (!id && !checkProductLimit()) return;

    if (id) {
        const idx = products.findIndex(p => p.id === id);
        if (idx !== -1) products[idx] = { ...products[idx], ...data };
    } else {
        products.push({ id: generateId(), active: true, ...data });
    }
    saveData();
    closeProductModal();
    showToast("💾 Producto guardado");
    renderAll();
}

function deleteProduct(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    if (!confirm(`¿Archivar "${p.name}"?`)) return;
    p.active = false;
    saveData();
    showToast("📦 Producto archivado");
    renderAll();
}

/* =========================================================
   CLIENTES
========================================================= */
const clientModal = document.getElementById("clientModal");

function openClientModal() {
    if (!requireFeature("credits", "Clientes y fiados")) return;
    document.getElementById("clientModalTitle").textContent = "Nuevo cliente";
    document.getElementById("clientForm").reset();
    document.getElementById("clientId").value = "";
    document.getElementById("clientBalance").value = 0;
    clientModal.classList.add("show");
}

function closeClientModal() { clientModal.classList.remove("show"); }

function editClient(id) {
    if (!requireFeature("credits", "Clientes y fiados")) return;
    const c = clients.find(x => x.id === id);
    if (!c) return;
    document.getElementById("clientModalTitle").textContent = "Editar cliente";
    document.getElementById("clientId").value = c.id;
    document.getElementById("clientName").value = c.name;
    document.getElementById("clientPhone").value = c.phone || "";
    document.getElementById("clientAddress").value = c.address || "";
    document.getElementById("clientBalance").value = c.balance || 0;
    clientModal.classList.add("show");
}

function saveClient(event) {
    event.preventDefault();
    const id = document.getElementById("clientId").value;
    const name = document.getElementById("clientName").value.trim();
    const phone = document.getElementById("clientPhone").value.trim();
    const address = document.getElementById("clientAddress").value.trim();
    const balance = Number(document.getElementById("clientBalance").value) || 0;
    if (!name) { alert("Nombre obligatorio."); return; }
    if (id) {
        const idx = clients.findIndex(c => c.id === id);
        if (idx !== -1) clients[idx] = { ...clients[idx], name, phone, address, balance };
    } else {
        clients.push({ id: generateId(), name, phone, address, balance, movements: [] });
    }
    saveData();
    closeClientModal();
    showToast("💾 Cliente guardado");
    renderAll();
}

function deleteClient(id) {
    const c = clients.find(x => x.id === id);
    if (!c) return;
    if (c.balance > 0) {
        alert(`${c.name} debe ${formatMoney(c.balance)}. No se puede eliminar.`);
        return;
    }
    if (!confirm(`¿Eliminar a "${c.name}"?`)) return;
    clients = clients.filter(x => x.id !== id);
    saveData();
    showToast("🗑️ Cliente eliminado");
    renderAll();
}

function renderClients() {
    const table = document.getElementById("clientsTable");
    if (!table) return;
    table.innerHTML = "";
    if (clients.length === 0) {
        table.innerHTML = `<tr><td colspan="5">No hay clientes registrados.</td></tr>`;
        document.getElementById("totalClients").textContent = 0;
        document.getElementById("totalDebt").textContent = formatMoney(0);
        return;
    }
    clients.forEach(client => {
        const bal = client.balance || 0;
        const row = document.createElement("tr");
        const phoneClean = (client.phone || "").replace(/\D/g, "");
        const waMsg = encodeURIComponent(`Hola ${client.name}, te recuerdo tu saldo pendiente: ${formatMoney(bal)}. ¡Gracias!`);
        const waLink = phoneClean ? `https://wa.me/57${phoneClean}?text=${waMsg}` : `https://wa.me/?text=${waMsg}`;
        const showWhatsapp = bal > 0 && hasFeature("whatsapp");

        row.innerHTML = `
            <td><strong>${client.name}</strong></td>
            <td>${client.phone || "-"}</td>
            <td>${client.address || "-"}</td>
            <td style="color:${bal > 0 ? '#dc2626' : '#16a34a'}; font-weight:bold;">${formatMoney(bal)}</td>
            <td>
                ${bal > 0 ? `
                    <button class="action-btn abono-btn" onclick="openAbono('${client.id}')">💰 Abonar</button>
                    ${showWhatsapp ? `<a href="${waLink}" target="_blank" class="action-btn wa-btn" style="text-decoration:none; display:inline-block;">📱 WhatsApp</a>` : ""}
                ` : ""}
                <button class="action-btn view-btn" onclick="viewClientDetail('${client.id}')">📋 Ver</button>
                <button class="action-btn edit-btn" onclick="editClient('${client.id}')">Editar</button>
                <button class="action-btn delete-btn" onclick="deleteClient('${client.id}')">Eliminar</button>
            </td>
        `;
        table.appendChild(row);
    });
    document.getElementById("totalClients").textContent = clients.length;
    document.getElementById("totalDebt").textContent =
        formatMoney(clients.reduce((s, c) => s + (c.balance || 0), 0));
}

function viewClientDetail(clientId) {
    const c = clients.find(x => x.id === clientId);
    if (!c) return;
    const movements = (c.movements || []).slice().reverse().slice(0, 20);
    const totalCredit = (c.movements || []).filter(m => m.type === "credit").reduce((s, m) => s + m.amount, 0);
    const totalPaid = (c.movements || []).filter(m => m.type === "payment").reduce((s, m) => s + m.amount, 0);

    const movementsHTML = movements.length === 0
        ? `<p style="text-align:center; color:var(--muted); padding:15px; font-size:13px;">Sin movimientos registrados</p>`
        : movements.map(m => `
            <div class="abono-history-item">
                <div>
                    <span class="abono-type ${m.type}">${m.type === "credit" ? "📝 Fiado" : "💰 Abono"}</span>
                    <small style="color:var(--muted); margin-left:8px;">${m.date} ${m.time || ""}</small>
                </div>
                <span class="abono-amount ${m.type}">${m.type === "credit" ? "+" : "-"}${formatMoney(m.amount)}</span>
            </div>
        `).join("");

    const content = document.getElementById("clientDetailContent");
    content.innerHTML = `
        <div class="client-detail-card">
            <h3>👤 ${c.name}</h3>
            <p>📱 Teléfono: <strong>${c.phone || "No registrado"}</strong></p>
            <p>🏠 Dirección: <strong>${c.address || "No registrada"}</strong></p>
        </div>
        <div class="inventory-summary" style="margin-bottom:15px;">
            <div class="summary-card"><span>Total fiado</span><strong>${formatMoney(totalCredit)}</strong></div>
            <div class="summary-card"><span>Total abonado</span><strong>${formatMoney(totalPaid)}</strong></div>
            <div class="summary-card danger"><span>Saldo actual</span><strong>${formatMoney(c.balance || 0)}</strong></div>
        </div>
        <p class="abono-history-title">📜 Últimos movimientos</p>
        ${movementsHTML}
    `;
    document.getElementById("clientDetailModal").classList.add("show");
}

function closeClientDetailModal() {
    document.getElementById("clientDetailModal").classList.remove("show");
}

function updateCreditClientSelect() {
    const select = document.getElementById("creditClient");
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">-- Seleccionar cliente --</option>';
    clients.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = `${c.name}${c.balance > 0 ? ` (debe ${formatMoney(c.balance)})` : ""}`;
        select.appendChild(opt);
    });
    if (current) select.value = current;
}

/* =========================================================
   PROVEEDORES
========================================================= */
const providerModal = document.getElementById("providerModal");

function openProviderModal() {
    document.getElementById("providerModalTitle").textContent = "Nuevo proveedor";
    document.getElementById("providerForm").reset();
    document.getElementById("providerId").value = "";
    providerModal.classList.add("show");
}

function closeProviderModal() { providerModal.classList.remove("show"); }

function editProvider(id) {
    const p = providers.find(x => x.id === id);
    if (!p) return;
    document.getElementById("providerModalTitle").textContent = "Editar proveedor";
    document.getElementById("providerId").value = p.id;
    document.getElementById("providerName").value = p.name;
    document.getElementById("providerPhone").value = p.phone;
    document.getElementById("providerProducts").value = p.products || "";
    providerModal.classList.add("show");
}

function saveProvider(event) {
    event.preventDefault();
    const id = document.getElementById("providerId").value;
    const name = document.getElementById("providerName").value.trim();
    const phone = document.getElementById("providerPhone").value.trim();
    const productsSold = document.getElementById("providerProducts").value.trim();
    if (!name || !phone) { alert("Nombre y teléfono son obligatorios."); return; }
    if (id) {
        const idx = providers.findIndex(p => p.id === id);
        if (idx !== -1) providers[idx] = { ...providers[idx], name, phone, products: productsSold };
    } else {
        providers.push({ id: generateId(), name, phone, products: productsSold });
    }
    saveData();
    closeProviderModal();
    showToast("💾 Proveedor guardado");
    renderAll();
}

function deleteProvider(id) {
    const p = providers.find(x => x.id === id);
    if (!p) return;
    if (!confirm(`¿Eliminar a "${p.name}"?`)) return;
    providers = providers.filter(x => x.id !== id);
    saveData();
    showToast("🗑️ Proveedor eliminado");
    renderAll();
}

function renderProviders() {
    const table = document.getElementById("providersTable");
    if (!table) return;
    table.innerHTML = "";
    if (providers.length === 0) {
        table.innerHTML = `<tr><td colspan="4">No hay proveedores registrados.</td></tr>`;
        document.getElementById("totalProviders").textContent = 0;
        return;
    }
    providers.forEach(provider => {
        const phoneClean = (provider.phone || "").replace(/\D/g, "");
        const waMsg = encodeURIComponent(`Hola ${provider.name}, necesito hacer un pedido para la tienda.`);
        const waLink = `https://wa.me/57${phoneClean}?text=${waMsg}`;
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${provider.name}</strong></td>
            <td>${provider.phone}</td>
            <td>${provider.products || "-"}</td>
            <td>
                <a href="tel:${provider.phone}" class="action-btn call-btn" style="text-decoration:none; display:inline-block;">📞 Llamar</a>
                <a href="${waLink}" target="_blank" class="action-btn wa-btn" style="text-decoration:none; display:inline-block;">📱 WhatsApp</a>
                <button class="action-btn edit-btn" onclick="editProvider('${provider.id}')">Editar</button>
                <button class="action-btn delete-btn" onclick="deleteProvider('${provider.id}')">Eliminar</button>
            </td>
        `;
        table.appendChild(row);
    });
    document.getElementById("totalProviders").textContent = providers.length;
}

/* =========================================================
   ABONOS
========================================================= */
const abonoModal = document.getElementById("abonoModal");

function openAbono(clientId) {
    if (!requireFeature("credits", "Ventas fiadas")) return;
    const c = clients.find(x => x.id === clientId);
    if (!c) return;
    document.getElementById("abonoClientId").value = clientId;
    document.getElementById("abonoClientName").textContent = `Cliente: ${c.name}`;
    document.getElementById("abonoCurrentBalance").textContent = `Saldo: ${formatMoney(c.balance)}`;
    document.getElementById("abonoAmount").value = "";
    abonoModal.classList.add("show");
}

function closeAbonoModal() { abonoModal.classList.remove("show"); }

function saveAbono(event) {
    event.preventDefault();
    const clientId = document.getElementById("abonoClientId").value;
    const amount = Number(document.getElementById("abonoAmount").value);
    if (!amount || amount <= 0) { alert("Monto inválido."); return; }
    const c = clients.find(x => x.id === clientId);
    if (!c) return;
    if (amount > c.balance) { alert(`Abono mayor al saldo (${formatMoney(c.balance)}).`); return; }
    c.balance -= amount;
    if (!c.movements) c.movements = [];
    c.movements.push({
        type: "payment", amount,
        date: todayString(), time: getCurrentTime()
    });
    saveData();
    closeAbonoModal();
    showToast(`💰 Abono: ${formatMoney(amount)}`);
    renderAll();
}

/* =========================================================
   REPORTES
========================================================= */
function getFilteredSales() {
    const period = document.getElementById("reportPeriod").value;
    const active = sales.filter(s => !s.cancelled);
    if (period === "today") return active.filter(s => s.date === todayString());
    if (period === "week") {
        const limit = new Date(); limit.setDate(limit.getDate() - 7);
        return active.filter(s => new Date(s.date) >= limit);
    }
    if (period === "month") {
        const limit = new Date(); limit.setDate(limit.getDate() - 30);
        return active.filter(s => new Date(s.date) >= limit);
    }
    return active;
}

function renderReports() {
    const filtered = getFilteredSales();
    document.getElementById("todaySales").textContent = formatMoney(filtered.reduce((s, x) => s + x.total, 0));
    document.getElementById("todayTransactions").textContent = filtered.length;
    document.getElementById("todayProducts").textContent = filtered.reduce((s, x) => s + x.quantity, 0);
    document.getElementById("todayProfit").textContent = formatMoney(filtered.reduce((s, x) => s + x.profit, 0));
    renderSalesHistory();
    renderCharts();
}

function renderCharts() {
    const last7Days = [];
    const last7Labels = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const dayTotal = sales.filter(s => !s.cancelled && s.date === dateStr).reduce((sum, s) => sum + s.total, 0);
        last7Days.push(dayTotal);
        last7Labels.push(d.toLocaleDateString("es-CO", { weekday: "short", day: "numeric" }));
    }

    const ctx1 = document.getElementById("salesChart").getContext("2d");
    if (salesChartInstance) salesChartInstance.destroy();
    salesChartInstance = new Chart(ctx1, {
        type: "bar",
        data: { labels: last7Labels, datasets: [{ label: "Ventas ($)", data: last7Days, backgroundColor: appSettings.accent, borderRadius: 6 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => "$" + v.toLocaleString("es-CO") } } }
        }
    });

    const productCount = {};
    sales.filter(s => !s.cancelled).forEach(s => s.products.forEach(p => {
        const baseName = p.name.split(" (")[0];
        productCount[baseName] = (productCount[baseName] || 0) + 1;
    }));
    const sorted = Object.entries(productCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const labels = sorted.map(x => x[0]);
    const data = sorted.map(x => x[1]);

    const ctx2 = document.getElementById("topProductsChart").getContext("2d");
    if (topProductsChartInstance) topProductsChartInstance.destroy();
    if (data.length === 0) {
        topProductsChartInstance = new Chart(ctx2, {
            type: "bar",
            data: { labels: ["Sin datos"], datasets: [{ data: [0], backgroundColor: "#94a3b8" }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    } else {
        topProductsChartInstance = new Chart(ctx2, {
            type: "doughnut",
            data: { labels, datasets: [{ data, backgroundColor: ["#1e40af", "#16a34a", "#f59e0b", "#dc2626", "#8b5cf6"] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
        });
    }

    const categoryTotals = {};
    sales.filter(s => !s.cancelled).forEach(s => {
        s.products.forEach(p => {
            const baseName = p.name.split(" (")[0];
            const product = products.find(pr => pr.name === baseName);
            const cat = product ? (product.category || "Sin categoría") : "Sin categoría";
            categoryTotals[cat] = (categoryTotals[cat] || 0) + (p.price * (p.isWeight ? 1 : p.quantity));
        });
    });
    const catSorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const catLabels = catSorted.map(x => x[0]);
    const catData = catSorted.map(x => x[1]);

    const ctx3 = document.getElementById("categoryChart").getContext("2d");
    if (categoryChartInstance) categoryChartInstance.destroy();
    if (catData.length === 0) {
        categoryChartInstance = new Chart(ctx3, {
            type: "bar",
            data: { labels: ["Sin datos"], datasets: [{ data: [0], backgroundColor: "#94a3b8" }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    } else {
        categoryChartInstance = new Chart(ctx3, {
            type: "bar",
            data: {
                labels: catLabels,
                datasets: [{
                    label: "Ventas ($)", data: catData,
                    backgroundColor: ["#1e40af", "#16a34a", "#f59e0b", "#dc2626", "#8b5cf6", "#06b6d4", "#ec4899"],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { callback: v => "$" + v.toLocaleString("es-CO") } } }
            }
        });
    }
}

function renderSalesHistory() {
    const table = document.getElementById("salesHistory");
    if (!table) return;
    table.innerHTML = "";
    const last = [...sales].reverse().slice(0, 20);
    if (last.length === 0) {
        table.innerHTML = `<tr><td colspan="6">No hay ventas registradas.</td></tr>`;
        return;
    }
    last.forEach(sale => {
        const row = document.createElement("tr");
        if (sale.cancelled) row.className = "cancelled-sale";
        const txt = sale.products.map(p => p.name).join(", ");
        let typeLabel = "💵 Efectivo";
        if (sale.paymentType === "credit") typeLabel = `📝 Fiado (${sale.clientName})`;
        else if (sale.paymentType === "transfer") typeLabel = "📱 Transferencia";

        row.innerHTML = `
            <td>${sale.date}</td>
            <td>${sale.time}</td>
            <td>${txt}</td>
            <td>${formatMoney(sale.total)}</td>
            <td>${sale.cancelled ? "❌ Anulada" : typeLabel}</td>
            <td>
                <button class="action-btn print-btn" onclick="reprint('${sale.id}')">🖨️</button>
                ${!sale.cancelled ? `<button class="action-btn cancel-btn" onclick="openCancelSale('${sale.id}')">❌</button>` : ""}
            </td>
        `;
        table.appendChild(row);
    });
}

function reprint(saleId) {
    const sale = sales.find(s => s.id === saleId);
    if (sale) showReceipt(sale);
}

/* =========================================================
   ANULAR VENTA
========================================================= */
function openCancelSale(saleId) {
    if (getCancellationsToday() >= 3) {
        alert("🚫 Se alcanzó el límite de 3 anulaciones por día.\n\nContacta a soporte si necesitas más.");
        return;
    }
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;
    saleToCancel = sale;

    document.getElementById("cancelSaleInfo").innerHTML = `
        <strong>Recibo #${sale.id.slice(-6).toUpperCase()}</strong><br>
        Fecha: ${sale.date} ${sale.time}<br>
        Total: ${formatMoney(sale.total)}
    `;
    document.getElementById("cancelSalePassword").value = "";
    document.getElementById("cancelSaleModal").classList.add("show");
}

function closeCancelSaleModal() {
    document.getElementById("cancelSaleModal").classList.remove("show");
    saleToCancel = null;
}

function confirmCancelSale() {
    if (!saleToCancel) return;
    const password = document.getElementById("cancelSalePassword").value.trim().toUpperCase();

    let validSession = hasActiveUnlockSession();

    if (!validSession) {
        const savedTempCode = sessionStorage.getItem("j2_last_temp_code");
        if (!savedTempCode) {
            alert("❌ No hay una sesión de recuperación activa.\n\nPresiona 'Solicitar contraseña temporal' primero.");
            return;
        }
        if (!validateUnlockCode(password, savedTempCode)) {
            alert("❌ Contraseña inválida o expirada.\n\nSolicita una nueva.");
            return;
        }
        applyUnlockPassword(savedTempCode);
        validSession = true;
        sessionStorage.removeItem("j2_last_temp_code");
    }

    saleToCancel.products.forEach(p => {
        const product = products.find(pr => pr.id === p.productId);
        if (product) {
            if (p.isWeight && p.weightInBase) {
                product.stock += p.weightInBase;
            } else {
                product.stock += p.quantity;
            }
        }
    });

    if (saleToCancel.paymentType === "credit" && saleToCancel.clientId) {
        const client = clients.find(c => c.id === saleToCancel.clientId);
        if (client) {
            client.balance -= saleToCancel.total;
            if (client.balance < 0) client.balance = 0;
            if (!client.movements) client.movements = [];
            client.movements.push({
                type: "payment", amount: saleToCancel.total,
                date: todayString(), time: getCurrentTime(),
                note: "Anulación de venta"
            });
        }
    }

    saleToCancel.cancelled = true;
    saleToCancel.cancelledAt = new Date().toISOString();
    consumeUnlockSession();
    saveData();
    closeCancelSaleModal();
    showToast("❌ Venta anulada. Stock devuelto.");
    renderAll();
}

/* =========================================================
   SOLICITAR CONTRASEÑA TEMPORAL
========================================================= */
function openRequestPasswordModal() {
    closeCancelSaleModal();
    currentTempCode = generateTempRequestCode();
    sessionStorage.setItem("j2_last_temp_code", currentTempCode);
    document.getElementById("tempCodeValue").textContent = currentTempCode;
    document.getElementById("tempCodeValue").style.color = "";

    let secondsLeft = TEMP_CODE_WINDOW * 60;
    if (tempCodeTimerInterval) clearInterval(tempCodeTimerInterval);

    function updateTimer() {
        const min = Math.floor(secondsLeft / 60);
        const sec = secondsLeft % 60;
        document.getElementById("tempCodeTimer").textContent =
            `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;

        if (secondsLeft <= 0) {
            clearInterval(tempCodeTimerInterval);
            document.getElementById("tempCodeTimer").textContent = "EXPIRADO";
            document.getElementById("tempCodeValue").style.color = "#dc2626";
        }
        secondsLeft--;
    }
    updateTimer();
    tempCodeTimerInterval = setInterval(updateTimer, 1000);
    document.getElementById("requestPasswordModal").classList.add("show");
}

function closeRequestPasswordModal() {
    document.getElementById("requestPasswordModal").classList.remove("show");
    if (tempCodeTimerInterval) clearInterval(tempCodeTimerInterval);
}

function sendTempCodeByWhatsApp() {
    if (!currentTempCode) return;
    const msg = encodeURIComponent(
        `Hola Sakura · Solución IT, necesito una contraseña temporal para J2.\n\nCódigo: ${currentTempCode}`
    );
    window.open(`https://wa.me/${SAKURA_CONFIG.phone}?text=${msg}`, "_blank");
}

/* =========================================================
   CIERRE DE CAJA
========================================================= */
function generateCashReport() {
    if (!requireFeature("cash_register", "Cierre de caja")) return;
    const today = todayString();
    const todaySales = sales.filter(s => s.date === today && !s.cancelled);
    const cash = todaySales.filter(s => s.paymentType === "cash");
    const transfer = todaySales.filter(s => s.paymentType === "transfer");
    const credit = todaySales.filter(s => s.paymentType === "credit");

    const cashTotal = cash.reduce((s, x) => s + x.total, 0);
    const transferTotal = transfer.reduce((s, x) => s + x.total, 0);
    const creditTotal = credit.reduce((s, x) => s + x.total, 0);
    const totalSales = cashTotal + transferTotal + creditTotal;
    const profit = todaySales.reduce((s, x) => s + x.profit, 0);
    const cashReceived = cash.reduce((s, x) => s + x.received, 0);
    const cashChange = cash.reduce((s, x) => s + x.change, 0);

    const date = new Date().toLocaleDateString("es-CO", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    const storeName = storeSettings.name || "J2";
    const report = document.getElementById("cashReport");
    report.innerHTML = `
        <h3>💰 Cierre de Caja - ${storeName}</h3>
        <p style="color:var(--muted); margin-bottom:20px;">${date}</p>
        <div class="cash-row"><span>💵 Ventas en efectivo</span><strong>${formatMoney(cashTotal)}</strong></div>
        <div class="cash-row"><span>📱 Ventas por transferencia</span><strong>${formatMoney(transferTotal)}</strong></div>
        <div class="cash-row"><span>📝 Ventas fiadas</span><strong>${formatMoney(creditTotal)}</strong></div>
        <div class="cash-row total"><span>TOTAL VENDIDO</span><strong>${formatMoney(totalSales)}</strong></div>
        <h3 style="margin-top:25px;">💵 Movimiento en efectivo</h3>
        <div class="cash-row"><span>Efectivo recibido</span><strong>${formatMoney(cashReceived)}</strong></div>
        <div class="cash-row"><span>Cambio entregado</span><strong>- ${formatMoney(cashChange)}</strong></div>
        <div class="cash-row total"><span>Efectivo en caja</span><strong>${formatMoney(cashReceived - cashChange)}</strong></div>
        <h3 style="margin-top:25px;">📊 Resumen</h3>
        <div class="cash-row"><span>Transacciones totales</span><strong>${todaySales.length}</strong></div>
        <div class="cash-row"><span>Productos vendidos</span><strong>${todaySales.reduce((s, x) => s + x.quantity, 0)}</strong></div>
        <div class="cash-row total"><span>GANANCIA ESTIMADA</span><strong>${formatMoney(profit)}</strong></div>
        <div style="margin-top:25px; text-align:center;">
            <button class="primary-btn" onclick="window.print()">🖨️ Imprimir cierre</button>
        </div>
    `;
}

/* =========================================================
   EXPORTAR CSV
========================================================= */
function exportCSV() {
    if (!requireFeature("reports", "Exportar reportes")) return;
    if (sales.length === 0) { alert("No hay ventas para exportar."); return; }
    const headers = ["Fecha", "Hora", "Productos", "Total", "Recibido", "Cambio", "Ganancia", "Tipo", "Cliente", "Cédula", "Estado"];
    const rows = sales.map(s => [
        s.date, s.time,
        s.products.map(p => p.name).join(" | "),
        s.total, s.received, s.change, s.profit,
        s.paymentType === "credit" ? "Fiado" : s.paymentType === "transfer" ? "Transferencia" : "Efectivo",
        s.saleClientName || s.clientName || "",
        s.saleClientId || "",
        s.cancelled ? "Anulada" : "Activa"
    ]);
    let csv = headers.join(",") + "\n";
    rows.forEach(r => {
        csv += r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",") + "\n";
    });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ventas_${todayString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("📄 CSV descargado");
}

/* =========================================================
   CÓDIGO DE BARRAS
========================================================= */
const scanModal = document.getElementById("scanModal");

function openScanModal() {
    if (!requireFeature("barcode", "Código de barras")) return;
    scanModal.classList.add("show");
    setTimeout(() => {
        html5QrCode = new Html5Qrcode("qrReader");
        html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 150 } },
            (text) => { closeScanModal(); handleBarcodeScanned(text); },
            () => {}
        ).catch(() => {
            alert("No se pudo acceder a la cámara.");
            closeScanModal();
        });
    }, 300);
}

function closeScanModal() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => { html5QrCode.clear(); html5QrCode = null; }).catch(() => {});
    }
    scanModal.classList.remove("show");
}

function handleBarcodeScanned(barcode) {
    const product = products.find(x => x.barcode === barcode && x.active !== false);
    if (product) {
        if (product.saleType === "weight") {
            openWeightModal(product);
        } else {
            addToCart(product.id);
            showToast(`✅ ${product.name} agregado`);
        }
    } else {
        showToast(`❌ Código ${barcode} no registrado`);
        if (confirm(`El código ${barcode} no está registrado.\n\n¿Crear un producto nuevo?`)) {
            openProductModal();
            document.getElementById("productBarcode").value = barcode;
        }
    }
}

/* =========================================================
   RESPALDO
========================================================= */
function backupData() {
    if (!requireFeature("backup", "Respaldos")) return;
    const data = {
        products, sales, clients, providers, categories,
        storeSettings, appSettings,
        version: "7.0", date: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `j2_backup_${todayString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("💾 Respaldo descargado");
}

function restoreData(event) {
    if (!requireFeature("backup", "Respaldos")) return;
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.products || !data.sales) throw new Error("Formato inválido");
            if (!confirm("⚠️ Esto reemplazará TODOS los datos actuales. ¿Continuar?")) return;
            products = data.products;
            sales = data.sales;
            clients = data.clients || [];
            providers = data.providers || [];
            categories = data.categories || categories;
            storeSettings = data.storeSettings || storeSettings;
            appSettings = data.appSettings || appSettings;
            saveData();
            saveSettings();
            applyTheme();
            applyStoreBranding();
            showToast("📂 Datos restaurados");
            renderAll();
        } catch (err) {
            alert("Archivo inválido.");
        }
    };
    reader.readAsText(file);
    event.target.value = "";
}

/* =========================================================
   LIMPIAR VENTA
========================================================= */
function clearSale() {
    if (cart.length > 0 && !confirm("¿Cancelar la venta actual?")) return;
    cart = [];
    document.getElementById("cashReceived").value = "";
    document.getElementById("saleClientName").value = "";
    document.getElementById("saleClientId").value = "";
    document.querySelector('input[name="paymentType"][value="cash"]').checked = true;
    togglePaymentMode();
    renderCart();
}

/* =========================================================
   LICENCIA UI
========================================================= */
function updateExpiryBanner() {
    const banner = document.getElementById("expiryBanner");
    if (!banner) return;

    if (isDemo()) {
        banner.style.display = "none";
        updateDemoBanner();
        return;
    }

    if (!license || !isLicenseValid()) {
        banner.style.display = "none";
        return;
    }

    const days = daysUntilExpiry();
    if (days > 7) {
        banner.style.display = "none";
        return;
    }

    banner.style.display = "flex";
    banner.classList.toggle("danger", days <= 3);

    let msg = "";
    if (days <= 0) msg = "🚨 ¡Tu licencia vence HOY!";
    else if (days === 1) msg = "⚠️ Tu licencia vence mañana.";
    else msg = `⏰ Tu licencia vence en ${days} días.`;

    banner.innerHTML = `
        <span>${msg} Renueva para seguir usando todas las funciones.</span>
        <button onclick="document.getElementById('plansModal').classList.add('show')">Ver planes</button>
    `;
}

function updateDemoBanner() {
    const banner = document.getElementById("demoBanner");
    if (!banner) return;

    if (!isDemo() || !isLicenseValid()) {
        banner.style.display = "none";
        return;
    }

    const days = daysUntilExpiry();
    banner.style.display = "flex";
    banner.classList.toggle("expiring", days <= 2);

    let msg = "";
    if (days <= 0) msg = "🚨 ¡Tu prueba gratis terminó!";
    else if (days === 1) msg = "⚠️ ¡Último día de prueba gratis!";
    else msg = `🎁 Estás en modo prueba · Te quedan ${days} días gratis`;

    banner.innerHTML = `
        <span>${msg}</span>
        <button onclick="document.getElementById('plansModal').classList.add('show')">
            Ver planes
        </button>
    `;
}

function initLicenseUI() {
    const modal = document.getElementById("licenseModal");
    if (isLicenseValid()) {
        modal.classList.remove("show");
        updateExpiryBanner();
        updatePlanBadge();
        return;
    }
    if (license && !isLicenseValid()) {
        document.getElementById("licenseTitle").textContent = "⏰ Licencia vencida";
        document.getElementById("licenseSubtitle").textContent =
            `Tu plan ${PLAN_FEATURES[license.plan]?.name || ""} venció.`;
    }
    modal.classList.add("show");
}

/* =========================================================
   CONFIGURACIÓN
========================================================= */
function openSettingsModal() {
    document.getElementById("settingsModal").classList.add("show");
    loadSettingsUI();
    updateTechStats();
}

function closeSettingsModal() {
    document.getElementById("settingsModal").classList.remove("show");
}

function loadSettingsUI() {
    document.getElementById("settingStoreName").value = storeSettings.name || "";
    document.getElementById("settingStoreSlogan").value = storeSettings.slogan || "";
    document.getElementById("settingStorePhone").value = storeSettings.phone || "";
    document.getElementById("settingStoreAddress").value = storeSettings.address || "";

    if (storeSettings.logo) {
        document.getElementById("logoPreviewImg").src = storeSettings.logo;
        document.getElementById("logoPreview").style.display = "block";
    } else {
        document.getElementById("logoPreview").style.display = "none";
    }

    const themeRadio = document.querySelector(`input[name="themeSelect"][value="${appSettings.theme}"]`);
    if (themeRadio) themeRadio.checked = true;

    const colorRadio = document.querySelector(`input[name="colorSelect"][value="${appSettings.accent}"]`);
    if (colorRadio) colorRadio.checked = true;

    const plan = getCurrentPlan();
    if (plan) {
        document.getElementById("settingsPlanName").textContent = plan.name + (isDemo() ? " (Demo)" : "");
        document.getElementById("settingsPlanActivated").textContent =
            license.activatedAt ? new Date(license.activatedAt).toLocaleDateString("es-CO") : "—";
        document.getElementById("settingsPlanExpiry").textContent =
            license.expiry ? new Date(license.expiry).toLocaleDateString("es-CO") : "—";
        document.getElementById("settingsPlanDays").textContent = `${daysUntilExpiry()} días`;
    }
}

function updateTechStats() {
    const stats = document.getElementById("techStats");
    const storage = JSON.stringify(localStorage).length;
    const storageKB = (storage / 1024).toFixed(2);

    stats.innerHTML = `
        <div><strong>Versión:</strong> 7.0</div>
        <div><strong>Modo:</strong> ${isDemo() ? "🎁 Demo (7 días)" : "💎 Licencia"}</div>
        <div><strong>Productos totales:</strong> ${products.length}</div>
        <div><strong>Ventas totales:</strong> ${sales.length}</div>
        <div><strong>Ventas anuladas:</strong> ${sales.filter(s => s.cancelled).length}</div>
        <div><strong>Anulaciones hoy:</strong> ${getCancellationsToday()} / 3</div>
        <div><strong>Clientes:</strong> ${clients.length}</div>
        <div><strong>Proveedores:</strong> ${providers.length}</div>
        <div><strong>Categorías:</strong> ${categories.length}</div>
        <div><strong>Uso de almacenamiento:</strong> ${storageKB} KB</div>
        <div><strong>Plan activo:</strong> ${getCurrentPlan()?.name || "Ninguno"}</div>
        <div><strong>Días restantes:</strong> ${daysUntilExpiry()}</div>
    `;
}

function saveStoreSettings() {
    storeSettings.name = document.getElementById("settingStoreName").value.trim();
    storeSettings.slogan = document.getElementById("settingStoreSlogan").value.trim();
    storeSettings.phone = document.getElementById("settingStorePhone").value.trim();
    storeSettings.address = document.getElementById("settingStoreAddress").value.trim();
    saveSettings();
    applyStoreBranding();
    showToast("💾 Datos de la tienda guardados");
}

function saveThemeSettings() {
    const themeRadio = document.querySelector('input[name="themeSelect"]:checked');
    const colorRadio = document.querySelector('input[name="colorSelect"]:checked');
    if (themeRadio) appSettings.theme = themeRadio.value;
    if (colorRadio) appSettings.accent = colorRadio.value;
    saveSettings();
    applyTheme();
    renderCharts();
    showToast("🎨 Tema actualizado");
}

/* =========================================================
   SISTEMA DE ACTUALIZACIONES
========================================================= */
function compareVersions(a, b) {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    const maxLen = Math.max(pa.length, pb.length);
    for (let i = 0; i < maxLen; i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na > nb) return 1;
        if (na < nb) return -1;
    }
    return 0;
}

async function checkForUpdates(force = false) {
    try {
        if (!force) {
            const lastCheck = localStorage.getItem(UPDATE_CONFIG.lastCheckKey);
            if (lastCheck) {
                const hoursSince = (Date.now() - parseInt(lastCheck)) / (1000 * 60 * 60);
                if (hoursSince < UPDATE_CONFIG.checkIntervalHours) {
                    const cached = localStorage.getItem("j2_update_cache");
                    if (cached) {
                        handleUpdateData(JSON.parse(cached));
                        return;
                    }
                }
            }
        }

        console.log("🔍 Buscando actualizaciones...");

        const response = await fetch(UPDATE_CONFIG.versionUrl + "?t=" + Date.now());
        if (!response.ok) throw new Error("No se pudo conectar");

        const data = await response.json();

        localStorage.setItem(UPDATE_CONFIG.lastCheckKey, Date.now().toString());
        localStorage.setItem("j2_update_cache", JSON.stringify(data));

        handleUpdateData(data);

    } catch (error) {
        console.log("⚠️ No se pudo verificar actualizaciones:", error.message);
    }
}

function handleUpdateData(data) {
    if (!data || !data.version) return;

    const comparison = compareVersions(data.version, UPDATE_CONFIG.currentVersion);

    if (comparison > 0) {
        console.log(`✨ Nueva versión disponible: ${data.version}`);
        localStorage.setItem("j2_update_available", JSON.stringify(data));

        const dismissedInSession = sessionStorage.getItem("j2_update_dismissed");
        if (!dismissedInSession) {
            showUpdateBanner(data);
        }
        updateSettingsBadge(true);
    } else {
        console.log("✅ Estás en la última versión");
        localStorage.removeItem("j2_update_available");
        updateSettingsBadge(false);
    }
}

function showUpdateBanner(data) {
    const banner = document.getElementById("updateBanner");
    if (!banner) return;

    banner.style.display = "flex";
    banner.innerHTML = `
        <div class="update-banner-content">
            <span class="update-icon">✨</span>
            <div class="update-text">
                <strong>Nueva versión disponible: v${data.version}</strong>
                <small>${data.notes || "Mejoras y correcciones"}</small>
            </div>
        </div>
        <div class="update-banner-actions">
            <button class="update-btn-primary" onclick="openUpdateModal()">Ver detalles</button>
            <button class="update-btn-dismiss" onclick="dismissUpdateBanner()">✕</button>
        </div>
    `;
}

function dismissUpdateBanner() {
    document.getElementById("updateBanner").style.display = "none";
    sessionStorage.setItem("j2_update_dismissed", "true");
}

function openUpdateModal() {
    const data = JSON.parse(localStorage.getItem("j2_update_available"));
    if (!data) {
        showToast("No hay actualización disponible");
        return;
    }

    const modal = document.getElementById("updateModal");
    const content = document.getElementById("updateContent");

    content.innerHTML = `
        <div class="update-header">
            <div class="update-icon-large">✨</div>
            <h3>Nueva versión disponible</h3>
            <p class="update-version-info">
                <span class="update-old">v${UPDATE_CONFIG.currentVersion}</span>
                <span class="update-arrow">→</span>
                <span class="update-new">v${data.version}</span>
            </p>
        </div>

        <div class="update-details">
            <div class="update-detail-row">
                <span>📅 Fecha de lanzamiento:</span>
                <strong>${data.releaseDate || "Reciente"}</strong>
            </div>
            <div class="update-detail-row">
                <span>📦 Tamaño aprox:</span>
                <strong>~2 MB</strong>
            </div>
        </div>

        <div class="update-notes">
            <h4>📝 Novedades:</h4>
            <p>${data.notes || "Mejoras y correcciones generales"}</p>
        </div>

        ${data.isCritical ? `
            <div class="update-critical">
                ⚠️ Esta actualización es importante. Te recomendamos actualizar pronto.
            </div>
        ` : ""}

        <div class="update-actions">
            <a href="${data.downloadUrl}" target="_blank" class="primary-btn update-download-btn">
                📥 Descargar nueva versión
            </a>
            <button class="secondary-btn" onclick="closeUpdateModal()">Más tarde</button>
        </div>

        <p class="update-help">
            💡 <strong>¿Cómo actualizar?</strong><br>
            Descarga el archivo y reemplaza la aplicación actual con la nueva versión.
            Tus datos se conservan automáticamente.
        </p>
    `;

    modal.classList.add("show");
}

function closeUpdateModal() {
    document.getElementById("updateModal").classList.remove("show");
}

function updateSettingsBadge(show) {
    const settingsBtn = document.getElementById("settingsBtn");
    if (!settingsBtn) return;
    if (show) settingsBtn.classList.add("has-notification");
    else settingsBtn.classList.remove("has-notification");
}

async function forceCheckUpdates() {
    const btn = document.getElementById("checkUpdatesBtn");
    if (!btn) return;
    const originalText = btn.textContent;
    btn.textContent = "🔍 Verificando...";
    btn.disabled = true;

    await checkForUpdates(true);

    btn.textContent = originalText;
    btn.disabled = false;

    const updateData = JSON.parse(localStorage.getItem("j2_update_available"));
    if (updateData) {
        openUpdateModal();
    } else {
        alert("✅ Estás en la última versión disponible.");
    }
}

/* =========================================================
   ONBOARDING
========================================================= */
const ONBOARDING_STEPS = [
    { icon: "👋", title: "¡Bienvenido a J2!", text: "Vamos a hacer un recorrido rápido por la app. Solo te tomará 30 segundos." },
    { icon: "📦", title: "Aquí agregas productos", text: "Ve a la sección Inventario y crea tu primer producto con precio, stock y categoría." },
    { icon: "🧮", title: "Aquí haces ventas", text: "En la sección Ventas busca o escanea productos, agrega al carrito y cobra. ¡El cambio se calcula solo!" },
    { icon: "👥", title: "Aquí controlas los fiados", text: "En Clientes registras quién te debe, cuánto, y les envías recordatorios por WhatsApp." },
    { icon: "⚙️", title: "Personaliza tu app", text: "En Configuración puedes poner el nombre de tu tienda, tu logo, y cambiar los colores." }
];

let onboardingStep = 0;

function showOnboarding() {
    if (localStorage.getItem("j2_onboarded")) return;
    onboardingStep = 0;
    renderOnboardingStep();
    document.getElementById("onboardingModal").classList.add("show");
}

function renderOnboardingStep() {
    const step = ONBOARDING_STEPS[onboardingStep];
    document.getElementById("onboardingIcon").textContent = step.icon;
    document.getElementById("onboardingTitle").textContent = step.title;
    document.getElementById("onboardingText").textContent = step.text;
    const dots = document.querySelectorAll(".progress-dot");
    dots.forEach((dot, i) => dot.classList.toggle("active", i === onboardingStep));
    const nextBtn = document.getElementById("nextOnboarding");
    nextBtn.textContent = onboardingStep === ONBOARDING_STEPS.length - 1 ? "¡Empezar! 🚀" : "Siguiente →";
}

function nextOnboarding() {
    if (onboardingStep < ONBOARDING_STEPS.length - 1) {
        onboardingStep++;
        renderOnboardingStep();
    } else {
        finishOnboarding();
    }
}

function skipOnboarding() { finishOnboarding(); }

function finishOnboarding() {
    localStorage.setItem("j2_onboarded", "true");
    document.getElementById("onboardingModal").classList.remove("show");
}

function showOnboardingAgain() {
    localStorage.removeItem("j2_onboarded");
    onboardingStep = 0;
    renderOnboardingStep();
    document.getElementById("onboardingModal").classList.add("show");
}

/* =========================================================
   ATAJOS
========================================================= */
document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, select, textarea")) return;
    if (e.key === "F2") {
        e.preventDefault();
        clearSale();
        document.getElementById("productSearch").focus();
    }
    if (e.key === "/") {
        e.preventDefault();
        document.getElementById("productSearch").focus();
    }
    if (e.key === "Escape") {
        document.querySelectorAll(".modal.show").forEach(m => {
            if (m.id === "scanModal") closeScanModal();
            else if (m.id === "receiptModal") closeReceipt();
            else if (m.id === "weightModal") closeWeightModal();
            else if (m.id === "allProductsModal") closeAllProductsModal();
            else if (m.id === "successModal") closeSuccessModal();
            else if (m.id === "onboardingModal") skipOnboarding();
            else if (m.id === "settingsModal") closeSettingsModal();
            else if (m.id === "requestPasswordModal") closeRequestPasswordModal();
            else if (m.id === "updateModal") closeUpdateModal();
            else if (m.id === "installModal") document.getElementById("installModal").classList.remove("show");
            else if (m.id !== "licenseModal" && m.id !== "welcomeModal" && m.id !== "demoActivatedModal") {
                m.classList.remove("show");
            }
        });
    }
});

document.getElementById("cashReceived").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !document.getElementById("completeSale").disabled) {
        e.preventDefault();
        completeSale();
    }
});

/* =========================================================
   EVENTOS
========================================================= */
document.getElementById("productSearch").addEventListener("input", renderProducts);
document.getElementById("cashReceived").addEventListener("input", calculateChange);
document.getElementById("completeSale").addEventListener("click", completeSale);
document.getElementById("addQuickProduct").addEventListener("click", addQuickProduct);
document.getElementById("newProductBtn").addEventListener("click", openProductModal);
document.getElementById("closeModal").addEventListener("click", closeProductModal);
document.getElementById("cancelProduct").addEventListener("click", closeProductModal);
document.getElementById("productForm").addEventListener("submit", saveProduct);
document.getElementById("productCategory").addEventListener("change", toggleCategoryFields);
document.getElementById("baseUnit").addEventListener("change", updateBaseUnitLabels);
document.getElementById("salePriceBase").addEventListener("input", updateWeightEquivalences);
document.getElementById("purchasePriceBase").addEventListener("input", updateWeightEquivalences);
document.getElementById("clearSaleBtn").addEventListener("click", clearSale);

document.getElementById("newClientBtn").addEventListener("click", openClientModal);
document.getElementById("closeClientModal").addEventListener("click", closeClientModal);
document.getElementById("cancelClient").addEventListener("click", closeClientModal);
document.getElementById("clientForm").addEventListener("submit", saveClient);
document.getElementById("closeClientDetailModal").addEventListener("click", closeClientDetailModal);

document.getElementById("newProviderBtn").addEventListener("click", openProviderModal);
document.getElementById("closeProviderModal").addEventListener("click", closeProviderModal);
document.getElementById("cancelProvider").addEventListener("click", closeProviderModal);
document.getElementById("providerForm").addEventListener("submit", saveProvider);

document.getElementById("closeAbonoModal").addEventListener("click", closeAbonoModal);
document.getElementById("cancelAbono").addEventListener("click", closeAbonoModal);
document.getElementById("abonoForm").addEventListener("submit", saveAbono);

document.getElementById("exportCsvBtn").addEventListener("click", exportCSV);
document.getElementById("scanBarcodeBtn").addEventListener("click", openScanModal);
document.getElementById("closeScanModal").addEventListener("click", closeScanModal);
document.getElementById("quickAddClient").addEventListener("click", openClientModal);

document.getElementById("suggestBuyBtn").addEventListener("click", suggestBuy);
document.getElementById("closeSuggestModal").addEventListener("click", () => {
    document.getElementById("suggestModal").classList.remove("show");
});

document.getElementById("deadProductsBtn").addEventListener("click", showDeadProducts);
document.getElementById("closeDeadProductsModal").addEventListener("click", closeDeadProductsModal);

document.getElementById("closeCashBtn").addEventListener("click", generateCashReport);
document.getElementById("backupBtn").addEventListener("click", backupData);
document.getElementById("restoreBtn").addEventListener("click", () => {
    document.getElementById("restoreInput").click();
});
document.getElementById("restoreInput").addEventListener("change", restoreData);
document.getElementById("reportPeriod").addEventListener("change", renderReports);

document.getElementById("plansBtn").addEventListener("click", () => {
    document.getElementById("plansModal").classList.add("show");
});
document.getElementById("closePlansModal").addEventListener("click", () => {
    document.getElementById("plansModal").classList.remove("show");
});

document.getElementById("helpBtn").addEventListener("click", showOnboardingAgain);
document.getElementById("settingsBtn").addEventListener("click", openSettingsModal);
document.getElementById("closeSettingsModal").addEventListener("click", closeSettingsModal);

document.getElementById("addCategoryBtn").addEventListener("click", openCategoryModal);
document.getElementById("closeCategoryModal").addEventListener("click", closeCategoryModal);
document.getElementById("cancelCategory").addEventListener("click", closeCategoryModal);
document.getElementById("categoryForm").addEventListener("submit", saveCategory);

document.getElementById("showAllProductsBtn").addEventListener("click", openAllProductsModal);
document.getElementById("closeAllProductsModal").addEventListener("click", closeAllProductsModal);
document.getElementById("allProductsSearch").addEventListener("input", renderAllProductsList);

document.getElementById("weightUnit").addEventListener("change", updateWeightSubtotal);
document.getElementById("weightAmount").addEventListener("input", updateWeightSubtotal);
document.getElementById("confirmWeight").addEventListener("click", confirmWeight);
document.getElementById("cancelWeight").addEventListener("click", closeWeightModal);
document.getElementById("closeWeightModal").addEventListener("click", closeWeightModal);

document.getElementById("inventorySearch").addEventListener("input", renderInventory);
document.getElementById("inventoryCategoryFilter").addEventListener("change", renderInventory);
document.getElementById("inventorySort").addEventListener("change", renderInventory);
document.getElementById("clearInventoryFilters").addEventListener("click", clearInventoryFilters);

document.querySelectorAll(".quick-cash-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const amount = Number(btn.dataset.amount);
        const input = document.getElementById("cashReceived");
        const current = Number(input.value) || 0;
        input.value = current + amount;
        calculateChange();
    });
});

document.getElementById("closeSuccessBtn").addEventListener("click", closeSuccessModal);
document.getElementById("printReceiptBtn").addEventListener("click", () => {
    if (pendingSaleForReceipt) {
        closeSuccessModal();
        showReceipt(pendingSaleForReceipt);
    }
});

document.getElementById("closeCancelSaleModal").addEventListener("click", closeCancelSaleModal);
document.getElementById("cancelCancelSale").addEventListener("click", closeCancelSaleModal);
document.getElementById("confirmCancelSale").addEventListener("click", confirmCancelSale);
document.getElementById("forgotPasswordBtn").addEventListener("click", openRequestPasswordModal);

document.getElementById("closeRequestPasswordModal").addEventListener("click", closeRequestPasswordModal);
document.getElementById("sendTempCodeBtn").addEventListener("click", sendTempCodeByWhatsApp);

document.getElementById("nextOnboarding").addEventListener("click", nextOnboarding);
document.getElementById("skipOnboarding").addEventListener("click", skipOnboarding);

document.querySelectorAll(".settings-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".settings-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".settings-panel").forEach(p => p.classList.remove("active"));
        tab.classList.add("active");
        document.querySelector(`.settings-panel[data-panel="${tab.dataset.tab}"]`).classList.add("active");
    });
});

document.getElementById("saveStoreSettings").addEventListener("click", saveStoreSettings);
document.getElementById("saveThemeSettings").addEventListener("click", saveThemeSettings);

document.getElementById("settingStoreLogo").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500000) {
        alert("⚠️ El logo es muy grande. Máximo 500KB.");
        return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
        storeSettings.logo = ev.target.result;
        document.getElementById("logoPreviewImg").src = ev.target.result;
        document.getElementById("logoPreview").style.display = "block";
        saveSettings();
        applyStoreBranding();
    };
    reader.readAsDataURL(file);
});

document.getElementById("removeLogoBtn").addEventListener("click", () => {
    storeSettings.logo = "";
    saveSettings();
    document.getElementById("logoPreview").style.display = "none";
    document.getElementById("settingStoreLogo").value = "";
    applyStoreBranding();
    showToast("🗑️ Logo eliminado");
});

document.getElementById("settingsRenewBtn").addEventListener("click", () => {
    closeSettingsModal();
    document.getElementById("plansModal").classList.add("show");
});

// Actualizaciones
document.getElementById("closeUpdateModalBtn").addEventListener("click", closeUpdateModal);

// Licencia
document.getElementById("activateLicense").addEventListener("click", () => {
    const code = document.getElementById("licenseCode").value;
    const result = activateLicense(code);
    if (result.success) {
        const plan = PLAN_FEATURES[result.license.plan];
        document.getElementById("licenseStep1").style.display = "none";
        document.getElementById("licenseStep2").style.display = "block";
        document.getElementById("activatedPlan").textContent = plan.name;
        document.getElementById("activatedExpiry").textContent =
            new Date(result.license.expiry).toLocaleDateString("es-CO");
        document.getElementById("activatedDays").textContent = `${daysUntilExpiry()} días`;
    } else {
        alert("❌ " + result.message);
    }
});

document.getElementById("licenseCode").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); document.getElementById("activateLicense").click(); }
});

document.getElementById("requestTrial").addEventListener("click", (e) => {
    e.preventDefault();
    const msg = encodeURIComponent("Hola Sakura · Solución IT, quiero solicitar una prueba gratis de 7 días de J2.");
    if (confirm("📱 Para solicitar tu prueba gratis de 7 días:\n\nSe abrirá WhatsApp para contactar a Sakura · Solución IT SAS.\n\n¿Continuar?")) {
        window.open(`https://wa.me/${SAKURA_CONFIG.phone}?text=${msg}`, "_blank");
    }
});

document.getElementById("startApp").addEventListener("click", () => {
    document.getElementById("licenseModal").classList.remove("show");
    localStorage.setItem("j2_welcomed", "true");
    updateExpiryBanner();
    updatePlanBadge();
    renderAll();
    setTimeout(() => showOnboarding(), 500);
});

document.querySelectorAll('input[name="paymentType"]').forEach(r => {
    r.addEventListener("change", togglePaymentMode);
});

document.addEventListener("click", (e) => {
    if (e.target.id === "receiptModal") closeReceipt();
    if (e.target.id === "plansModal") document.getElementById("plansModal").classList.remove("show");
    if (e.target.id === "successModal") closeSuccessModal();
    if (e.target.id === "clientDetailModal") closeClientDetailModal();
    if (e.target.id === "settingsModal") closeSettingsModal();
    if (e.target.id === "requestPasswordModal") closeRequestPasswordModal();
    if (e.target.id === "updateModal") closeUpdateModal();
    if (e.target.id === "installModal") document.getElementById("installModal").classList.remove("show");
});

/* =========================================================
   EVENTOS DE BIENVENIDA Y DEMO
========================================================= */
let welcomeSlide = 1;
const totalSlides = 3;

function showWelcomeSlide(n) {
    document.querySelectorAll(".welcome-slide").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".welcome-dot").forEach(d => d.classList.remove("active"));

    const slide = document.querySelector(`.welcome-slide[data-slide="${n}"]`);
    const dot = document.querySelector(`.welcome-dot[data-dot="${n}"]`);
    if (slide) slide.classList.add("active");
    if (dot) dot.classList.add("active");

    document.getElementById("welcomePrev").style.display = n === 1 ? "none" : "inline-flex";
    document.getElementById("welcomeNext").style.display = n === totalSlides ? "none" : "inline-flex";

    welcomeSlide = n;
}

const welcomeNextBtn = document.getElementById("welcomeNext");
if (welcomeNextBtn) {
    welcomeNextBtn.addEventListener("click", () => {
        if (welcomeSlide < totalSlides) showWelcomeSlide(welcomeSlide + 1);
    });
}

const welcomePrevBtn = document.getElementById("welcomePrev");
if (welcomePrevBtn) {
    welcomePrevBtn.addEventListener("click", () => {
        if (welcomeSlide > 1) showWelcomeSlide(welcomeSlide - 1);
    });
}

document.querySelectorAll(".welcome-dot").forEach(dot => {
    dot.addEventListener("click", () => {
        showWelcomeSlide(parseInt(dot.dataset.dot));
    });
});

const startDemoBtn = document.getElementById("startDemoBtn");
if (startDemoBtn) {
    startDemoBtn.addEventListener("click", () => {
        const result = activateDemo();
        if (result.success) {
            localStorage.setItem("j2_welcomed", "true");
            document.getElementById("welcomeModal").classList.remove("show");
            const demoModal = document.getElementById("demoActivatedModal");
            const expiryDate = new Date(result.license.expiry);
            document.getElementById("demoExpiryDate").textContent =
                expiryDate.toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                });
            demoModal.classList.add("show");
        } else {
            alert("⚠️ " + result.message);
            document.getElementById("welcomeModal").classList.remove("show");
            localStorage.setItem("j2_welcomed", "true");
            document.getElementById("licenseModal").classList.add("show");
        }
    });
}

const activateLicenseBtn = document.getElementById("activateLicenseBtn");
if (activateLicenseBtn) {
    activateLicenseBtn.addEventListener("click", () => {
        localStorage.setItem("j2_welcomed", "true");
        document.getElementById("welcomeModal").classList.remove("show");
        document.getElementById("licenseModal").classList.add("show");
    });
}

const startDemoAppBtn = document.getElementById("startDemoApp");
if (startDemoAppBtn) {
    startDemoAppBtn.addEventListener("click", () => {
        document.getElementById("demoActivatedModal").classList.remove("show");
        updateDemoBanner();
        updatePlanBadge();
        renderAll();
        setTimeout(() => showOnboarding(), 500);
    });
}

const closeLicenseModalBtn = document.getElementById("closeLicenseModal");
if (closeLicenseModalBtn) {
    closeLicenseModalBtn.addEventListener("click", () => {
        document.getElementById("licenseModal").classList.remove("show");
    });
}

const closeInstallModalBtn = document.getElementById("closeInstallModal");
if (closeInstallModalBtn) {
    closeInstallModalBtn.addEventListener("click", () => {
        document.getElementById("installModal").classList.remove("show");
    });
}

/* =========================================================
   RENDER GENERAL
========================================================= */
function renderAll() {
    if (!isLicenseValid()) return;
    updateDate();
    updatePlanBadge();
    updateExpiryBanner();
    updateDemoBanner();
    renderProducts();
    renderCart();
    renderInventory();
    renderClients();
    renderProviders();
    renderReports();
}

/* =========================================================
   INICIALIZACIÓN
========================================================= */
const yearEl = document.getElementById("footerYear");
if (yearEl) yearEl.textContent = new Date().getFullYear();

console.log(
    "%c      🏪 J2 v7.0      ",
    "background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; font-weight: bold; font-size: 20px; padding: 10px 20px; border-radius: 8px;"
);
console.log(
    "%c      Modo demo + PWA + Bienvenida      ",
    "background: linear-gradient(135deg, #dc2626, #f87171); color: white; font-weight: bold; font-size: 12px; padding: 4px 20px; border-radius: 4px;"
);
console.log("");

applyTheme();
applyStoreBranding();
renderCategoryOptions();

// ===== REGISTRAR SERVICE WORKER (PWA) =====
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js")
            .then(reg => console.log("✅ Service Worker registrado"))
            .catch(err => console.log("⚠️ Service Worker no registrado:", err));
    });
}

// ===== DETECTAR SI SE PUEDE INSTALAR PWA =====
let deferredPrompt = null;
const installBtn = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = "inline-flex";
});

if (installBtn) {
    installBtn.addEventListener("click", async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === "accepted") {
                console.log("✅ App instalada");
                installBtn.style.display = "none";
            }
            deferredPrompt = null;
        } else {
            document.getElementById("installModal").classList.add("show");
        }
    });
}

window.addEventListener("appinstalled", () => {
    console.log("✅ PWA instalada exitosamente");
    if (installBtn) installBtn.style.display = "none";
});

// ===== FLUJO DE PRIMERA VEZ =====
const isFirstTime = !localStorage.getItem("j2_welcomed");

if (!isLicenseValid()) {
    if (isFirstTime && !isDemoUsed()) {
        document.getElementById("welcomeModal").classList.add("show");
        document.getElementById("licenseModal").classList.remove("show");
    } else {
        document.getElementById("welcomeModal").classList.remove("show");
        initLicenseUI();
    }
} else {
    document.getElementById("welcomeModal").classList.remove("show");
    document.getElementById("licenseModal").classList.remove("show");
    updateDemoBanner();
    renderAll();
    setTimeout(() => showOnboarding(), 800);
    setTimeout(() => checkForUpdates(), 5000);
}