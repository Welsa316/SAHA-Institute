import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://atenbwtiyeaqiwtpmynr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZW5id3RpeWVhcWl3dHBteW5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzIzODYsImV4cCI6MjA4ODM0ODM4Nn0.4-i1m1a7NVi6PV5UybgaCX9RarKkeYuXwbkoaJMRJd4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
