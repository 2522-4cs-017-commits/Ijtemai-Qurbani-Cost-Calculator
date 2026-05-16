# Ijtemai Qurbani Cost Calculator

A smart, web-based calculator to calculate per-animal total cost in a madrasa's collective qurbani system, considering dynamic daily expenses and varying arrival times of animals.

## 🚀 Animal-Days Feed Calculator

The calculator now includes a **simple and accurate feed cost calculation system** using the "Animal-Days Method":

### How the Animal-Days Method Works

**Formula:**
```
animal_days = number_of_animals × number_of_days_present
total_animal_days = sum of all animal_days
per_day_cost = total_feed_cost ÷ total_animal_days
per_animal_total_cost = per_day_cost × days_that_animal_stayed
```

**Example:**
- **Group 1:** 10 animals × 15 days = 150 animal-days
- **Group 2:** 10 animals × 5 days = 50 animal-days
- **Total Animal-Days:** 200
- **Per Day Cost:** Rs. 20,000 ÷ 200 = Rs. 100 per animal per day
- **Group 1 Cost:** Rs. 100 × 15 days = Rs. 1,500 per animal
- **Group 2 Cost:** Rs. 100 × 5 days = Rs. 500 per animal

## Project Structure

```
ijtemai qurbani/
├── index.html      # Main HTML file with UI structure
├── styles.css      # CSS styling and responsive design
├── script.js       # JavaScript logic and calculations
└── README.md       # This file
```

## Features

### 1. **Animal Purchase Management**
- Initialize animals with total count
- Set purchase price individually or apply same price to all
- Track each animal separately

### 2. **Daily Feed (Chara) System**
- Add multiple days of feeding records
- Input animals present and total feed cost per day
- Automatic calculation of per-animal per-day feed cost
- Only apply feed costs from animal's arrival day onwards

### 3. **Animal Arrival Tracking**
- Set arrival day for each animal independently
- Feed costs only calculated from arrival day
- Rent costs only calculated from arrival day

### 4. **Transport (Truck) Cost**
- Add multiple trucks with their costs and animal counts
- Automatic per-animal transport cost calculation
- Assign each animal to a truck

### 5. **Shade/Rent Cost**
- Input total rent and number of days
- Rent distributed based on animals present each day
- Dynamic rent calculation per animal

### 6. **Medicine Cost**
- Add individual medicine costs per animal
- Optional per-animal tracking

### 7. **Extra Costs**
- Add custom additional costs (labor, water, etc.)
- Distribute equally among all animals or custom selection

### 8. **Comprehensive Results**
- Per-animal total cost calculation
- Detailed cost breakdown for each animal
- Summary statistics (grand total, average per animal)

## How to Use

### Step 1: Initialize Animals
1. Go to the **Animals** tab
2. Enter the total number of animals
3. Click "Initialize Animals"
4. Enter purchase price for each animal individually, or
5. Enter a price in "Purchase Price per Animal" and click "Apply to All"
6. Set arrival day for each animal (if different from day 1)

### Step 2: Add Daily Feed Records
1. Go to the **Daily Feed** tab
2. For each day:
   - Enter day number
   - Enter number of animals present that day
   - Enter total feed cost for that day
   - Click "Add Daily Feed Record"
3. The system automatically calculates per-animal per-day cost

### Step 3: Manage Transport Costs
1. Go to the **Transport** tab
2. For each truck:
   - Enter Truck ID/Name
   - Enter total transport cost
   - Enter number of animals in that truck
   - Click "Add Transport Record"
3. Scroll down to assign each animal to a truck
4. Select the truck from the dropdown for each animal

### Step 4: Set Shade/Rent Cost
1. Go to the **Shade Rent** tab
2. Enter total rent/shade cost
3. Enter number of days
4. Click "Apply Rent Cost"
5. System shows calculation details

### Step 5: Add Medicine Costs (Optional)
1. Go to the **Medicine** tab
2. Select an animal
3. Enter medicine cost
4. Click "Add Medicine Cost"
5. Repeat for other animals

### Step 6: Add Extra Costs
1. Go to the **Extra Costs** tab
2. Enter cost description (e.g., "Labor", "Water")
3. Enter total amount
4. Choose distribution type:
   - **Equal among all animals**: Cost divided equally
   - **Custom selection**: Select specific animals
5. Click "Add Extra Cost"

### Step 7: View Results
1. Go to the **Results** tab
2. Click "Calculate Total Costs"
3. View:
   - Cost summary (grand total, average per animal)
   - Individual cost breakdown for each animal
   - Detailed cost composition

## Calculation Formula

For each animal, the total cost is calculated as:

```
Total Cost = 
  Purchase Price
  + Sum of daily feed costs (from arrival day onwards)
  + Transport share (truck cost / animals in truck)
  + Rent share (calculated per day based on animals present)
  + Medicine cost (if any)
  + Extra costs share
```

### Feed Cost Calculation
```
Per-Animal Feed = Sum of (Daily Total Feed / Animals Present) 
                  for days >= Arrival Day
```

### Rent Cost Calculation
```
Daily Rent = Total Rent / Number of Days
Per-Animal Daily Rent = Daily Rent / Animals Present That Day
Animal's Rent = Sum of Per-Animal Daily Rent for days >= Arrival Day
```

### Transport Cost
```
Per-Animal Transport = Truck Total Cost / Animals in Truck
```

## Example Workflow

### Scenario:
- 5 animals, purchase price 10,000 each
- Day 1: 5 animals, feed cost 2,500 (500 per animal)
- Day 2: 4 animals, feed cost 2,000 (500 per animal)
- 1 animal arrives on Day 2
- Rent: 5,000 for 2 days
- Transport: Truck A with 5 animals costing 2,500

### Animal #1 Total Cost:
- Purchase: 10,000
- Feed (Day 1 + Day 2): 500 + 500 = 1,000
- Transport: 2,500 / 5 = 500
- Rent (Day 1 + Day 2): (2,500/5) + (1,250/5) = 750
- **Total: 12,250**

### Animal #5 (arrives Day 2) Total Cost:
- Purchase: 10,000
- Feed (Day 2 only): 500
- Transport: 500
- Rent (Day 2 only): 2,500 / 4 = 625
- **Total: 11,625**

## Technical Details

### Data Structure
```javascript
calculatorData = {
    animals: [{id, purchasePrice, arrivalDay, medicineCost, truckId}],
    dailyFeeds: [{day, animalsPresent, totalCost, perAnimalCost}],
    animalGroups: [{id, animals, arrivalDay, days, animalDays}],
    transports: [{id, totalCost, animalsCount, perAnimalCost}],
    rentCost: {total, days},
    medicineCosts: {animalId: cost},
    extraCosts: [{description, amount, distribution, applicableTo}],
    animalTruckAssignment: {animalId: truckId},
    feedResults: [{groupId, animals, days, animalDays, perAnimalTotalCost}]
}
```

### Key Functions
- `initializeAnimals()` - Create animal records
- `addAnimalGroup()` - Add animal groups for feed calculation
- `calculateAnimalDays()` - Calculate total animal-days
- `calculateAnimalDaysCost()` - Calculate feed cost using animal-days method
- `calculateAnimalDaysFeedCostForAnimal()` - Get feed cost for individual animal
- `addTransport()` - Add truck/transport records
- `setRentCost()` - Set rent cost details
- `addMedicineCost()` - Add per-animal medicine cost
- `addExtraCost()` - Add extra costs
- `calculateAndDisplay()` - Main calculation function
- `calculateFeedCost()` - Calculate feed for animal
- `calculateRentCost()` - Calculate rent for animal
- `calculateExtraCostShare()` - Calculate extra cost share

## Browser Compatibility
- Chrome (recommended)
- Firefox
- Safari
- Edge
- Any modern browser with ES6 support

## Tips for Best Results

1. **Organize Data Entry**: Start from Animals → Feed → Transport → Rent → Medicine → Extra Costs → Results

2. **Accurate Daily Records**: Keep accurate daily feed records for precise calculations

3. **Arrival Days**: If all animals arrive on the same day, set it as day 1

4. **Truck Assignment**: Ensure all animals are assigned to trucks before calculating

5. **Review Before Calculating**: Review all entries for accuracy before clicking "Calculate Total Costs"

6. **Export Results**: Take screenshots of results or use browser print function to save calculations

## No Installation Required

Simply open `index.html` in any modern web browser. The entire application runs locally without needing internet or server setup.

## Features Implemented

✅ Animal purchase and initialization
✅ Dynamic daily feed tracking  
✅ Per-animal per-day feed cost calculation
✅ Animal arrival day tracking
✅ Transport cost allocation
✅ Shade/rent cost distribution
✅ Medicine cost tracking
✅ Extra costs (labor, water, etc.)
✅ Comprehensive results calculation
✅ Detailed cost breakdown
✅ Responsive UI design
✅ Form validation
✅ Data persistence during session

## Support & Notes

- All calculations are performed locally in your browser
- No data is sent to any server
- Data persists only during your browser session
- Refresh the page will clear all data (consider saving screenshots)

## Version
1.0 - Initial Release (May 2026)

---

**Developed for**: Ijtemai Qurbani Cost Management
**Purpose**: Accurate per-animal cost calculation in collective qurbani system
