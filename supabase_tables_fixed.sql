-- =====================================================
-- Supabase Schema for Ijtima-e-Qurbani Calculator
-- Tables: bookings, animals, trucks, transport assignments, feed_batches, expenses
-- =====================================================

-- 1) PROFILE TABLE FOR ADMIN ROLE CHECKS
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2) BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS bookings (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    booking_name TEXT NOT NULL,
    qurbani_date DATE NOT NULL,
    start_date DATE DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    total_animals INTEGER DEFAULT 0,
    total_cost NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3) ANIMALS TABLE
CREATE TABLE IF NOT EXISTS animals (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
    name TEXT,
    type TEXT NOT NULL CHECK (type IN ('goat', 'sheep', 'cow', 'buffalo', 'camel', 'other')),
    weight NUMERIC(10,2),
    arrival_date DATE NOT NULL,
    qurbani_date DATE NOT NULL,
    arrival_day INTEGER NOT NULL,
    purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    location TEXT,
    health_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4) TRUCKS TABLE
CREATE TABLE IF NOT EXISTS trucks (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    truck_name TEXT NOT NULL,
    total_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    expected_animal_count INTEGER NOT NULL DEFAULT 0,
    driver_name TEXT,
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5) ANIMAL TRANSPORT ASSIGNMENT TABLE
CREATE TABLE IF NOT EXISTS animal_transport_assignments (
    id BIGSERIAL PRIMARY KEY,
    animal_id BIGINT NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
    truck_id BIGINT NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (animal_id, truck_id)
);

-- 6) FEED BATCHES TABLE
CREATE TABLE IF NOT EXISTS feed_batches (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    day INTEGER NOT NULL CHECK (day >= 1),
    quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
    rate NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_cost NUMERIC(12,2) GENERATED ALWAYS AS (quantity * rate) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (booking_id, day)
);

-- 7) EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    animal_id BIGINT REFERENCES animals(id) ON DELETE CASCADE,
    expense_type TEXT NOT NULL CHECK (expense_type IN ('fixed', 'rent', 'medicine', 'extra')),
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    distribution_type TEXT NOT NULL DEFAULT 'equal' CHECK (distribution_type IN ('equal', 'animal_days', 'custom')),
    custom_animal_ids JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_animals_booking_id ON animals(booking_id);
CREATE INDEX IF NOT EXISTS idx_trucks_booking_id ON trucks(booking_id);
CREATE INDEX IF NOT EXISTS idx_feed_batches_booking_id ON feed_batches(booking_id);
CREATE INDEX IF NOT EXISTS idx_expenses_booking_id ON expenses(booking_id);
CREATE INDEX IF NOT EXISTS idx_expenses_animal_id ON expenses(animal_id);

-- ROW LEVEL SECURITY
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ANIMALS POLICIES
DROP POLICY IF EXISTS "Public read available animals" ON animals;
CREATE POLICY "Public read available animals" ON animals
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert animals" ON animals;
CREATE POLICY "Anyone can insert animals" ON animals
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update animals" ON animals;
CREATE POLICY "Anyone can update animals" ON animals
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can delete animals" ON animals;
CREATE POLICY "Admins can delete animals" ON animals
    FOR DELETE USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

-- TRUCKS POLICIES
DROP POLICY IF EXISTS "Booking owner can read trucks" ON trucks;
CREATE POLICY "Booking owner can read trucks" ON trucks
    FOR SELECT USING (
        booking_id IN (
            SELECT id FROM bookings WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Public read trucks" ON trucks;
CREATE POLICY "Public read trucks" ON trucks
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert trucks" ON trucks;
CREATE POLICY "Public insert trucks" ON trucks
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update trucks" ON trucks;
CREATE POLICY "Public update trucks" ON trucks
    FOR UPDATE USING (true);

-- EXPENSES POLICIES
DROP POLICY IF EXISTS "Booking owner can read expenses" ON expenses;
CREATE POLICY "Booking owner can read expenses" ON expenses
    FOR SELECT USING (
        booking_id IN (
            SELECT id FROM bookings WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Public read expenses" ON expenses;
CREATE POLICY "Public read expenses" ON expenses
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert expenses" ON expenses;
CREATE POLICY "Public insert expenses" ON expenses
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update expenses" ON expenses;
CREATE POLICY "Public update expenses" ON expenses
    FOR UPDATE USING (true);

-- BOOKINGS POLICIES
DROP POLICY IF EXISTS "Booking owner can read bookings" ON bookings;
CREATE POLICY "Booking owner can read bookings" ON bookings
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read bookings" ON bookings;
CREATE POLICY "Admins can read bookings" ON bookings
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

DROP POLICY IF EXISTS "Booking owner can insert bookings" ON bookings;
CREATE POLICY "Booking owner can insert bookings" ON bookings
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update bookings" ON bookings;
CREATE POLICY "Admins can update bookings" ON bookings
    FOR UPDATE USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Authenticated users can select their own profile" ON profiles;
CREATE POLICY "Authenticated users can select their own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can select all profiles" ON profiles;
CREATE POLICY "Admins can select all profiles" ON profiles
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
CREATE POLICY "Admins can update profiles" ON profiles
    FOR UPDATE USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );
