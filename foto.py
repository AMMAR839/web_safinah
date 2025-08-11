# Script ini membutuhkan pustaka supabase-py dan ultralytics
# pip install supabase ultralytics opencv-python

import os
import cv2
from ultralytics import YOLO
from supabase import create_client, Client
import datetime
import random

# --- Pengaturan Supabase ---
SUPABASE_URL = "https://jyjunbzusfrmaywmndpa.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5anVuYnp1c2ZybWF5d21uZHBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDMxMTgsImV4cCI6MjA2OTQxOTExOH0.IQ6yyyR2OpvQj1lIL1yFsWfVNhJIm2_EFt5Pnv4Bd38"
client: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# --- Load Model YOLO ---
model = YOLO('hijau.pt')

# --- Buka Kamera ---
cap = cv2.VideoCapture(1)
if not cap.isOpened():
    print("❌ Error: Tidak dapat membuka kamera/video.")
    exit()

# --- Pengaturan ---
frame_count = 0
detection_interval = 10  # Deteksi setiap 10 frame
save_image_interval = 30  # Simpan gambar setiap 30 frame
last_detection_time = datetime.datetime.now()

# --- Proses Frame ---
while cap.isOpened():
    ret, frame1 = cap.read()
    if not ret:
        print("❌ Tidak ada frame. Keluar.")
        break
    
    frame = cv2.resize(frame1, (640, 480))
    frame_count += 1
    
    # Lakukan deteksi objek
    results = model(frame, conf=0.5, verbose=False)
    
    # --- Kondisi Pengiriman ke Supabase ---
    # Jika ada objek terdeteksi dan sudah waktunya untuk menyimpan gambar
    if len(results[0].boxes) > 0 and frame_count % save_image_interval == 0:
        
        try:
            # Dapatkan metadata dari deteksi pertama (contoh)
            first_detection = results[0].boxes[0]
            confidence = float(first_detection.conf[0])
            object_name = model.names[int(first_detection.cls[0])]

            # Simulasikan pengambilan data navigasi terbaru
            latest_nav_data = {
                "latitude": random.uniform(-7.7695, -7.7692),
                "longitude": random.uniform(110.3828, 110.3832),
                "sog_ms": random.uniform(5, 10),
                "cog": random.uniform(0, 360)
            }

            # Simpan frame sebagai file gambar sementara
            image_filename = f"detection_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
            cv2.imwrite(image_filename, frame)

            # Unggah foto ke Supabase Storage
            with open(image_filename, 'rb') as f:
                client.storage.from_("mission_images").upload(image_filename, f.read(), {'content-type': 'image/jpeg'})
            
            public_url = f"{SUPABASE_URL}/storage/v1/object/public/mission_images/{image_filename}"
            
            # Masukkan metadata ke tabel 'gambar_atas'
            data_to_insert = {
                "image_url": public_url,
                "image_slot_name": "kamera_atas", # Tentukan slot kamera
                "latitude": latest_nav_data["latitude"],
                "longitude": latest_nav_data["longitude"],
                "sog_kmh": latest_nav_data["sog_ms"] * 3.6,
                "sog_knots": latest_nav_data["sog_ms"] * 1.94384,
                "cog": latest_nav_data["cog"],
                "timestamp": datetime.datetime.now().isoformat()
            }
            
            client.table('gambar_atas').insert(data_to_insert).execute()
            print(f"✅ Foto dengan deteksi '{object_name}' berhasil diunggah.")
            
            os.remove(image_filename) # Hapus file sementara
            
        except Exception as e:
            print(f"Terjadi kesalahan saat mengirim data ke Supabase: {e}")

    # Tampilkan frame dengan hasil deteksi (opsional)
    annotated_frame = results[0].plot()
    cv2.imshow("YOLOv8 Deteksi", annotated_frame)
    
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()