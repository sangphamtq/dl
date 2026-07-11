// Toạ độ tra cứu theo slug điểm đến — dùng cho bản đồ toàn quốc (/ban-do) khi
// một Place chưa có listing gắn toạ độ để suy trọng tâm. Place không có lat/lng
// riêng trong schema; đây là bảng phụ để chấm pin. Toạ độ ~ trung tâm mỗi nơi.
//
// Thêm điểm đến mới: bổ sung một dòng { slug: [lat, lng] } ở đây.
export const PLACE_COORDS: Record<string, [number, number]> = {
  "sa-pa": [22.3364, 103.8438],
  "ha-long": [20.9101, 107.1839],
  "hoi-an": [15.8801, 108.338],
  "da-lat": [11.9404, 108.4583],
  "nha-trang": [12.2388, 109.1967],
  "co-to": [20.9833, 107.7667],
  "moc-chau": [20.85, 104.6333],
  "mai-chau": [20.66, 105.09],
  "tam-dao": [21.459, 105.643],
  "trang-an": [20.253, 105.916],
  "cat-ba": [20.728, 107.048],
  "mu-cang-chai": [21.842, 104.089],
  "dong-van": [23.278, 105.362],
  "ba-vi": [21.09, 105.36],
  "pu-luong": [20.483, 105.167],
  "phong-nha": [17.591, 106.283],
  "ba-na-hills": [15.9977, 107.996],
  "ly-son": [15.383, 109.117],
  "quy-nhon": [13.782, 109.219],
  "ganh-da-dia": [13.652, 109.267],
  "mang-den": [14.633, 108.283],
  "bien-ho": [14.055, 108.001],
  "buon-ma-thuot": [12.6667, 108.05],
  "mui-ne": [10.933, 108.287],
  "vung-tau": [10.346, 107.084],
  "con-dao": [8.6833, 106.6],
  "phu-quoc": [10.227, 103.964],
  "chau-doc": [10.7, 105.116],
  "can-gio": [10.411, 106.954],
  "phan-thiet": [10.9289, 108.1022],
};
