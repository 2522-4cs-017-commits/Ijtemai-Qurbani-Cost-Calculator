-- =====================================================
-- IJTEMAI QURBANI CALCULATOR - SUPABASE SCHEMA
-- Comprehensive SQL Script for Database Setup
-- =====================================================

-- =====================================================
-- 1. USERS/PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES aauth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone_number TEXT,
    address TEXT,
    city TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. BOOKINGS TABLE (Main container for each Qurbani event)
-- =====================================================
CREATE TABLE IF NOT EXISTS bookings (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    booking_name TEXT NOT NULL,
    qurbani_date DATE NOT NULL,
    start_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    total_cost NUMERIC(12, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. ANIMALS TABLE (Individual animals in bookings)
-- =====================================================
CREATE TABLE IF NOT EXISTS animals (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('goat', 'sheep', 'cow', 'buffalo', 'camel')),
    weight NUMERIC(8, 2),
    arrival_date DATE NOT NULL,
    qurbani_date DATE NOT NULL,
    purchase_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
    location TEXT,
    health_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 4. DAILY FEEDS TABLE (Daily feed rates and quantities)
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_feeds (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    feed_date DATE NOT NULL,
    feed_type TEXT NOT NULL,
    quantity_kg NUMERIC(10, 2) NOT NULL,
    rate_per_kg NUMERIC(8, 2) NOT NULL,
    total_cost NUMERIC(12, 2) GENERATED ALWAYS AS (quantity_kg * rate_per_kg) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(booking_id, feed_date, feed_type)
);

-- =====================================================
-- 5. ANIMAL FEED ALLOCATION TABLE (Links animals to daily feeds)
-- =====================================================
CREATE TABLE IF NOT EXISTS animal_feed_allocation (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
    daily_feed_id BIGINT NOT NULL REFERENCES daily_feeds(id) ON DELETE CASCADE,
    allocated_quantity NUMERIC(8, 2) NOT NULL,
    -- Using a plain column instead of a generated column because
    -- Postgres does not allow subqueries in generated column expressions.
    -- The application or a trigger should compute this value when inserting/updating.
    allocated_cost NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(animal_id, daily_feed_id)
);

-- =====================================================
-- 6. TRANSPORTS TABLE (Trucks and transport details)
-- =====================================================
CREATE TABLE IF NOT EXISTS transports (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    truck_name TEXT NOT NULL,
    truck_capacity_kg NUMERIC(10, 2),
    total_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
    driver_name TEXT,
    phone_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 7. ANIMAL TRANSPORT ASSIGNMENT TABLE (Many-to-many)
-- =====================================================
CREATE TABLE IF NOT EXISTS animal_transport_assignment (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
    transport_id BIGINT NOT NULL REFERENCES transports(id) ON DELETE CASCADE,
    assigned_seat_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(animal_id, transport_id)
);

-- =====================================================
-- 8. FIXED COSTS TABLE (Costs divided equally among animals)
-- =====================================================
CREATE TABLE IF NOT EXISTS fixed_costs (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    distribution_type TEXT DEFAULT 'equal' CHECK (distribution_type IN ('equal', 'per_animal', 'custom')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 9. MEDICINE COSTS TABLE (Individual animal medicines)
-- =====================================================
CREATE TABLE IF NOT EXISTS medicine_costs (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    dosage TEXT,
    cost NUMERIC(8, 2) NOT NULL,
    date_given DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 10. EXTRA COSTS TABLE (Miscellaneous expenses)
-- =====================================================
CREATE TABLE IF NOT EXISTS extra_costs (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    animal_id BIGINT REFERENCES animals(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    cost_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 11. COST CALCULATIONS CACHE (Summary results)
-- =====================================================
CREATE TABLE IF NOT EXISTS cost_calculations (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    feed_cost NUMERIC(12, 2) DEFAULT 0,
    transport_cost NUMERIC(10, 2) DEFAULT 0,
    medicine_cost NUMERIC(10, 2) DEFAULT 0,
    fixed_cost_share NUMERIC(10, 2) DEFAULT 0,
    extra_cost_allocation NUMERIC(10, 2) DEFAULT 0,
    total_cost_per_animal NUMERIC(12, 2) GENERATED ALWAYS AS (
        COALESCE(feed_cost, 0) + COALESCE(transport_cost, 0) + 
        COALESCE(medicine_cost, 0) + COALESCE(fixed_cost_share, 0) + 
        COALESCE(extra_cost_allocation, 0)
    ) STORED,
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(animal_id, booking_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_qurbani_date ON bookings(qurbani_date);

CREATE INDEX idx_animals_booking_id ON animals(booking_id);
CREATE INDEX idx_animals_arrival_date ON animals(arrival_date);
CREATE INDEX idx_animals_qurbani_date ON animals(qurbani_date);

CREATE INDEX idx_daily_feeds_booking_id ON daily_feeds(booking_id);
CREATE INDEX idx_daily_feeds_feed_date ON daily_feeds(feed_date);

CREATE INDEX idx_animal_feed_allocation_animal_id ON animal_feed_allocation(animal_id);
CREATE INDEX idx_animal_feed_allocation_daily_feed_id ON animal_feed_allocation(daily_feed_id);

CREATE INDEX idx_animal_transport_assignment_animal_id ON animal_transport_assignment(animal_id);
CREATE INDEX idx_animal_transport_assignment_transport_id ON animal_transport_assignment(transport_id);

CREATE INDEX idx_fixed_costs_booking_id ON fixed_costs(booking_id);
CREATE INDEX idx_medicine_costs_animal_id ON medicine_costs(animal_id);
CREATE INDEX idx_extra_costs_booking_id ON extra_costs(booking_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_feed_allocation ENABLE ROW LEVEL SECURITY;
ALTER TABLE transports ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_transport_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_calculations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile" ON profiles
    FOR UPDATE USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- =====================================================
-- BOOKINGS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
CREATE POLICY "Users can view their own bookings" ON bookings
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
CREATE POLICY "Admins can view all bookings" ON bookings
    FOR SELECT USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Authenticated users can create bookings" ON bookings;
CREATE POLICY "Authenticated users can create bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;
CREATE POLICY "Users can update their own bookings" ON bookings
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update any booking" ON bookings;
CREATE POLICY "Admins can update any booking" ON bookings
    FOR UPDATE USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- =====================================================
-- ANIMALS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Everyone can view animals from accessible bookings" ON animals;
CREATE POLICY "Everyone can view animals from accessible bookings" ON animals
    FOR SELECT USING (
        booking_id IN (
            SELECT id FROM bookings 
            WHERE user_id = auth.uid() 
            OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
        )
    );

DROP POLICY IF EXISTS "Anyone can insert animals" ON animals;
CREATE POLICY "Anyone can insert animals" ON animals
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update animals" ON animals;
CREATE POLICY "Anyone can update animals" ON animals
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can update any animal" ON animals;
CREATE POLICY "Admins can update any animal" ON animals
    FOR UPDATE USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- =====================================================
-- DAILY FEEDS POLICIES
-- =====================================================
CREATE POLICY "Users can view feeds for their bookings" ON daily_feeds
    FOR SELECT USING (
        booking_id IN (
            SELECT id FROM bookings 
            WHERE user_id = auth.uid() 
            OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
        )
    );

CREATE POLICY "Users can insert feeds in their bookings" ON daily_feeds
    FOR INSERT WITH CHECK (
        booking_id IN (
            SELECT id FROM bookings WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update feeds in their bookings" ON daily_feeds
    FOR UPDATE USING (
        booking_id IN (
            SELECT id FROM bookings WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- ANIMAL FEED ALLOCATION POLICIES
-- =====================================================
CREATE POLICY "Users can view allocations for their animals" ON animal_feed_allocation
    FOR SELECT USING (
        animal_id IN (
            SELECT id FROM animals WHERE booking_id IN (
                SELECT id FROM bookings WHERE user_id = auth.uid()
                OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
            )
        )
    );

CREATE POLICY "Users can manage allocations for their animals" ON animal_feed_allocation
    FOR INSERT WITH CHECK (
        animal_id IN (
            SELECT id FROM animals WHERE booking_id IN (
                SELECT id FROM bookings WHERE user_id = auth.uid()
            )
        )
    );

-- =====================================================
-- TRANSPORTS POLICIES
-- =====================================================
CREATE POLICY "Users can view transports for their bookings" ON transports
    FOR SELECT USING (
        booking_id IN (
            SELECT id FROM bookings 
            WHERE user_id = auth.uid() 
            OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can insert transports in their bookings" ON transports;
CREATE POLICY "Users can insert transports in their bookings" ON transports
    FOR INSERT WITH CHECK (
        booking_id IN (
            SELECT id FROM bookings WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update transports in their bookings" ON transports;
CREATE POLICY "Users can update transports in their bookings" ON transports
    FOR UPDATE USING (
        booking_id IN (
            SELECT id FROM bookings WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- ANIMAL TRANSPORT ASSIGNMENT POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can manage assignments for their animals" ON animal_transport_assignment;
CREATE POLICY "Users can manage assignments for their animals" ON animal_transport_assignment
    FOR INSERT WITH CHECK (
        animal_id IN (
            SELECT id FROM animals WHERE booking_id IN (
                SELECT id FROM bookings WHERE user_id = auth.uid()
            )
        )
    );

-- =====================================================
-- FIXED COSTS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view fixed costs for their bookings" ON fixed_costs;
CREATE POLICY "Users can view fixed costs for their bookings" ON fixed_costs
    FOR SELECT USING (
        booking_id IN (
            SELECT id FROM bookings 
            WHERE user_id = auth.uid() 
            OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can insert fixed costs in their bookings" ON fixed_costs;
CREATE POLICY "Users can insert fixed costs in their bookings" ON fixed_costs
    FOR INSERT WITH CHECK (
        booking_id IN (
            SELECT id FROM bookings WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update fixed costs in their bookings" ON fixed_costs;
CREATE POLICY "Users can update fixed costs in their bookings" ON fixed_costs
    FOR UPDATE USING (
        booking_id IN (
            SELECT id FROM bookings WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- MEDICINE COSTS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view medicine costs for their animals" ON medicine_costs;
CREATE POLICY "Users can view medicine costs for their animals" ON medicine_costs
    FOR SELECT USING (
        animal_id IN (
            SELECT id FROM animals WHERE booking_id IN (
                SELECT id FROM bookings WHERE user_id = auth.uid()
                OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
            )
        )
    );

DROP POLICY IF EXISTS "Users can insert medicine costs for their animals" ON medicine_costs;
CREATE POLICY "Users can insert medicine costs for their animals" ON medicine_costs
    FOR INSERT WITH CHECK (
        animal_id IN (
            SELECT id FROM animals WHERE booking_id IN (
                SELECT id FROM bookings WHERE user_id = auth.uid()
            )
        )
    );

-- =====================================================
-- EXTRA COSTS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view extra costs for their bookings" ON extra_costs;
CREATE POLICY "Users can view extra costs for their bookings" ON extra_costs
    FOR SELECT USING (
        booking_id IN (
            SELECT id FROM bookings 
            WHERE user_id = auth.uid() 
            OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can insert extra costs in their bookings" ON extra_costs;
CREATE POLICY "Users can insert extra costs in their bookings" ON extra_costs
    FOR INSERT WITH CHECK (
        booking_id IN (
            SELECT id FROM bookings WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- COST CALCULATIONS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view calculations for their animals" ON cost_calculations;
CREATE POLICY "Users can view calculations for their animals" ON cost_calculations
    FOR SELECT USING (
        animal_id IN (
            SELECT id FROM animals WHERE booking_id IN (
                SELECT id FROM bookings WHERE user_id = auth.uid()
                OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
            )
        )
    );

-- =====================================================
-- END OF SCHEMA
-- =====================================================
-- =====================================================
-- Make animals.booking_id nullable (run after schema)
-- This allows inserting animals without an existing booking_id.
ALTER TABLE animals ALTER COLUMN booking_id DROP NOT NULL;

