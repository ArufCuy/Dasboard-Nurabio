// Global Variables
let currentCourier = null;
let availableOrders = [];
let myOrders = [];
let lucide; // Declare lucide variable
let currentEditingOrder = null;

// Initialize App
window.initCourierDashboard = () => {
  // Check if courier is logged in
  const courierData = localStorage.getItem("courierData");
  if (!courierData) {
    window.location.href = "courier-login.html";
    return;
  }

  currentCourier = JSON.parse(courierData);

  // Hide loading screen
  setTimeout(() => {
    document.getElementById("loading").style.display = "none";
    initializeApp();
  }, 1000);
};

// Initialize App Functions
function initializeApp() {
  updateCourierInfo();
  updateCurrentTime();
  setInterval(updateCurrentTime, 1000);

  // Initialize Lucide icons properly
  if (window.lucide) {
    lucide = window.lucide;
    lucide.createIcons();
  }

  // Set up real-time listeners
  setupOrderListeners();

  // Add event listeners for courier order edit
  document
    .getElementById("courier-order-edit-cancel-btn")
    ?.addEventListener("click", closeCourierOrderEditModal);
  document
    .getElementById("courier-order-edit-form")
    ?.addEventListener("submit", handleCourierOrderEditSubmit);

  // Close modal when clicking outside
  document
    .getElementById("courier-order-edit-modal")
    ?.addEventListener("click", (e) => {
      if (e.target.id === "courier-order-edit-modal") {
        closeCourierOrderEditModal();
      }
    });
}

// Update Courier Info
function updateCourierInfo() {
  document.getElementById(
    "courier-name"
  ).textContent = `Halo, ${currentCourier.name}!`;
  document.getElementById("total-deliveries").textContent =
    currentCourier.totalDeliveries || 0;
}

// Update Current Time
function updateCurrentTime() {
  const now = new Date();
  const timeString = now.toLocaleString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  document.getElementById("current-time").textContent = timeString;
}

// Setup Real-time Order Listeners
function setupOrderListeners() {
  console.log("🔄 Setting up real-time order listeners...");

  // Listen for ALL available orders (not assigned to anyone OR assigned to me but still pending)
  const availableOrdersQuery = window.query(
    window.collection(window.db, "orders"),
    window.orderBy("createdAt", "desc")
  );

  window.onSnapshot(availableOrdersQuery, (snapshot) => {
    console.log("📦 All orders updated:", snapshot.size);
    availableOrders = [];
    myOrders = [];

    snapshot.forEach((doc) => {
      const orderData = { id: doc.id, ...doc.data() };

      // Categorize orders
      if (orderData.assignedCourierId === currentCourier.id) {
        // This is my order
        myOrders.push(orderData);
      } else if (
        !orderData.assignedCourierId &&
        orderData.status === "Pending"
      ) {
        // Available for taking
        availableOrders.push(orderData);
      }
    });

    console.log("📦 Available orders:", availableOrders.length);
    console.log("🚚 My orders:", myOrders.length);

    renderAvailableOrders();
    renderMyOrders();
    updateStats();
  });
}

// Render Available Orders
function renderAvailableOrders() {
  const container = document.getElementById("available-orders-list");

  if (availableOrders.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8">
        <div class="text-gray-400 text-4xl mb-3">📦</div>
        <p class="text-gray-400">Tidak ada pesanan tersedia</p>
        <p class="text-gray-500 text-sm mt-1">Pesanan baru akan muncul di sini</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  availableOrders.forEach((order) => {
    const orderCard = createAvailableOrderCard(order);
    container.appendChild(orderCard);
  });

  // Re-initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Create Available Order Card
function createAvailableOrderCard(order) {
  const card = document.createElement("div");
  card.className =
    "bg-white/5 border border-white/10 rounded-lg p-4 animate-fade-in";

  const deliveryTypeText =
    order.deliveryType === "pickup" ? "Ambil Sendiri" : "Antar ke Rumah";
  const deliveryTypeClass =
    order.deliveryType === "pickup"
      ? "bg-blue-500/20 text-blue-400"
      : "bg-green-500/20 text-green-400";

  card.innerHTML = `
    <div class="flex justify-between items-start mb-3">
      <div>
        <h4 class="text-white font-semibold">${order.customerName}</h4>
        <div class="flex gap-2 mt-1">
          <span class="inline-block px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">
            Menunggu Kurir
          </span>
          <span class="inline-block px-2 py-1 text-xs rounded-full ${deliveryTypeClass}">
            ${deliveryTypeText}
          </span>
        </div>
      </div>
      <button onclick="takeOrder('${order.id}')" 
        class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
        Ambil Pesanan
      </button>
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
        <span class="text-gray-400">Waktu:</span>
        <span class="text-white">${formatDate(order.createdAt)}</span>
      </div>
      ${
        order.notes
          ? `
        <div class="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs">
          <div class="flex items-center gap-1 mb-1">
            <i data-lucide="sticky-note" class="h-3 w-3 text-blue-400"></i>
            <span class="text-blue-400 font-medium">Catatan Admin:</span>
          </div>
          <p class="text-white">${order.notes}</p>
        </div>
      `
          : ""
      }
    </div>
  `;

  return card;
}

// Render My Orders
function renderMyOrders() {
  const container = document.getElementById("my-orders-list");

  if (myOrders.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8">
        <div class="text-gray-400 text-4xl mb-3">🚚</div>
        <p class="text-gray-400">Belum ada pesanan</p>
        <p class="text-gray-500 text-sm mt-1">Ambil pesanan untuk mulai delivery</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  myOrders.forEach((order) => {
    const orderCard = createMyOrderCard(order);
    container.appendChild(orderCard);
  });

  // Re-initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Create My Order Card
function createMyOrderCard(order) {
  const card = document.createElement("div");
  card.className =
    "bg-white/5 border border-white/10 rounded-lg p-4 animate-fade-in";

  const statusClass = getOrderStatusClass(order.status);
  const deliveryTypeText =
    order.deliveryType === "pickup" ? "Ambil Sendiri" : "Antar ke Rumah";
  const deliveryTypeClass =
    order.deliveryType === "pickup"
      ? "bg-blue-500/20 text-blue-400"
      : "bg-green-500/20 text-green-400";

  // Calculate unpaid amount and unreturned gallons
  const unpaidAmount = (order.price || 0) - (order.paidAmount || 0);
  const unreturnedGallons =
    (order.quantity || 0) - (order.returnedGallons || 0);

  card.innerHTML = `
    <div class="flex justify-between items-start mb-3">
      <div>
        <h4 class="text-white font-semibold">${order.customerName}</h4>
        <div class="flex gap-2 mt-1">
          <span class="inline-block px-2 py-1 text-xs rounded-full ${statusClass}">
            ${order.status}
          </span>
          <span class="inline-block px-2 py-1 text-xs rounded-full ${deliveryTypeClass}">
            ${deliveryTypeText}
          </span>
        </div>
      </div>
      <div class="flex gap-2">
        <button onclick="editCourierOrder('${order.id}')" 
          class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
          Edit
        </button>
        ${
          order.status === "Diproses"
            ? `
          <button onclick="updateOrderStatus('${order.id}', 'Dikirim')" 
            class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
            Mulai Kirim
          </button>
        `
            : ""
        }
        ${
          order.status === "Dikirim"
            ? `
          <button onclick="updateOrderStatus('${order.id}', 'Selesai')" 
            class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm">
            Selesai
          </button>
        `
            : ""
        }
      </div>
    </div>
    
    <div class="space-y-2 text-sm mb-3">
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
      ${
        unpaidAmount > 0
          ? `
      <div class="flex justify-between">
        <span class="text-gray-400">Belum Dibayar:</span>
        <span class="text-yellow-400 font-medium">${formatCurrency(
          unpaidAmount
        )}</span>
      </div>
      `
          : ""
      }
      ${
        unreturnedGallons > 0
          ? `
      <div class="flex justify-between">
        <span class="text-gray-400">Belum Kembali:</span>
        <span class="text-orange-400 font-medium">${unreturnedGallons} galon</span>
      </div>
      `
          : ""
      }
    </div>

    ${
      order.notes
        ? `
      <div class="mb-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs">
        <div class="flex items-center gap-1 mb-1">
          <i data-lucide="sticky-note" class="h-3 w-3 text-blue-400"></i>
          <span class="text-blue-400 font-medium">Catatan Admin:</span>
        </div>
        <p class="text-white">${order.notes}</p>
      </div>
    `
        : ""
    }

    ${
      order.deliveryType === "delivery"
        ? `
    <!-- Customer Info for delivery only -->
    <div class="border-t border-white/10 pt-3 space-y-2">
      <div class="flex items-center gap-2">
        <i data-lucide="phone" class="h-4 w-4 text-gray-400"></i>
        <a href="https://wa.me/${order.customerPhone?.replace(/^0/, "62")}" 
           target="_blank" 
           class="text-green-400 hover:text-green-300 text-sm">
          ${order.customerPhone || "No phone"}
        </a>
      </div>
      
      <div class="flex items-start gap-2">
        <i data-lucide="map-pin" class="h-4 w-4 text-gray-400 mt-0.5"></i>
        <span class="text-gray-300 text-sm">${
          order.customerAddress || "No address"
        }</span>
      </div>
      
      ${
        order.customerMapLink
          ? `
        <div class="flex items-center gap-2">
          <i data-lucide="navigation" class="h-4 w-4 text-gray-400"></i>
          <a href="${order.customerMapLink}" 
             target="_blank" 
             class="text-blue-400 hover:text-blue-300 text-sm">
            Buka Google Maps
          </a>
        </div>
      `
          : ""
      }
      
      ${
        order.customerPhoto
          ? `
        <div class="flex items-center gap-2">
          <i data-lucide="image" class="h-4 w-4 text-gray-400"></i>
          <a href="${order.customerPhoto}" 
             target="_blank" 
             class="text-purple-400 hover:text-purple-300 text-sm">
            Lihat Foto Rumah
          </a>
        </div>
      `
          : ""
      }
    </div>
    `
        : `
    <!-- Pickup info -->
    <div class="border-t border-white/10 pt-3">
      <div class="flex items-center gap-2 text-sm text-yellow-400">
        <i data-lucide="store" class="h-4 w-4"></i>
        <span>Pelanggan akan ambil sendiri di depot</span>
      </div>
    </div>
    `
    }
  `;

  return card;
}

// Take Order
window.takeOrder = async (orderId) => {
  try {
    const order = availableOrders.find((o) => o.id === orderId);
    if (!order) return;

    // Get customer data
    const customerDoc = await window.getDocs(
      window.query(
        window.collection(window.db, "customers"),
        window.where("name", "==", order.customerName)
      )
    );

    let customerData = {};
    if (!customerDoc.empty) {
      customerData = customerDoc.docs[0].data();
    }

    // Update order with courier assignment and customer details
    await window.updateDoc(window.doc(window.db, "orders", orderId), {
      assignedCourierId: currentCourier.id,
      assignedCourierName: currentCourier.name,
      status: "Diproses",
      customerPhone: customerData.phone || "",
      customerAddress: customerData.address || "",
      customerMapLink: customerData.mapLink || "",
      customerPhoto: customerData.housePhoto || "",
      takenAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Update courier stats
    await window.updateDoc(
      window.doc(window.db, "couriers", currentCourier.id),
      {
        dailyDeliveries: (currentCourier.dailyDeliveries || 0) + 1,
        weeklyDeliveries: (currentCourier.weeklyDeliveries || 0) + 1,
        updatedAt: new Date().toISOString(),
      }
    );

    showToast("✅ Pesanan berhasil diambil!", "success");
  } catch (error) {
    console.error("❌ Error taking order:", error);
    showToast("❌ Error mengambil pesanan: " + error.message, "error");
  }
};

// Update Order Status
window.updateOrderStatus = async (orderId, newStatus) => {
  try {
    const updateData = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    if (newStatus === "Selesai") {
      updateData.completedAt = new Date().toISOString();

      // Update courier total deliveries
      await window.updateDoc(
        window.doc(window.db, "couriers", currentCourier.id),
        {
          totalDeliveries: (currentCourier.totalDeliveries || 0) + 1,
          updatedAt: new Date().toISOString(),
        }
      );

      // Update local courier data
      currentCourier.totalDeliveries =
        (currentCourier.totalDeliveries || 0) + 1;
      localStorage.setItem("courierData", JSON.stringify(currentCourier));
      updateCourierInfo();
    }

    await window.updateDoc(
      window.doc(window.db, "orders", orderId),
      updateData
    );

    const statusText = newStatus === "Dikirim" ? "sedang dikirim" : "selesai";
    showToast(`✅ Pesanan ${statusText}!`, "success");
  } catch (error) {
    console.error("❌ Error updating order status:", error);
    showToast("❌ Error update status: " + error.message, "error");
  }
};

// Update Stats
function updateStats() {
  document.getElementById("available-orders").textContent =
    availableOrders.length;
  document.getElementById("my-orders").textContent = myOrders.length;

  // Count completed today
  const today = new Date().toDateString();
  const completedToday = myOrders.filter((order) => {
    return (
      order.completedAt && new Date(order.completedAt).toDateString() === today
    );
  }).length;

  document.getElementById("completed-today").textContent = completedToday;
}

// Refresh Orders
window.refreshOrders = () => {
  showToast("🔄 Memperbarui pesanan...", "info");
  // Real-time listeners will automatically update
};

// Logout
window.logout = () => {
  if (confirm("Apakah Anda yakin ingin logout?")) {
    localStorage.removeItem("courierData");
    window.location.href = "courier-login.html";
  }
};

// Utility Functions
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

function formatDate(dateString) {
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
  } else if (type === "info") {
    toastContainer.className =
      "bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg";
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
  }, 3000);
}

// Add these functions after the existing functions

// Order Edit Functions for Courier
function openCourierOrderEditModal(order) {
  currentEditingOrder = order;

  const modal = document.getElementById("courier-order-edit-modal");
  const title = document.getElementById("courier-order-edit-title");

  title.textContent = `Edit Pesanan - ${order.customerName}`;
  fillCourierOrderEditForm(order);

  modal.classList.remove("hidden");
}

function closeCourierOrderEditModal() {
  const modal = document.getElementById("courier-order-edit-modal");
  modal.classList.add("hidden");
  currentEditingOrder = null;
  clearCourierOrderEditForm();
}

function fillCourierOrderEditForm(order) {
  document.getElementById("courier-edit-order-status").value =
    order.status || "Pending";
  document.getElementById("courier-edit-paid-amount").value =
    order.paidAmount || 0;
  document.getElementById("courier-edit-returned-gallons").value =
    order.returnedGallons || 0;
  document.getElementById("courier-edit-order-notes").value = order.notes || "";
}

function clearCourierOrderEditForm() {
  document.getElementById("courier-order-edit-form").reset();
}

async function handleCourierOrderEditSubmit(e) {
  e.preventDefault();

  if (!currentEditingOrder) return;

  try {
    const updateData = {
      status: document.getElementById("courier-edit-order-status").value,
      paidAmount: Number.parseInt(
        document.getElementById("courier-edit-paid-amount").value
      ),
      returnedGallons: Number.parseInt(
        document.getElementById("courier-edit-returned-gallons").value
      ),
      notes: document.getElementById("courier-edit-order-notes").value,
      updatedAt: new Date().toISOString(),
    };

    // If status changed to Selesai, add completion timestamp
    if (
      updateData.status === "Selesai" &&
      currentEditingOrder.status !== "Selesai"
    ) {
      updateData.completedAt = new Date().toISOString();

      // Update courier total deliveries
      await window.updateDoc(
        window.doc(window.db, "couriers", currentCourier.id),
        {
          totalDeliveries: (currentCourier.totalDeliveries || 0) + 1,
          updatedAt: new Date().toISOString(),
        }
      );

      // Update local courier data
      currentCourier.totalDeliveries =
        (currentCourier.totalDeliveries || 0) + 1;
      localStorage.setItem("courierData", JSON.stringify(currentCourier));
      updateCourierInfo();
    }

    await window.updateDoc(
      window.doc(window.db, "orders", currentEditingOrder.id),
      updateData
    );

    showToast("✅ Pesanan berhasil diperbarui");
    closeCourierOrderEditModal();
  } catch (error) {
    console.error("❌ Error updating order:", error);
    showToast("❌ Error memperbarui pesanan: " + error.message, "error");
  }
}

// Global function for courier edit button
window.editCourierOrder = (orderId) => {
  const order = myOrders.find((o) => o.id === orderId);
  if (order) {
    openCourierOrderEditModal(order);
  }
};

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Initialize lucide when available
  if (window.lucide) {
    lucide = window.lucide;
    lucide.createIcons();
  }
});
