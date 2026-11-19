// MedLocate - Core Application Controller (app.js)
// Simple, Calm & Modern Healthcare UI with Realistic Doctor Receipts

class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.12, gainVal = 0.08) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }

  radarPing() {
    if (!this.enabled) return;
    this.playTone(880, 'sine', 0.2, 0.06);
    setTimeout(() => this.playTone(1320, 'sine', 0.25, 0.04), 100);
  }

  laserScan() {
    if (!this.enabled) return;
    this.playTone(520, 'triangle', 0.08, 0.03);
    setTimeout(() => this.playTone(780, 'triangle', 0.12, 0.04), 120);
  }

  stockLocked() {
    if (!this.enabled) return;
    this.playTone(523.25, 'sine', 0.12, 0.08); // C5
    setTimeout(() => this.playTone(659.25, 'sine', 0.12, 0.08), 100); // E5
    setTimeout(() => this.playTone(783.99, 'sine', 0.25, 0.1), 200); // G5
  }

  pharmacistAlert() {
    if (!this.enabled) return;
    this.playTone(900, 'sine', 0.12, 0.05);
    setTimeout(() => this.playTone(1200, 'sine', 0.15, 0.05), 120);
  }
}

// Global MedLocate Application State
const appState = {
  view: 'search', // 'search' | 'results' | 'ticket'
  selectedMedicineId: 'med-06', // Norepinephrine Vascon 4mg as default high-impact example
  selectedRadius: 5, // 3, 5, 10
  userLocation: { ...MEDLOCATE_DATA.userLocation },
  searchQuery: '',
  isScanning: false,
  scanProgress: 0,
  ocrVerified: true,
  isBroadcasting: false,
  broadcastCountdown: 3,
  viewMode: 'list', // 'list' | 'map'
  filterOnlyAvailable: false,
  sortBy: 'distance', // 'distance' | 'price'
  pharmacies: JSON.parse(JSON.stringify(MEDLOCATE_DATA.pharmacies)),
  reservation: null, // { pharmacyId, medicineId, bookingCode, timerSeconds, startTime }
  timerInterval: null,
  activeSampleRxIndex: 1,
  pharmacistSimulatorOpen: false,
  rxModalOpen: false,
  sound: new SoundFX(),
  simulatedPharmacistResponses: {}
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  renderApp();
  setupKeyboardShortcuts();
});

function getActiveMedicine() {
  return MEDLOCATE_DATA.medicines.find(m => m.id === appState.selectedMedicineId) || MEDLOCATE_DATA.medicines[0];
}

function getSelectedPharmacy(pharmId) {
  return appState.pharmacies.find(p => p.id === pharmId);
}

// Navigation & Actions
function setView(viewName) {
  appState.view = viewName;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderApp();
}

function selectMedicine(medId) {
  appState.selectedMedicineId = medId;
  const med = getActiveMedicine();
  appState.searchQuery = med.name;
  appState.ocrVerified = true;
  appState.sound.playTone(600, 'sine', 0.08);
  renderApp();
}

function setRadius(radiusKm) {
  appState.selectedRadius = radiusKm;
  appState.sound.playTone(700, 'sine', 0.06);
  renderApp();
}

function toggleSound() {
  appState.sound.enabled = !appState.sound.enabled;
  if (appState.sound.enabled) {
    appState.sound.init();
    appState.sound.playTone(800, 'sine', 0.12);
  }
  renderApp();
}

function togglePharmacistSimulator(forceOpen = null) {
  if (forceOpen !== null) {
    appState.pharmacistSimulatorOpen = forceOpen;
  } else {
    appState.pharmacistSimulatorOpen = !appState.pharmacistSimulatorOpen;
  }
  if (appState.pharmacistSimulatorOpen) {
    appState.sound.pharmacistAlert();
  }
  renderApp();
}

function toggleRxModal(forceOpen = null) {
  if (forceOpen !== null) {
    appState.rxModalOpen = forceOpen;
  } else {
    appState.rxModalOpen = !appState.rxModalOpen;
  }
  renderApp();
}

function simulateScanPrescription() {
  appState.isScanning = true;
  appState.scanProgress = 20;
  appState.sound.laserScan();
  renderApp();

  const interval = setInterval(() => {
    appState.scanProgress += 30;
    if (appState.scanProgress >= 100) {
      clearInterval(interval);
      appState.isScanning = false;
      appState.ocrVerified = true;
      appState.sound.stockLocked();
      renderApp();
    } else {
      renderApp();
    }
  }, 350);
}

function selectSampleRx(index) {
  appState.activeSampleRxIndex = index;
  const targetMed = MEDLOCATE_DATA.medicines[index % MEDLOCATE_DATA.medicines.length];
  appState.selectedMedicineId = targetMed.id;
  appState.searchQuery = targetMed.name;
  appState.rxModalOpen = false;
  simulateScanPrescription();
}

function handleCustomFileUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const med = getActiveMedicine();
    med.sampleRxImage = dataUrl;
    simulateScanPrescription();
    showToast(`Resep "${file.name}" berhasil diunggah.`);
  };
  reader.readAsDataURL(file);
}

function extendReservationTime(minutesToAdd = 15) {
  if (appState.reservation && appState.reservation.status === 'ACTIVE') {
    appState.reservation.remainingSeconds += minutesToAdd * 60;
    appState.reservation.totalSeconds += minutesToAdd * 60;
    appState.sound.stockLocked();
    updateTimerDisplay();
    showToast(`Waktu kuncian diperpanjang +${minutesToAdd} menit.`);
  }
}

function startBroadcastSearch() {
  appState.sound.init();
  appState.isBroadcasting = true;
  appState.broadcastCountdown = 3;
  appState.sound.radarPing();
  renderApp();

  const pingTimer = setInterval(() => {
    appState.broadcastCountdown -= 1;
    appState.sound.radarPing();
    if (appState.broadcastCountdown <= 0) {
      clearInterval(pingTimer);
      appState.isBroadcasting = false;
      appState.view = 'results';
      renderApp();
    } else {
      renderApp();
    }
  }, 850);
}

function lockStock(pharmacyId) {
  const pharm = getSelectedPharmacy(pharmacyId);
  const med = getActiveMedicine();
  if (!pharm) return;

  const bookingCode = `ML-${Math.floor(1000 + Math.random() * 9000)}-RES`;
  const rxToken = `RX-${Math.floor(100000 + Math.random() * 900000)}`;

  appState.reservation = {
    pharmacyId,
    pharmacy: pharm,
    medicine: med,
    bookingCode,
    rxToken,
    startTime: Date.now(),
    totalSeconds: 45 * 60,
    remainingSeconds: 45 * 60,
    status: 'ACTIVE'
  };

  if (appState.timerInterval) clearInterval(appState.timerInterval);

  appState.timerInterval = setInterval(() => {
    if (appState.reservation && appState.reservation.status === 'ACTIVE') {
      appState.reservation.remainingSeconds -= 1;
      if (appState.reservation.remainingSeconds <= 0) {
        clearInterval(appState.timerInterval);
        appState.reservation.status = 'EXPIRED';
      }
      updateTimerDisplay();
    }
  }, 1000);

  appState.sound.stockLocked();
  appState.view = 'ticket';
  renderApp();
}

function cancelReservation() {
  if (confirm("Batalkan kuncian stok ini? Stok obat akan dilepaskan untuk pasien lain.")) {
    if (appState.timerInterval) clearInterval(appState.timerInterval);
    appState.reservation = null;
    appState.view = 'results';
    appState.sound.playTone(350, 'sine', 0.15);
    renderApp();
  }
}

function markArrivedAtPharmacy() {
  if (appState.reservation) {
    appState.reservation.status = 'ARRIVED';
    appState.sound.stockLocked();
    renderApp();
    alert(`Anda telah tiba di apotek. Tunjukkan Kode Booking: ${appState.reservation.bookingCode} di kasir.`);
  }
}

function pharmacistConfirmStock(pharmacyId, newStatus) {
  const pharm = getSelectedPharmacy(pharmacyId);
  const med = getActiveMedicine();
  if (!pharm || !med) return;

  if (!pharm.supportedMedicines[med.id]) {
    pharm.supportedMedicines[med.id] = {};
  }

  pharm.supportedMedicines[med.id].status = newStatus;
  pharm.supportedMedicines[med.id].responseTime = "Baru saja dikonfirmasi";
  if (newStatus === 'available') {
    pharm.supportedMedicines[med.id].stockQty = Math.max(1, pharm.supportedMedicines[med.id].stockQty || 2);
  }

  appState.sound.pharmacistAlert();
  renderApp();

  const label = newStatus === 'available' ? 'ADA (Tersedia)' : newStatus === 'generic_only' ? 'Opsi Generik' : 'Stok Habis';
  showToast(`${pharm.name}: Status diubah jadi "${label}"`);
}

function showToast(message) {
  const existing = document.getElementById('medlocate-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'medlocate-toast';
  toast.className = 'fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center space-x-2 text-xs font-medium border border-slate-700 animate-fadeIn';
  toast.innerHTML = `
    <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    if (toast) toast.remove();
  }, 3000);
}

function updateTimerDisplay() {
  const timerEl = document.getElementById('countdown-digits');
  if (!timerEl || !appState.reservation) return;

  const remaining = Math.max(0, appState.reservation.remainingSeconds);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (appState.rxModalOpen) toggleRxModal(false);
      if (appState.pharmacistSimulatorOpen) togglePharmacistSimulator(false);
    }
  });
}

function handleSearchInputChange(val) {
  appState.searchQuery = val;
  const match = MEDLOCATE_DATA.medicines.find(m => m.name.toLowerCase().includes(val.toLowerCase()));
  if (match) {
    appState.selectedMedicineId = match.id;
  }
}

// ----------------- RENDER ROOT -----------------

function renderApp() {
  const root = document.getElementById('app');
  if (!root) return;

  root.innerHTML = `
    <div class="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      ${renderNavbar()}
      ${renderLocationNoticeBanner()}

      <main class="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:px-6">
        ${renderCurrentView()}
      </main>

      ${renderFooter()}
      ${renderPharmacistDrawer()}
      ${renderBroadcastOverlay()}
      ${renderRxModal()}
    </div>
  `;

  if (appState.view === 'ticket') {
    updateTimerDisplay();
  }
}

// ----------------- NAVBAR & LOCATION -----------------

function renderNavbar() {
  return `
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        
        <!-- Logo -->
        <div class="flex items-center space-x-2.5 cursor-pointer" onclick="setView('search')">
          <div class="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div class="flex items-baseline space-x-1.5">
            <span class="text-lg font-bold tracking-tight text-slate-900">Med<span class="text-emerald-600">Locate</span></span>
            <span class="text-[10px] uppercase font-bold text-slate-400 hidden sm:inline">Darurat</span>
          </div>
        </div>

        <!-- Clean Navigation Tabs -->
        <nav class="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
          <button 
            onclick="setView('search')" 
            class="px-3 py-1.5 rounded-lg transition-all ${appState.view === 'search' ? 'bg-white text-slate-900 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
          >
            Cari Obat
          </button>
          <button 
            onclick="setView('results')" 
            class="px-3 py-1.5 rounded-lg transition-all ${appState.view === 'results' ? 'bg-white text-slate-900 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
          >
            Apotek Sekitar
          </button>
          <button 
            onclick="if(appState.reservation) setView('ticket'); else alert('Silakan kunci stok obat di salah satu apotek terlebih dahulu.');" 
            class="px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1 ${appState.view === 'ticket' ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
          >
            <span>Tiket</span>
            ${appState.reservation ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>' : ''}
          </button>
        </nav>

        <!-- Right Side Controls -->
        <div class="flex items-center space-x-2">
          <!-- Audio Toggle -->
          <button 
            onclick="toggleSound()" 
            title="${appState.sound.enabled ? 'Mute Suara' : 'Aktifkan Suara'}" 
            class="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ${appState.sound.enabled 
              ? `<svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>` 
              : `<svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>`}
          </button>

          <!-- Pharmacist Simulator Modal Trigger -->
          <button 
            onclick="togglePharmacistSimulator()" 
            class="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span class="hidden sm:inline">Simulasi</span><span>Apoteker</span>
          </button>
        </div>

      </div>
    </header>
  `;
}

function renderLocationNoticeBanner() {
  return `
    <div class="bg-slate-100/80 border-b border-slate-200/80 px-4 py-2 text-xs text-slate-600">
      <div class="max-w-4xl mx-auto flex items-center justify-between">
        <div class="flex items-center space-x-1.5">
          <svg class="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="text-slate-500">Lokasi Anda:</span>
          <span class="font-semibold text-slate-800">${appState.userLocation.label}</span>
        </div>
        <span class="hidden sm:inline text-[11px] text-slate-400">
          Kamus Resmi KFA Kemenkes • Bebas Biaya Layanan
        </span>
      </div>
    </div>
  `;
}

function renderCurrentView() {
  if (appState.view === 'search') {
    return renderSearchView();
  } else if (appState.view === 'results') {
    return renderResultsView();
  } else if (appState.view === 'ticket') {
    return renderTicketView();
  }
  return renderSearchView();
}

// ----------------- VIEW 1: SEARCH & PRESCRIPTION (CLEAN & SIMPLE) -----------------

function renderSearchView() {
  const currentMed = getActiveMedicine();

  return `
    <div class="space-y-6 animate-fadeIn">
      
      <!-- Clean Header -->
      <div class="text-center max-w-xl mx-auto space-y-1.5 pt-2">
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
          Cari & Kunci Stok Obat Darurat
        </h1>
        <p class="text-sm text-slate-500">
          Cek ketersediaan obat kritis di apotek terdekat dan amankan stok selama 45 menit.
        </p>
      </div>

      <!-- Main Action Card -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5 shadow-sm">
        
        <!-- Search Input -->
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-600">
            Nama Obat Resep
          </label>
          <div class="relative flex items-center">
            <svg class="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              value="${currentMed.name}" 
              placeholder="Ketik nama obat darurat..."
              oninput="handleSearchInputChange(this.value)"
              class="w-full pl-10 pr-28 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
            <button 
              onclick="document.getElementById('rx-custom-file-input').click()" 
              class="absolute right-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center space-x-1 transition-colors"
            >
              <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Unggah Resep</span>
            </button>
            <input type="file" id="rx-custom-file-input" class="hidden" accept="image/*" onchange="handleCustomFileUpload(event)" />
          </div>
        </div>

        <!-- Quick Select Pills -->
        <div class="space-y-1.5">
          <span class="text-xs text-slate-500">Pilihan Cepat Obat Darurat:</span>
          <div class="flex flex-wrap gap-1.5">
            ${MEDLOCATE_DATA.medicines.map(m => `
              <button 
                onclick="selectMedicine('${m.id}')"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1 ${
                  m.id === appState.selectedMedicineId 
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }"
              >
                <span>${m.name.split(' ')[0]} ${m.name.split(' ')[1] || ''}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Clean Prescription & OCR Summary Card -->
        <div class="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3.5">
          
          <!-- Card Header & Sample Switcher -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span class="font-bold text-slate-700 flex items-center">
              <svg class="w-4 h-4 text-emerald-600 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Verifikasi Resep Dokter & Ekstraksi AI
            </span>

            <div class="flex items-center space-x-2 text-[11px]">
              <button onclick="toggleRxModal(true)" class="text-slate-600 hover:text-slate-900 font-medium underline flex items-center space-x-1">
                <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                <span>Perbesar Resep</span>
              </button>
              <span class="text-slate-300">•</span>
              <button onclick="simulateScanPrescription()" class="text-emerald-700 hover:underline font-bold">
                Pindai Ulang
              </button>
            </div>
          </div>

          <!-- Quick Sample Prescription Buttons -->
          <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
            <span class="text-slate-400 text-[11px] whitespace-nowrap">Contoh Resep:</span>
            ${MEDLOCATE_DATA.medicines.map((m, idx) => `
              <button 
                onclick="selectSampleRx(${idx})"
                class="px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap transition-colors flex items-center space-x-1 ${
                  m.id === appState.selectedMedicineId 
                    ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }"
              >
                ${m.id === 'med-06' || m.id === 'med-07' ? '<span>⭐</span>' : ''}
                <span>${m.name.split(' ')[0]}</span>
                <span class="text-[9px] text-slate-400">(${m.tags[0]})</span>
              </button>
            `).join('')}
          </div>

          <!-- Prescription Preview & Extracted OCR Details -->
          <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            
            <!-- Prescription Preview Thumbnail (Clickable to Zoom) -->
            <div 
              onclick="toggleRxModal(true)" 
              class="sm:col-span-4 relative bg-white border border-slate-200 hover:border-emerald-500 rounded-lg overflow-hidden h-32 flex items-center justify-center cursor-pointer group shadow-sm transition-all"
              title="Klik untuk memperbesar lembar resep dokter"
            >
              ${appState.isScanning ? `<div class="laser-line"></div>` : ''}
              
              <img 
                src="${currentMed.sampleRxImage}" 
                alt="Lembar Resep Dokter Asli" 
                class="w-full h-full object-contain p-1 transition-opacity ${appState.isScanning ? 'opacity-50' : 'opacity-100'}"
              />
              
              <!-- Hover hint overlay -->
              <div class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                🔍 Klik Perbesar Resep
              </div>

              <span class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-900/80 text-white">
                Resep Dokter (KOP & SIP)
              </span>
            </div>

            <!-- Extracted Metadata -->
            <div class="sm:col-span-8 space-y-1.5 text-xs">
              <div class="bg-white rounded-lg p-2.5 border border-slate-200 space-y-1">
                <div class="flex justify-between">
                  <span class="text-slate-500">Obat Terdeteksi:</span>
                  <span class="font-bold text-slate-900">${currentMed.name}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Kode KFA Kemenkes:</span>
                  <span class="font-mono text-emerald-700 font-semibold">${currentMed.kfaCode}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Aturan Dosis:</span>
                  <span class="text-slate-800 text-right">${currentMed.standardDose}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Penyimpanan:</span>
                  <span class="text-slate-600">${currentMed.storageCondition}</span>
                </div>
              </div>

              ${currentMed.genericAvailable ? `
                <div class="px-2.5 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-[11px] text-teal-800 flex items-center space-x-1.5">
                  <span class="font-bold">💡 Opsi Generik Kemenkes:</span>
                  <span>${currentMed.genericName} (${currentMed.genericPrice})</span>
                </div>
              ` : `
                <div class="px-2.5 py-1.5 rounded-lg bg-slate-100 text-[11px] text-slate-600 flex items-center space-x-1.5">
                  <span class="font-bold">ℹ️ Info Farmasi:</span>
                  <span>Formula spesifik, prioritas distributor resmi.</span>
                </div>
              `}
            </div>
          </div>
        </div>

        <!-- Radius Selector & Primary Search Button -->
        <div class="space-y-4 pt-1">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="flex items-center space-x-2">
              <span class="text-xs text-slate-600 font-medium">Radius Pencarian:</span>
              <div class="inline-flex bg-slate-100 p-0.5 rounded-lg space-x-0.5 border border-slate-200">
                ${[3, 5, 10].map(r => `
                  <button 
                    onclick="setRadius(${r})"
                    class="px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      appState.selectedRadius === r
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }"
                  >
                    ${r} KM
                  </button>
                `).join('')}
              </div>
            </div>
            <span class="text-xs text-slate-500">
              Menjangkau <strong>${appState.selectedRadius === 3 ? '8' : appState.selectedRadius === 5 ? '15' : '28'} apotek</strong> di sekitar
            </span>
          </div>

          <!-- Primary Button -->
          <button 
            onclick="startBroadcastSearch()"
            class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>Cari Stok di Apotek Terdekat</span>
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>

      </div>

      <!-- Clean 3-Item Trust Bar -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 pt-1">
        <div class="flex items-center space-x-2 bg-white p-3 rounded-xl border border-slate-200">
          <span class="text-base">🔒</span>
          <div>
            <div class="font-bold text-slate-800">Kunci Stok 45 Menit</div>
            <div class="text-[11px] text-slate-500">Stok disimpan khusus saat perjalanan</div>
          </div>
        </div>
        <div class="flex items-center space-x-2 bg-white p-3 rounded-xl border border-slate-200">
          <span class="text-base">🏷️</span>
          <div>
            <div class="font-bold text-slate-800">Sesuai HET Resmi</div>
            <div class="text-[11px] text-slate-500">Harga resmi pemerintah Kemenkes</div>
          </div>
        </div>
        <div class="flex items-center space-x-2 bg-white p-3 rounded-xl border border-slate-200">
          <span class="text-base">⚡</span>
          <div>
            <div class="font-bold text-slate-800">Respon Instan Zero-POS</div>
            <div class="text-[11px] text-slate-500">Apoteker menjawab langsung via sistem</div>
          </div>
        </div>
      </div>

    </div>
  `;
}

// ----------------- VIEW 2: RESULTS (CLEAN LIST & RADAR) -----------------

function renderResultsView() {
  const currentMed = getActiveMedicine();

  // Filter pharmacies within radius
  const filteredPharmacies = appState.pharmacies.filter(p => {
    if (p.distanceKm > appState.selectedRadius) return false;
    if (appState.filterOnlyAvailable) {
      const stock = p.supportedMedicines[currentMed.id];
      return stock && (stock.status === 'available' || stock.status === 'generic_only');
    }
    return true;
  });

  // Sort pharmacies
  filteredPharmacies.sort((a, b) => {
    if (appState.sortBy === 'price') {
      const pA = parseInt((a.supportedMedicines[currentMed.id]?.price || '').replace(/[^0-9]/g, '')) || 999999999;
      const pB = parseInt((b.supportedMedicines[currentMed.id]?.price || '').replace(/[^0-9]/g, '')) || 999999999;
      return pA - pB;
    }
    return a.distanceKm - b.distanceKm;
  });

  const availableCount = filteredPharmacies.filter(p => {
    const s = p.supportedMedicines[currentMed.id]?.status;
    return s === 'available' || s === 'generic_only';
  }).length;

  return `
    <div class="space-y-4 animate-fadeIn">
      
      <!-- Top Control Bar -->
      <div class="bg-white rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="flex items-center space-x-2">
            <span class="text-xs text-slate-500">Mencari:</span>
            <span class="font-bold text-slate-900 text-sm">${currentMed.name}</span>
            <span class="text-xs text-slate-400 font-mono">(${appState.selectedRadius} KM)</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">
            Ditemukan <strong>${availableCount} apotek</strong> dengan stok siap dipesan
          </p>
        </div>

        <div class="flex items-center space-x-2">
          <button 
            onclick="setView('search')" 
            class="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            ← Ganti Obat
          </button>

          <!-- Toggle View Mode -->
          <div class="bg-slate-100 p-0.5 rounded-lg flex items-center space-x-0.5 border border-slate-200 text-xs">
            <button 
              onclick="appState.viewMode = 'list'; renderApp();" 
              class="px-2.5 py-1 rounded-md font-semibold transition-all ${appState.viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'}"
            >
              Daftar
            </button>
            <button 
              onclick="appState.viewMode = 'map'; renderApp();" 
              class="px-2.5 py-1 rounded-md font-semibold transition-all ${appState.viewMode === 'map' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'}"
            >
              Peta Radar
            </button>
          </div>
        </div>
      </div>

      <!-- Filters & Sort -->
      <div class="flex items-center justify-between text-xs px-1 text-slate-600">
        <label class="flex items-center space-x-2 cursor-pointer font-medium">
          <input 
            type="checkbox" 
            ${appState.filterOnlyAvailable ? 'checked' : ''} 
            onchange="appState.filterOnlyAvailable = this.checked; renderApp();"
            class="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 border-slate-300"
          />
          <span>Hanya yang ada stok</span>
        </label>

        <div class="flex items-center space-x-1.5">
          <span class="text-slate-400">Urutkan:</span>
          <select 
            onchange="appState.sortBy = this.value; renderApp();" 
            class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="distance" ${appState.sortBy === 'distance' ? 'selected' : ''}>Jarak Terdekat</option>
            <option value="price" ${appState.sortBy === 'price' ? 'selected' : ''}>Harga Terendah</option>
          </select>
        </div>
      </div>

      <!-- List or Map Display -->
      ${appState.viewMode === 'list' ? renderPharmacyList(filteredPharmacies, currentMed) : renderPharmacyRadarMap(filteredPharmacies, currentMed)}

    </div>
  `;
}

function renderPharmacyList(pharmacies, currentMed) {
  if (pharmacies.length === 0) {
    return `
      <div class="bg-white rounded-xl p-8 text-center border border-slate-200 space-y-2">
        <div class="text-2xl">🔍</div>
        <h3 class="text-sm font-bold text-slate-900">Tidak Ada Apotek yang Sesuai</h3>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">
          Coba matikan filter atau perluas radius pencarian.
        </p>
        <button onclick="setRadius(10); appState.filterOnlyAvailable = false; renderApp();" class="mt-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700">
          Perluas Radius ke 10 KM
        </button>
      </div>
    `;
  }

  return `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      ${pharmacies.map(pharm => {
        const stockInfo = pharm.supportedMedicines[currentMed.id] || { status: 'out_of_stock', stockQty: 0, price: 'Hubungi Apotek' };
        const isAvailable = stockInfo.status === 'available';
        const isGenericOnly = stockInfo.status === 'generic_only';
        const isPending = stockInfo.status === 'pending';

        return `
          <div class="bg-white rounded-xl border ${isAvailable ? 'border-emerald-300 ring-1 ring-emerald-400/20' : 'border-slate-200'} p-4 flex flex-col justify-between space-y-3 shadow-sm hover:border-slate-300 transition-colors">
            
            <!-- Header: Name & Distance -->
            <div class="space-y-1">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h3 class="text-sm font-bold text-slate-900">
                    ${pharm.name}
                  </h3>
                  <p class="text-xs text-slate-500 line-clamp-1">${pharm.address}</p>
                </div>
                <div class="text-right flex-shrink-0">
                  <span class="inline-block px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
                    ${pharm.distanceText}
                  </span>
                  <div class="text-[10px] text-slate-400 mt-0.5">${pharm.travelTimeText}</div>
                </div>
              </div>
            </div>

            <!-- Status & Price Box -->
            <div class="rounded-lg p-2.5 ${
              isAvailable 
                ? 'bg-emerald-50/70 border border-emerald-200 text-emerald-950' 
                : isGenericOnly 
                  ? 'bg-teal-50/70 border border-teal-200 text-teal-950' 
                  : isPending 
                    ? 'bg-amber-50/70 border border-amber-200 text-amber-950' 
                    : 'bg-slate-50 border border-slate-200 text-slate-600'
            }">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold flex items-center">
                  ${isAvailable ? `
                    <span class="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                    Stok Ada (${stockInfo.stockQty} unit)
                  ` : isGenericOnly ? `
                    <span class="w-2 h-2 rounded-full bg-teal-500 mr-1.5"></span>
                    Tersedia Opsi Generik
                  ` : isPending ? `
                    <span class="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>
                    Mengecek Fisik Rak...
                  ` : `
                    <span class="w-2 h-2 rounded-full bg-slate-400 mr-1.5"></span>
                    Stok Habis
                  `}
                </span>
                <span class="font-black text-slate-900">${stockInfo.price || currentMed.hetPrice}</span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center space-x-2 pt-0.5">
              ${(isAvailable || isGenericOnly) ? `
                <button 
                  onclick="lockStock('${pharm.id}')"
                  class="flex-1 py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wide transition-all shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Kunci Stok (45 Menit)</span>
                </button>
              ` : isPending ? `
                <button 
                  onclick="togglePharmacistSimulator(true)"
                  class="flex-1 py-2.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs tracking-wide transition-all shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <span>Simulasikan Respon</span>
                </button>
              ` : `
                <button 
                  disabled
                  class="flex-1 py-2.5 px-3 rounded-lg bg-slate-100 text-slate-400 font-medium text-xs tracking-wide cursor-not-allowed text-center"
                >
                  Stok Habis
                </button>
              `}

              <!-- WhatsApp Quick Inquire -->
              <a 
                href="https://wa.me/${pharm.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo ${pharm.name}, saya keluarga pasien dari RSUD Dr. Soetomo mencari obat ${currentMed.name}. Apakah stok tersedia?`)}" 
                target="_blank" 
                class="p-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                title="Chat WhatsApp Apotek"
              >
                <svg class="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                </svg>
              </a>
            </div>

          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderPharmacyRadarMap(pharmacies, currentMed) {
  return `
    <div class="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div class="flex items-center justify-between text-xs">
        <span class="font-bold text-slate-800">Visualisasi Radar Sekitar</span>
        <div class="flex items-center space-x-3 text-[11px] text-slate-500">
          <span class="flex items-center"><span class="w-2 h-2 rounded-full bg-blue-600 mr-1"></span> Lokasi Anda</span>
          <span class="flex items-center"><span class="w-2 h-2 rounded-full bg-emerald-500 mr-1"></span> Stok Ada</span>
          <span class="flex items-center"><span class="w-2 h-2 rounded-full bg-slate-400 mr-1"></span> Habis</span>
        </div>
      </div>

      <!-- Radar Canvas Container -->
      <div class="relative w-full h-[380px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
        
        <!-- Subtle Circles -->
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="w-[100px] h-[100px] rounded-full border border-emerald-500/20"></div>
          <div class="w-[200px] h-[200px] rounded-full border border-emerald-500/20 absolute"></div>
          <div class="w-[300px] h-[300px] rounded-full border border-emerald-500/15 absolute"></div>
          <div class="w-full h-px bg-emerald-500/10 absolute"></div>
          <div class="h-full w-px bg-emerald-500/10 absolute"></div>
        </div>

        <!-- Center Marker: Patient -->
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none">
          <div class="w-5 h-5 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white text-[9px] shadow">
            🏥
          </div>
          <div class="mt-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-blue-300 text-[9px] font-semibold">
            Anda
          </div>
        </div>

        <!-- Pharmacy Pins -->
        ${pharmacies.map((pharm, idx) => {
          const stock = pharm.supportedMedicines[currentMed.id] || { status: 'out_of_stock' };
          const isAvail = stock.status === 'available' || stock.status === 'generic_only';
          const isPend = stock.status === 'pending';
          
          const angle = (idx * (360 / pharmacies.length) + 30) * (Math.PI / 180);
          const radiusNorm = 35 + (pharm.distanceKm / 5) * 95;
          const leftPercent = 50 + (Math.cos(angle) * radiusNorm * 0.7);
          const topPercent = 50 + (Math.sin(angle) * radiusNorm * 0.65);

          return `
            <div 
              style="left: ${leftPercent}%; top: ${topPercent}%;" 
              class="absolute -translate-x-1/2 -translate-y-1/2 z-30 group cursor-pointer"
              onclick="if('${isAvail}' === 'true') lockStock('${pharm.id}'); else alert('${pharm.name}: ${isPend ? 'Sedang cek fisik' : 'Stok habis'}');"
            >
              <div class="w-6 h-6 rounded-full ${isAvail ? 'bg-emerald-500' : isPend ? 'bg-amber-500' : 'bg-slate-500'} border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow transition-transform group-hover:scale-125">
                ${idx + 1}
              </div>

              <!-- Tooltip on hover -->
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-44 bg-slate-900 text-white p-2.5 rounded-lg border border-slate-700 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-40 text-left">
                <div class="text-xs font-bold">${pharm.name}</div>
                <div class="text-[10px] text-slate-300">${pharm.distanceText} • ${stock.price || currentMed.hetPrice}</div>
                <div class="text-[10px] mt-1 font-semibold ${isAvail ? 'text-emerald-400' : 'text-slate-400'}">
                  ${isAvail ? '● Stok Ada (Klik Kunci)' : '● Habis'}
                </div>
              </div>
            </div>
          `;
        }).join('')}

        <div class="absolute bottom-2.5 left-2.5 bg-slate-950/80 px-2 py-1 rounded text-[10px] text-slate-400">
          Radius: ${appState.selectedRadius} KM
        </div>
      </div>
    </div>
  `;
}

// ----------------- VIEW 3: RESERVATION TICKET (CLEAN PASS) -----------------

function renderTicketView() {
  const res = appState.reservation;
  if (!res) {
    return `
      <div class="text-center py-12 space-y-3">
        <h2 class="text-base font-bold text-slate-900">Belum Ada Reservasi Aktif</h2>
        <button onclick="setView('search')" class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold">
          Cari Obat Darurat
        </button>
      </div>
    `;
  }

  const pharm = res.pharmacy;
  const med = res.medicine;
  const stock = pharm.supportedMedicines[med.id] || {};
  const isArrived = res.status === 'ARRIVED';

  return `
    <div class="max-w-xl mx-auto space-y-4 animate-fadeIn pb-6">
      
      <!-- Confirmation Banner -->
      <div class="bg-emerald-600 text-white rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <div class="text-sm font-bold">
              ${isArrived ? 'Pasien Sudah Tiba di Lokasi' : 'Stok Obat Berhasil Dikunci!'}
            </div>
            <p class="text-xs text-emerald-100">
              ${isArrived ? 'Silakan temui apoteker di kasir.' : 'Stok disimpan khusus di kasir apotek atas nama Anda.'}
            </p>
          </div>
        </div>

        <button onclick="setView('results')" class="text-xs text-emerald-100 hover:text-white underline">
          Daftar Apotek
        </button>
      </div>

      <!-- Digital Pass Card -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        
        <!-- Countdown Timer Row -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Waktu Kuncian Tersisa:</span>
            <div class="text-2xl font-black font-mono tracking-tight text-slate-900 mt-0.5" id="countdown-digits">
              44:59
            </div>
            <p class="text-xs text-slate-500">Waktu aman menuju apotek</p>
          </div>

          ${!isArrived ? `
            <button 
              onclick="extendReservationTime(15)" 
              class="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
            >
              +15 Mnt (Macet)
            </button>
          ` : `
            <span class="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              Tiba di Lokasi
            </span>
          `}
        </div>

        <!-- Booking Code & QR Code -->
        <div class="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between gap-4">
          <div class="space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kode Booking Kasir</span>
            <div class="text-xl font-black tracking-tight text-emerald-700 font-mono">
              ${res.bookingCode}
            </div>
            <button 
              onclick="navigator.clipboard.writeText('${res.bookingCode}'); alert('Kode booking disalin: ${res.bookingCode}');" 
              class="text-[11px] text-slate-600 hover:text-slate-900 underline font-medium"
            >
              Salin Kode
            </button>
          </div>

          <!-- QR Code Preview -->
          <div class="w-16 h-16 bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex-shrink-0">
            <svg viewBox="0 0 100 100" class="w-full h-full text-slate-800">
              <path fill="currentColor" d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z M40,10 h20 v10 h-20 z M10,40 h10 v20 h-10 z M40,40 h20 v20 h-20 z M70,40 h10 v10 h-10 z M40,70 h10 v20 h-10 z M60,60 h30 v10 h-30 z M70,80 h20 v20 h-20 z"/>
            </svg>
          </div>
        </div>

        <!-- Drug & Pharmacy Details -->
        <div class="space-y-3 text-xs">
          <div class="flex justify-between pb-2 border-b border-slate-100">
            <span class="text-slate-500">Obat:</span>
            <span class="font-bold text-slate-900 text-right">${med.name}</span>
          </div>
          <div class="flex justify-between pb-2 border-b border-slate-100">
            <span class="text-slate-500">Apotek Tujuan:</span>
            <span class="font-bold text-slate-900 text-right">${pharm.name}</span>
          </div>
          <div class="flex justify-between pb-2 border-b border-slate-100">
            <span class="text-slate-500">Alamat:</span>
            <span class="text-slate-700 text-right max-w-xs">${pharm.address}</span>
          </div>
          <div class="flex justify-between pb-2 border-b border-slate-100">
            <span class="text-slate-500">Total Biaya di Apotek:</span>
            <span class="font-black text-slate-900 text-sm">${stock.price || med.hetPrice}</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-2 pt-1">
          <!-- Google Maps Button -->
          <a 
            href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pharm.name + ' ' + pharm.address)}" 
            target="_blank"
            class="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wide transition-all shadow-sm flex items-center justify-center space-x-2"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Buka Petunjuk Arah (Google Maps)</span>
          </a>

          <div class="grid grid-cols-2 gap-2">
            <!-- WhatsApp Chat -->
            <a 
              href="https://wa.me/${pharm.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo ${pharm.name}, saya pemegang Kode Booking: ${res.bookingCode} untuk obat ${med.name}. Saya sedang menuju apotek.`)}"
              target="_blank"
              class="py-2.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors"
            >
              <span>Chat WhatsApp</span>
            </a>

            <!-- Check In Button -->
            ${!isArrived ? `
              <button 
                onclick="markArrivedAtPharmacy()"
                class="py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
              >
                Saya Sudah Tiba
              </button>
            ` : `
              <div class="py-2.5 px-3 rounded-lg bg-emerald-50 text-emerald-800 font-semibold text-xs text-center border border-emerald-200">
                Terkonfirmasi Tiba
              </div>
            `}
          </div>

          <!-- Cancel Reservation -->
          <div class="text-center pt-2">
            <button onclick="cancelReservation()" class="text-xs text-rose-600 hover:text-rose-800 font-medium underline">
              Batalkan Reservasi
            </button>
          </div>
        </div>

      </div>

    </div>
  `;
}

// ----------------- MODAL: FULL DOCTOR RECEIPT PREVIEW (ZOOM) -----------------

function renderRxModal() {
  if (!appState.rxModalOpen) return '';

  const currentMed = getActiveMedicine();

  return `
    <div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onclick="if(event.target === this) toggleRxModal(false)">
      <div class="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        <!-- Modal Header -->
        <div class="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div class="flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <div>
              <h3 class="text-sm font-bold text-slate-900">Lembar Resep Dokter Asli (Original Doctor Receipt)</h3>
              <p class="text-xs text-slate-500">${currentMed.name} • Kode ${currentMed.kfaCode}</p>
            </div>
          </div>
          <button onclick="toggleRxModal(false)" class="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <!-- Full Receipt Image Viewport -->
        <div class="p-4 sm:p-6 overflow-y-auto flex items-center justify-center bg-slate-100/60">
          <div class="bg-white rounded-xl shadow-md border border-slate-300 p-2 max-w-xl w-full">
            <img 
              src="${currentMed.sampleRxImage}" 
              alt="Lembar Resep Dokter Penuh" 
              class="w-full h-auto rounded"
            />
          </div>
        </div>

        <!-- Modal Footer Actions -->
        <div class="p-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span class="text-xs text-slate-500 text-center sm:text-left">
            KOP Resmi RSUD/IGD • SIP Dokter • Cap Cito • Diagnosa Terverifikasi
          </span>
          <div class="flex items-center space-x-2">
            <button 
              onclick="toggleRxModal(false); simulateScanPrescription();" 
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>Scan & Ekstraksi AI</span>
            </button>
            <button 
              onclick="toggleRxModal(false)" 
              class="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}

// ----------------- ZERO-POS PHARMACIST SIMULATOR DRAWER -----------------

function renderPharmacistDrawer() {
  if (!appState.pharmacistSimulatorOpen) return '';

  const currentMed = getActiveMedicine();

  return `
    <div class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end animate-fadeIn">
      <div class="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-slideLeft">
        
        <!-- Header -->
        <div class="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Simulator Respon Apoteker</h3>
            <p class="text-xs text-slate-500">Uji respon 1-klik mitra (Zero-POS)</p>
          </div>
          <button onclick="togglePharmacistSimulator(false)" class="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-4 space-y-4 flex-1 text-xs">
          
          <!-- Incoming Request Box -->
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Permintaan Obat Masuk:</span>
            <div class="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center space-x-3">
              <img src="${currentMed.sampleRxImage}" class="w-12 h-10 object-cover rounded border border-slate-200" alt="Resep" />
              <div>
                <div class="font-bold text-slate-900">${currentMed.name}</div>
                <div class="text-[11px] text-slate-500">${appState.userLocation.label}</div>
              </div>
            </div>

            <!-- Quick 1-Click Buttons for Kimia Farma Dharmahusada -->
            <div class="space-y-1.5 pt-1">
              <span class="text-[11px] font-bold text-slate-700">Simulasikan Respon:</span>
              <div class="grid grid-cols-3 gap-1.5">
                <button 
                  onclick="pharmacistConfirmStock('pharm-02', 'available')" 
                  class="py-2 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors text-center"
                >
                  Ada Stok
                </button>
                <button 
                  onclick="pharmacistConfirmStock('pharm-02', 'generic_only')" 
                  class="py-2 px-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] transition-colors text-center"
                >
                  Generik
                </button>
                <button 
                  onclick="pharmacistConfirmStock('pharm-02', 'out_of_stock')" 
                  class="py-2 px-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors text-center"
                >
                  Habis
                </button>
              </div>
            </div>
          </div>

          <!-- Pharmacy Status List -->
          <div class="space-y-1.5">
            <span class="text-[11px] font-bold text-slate-700">Status Apotek Sekitar:</span>
            <div class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              ${appState.pharmacies.slice(0, 5).map(p => {
                const curStatus = p.supportedMedicines[currentMed.id]?.status || 'out_of_stock';
                return `
                  <div class="p-2 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                    <div>
                      <div class="font-bold text-slate-900">${p.name}</div>
                      <div class="text-[10px] text-slate-500">Status: <strong class="${curStatus === 'available' ? 'text-emerald-600' : curStatus === 'generic_only' ? 'text-teal-600' : curStatus === 'pending' ? 'text-amber-600' : 'text-slate-400'}">${curStatus}</strong></div>
                    </div>
                    <div class="flex space-x-1">
                      <button onclick="pharmacistConfirmStock('${p.id}', 'available')" class="px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">Ada</button>
                      <button onclick="pharmacistConfirmStock('${p.id}', 'out_of_stock')" class="px-2 py-1 rounded bg-slate-50 text-slate-600 text-[10px] font-semibold border border-slate-200">Habis</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="p-4 bg-slate-50 border-t border-slate-200 text-right">
          <button onclick="togglePharmacistSimulator(false)" class="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold">
            Tutup
          </button>
        </div>

      </div>
    </div>
  `;
}

// ----------------- BROADCASTING OVERLAY -----------------

function renderBroadcastOverlay() {
  if (!appState.isBroadcasting) return '';

  return `
    <div class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white text-center animate-fadeIn">
      
      <!-- Minimalist Pulse -->
      <div class="relative w-24 h-24 flex items-center justify-center mb-4">
        <div class="w-24 h-24 rounded-full border border-emerald-400/40 animate-radar absolute"></div>
        <div class="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-xl shadow-lg">
          📡
        </div>
      </div>

      <div class="space-y-1 max-w-sm">
        <h2 class="text-lg font-bold text-white">
          Menghubungi Apotek Mitra...
        </h2>
        <p class="text-xs text-slate-300">
          Mencari stok <strong>${getActiveMedicine().name}</strong> dalam radius ${appState.selectedRadius} KM.
        </p>
      </div>

      <div class="mt-4 text-xs font-mono text-emerald-400">
        Respon pertama dalam ${appState.broadcastCountdown} detik...
      </div>

    </div>
  `;
}

// ----------------- FOOTER -----------------

function renderFooter() {
  return `
    <footer class="bg-white border-t border-slate-200 mt-10 py-6 text-xs text-slate-500">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div>
          <span class="font-bold text-slate-700">MedLocate Prototype</span>
          <span class="text-slate-300 mx-1.5">•</span>
          <span>Pencarian Stok Obat Darurat</span>
        </div>
        <div class="flex items-center space-x-3 text-xs">
          <button onclick="setView('search')" class="hover:text-emerald-700">Cari Obat</button>
          <button onclick="setView('results')" class="hover:text-emerald-700">Apotek Sekitar</button>
          <button onclick="togglePharmacistSimulator(true)" class="hover:text-emerald-700 text-emerald-700 font-semibold">Simulasi Apoteker</button>
        </div>
      </div>
    </footer>
  `;
}
