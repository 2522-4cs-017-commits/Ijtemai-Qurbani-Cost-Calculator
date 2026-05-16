import supabase from './supabaseClient';

const TOTAL_DAYS = 30;

export type BookingFormData = {
    userId: string;
    bookingName: string;
    qurbaniDate: string;
    startDate?: string;
    status?: 'active' | 'completed' | 'cancelled';
};

export type AnimalFormData = {
    bookingId: number;
    name?: string;
    type: 'goat' | 'sheep' | 'cow' | 'buffalo' | 'camel' | 'other';
    arrivalDate: string;
    qurbaniDate: string;
    purchasePrice: number;
    weight?: number;
    location?: string;
    healthNotes?: string;
};

export type TruckFormData = {
    bookingId: number;
    truckName: string;
    totalCost: number;
    expectedAnimalCount: number;
    driverName?: string;
    phoneNumber?: string;
};

export type ExpenseFormData = {
    bookingId: number;
    animalId?: number;
    expenseType: 'fixed' | 'rent' | 'medicine' | 'extra';
    description: string;
    amount: number;
    distributionType: 'equal' | 'animal_days' | 'custom';
    customAnimalIds?: number[];
};

export type FeedBatchFormData = {
    bookingId: number;
    day: number;
    quantity: number;
    rate: number;
};

function roundToTwo(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${value}`);
    }
    return date;
}

export function calculateArrivalDay(arrivalDate: string, qurbaniDate: string) {
    const arrival = parseDate(arrivalDate);
    const qurbani = parseDate(qurbaniDate);
    const diffMs = qurbani.getTime() - arrival.getTime();
    const daysDiff = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const arrivalDay = TOTAL_DAYS - daysDiff + 1;
    if (arrivalDay < 1 || arrivalDay > TOTAL_DAYS) {
        throw new Error('Arrival date is outside the allowed 30-day window.');
    }
    return arrivalDay;
}

export async function createBooking(formData: BookingFormData) {
    const payload = {
        user_id: formData.userId,
        booking_name: formData.bookingName,
        qurbani_date: formData.qurbaniDate,
        start_date: formData.startDate ?? formData.qurbaniDate,
        status: formData.status ?? 'active'
    };

    const { data, error } = await supabase.from('bookings').insert(payload).select('*');
    if (error) throw error;
    return data?.[0] || null;
}

export async function createAnimal(formData: AnimalFormData) {
    const arrivalDay = calculateArrivalDay(formData.arrivalDate, formData.qurbaniDate);
    const payload = {
        booking_id: formData.bookingId,
        name: formData.name ?? null,
        type: formData.type,
        arrival_date: formData.arrivalDate,
        qurbani_date: formData.qurbaniDate,
        arrival_day: arrivalDay,
        purchase_price: roundToTwo(formData.purchasePrice),
        weight: formData.weight ?? null,
        location: formData.location ?? null,
        health_notes: formData.healthNotes ?? null
    };

    const { data, error } = await supabase.from('animals').insert(payload).select('*');
    if (error) throw error;
    return data?.[0] || null;
}

export async function createTruck(formData: TruckFormData) {
    const payload = {
        booking_id: formData.bookingId,
        truck_name: formData.truckName,
        total_cost: roundToTwo(formData.totalCost),
        expected_animal_count: formData.expectedAnimalCount,
        driver_name: formData.driverName ?? null,
        phone_number: formData.phoneNumber ?? null
    };

    const { data, error } = await supabase.from('trucks').insert(payload).select('*');
    if (error) throw error;
    return data?.[0] || null;
}

export async function createExpense(formData: ExpenseFormData) {
    const payload = {
        booking_id: formData.bookingId,
        animal_id: formData.animalId ?? null,
        expense_type: formData.expenseType,
        description: formData.description,
        amount: roundToTwo(formData.amount),
        distribution_type: formData.distributionType,
        custom_animal_ids: formData.customAnimalIds ?? null
    };

    const { data, error } = await supabase.from('expenses').insert(payload).select('*');
    if (error) throw error;
    return data?.[0] || null;
}

export async function createFeedBatch(formData: FeedBatchFormData) {
    const payload = {
        booking_id: formData.bookingId,
        day: formData.day,
        quantity: roundToTwo(formData.quantity),
        rate: roundToTwo(formData.rate)
    };

    const { data, error } = await supabase.from('feed_batches').insert(payload).select('*');
    if (error) throw error;
    return data?.[0] || null;
}

export async function createAnimalTransportAssignment(animalId: number, truckId: number) {
    const payload = {
        animal_id: animalId,
        truck_id: truckId
    };

    const { data, error } = await supabase.from('animal_transport_assignments').insert(payload).select('*');
    if (error) throw error;
    return data?.[0] || null;
}

export async function fetchAnimals(bookingId: number) {
    const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('booking_id', bookingId)
        .order('id', { ascending: true });
    if (error) throw error;
    return data || [];
}

export async function fetchTrucks(bookingId: number) {
    const { data, error } = await supabase
        .from('trucks')
        .select('*')
        .eq('booking_id', bookingId)
        .order('id', { ascending: true });
    if (error) throw error;
    return data || [];
}

export async function fetchExpenses(bookingId: number) {
    const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('booking_id', bookingId)
        .order('id', { ascending: true });
    if (error) throw error;
    return data || [];
}

export async function fetchFeedBatches(bookingId: number) {
    const { data, error } = await supabase
        .from('feed_batches')
        .select('*')
        .eq('booking_id', bookingId)
        .order('day', { ascending: true });
    if (error) throw error;
    return data || [];
}

export async function fetchAssignments(bookingId: number) {
    const trucks = await fetchTrucks(bookingId);
    if (trucks.length === 0) {
        return [];
    }

    const truckIds = trucks.map((truck) => truck.id);
    const { data, error } = await supabase
        .from('animal_transport_assignments')
        .select('*')
        .in('truck_id', truckIds);

    if (error) throw error;
    return data || [];
}

function buildAnimalGroups(animals: any[]) {
    const groups: Record<number, { arrivalDay: number; animalsCount: number; days: number }> = {};

    animals.forEach((animal) => {
        const arrivalDay = animal.arrival_day;
        const days = TOTAL_DAYS - arrivalDay + 1;
        if (!groups[arrivalDay]) {
            groups[arrivalDay] = { arrivalDay, animalsCount: 0, days };
        }
        groups[arrivalDay].animalsCount += 1;
    });

    return Object.values(groups);
}

function buildFeedPeriods(feedBatches: any[]) {
    const sorted = [...feedBatches].sort((a, b) => a.day - b.day || a.id - b.id);

    return sorted
        .map((batch, index) => {
            const nextBatch = sorted[index + 1];
            const startDay = batch.day;
            const endDay = nextBatch ? Math.min(nextBatch.day - 1, TOTAL_DAYS) : TOTAL_DAYS;
            const duration = Math.max(0, endDay - startDay + 1);
            return {
                startDay,
                endDay,
                totalCost: Number(batch.total_cost),
                duration
            };
        })
        .filter((period) => period.duration > 0 && period.startDay <= TOTAL_DAYS);
}

function getGroupDaysInPeriod(group: any, period: any) {
    const start = Math.max(period.startDay, group.arrivalDay);
    const end = Math.min(period.endDay, TOTAL_DAYS);
    return Math.max(0, end - start + 1);
}

export function calculateFeedDistribution(animals: any[], feedBatches: any[]) {
    if (feedBatches.length === 0) {
        return { results: [], grandTotal: 0, averagePerAnimalCost: 0 };
    }

    const groups = buildAnimalGroups(animals);
    const periods = buildFeedPeriods(feedBatches);
    const totalFeedCost = roundToTwo(feedBatches.reduce((sum, batch) => sum + Number(batch.total_cost), 0));
    const totalAnimals = animals.length;

    const groupResults = groups.map((group) => ({
        arrivalDay: group.arrivalDay,
        animals: group.animalsCount,
        totalDaysPresent: 0,
        totalAnimalDays: 0,
        groupCost: 0,
        perAnimalTotalCost: 0
    }));

    periods.forEach((period) => {
        const periodInfo = groups.map((group) => {
            const daysPresent = getGroupDaysInPeriod(group, period);
            const animalDays = group.animalsCount * daysPresent;
            return { group, daysPresent, animalDays };
        });

        const totalPeriodAnimalDays = periodInfo.reduce((sum, item) => sum + item.animalDays, 0);
        if (totalPeriodAnimalDays === 0) return;

        const periodRate = period.totalCost / totalPeriodAnimalDays;
        periodInfo.forEach((item) => {
            if (item.animalDays === 0) return;
            const groupResult = groupResults.find((result) => result.arrivalDay === item.group.arrivalDay);
            if (!groupResult) return;

            groupResult.totalDaysPresent += item.daysPresent;
            groupResult.totalAnimalDays += item.animalDays;
            groupResult.groupCost += periodRate * item.animalDays;
            groupResult.perAnimalTotalCost += periodRate * item.daysPresent;
        });
    });

    const results = groupResults.map((result) => ({
        ...result,
        groupCost: roundToTwo(result.groupCost),
        perAnimalTotalCost: roundToTwo(result.perAnimalTotalCost),
        totalAnimalDays: roundToTwo(result.totalAnimalDays)
    }));

    const grandTotal = roundToTwo(results.reduce((sum, result) => sum + result.groupCost, 0));
    const averagePerAnimalCost = totalAnimals > 0 ? roundToTwo(totalFeedCost / totalAnimals) : 0;

    return { results, grandTotal, averagePerAnimalCost, totalFeedCost };
}

function findGroupForAnimal(animal: any, groups: any[]) {
    return groups.find((group) => group.arrivalDay === animal.arrival_day) || null;
}

export function calculateTransportCost(animalId: number, trucks: any[], assignments: any[]) {
    const assignment = assignments.find((item) => item.animal_id === animalId);
    if (!assignment) return 0;
    const truck = trucks.find((item) => item.id === assignment.truck_id);
    if (!truck) return 0;

    const assignedAnimals = assignments.filter((item) => item.truck_id === truck.id).length;
    if (assignedAnimals > 0) {
        return roundToTwo(Number(truck.total_cost) / assignedAnimals);
    }
    return 0;
}

function calculateTotalAnimalDays(groups: any[]) {
    return groups.reduce((sum, group) => sum + group.animalsCount * group.days, 0);
}

function calculateFixedCostShare(expenses: any[], totalAnimals: number) {
    if (totalAnimals === 0) return 0;
    const fixedTotal = expenses
        .filter((expense) => expense.expense_type === 'fixed')
        .reduce((sum, expense) => sum + Number(expense.amount), 0);
    return roundToTwo(fixedTotal / totalAnimals);
}

function calculateRentCostForAnimal(animal: any, groups: any[], expenses: any[]) {
    const rentTotal = expenses
        .filter((expense) => expense.expense_type === 'rent')
        .reduce((sum, expense) => sum + Number(expense.amount), 0);
    if (rentTotal === 0) return 0;

    const group = findGroupForAnimal(animal, groups);
    if (!group) return 0;

    const totalAnimalDays = calculateTotalAnimalDays(groups);
    if (totalAnimalDays === 0) return 0;

    return roundToTwo((rentTotal * (group.days ?? 0)) / totalAnimalDays);
}

function calculateMedicineCostForAnimal(animalId: number, expenses: any[]) {
    return roundToTwo(
        expenses
            .filter((expense) => expense.expense_type === 'medicine' && expense.animal_id === animalId)
            .reduce((sum, expense) => sum + Number(expense.amount), 0)
    );
}

function calculateExtraCostForAnimal(animal: any, animals: any[], groups: any[], expenses: any[]) {
    const group = findGroupForAnimal(animal, groups);
    if (!group) return 0;

    const totalAnimalDays = calculateTotalAnimalDays(groups);
    if (totalAnimalDays === 0) return 0;

    let totalExtra = 0;

    expenses
        .filter((expense) => expense.expense_type === 'extra')
        .forEach((expense) => {
            if (expense.distribution_type === 'equal') {
                totalExtra += (Number(expense.amount) * group.days) / totalAnimalDays;
            } else if (expense.distribution_type === 'animal_days') {
                totalExtra += (Number(expense.amount) * group.days) / totalAnimalDays;
            } else if (expense.distribution_type === 'custom' && expense.custom_animal_ids) {
                const customIds: number[] = Array.isArray(expense.custom_animal_ids)
                    ? expense.custom_animal_ids
                    : JSON.parse(expense.custom_animal_ids);
                if (!customIds.includes(animal.id)) return;
                const selectedAnimals = animals.filter((item) => customIds.includes(item.id));
                const selectedAnimalDays = selectedAnimals.reduce((sum, selected) => {
                    const selectedGroup = findGroupForAnimal(selected, groups);
                    return sum + (selectedGroup ? selectedGroup.days : 0);
                }, 0);
                if (selectedAnimalDays === 0) return;
                totalExtra += (Number(expense.amount) * group.days) / selectedAnimalDays;
            }
        });

    return roundToTwo(totalExtra);
}

export async function fetchCostBreakdown(bookingId: number) {
    const [animals, trucks, expenses, feedBatches, assignments] = await Promise.all([
        fetchAnimals(bookingId),
        fetchTrucks(bookingId),
        fetchExpenses(bookingId),
        fetchFeedBatches(bookingId),
        fetchAssignments(bookingId)
    ]);

    const groups = buildAnimalGroups(animals);
    const feedResults = calculateFeedDistribution(animals, feedBatches);
    const fixedCostShare = calculateFixedCostShare(expenses, animals.length);

    const animalResults = animals.map((animal) => {
        const group = findGroupForAnimal(animal, groups);
        const feedCost = feedResults.results.find((result) => result.arrivalDay === animal.arrival_day)?.perAnimalTotalCost ?? 0;
        const transportCost = calculateTransportCost(animal.id, trucks, assignments);
        const rentCost = calculateRentCostForAnimal(animal, groups, expenses);
        const medicineCost = calculateMedicineCostForAnimal(animal.id, expenses);
        const extraCost = calculateExtraCostForAnimal(animal, animals, groups, expenses);

        const totalCost = roundToTwo(
            Number(animal.purchase_price) +
            feedCost +
            transportCost +
            rentCost +
            medicineCost +
            fixedCostShare +
            extraCost
        );

        return {
            animal,
            feedCost,
            transportCost,
            rentCost,
            medicineCost,
            fixedCostShare,
            extraCost,
            totalCost
        };
    });

    return {
        animals: animalResults,
        feed: feedResults,
        totalFixedCostPerAnimal: fixedCostShare,
        grandTotal: roundToTwo(animalResults.reduce((sum, item) => sum + item.totalCost, 0))
    };
}
