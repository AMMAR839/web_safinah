# Script ini membutuhkan pustaka supabase-py. Jika belum, instal dengan:
# pip install supabase

import os
from supabase import create_client, Client

# Ganti dengan URL dan API Key Supabase Anda
SUPABASE_URL = "https://jyjunbzusfrmaywmndpa.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5anVuYnp1c2ZybWF5d21uZHBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDMxMTgsImV4cCI6MjA2OTQxOTExOH0.IQ6yyyR2OpvQj1lIL1yFsWfVNhJIm2_EFt5Pnv4Bd38"

# Buat klien Supabase
client: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Data contoh untuk pelampung merah dan hijau
# Setiap dictionary adalah satu baris data
buoy_data = [
    {"latitude": -7.769450, "longitude": 110.383100, "color": "red"},
    {"latitude": -7.769280, "longitude": 110.383050, "color": "red"},
    {"latitude": -7.769300, "longitude": 110.383300, "color": "green"},
    {"latitude": -7.769500, "longitude": 110.383350, "color": "green"},
]

def insert_buoys_into_db():
    try:
        # Masukkan semua data pelampung ke tabel 'buoys'
        # Sintaks insert yang benar untuk supabase-py
        response = client.table('buoys').insert(buoy_data).execute()
        print("Data pelampung berhasil dimasukkan ke database.")

    except Exception as e:
        print(f"Terjadi kesalahan: {e}")

if __name__ == "__main__":
    insert_buoys_into_db()