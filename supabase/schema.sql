-- =============================================
-- EXCAVATION PERMIT MANAGEMENT SYSTEM
-- Supabase PostgreSQL Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. USER PROFILES TABLE
-- =============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 2. SCHEMA FIELDS TABLE (Dynamic Custom Fields)
-- =============================================
CREATE TABLE schema_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'checkbox', 'select', 'attachments')),
  options JSONB DEFAULT '[]',  -- For select dropdowns: ["Option 1", "Option 2"]
  required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. PERMITS TABLE
-- =============================================
CREATE TABLE permits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  permit_number TEXT UNIQUE,
  pre_permit_number TEXT,
  location TEXT NOT NULL,
  contractor TEXT,  -- Made nullable
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'pending',  -- No constraint, managed by status_options table
  custom_fields JSONB DEFAULT '{}',  -- Dynamic fields: {"field_key": "value"}
  file_urls TEXT[] DEFAULT '{}',     -- Cloudinary URLs
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster searches
CREATE INDEX idx_permits_status ON permits(status);
CREATE INDEX idx_permits_contractor ON permits(contractor);
CREATE INDEX idx_permits_location ON permits(location);
CREATE INDEX idx_permits_created_at ON permits(created_at DESC);

-- =============================================
-- 4. STATUS OPTIONS TABLE (Dynamic Status Management)
-- =============================================
CREATE TABLE status_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  color TEXT DEFAULT 'gray',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default statuses
INSERT INTO status_options (status_key, label, color, sort_order) VALUES
  ('pending', 'Pending', 'amber', 0),
  ('approved', 'Approved', 'green', 1),
  ('denied', 'Denied', 'red', 2),
  ('completed', 'Completed', 'blue', 3);

-- =============================================
-- 5. ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_options ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
-- Users can view all profiles
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Super admins can update any profile
CREATE POLICY "Super admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- SCHEMA FIELDS POLICIES
-- All authenticated users can view schema fields
CREATE POLICY "Authenticated users can view schema fields"
  ON schema_fields FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only super admins can manage schema fields
CREATE POLICY "Super admins can insert schema fields"
  ON schema_fields FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update schema fields"
  ON schema_fields FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete schema fields"
  ON schema_fields FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- STATUS OPTIONS POLICIES
-- All authenticated users can view status options
CREATE POLICY "Authenticated users can view status options"
  ON status_options FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only super admins can manage status options
CREATE POLICY "Super admins can insert status options"
  ON status_options FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update status options"
  ON status_options FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete status options"
  ON status_options FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- PERMITS POLICIES
-- All authenticated users can view permits
CREATE POLICY "Authenticated users can view permits"
  ON permits FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Staff can create permits
CREATE POLICY "Staff can create permits"
  ON permits FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update permits they created
CREATE POLICY "Users can update own permits"
  ON permits FOR UPDATE
  USING (created_by = auth.uid());

-- Super admins can update any permit
CREATE POLICY "Super admins can update any permit"
  ON permits FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Super admins can delete permits
CREATE POLICY "Super admins can delete permits"
  ON permits FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- =============================================
-- 5. HELPER FUNCTIONS
-- =============================================

-- Function to generate permit number
CREATE OR REPLACE FUNCTION generate_permit_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  seq_part TEXT;
  new_number TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  SELECT LPAD((COUNT(*) + 1)::TEXT, 5, '0')
  INTO seq_part
  FROM permits
  WHERE permit_number LIKE 'EXC-' || year_part || '-%';
  
  new_number := 'EXC-' || year_part || '-' || seq_part;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schema_fields_updated_at
  BEFORE UPDATE ON schema_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permits_updated_at
  BEFORE UPDATE ON permits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 6. APP SETTINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settings" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Super admins can update settings" ON app_settings FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));
CREATE POLICY "Super admins can insert settings" ON app_settings FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));

-- Default settings
INSERT INTO app_settings (key, value) VALUES 
    ('registration_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- 7. SEED DATA (Optional - for first super admin)
-- =============================================
-- After your first user signs up, run this to make them super admin:
-- UPDATE profiles SET role = 'super_admin' WHERE email = 'your-email@example.com';
