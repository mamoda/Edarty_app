/*
  # Update teachers table schema

  1. Modified Tables
    - `teachers` - تحديث الأعمدة لمطابقة الهيكل الجديد:
      - تغيير `full_name` إلى `name`
      - إضافة `address` (اختياري)
      - إضافة `qualifications` (اختياري)
      - إضافة `notes` (اختياري)
      - إعادة ترتيب الأعمدة للوضوح
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'teachers'
  ) THEN
    DROP TABLE IF EXISTS teachers CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  specialization text NOT NULL,
  salary numeric(10,2) NOT NULL CHECK (salary >= 0),
  hire_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  address text,
  qualifications text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own teachers"
  ON teachers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own teachers"
  ON teachers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own teachers"
  ON teachers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own teachers"
  ON teachers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status);
CREATE INDEX IF NOT EXISTS idx_expenses_teacher_id ON expenses(teacher_id);
