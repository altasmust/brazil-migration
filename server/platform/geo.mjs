// City list used for nearest-advisor assignment (country → city → [lat, lng]).
export const CITIES = {
  'Brezilya': {'São Paulo': [-23.55, -46.63], 'Rio de Janeiro': [-22.91, -43.17], 'Brasília': [-15.79, -47.88], 'Belo Horizonte': [-19.92, -43.94], 'Curitiba': [-25.43, -49.27], 'Porto Alegre': [-30.03, -51.23], 'Florianópolis': [-27.6, -48.55], 'Salvador': [-12.97, -38.5], 'Recife': [-8.05, -34.88], 'Fortaleza': [-3.73, -38.52], 'Campinas': [-22.91, -47.06], 'Manaus': [-3.12, -60.02]},
  'Türkiye': {'İstanbul': [41.01, 28.98], 'Ankara': [39.93, 32.86], 'İzmir': [38.42, 27.14], 'Bursa': [40.19, 29.06], 'Antalya': [36.9, 30.7], 'Adana': [37.0, 35.32], 'Konya': [37.87, 32.48], 'Gaziantep': [37.07, 37.38], 'Kayseri': [38.73, 35.48], 'Mersin': [36.8, 34.64], 'Eskişehir': [39.78, 30.52], 'Diyarbakır': [37.91, 40.24], 'Samsun': [41.29, 36.33], 'Trabzon': [41.0, 39.72], 'Kocaeli': [40.77, 29.94], 'Denizli': [37.78, 29.09], 'Erzurum': [39.9, 41.27], 'Muğla': [37.22, 28.36], 'Tekirdağ': [40.98, 27.51], 'Sakarya': [40.69, 30.44], 'Malatya': [38.35, 38.31], 'Van': [38.5, 43.38]},
  'Azerbaycan': {'Bakü': [40.41, 49.87], 'Gence': [40.68, 46.36], 'Sumgayıt': [40.59, 49.67], 'Nahçıvan': [39.21, 45.41]},
  'Kuzey Makedonya': {'Üsküp': [42.0, 21.43], 'Kalkandelen': [42.01, 20.97], 'Manastır': [41.03, 21.33], 'Ohri': [41.12, 20.8]},
  'Rusya': {'Moskova': [55.76, 37.62], 'St. Petersburg': [59.93, 30.36], 'Kazan': [55.79, 49.12], 'Novosibirsk': [55.01, 82.93], 'Yekaterinburg': [56.84, 60.6], 'Soçi': [43.6, 39.73]},
  'İspanya': {'Madrid': [40.42, -3.7], 'Barselona': [41.39, 2.17], 'Valensiya': [39.47, -0.38], 'Sevilla': [37.39, -5.98], 'Malaga': [36.72, -4.42]},
  'İran': {'Tahran': [35.69, 51.39], 'Tebriz': [38.08, 46.29], 'Meşhed': [36.3, 59.6], 'İsfahan': [32.65, 51.67], 'Şiraz': [29.59, 52.58]},
  'Suudi Arabistan': {'Riyad': [24.71, 46.68], 'Cidde': [21.49, 39.19], 'Mekke': [21.39, 39.86], 'Medine': [24.47, 39.61], 'Dammam': [26.42, 50.09]},
  'Türkmenistan': {'Aşkabat': [37.96, 58.33], 'Türkmenabat': [39.07, 63.58], 'Daşoğuz': [41.84, 59.97], 'Mari': [37.6, 61.83]},
  'Özbekistan': {'Taşkent': [41.3, 69.24], 'Semerkant': [39.65, 66.96], 'Buhara': [39.77, 64.42], 'Namangan': [41.0, 71.67], 'Fergana': [40.38, 71.79]},
  'Kırgızistan': {'Bişkek': [42.87, 74.59], 'Oş': [40.51, 72.81], 'Celalabad': [40.93, 73.0], 'Karakol': [42.49, 78.39]},
  'Endonezya': {'Cakarta': [-6.21, 106.85], 'Surabaya': [-7.26, 112.75], 'Bandung': [-6.92, 107.61], 'Medan': [3.6, 98.67], 'Bali (Denpasar)': [-8.65, 115.22]},
};

export function locate(country, city) {
  const c = CITIES[country];
  if (!c) return null;
  if (city && c[city]) return {country, city, lat: c[city][0], lng: c[city][1]};
  const [first, ll] = Object.entries(c)[0];
  return {country, city: city || first, lat: ll[0], lng: ll[1], approximate: true};
}

export function fromRequest(req) {
  const lat = Number(req.headers.get('x-vercel-ip-latitude')), lng = Number(req.headers.get('x-vercel-ip-longitude'));
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng)) return {lat, lng, source: 'ip'};
  return null;
}

export function distanceKm(a, b) {
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
