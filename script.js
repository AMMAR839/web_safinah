// Ganti dengan Project URL dan anon public key Anda
const supabaseClient_URL = 'https://jyjunbzusfrmaywmndpa.supabase.co';
const supabaseClient_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5anVuYnp1c2ZybWF5d21uZHBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDMxMTgsImV4cCI6MjA2OTQxOTExOH0.IQ6yyyR2OpvQj1lIL1yFsWfVNhJIm2_EFt5Pnv4Bd38';
// Dapatkan semua tombol dengan class 'tombol-lintasan'
const tombolLintasan = document.querySelectorAll('.tombol-lintasan');
// Inisialisasi klien supabaseClient
const supabaseClient = supabase.createClient(supabaseClient_URL, supabaseClient_ANON_KEY);

let map = L.map('map').setView([-7.769356, 110.383056], 22);

// Tambahkan peta dasar dari OpenStreetMap
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
    maxZoom: 25,
    minZoom: 20,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);


let getBounds = [];

// map.setMaxBounds(getBounds);
// map.fitBounds(getBounds); 


// Variabel untuk visualisasi lintasan & kapal
let missionPath = null;
let latestPosition = null; 
let MAP_UPDATE_INTERVAL = 2500; // Interval pembaruan peta dalam milidetik
let lastMapUpdate = 0; // Waktu terakhir peta diperbarui
let currentPositionMarker = null; // Marker untuk posisi kapal
const trackCoordinates = []; // Array untuk menyimpan koordinat lintasan
// Perubahan lintang dan bujur untuk 12.5 meter
const deltaLat = 0.0001125; 
const deltaLon = 0.000113;

const shipIcon = L.icon({
    // URL gambar ikon kapal
    iconUrl: 'kapal.png',
    
    // Ukuran ikon dalam piksel
    iconSize: [38, 38], 
    
    // Titik jangkar ikon yang akan menempel pada koordinat
    iconAnchor: [19, 19], 
    
    // Titik di mana popup akan muncul di atas ikon
    popupAnchor: [0, -19]
});

// Fungsi untuk menentukan arah (N/S, E/W)
function getCardinalDirection(value, type) {
    if (type === 'lat') {
        return value >= 0 ? 'N' : 'S';
    } else if (type === 'lon') {
        return value >= 0 ? 'E' : 'W';
    }
    return '';
}


// Fungsi untuk format A: Degree, Decimal (DD,DDDD)
function formatA(lat, lon) {
    const latDirection = getCardinalDirection(lat, 'lat');
    const lonDirection = getCardinalDirection(lon, 'lon');
    const absLat = Math.abs(lat).toFixed(6);
    const absLon = Math.abs(lon).toFixed(6);
    return `${latDirection} ${absLat} ${lonDirection} ${absLon}`;
}

// Fungsi untuk format B: Degree, Minute (DD MM,MMMM)
function formatB(lat, lon) {
    // Konversi Latitude
    const latDirection = getCardinalDirection(lat, 'lat');
    const absLat = Math.abs(lat);
    const latDegrees = Math.floor(absLat);
    const latMinutes = (absLat - latDegrees) * 60;

    // Konversi Longitude
    const lonDirection = getCardinalDirection(lon, 'lon');
    const absLon = Math.abs(lon);
    const lonDegrees = Math.floor(absLon);
    const lonMinutes = (absLon - lonDegrees) * 60;

    return `${latDirection} ${latDegrees}° ${latMinutes.toFixed(4)}' ${lonDirection} ${lonDegrees}° ${lonMinutes.toFixed(4)}'`;
}

function clearMap() {
    // Menghapus garis lintasan dari peta
    if (missionPath) {
        map.removeLayer(missionPath);
        missionPath = null;
    }

    // Menghapus ikon kapal dari peta
    if (currentPositionMarker) {
        map.removeLayer(currentPositionMarker);
        currentPositionMarker = null;
    }

    
    // Opsional: Mengatur ulang posisi terakhir menjadi null
    latestPosition = null;
    latestData = null;

    console.log("Peta telah di-refresh dan dibersihkan.");
}

// --- Fungsi untuk memperbarui UI ---
// Fungsi untuk memperbarui UI data navigasi
function updateNavUI(data) {
    // Perbaikan: Pastikan `data` ada sebelum mengakses propertinya
    if (!data) {
        // Jika data kosong, atur semua ke 'N/A'
        document.getElementById('timestamp').innerText = 'N/A';
        document.getElementById('sog_kmh').innerText = 'N/A';
        // document.getElementById('sog_knots').innerText = 'N/A';
        // document.getElementById('cog').innerText = 'N/A';
        document.getElementById('latitude').innerText = 'N/A';
        document.getElementById('longitude').innerText = 'N/A';
        return;
    }

   
    const sog_kmh = msToKmh(data.sog_ms);
    const formattedA = formatA(data.latitude, data.longitude);

    document.getElementById('timestamp').innerText = new Date(data.timestamp).toLocaleString();
    document.getElementById('sog_kmh').innerText = sog_kmh.toFixed(2);
    // document.getElementById('sog_knots').innerText = sog_knots.toFixed(2);
    // document.getElementById('cog').innerText = data.cog.toFixed(2);
    // document.getElementById('latitude').innerText = data.latitude.toFixed(6);
    // document.getElementById('longitude').innerText = data.longitude.toFixed(6);
    document.getElementById('formatted_a').innerText = formattedA;

}


function updateCogUI(data) {
    document.getElementById('cog').innerText = data.cog ? data.cog.toFixed(2) : 'N/A';
}


// Mengambar line dari koordinat lintasan
function updateMapVisuals() {

    if (currentPositionMarker) {
        currentPositionMarker.setLatLng(latestPosition); // Menggunakan argumen 'position'
    } else {
        currentPositionMarker = L.marker(latestPosition, { icon: shipIcon }).addTo(map);
    }

    trackCoordinates.push(latestPosition);
    // Periksa apakah trackCoordinates memiliki setidaknya dua koordinat
    if (trackCoordinates.length < 2) {
        console.warn('Tidak cukup data untuk menggambar lintasan.');
        return;}

    if (missionPath) {
        missionPath.setLatLngs(trackCoordinates);
    } else {
        missionPath = L.polyline(trackCoordinates, { color: 'blue', weight: 3 }).addTo(map);
    }
}


// Fungsi untuk memperbarui UI gambar misi
function updateMissionImagesUI(images) {
    const kameraDepanContainer = document.getElementById('kamera-depan-container');
    const kameraBelakangContainer = document.getElementById('kamera-belakang-container');

    // Kosongkan container
    kameraDepanContainer.innerHTML = '';
    kameraBelakangContainer.innerHTML = '';

    if (!images || images.length === 0) {
        kameraDepanContainer.innerHTML = '<p>Belum ada foto.</p>';
        kameraBelakangContainer.innerHTML = '<p>Belum ada foto.</p>';
        return;
    }


    
    // Proses setiap gambar yang diambil dari database
    images.forEach(imgData => {
        const imgElement = document.createElement('img');
        imgElement.src = imgData.image_url;
        imgElement.alt = `Foto dari ${imgData.image_slot_name}`;

        if (imgData.image_slot_name === 'kamera_atas') {
            kameraDepanContainer.appendChild(imgElement);
        } else if (imgData.image_slot_name === 'kamera_bawah') {
            kameraBelakangContainer.appendChild(imgElement);
        }
    });
}

// Fungsi untuk mengkonversi meter per detik ke kilometer per jam
function msToKmh(sog_ms) {
    if (typeof sog_ms !== 'number' || isNaN(sog_ms)) {
        return 0;
    }
    return sog_ms * 3.6;
}

// Fungsi untuk mengkonversi meter per detik ke knot
function msToKnots(sog_ms) {
    if (typeof sog_ms !== 'number' || isNaN(sog_ms)) {
        return 0;
    }
    return sog_ms * 1.94384;
}

// Memperbarui Pilihan Lintasan

async function updateMapViewInSupabase(viewType) {
    try {
        const { error } = await supabaseClient
            .from('map_state')
            .update({ view_type: viewType })
            .eq('id', 1); // Asumsi ada satu baris data dengan id = 1
        
        if (error) throw error;
        console.log(`Status peta diperbarui menjadi: ${viewType}`);
    } catch (error) {
        console.error('Gagal memperbarui status peta:', error);
    }
}

// menghapus lintasan misi
function clearMap() {
    if (missionPath) {
        map.removeLayer(missionPath);
        missionPath = null;
    }
    if (currentPositionMarker) {
        map.removeLayer(currentPositionMarker);
        currentPositionMarker = null;
    }
    trackCoordinates.length = 0;
    latestPosition = null;
    latestData = null;
    console.log("Peta telah di-refresh dan dibersihkan.");
}

// --- Fungsi untuk mengambil data awal (initial fetch) ---
async function fetchInitialData() {
    const errorMessageElement = document.getElementById('error-message');
    try {
        // Ambil data navigasi paling baru
        errorMessageElement.innerText = '';
        errorMessageElement.classList.remove('error-message');
        
        const { data: navData, error: navError } = await supabaseClient
            .from('nav_data') // Perbaikan: Gunakan 'nav_data' yang konsisten
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(1);

        if (navError) throw navError;
        
        if (navData.length > 0) {
        
            latestPosition = [navData[0].latitude, navData[0].longitude];
            latestData = navData[0];
            updateNavUI(latestData);

            updateMapVisuals(); } 
        else {
            // Tangani kasus di mana tidak ada data navigasi
            updateNavUI(null);
        }

        const {data: cogData, error: cogError} = await supabaseClient
            .from('cog_data') // Perbaikan: Gunakan 'cog' yang
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(1);

        if (cogError) throw cogError;

        if (cogData.length > 0) {
            updateCogUI(cogData[0]);
        } else {
            // Tangani kasus di mana tidak ada data COG     
            updateCogUI(null);
        }
        
        // Ambil semua data gambar
        const { data: images, error: imagesError } = await supabaseClient
            .from('gambar_atas')
            .select('*');
        
        if (imagesError) throw imagesError;
        
        updateMissionImagesUI(images); // Perbaikan: Kirim data langsung ke fungsi UI

        errorMessageElement.innerText = '';

    } catch (error) {
        errorMessageElement.innerText = `Gagal mengambil data awal: ${error.message}. Periksa konsol.`;
        errorMessageElement.classList.add('error-message');
        console.error('Error fetching initial data:', error);
    }
}

// --- Realtime Subscriptions untuk update otomatis ---

// Menggunakan Realtime untuk data navigasi
supabaseClient
  .channel('nav_data_changes')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nav_data' }, payload => { // Perbaikan: Gunakan 'nav_data'
    console.log('Realtime Nav Data Update:', payload.new);
    updateNavUI(payload.new);
    latestData = payload.new;
    latestPosition = [payload.new.latitude, payload.new.longitude];
    updateMapVisuals();
  })
  .subscribe();

// Menggunakan Realtime untuk data COG
supabaseClient
    .channel('cog_data_changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cog_data' }, payload => { // Perbaikan: Gunakan 'cog_data'
        console.log('Realtime COG Data Update:', payload.new);
        updateCogUI(payload.new);
    })
    .subscribe();  

// Menggunakan Realtime untuk gambar misi
supabaseClient
  .channel('mission_images_changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'gambar_atas' }, async payload => {
    console.log('Realtime Mission Images Update:', payload);
    
    // Perbaikan: Panggil ulang fungsi yang mengambil semua gambar terbaru
    // untuk memastikan tampilan selalu sinkron.
    const { data: images, error } = await supabaseClient
      .from('gambar_atas')
      .select('*');

    if (error) {
        console.error('Error fetching mission images after realtime update:', error);
        return;
    }
    updateMissionImagesUI(images);
  })
  .subscribe();

// Realtime untuk sinkronisasi peta
supabaseClient
  .channel('map_state_changes')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'map_state' }, payload => {
    const newViewType = payload.new.view_type;
    console.log(`Perubahan status peta diterima: ${newViewType}`);

    if (newViewType === 'lintasan1') {
        x=-7.769356;
        y=110.383056;
        map.setView([x, y], 21);
        getBounds = [
    [x-deltaLat,y-deltaLon], // Sudut Kiri Bawah (min lat, min lon)
    [x+deltaLat,y+deltaLon]];  // Sudut Kanan Atas (max lat, max lon)
        map.setMaxBounds(getBounds);
        map.fitBounds(getBounds);

    } else if (newViewType === 'lintasan2') {
        x=-7.769000;
        y=110.383500;
        map.setView([x, y], 21);
        getBounds = [
    [x-deltaLat,y-deltaLon], // Sudut Kiri Bawah (min lat, min lon)
    [x+deltaLat,y+deltaLon]];  // Sudut Kanan Atas (max lat, max lon)
        map.setMaxBounds(getBounds);            
        map.fitBounds(getBounds);
        }
        
  })
  .subscribe();



// Tambahkan event listener saat dokumen selesai dimuat
document.addEventListener('DOMContentLoaded', () => {

    fetchInitialData() 
    
    // Hubungkan tombol refresh dengan fungsi clearMap()
    const refreshButton = document.getElementById('tombol_refresh');
    if (refreshButton) {
        refreshButton.addEventListener('click', clearMap);
    }
    
    const lintasan1Button = document.getElementById('lintasan1');
    const lintasan2Button = document.getElementById('lintasan2');

    if (lintasan1Button) {
        lintasan1Button.addEventListener('click', () => {
            updateMapViewInSupabase('lintasan1');
            // Hapus class 'aktif' dan tambahkan pada tombol yang baru diklik
            lintasan2Button.classList.remove('aktif');
            lintasan1Button.classList.add('aktif');
        });
    }

    if (lintasan2Button) {
        lintasan2Button.addEventListener('click', () => {
            updateMapViewInSupabase('lintasan2');
            lintasan1Button.classList.remove('aktif');
            lintasan2Button.classList.add('aktif');
        });
    }
});