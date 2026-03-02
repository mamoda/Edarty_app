/*
  # Create teachers table

  1. New Tables
    - `teachers`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `full_name` (text) - اسم المعلم
      - `specialization` (text) - التخصص
      - `phone` (text) - رقم الهاتف
      - `email` (text) - البريد الإلكتروني
      - `hire_date` (date) - تاريخ التعيين
      - `salary` (numeric) - الراتب الشهري
      - `status` (text) - active/inactive
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Modified Tables
    - `expenses` - إضافة عمود `teacher_id` اختياري

  3. Security
    - Enable RLS on `teachers` table
    - Add policies for authenticated users to manage their own teachers data
*/

CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  full_name text NOT NULL,
  specialization text NOT NULL,
  phone text NOT NULL,
  email text,
  hire_date date DEFAULT CURRENT_DATE,
  salary numeric(10,2) NOT NULL CHECK (salary >= 0),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'teacher_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN teacher_id uuid REFERENCES teachers ON DELETE SET NULL;
  END IF;
END $$;

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
