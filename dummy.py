# Script ini membutuhkan pustaka supabase-py. Jika belum, instal dengan:
# pip install supabase

import os
from supabase import create_client, Client

# Ganti dengan URL dan API Key Supabase Anda
SUPABASE_URL = "https://jyjunbzusfrmaywmndpa.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5anVuYnp1c2ZybWF5d21uZHBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDMxMTgsImV4cCI6MjA2OTQxOTExOH0.IQ6yyyR2OpvQj1lIL1yFsWfVNhJIm2_EFt5Pnv4Bd38"

client: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def send_photo_to_supabase(file_path, camera_slot):
    try:
        # 1. Unggah foto ke Supabase Storage
        file_name = os.path.basename(file_path)
        with open(file_path, 'rb') as f:
            response = client.storage.from_("missionimages").upload(file_name, f.read(), {'content-type': 'image/jpeg'})
        
        # Dapatkan URL publik dari foto yang diunggah
        public_url = client.storage.from_("missionimages").get_public_url(file_name)
        
        # 2. Masukkan data ke tabel 'gambar_atas'
        data_to_insert = {
            "image_url": public_url,
            "image_slot_name": camera_slot
        }
        
        response = client.table('image_mission').insert(data_to_insert).execute()
        print(f"Foto dari {camera_slot} berhasil diunggah dan disimpan.")
        
    except Exception as e:
        print(f"Terjadi kesalahan: {e}")

if __name__ == "__main__":
    # Contoh: Panggil fungsi untuk kamera atas
    # Pastikan file foto 'foto_kamera_atas.jpg' ada di direktori yang sama
    # send_photo_to_supabase('foto_kamera_atas.jpg', 'kamera_atas')
    
    # Contoh: Panggil fungsi untuk kamera bawah
    # send_photo_to_supabase('foto_kamera_bawah.jpg', 'kamera_bawah')
    
    # Untuk contoh ini, saya akan membuat file dummy
    with open('dummy_atas.jpg', 'w') as f:
        f.write("dummy content")
    
    send_photo_to_supabase('image.png', 'kamera_atas')
