// Removed broken loadDashboard - functions don't exist
// async function loadDashboard() {
//     const bookingId = document.getElementById('bookingIdInput').value;
//     if (bookingId) {
//         await fetchAnimals(bookingId); // Database se janwar mangwaein
//         await fetchCostBreakdown(bookingId); // Calculations update karein
//     }
// }
// window.addEventListener('DOMContentLoaded', loadDashboard);
// ==========================================
// IJTEMAI QURBANI COST CALCULATOR
// Global Data Structure and Initialize
// ==========================================

// Startup: use the Supabase client wrapper that can fall back to stub if needed
import supabaseClient from './supabaseClient.js';

const supabaseReady = Boolean(supabaseClient);

console.log('✅ App starting up...');
console.log('Supabase ready:', supabaseReady);

// Debug logger to display console messages on the page
(function setupDebugLogger() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const debugLog = document.getElementById('debugLog');

    function addDebugLine(msg, style = 'color: #333;') {
        if (debugLog) {
            const line = document.createElement('div');
            line.style.cssText = style + 'font-size: 0.9em; line-height: 1.4;';
            line.textContent = msg;
            debugLog.appendChild(line);
            if (debugLog.children.length > 10) {
                debugLog.removeChild(debugLog.firstChild);
            }
        }
    }

    console.log = function(...args) {
        originalLog.apply(console, args);
        addDebugLine(args.join(' '), 'color: #0066cc;');
    };
    console.warn = function(...args) {
        originalWarn.apply(console, args);
        addDebugLine(args.join(' '), 'color: #ff9900;');
    };
    console.error = function(...args) {
        originalError.apply(console, args);
        addDebugLine(args.join(' '), 'color: #cc0000;');
    };
})();

console.log('script.js loaded');

// Global data object to store all calculator data
const calculatorData = {
    animals: [],
    dailyFeeds: [], // Keep for backward compatibility
    transports: [],
    rentCost: {
        total: 0,
        days: 0
    },
    medicineCosts: {}, // {animalId: cost}
    extraCosts: [], // [{description, amount, distribution, applicableTo}]
    fixedCosts: [], // [{id, description, amount}]
    animalTruckAssignment: {}, // {animalId: truckId}

    // NEW ANIMAL-DAYS FEED SYSTEM
    animalGroups: [], // [{id, animals, days, animalDays}]
    feedBatches: [], // [{id, day, quantity, rate, totalCost}]
    feedResults: [], // Store calculation results
    qurbaniDate: null
};

// Total days for the qurbani period (adjust as needed)
const TOTAL_DAYS = 30;

let currentBookingId = null;
window.currentBookingId = null;
let serviceModule = null;

async function loadSupabaseService() {
    // Lazy load the service module only when needed
    if (!serviceModule && supabaseReady) {
        try {
            serviceModule = await import('./supabaseService.js');
            console.log('✅ Supabase Service module loaded');
        } catch (error) {
            console.warn('⚠️ Service module not available:', error.message);
            serviceModule = null;
        }
    }
    return serviceModule;
}

function setLoadingState(button, isLoading, label = 'Saving...') {
    if (!button) return;
    if (isLoading) {
        button.dataset.originalText = button.textContent;
        button.textContent = label;
        button.disabled = true;
    } else {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
        }
    }
}

function getCurrentBookingId() {
    // Booking feature removed: return any previously-set booking id or null.
    if (currentBookingId) {
        window.currentBookingId = currentBookingId;
        return currentBookingId;
    }
    return null;
}

async function refreshCostBreakdown() {
    try {
        if (!supabaseReady) {
            console.warn('Supabase is not ready, cannot refresh cost breakdown.');
            return;
        }

        const service = await loadSupabaseService();
        if (!service) {
            console.warn('Supabase service module is not available.');
            return;
        }

        const bookingId = null; // Booking feature removed
        const breakdown = await service.fetchCostBreakdown(bookingId);
        displayCostBreakdown(breakdown);
        return breakdown;
    } catch (error) {
        console.error('Error refreshing cost breakdown:', error);
    }
}

async function loadBookingData(bookingId) {
    if (!bookingId) return;

    if (!supabaseReady) {
        alert('Supabase is not connected. Please refresh and try again.');
        return;
    }

    const service = await loadSupabaseService();
    if (!service) {
        alert('Could not load Supabase service module. Check the console.');
        return;
    }

    try {
        const animals = await service.fetchAnimals(bookingId);
        if (!animals || animals.length === 0) {
            console.log(`No animals found for booking ${bookingId}`);
        }

        calculatorData.animals = animals.map((animal, index) => ({
            id: animal.id ?? index + 1,
            purchasePrice: Number(animal.purchase_price) || 0,
            arrivalDay: Number(animal.arrival_day) || 1,
            arrivalDate: animal.arrival_date ? new Date(animal.arrival_date) : null,
            qurbaniDate: animal.qurbani_date ? new Date(animal.qurbani_date) : null,
            medicineCost: 0,
            truckId: null
        }));

        currentAnimalIndex = calculatorData.animals.length;
        updateAnimalGroupsFromAnimals();
        updateFixedCostsSummary();
        renderAnimalsSummary();
        await refreshCostBreakdown();

        const status = document.getElementById('bookingIdStatus');
        if (status) {
            status.textContent = `Loaded ${calculatorData.animals.length} animals for booking ${bookingId}`;
        }

        console.log('✅ Booking data loaded from Supabase:', calculatorData.animals);
    } catch (error) {
        console.error('Error loading booking data:', error);
        alert('Unable to import booking data. See console for details.');
    }
}

function displayCostBreakdown(breakdown) {
    const container = document.getElementById('resultsContainer');
    if (!container) return;

    if (!breakdown || !breakdown.animals) {
        container.innerHTML = '<p>No cost breakdown available.</p>';
        return;
    }

    const animalRows = breakdown.animals.map((item) => {
        return `
            <div class="animal-result">
                <h4>Animal #${item.animal.id}</h4>
                <div><strong>Feed Cost:</strong> Rs. ${item.feedCost.toFixed(2)}</div>
                <div><strong>Transport Cost:</strong> Rs. ${item.transportCost.toFixed(2)}</div>
                <div><strong>Rent Cost:</strong> Rs. ${item.rentCost.toFixed(2)}</div>
                <div><strong>Medicine Cost:</strong> Rs. ${item.medicineCost.toFixed(2)}</div>
                <div><strong>Fixed Cost Share:</strong> Rs. ${item.fixedCostShare.toFixed(2)}</div>
                <div><strong>Extra Cost:</strong> Rs. ${item.extraCost.toFixed(2)}</div>
                <div><strong>Total Cost:</strong> Rs. ${item.totalCost.toFixed(2)}</div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="results-summary">
            <h3>Cost Breakdown</h3>
            <p><strong>Grand Total:</strong> Rs. ${breakdown.grandTotal.toFixed(2)}</p>
            <p><strong>Fixed Cost Per Animal:</strong> Rs. ${breakdown.totalFixedCostPerAnimal.toFixed(2)}</p>
        </div>
        ${animalRows}
    `;
}

async function setBookingId() {
    const bookingInput = document.getElementById('bookingIdInput');
    if (!bookingInput || !bookingInput.value) {
        alert('براہ کرم Booking ID درج کریں (Please enter Booking ID)');
        return;
    }

    const value = parseInt(bookingInput.value, 10);
    if (!value || value <= 0) {
        alert('براہ کرم درست Booking ID درج کریں (Please enter a valid Booking ID)');
        return;
    }

    currentBookingId = value;
    window.currentBookingId = currentBookingId;
    const status = document.getElementById('bookingIdStatus');
    if (status) {
        status.textContent = `Current booking set: ${currentBookingId} (loading data...)`;
    }

    await loadBookingData(currentBookingId);
    alert(`Booking ID set to ${currentBookingId}`);
}

/**
 * Initialize Supabase client for the website.
 */
function initSupabaseClient() {
    if (!supabaseClient) {
        console.warn('⚠️ Supabase client not initialized yet');
        return;
    }

    // supabase client already initialized via stub; no assignment needed
    console.log('✅ Supabase client set and ready to use');
}

/**
 * Check if Supabase is ready to use.
 */
function isSupabaseReady() {
    return supabaseClient !== null;
}

/**
 * Save current animal data to Supabase table 'animals'.
 */
async function saveAnimalsToSupabase(silent = false) {
    if (!isSupabaseReady()) {
        if (!silent) {
            alert('Supabase is not initialized. Please refresh the page and try again.');
        }
        return;
    }

    const payload = calculatorData.animals
        .filter(animal => animal.purchasePrice > 0)
        .map(animal => ({
            id: animal.id,
            arrival_day: animal.arrivalDay,
            arrival_date: animal.arrivalDate ? animal.arrivalDate.toISOString().split('T')[0] : null,
            purchase_price: animal.purchasePrice
        }));

    const { data, error, status, statusText } = await supabaseClient.from('animals').upsert(payload, { onConflict: 'id' }).select('*');
    if (error) {
        console.error('Supabase upsert error:', { error, status, statusText, payload });
        if (!silent) {
            alert(`Error saving animals to Supabase.\nStatus: ${status} ${statusText}\nMessage: ${error.message || JSON.stringify(error)}`);
        }
        return;
    }

    console.log('Saved animals to Supabase:', data);
    if (!silent) {
        alert('Animals saved to Supabase successfully.');
    }
}

// ==========================================
// TAB NAVIGATION FUNCTIONALITY
// ==========================================

/**
 * Initialize tab navigation
 */
function initializeTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            const tabName = this.getAttribute('data-tab')?.trim();
            if (!tabName) {
                console.warn('Tab button clicked without data-tab');
                return;
            }
            switchTab(tabName);
        });
    });
}

/**
 * Activate tab based on current hash or default to the first tab.
 */
function activateTabByHash() {
    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(hash)) {
        switchTab(hash);
        return;
    }
    switchTab('animals');
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    const targetTab = document.getElementById(tabName);
    if (!targetTab) {
        console.warn(`Unable to switch to unknown tab: ${tabName}`);
        return;
    }

    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.remove('active'));

    // Remove active class from all buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => btn.classList.remove('active'));

    // Show selected tab
    targetTab.classList.add('active');

    // Add active class to clicked button
    const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }

    // Keep the URL hash in sync for direct access
    window.location.hash = tabName;

    // Update animal selections when switching to specific tabs
    if (tabName === 'medicine') {
        updateMedicineAnimalSelect();
    }
}

// ==========================================
// ANIMAL MANAGEMENT
// ==========================================

// Current animal being entered
let currentAnimalIndex = 0;
let lastArrivalDay = 1;
let lastArrivalDate = null;

/**
 * Initialize animals based on total count
 */
function initializeAnimals() {
    const totalAnimals = parseInt(document.getElementById('totalAnimals').value);
    
    if (!totalAnimals || totalAnimals < 1) {
        alert('براہ کرم درست تعداد درج کریں (Please enter a valid number)');
        return;
    }

    // Clear existing animals
    calculatorData.animals = [];
    for (let i = 1; i <= totalAnimals; i++) {
        calculatorData.animals.push({
            id: i,
            purchasePrice: 0,
            arrivalDay: 1,
            medicineCost: 0,
            truckId: null
        });
    }

    currentAnimalIndex = 0;
    showAnimalForm();
}

/**
 * Show form for current animal
 */
function showAnimalForm() {
    if (currentAnimalIndex >= calculatorData.animals.length) {
        // All animals entered
        document.getElementById('animalFormContainer').style.display = 'none';
        renderAnimalsSummary();
        return;
    }

    const animal = calculatorData.animals[currentAnimalIndex];
    document.getElementById('animalFormTitle').textContent = `جانور #${animal.id} کی تفصیلات درج کریں (Enter details for Animal #${animal.id})`;
    
    // Set default arrival date
    if (lastArrivalDate) {
        document.getElementById('arrivalDateInput').value = lastArrivalDate.toISOString().split('T')[0];
    } else {
        // Read qurbani date from input field
        const qurbaniDateInput = document.getElementById('qurbaniDate').value;
        if (qurbaniDateInput) {
            // Default to qurbani date minus 1 day
            const defaultDate = new Date(qurbaniDateInput);
            defaultDate.setDate(defaultDate.getDate() - 1);
            document.getElementById('arrivalDateInput').value = defaultDate.toISOString().split('T')[0];
        }
    }
    
    document.getElementById('purchasePriceInput').value = animal.purchasePrice;
    
    document.getElementById('animalFormContainer').style.display = 'block';
    document.getElementById('animalsSummaryContainer').style.display = 'none';
    
    // Update status
    const total = calculatorData.animals.length;
    const completed = currentAnimalIndex;
    document.getElementById('statusText').innerHTML = `
        <strong>مکمل (Completed):</strong> ${completed}/${total}<br>
        <strong>باقی (Remaining):</strong> ${total - completed}
    `;

    // Focus on price input
    document.getElementById('purchasePriceInput').focus();
}

/**
 * Save current animal and move to next
 */
async function saveCurrentAnimal() {
    const arrivalDateValue = document.getElementById('arrivalDateInput').value;
    const purchasePrice = parseFloat(document.getElementById('purchasePriceInput').value);
    const qurbaniDateValue = document.getElementById('qurbaniDate').value;

    if (!qurbaniDateValue) {
        alert('براہ کرم قربانی کی تاریخ درج کریں (Please enter qurbani date)');
        return;
    }
    if (!arrivalDateValue) {
        alert('براہ کرم آنے کی تاریخ درج کریں (Please enter arrival date)');
        return;
    }

    const arrivalDate = new Date(arrivalDateValue);
    const qurbaniDate = new Date(qurbaniDateValue);

    if (arrivalDate > qurbaniDate) {
        alert('آنے کی تاریخ قربانی کی تاریخ سے پہلے ہونی چاہیے (Arrival date should be before qurbani date)');
        return;
    }

    if (Number.isNaN(purchasePrice)) {
        alert('براہ کرم قیمت درج کریں (Please enter purchase price)');
        return;
    }

    const daysDiff = Math.ceil((qurbaniDate - arrivalDate) / (1000 * 60 * 60 * 24));
    const arrivalDay = TOTAL_DAYS - daysDiff + 1;

    if (arrivalDay < 1 || arrivalDay > TOTAL_DAYS) {
        alert('تاریخ غلط ہے یا دور ہے (Date is invalid or too far)');
        return;
    }

    const saveButton = document.getElementById('saveAnimalButton');
    setLoadingState(saveButton, true, 'Saving...');

    try {
        const animal = calculatorData.animals[currentAnimalIndex];
        if (animal) {
            animal.purchasePrice = purchasePrice;
            animal.arrivalDay = arrivalDay;
            animal.arrivalDate = arrivalDate;
            animal.qurbaniDate = qurbaniDate;
            animal.id = currentAnimalIndex + 1;
        }

        // Try to save to Supabase if available
        if (supabaseReady && supabaseClient) {
            try {
                const service = await loadSupabaseService();
                if (!service) {
                    throw new Error('Supabase service module failed to load.');
                }

                const savedAnimal = await service.createAnimal({
                    bookingId: null,
                    name: `Animal #${animal.id}`,
                    type: 'other',
                    arrivalDate: arrivalDateValue,
                    qurbaniDate: qurbaniDateValue,
                    purchasePrice,
                    weight: null,
                    location: null,
                    healthNotes: null
                });

                if (savedAnimal) {
                    animal.id = savedAnimal.id;
                    animal.purchasePrice = Number(savedAnimal.purchase_price) || purchasePrice;
                    animal.arrivalDay = Number(savedAnimal.arrival_day) || arrivalDay;
                    animal.arrivalDate = savedAnimal.arrival_date ? new Date(savedAnimal.arrival_date) : arrivalDate;
                    animal.qurbaniDate = savedAnimal.qurbani_date ? new Date(savedAnimal.qurbani_date) : qurbaniDate;
                    console.log('✅ Animal saved to database:', savedAnimal);
                }
            } catch (dbError) {
                console.error('⚠️ Database save failed:', dbError);
                alert('Animal save failed. Check console for database error.');
            }
        } else {
            console.warn('⚠️ Supabase is not ready, skipping database save.');
        }

        lastArrivalDay = arrivalDay;
        lastArrivalDate = arrivalDate;
        currentAnimalIndex++;

        if (currentAnimalIndex < calculatorData.animals.length) {
            calculatorData.animals[currentAnimalIndex].arrivalDay = lastArrivalDay;
        }

        updateAnimalGroupsFromAnimals();
        updateFixedCostsSummary();
        showAnimalForm();
        
        console.log('✅ Animal saved (local + database attempt):', animal);
    } catch (error) {
        console.error('Error saving animal:', error);
        alert('Animal save failed. Check console for details.');
    } finally {
        setLoadingState(saveButton, false);
    }
}

/**
 * Fetch and display saved animals from Supabase database
 */
async function displaySavedAnimalsFromDatabase() {
    try {
        if (!supabaseReady || !supabaseClient) {
            console.warn('Supabase not ready, cannot fetch saved animals');
            return;
        }

        const service = await loadSupabaseService();
        if (!service) {
            console.warn('Supabase service module is not available');
            return;
        }

        // Fetch all animals from the database
        const savedAnimals = await service.fetchRows('animals', {}, { column: 'id', ascending: true });
        
        if (!savedAnimals || savedAnimals.length === 0) {
            console.log('No saved animals found in database');
            return;
        }

        const tbody = document.getElementById('animalsSummaryTable');
        
        // Add saved animals to the table
        savedAnimals.forEach(animal => {
            const row = document.createElement('tr');
            const arrivalDateStr = animal.arrival_date ? new Date(animal.arrival_date).toLocaleDateString('en-GB') : 'N/A';
            const purchasePrice = animal.purchase_price || 0;
            const status = purchasePrice > 0 ? '<span class="success">✓ محفوظ</span>' : '<span class="warning">⚠ نامکمل</span>';
            
            row.innerHTML = `
                <td><strong>جانور #${animal.id}</strong></td>
                <td><strong>${arrivalDateStr}</strong></td>
                <td><strong>دن ${animal.arrival_day || 'N/A'}</strong></td>
                <td><strong style="color: #667eea; font-size: 1.1em;">Rs. ${purchasePrice}</strong></td>
                <td>${status}</td>
            `;
            tbody.appendChild(row);
        });

        document.getElementById('animalsSummaryContainer').style.display = 'block';
        console.log(`✅ Displayed ${savedAnimals.length} saved animals from database`);
    } catch (error) {
        console.error('Error fetching saved animals:', error);
    }
}

async function loadDatabaseData() {
    if (!supabaseReady || !supabaseClient) {
        console.warn('Supabase not ready, cannot load database data');
        return;
    }

    async function tryFetchTable(primaryTable, fallbackTable) {
        const primary = await supabaseClient.from(primaryTable).select('*').order('id', { ascending: true });
        if (!primary.error) {
            return { data: primary.data || [], table: primaryTable, error: null };
        }

        if (!fallbackTable) {
            return { data: [], table: primaryTable, error: primary.error };
        }

        const fallback = await supabaseClient.from(fallbackTable).select('*').order('id', { ascending: true });
        if (!fallback.error) {
            return { data: fallback.data || [], table: fallbackTable, error: null };
        }

        return { data: [], table: fallbackTable, error: fallback.error || primary.error };
    }

    async function fetchExpensesTableSet() {
        const [extraRes, fixedRes, medicineRes] = await Promise.all([
            supabaseClient.from('extra_costs').select('*').order('id', { ascending: true }),
            supabaseClient.from('fixed_costs').select('*').order('id', { ascending: true }),
            supabaseClient.from('medicine_costs').select('*').order('id', { ascending: true })
        ]);

        const missingNewSchema = extraRes.error || fixedRes.error || medicineRes.error;
        if (!missingNewSchema) {
            return {
                source: 'new',
                extraCosts: extraRes.data || [],
                fixedCosts: fixedRes.data || [],
                medicineCosts: medicineRes.data || [],
                rentCosts: []
            };
        }

        const expensesRes = await supabaseClient.from('expenses').select('*').order('id', { ascending: true });
        if (!expensesRes.error) {
            const expenses = expensesRes.data || [];
            return {
                source: 'old',
                extraCosts: expenses.filter(row => row.expense_type === 'extra'),
                fixedCosts: expenses.filter(row => row.expense_type === 'fixed'),
                medicineCosts: expenses.filter(row => row.expense_type === 'medicine'),
                rentCosts: expenses.filter(row => row.expense_type === 'rent')
            };
        }

        return {
            source: 'missing',
            extraCosts: extraRes.error ? [] : extraRes.data || [],
            fixedCosts: fixedRes.error ? [] : fixedRes.data || [],
            medicineCosts: medicineRes.error ? [] : medicineRes.data || [],
            rentCosts: []
        };
    }

    try {
        const animalsRes = await supabaseClient.from('animals').select('*').order('id', { ascending: true });
        if (animalsRes.error) throw animalsRes.error;

        const [feedRes, transportsRes, assignmentsRes, expensesSet] = await Promise.all([
            tryFetchTable('feed_batches', 'daily_feeds'),
            tryFetchTable('trucks', 'transports'),
            tryFetchTable('animal_transport_assignments', 'animal_transport_assignment'),
            fetchExpensesTableSet()
        ]);

        const animals = animalsRes.data || [];
        const feedRows = feedRes.data || [];
        const transports = transportsRes.data || [];
        const rawAssignments = assignmentsRes.data || [];

        const normalizedAssignments = rawAssignments.map(assign => ({
            animal_id: assign.animal_id,
            truck_id: assign.truck_id ?? assign.transport_id
        }));

        const extraCostsData = expensesSet.source === 'old'
            ? expensesSet.extraCosts
            : expensesSet.extraCosts;
        const fixedCostsData = expensesSet.source === 'old'
            ? expensesSet.fixedCosts
            : expensesSet.fixedCosts;
        const medicineData = expensesSet.source === 'old'
            ? expensesSet.medicineCosts
            : expensesSet.medicineCosts;

        calculatorData.rentCost = {
            total: 0,
            days: 1
        };
        if (expensesSet.source === 'old' && expensesSet.rentCosts.length > 0) {
            const rentRow = expensesSet.rentCosts[0];
            calculatorData.rentCost.total = Number(rentRow.amount) || 0;
            calculatorData.rentCost.days = 1;
        }

        if (feedRes.error) {
            console.warn('Warning: feed rows could not be loaded:', feedRes.error);
        }
        if (transportsRes.error) {
            console.warn('Warning: transports could not be loaded:', transportsRes.error);
        }
        if (assignmentsRes.error) {
            console.warn('Warning: assignments could not be loaded:', assignmentsRes.error);
        }

        const assignments = normalizedAssignments;

        calculatorData.animals = animals.map(animal => ({
            id: animal.id,
            purchasePrice: Number(animal.purchase_price) || 0,
            arrivalDay: Number(animal.arrival_day) || 1,
            arrivalDate: animal.arrival_date ? new Date(animal.arrival_date) : null,
            qurbaniDate: animal.qurbani_date ? new Date(animal.qurbani_date) : null,
            weight: animal.weight != null ? Number(animal.weight) : null,
            location: animal.location || null,
            healthNotes: animal.health_notes || null
        }));

        calculatorData.feedBatches = feedRows.map(feed => {
            const day = feed.day ?? feed.feed_date ?? 1;
            const quantity = Number(feed.quantity ?? feed.quantity_kg ?? 0);
            const rate = Number(feed.rate ?? feed.rate_per_kg ?? 0);
            const totalCost = Number(feed.total_cost ?? feed.total_cost ?? quantity * rate);
            return {
                id: feed.id,
                day,
                quantity,
                rate,
                totalCost
            };
        });
        calculatorData.dailyFeeds = [...calculatorData.feedBatches];

        calculatorData.transports = transports.map(transport => ({
            id: transport.id,
            truckName: transport.truck_name || transport.truck_name,
            totalCost: Number(transport.total_cost) || 0,
            animalsCount: Number(transport.expected_animal_count ?? transport.assigned_animal_count ?? 0) || 0,
            perAnimalCost: Number(transport.expected_animal_count ?? transport.assigned_animal_count) > 0
                ? Number(transport.total_cost) / Number(transport.expected_animal_count ?? transport.assigned_animal_count)
                : 0
        }));

        calculatorData.animalTruckAssignment = {};
        assignments.forEach(assign => {
            calculatorData.animalTruckAssignment[assign.animal_id] = assign.truck_id;
        });

        calculatorData.extraCosts = extraCostsData.map(cost => ({
            id: cost.id,
            description: cost.description || 'Extra Cost',
            amount: Number(cost.amount) || 0,
            distribution: cost.cost_type || cost.distribution_type || 'equal',
            applicableTo: null
        }));

        calculatorData.fixedCosts = fixedCostsData.map(cost => ({
            id: cost.id,
            description: cost.description || 'Fixed Cost',
            amount: Number(cost.total_amount ?? cost.amount) || 0
        }));

        calculatorData.medicineCosts = {};
        medicineData.forEach(cost => {
            const animalId = Number(cost.animal_id);
            if (!animalId) return;
            calculatorData.medicineCosts[animalId] = (calculatorData.medicineCosts[animalId] || 0) + Number(cost.cost ?? cost.amount);
        });

        currentAnimalIndex = calculatorData.animals.length;
        updateAnimalGroupsFromAnimals();
        renderAnimalsSummary();
        renderFeedBatches();
        renderTransportRecords();
        renderTruckAssignment();
        renderMedicineRecords();
        renderExtraRecords();
        renderFixedCosts();
        updateFixedCostsSummary();

        if (calculatorData.animals.length > 0) {
            calculateAndDisplay();
        }

        console.log(`✅ Loaded ${calculatorData.animals.length} animals and related data from database`);
    } catch (error) {
        console.error('Error loading full database data:', error);
        alert('Unable to load database data for calculations. Check console for details.');
    }
}

/**
 * Render animals summary table
 */
function renderAnimalsSummary() {
    const tbody = document.getElementById('animalsSummaryTable');
    tbody.innerHTML = '';

    calculatorData.animals.forEach((animal, index) => {
        const row = document.createElement('tr');
        const status = animal.purchasePrice > 0 ? '<span class="success">✓ مکمل</span>' : '<span class="warning">⚠ نامکمل</span>';
        const arrivalDateStr = animal.arrivalDate ? animal.arrivalDate.toLocaleDateString('en-GB') : 'N/A';
        row.innerHTML = `
            <td>
                <input type="text" class="animal-id-input" value="جانور #${animal.id}" data-index="${index}" style="border: none; background: transparent; font-weight: bold; width: 100%;">
            </td>
            <td><strong>${arrivalDateStr}</strong></td>
            <td><strong>دن ${animal.arrivalDay}</strong></td>
            <td><strong style="color: #667eea; font-size: 1.1em;">Rs. ${animal.purchasePrice}</strong></td>
            <td>${status}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="saveAnimalIdEdit(${index})">محفوظ (Save)</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('animalsSummaryContainer').style.display = 'block';
}

/**
 * Save edited animal ID to database
 */
async function saveAnimalIdEdit(index) {
    const animal = calculatorData.animals[index];
    if (!animal) return;

    const inputElement = document.querySelector(`.animal-id-input[data-index="${index}"]`);
    const newIdText = inputElement.value.trim();
    
    // Extract just the ID number from "جانور #123" format
    const match = newIdText.match(/#(\d+)/);
    if (!match) {
        alert('براہ کرم صحیح شناخت درج کریں (Please enter a valid ID in format: جانور #123)');
        return;
    }

    const newId = parseInt(match[1], 10);
    if (newId === animal.id) {
        console.log('No change in animal ID');
        return;
    }

    try {
        // Update locally
        const oldId = animal.id;
        animal.id = newId;

        // Try to update in database
        if (supabaseReady && supabaseClient) {
            const { error } = await supabaseClient
                .from('animals')
                .update({ id: newId })
                .eq('id', oldId);

            if (error) {
                console.warn('⚠️ Database update failed, saved locally:', error.message);
                alert('ڈیٹابیس میں محفوظ نہیں ہو سکے لیکن مقامی طور پر محفوظ ہے (Saved locally, database update failed)');
            } else {
                console.log('✅ Animal ID updated in database:', { oldId, newId });
                alert('جانور کی شناخت محفوظ ہو گئی (Animal ID saved successfully)');
            }
        }

        // Re-render to reflect changes
        renderAnimalsSummary();
        updateAnimalGroupsFromAnimals();
    } catch (error) {
        console.error('Error updating animal ID:', error);
        alert('خرابی: براہ کرم دوبارہ کوشش کریں (Error: Please try again)');
    }
}

/**
 * Automatically update animal groups based on entered animals
 */
function updateAnimalGroupsFromAnimals() {
    // Group animals by arrival day
    const groupsMap = calculatorData.animals.reduce((acc, animal) => {
        // Only include animals that have been saved (have purchase price)
        if (animal.purchasePrice > 0) {
            if (!acc[animal.arrivalDay]) {
                acc[animal.arrivalDay] = 0;
            }
            acc[animal.arrivalDay]++;
        }
        return acc;
    }, {});

    // Create groups array
    calculatorData.animalGroups = Object.entries(groupsMap)
        .sort(([a], [b]) => parseInt(a) - parseInt(b)) // Sort by arrival day
        .map(([day, count], index) => {
            const arrivalDay = parseInt(day);
            const daysStayed = TOTAL_DAYS - arrivalDay + 1;
            const animalDays = count * daysStayed;
            return {
                id: index + 1,
                animals: count,
                arrivalDay,
                days: daysStayed,
                animalDays
            };
        });

    // Render the updated groups table
    renderAnimalGroups();
}

// ==========================================
// ANIMAL-DAYS FEED CALCULATOR
// ==========================================

/**
 * Show feed batch form after user confirms number of arrivals
 */
function setFeedArrivalCount() {
    const count = parseInt(document.getElementById('feedArrivalCount').value);
    if (!count || count < 1) {
        alert('براہ کرم درست تعداد درج کریں (Please enter a valid number)');
        return;
    }

    document.getElementById('feedBatchForm').style.display = 'block';
    alert(`اب ${count} چارے کی بار شامل کریں۔ (Now add ${count} feed batches.)`);
}

/**
 * Add a feed batch record so costs can be distributed automatically
 */
async function addFeedBatch() {
    const feedDay = parseInt(document.getElementById('feedDayInput').value, 10);
    const quantity = parseFloat(document.getElementById('feedQuantityInput').value);
    let rate = parseFloat(document.getElementById('feedRateInput').value);
    let totalCost = parseFloat(document.getElementById('feedTotalCostInput').value);
    const button = document.getElementById('addFeedBatchButton');

    if (!feedDay || feedDay < 1) {
        alert('براہ کرم چارے کا درست دن درج کریں (Please enter a valid feed day)');
        return;
    }
    if ((!quantity || quantity <= 0) && (!totalCost || totalCost <= 0)) {
        alert('براہ کرم مقدار یا کل قیمت درج کریں (Please enter quantity or total cost)');
        return;
    }

    if (!rate || rate <= 0) {
        if (quantity && totalCost && totalCost > 0) {
            rate = totalCost / quantity;
        }
    }

    if (quantity && rate && rate > 0) {
        totalCost = quantity * rate;
    }

    if (!totalCost || totalCost <= 0) {
        alert('براہ کرم چارے کی درست قیمت درج کریں (Please enter a valid feed cost)');
        return;
    }

    setLoadingState(button, true, 'Saving...');
    try {
        // Save locally
        const batchId = calculatorData.feedBatches.length + 1;
        const batch = {
            id: batchId,
            day: feedDay,
            quantity: quantity || 0,
            rate: rate || 0,
            totalCost: totalCost
        };
        calculatorData.feedBatches.push(batch);
        
        // Try to save to database
        if (supabaseReady && supabaseClient) {
            try {
                const result = await supabaseClient.from('feed_batches').insert({
                    booking_id: null,
                    day: feedDay,
                    quantity: quantity || 0,
                    rate: rate || 0,
                    total_cost: totalCost
                });
                if (result.error) {
                    throw result.error;
                }
                console.log('✅ Feed batch saved to database:', batch);
            } catch (dbError) {
                console.warn('⚠️ Database save failed, saved locally:', dbError.message);
            }
        }
        
        renderFeedBatches();
        alert('Feed batch saved!');

        document.getElementById('feedDayInput').value = '';
        document.getElementById('feedQuantityInput').value = '';
        document.getElementById('feedRateInput').value = '';
        document.getElementById('feedTotalCostInput').value = '';
    } catch (error) {
        console.error('Error saving feed batch:', error);
        alert('Unable to save feed batch. Check console for details.');
    } finally {
        setLoadingState(button, false);
    }
}

/**
 * Render feed batch table
 */
function renderFeedBatches() {
    const tbody = document.getElementById('feedBatchesTable');
    if (!tbody) return;

    tbody.innerHTML = '';
    calculatorData.feedBatches.forEach(batch => {
        const presentAnimals = getAnimalsPresentOnDay(batch.day).length;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${batch.id}</td>
            <td>دن ${batch.day}</td>
            <td>${batch.quantity > 0 ? batch.quantity : '-'}</td>
            <td>${batch.rate > 0 ? 'Rs. ' + batch.rate.toFixed(2) : '-'}</td>
            <td>Rs. ${batch.totalCost.toFixed(2)}</td>
            <td>${presentAnimals > 0 ? presentAnimals + ' جانور' : 'N/A'}</td>
            <td><button class="btn btn-danger" onclick="removeFeedBatch(${batch.id})">حذف کریں</button></td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Remove a feed batch
 */
function removeFeedBatch(batchId) {
    calculatorData.feedBatches = calculatorData.feedBatches.filter(batch => batch.id !== batchId);
    renderFeedBatches();
}

/**
 * Return animals present on a given feed day
 */
function getAnimalsPresentOnDay(day) {
    return calculatorData.animals.filter(animal => animal.arrivalDay <= day && animal.purchasePrice > 0);
}

/**
 * Render animal groups table
 */
function renderAnimalGroups() {
    const tbody = document.getElementById('animalGroupsTable');
    tbody.innerHTML = '';

    calculatorData.animalGroups.forEach(group => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>گروپ ${group.id}</strong></td>
            <td>${group.animals} جانور</td>
            <td>دن ${group.arrivalDay}</td>
            <td>${group.days} دن</td>
            <td>${group.animalDays} جانور-دن</td>
            <td>
                <button class="btn btn-danger" onclick="removeAnimalGroup(${group.id})">حذف کریں</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Remove animal group
 */
function removeAnimalGroup(groupId) {
    calculatorData.animalGroups = calculatorData.animalGroups.filter(g => g.id !== groupId);
    renderAnimalGroups();
}

/**
 * Calculate total animal-days from all groups
 */
function calculateAnimalDays() {
    let totalAnimalDays = 0;
    calculatorData.animalGroups.forEach(group => {
        totalAnimalDays += group.animalDays;
    });
    return totalAnimalDays;
}

/**
 * Get the animal group object for a given animal based on arrival day
 */
function getAnimalGroupForAnimal(animal) {
    return calculatorData.animalGroups.find(group => group.arrivalDay === animal.arrivalDay);
}

/**
 * Calculate total days weight for selected animals by ID
 */
function calculateTotalDaysForSelectedAnimals(animalIds) {
    let totalDays = 0;
    animalIds.forEach(animalId => {
        const animal = calculatorData.animals.find(a => String(a.id) === String(animalId));
        if (!animal) return;
        const group = getAnimalGroupForAnimal(animal);
        if (!group) return;
        totalDays += group.days;
    });
    return totalDays;
}

/**
 * Round to 2 decimal places safely
 */
function roundToTwo(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Build sorted feed periods from feed batches.
 * Each batch defines the period start day. The end day is the next batch start minus 1.
 */
function buildFeedPeriods() {
    const sorted = calculatorData.feedBatches
        .slice()
        .sort((a, b) => a.day - b.day || a.id - b.id);

    return sorted.map((batch, index) => {
        const nextBatch = sorted[index + 1];
        const startDay = batch.day;
        const endDay = nextBatch ? Math.min(nextBatch.day - 1, TOTAL_DAYS) : TOTAL_DAYS;

        return {
            id: batch.id,
            startDay,
            endDay,
            totalCost: batch.totalCost,
            quantity: batch.quantity,
            rate: batch.rate,
            duration: Math.max(0, endDay - startDay + 1)
        };
    }).filter(period => period.duration > 0 && period.startDay <= TOTAL_DAYS);
}

/**
 * Calculate how many days a group is present in a period
 */
function getGroupDaysInPeriod(group, period) {
    const start = Math.max(period.startDay, group.arrivalDay);
    const end = Math.min(period.endDay, TOTAL_DAYS);
    return Math.max(0, end - start + 1);
}

/**
 * Calculate feed cost distribution based on each feed period and group presence.
 */
function calculateFeedCostDistribution() {
    if (calculatorData.feedBatches.length === 0) {
        alert('براہ کرم چارے کی بار شامل کریں (Please add at least one feed batch)');
        return;
    }

    if (calculatorData.animalGroups.length === 0) {
        updateAnimalGroupsFromAnimals();
    }

    if (calculatorData.animalGroups.length === 0) {
        alert('براہ کرم جانوروں کے گروپس پہلے داخل کریں (Please enter animal groups first)');
        return;
    }

    const periods = buildFeedPeriods();
    if (periods.length === 0) {
        alert('براہ کرم درست چارے کی بار درج کریں (Please enter valid feed periods)');
        return;
    }

    const totalFeedCost = roundToTwo(calculatorData.feedBatches.reduce((sum, batch) => sum + batch.totalCost, 0));
    const totalAnimals = calculatorData.animalGroups.reduce((sum, group) => sum + group.animals, 0);

    const groupResults = calculatorData.animalGroups.map(group => ({
        groupId: group.id,
        animals: group.animals,
        arrivalDay: group.arrivalDay,
        totalDaysPresent: 0,
        totalAnimalDays: 0,
        groupCost: 0,
        perAnimalTotalCost: 0
    }));

    periods.forEach(period => {
        const periodInfo = calculatorData.animalGroups.map(group => {
            const daysPresent = getGroupDaysInPeriod(group, period);
            return {
                group,
                daysPresent,
                animalDays: group.animals * daysPresent
            };
        });

        const totalPeriodAnimalDays = periodInfo.reduce((sum, item) => sum + item.animalDays, 0);
        if (totalPeriodAnimalDays === 0) {
            return;
        }

        const periodRate = period.totalCost / totalPeriodAnimalDays;

        periodInfo.forEach(item => {
            const result = groupResults.find(gr => gr.groupId === item.group.id);
            if (!result || item.animalDays === 0) return;

            result.totalDaysPresent += item.daysPresent;
            result.totalAnimalDays += item.animalDays;
            result.groupCost += periodRate * item.animalDays;
            result.perAnimalTotalCost += periodRate * item.daysPresent;
        });
    });

    const results = groupResults.map(result => ({
        ...result,
        groupCost: roundToTwo(result.groupCost),
        perAnimalTotalCost: roundToTwo(result.perAnimalTotalCost),
        totalAnimalDays: roundToTwo(result.totalAnimalDays)
    }));

    const grandTotal = roundToTwo(results.reduce((sum, result) => sum + result.groupCost, 0));
    const averagePerAnimalCost = totalAnimals > 0 ? roundToTwo(totalFeedCost / totalAnimals) : 0;

    displayAnimalDaysResults(totalFeedCost, averagePerAnimalCost, results, grandTotal);
}

/**
 * Display animal-days calculation results
 */
function displayAnimalDaysResults(totalFeedCost, averagePerAnimalCost, results, grandTotal) {
    calculatorData.feedResults = results; // Store for later use

    // Update summary
    document.getElementById('totalFeedCostSummary').textContent = 'Rs. ' + totalFeedCost.toFixed(2);
    document.getElementById('perAnimalFeedCost').textContent = 'Rs. ' + averagePerAnimalCost.toFixed(2);

    // Update results table
    const tbody = document.getElementById('feedResultsTable');
    tbody.innerHTML = '';

    results.forEach(result => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>گروپ ${result.groupId}</strong></td>
            <td>${result.animals} جانور</td>
            <td>دن ${result.arrivalDay}</td>
            <td><strong style="color: #667eea;">Rs. ${result.groupCost.toFixed(2)}</strong></td>
            <td><strong style="color: #667eea;">Rs. ${result.perAnimalTotalCost.toFixed(2)}</strong></td>
        `;
        tbody.appendChild(row);
    });

    const footerRow = document.createElement('tr');
    footerRow.innerHTML = `
        <td colspan="3"><strong>Grand Total</strong></td>
        <td><strong style="color: #2d3748;">Rs. ${grandTotal.toFixed(2)}</strong></td>
        <td></td>
    `;
    tbody.appendChild(footerRow);

    document.getElementById('feedResultsContainer').style.display = 'block';
    alert('حساب مکمل ہو گیا! (Calculation completed!)');
}

/**
 * Add sample data for testing the animal-days calculator
 */
function addSampleData() {
    calculatorData.feedBatches = [
        { id: 1, day: 1, quantity: 10, rate: 120, totalCost: 1200 },
        { id: 2, day: 4, quantity: 8, rate: 130, totalCost: 1040 }
    ];

    renderFeedBatches();
    updateAnimalGroupsFromAnimals();
    alert('نمونی چارہ ڈیٹا شامل کر دیا گیا! (Sample feed data added!)');
}

// ==========================================
// TRANSPORT MANAGEMENT
// ==========================================

/**
 * Add transport record
 */
async function addTransport() {
    const truckName = document.getElementById('truckId').value.trim();
    const totalCost = parseFloat(document.getElementById('truckCost').value);
    const animalsCount = parseInt(document.getElementById('truckAnimals').value, 10);
    const button = document.getElementById('addTransportButton');

    if (!truckName) {
        alert('Please enter truck ID/Name');
        return;
    }
    if (!totalCost && totalCost !== 0) {
        alert('Please enter total transport cost');
        return;
    }
    if (!animalsCount || animalsCount < 1) {
        alert('Please enter number of animals');
        return;
    }

    setLoadingState(button, true, 'Saving...');
    try {
        // Save locally
        const truckId = calculatorData.transports.length + 1;
        const perAnimalCost = totalCost / animalsCount;
        const transport = {
            id: truckId,
            truckName: truckName,
            totalCost: totalCost,
            animalsCount: animalsCount,
            perAnimalCost: perAnimalCost,
            assignedAnimals: []
        };
        calculatorData.transports.push(transport);
        
        // Try to save to database
        if (supabaseReady && supabaseClient) {
            try {
                const result = await supabaseClient.from('trucks').insert({
                    booking_id: null,
                    truck_name: truckName,
                    total_cost: totalCost,
                    expected_animal_count: animalsCount
                });
                if (result.error) {
                    throw result.error;
                }
                console.log('✅ Transport saved to database:', transport);
            } catch (dbError) {
                console.warn('⚠️ Database save failed, saved locally:', dbError.message);
            }
        }
        
        renderTransportRecords();
        renderTruckAssignment();
        alert('Transport record added!');

        document.getElementById('truckId').value = '';
        document.getElementById('truckCost').value = '';
        document.getElementById('truckAnimals').value = '';
    } catch (error) {
        console.error('Error saving transport record:', error);
        alert('Unable to save transport record. Check console for details.');
    } finally {
        setLoadingState(button, false);
    }
}

/**
 * Render transport records table
 */
function renderTransportRecords() {
    const tbody = document.getElementById('transportRecords');
    tbody.innerHTML = '';

    calculatorData.transports.forEach((transport, index) => {
        const assignedAnimals = getAssignedAnimalsForTruck(transport.id).length;
        const perAnimalCost = assignedAnimals > 0 ? transport.totalCost / assignedAnimals : transport.perAnimalCost;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${transport.id}</td>
            <td>${transport.totalCost.toFixed(2)}</td>
            <td>${transport.animalsCount}</td>
            <td>${perAnimalCost.toFixed(2)}</td>
            <td>
                <button class="btn btn-danger" onclick="removeTransport(${index})">Remove</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Remove transport record
 */
function removeTransport(index) {
    calculatorData.transports.splice(index, 1);
    renderTransportRecords();
    renderTruckAssignment();
}

/**
 * Render truck assignment interface
 */
function renderTruckAssignment() {
    const container = document.getElementById('animalTruckAssignment');
    
    if (calculatorData.transports.length === 0 || calculatorData.animals.length === 0) {
        container.innerHTML = '<p style="color: #999;">Add transports and initialize animals first</p>';
        return;
    }

    container.innerHTML = '';

    calculatorData.animals.forEach(animal => {
        const assignDiv = document.createElement('div');
        assignDiv.className = 'truck-assignment';
        
        let selectHTML = '<select onchange="assignAnimalToTruck(' + animal.id + ', this.value)">';
        selectHTML += '<option value="">-- Unassigned --</option>';
        
        calculatorData.transports.forEach(transport => {
            const selected = calculatorData.animalTruckAssignment[animal.id] === transport.id ? 'selected' : '';
            selectHTML += `<option value="${transport.id}" ${selected}>${transport.id} (${transport.perAnimalCost.toFixed(2)} per animal)</option>`;
        });
        selectHTML += '</select>';

        assignDiv.innerHTML = `
            <h4>Animal #${animal.id}</h4>
            <label>Assign to Truck:</label>
            ${selectHTML}
        `;
        container.appendChild(assignDiv);
    });
}

/**
 * Assign animal to truck
 */
async function assignAnimalToTruck(animalId, truckId) {
    if (truckId === '') {
        delete calculatorData.animalTruckAssignment[animalId];
        renderTransportRecords();
        return;
    }

    const numericTruckId = parseInt(truckId, 10);
    calculatorData.animalTruckAssignment[animalId] = numericTruckId;
    const button = document.getElementById('addTransportButton');
    setLoadingState(button, true, 'Saving...');

    try {
        // Try to save to database
        if (supabaseReady && supabaseClient) {
            try {
                const result = await supabaseClient.from('animal_transport_assignments').insert({
                    animal_id: animalId,
                    truck_id: numericTruckId
                });
                if (result.error) {
                    throw result.error;
                }
                console.log('✅ Animal truck assignment saved to database:', { animalId, truckId: numericTruckId });
            } catch (dbError) {
                console.warn('⚠️ Database save failed, saved locally:', dbError.message);
            }
        }
        
        renderTransportRecords();
    } catch (error) {
        console.error('Error saving truck assignment:', error);
        alert('Unable to save truck assignment. Check console for details.');
    } finally {
        setLoadingState(button, false);
    }
}

/**
 * Get assigned animal IDs for a specific truck
 */
function getAssignedAnimalsForTruck(truckId) {
    return Object.keys(calculatorData.animalTruckAssignment)
        .filter(animalId => calculatorData.animalTruckAssignment[animalId] === truckId)
        .map(id => parseInt(id, 10));
}

// ==========================================
// RENT MANAGEMENT
// ==========================================

/**
 * Set rent cost
 */
async function setRentCost() {
    const total = parseFloat(document.getElementById('rentTotal').value);
    const days = parseInt(document.getElementById('rentDays').value, 10);
    const button = document.getElementById('applyRentCostButton');

    if (!total && total !== 0) {
        alert('Please enter total rent cost');
        return;
    }
    if (!days || days < 1) {
        alert('Please enter number of days');
        return;
    }

    setLoadingState(button, true, 'Saving...');
    try {
        // Save locally
        calculatorData.rentCost.total = total;
        calculatorData.rentCost.days = days;

        // Try to save to database
        if (supabaseReady && supabaseClient) {
            const { error } = await supabaseClient.from('expenses').insert({
                booking_id: null,
                expense_type: 'rent',
                description: `Rent cost for ${days} days`,
                amount: total,
                distribution_type: 'animal_days'
            });
            if (error) {
                console.warn('⚠️ Database save failed, saved locally:', error.message);
            } else {
                console.log('✅ Rent cost saved to database:', { total, days });
            }
        }

        const perDayRent = total / days;
        const rentInfo = document.getElementById('rentInfo');
        rentInfo.innerHTML = `
            <p><strong>Total Rent Cost:</strong> ${total.toFixed(2)}</p>
            <p><strong>Number of Days:</strong> ${days}</p>
            <p><strong>Per Day Rent:</strong> ${perDayRent.toFixed(2)}</p>
            <p style="color: #2c5aa0; font-size: 0.9em;">
                <em>Note: Rent will be divided based on number of animals present each day during calculation.</em>
            </p>
        `;
        alert('Rent cost set successfully!');
    } catch (error) {
        console.error('Error saving rent cost:', error);
        alert('Unable to save rent cost. Check console for details.');
    } finally {
        setLoadingState(button, false);
    }
}

// ==========================================
// MEDICINE MANAGEMENT
// ==========================================

/**
 * Update medicine animal selector
 */
function updateMedicineAnimalSelect() {
    const select = document.getElementById('medicineAnimalSelect');
    select.innerHTML = '<option value="">-- Select Animal --</option>';

    calculatorData.animals.forEach(animal => {
        const option = document.createElement('option');
        option.value = animal.id;
        option.textContent = `Animal #${animal.id} (Purchase: ${animal.purchasePrice.toFixed(2)})`;
        select.appendChild(option);
    });
}

/**
 * Add medicine cost for an animal
 */
async function addMedicineCost() {
    const animalId = parseInt(document.getElementById('medicineAnimalSelect').value, 10);
    const medicineCost = parseFloat(document.getElementById('medicineCost').value);
    const button = document.getElementById('addMedicineCostButton');

    if (!animalId) {
        alert('Please select an animal');
        return;
    }
    if (!medicineCost && medicineCost !== 0) {
        alert('Please enter medicine cost');
        return;
    }

    setLoadingState(button, true, 'Saving...');
    try {
        // Save locally
        calculatorData.medicineCosts[animalId] = medicineCost;
        
        // Try to save to database
        if (supabaseReady && supabaseClient) {
            const { error } = await supabaseClient.from('medicine_costs').insert({
                animal_id: animalId,
                medicine_name: 'General Medicine',
                cost: medicineCost,
                date_given: new Date().toISOString().split('T')[0],
                notes: `Medicine cost for Animal #${animalId}`
            });
            if (error) {
                const fallback = await supabaseClient.from('expenses').insert({
                    booking_id: null,
                    animal_id: animalId,
                    expense_type: 'medicine',
                    description: `Medicine cost for Animal #${animalId}`,
                    amount: medicineCost,
                    distribution_type: 'equal'
                });
                if (fallback.error) {
                    console.warn('⚠️ Database save failed, saved locally:', fallback.error.message);
                } else {
                    console.log('✅ Medicine cost saved to legacy expenses table for Animal #' + animalId + ':', medicineCost);
                }
            } else {
                console.log('✅ Medicine cost saved to database for Animal #' + animalId + ':', medicineCost);
            }
        }
        
        renderMedicineRecords();
        alert('Medicine cost added!');

        document.getElementById('medicineAnimalSelect').value = '';
        document.getElementById('medicineCost').value = '';
    } catch (error) {
        console.error('Error saving medicine cost:', error);
        alert('Unable to save medicine cost. Check console for details.');
    } finally {
        setLoadingState(button, false);
    }
}

/**
 * Render medicine records table
 */
function renderMedicineRecords() {
    const tbody = document.getElementById('medicineRecords');
    tbody.innerHTML = '';

    Object.entries(calculatorData.medicineCosts).forEach(([animalId, cost]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>Animal #${animalId}</td>
            <td>${cost.toFixed(2)}</td>
            <td>
                <button class="btn btn-danger" onclick="removeMedicineCost(${animalId})">Remove</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Remove medicine cost
 */
function removeMedicineCost(animalId) {
    delete calculatorData.medicineCosts[animalId];
    renderMedicineRecords();
}

// ==========================================
// EXTRA COSTS MANAGEMENT
// ==========================================

/**
 * Add extra cost
 */
async function addExtraCost() {
    const description = document.getElementById('extraDescription').value.trim();
    const amount = parseFloat(document.getElementById('extraAmount').value);
    const distribution = document.getElementById('extraDistribution').value;
    const button = document.getElementById('addExtraCostButton');

    if (!description) {
        alert('Please enter cost description');
        return;
    }
    if (!amount && amount !== 0) {
        alert('Please enter amount');
        return;
    }

    setLoadingState(button, true, 'Saving...');
    try {
        // Save locally
        const extraCost = {
            id: Date.now(),
            description,
            amount,
            distribution,
            applicableTo: distribution === 'equal' ? null : []
        };
        calculatorData.extraCosts.push(extraCost);
        
        // Try to save to database
        if (supabaseReady && supabaseClient) {
            const { error } = await supabaseClient.from('extra_costs').insert({
                booking_id: null,
                description,
                amount,
                cost_type: distribution
            });
            if (error) {
                const fallback = await supabaseClient.from('expenses').insert({
                    booking_id: null,
                    expense_type: 'extra',
                    description,
                    amount,
                    distribution_type: distribution,
                    custom_animal_ids: null
                });
                if (fallback.error) {
                    console.warn('⚠️ Database save failed, saved locally:', fallback.error.message);
                } else {
                    console.log('✅ Extra cost saved to legacy expenses table:', extraCost);
                }
            } else {
                console.log('✅ Extra cost saved to database:', extraCost);
            }
        }

        document.getElementById('extraDescription').value = '';
        document.getElementById('extraAmount').value = '';
        document.getElementById('extraDistribution').value = 'equal';

        renderExtraRecords();
        console.log('Extra cost saved locally:', { description, amount, distribution });
        alert('Extra cost added!');
    } catch (error) {
        console.error('Error saving extra cost:', error);
        alert('Unable to save extra cost. Check console for details.');
    } finally {
        setLoadingState(button, false);
    }
}

/**
 * Render extra cost records table
 */
function renderExtraRecords() {
    const tbody = document.getElementById('extraRecords');
    tbody.innerHTML = '';

    calculatorData.extraCosts.forEach((extraCost, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${extraCost.description}</td>
            <td>${extraCost.amount.toFixed(2)}</td>
            <td>${extraCost.distribution === 'equal' ? 'All Animals' : 'Custom'}</td>
            <td>
                <button class="btn btn-danger" onclick="removeExtraCost(${index})">Remove</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Remove extra cost
 */
function removeExtraCost(index) {
    calculatorData.extraCosts.splice(index, 1);
    renderExtraRecords();
}

// ==========================================
// FIXED COSTS MANAGEMENT
// ==========================================

/**
 * Add a fixed cost item
 */
async function addFixedCost() {
    const description = document.getElementById('fixedCostDescription').value.trim();
    const amount = parseFloat(document.getElementById('fixedCostAmount').value);
    const button = document.getElementById('addFixedCostButton');

    if (!description) {
        alert('براہ کرم تفصیل درج کریں (Please enter cost description)');
        return;
    }
    if (!amount || amount <= 0) {
        alert('براہ کرم درست رقم درج کریں (Please enter a valid amount)');
        return;
    }

    setLoadingState(button, true, 'Saving...');
    try {
        // Save locally
        const fixedCost = {
            id: calculatorData.fixedCosts.length + 1,
            description,
            amount
        };
        calculatorData.fixedCosts.push(fixedCost);
        
        // Try to save to database
        if (supabaseReady && supabaseClient) {
            const { error } = await supabaseClient.from('fixed_costs').insert({
                booking_id: null,
                description,
                total_amount: amount,
                distribution_type: 'equal'
            });
            if (error) {
                const fallback = await supabaseClient.from('expenses').insert({
                    booking_id: null,
                    expense_type: 'fixed',
                    description,
                    amount,
                    distribution_type: 'equal'
                });
                if (fallback.error) {
                    console.warn('⚠️ Database save failed, saved locally:', fallback.error.message);
                } else {
                    console.log('✅ Fixed cost saved to legacy expenses table:', fixedCost);
                }
            } else {
                console.log('✅ Fixed cost saved to database:', fixedCost);
            }
        }
        
        renderFixedCosts();
        updateFixedCostsSummary();

        document.getElementById('fixedCostDescription').value = '';
        document.getElementById('fixedCostAmount').value = '';

        alert(`"${description}" شامل کر دیا گیا (Added successfully)`);
    } catch (error) {
        console.error('Error saving fixed cost:', error);
        alert('Unable to save fixed cost. Check console for details.');
    } finally {
        setLoadingState(button, false);
    }
}

/**
 * Render fixed costs table
 */
function renderFixedCosts() {
    const tbody = document.getElementById('fixedCostsTable');
    if (!tbody) return;

    tbody.innerHTML = '';
    const totalAnimals = calculatorData.animals.filter(a => a.purchasePrice > 0).length;

    calculatorData.fixedCosts.forEach((cost, index) => {
        const perAnimal = totalAnimals > 0 ? cost.amount / totalAnimals : 0;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${cost.id}</td>
            <td>${cost.description}</td>
            <td>Rs. ${cost.amount.toFixed(2)}</td>
            <td>Rs. ${perAnimal.toFixed(2)}</td>
            <td>
                <button class="btn btn-danger" onclick="removeFixedCost(${index})">حذف (Remove)</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Remove a fixed cost
 */
function removeFixedCost(index) {
    calculatorData.fixedCosts.splice(index, 1);
    renderFixedCosts();
    updateFixedCostsSummary();
}

/**
 * Update fixed costs summary
 */
function updateFixedCostsSummary() {
    const totalAnimals = calculatorData.animals.filter(a => a.purchasePrice > 0).length;
    const totalAmount = calculatorData.fixedCosts.reduce((sum, cost) => sum + cost.amount, 0);
    const perAnimal = totalAnimals > 0 ? totalAmount / totalAnimals : 0;

    document.getElementById('totalFixedCostAmount').textContent = 'Rs. ' + roundToTwo(totalAmount).toFixed(2);
    document.getElementById('perAnimalFixedCost').textContent = 'Rs. ' + roundToTwo(perAnimal).toFixed(2);
}

/**
 * Calculate total fixed cost for an animal
 */
function calculateFixedCostForAnimal(animal) {
    const totalAnimals = calculatorData.animals.filter(a => a.purchasePrice > 0).length;
    if (totalAnimals === 0) return 0;

    const totalFixedCost = calculatorData.fixedCosts.reduce((sum, cost) => sum + cost.amount, 0);
    return roundToTwo(totalFixedCost / totalAnimals);
}

// ==========================================
// CALCULATION AND RESULTS
// ==========================================

/**
 * Calculate total costs for all animals
 */
function calculateAndDisplay() {
    // Validation
    if (calculatorData.animals.length === 0) {
        alert('Please initialize animals first');
        return;
    }

    // If using animal-days feed system, calculate it first
    if (calculatorData.animalGroups.length > 0) {
        calculateFeedCostDistribution();
    }

    const results = [];
    let totalGrandCost = 0;

    // Calculate for each animal
    calculatorData.animals.forEach(animal => {
        const animalCost = {
            id: animal.id,
            purchasePrice: animal.purchasePrice,
            feedCost: 0,
            transportCost: 0,
            rentCost: 0,
            medicineCost: calculatorData.medicineCosts[animal.id] || 0,
            fixedCost: 0,
            extraCost: 0,
            totalCost: 0
        };

        // Calculate feed cost
        animalCost.feedCost = calculateFeedCost(animal);

        // Calculate transport cost
        animalCost.transportCost = calculateTransportCost(animal);

        // Calculate rent cost
        animalCost.rentCost = calculateRentCost(animal);

        // Calculate fixed cost share
        animalCost.fixedCost = calculateFixedCostForAnimal(animal);

        // Calculate extra cost share
        animalCost.extraCost = calculateExtraCostShare(animal);

        // Calculate total
        animalCost.totalCost = 
            animalCost.purchasePrice +
            animalCost.feedCost +
            animalCost.transportCost +
            animalCost.rentCost +
            animalCost.medicineCost +
            animalCost.fixedCost +
            animalCost.extraCost;

        results.push(animalCost);
        totalGrandCost += animalCost.totalCost;
    });

    // Display results
    displayResults(results, totalGrandCost);
}

/**
 * Calculate feed cost for an animal
 * Uses animal-days system if available, otherwise falls back to old daily feeds
 */
function calculateFeedCost(animal) {
    // Check if animal-days feed system has data
    if (calculatorData.animalGroups.length > 0 && calculatorData.feedResults) {
        return calculateAnimalDaysFeedCostForAnimal(animal);
    }

    // Fall back to old system
    let totalFeedCost = 0;
    calculatorData.dailyFeeds.forEach(feed => {
        if (feed.day >= animal.arrivalDay) {
            totalFeedCost += feed.perAnimalCost;
        }
    });
    return totalFeedCost;
}

/**
 * Calculate feed cost for an individual animal using the animal-days system
 */
function calculateAnimalDaysFeedCostForAnimal(animal) {
    // Find which group this animal belongs to based on arrival day
    // This matches animals to groups by arrival day
    const group = calculatorData.animalGroups.find(g => g.arrivalDay === animal.arrivalDay);
    if (!group) return 0;

    // Get the feed cost per animal for this group
    const groupResult = calculatorData.feedResults.find(r => r.groupId === group.id);
    if (!groupResult) return 0;

    // Return per-animal cost for this group
    return groupResult.perAnimalTotalCost;
}

/**
 * Calculate rent cost for an animal
 */
function calculateRentCost(animal) {
    if (calculatorData.rentCost.total === 0 || calculatorData.rentCost.days === 0) {
        return 0;
    }

    const group = getAnimalGroupForAnimal(animal);
    if (!group) {
        return 0;
    }

    const totalAnimalDays = calculateAnimalDays();
    if (totalAnimalDays === 0) {
        return 0;
    }

    // Distribute rent based on each animal's stay length (animal-days weight)
    return calculatorData.rentCost.total * group.days / totalAnimalDays;
}

/**
 * Calculate transport cost for an animal
 */
function calculateTransportCost(animal) {
    const truckId = calculatorData.animalTruckAssignment[animal.id];
    if (!truckId) {
        return 0;
    }

    const transport = calculatorData.transports.find(t => t.id === truckId);
    if (!transport) {
        return 0;
    }

    const assignedAnimals = getAssignedAnimalsForTruck(truckId).length;
    if (assignedAnimals > 0) {
        return roundToTwo(transport.totalCost / assignedAnimals);
    }

    return transport.perAnimalCost;
}

/**
 * Calculate extra cost share for an animal
 */
function calculateExtraCostShare(animal) {
    let totalExtraCost = 0;
    const totalAnimalDays = calculateAnimalDays();
    const group = getAnimalGroupForAnimal(animal);
    if (!group || totalAnimalDays === 0) {
        return 0;
    }

    calculatorData.extraCosts.forEach(extraCost => {
        if (extraCost.distribution === 'equal') {
            // Distribute extra cost based on animal-days similar to feed cost
            totalExtraCost += extraCost.amount * group.days / totalAnimalDays;
        } else if (extraCost.applicableTo && extraCost.applicableTo.includes(animal.id)) {
            // Distribute custom extra cost among selected animals by their days stayed
            const selectedTotalDays = calculateTotalDaysForSelectedAnimals(extraCost.applicableTo);
            if (selectedTotalDays === 0) return;
            totalExtraCost += extraCost.amount * group.days / selectedTotalDays;
        }
    });

    return totalExtraCost;
}

/**
 * Display calculation results
 */
function displayResults(results, totalGrandCost) {
    const container = document.getElementById('resultsContainer');
    
    let html = `
        <div class="results-summary">
            <h3>Cost Summary</h3>
            <div class="cost-breakdown">
                <div class="cost-item">
                    <div class="label">Total Animals</div>
                    <div class="amount">${calculatorData.animals.length}</div>
                </div>
                <div class="cost-item">
                    <div class="label">Grand Total Cost</div>
                    <div class="amount" style="color: #f56565;">${totalGrandCost.toFixed(2)}</div>
                </div>
                <div class="cost-item">
                    <div class="label">Average Cost per Animal</div>
                    <div class="amount">${(totalGrandCost / calculatorData.animals.length).toFixed(2)}</div>
                </div>
            </div>
        </div>
    `;

    // Add individual animal results
    results.forEach(result => {
        html += `
            <div class="animal-result">
                <h4>Animal #${result.id}</h4>
                <div class="cost-breakdown">
                    <div class="cost-item">
                        <div class="label">Purchase Price</div>
                        <div class="amount">${result.purchasePrice.toFixed(2)}</div>
                    </div>
                    <div class="cost-item">
                        <div class="label">Feed Cost</div>
                        <div class="amount">${result.feedCost.toFixed(2)}</div>
                    </div>
                    <div class="cost-item">
                        <div class="label">Transport Cost</div>
                        <div class="amount">${result.transportCost.toFixed(2)}</div>
                    </div>
                    <div class="cost-item">
                        <div class="label">Rent Cost</div>
                        <div class="amount">${result.rentCost.toFixed(2)}</div>
                    </div>
                    <div class="cost-item">
                        <div class="label">Medicine Cost</div>
                        <div class="amount">${result.medicineCost.toFixed(2)}</div>
                    </div>
                    <div class="cost-item">
                        <div class="label">Fixed Cost</div>
                        <div class="amount">${result.fixedCost.toFixed(2)}</div>
                    </div>
                    <div class="cost-item">
                        <div class="label">Extra Cost</div>
                        <div class="amount">${result.extraCost.toFixed(2)}</div>
                    </div>
                </div>
                <div class="total-cost">
                    Total Cost: ${result.totalCost.toFixed(2)}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ==========================================
// INPUT KEY HANDLING
// ==========================================

/**
 * Trigger callback on Enter key press
 */
function triggerOnEnter(inputId, callback) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            callback();
        }
    });
}

// ==========================================
// INITIALIZATION
// ==========================================

async function initializeApp() {
    try {
        console.log('App initialization started');
        initializeTabNavigation();
        activateTabByHash();
        renderAnimalGroups(); // Initialize animal groups table
        renderFixedCosts(); // Initialize fixed costs table
        updateFixedCostsSummary(); // Update fixed costs summary
        
        if (!supabaseReady) {
            alert('Supabase is not connected. Please open supabaseConfig.js and fill your SUPABASE_URL and SUPABASE_ANON_KEY.');
        } else {
            // Load all saved calculator data from the database on app startup
            await loadDatabaseData();
        }

        // Save actions when Enter is pressed in key input fields
        triggerOnEnter('totalAnimals', initializeAnimals);
        triggerOnEnter('arrivalDateInput', saveCurrentAnimal);
        triggerOnEnter('purchasePriceInput', saveCurrentAnimal);
        triggerOnEnter('feedDayInput', addFeedBatch);
        triggerOnEnter('feedQuantityInput', addFeedBatch);
        triggerOnEnter('feedRateInput', addFeedBatch);
        triggerOnEnter('feedTotalCostInput', addFeedBatch);
        triggerOnEnter('truckId', addTransport);
        triggerOnEnter('truckCost', addTransport);
        triggerOnEnter('truckAnimals', addTransport);
        triggerOnEnter('rentTotal', setRentCost);
        triggerOnEnter('rentDays', setRentCost);
        triggerOnEnter('medicineCost', addMedicineCost);
        triggerOnEnter('extraDescription', addExtraCost);
        triggerOnEnter('extraAmount', addExtraCost);
        triggerOnEnter('fixedCostDescription', addFixedCost);
        triggerOnEnter('fixedCostAmount', addFixedCost);

        const bindButton = (id, handler) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', handler);
            }
        };

        bindButton('setBookingIdButton', setBookingId);
        bindButton('startAnimalsButton', initializeAnimals);
        bindButton('saveAnimalButton', saveCurrentAnimal);
        bindButton('setFeedArrivalCountButton', setFeedArrivalCount);
        bindButton('addFeedBatchButton', addFeedBatch);
        bindButton('calculateFeedDistributionButton', calculateFeedCostDistribution);
        bindButton('addTransportButton', addTransport);
        bindButton('applyRentCostButton', setRentCost);
        bindButton('addMedicineCostButton', addMedicineCost);
        bindButton('addFixedCostButton', addFixedCost);
        bindButton('addExtraCostButton', addExtraCost);
        bindButton('calculateTotalCostsButton', calculateAndDisplay);

        // Expose generated click handlers for inline buttons inserted by JavaScript
        window.removeFeedBatch = removeFeedBatch;
        window.removeAnimalGroup = removeAnimalGroup;
        window.removeTransport = removeTransport;
        window.removeMedicineCost = removeMedicineCost;
        window.removeExtraCost = removeExtraCost;
        window.removeFixedCost = removeFixedCost;

        console.log('Ijtemai Qurbani Cost Calculator initialized!');
    } catch (initError) {
        console.error('Initialization failed:', initError);
        alert('Initialization failed. Check console for more details.');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
