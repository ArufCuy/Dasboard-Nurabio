// Global Variables
let isLoading = false
let lucide // Declare the lucide variable

// Initialize App
window.initCourierLogin = () => {
  // Hide loading screen
  setTimeout(() => {
    document.getElementById("loading").style.display = "none"
    initializeEventListeners()

    // Initialize Lucide icons
    if (window.lucide) {
      window.lucide.createIcons()
    }
  }, 1000)
}

// Event Listeners
function initializeEventListeners() {
  document.getElementById("courier-login-form").addEventListener("submit", handleLogin)
}

// Handle Login
async function handleLogin(e) {
  e.preventDefault()

  if (isLoading) return
  isLoading = true

  const submitBtn = document.getElementById("login-btn-text")
  const originalText = submitBtn.textContent
  submitBtn.textContent = "Memverifikasi..."

  try {
    const username = document.getElementById("login-username").value
    const password = document.getElementById("login-password").value

    // Query couriers collection to find matching credentials
    const couriersQuery = window.query(
      window.collection(window.db, "couriers"),
      window.where("username", "==", username),
      window.where("password", "==", password),
      window.where("isActive", "==", true),
    )

    const querySnapshot = await window.getDocs(couriersQuery)

    if (querySnapshot.empty) {
      showToast("❌ Username atau password salah!", "error")
      return
    }

    // Login successful
    const courierDoc = querySnapshot.docs[0]
    const courierData = { id: courierDoc.id, ...courierDoc.data() }

    // Store courier data in localStorage
    localStorage.setItem("courierData", JSON.stringify(courierData))

    showToast("✅ Login berhasil! Mengalihkan...", "success")

    // Redirect to courier dashboard
    setTimeout(() => {
      window.location.href = "courier-dashboard.html"
    }, 1500)
  } catch (error) {
    console.error("❌ Login error:", error)
    showToast("❌ Error login: " + error.message, "error")
  } finally {
    submitBtn.textContent = originalText
    isLoading = false
  }
}

// Utility Functions
function showToast(message, type = "success") {
  const toast = document.getElementById("toast")
  const toastMessage = document.getElementById("toast-message")

  toastMessage.textContent = message

  // Set toast color based on type
  const toastContainer = toast.querySelector("div")
  if (type === "error") {
    toastContainer.className = "bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg"
  } else if (type === "warning") {
    toastContainer.className = "bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg"
  } else {
    toastContainer.className = "bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg"
  }

  toast.classList.remove("hidden")
  toast.classList.add("toast-enter")

  setTimeout(() => {
    toast.classList.add("toast-exit")
    setTimeout(() => {
      toast.classList.add("hidden")
      toast.classList.remove("toast-enter", "toast-exit")
    }, 300)
  }, 3000)
}

// Initialize when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    // Firebase will call initCourierLogin when ready
  })
} else {
  // Firebase will call initCourierLogin when ready
}

document.addEventListener("DOMContentLoaded", () => {
  // Initialize lucide when DOM is ready
  if (window.lucide) {
    window.lucide.createIcons()
  }
})
