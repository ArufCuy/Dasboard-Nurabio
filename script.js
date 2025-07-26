// Global Variables
let customers = [];
let couriers = [];
let currentEditingCustomer = null;
let currentEditingCourier = null;
let isLoading = false;
let orders = [];
let waterTypes = [];
let stockData = {
  filled: 0,
  empty: 0,
  damaged: 0,
};
let lucide; // Declare the lucide variable

// Initialize App
window.initApp = () => {
  // Check admin authentication using Firebase
  const adminSession = JSON.parse(localStorage.getItem("adminSession"));

  if (!adminSession || !adminSession.username) {
    window.location.href = "admin-login.html";
    return;
  } else {
    const q = query(
      collection(db, "admins"),
      where("username", "==", adminSession.username)
    );

    getDocs(q)
      .then((snapshot) => {
        if (snapshot.empty) {
          alert("Session tidak valid, login ulang!");
          localStorage.removeItem("adminSession");
          window.location.href = "admin-login.html";
        }
      })
      .catch((err) => {
        console.error("Gagal cek login:", err);
        localStorage.removeItem("adminSession");
        window.location.href = "admin-login.html";
      });
  }

  // Hide loading screen
  setTimeout(() => {
    document.getElementById("loading").style.display = "none";
    initializeEventListeners();
    loadInitialData();
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    lucide.createIcons(); // Use the lucide variable
  }, 1500);
};

// Event Listeners
function initializeEventListeners() {
  // Sidebar Navigation
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const page = item.getAttribute("href").substring(1);
      navigateToPage(page);
    });
  });

  // Sidebar Toggle (Mobile)
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebar-overlay");

  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("-translate-x-full");
    sidebarOverlay.classList.toggle("hidden");
  });

  sidebarOverlay.addEventListener("click", () => {
    sidebar.classList.add("-translate-x-full");
    sidebarOverlay.classList.add("hidden");
  });

  // Customer Management
  document
    .getElementById("add-customer-btn")
    .addEventListener("click", () => openCustomerModal());
  document
    .getElementById("customer-cancel-btn")
    .addEventListener("click", closeCustomerModal);
  document
    .getElementById("customer-form")
    .addEventListener("submit", handleCustomerSubmit);
  document
    .getElementById("customer-search")
    .addEventListener("input", handleCustomerSearch);

  // Courier Management
  document
    .getElementById("add-courier-btn")
    .addEventListener("click", () => openCourierModal());
  document
    .getElementById("courier-cancel-btn")
    .addEventListener("click", closeCourierModal);
  document
    .getElementById("courier-form")
    .addEventListener("submit", handleCourierSubmit);
  document
    .getElementById("courier-search")
    .addEventListener("input", handleCourierSearch);

  // Stock Management
  document
    .getElementById("update-stock-btn")
    .addEventListener("click", () => openStockModal());
  document
    .getElementById("stock-cancel-btn")
    .addEventListener("click", closeStockModal);
  document
    .getElementById("stock-form")
    .addEventListener("submit", handleStockSubmit);

  // Order Management
  document
    .getElementById("add-order-btn")
    .addEventListener("click", () => openOrderModal());
  document
    .getElementById("order-cancel-btn")
    .addEventListener("click", closeOrderModal);
  document
    .getElementById("order-form")
    .addEventListener("submit", handleOrderSubmit);
  document
    .getElementById("order-search")
    .addEventListener("input", handleOrderSearch);
  document
    .getElementById("order-status-filter")
    .addEventListener("change", handleOrderFilter);
  document
    .getElementById("order-courier-filter")
    .addEventListener("change", handleOrderFilter);
  document
    .getElementById("order-courier-type")
    .addEventListener("change", window.toggleCourierSelection);

  // Add quantity change listener
  document
    .getElementById("order-quantity")
    .addEventListener("input", window.updatePriceByQuantity);

  // Water Types Management
  document
    .getElementById("add-water-type-btn")
    .addEventListener("click", () => openWaterTypeModal());
  document
    .getElementById("water-type-cancel-btn")
    .addEventListener("click", closeWaterTypeModal);
  document
    .getElementById("water-type-form")
    .addEventListener("submit", handleWaterTypeSubmit);

  // Logout
  document.getElementById("logout-btn").addEventListener("click", handleLogout);

  // Close modals when clicking outside
  document.getElementById("customer-modal").addEventListener("click", (e) => {
    if (e.target.id === "customer-modal") {
      closeCustomerModal();
    }
  });

  document.getElementById("courier-modal").addEventListener("click", (e) => {
    if (e.target.id === "courier-modal") {
      closeCourierModal();
    }
  });

  document.getElementById("stock-modal").addEventListener("click", (e) => {
    if (e.target.id === "stock-modal") {
      closeStockModal();
    }
  });

  document.getElementById("order-modal").addEventListener("click", (e) => {
    if (e.target.id === "order-modal") {
      closeOrderModal();
    }
  });

  document.getElementById("water-type-modal").addEventListener("click", (e) => {
    if (e.target.id === "water-type-modal") {
      closeWaterTypeModal();
    }
  });

  // Add this in initializeEventListeners function:
  document
    .getElementById("assign-form")
    .addEventListener("submit", handleAssignSubmit);
  document
    .getElementById("assign-cancel-btn")
    .addEventListener("click", closeAssignModal);

  // Close modal when clicking outside
  document.getElementById("assign-modal").addEventListener("click", (e) => {
    if (e.target.id === "assign-modal") {
      closeAssignModal();
    }
  });
}

// Logout Handler
function handleLogout() {
  if (confirm("Apakah Anda yakin ingin logout?")) {
    localStorage.removeItem("adminSession");
    window.location.href = "admin-login.html";
  }
}

// Navigation
function navigateToPage(page) {
  // Hide all pages
  const pages = document.querySelectorAll(".page-content");
  pages.forEach((p) => p.classList.add("hidden"));

  // Show selected page
  document.getElementById(`page-${page}`).classList.remove("hidden");

  // Update active nav item
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((item) => item.classList.remove("active"));
  document.querySelector(`[href="#${page}"]`).classList.add("active");

  // Load page-specific data
  if (page === "customers") {
    loadCustomers();
  } else if (page === "couriers") {
    loadCouriers();
  } else if (page === "water-types") {
    loadWaterTypes();
  } else if (page === "analytics") {
    loadAnalytics();
  }
}

// Time Update
function updateCurrentTime() {
  const now = new Date();
  const timeString = now.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  document.getElementById("current-time").textContent = timeString;
}

// Load Initial Data with better error handling
async function loadInitialData() {
  try {
    console.log("🔄 Loading initial data...");
    await testFirebaseConnection();
    await loadCustomers();
    await loadCouriers();
    await loadOrders();
    await loadWaterTypes();
    await loadStockHistory();
    updateStockDisplay();
    updateDashboardStats();
    loadRecentOrders();
    loadPopularProducts();
    console.log("✅ Initial data loaded successfully!");
  } catch (error) {
    console.error("❌ Error loading initial data:", error);

    if (error.code === "permission-denied") {
      showToast(
        "❌ Firebase permission denied. Periksa Firestore Rules!",
        "error"
      );
      showFirebaseRulesHelp();
    } else {
      showToast("❌ Error loading data: " + error.message, "error");
    }
  }
}

// Water Types Management
async function loadWaterTypes() {
  try {
    console.log("💧 Loading water types from Firestore...");
    const querySnapshot = await window.getDocs(
      window.query(
        window.collection(window.db, "water_types"),
        window.orderBy("name")
      )
    );
    waterTypes = [];
    querySnapshot.forEach((doc) => {
      waterTypes.push({ id: doc.id, ...doc.data() });
    });

    // If no water types exist, create default ones
    if (waterTypes.length === 0) {
      await createDefaultWaterTypes();
    }

    console.log(`✅ Loaded ${waterTypes.length} water types`);
    renderWaterTypes();
    updateWaterTypeDropdowns();
  } catch (error) {
    console.error("❌ Error loading water types:", error);
    showToast("❌ Error loading water types: " + error.message, "error");
  }
}

async function createDefaultWaterTypes() {
  const defaultTypes = [
    {
      name: "Air RO",
      price: 15000,
      deliveryPrice: 18000,
      description: "Air Reverse Osmosis",
    },
    {
      name: "Air Mineral",
      price: 18000,
      deliveryPrice: 21000,
      description: "Air Mineral Alami",
    },
    {
      name: "Air Alkali",
      price: 20000,
      deliveryPrice: 23000,
      description: "Air Alkali pH Tinggi",
    },
  ];

  for (const type of defaultTypes) {
    await window.addDoc(window.collection(window.db, "water_types"), {
      ...type,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  await loadWaterTypes();
}

function renderWaterTypes() {
  const grid = document.getElementById("water-types-grid");
  if (!grid) return;

  if (waterTypes.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-12">
        <div class="text-gray-400 text-6xl mb-4">💧</div>
        <p class="text-white text-lg">Belum ada jenis air</p>
        <p class="text-gray-400 text-sm mt-2">Klik "Tambah Jenis Air" untuk memulai</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = "";

  waterTypes.forEach((waterType) => {
    const waterTypeCard = createWaterTypeCard(waterType);
    grid.appendChild(waterTypeCard);
  });

  lucide.createIcons();
}

function createWaterTypeCard(waterType) {
  const card = document.createElement("div");
  card.className = "glass-card p-6 rounded-lg animate-fade-in";

  const statusClass = waterType.isActive
    ? "bg-green-500/20 text-green-400"
    : "bg-red-500/20 text-red-400";

  card.innerHTML = `
    <div class="flex justify-between items-start mb-4">
      <div>
        <h3 class="text-white text-lg font-semibold">${waterType.name}</h3>
        <span class="inline-block px-2 py-1 text-xs rounded-full ${statusClass}">
          ${waterType.isActive ? "Aktif" : "Tidak Aktif"}
        </span>
      </div>
      <div class="flex gap-1">
        <button onclick="editWaterType('${
          waterType.id
        }')" class="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded">
          <i data-lucide="edit" class="h-4 w-4"></i>
        </button>
        <button onclick="deleteWaterType('${
          waterType.id
        }')" class="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded">
          <i data-lucide="trash-2" class="h-4 w-4"></i>
        </button>
        <button onclick="toggleWaterTypeStatus('${waterType.id}', ${
    waterType.isActive
  })" class="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded">
          <i data-lucide="${
            waterType.isActive ? "pause" : "play"
          }" class="h-4 w-4"></i>
        </button>
      </div>
    </div>

    <div class="space-y-2">
      <div class="grid grid-cols-2 gap-4">
        <div class="text-center p-2 bg-blue-500/10 rounded">
          <span class="text-gray-400 text-xs">Ambil Sendiri</span>
          <p class="text-white font-medium">${formatCurrency(
            waterType.price
          )}</p>
        </div>
        <div class="text-center p-2 bg-green-500/10 rounded">
          <span class="text-gray-400 text-xs">Antar ke Rumah</span>
          <p class="text-white font-medium">${formatCurrency(
            waterType.deliveryPrice || waterType.price
          )}</p>
        </div>
      </div>
      ${
        waterType.description
          ? `
        <div>
          <span class="text-gray-400">Deskripsi:</span>
          <p class="text-gray-300 text-sm mt-1">${waterType.description}</p>
        </div>
      `
          : ""
      }
      <div class="text-xs text-gray-400 pt-2 border-t border-white/10">
        Dibuat: ${formatDate(waterType.createdAt)}
      </div>
    </div>
  `;

  return card;
}

function updateWaterTypeDropdowns() {
  // Update order form dropdown
  const orderSelect = document.getElementById("order-water-type");
  if (orderSelect) {
    orderSelect.innerHTML = '<option value="">Pilih Jenis</option>';
    waterTypes
      .filter((type) => type.isActive)
      .forEach((type) => {
        const option = document.createElement("option");
        option.value = type.name;
        option.textContent = `${type.name}`;
        option.dataset.pickupPrice = type.price;
        option.dataset.deliveryPrice = type.deliveryPrice || type.price;
        orderSelect.appendChild(option);
      });
  }
}

// Tambahkan fungsi baru untuk update harga berdasarkan delivery type
window.updatePriceByDeliveryType = () => {
  updatePriceBasedOnSelection();
};

window.updatePriceByWaterType = () => {
  updatePriceBasedOnSelection();
};

function updatePriceBasedOnSelection() {
  const deliveryType = document.getElementById("order-delivery-type")?.value;
  const waterTypeSelect = document.getElementById("order-water-type");
  const selectedOption = waterTypeSelect?.selectedOptions[0];
  const priceInput = document.getElementById("order-price");
  const quantityInput = document.getElementById("order-quantity");

  if (deliveryType && selectedOption && priceInput && quantityInput) {
    const quantity = Number.parseInt(quantityInput.value) || 1;
    let unitPrice = 0;

    if (deliveryType === "pickup") {
      unitPrice = Number.parseInt(selectedOption.dataset.pickupPrice) || 0;
    } else if (deliveryType === "delivery") {
      unitPrice = Number.parseInt(selectedOption.dataset.deliveryPrice) || 0;
    }

    const totalPrice = unitPrice * quantity;
    priceInput.value = new Intl.NumberFormat("id-ID").format(totalPrice);
  }
}

// Add quantity change handler
window.updatePriceByQuantity = () => {
  updatePriceBasedOnSelection();
};

// Water Type Modal Functions
let currentEditingWaterType = null;

function openWaterTypeModal(waterType = null) {
  currentEditingWaterType = waterType;

  const modal = document.getElementById("water-type-modal");
  const title = document.getElementById("water-type-modal-title");
  const submitText = document.getElementById("water-type-submit-text");

  if (waterType && waterType.id) {
    title.textContent = "Edit Jenis Air";
    submitText.textContent = "Update";
    fillWaterTypeForm(waterType);
  } else {
    title.textContent = "Tambah Jenis Air Baru";
    submitText.textContent = "Simpan";
    clearWaterTypeForm();
    currentEditingWaterType = null;
  }

  modal.classList.remove("hidden");
}

function closeWaterTypeModal() {
  const modal = document.getElementById("water-type-modal");
  modal.classList.add("hidden");
  currentEditingWaterType = null;
  clearWaterTypeForm();
}

function fillWaterTypeForm(waterType) {
  document.getElementById("water-type-name").value = waterType.name || "";
  document.getElementById("water-type-price").value = waterType.price || "";
  document.getElementById("water-type-delivery-price").value =
    waterType.deliveryPrice || waterType.price || "";
  document.getElementById("water-type-description").value =
    waterType.description || "";
  document.getElementById("water-type-active").checked =
    waterType.isActive !== false;
}

function clearWaterTypeForm() {
  document.getElementById("water-type-form").reset();
  document.getElementById("water-type-active").checked = true;
}

async function handleWaterTypeSubmit(e) {
  e.preventDefault();

  if (isLoading) return;
  isLoading = true;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Menyimpan...";
  submitBtn.disabled = true;

  try {
    const formData = {
      name: document.getElementById("water-type-name").value,
      price: Number.parseInt(document.getElementById("water-type-price").value),
      deliveryPrice: Number.parseInt(
        document.getElementById("water-type-delivery-price").value
      ),
      description: document.getElementById("water-type-description").value,
      isActive: document.getElementById("water-type-active").checked,
      updatedAt: new Date().toISOString(),
    };

    if (currentEditingWaterType && currentEditingWaterType.id) {
      // Update existing water type
      await window.updateDoc(
        window.doc(window.db, "water_types", currentEditingWaterType.id),
        {
          ...formData,
          createdAt: currentEditingWaterType.createdAt,
        }
      );
      showToast("✅ Jenis air berhasil diperbarui");
    } else {
      // Add new water type
      formData.createdAt = new Date().toISOString();
      await window.addDoc(
        window.collection(window.db, "water_types"),
        formData
      );
      showToast("✅ Jenis air baru berhasil ditambahkan");
    }

    closeWaterTypeModal();
    await loadWaterTypes();
  } catch (error) {
    console.error("❌ Error saving water type:", error);
    showToast("❌ Error menyimpan: " + error.message, "error");
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    isLoading = false;
  }
}

// Global functions for water type actions
window.editWaterType = (waterTypeId) => {
  const waterType = waterTypes.find((w) => w.id === waterTypeId);
  if (waterType) {
    openWaterTypeModal(waterType);
  }
};

window.deleteWaterType = async (waterTypeId) => {
  if (!confirm("Apakah Anda yakin ingin menghapus jenis air ini?")) {
    return;
  }

  try {
    await window.deleteDoc(window.doc(window.db, "water_types", waterTypeId));
    showToast("✅ Jenis air berhasil dihapus");
    await loadWaterTypes();
  } catch (error) {
    console.error("❌ Error deleting water type:", error);
    showToast("❌ Error menghapus: " + error.message, "error");
  }
};

window.toggleWaterTypeStatus = async (waterTypeId, currentStatus) => {
  try {
    await window.updateDoc(window.doc(window.db, "water_types", waterTypeId), {
      isActive: !currentStatus,
      updatedAt: new Date().toISOString(),
    });
    showToast(
      `✅ Status jenis air berhasil ${
        !currentStatus ? "diaktifkan" : "dinonaktifkan"
      }`
    );
    await loadWaterTypes();
  } catch (error) {
    console.error("❌ Error updating water type status:", error);
    showToast("❌ Error mengubah status jenis air", "error");
  }
};

// Test Firebase Connection
async function testFirebaseConnection() {
  try {
    console.log("🧪 Testing Firebase connection...");
    const testCollection = window.collection(window.db, "test");
    await window.getDocs(testCollection);
    console.log("✅ Firebase connection successful!");
  } catch (error) {
    console.error("❌ Firebase connection failed:", error);
    throw error;
  }
}

// Show Firebase Rules Help
function showFirebaseRulesHelp() {
  const helpDiv = document.createElement("div");
  helpDiv.className =
    "fixed top-4 left-4 right-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4 z-50";
  helpDiv.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="text-red-400 text-2xl">🔥</div>
            <div class="flex-1">
                <h3 class="text-red-400 font-bold">Firebase Rules Error!</h3>
                <p class="text-white text-sm mt-1">Firestore Rules belum diatur. Ikuti langkah berikut:</p>
                <ol class="text-gray-300 text-xs mt-2 space-y-1">
                    <li>1. Buka <a href="https://console.firebase.google.com" target="_blank" class="text-blue-400 underline">Firebase Console</a></li>
                    <li>2. Pilih project "arufkuy"</li>
                    <li>3. Masuk ke Firestore Database → Rules</li>
                    <li>4. Ganti rules dengan: <code class="bg-black/20 px-1 rounded">allow read, write: if true;</code></li>
                    <li>5. Klik "Publish"</li>
                </ol>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="mt-2 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs">
                    Tutup
                </button>
            </div>
        </div>
    `;
  document.body.appendChild(helpDiv);

  // Auto remove after 30 seconds
  setTimeout(() => {
    if (helpDiv.parentElement) {
      helpDiv.remove();
    }
  }, 30000);
}

// Customer Management Functions with better error handling
async function loadCustomers() {
  try {
    console.log("📥 Loading customers from Firestore...");
    const querySnapshot = await window.getDocs(
      window.collection(window.db, "customers")
    );
    customers = [];
    querySnapshot.forEach((doc) => {
      customers.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ Loaded ${customers.length} customers`);
    renderCustomers();
    updateCustomerStats();
  } catch (error) {
    console.error("❌ Error loading customers:", error);

    if (error.code === "permission-denied") {
      showToast("❌ Permission denied. Periksa Firestore Rules!", "error");
      showFirebaseRulesHelp();
    } else {
      showToast("❌ Error loading customers: " + error.message, "error");
    }

    // Show empty state
    const grid = document.getElementById("customers-grid");
    if (grid) {
      grid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-red-400 text-6xl mb-4">⚠️</div>
                    <p class="text-white text-lg">Gagal memuat data pelanggan</p>
                    <p class="text-gray-400 text-sm mt-2">${error.message}</p>
                    <button onclick="loadCustomers()" class="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                        Coba Lagi
                    </button>
                </div>
            `;
    }
  }
}

// Courier Management Functions
async function loadCouriers() {
  try {
    console.log("🚚 Loading couriers from Firestore...");
    const querySnapshot = await window.getDocs(
      window.collection(window.db, "couriers")
    );
    couriers = [];
    querySnapshot.forEach((doc) => {
      couriers.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ Loaded ${couriers.length} couriers`);
    renderCouriers();
    updateCourierStats();
  } catch (error) {
    console.error("❌ Error loading couriers:", error);

    if (error.code === "permission-denied") {
      showToast("❌ Permission denied. Periksa Firestore Rules!", "error");
      showFirebaseRulesHelp();
    } else {
      showToast("❌ Error loading couriers: " + error.message, "error");
    }

    // Show empty state
    const grid = document.getElementById("couriers-grid");
    if (grid) {
      grid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-red-400 text-6xl mb-4">⚠️</div>
                    <p class="text-white text-lg">Gagal memuat data kurir</p>
                    <p class="text-gray-400 text-sm mt-2">${error.message}</p>
                    <button onclick="loadCouriers()" class="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                        Coba Lagi
                    </button>
                </div>
            `;
    }
  }
}

function renderCouriers() {
  const grid = document.getElementById("couriers-grid");
  if (!grid) return;

  if (couriers.length === 0) {
    grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-gray-400 text-6xl mb-4">🚚</div>
                <p class="text-white text-lg">Belum ada kurir</p>
                <p class="text-gray-400 text-sm mt-2">Klik "Tambah Kurir" untuk memulai</p>
            </div>
        `;
    return;
  }

  grid.innerHTML = "";

  couriers.forEach((courier) => {
    const courierCard = createCourierCard(courier);
    grid.appendChild(courierCard);
  });

  // Re-initialize Lucide icons
  lucide.createIcons();
}

function createCourierCard(courier) {
  const card = document.createElement("div");
  card.className = "glass-card p-6 rounded-lg courier-card animate-fade-in";

  const statusClass = courier.isActive
    ? "bg-green-500/20 text-green-400 border-green-500/30"
    : "bg-red-500/20 text-red-400 border-red-500/30";

  card.innerHTML = `
        <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3 flex-1">
                <div class="w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                    ${
                      courier.photo
                        ? `<img src="${courier.photo}" alt="${courier.name}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<div class=\\'w-full h-full flex items-center justify-center\\'>👤</div>'">`
                        : `<div class="w-full h-full flex items-center justify-center text-gray-400 text-xl">👤</div>`
                    }
                </div>
                <div class="min-w-0 flex-1">
                    <h3 class="text-white text-lg font-semibold truncate">${
                      courier.name
                    }</h3>
                    <span class="inline-block px-2 py-1 text-xs rounded-full ${statusClass}">
                        ${courier.isActive ? "Aktif" : "Tidak Aktif"}
                    </span>
                </div>
            </div>
            <div class="flex gap-1">
                <button onclick="editCourier('${
                  courier.id
                }')" class="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded">
                    <i data-lucide="edit" class="h-4 w-4"></i>
                </button>
                <button onclick="deleteCourier('${
                  courier.id
                }')" class="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded">
                    <i data-lucide="trash-2" class="h-4 w-4"></i>
                </button>
                <button onclick="toggleCourierStatus('${courier.id}', ${
    courier.isActive
  })" class="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded">
                    <i data-lucide="${
                      courier.isActive ? "pause" : "play"
                    }" class="h-4 w-4"></i>
                </button>
            </div>
        </div>

        <div class="space-y-3">
            ${
              courier.phone
                ? `
            <div class="flex items-center gap-2 text-sm">
                <i data-lucide="phone" class="h-4 w-4 text-gray-400"></i>
                <span class="text-gray-300">${courier.phone}</span>
                <a href="https://wa.me/${courier.phone.replace(/^0/, "62")}" 
                   target="_blank" 
                   class="ml-auto text-green-400 hover:text-green-300">
                    <i data-lucide="message-circle" class="h-4 w-4"></i>
                </a>
            </div>
            `
                : ""
            }

            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-sm">
                <div>
                    <span class="text-gray-400">Total Delivery:</span>
                    <div class="text-white font-medium">${
                      courier.totalDeliveries || 0
                    }x</div>
                </div>
                <div>
                    <span class="text-gray-400">Minggu Ini:</span>
                    <div class="text-white font-medium">${
                      courier.weeklyDeliveries || 0
                    }x</div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-sm">
                <div>
                    <span class="text-gray-400">Hari Ini:</span>
                    <div class="text-white font-medium">${
                      courier.dailyDeliveries || 0
                    }x</div>
                </div>
                <div>
                    <span class="text-gray-400">Rating:</span>
                    <div class="text-yellow-400 font-medium">⭐ ${
                      courier.rating || "5.0"
                    }</div>
                </div>
            </div>

            <div class="text-xs text-gray-400">
                Bergabung: ${formatDate(courier.createdAt)}
            </div>
        </div>
    `;

  return card;
}

function updateCourierStats() {
  const total = couriers.length;
  const active = couriers.filter((c) => c.isActive).length;
  const weeklyDelivery = couriers.reduce(
    (sum, c) => sum + (c.weeklyDeliveries || 0),
    0
  );
  const dailyDelivery = couriers.reduce(
    (sum, c) => sum + (c.dailyDeliveries || 0),
    0
  );

  document.getElementById("couriers-total").textContent = total;
  document.getElementById("couriers-active").textContent = active;
  document.getElementById("couriers-weekly-delivery").textContent =
    weeklyDelivery;
  document.getElementById("couriers-daily-delivery").textContent =
    dailyDelivery;
}

function handleCourierSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  const filteredCouriers = couriers.filter(
    (courier) =>
      courier.name.toLowerCase().includes(searchTerm) ||
      (courier.phone && courier.phone.toLowerCase().includes(searchTerm))
  );

  const grid = document.getElementById("couriers-grid");
  grid.innerHTML = "";

  if (filteredCouriers.length === 0) {
    grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-gray-400 text-6xl mb-4">🔍</div>
                <p class="text-white text-lg">Tidak ada kurir ditemukan</p>
                <p class="text-gray-400 text-sm mt-2">Coba kata kunci lain</p>
            </div>
        `;
    return;
  }

  filteredCouriers.forEach((courier) => {
    const courierCard = createCourierCard(courier);
    grid.appendChild(courierCard);
  });

  lucide.createIcons();
}

// Courier Modal Functions
function openCourierModal(courier = null) {
  currentEditingCourier = courier;

  const modal = document.getElementById("courier-modal");
  const title = document.getElementById("courier-modal-title");
  const submitText = document.getElementById("courier-submit-text");

  if (courier && courier.id) {
    console.log("📝 Edit mode for courier:", courier.id);
    title.textContent = "Edit Kurir";
    submitText.textContent = "Update";
    fillCourierForm(courier);
  } else {
    console.log("➕ Add new courier mode");
    title.textContent = "Tambah Kurir Baru";
    submitText.textContent = "Simpan";
    clearCourierForm();
    currentEditingCourier = null;
  }

  modal.classList.remove("hidden");
  modal.querySelector(".bg-slate-900").classList.add("modal-enter");
}

function closeCourierModal() {
  const modal = document.getElementById("courier-modal");
  modal.classList.add("hidden");
  currentEditingCourier = null;
  clearCourierForm();
}

function fillCourierForm(courier) {
  document.getElementById("courier-name").value = courier.name || "";
  document.getElementById("courier-phone").value = courier.phone || "";
  document.getElementById("courier-username").value = courier.username || "";
  document.getElementById("courier-password").value = courier.password || "";
  document.getElementById("courier-active").checked =
    courier.isActive !== false;
}

function clearCourierForm() {
  document.getElementById("courier-form").reset();
  document.getElementById("courier-active").checked = true;
}

async function handleCourierSubmit(e) {
  e.preventDefault();

  if (isLoading) return;
  isLoading = true;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Menyimpan...";
  submitBtn.disabled = true;

  try {
    const formData = {
      name: document.getElementById("courier-name").value,
      phone: document.getElementById("courier-phone").value,
      username: document.getElementById("courier-username").value,
      password: document.getElementById("courier-password").value,
      isActive: document.getElementById("courier-active").checked,
      totalDeliveries: 0,
      weeklyDeliveries: 0,
      dailyDeliveries: 0,
      rating: 5.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Handle photo upload
    const photoFile = document.getElementById("courier-photo").files[0];
    if (photoFile) {
      try {
        const photoUrl = await uploadToDiscord(
          photoFile,
          `Foto kurir ${formData.name}`
        );
        formData.photo = photoUrl;
      } catch (uploadError) {
        console.warn("Photo upload failed:", uploadError);
        showToast(
          "⚠️ Foto gagal diupload, data kurir tetap disimpan",
          "warning"
        );
      }
    }

    if (currentEditingCourier && currentEditingCourier.id) {
      // Update existing courier
      console.log("🔄 Updating courier:", currentEditingCourier.id);
      await window.updateDoc(
        window.doc(window.db, "couriers", currentEditingCourier.id),
        {
          ...formData,
          createdAt: currentEditingCourier.createdAt,
          totalDeliveries: currentEditingCourier.totalDeliveries || 0,
          weeklyDeliveries: currentEditingCourier.weeklyDeliveries || 0,
          dailyDeliveries: currentEditingCourier.dailyDeliveries || 0,
        }
      );
      showToast("✅ Data kurir berhasil diperbarui");
    } else {
      // Add new courier
      console.log("➕ Adding new courier:", formData.name);
      await window.addDoc(window.collection(window.db, "couriers"), formData);
      showToast("✅ Kurir baru berhasil ditambahkan");
    }

    closeCourierModal();
    await loadCouriers();
    updateDashboardStats();
  } catch (error) {
    console.error("❌ Error saving courier:", error);
    if (error.code === "permission-denied") {
      showToast("❌ Permission denied. Periksa Firestore Rules!", "error");
      showFirebaseRulesHelp();
    } else {
      showToast("❌ Error menyimpan: " + error.message, "error");
    }
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    isLoading = false;
  }
}

// Global functions for courier actions
window.editCourier = (courierId) => {
  const courier = couriers.find((c) => c.id === courierId);
  if (courier) {
    openCourierModal(courier);
  }
};

window.deleteCourier = async (courierId) => {
  if (!confirm("Apakah Anda yakin ingin menghapus kurir ini?")) {
    return;
  }

  try {
    await window.deleteDoc(window.doc(window.db, "couriers", courierId));
    showToast("✅ Kurir berhasil dihapus");
    await loadCouriers();
    updateDashboardStats();
  } catch (error) {
    console.error("❌ Error deleting courier:", error);
    if (error.code === "permission-denied") {
      showToast("❌ Permission denied. Periksa Firestore Rules!", "error");
      showFirebaseRulesHelp();
    } else {
      showToast("❌ Error menghapus: " + error.message, "error");
    }
  }
};

window.toggleCourierStatus = async (courierId, currentStatus) => {
  try {
    await window.updateDoc(window.doc(window.db, "couriers", courierId), {
      isActive: !currentStatus,
      updatedAt: new Date().toISOString(),
    });
    showToast(
      `✅ Status kurir berhasil ${
        !currentStatus ? "diaktifkan" : "dinonaktifkan"
      }`
    );
    await loadCouriers();
  } catch (error) {
    console.error("❌ Error updating courier status:", error);
    showToast("❌ Error mengubah status kurir", "error");
  }
};

function renderCustomers() {
  const grid = document.getElementById("customers-grid");
  if (!grid) return;

  if (customers.length === 0) {
    grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-gray-400 text-6xl mb-4">👥</div>
                <p class="text-white text-lg">Belum ada pelanggan</p>
                <p class="text-gray-400 text-sm mt-2">Klik "Tambah Pelanggan" untuk memulai</p>
            </div>
        `;
    return;
  }

  grid.innerHTML = "";

  customers.forEach((customer) => {
    const customerCard = createCustomerCard(customer);
    grid.appendChild(customerCard);
  });

  // Re-initialize Lucide icons
  lucide.createIcons();
}

function createCustomerCard(customer) {
  const card = document.createElement("div");
  card.className = "glass-card p-6 rounded-lg customer-card animate-fade-in";

  const statusClass = getStatusClass(customer.status);

  card.innerHTML = `
        <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3 flex-1">
                <div class="w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                    <img src="${
                      customer.housePhoto ||
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23374151'/%3E%3Ctext x='50' y='60' font-size='30' text-anchor='middle' fill='%239CA3AF'%3E🏠%3C/text%3E%3C/svg%3E"
                    }" 
                         alt="Rumah ${customer.name}" 
                         class="w-full h-full object-cover"
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\' viewBox=\\'0 0 100 100\\'%3E%3Crect width=\\'100\\' height=\\'100\\' fill=\\'%23374151\\'/%3E%3Ctext x=\\'50\\' y=\\'60\\' font-size=\\'30\\' text-anchor=\\'middle\\' fill=\\'%239CA3AF\\'%3E🏠%3C/text%3E%3C/svg\\'%3E'">
                </div>
                <div class="min-w-0 flex-1">
                    <h3 class="text-white text-lg font-semibold truncate">${
                      customer.name
                    }</h3>
                    <span class="inline-block px-2 py-1 text-xs rounded-full ${statusClass}">${
    customer.status || "Aktif"
  }</span>
                </div>
            </div>
            <div class="flex gap-1">
                <button onclick="editCustomer('${
                  customer.id
                }')" class="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded">
                    <i data-lucide="edit" class="h-4 w-4"></i>
                </button>
                <button onclick="deleteCustomer('${
                  customer.id
                }')" class="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded">
                    <i data-lucide="trash-2" class="h-4 w-4"></i>
                </button>
            </div>
        </div>

        <div class="space-y-3">
            <div class="flex items-start gap-2 text-sm">
                <i data-lucide="map-pin" class="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0"></i>
                <span class="text-gray-300">${customer.address}</span>
            </div>

            <div class="flex flex-wrap gap-4">
                <a href="https://wa.me/${customer.phone.replace(/^0/, "62")}" 
                   target="_blank" 
                   class="flex items-center gap-2 text-green-400 hover:text-green-300 text-sm">
                    <i data-lucide="message-circle" class="h-4 w-4"></i>
                    Chat WhatsApp
                </a>
                ${
                  customer.mapLink
                    ? `
                <a href="${customer.mapLink}" 
                   target="_blank" 
                   class="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm">
                    <i data-lucide="map-pin" class="h-4 w-4"></i>
                    Lihat Lokasi
                </a>
                `
                    : ""
                }
            </div>

            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-sm">
                <div>
                    <span class="text-gray-400">Total Pesanan:</span>
                    <div class="text-white font-medium">${
                      customer.totalOrders || 0
                    }x</div>
                </div>
                <div>
                    <span class="text-gray-400">Terakhir:</span>
                    <div class="text-white text-xs">${formatDate(
                      customer.lastOrder
                    )}</div>
                </div>
            </div>

            ${
              customer.notes
                ? `
            <div class="text-xs text-gray-400 bg-white/5 p-2 rounded">
                <strong>Catatan:</strong> ${customer.notes}
            </div>
            `
                : ""
            }
        </div>
    `;

  return card;
}

function getStatusClass(status) {
  switch (status) {
    case "Aktif":
      return "status-active";
    case "Pasif":
      return "status-passive";
    case "Tidak Aktif":
      return "status-inactive";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}

function updateCustomerStats() {
  const total = customers.length;
  const active = customers.filter((c) => c.status === "Aktif").length;
  const passive = customers.filter((c) => c.status === "Pasif").length;
  const inactive = customers.filter((c) => c.status === "Tidak Aktif").length;

  document.getElementById("customers-total").textContent = total;
  document.getElementById("customers-active").textContent = active;
  document.getElementById("customers-passive").textContent = passive;
  document.getElementById("customers-inactive").textContent = inactive;
}

function handleCustomerSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm) ||
      customer.address.toLowerCase().includes(searchTerm)
  );

  const grid = document.getElementById("customers-grid");
  grid.innerHTML = "";

  if (filteredCustomers.length === 0) {
    grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-gray-400 text-6xl mb-4">🔍</div>
                <p class="text-white text-lg">Tidak ada pelanggan ditemukan</p>
                <p class="text-gray-400 text-sm mt-2">Coba kata kunci lain</p>
            </div>
        `;
    return;
  }

  filteredCustomers.forEach((customer) => {
    const customerCard = createCustomerCard(customer);
    grid.appendChild(customerCard);
  });

  lucide.createIcons();
}

// Customer Modal Functions
function openCustomerModal(customer = null) {
  // Reset currentEditingCustomer first
  currentEditingCustomer = customer;

  const modal = document.getElementById("customer-modal");
  const title = document.getElementById("customer-modal-title");
  const submitText = document.getElementById("customer-submit-text");

  if (customer && customer.id) {
    // Edit mode
    console.log("📝 Edit mode for customer:", customer.id);
    title.textContent = "Edit Pelanggan";
    submitText.textContent = "Update";
    fillCustomerForm(customer);
  } else {
    // Add new mode
    console.log("➕ Add new customer mode");
    title.textContent = "Tambah Pelanggan Baru";
    submitText.textContent = "Simpan";
    clearCustomerForm();
    currentEditingCustomer = null; // Explicitly set to null for new customer
  }

  modal.classList.remove("hidden");
  modal.querySelector(".bg-slate-900").classList.add("modal-enter");
}

function closeCustomerModal() {
  const modal = document.getElementById("customer-modal");
  modal.classList.add("hidden");
  currentEditingCustomer = null;
  clearCustomerForm();
}

function fillCustomerForm(customer) {
  document.getElementById("customer-name").value = customer.name || "";
  document.getElementById("customer-phone").value = customer.phone || "";
  document.getElementById("customer-address").value = customer.address || "";
  document.getElementById("customer-map").value = customer.mapLink || "";
  document.getElementById("customer-notes").value = customer.notes || "";
}

function clearCustomerForm() {
  document.getElementById("customer-form").reset();
}

async function handleCustomerSubmit(e) {
  e.preventDefault();

  if (isLoading) return;
  isLoading = true;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Menyimpan...";
  submitBtn.disabled = true;

  try {
    const formData = {
      name: document.getElementById("customer-name").value,
      phone: document.getElementById("customer-phone").value,
      address: document.getElementById("customer-address").value,
      mapLink: document.getElementById("customer-map").value,
      notes: document.getElementById("customer-notes").value,
      status: "Aktif",
      totalOrders: 0,
      lastOrder: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Handle photo upload with improved Discord webhook
    const photoFile = document.getElementById("customer-photo").files[0];
    if (photoFile) {
      try {
        console.log("📤 Uploading customer photo:", photoFile.name);
        const photoUrl = await uploadToDiscordImproved(
          photoFile,
          `Foto rumah ${formData.name}`
        );
        formData.housePhoto = photoUrl;
        console.log("✅ Photo uploaded successfully:", photoUrl);
      } catch (uploadError) {
        console.warn("Photo upload failed:", uploadError);
        showToast(
          "⚠️ Foto gagal diupload, data pelanggan tetap disimpan",
          "warning"
        );
      }
    }

    // Check if this is edit or add new customer
    if (currentEditingCustomer && currentEditingCustomer.id) {
      // Update existing customer
      console.log("🔄 Updating customer:", currentEditingCustomer.id);
      await window.updateDoc(
        window.doc(window.db, "customers", currentEditingCustomer.id),
        {
          ...formData,
          createdAt: currentEditingCustomer.createdAt, // Keep original creation date
        }
      );
      showToast("✅ Data pelanggan berhasil diperbarui");
    } else {
      // Add new customer
      console.log("➕ Adding new customer:", formData.name);
      await window.addDoc(window.collection(window.db, "customers"), formData);
      showToast("✅ Pelanggan baru berhasil ditambahkan");
    }

    closeCustomerModal();
    await loadCustomers();
    updateDashboardStats();
  } catch (error) {
    console.error("❌ Error saving customer:", error);
    if (error.code === "permission-denied") {
      showToast("❌ Permission denied. Periksa Firestore Rules!", "error");
      showFirebaseRulesHelp();
    } else {
      showToast("❌ Error menyimpan: " + error.message, "error");
    }
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    isLoading = false;
  }
}

// Global functions for button clicks
window.editCustomer = (customerId) => {
  const customer = customers.find((c) => c.id === customerId);
  if (customer) {
    openCustomerModal(customer);
  }
};

window.deleteCustomer = async (customerId) => {
  if (!confirm("Apakah Anda yakin ingin menghapus pelanggan ini?")) {
    return;
  }

  try {
    await window.deleteDoc(window.doc(window.db, "customers", customerId));
    showToast("✅ Pelanggan berhasil dihapus");
    await loadCustomers();
    updateDashboardStats();
  } catch (error) {
    console.error("❌ Error deleting customer:", error);
    if (error.code === "permission-denied") {
      showToast("❌ Permission denied. Periksa Firestore Rules!", "error");
      showFirebaseRulesHelp();
    } else {
      showToast("❌ Error menghapus: " + error.message, "error");
    }
  }
};

// Improved Discord Upload Function
async function uploadToDiscordImproved(file, description = "") {
  const formData = new FormData();
  formData.append("file", file);

  // Create a more detailed embed
  const embed = {
    title: "📸 Upload Gambar - Depot Air",
    description: description,
    color: 0x3b82f6,
    timestamp: new Date().toISOString(),
    footer: {
      text: "Depot Air Management System",
    },
    fields: [
      {
        name: "📁 File Info",
        value: `**Nama:** ${file.name}\n**Ukuran:** ${(
          file.size /
          1024 /
          1024
        ).toFixed(2)} MB\n**Type:** ${file.type}`,
        inline: true,
      },
      {
        name: "⏰ Upload Time",
        value: new Date().toLocaleString("id-ID"),
        inline: true,
      },
    ],
  };

  const payload = {
    embeds: [embed],
  };

  formData.append("payload_json", JSON.stringify(payload));

  try {
    console.log("📤 Uploading to Discord with improved method:", file.name);
    const response = await fetch(window.DISCORD_WEBHOOK_URL, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Discord upload successful:", result);

      // Try to get the actual attachment URL
      if (result.attachments && result.attachments.length > 0) {
        return result.attachments[0].url;
      }

      // Fallback: create a placeholder URL that references the Discord message
      const timestamp = Date.now();
      return `https://cdn.discordapp.com/attachments/1398168018412114020/${timestamp}/${encodeURIComponent(
        file.name
      )}`;
    } else {
      const errorText = await response.text();
      console.error("❌ Discord upload failed:", response.status, errorText);
      throw new Error(`Discord upload failed: ${response.status}`);
    }
  } catch (error) {
    console.error("❌ Discord upload error:", error);
    throw error;
  }
}

// Legacy Discord Upload Function (fallback)
async function uploadToDiscord(file, description = "") {
  return uploadToDiscordImproved(file, description);
}

// Dashboard Functions
function updateDashboardStats() {
  // Update customer stats (real data) - dengan null check
  const totalCustomersEl = document.getElementById("total-customers");
  if (totalCustomersEl) totalCustomersEl.textContent = customers.length;

  // Calculate real stats from orders
  const today = new Date().toDateString();
  const todayOrders = orders.filter(
    (order) => new Date(order.createdAt).toDateString() === today
  );
  const completedOrders = orders.filter((order) => order.status === "Selesai");
  const todayRevenue = todayOrders.reduce(
    (sum, order) => sum + (order.price || 0),
    0
  );

  const todayOrdersEl = document.getElementById("today-orders");
  if (todayOrdersEl) todayOrdersEl.textContent = todayOrders.length;

  const completedOrdersEl = document.getElementById("completed-orders");
  if (completedOrdersEl) completedOrdersEl.textContent = completedOrders.length;

  const totalRevenueEl = document.getElementById("total-revenue");
  if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(todayRevenue);
}

function loadRecentOrders() {
  const container = document.getElementById("recent-orders");
  if (!container) return;

  // Get recent orders (last 5)
  const recentOrders = orders.slice(0, 5);

  if (recentOrders.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8">
        <div class="text-gray-400 text-4xl mb-3">📦</div>
        <p class="text-gray-400">Belum ada pesanan hari ini</p>
        <p class="text-gray-500 text-sm mt-1">Pesanan akan muncul di sini</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  recentOrders.forEach((order) => {
    const orderItem = document.createElement("div");
    orderItem.className =
      "flex justify-between items-center p-3 bg-white/5 rounded-lg";
    orderItem.innerHTML = `
      <div>
        <p class="text-white text-sm font-medium">${order.customerName}</p>
        <p class="text-gray-400 text-xs">${order.waterType} - ${
      order.quantity
    } galon</p>
      </div>
      <div class="text-right">
        <p class="text-white text-sm">${formatCurrency(order.price)}</p>
        <span class="text-xs px-2 py-1 rounded-full ${getOrderStatusClass(
          order.status
        )}">
          ${order.status}
        </span>
      </div>
    `;
    container.appendChild(orderItem);
  });
}

function loadPopularProducts() {
  const container = document.getElementById("popular-products");
  if (!container) return;

  // Calculate product popularity
  const productStats = {};
  orders.forEach((order) => {
    if (productStats[order.waterType]) {
      productStats[order.waterType] += order.quantity;
    } else {
      productStats[order.waterType] = order.quantity;
    }
  });

  const sortedProducts = Object.entries(productStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  if (sortedProducts.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8">
        <div class="text-gray-400 text-4xl mb-3">💧</div>
        <p class="text-gray-400">Belum ada data produk</p>
        <p class="text-gray-500 text-sm mt-1">Data akan muncul setelah ada pesanan</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  sortedProducts.forEach(([product, quantity]) => {
    const productItem = document.createElement("div");
    productItem.className =
      "flex justify-between items-center p-3 bg-white/5 rounded-lg";
    productItem.innerHTML = `
      <div>
        <p class="text-white text-sm font-medium">${product}</p>
        <p class="text-gray-400 text-xs">Total terjual</p>
      </div>
      <div class="text-right">
        <p class="text-white text-lg font-bold">${quantity}</p>
        <p class="text-gray-400 text-xs">galon</p>
      </div>
    `;
    container.appendChild(productItem);
  });
}

function getOrderStatusClass(status) {
  switch (status) {
    case "Selesai":
      return "bg-green-500/20 text-green-400";
    case "Dikirim":
      return "bg-blue-500/20 text-blue-400";
    case "Diproses":
      return "bg-yellow-500/20 text-yellow-400";
    case "Pending":
      return "bg-red-500/20 text-red-400";
    default:
      return "bg-gray-500/20 text-gray-400";
  }
}

// Utility Functions
function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID");
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(amount);
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toast-message");

  toastMessage.textContent = message;

  // Set toast color based on type
  const toastContainer = toast.querySelector("div");
  if (type === "error") {
    toastContainer.className =
      "bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg";
  } else if (type === "warning") {
    toastContainer.className =
      "bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg";
  } else {
    toastContainer.className =
      "bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg";
  }

  toast.classList.remove("hidden");
  toast.classList.add("toast-enter");

  setTimeout(() => {
    toast.classList.add("toast-exit");
    setTimeout(() => {
      toast.classList.add("hidden");
      toast.classList.remove("toast-enter", "toast-exit");
    }, 300);
  }, 5000);
}

// Stock Management Functions
function openStockModal() {
  const modal = document.getElementById("stock-modal");

  // Fill current stock data
  document.getElementById("stock-filled-input").value = stockData.filled;
  document.getElementById("stock-empty-input").value = stockData.empty;
  document.getElementById("stock-damaged-input").value = stockData.damaged;

  modal.classList.remove("hidden");
}

function closeStockModal() {
  const modal = document.getElementById("stock-modal");
  modal.classList.add("hidden");
  document.getElementById("stock-form").reset();
}

async function handleStockSubmit(e) {
  e.preventDefault();

  if (isLoading) return;
  isLoading = true;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Updating...";
  submitBtn.disabled = true;

  try {
    const newStockData = {
      filled: Number.parseInt(
        document.getElementById("stock-filled-input").value
      ),
      empty: Number.parseInt(
        document.getElementById("stock-empty-input").value
      ),
      damaged: Number.parseInt(
        document.getElementById("stock-damaged-input").value
      ),
      notes: document.getElementById("stock-notes").value,
      updatedAt: new Date().toISOString(),
    };

    // Save to Firestore
    await window.addDoc(
      window.collection(window.db, "stock_history"),
      newStockData
    );

    // Update local stock data
    stockData = {
      filled: newStockData.filled,
      empty: newStockData.empty,
      damaged: newStockData.damaged,
    };

    // Update UI
    updateStockDisplay();
    loadStockHistory();

    showToast("✅ Stok berhasil diperbarui");
    closeStockModal();
  } catch (error) {
    console.error("❌ Error updating stock:", error);
    showToast("❌ Error updating stock: " + error.message, "error");
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    isLoading = false;
  }
}

function updateStockDisplay() {
  document.getElementById("stock-filled").textContent = stockData.filled;
  document.getElementById("stock-empty").textContent = stockData.empty;
  document.getElementById("stock-damaged").textContent = stockData.damaged;
}

async function loadStockHistory() {
  try {
    const querySnapshot = await window.getDocs(
      window.query(
        window.collection(window.db, "stock_history"),
        window.orderBy("updatedAt", "desc")
      )
    );

    const container = document.getElementById("stock-history");
    container.innerHTML = "";

    if (querySnapshot.empty) {
      container.innerHTML = `
        <div class="text-center py-8">
          <div class="text-gray-400 text-4xl mb-3">📦</div>
          <p class="text-gray-400">Belum ada riwayat stok</p>
        </div>
      `;
      return;
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const historyItem = document.createElement("div");
      historyItem.className =
        "flex justify-between items-center p-3 bg-white/5 rounded-lg";
      historyItem.innerHTML = `
        <div>
          <p class="text-white text-sm">
            Terisi: ${data.filled} | Kosong: ${data.empty} | Rusak: ${
        data.damaged
      }
          </p>
          ${
            data.notes
              ? `<p class="text-gray-400 text-xs mt-1">${data.notes}</p>`
              : ""
          }
        </div>
        <div class="text-gray-400 text-xs">
          ${formatDate(data.updatedAt)}
        </div>
      `;
      container.appendChild(historyItem);
    });
  } catch (error) {
    console.error("❌ Error loading stock history:", error);
  }
}

// Order Management Functions
function openOrderModal() {
  const modal = document.getElementById("order-modal");

  // Set default time to current time
  const now = new Date();
  const localDateTime = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 16);
  document.getElementById("order-time").value = localDateTime;

  // Set default quantity
  document.getElementById("order-quantity").value = 1;

  // Populate courier dropdown only
  populateCourierDropdown();

  modal.classList.remove("hidden");
}

function closeOrderModal() {
  const modal = document.getElementById("order-modal");
  modal.classList.add("hidden");
  document.getElementById("order-form").reset();

  // Clear customer search
  document.getElementById("order-customer-search").value = "";
  document.getElementById("order-customer").value = "";
  document.getElementById("customer-dropdown").classList.add("hidden");
  selectedCustomerId = null;
}

function populateCustomerDropdown() {
  const select = document.getElementById("order-customer");
  select.innerHTML = '<option value="">Pilih Pelanggan</option>';

  customers.forEach((customer) => {
    const option = document.createElement("option");
    option.value = customer.id;
    option.textContent = customer.name;
    select.appendChild(option);
  });
}

function populateCourierDropdown() {
  const select = document.getElementById("order-courier");
  select.innerHTML = '<option value="">Pilih Kurir</option>';

  couriers
    .filter((courier) => courier.isActive)
    .forEach((courier) => {
      const option = document.createElement("option");
      option.value = courier.id;
      option.textContent = courier.name;
      select.appendChild(option);
    });

  // Also populate filter dropdown
  const filterSelect = document.getElementById("order-courier-filter");
  filterSelect.innerHTML = '<option value="">Semua Kurir</option>';

  couriers.forEach((courier) => {
    const option = document.createElement("option");
    option.value = courier.id;
    option.textContent = courier.name;
    filterSelect.appendChild(option);
  });
}

// Toggle Courier Selection
window.toggleCourierSelection = () => {
  const courierType = document.getElementById("order-courier-type").value;
  const manualSelection = document.getElementById("manual-courier-selection");

  if (courierType === "manual") {
    manualSelection.classList.remove("hidden");
    document.getElementById("order-courier").required = true;
  } else {
    manualSelection.classList.add("hidden");
    document.getElementById("order-courier").required = false;
  }
};

async function handleOrderSubmit(e) {
  e.preventDefault();

  if (isLoading) return;
  isLoading = true;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Menyimpan...";
  submitBtn.disabled = true;

  try {
    const customerId = document.getElementById("order-customer").value;
    const courierType = document.getElementById("order-courier-type").value;
    const orderTime = document.getElementById("order-time").value;
    const customer = customers.find((c) => c.id === customerId);

    if (!customer) {
      throw new Error("Pelanggan tidak ditemukan");
    }

    const orderData = {
      customerId: customerId,
      customerName: customer.name,
      customerPhone: customer.phone || "",
      customerAddress: customer.address || "",
      customerMapLink: customer.mapLink || "",
      customerPhoto: customer.housePhoto || "",
      quantity: Number.parseInt(
        document.getElementById("order-quantity").value
      ),
      waterType: document.getElementById("order-water-type").value,
      deliveryType: document.getElementById("order-delivery-type").value,
      price: Number.parseInt(document.getElementById("order-price").value),
      notes: document.getElementById("order-notes").value,
      orderTime: orderTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (courierType === "manual") {
      // Manual courier selection
      const courierId = document.getElementById("order-courier").value;
      const courier = couriers.find((c) => c.id === courierId);

      orderData.courierId = courierId;
      orderData.courierName = courier.name;
      orderData.assignedCourierId = courierId;
      orderData.assignedCourierName = courier.name;
      orderData.status = "Diproses";
    } else if (courierType === "auto") {
      // Auto-assign - available for any courier to take
      orderData.status = "Pending"; // This will show up in courier dashboard
      // Don't set assignedCourierId yet - will be set when courier takes it
    }

    console.log("📦 Creating order:", orderData);

    // Save to Firestore
    await window.addDoc(window.collection(window.db, "orders"), orderData);

    showToast("✅ Pesanan berhasil ditambahkan");
    closeOrderModal();
    await loadOrders();
    updateDashboardStats();
  } catch (error) {
    console.error("❌ Error saving order:", error);
    showToast("❌ Error menyimpan pesanan: " + error.message, "error");
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    isLoading = false;
  }
}

async function loadOrders() {
  try {
    const querySnapshot = await window.getDocs(
      window.query(
        window.collection(window.db, "orders"),
        window.orderBy("createdAt", "desc")
      )
    );

    orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    renderOrders();
    updateOrderStats();
    updateDashboardStats();
    loadRecentOrders();
    loadPopularProducts();
  } catch (error) {
    console.error("❌ Error loading orders:", error);
  }
}

function renderOrders() {
  const grid = document.getElementById("orders-grid");
  if (!grid) return;

  if (orders.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-12">
        <div class="text-gray-400 text-6xl mb-4">📦</div>
        <p class="text-white text-lg">Belum ada pesanan</p>
        <p class="text-gray-400 text-sm mt-2">Klik "Tambah Pesanan" untuk memulai</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = "";

  orders.forEach((order) => {
    const orderCard = createOrderCard(order);
    grid.appendChild(orderCard);
  });

  lucide.createIcons();
}

function createOrderCard(order) {
  const card = document.createElement("div");
  card.className = "glass-card p-6 rounded-lg animate-fade-in";

  const statusClass = getOrderStatusClass(order.status);
  const deliveryTypeText =
    order.deliveryType === "pickup" ? "Ambil Sendiri" : "Antar ke Rumah";
  const deliveryTypeClass =
    order.deliveryType === "pickup"
      ? "bg-blue-500/20 text-blue-400"
      : "bg-green-500/20 text-green-400";

  // Fix courier name display
  const courierName =
    order.assignedCourierName || order.courierName || "Belum di-assign";

  card.innerHTML = `
  <div class="flex justify-between items-start mb-4">
    <div>
      <h3 class="text-white text-lg font-semibold">${order.customerName}</h3>
      <p class="text-gray-400 text-sm">Kurir: ${courierName}</p>
      <div class="flex gap-2 mt-1">
        <span class="px-2 py-1 text-xs rounded-full ${statusClass}">
          ${order.status}
        </span>
        <span class="px-2 py-1 text-xs rounded-full ${deliveryTypeClass}">
          ${deliveryTypeText}
        </span>
      </div>
    </div>
    <div class="flex items-center gap-2">
      ${
        order.status === "Pending"
          ? `
        <button onclick="openAssignModal(${JSON.stringify(order).replace(
          /"/g,
          "&quot;"
        )})" 
          class="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs">
          Assign Manual
        </button>
      `
          : ""
      }
      <button onclick="deleteOrder('${order.id}')" 
        class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs">
        Hapus
      </button>
    </div>
  </div>

  <div class="space-y-2 text-sm">
    <div class="flex justify-between">
      <span class="text-gray-400">Jenis Air:</span>
      <span class="text-white">${order.waterType}</span>
    </div>
    <div class="flex justify-between">
      <span class="text-gray-400">Jumlah:</span>
      <span class="text-white">${order.quantity} galon</span>
    </div>
    <div class="flex justify-between">
      <span class="text-gray-400">Harga:</span>
      <span class="text-white">${formatCurrency(order.price)}</span>
    </div>
    <div class="flex justify-between">
      <span class="text-gray-400">Waktu Pesanan:</span>
      <span class="text-white">${formatDateTime(
        order.orderTime || order.createdAt
      )}</span>
    </div>
    <div class="flex justify-between">
      <span class="text-gray-400">Dibuat:</span>
      <span class="text-white">${formatDate(order.createdAt)}</span>
    </div>
    ${
      order.notes
        ? `
      <div class="mt-3 p-2 bg-white/5 rounded text-xs">
        <span class="text-gray-400">Catatan:</span>
        <p class="text-white mt-1">${order.notes}</p>
      </div>
    `
        : ""
    }
  </div>
`;

  return card;
}

function updateOrderStats() {
  const total = orders.length;
  const pending = orders.filter((o) => o.status === "Pending").length;
  const processing = orders.filter((o) => o.status === "Diproses").length;
  const shipped = orders.filter((o) => o.status === "Dikirim").length;
  const completed = orders.filter((o) => o.status === "Selesai").length;

  document.getElementById("orders-total").textContent = total;
  document.getElementById("orders-pending").textContent = pending;
  document.getElementById("orders-processing").textContent = processing;
  document.getElementById("orders-shipped").textContent = shipped;
  document.getElementById("orders-completed").textContent = completed;
}

function handleOrderSearch(e) {
  // Implementation for order search
  const searchTerm = e.target.value.toLowerCase();
  // Filter and render orders based on search
}

function handleOrderFilter() {
  // Implementation for order filtering
  const statusFilter = document.getElementById("order-status-filter").value;
  const courierFilter = document.getElementById("order-courier-filter").value;
  // Filter and render orders based on filters
}

// Customer Search Functions
let selectedCustomerId = null;

window.searchCustomers = (searchTerm) => {
  const dropdown = document.getElementById("customer-dropdown");
  const hiddenInput = document.getElementById("order-customer");

  if (searchTerm.length < 2) {
    dropdown.classList.add("hidden");
    hiddenInput.value = "";
    selectedCustomerId = null;
    return;
  }

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (filteredCustomers.length === 0) {
    dropdown.innerHTML =
      '<div class="p-3 text-gray-400 text-sm">Tidak ada pelanggan ditemukan</div>';
    dropdown.classList.remove("hidden");
    return;
  }

  dropdown.innerHTML = "";
  filteredCustomers.forEach((customer) => {
    const option = document.createElement("div");
    option.className =
      "p-3 hover:bg-white/10 cursor-pointer text-white text-sm border-b border-white/10 last:border-b-0";
    option.innerHTML = `
      <div class="font-medium">${customer.name}</div>
      <div class="text-xs text-gray-400">${customer.address}</div>
    `;
    option.onclick = () => selectCustomer(customer);
    dropdown.appendChild(option);
  });

  dropdown.classList.remove("hidden");
};

function selectCustomer(customer) {
  document.getElementById("order-customer-search").value = customer.name;
  document.getElementById("order-customer").value = customer.id;
  document.getElementById("customer-dropdown").classList.add("hidden");
  selectedCustomerId = customer.id;
}

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  const searchInput = document.getElementById("order-customer-search");
  const dropdown = document.getElementById("customer-dropdown");

  if (
    searchInput &&
    dropdown &&
    !searchInput.contains(e.target) &&
    !dropdown.contains(e.target)
  ) {
    dropdown.classList.add("hidden");
  }
});

// Manual Assignment Functions
let currentAssignOrder = null;

function openAssignModal(order) {
  currentAssignOrder = order;
  const modal = document.getElementById("assign-modal");

  // Populate order info
  const orderInfo = document.getElementById("assign-order-info");
  orderInfo.innerHTML = `
    <div class="text-sm space-y-1">
      <div class="flex justify-between">
        <span class="text-gray-400">Pelanggan:</span>
        <span class="text-white">${order.customerName}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-400">Jenis Air:</span>
        <span class="text-white">${order.waterType}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-400">Jumlah:</span>
        <span class="text-white">${order.quantity} galon</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-400">Harga:</span>
        <span class="text-white">${formatCurrency(order.price)}</span>
      </div>
    </div>
  `;

  // Populate courier dropdown
  const select = document.getElementById("assign-courier");
  select.innerHTML = '<option value="">Pilih Kurir</option>';

  couriers
    .filter((courier) => courier.isActive)
    .forEach((courier) => {
      const option = document.createElement("option");
      option.value = courier.id;
      option.textContent = courier.name;
      select.appendChild(option);
    });

  modal.classList.remove("hidden");
}

function closeAssignModal() {
  const modal = document.getElementById("assign-modal");
  modal.classList.add("hidden");
  currentAssignOrder = null;
  document.getElementById("assign-form").reset();
}

async function handleAssignSubmit(e) {
  e.preventDefault();

  if (!currentAssignOrder) return;

  const courierId = document.getElementById("assign-courier").value;
  const courier = couriers.find((c) => c.id === courierId);

  try {
    // Get customer data for the order
    const customer = customers.find(
      (c) => c.id === currentAssignOrder.customerId
    );

    // Update order with courier assignment
    await window.updateDoc(
      window.doc(window.db, "orders", currentAssignOrder.id),
      {
        assignedCourierId: courierId,
        assignedCourierName: courier.name,
        courierName: courier.name,
        status: "Diproses",
        customerPhone: customer?.phone || "",
        customerAddress: customer?.address || "",
        customerMapLink: customer?.mapLink || "",
        customerPhoto: customer?.housePhoto || "",
        assignedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );

    showToast(`✅ Pesanan berhasil di-assign ke ${courier.name}`);
    closeAssignModal();
    await loadOrders();
  } catch (error) {
    console.error("❌ Error assigning order:", error);
    showToast("❌ Error assign pesanan: " + error.message, "error");
  }
}

// Delete Order Function
window.deleteOrder = async (orderId) => {
  if (!confirm("Apakah Anda yakin ingin menghapus pesanan ini?")) {
    return;
  }

  try {
    await window.deleteDoc(window.doc(window.db, "orders", orderId));
    showToast("✅ Pesanan berhasil dihapus");
    await loadOrders();
    updateDashboardStats();
  } catch (error) {
    console.error("❌ Error deleting order:", error);
    if (error.code === "permission-denied") {
      showToast("❌ Permission denied. Periksa Firestore Rules!", "error");
      showFirebaseRulesHelp();
    } else {
      showToast("❌ Error menghapus pesanan: " + error.message, "error");
    }
  }
};

// Global functions
window.openAssignModal = openAssignModal;
window.closeAssignModal = closeAssignModal;

// Analytics Functions
async function loadAnalytics() {
  try {
    console.log("📊 Loading analytics data...");

    // Calculate monthly stats
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyOrders = orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      return (
        orderDate.getMonth() === currentMonth &&
        orderDate.getFullYear() === currentYear
      );
    });

    const monthlyRevenue = monthlyOrders.reduce(
      (sum, order) => sum + (order.price || 0),
      0
    );
    const newCustomersThisMonth = customers.filter((customer) => {
      const joinDate = new Date(customer.createdAt);
      return (
        joinDate.getMonth() === currentMonth &&
        joinDate.getFullYear() === currentYear
      );
    }).length;

    const avgOrderValue =
      monthlyOrders.length > 0 ? monthlyRevenue / monthlyOrders.length : 0;

    // Update analytics display
    document.getElementById("analytics-monthly-revenue").textContent =
      formatCurrency(monthlyRevenue);
    document.getElementById("analytics-monthly-orders").textContent =
      monthlyOrders.length;
    document.getElementById("analytics-new-customers").textContent =
      newCustomersThisMonth;
    document.getElementById("analytics-avg-order").textContent =
      formatCurrency(avgOrderValue);

    // Load charts
    loadRevenueChart(orders);
    loadOrdersChart(orders);
    loadDeliveryHistory();
  } catch (error) {
    console.error("❌ Error loading analytics:", error);
  }
}

function loadRevenueChart(orders) {
  const ctx = document.getElementById("revenue-chart")?.getContext("2d");
  if (!ctx) return;

  // Get last 7 days data
  const last7Days = [];
  const revenueData = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayString = date.toISOString().split("T")[0];
    last7Days.push(
      date.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" })
    );

    const dayRevenue = orders
      .filter(
        (order) =>
          order.createdAt?.startsWith(dayString) && order.status === "Selesai"
      )
      .reduce((sum, order) => sum + (order.price || 0), 0);

    revenueData.push(dayRevenue);
  }

  // Destroy existing chart if exists
  if (window.revenueChart) {
    window.revenueChart.destroy();
  }

  window.revenueChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: last7Days,
      datasets: [
        {
          label: "Revenue (Rp)",
          data: revenueData,
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      height: 200, // Fixed height
      plugins: {
        legend: {
          labels: {
            color: "white",
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "white",
            callback: (value) =>
              new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
              }).format(value),
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
        x: {
          ticks: {
            color: "white",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
      },
    },
  });
}

function loadOrdersChart(orders) {
  const ctx = document.getElementById("orders-chart")?.getContext("2d");
  if (!ctx) return;

  // Get last 7 days data
  const last7Days = [];
  const ordersData = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayString = date.toISOString().split("T")[0];
    last7Days.push(
      date.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" })
    );

    const dayOrders = orders.filter((order) =>
      order.createdAt?.startsWith(dayString)
    ).length;
    ordersData.push(dayOrders);
  }

  // Destroy existing chart if exists
  if (window.ordersChart) {
    window.ordersChart.destroy();
  }

  window.ordersChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: last7Days,
      datasets: [
        {
          label: "Jumlah Pesanan",
          data: ordersData,
          backgroundColor: "rgba(34, 197, 94, 0.8)",
          borderColor: "rgb(34, 197, 94)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      height: 200, // Fixed height
      plugins: {
        legend: {
          labels: {
            color: "white",
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "white",
            stepSize: 1,
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
        x: {
          ticks: {
            color: "white",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
      },
    },
  });
}

async function loadDeliveryHistory() {
  try {
    const deliveryHistory = orders.filter(
      (order) => order.status === "Selesai"
    );
    renderDeliveryHistory(deliveryHistory);

    // Populate courier filter
    const courierFilter = document.getElementById("history-courier");
    if (courierFilter) {
      courierFilter.innerHTML = '<option value="">Semua Kurir</option>';
      const uniqueCouriers = [
        ...new Set(
          deliveryHistory.map((h) => h.assignedCourierName).filter(Boolean)
        ),
      ];
      uniqueCouriers.forEach((courierName) => {
        const option = document.createElement("option");
        option.value = courierName;
        option.textContent = courierName;
        courierFilter.appendChild(option);
      });
    }
  } catch (error) {
    console.error("❌ Error loading delivery history:", error);
  }
}

function renderDeliveryHistory(history) {
  const container = document.getElementById("delivery-history");
  if (!container) return;

  if (history.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8">
        <div class="text-gray-400 text-4xl mb-3">📋</div>
        <p class="text-gray-400">Belum ada history pengantaran</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  history.forEach((delivery) => {
    const historyItem = document.createElement("div");
    historyItem.className =
      "flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10";

    const deliveryTypeText =
      delivery.deliveryType === "pickup" ? "Ambil Sendiri" : "Antar ke Rumah";
    const deliveryTypeClass =
      delivery.deliveryType === "pickup"
        ? "bg-blue-500/20 text-blue-400"
        : "bg-green-500/20 text-green-400";

    historyItem.innerHTML = `
      <div class="flex-1">
        <div class="flex items-center gap-3 mb-2">
          <h4 class="text-white font-medium">${delivery.customerName}</h4>
          <span class="px-2 py-1 text-xs rounded-full ${deliveryTypeClass}">
            ${deliveryTypeText}
          </span>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span class="text-gray-400">Kurir:</span>
            <p class="text-white">${delivery.assignedCourierName || "-"}</p>
          </div>
          <div>
            <span class="text-gray-400">Jenis:</span>
            <p class="text-white">${delivery.waterType}</p>
          </div>
          <div>
            <span class="text-gray-400">Jumlah:</span>
            <p class="text-white">${delivery.quantity} galon</p>
          </div>
          <div>
            <span class="text-gray-400">Total:</span>
            <p class="text-white font-medium">${formatCurrency(
              delivery.price
            )}</p>
          </div>
        </div>
      </div>
      <div class="text-right">
        <p class="text-gray-400 text-xs">Selesai</p>
        <p class="text-white text-sm">${formatDate(
          delivery.completedAt || delivery.updatedAt
        )}</p>
      </div>
    `;

    container.appendChild(historyItem);
  });
}

window.filterDeliveryHistory = async () => {
  const period = document.getElementById("history-period")?.value;
  const courierName = document.getElementById("history-courier")?.value;

  let filteredHistory = orders.filter((order) => order.status === "Selesai");

  // Filter by period
  const now = new Date();
  if (period === "today") {
    const today = now.toISOString().split("T")[0];
    filteredHistory = filteredHistory.filter(
      (h) => h.completedAt?.startsWith(today) || h.updatedAt?.startsWith(today)
    );
  } else if (period === "week") {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filteredHistory = filteredHistory.filter(
      (h) => new Date(h.completedAt || h.updatedAt) >= weekAgo
    );
  } else if (period === "month") {
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
    filteredHistory = filteredHistory.filter(
      (h) => new Date(h.completedAt || h.updatedAt) >= monthAgo
    );
  }

  // Filter by courier
  if (courierName) {
    filteredHistory = filteredHistory.filter(
      (h) => h.assignedCourierName === courierName
    );
  }

  // Sort by completed date descending
  filteredHistory.sort(
    (a, b) =>
      new Date(b.completedAt || b.updatedAt) -
      new Date(a.completedAt || a.updatedAt)
  );

  renderDeliveryHistory(filteredHistory);
};

// Initialize when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    // Firebase will call initApp when ready
  });
} else {
  // Firebase will call initApp when ready
}

// Import or initialize Lucide icons
document.addEventListener("DOMContentLoaded", () => {
  lucide = window.lucide; // Assuming lucide is available in the window object
  if (lucide) {
    lucide.createIcons();
  } else {
    console.error("Lucide icons not found");
  }
});

function formatDateTime(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
