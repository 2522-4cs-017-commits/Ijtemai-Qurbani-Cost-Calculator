export async function refreshCostBreakdown() {
    try {
        const service = await loadSupabaseService();
        const bookingId = null; // Booking feature removed
        const breakdown = await service.fetchCostBreakdown(bookingId);
        displayCostBreakdown(breakdown);
    } catch (error) {
        console.error('Error refreshing cost breakdown:', error);
    }
}

export function displayCostBreakdown(breakdown) {
    const container = document.getElementById('resultsContainer');
    if (!container) return;
    if (!breakdown) {
        container.innerHTML = '<p>No cost breakdown available.</p>';
        return;
    }

    const animalsHtml = breakdown.animals.map(item => {
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
        ${animalsHtml}
    `;
}
