import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  PlaceKind,
  PublishStatus,
  SpotCategory,
  ActivityCategory,
  ActivityKind,
  EateryCategory,
  Meal,
  TransportDirection,
  TransportMode,
} from "@/generated/prisma/enums";

// Seed điểm đến Tà Xùa (Bắc Yên, Sơn La): Place + Spot + Activity + Eatery +
// Specialty + Transport.
// Idempotent: upsert theo slug; ảnh ghi đè mỗi lần chạy (xem IMAGES bên dưới).
// Dùng: pnpm seed:ta-xua

const now = new Date();
const PUB = { status: PublishStatus.published, publishedAt: now } as const;

type ImageOwner =
  | { placeId: string }
  | { spotId: string }
  | { activityId: string }
  | { eateryId: string }
  | { specialtyId: string };

// Ảnh của một mục — ĐỂ TRỐNG để tự điền. Mỗi ảnh: { url, alt?, caption? }.
// Ảnh đầu mảng tự thành ảnh bìa (isCover). Mảng rỗng → trang dùng ảnh fallback.
type ImageInput = { url: string; alt?: string; caption?: string };

// Ghi lại toàn bộ ảnh cho một owner (xóa ảnh cũ trước để khỏi nhân bản khi seed lại).
async function setImages(
  where: ImageOwner,
  images: readonly ImageInput[],
  fallbackAlt: string,
) {
  if (images.length === 0) return; // chưa có ảnh → giữ nguyên ảnh đã có trong CMS
  await prisma.image.deleteMany({ where });
  await Promise.all(
    images.map((im, i) =>
      prisma.image.create({
        data: {
          ...where,
          url: im.url,
          alt: im.alt ?? fallbackAlt,
          caption: im.caption,
          isCover: i === 0,
          order: i,
        },
      }),
    ),
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ẢNH CHO TỪNG MỤC — TỰ ĐIỀN Ở ĐÂY (key = slug). Mỗi mục một mảng ảnh; ảnh đầu
// mảng là ảnh bìa. Để mảng rỗng → seed KHÔNG đụng tới ảnh của mục đó (giữ ảnh
// đã upload trong CMS); trang công khai dùng ảnh fallback nếu chưa có ảnh nào.
// Ví dụ:
//   "song-lung-khung-long-ta-xua": [
//     { url: "https://…/1.jpg", alt: "Sống lưng khủng long", caption: "Biển mây sáng sớm" },
//     { url: "https://…/2.jpg" },
//   ],
// ────────────────────────────────────────────────────────────────────────────
const IMAGES: Record<string, ImageInput[]> = {
  // Place
  "son-la": [],
  "ta-xua": [],

  // Địa điểm (Spot)
  "song-lung-khung-long-ta-xua": [],
  "mom-ca-heo-ta-xua": [],
  "dinh-ta-xua": [],
  "rung-reu-ta-xua": [],
  "cay-co-don-ta-xua": [],
  "doi-che-shan-tuyet-ta-xua": [],
  "ban-hong-ngai-hang-a-phu": [],
  "ruong-bac-thang-xim-vang": [],
  "thac-rong-ta-xua": [],

  // Hoạt động (Activity)
  "san-may-ta-xua": [],
  "trekking-dinh-ta-xua": [],
  "trekking-rung-reu-ta-xua": [],
  "phuot-xe-may-deo-ta-xua": [],
  "thuong-tra-shan-tuyet-ta-xua": [],
  "cam-trai-ngu-leu-ta-xua": [],
  "kham-pha-ban-nguoi-mong-ta-xua": [],
  "ngam-hoa-do-quyen-ta-xua": [],
  "check-in-song-lung-khung-long": [],

  // Quán ăn (Eatery)
  "bep-homestay-ta-xua": [],
  "lau-ga-den-ta-xua": [],
  "quan-com-doi-che-ta-xua": [],
  "quan-nuong-dem-ta-xua": [],
  "nha-tra-shan-tuyet-ta-xua": [],
  "ca-phe-ngam-may-ta-xua": [],
  "quan-pho-sang-bac-yen": [],

  // Đặc sản (Specialty)
  "che-shan-tuyet-ta-xua": [],
  "ga-den-ta-xua": [],
  "thit-trau-gac-bep-ta-xua": [],
  "lon-ban-nuong-ta-xua": [],
  "ca-suoi-nuong-ta-xua": [],
  "rau-cai-meo-ta-xua": [],
  "mang-rung-ta-xua": [],
  "xoi-nep-nuong-ta-xua": [],
};

async function main() {
  // 1) Tỉnh Sơn La
  const sonLa = await prisma.place.upsert({
    where: { slug: "son-la" },
    update: {},
    create: {
      slug: "son-la",
      name: "Sơn La",
      kind: PlaceKind.province,
      provinceName: "Sơn La",
      description:
        "Tỉnh miền núi Tây Bắc với cao nguyên Mộc Châu, những đỉnh núi săn mây và bản làng người Mông, Thái trải dọc các cung đèo.",
      ...PUB,
    },
  });
  await setImages({ placeId: sonLa.id }, IMAGES["son-la"] ?? [], "Sơn La");

  // 2) Điểm đến Tà Xùa
  // CÂU ĐẦU là lede — trang Place tách riêng và phóng to (xem splitLede ở
  // src/app/diem-den/[placeSlug]/page.tsx). Viết câu đầu đứng độc lập được,
  // dài ~110–150 ký tự. Phần còn lại là thân bài, ~600–700 ký tự: cột trái
  // còn chứa cả khối Thông tin chung nên chừng này mới cân với cột video bên
  // cạnh. Ngắt đoạn bằng dòng trống.
  // Chi tiết dài (lịch trình, mẹo) đã có ở trang từng địa điểm/trải nghiệm.
  // KHÔNG lặp ý của `tagline` ("đứng trên mây") — tagline đã hiện ở hero; lede
  // mở sang góc khác. Cũng tránh nhắc lại số liệu đã có trong quickInfo
  // (độ cao 1.600m, khoảng cách 240km): người đọc thấy ngay bên dưới.
  const taXuaDesc = [
    "Tà Xùa là một xã người Mông vắt trên sống núi huyện Bắc Yên, nơi mọi buổi sáng đẹp trời đều bắt đầu bằng việc dậy từ 4h30 và chạy xe trong bóng tối.",
    "Phần thưởng cho sự dậy sớm ấy là cả thung lũng chìm dưới lớp mây trắng dày, chỉ còn vài chỏm núi nhô lên như đảo — nhìn rõ nhất từ sống lưng khủng long, dải sống núi hẹp vắt giữa hai vực.",
    "Cũng vì thế mà một ngày ở đây chia làm hai nhịp rõ rệt: buổi sáng dành cho mây, phần còn lại trôi rất chậm. Người ta ngủ bù, ngồi ở hiên homestay nhìn sương kéo qua thung lũng, rồi chiều muộn chạy xe lang thang qua mấy bản chè.",
    "Nhưng nơi này không chỉ có mây: rừng nguyên sinh phủ rêu trên đường lên đỉnh 2.865m, những gốc chè Shan tuyết vài trăm tuổi phải trèo mới hái được búp, và nhịp sống người Mông còn gần như nguyên vẹn. Đổi lại, đừng chờ đợi dịch vụ chỉn chu: quán xá thưa, đường lên là mười ba cây số đèo dốc liên tục. Hai ngày một đêm là vừa đủ.",
  ].join("\n\n");
  const taXuaGetToIntro =
    "Tà Xùa cách Hà Nội khoảng 240km. Phổ biến nhất là bắt xe khách đêm Hà Nội – Bắc Yên (~6–7 giờ), rồi từ thị trấn Bắc Yên đi tiếp 13km đường đèo dốc lên xã Tà Xùa bằng xe ôm hoặc xe máy thuê. Dân phượt thường chạy xe máy cả cung Hà Nội – Thu Cúc – Phù Yên – Bắc Yên; ô tô gầm cao đi được nhưng đoạn cuối nhiều cua gấp, sương mù dày, nên tính giờ để không lên núi lúc trời tối.";
  const taXuaGetAroundIntro =
    "Các điểm ở Tà Xùa nằm rải dọc một con đường độc đạo trên sống núi, cách nhau vài km nên xe máy là phương tiện gần như bắt buộc. Đường bê tông nhưng dốc đứng, nhiều đoạn sạt và trơn khi có sương — người chưa quen đi đường núi nên thuê xe ôm bản địa. Từ điểm gửi xe tới các mỏm ngắm mây vẫn phải cuốc bộ thêm 15–40 phút.";
  // "Thông tin chung" — vài fact nổi bật nhận diện nơi này, KHÔNG phải
  // checklist chuẩn bị. Giữ mỗi dòng ngắn gọn một ý.
  const taXuaQuickInfo = [
    { label: "Vị trí", value: "Xã Tà Xùa, huyện Bắc Yên, Sơn La" },
    { label: "Nổi tiếng với", value: "Biển mây, sống lưng khủng long, chè Shan tuyết" },
    { label: "Độ cao", value: "Bản ~1.600m · đỉnh Tà Xùa 2.865m" },
    { label: "Mùa đẹp nhất", value: "Tháng 10 – 4, mây dày nhất 11–2" },
    { label: "Cách Hà Nội", value: "~240km, 6–7 giờ xe" },
    { label: "Thời gian nên đi", value: "2 ngày 1 đêm" },
    { label: "Khí hậu", value: "Mát quanh năm, đêm mùa đông 0–5°C" },
  ] as Prisma.InputJsonValue;
  const taXua = await prisma.place.upsert({
    where: { slug: "ta-xua" },
    update: {
      parentId: sonLa.id,
      quickInfo: taXuaQuickInfo,
      provinceName: "Sơn La",
      districtName: "Huyện Bắc Yên",
      wardName: "Xã Tà Xùa",
      description: taXuaDesc,
      getToIntro: taXuaGetToIntro,
      getAroundIntro: taXuaGetAroundIntro,
      tags: [], // xóa tag cũ còn sót trong DB từ lần seed trước
    },
    create: {
      slug: "ta-xua",
      name: "Tà Xùa",
      kind: PlaceKind.destination,
      parentId: sonLa.id,
      tagline: "Thiên đường săn mây Tây Bắc — nơi bạn đứng trên mây, không phải nhìn lên mây.",
      description: taXuaDesc,
      getToIntro: taXuaGetToIntro,
      getAroundIntro: taXuaGetAroundIntro,
      provinceName: "Sơn La",
      districtName: "Huyện Bắc Yên",
      wardName: "Xã Tà Xùa",
      // KHÔNG gắn tag cho Place: trang Place không còn hiển thị tag của điểm
      // đến nữa (xem mục "Đôi nét"). Tag của Listing thì vẫn giữ — chúng dùng
      // để lọc ở các trang danh sách.
      quickInfo: taXuaQuickInfo,
      isFeatured: true,
      ...PUB,
    },
  });
  await setImages({ placeId: taXua.id }, IMAGES["ta-xua"] ?? [], "Tà Xùa");

  // 3) Spots
  type HighlightSeed = {
    title: string;
    // Văn xuôi thuần, viết dài như một đoạn blog. Truyền mảng để tách nhiều
    // đoạn — mỗi phần tử sẽ thành một thẻ <p> khi ghi vào rich text.
    body?: string | string[];
  };
  type SpotSeed = {
    slug: string;
    name: string;
    tagline?: string;
    category?: SpotCategory;
    lat?: number;
    lng?: number;
    address?: string;
    description?: string;
    bestTime?: string;
    bestTimeNote?: string;
    ticketFree?: boolean;
    ticketTiers?: { label: string; price: number; note?: string }[];
    ticketInfo?: string;
    notice?: string;
    tips?: string[];
    gettingThere?: string;
    tags?: string[];
    highlights?: HighlightSeed[];
  };
  const spots: SpotSeed[] = [
    {
      slug: "song-lung-khung-long-ta-xua",
      name: "Sống lưng khủng long",
      tagline: "Dải sống núi hẹp vắt giữa hai biển mây.",
      category: SpotCategory.viewpoint,
      lat: 21.2503,
      lng: 104.4519,
      address: "Bản Tà Xùa, xã Tà Xùa, huyện Bắc Yên, Sơn La",
      description:
        "Biểu tượng của Tà Xùa: một dải sống núi hẹp chỉ vừa lối đi, hai bên là vực sâu hun hút, uốn lượn nhấp nhô đúng như tấm lưng của một con khủng long khổng lồ. Sáng sớm mây dâng đầy hai bên vực, người đi trên sống núi như bước giữa hai biển mây — cảnh tượng khiến nơi đây thành điểm check-in được săn đón bậc nhất Tây Bắc.",
      bestTime: "5h – 8h sáng",
      bestTimeNote:
        "Mây đẹp nhất từ lúc trời hửng đến khoảng 8h sáng, khi nắng chưa đủ mạnh để đánh tan biển mây. Mùa săn mây kéo dài tháng 10 đến tháng 4, đỉnh điểm là tháng 11–2 sau những đêm lạnh, khô và không mưa. Chiều muộn cũng có hoàng hôn đẹp nhưng mây thường mỏng hơn.",
      ticketFree: true,
      ticketInfo: "Vào tự do; gửi xe tại điểm đầu đường mòn khoảng 10.000–20.000đ.",
      notice:
        "Lối đi hẹp, hai bên là vực — rất trơn khi có sương hoặc sau mưa. Không nên ra sống núi khi trời mù đặc hoặc gió mạnh.",
      highlights: [
        {
          title: "Đi giữa hai biển mây",
          body: [
            "Điều làm nên tên tuổi của sống lưng khủng long không phải độ cao mà là vị trí của nó: dải sống núi này nằm cao hơn tầng mây tích tụ trong thung lũng. Nên vào những sáng đẹp trời, khi bạn đặt chân ra tới đoạn hẹp nhất, cả hai bên vực đều đã trắng xóa — mây không nằm trên đầu bạn nữa mà cuộn sóng ngay dưới chân, dày đến mức tưởng như bước xuống được. Chỉ còn dải đất rộng hơn một sải tay nổi lên giữa trời, dẫn bạn đi về phía những chỏm núi nhô lên như đảo giữa đại dương trắng.",
            "Biển mây ấy không đứng yên. Nó trôi, dâng lên rồi hạ xuống theo từng đợt gió, có lúc tràn cả qua sống núi khiến bạn đứng lọt thỏm trong màn trắng mờ chỉ vài giây rồi lại quang trở lại. Khoảnh khắc đẹp nhất thường rơi vào tầm 6h–7h, khi mặt trời vừa đủ cao để nhuộm rìa mây thành sắc hồng cam nhưng chưa đủ gắt để đánh tan chúng. Đến khoảng 8h–9h, nắng lên, mây tan dần và toàn bộ thung lũng Bắc Yên hiện ra bên dưới — một cảnh tượng khác, cũng đáng ở lại để xem.",
          ],
        },
        {
          title: "Khung hình biểu tượng của Tây Bắc",
          body: [
            "Có những nơi mà chỉ cần nhìn ảnh là biết đang ở đâu, và sống lưng khủng long là một trong số đó. Đường sống núi uốn lượn nhấp nhô, thắt lại rồi phình ra, hai bên là vực sâu hun hút, điểm thêm vài gốc cây cổ thụ đứng lẻ nghiêng theo chiều gió — bố cục ấy gần như không thể nhầm với bất kỳ điểm săn mây nào khác ở Việt Nam.",
            "Góc chụp đẹp nhất là từ mỏm cao đầu đường mòn nhìn dọc theo sống núi, lấy trọn đường cong uốn lượn và để một người đứng ở đoạn xa làm điểm nhấn — chính sự nhỏ bé của dáng người giữa khoảng không mênh mông mới tạo nên sức nặng cho bức ảnh. Nếu đi hai người, hãy thay nhau: một người ra đoạn hẹp, một người ở lại mỏm cao bấm máy. Buổi chiều muộn cũng đáng thử vì nắng xiên tạo bóng đổ dài trên sống núi, tuy mây thường mỏng hơn sáng sớm.",
          ],
        },
        {
          title: "Đường mòn ngắn nhưng cheo leo",
          body: [
            "Không cần thể lực trekking để tới đây — đó là lý do sống lưng khủng long được lòng cả những người chỉ đi du lịch nhẹ nhàng. Từ chỗ gửi xe ở nhà dân, bạn men theo đường mòn đất chừng 20–30 phút là đã ra tới đầu sống núi, quãng đường ngắn tới mức nhiều người mặc nguyên đồ đi chơi cũng đi được.",
            "Nhưng đừng vì thế mà chủ quan. Đoạn cuối thu hẹp lại chỉ còn vừa lối chân, đất trơn trượt khi có sương đêm hoặc sau mưa, và hai bên là vực thật chứ không phải triền dốc thoai thoải. Gió trên đó cũng mạnh hơn hẳn dưới bản, đủ để làm mất thăng bằng nếu bạn đang mải giơ điện thoại. Một đôi giày bám tốt, bước chậm và không cố tạo dáng ở mép vực là toàn bộ những gì cần để chuyến đi vừa đẹp vừa an toàn.",
          ],
        },
      ],
      tips: [
        "Dậy từ 4h30–5h để kịp ra sống núi trước khi mặt trời lên và mây tan.",
        "Đi giày bám tốt, tránh dép lê — đường đất trơn, nhiều đoạn dốc sát vực.",
        "Đừng cố tạo dáng nguy hiểm ở mép vực, nhất là khi gió mạnh hoặc đông người.",
        "Mang áo khoác gió: trên sống núi lạnh và gió hơn hẳn dưới bản.",
        "Cuối tuần rất đông — đi ngày thường sẽ thong thả chụp ảnh hơn.",
      ],
      gettingThere:
        "Từ trung tâm bản Tà Xùa chạy xe máy thêm khoảng 4–5km theo đường bê tông về hướng Xím Vàng là tới lối rẽ có biển chỉ dẫn. Gửi xe tại nhà dân đầu đường mòn rồi đi bộ 20–30 phút men theo sống núi.",
      tags: ["săn mây", "check-in", "bình minh", "trekking nhẹ"],
    },
    {
      slug: "mom-ca-heo-ta-xua",
      name: "Mỏm cá heo",
      tagline: "Mỏm đá vươn ra giữa trời như chú cá heo rẽ mây.",
      category: SpotCategory.viewpoint,
      lat: 21.2564,
      lng: 104.4462,
      address: "Bản Tà Xùa, xã Tà Xùa, huyện Bắc Yên, Sơn La",
      description:
        "Một mỏm đá nhô hẳn ra khỏi vách núi, dáng thon vút lên đúng như chiếc đầu cá heo đang rẽ sóng — chỉ khác là 'sóng' ở đây là biển mây. Đứng trên mỏm nhìn xuống là thung lũng sâu hút, phía xa là những dãy núi trùng điệp của Bắc Yên. Đây là điểm ngắm mây và chụp ảnh được yêu thích thứ nhì sau sống lưng khủng long.",
      bestTime: "Bình minh",
      bestTimeNote:
        "Đẹp nhất lúc bình minh khi mây còn dày và ánh nắng đầu ngày rọi ngang mỏm đá. Mùa mây từ tháng 10 đến tháng 4; sau một đêm lạnh và trời quang là dấu hiệu sáng hôm sau sẽ có mây đẹp.",
      ticketFree: true,
      notice:
        "Mỏm đá không có lan can, mặt đá trơn khi ẩm sương. Chỉ nên ra mỏm khi trời khô và có người hỗ trợ.",
      highlights: [
        {
          title: "Mỏm đá 'cá heo' độc nhất",
          body: [
            "Thiên nhiên đôi khi tạc ra những hình thù khiến người ta phải dừng lại nhìn hai lần. Mỏm đá ở đây vươn hẳn ra khỏi vách núi, phần đầu thon lại rồi vút lên, nhìn nghiêng đúng dáng một chú cá heo đang lao mình khỏi mặt nước — chỉ khác là 'mặt nước' ở đây là biển mây trắng cuộn bên dưới. Chính sự trùng hợp ấy đã đặt tên cho điểm đến và biến nó thành góc chụp không thể nhầm lẫn với bất kỳ nơi nào khác ở Tây Bắc.",
            "Mỏm khá nhỏ, chỉ đủ chỗ cho một hai người cùng lúc, nên vào cuối tuần bạn sẽ phải xếp hàng chờ tới lượt. Người có kinh nghiệm thường chụp từ vách bên cạnh nhìn chéo sang để lấy trọn dáng mỏm đá cùng nền mây phía sau, thay vì đứng ngay trên mỏm — vừa an toàn hơn, vừa ra được bức ảnh kể đúng câu chuyện về hình dáng đặc biệt của nó.",
          ],
        },
        {
          title: "Ngắm mây từ trên cao",
          body: [
            "Nếu sống lưng khủng long cho bạn cảm giác đi xuyên qua mây thì mỏm cá heo lại là chỗ để ngồi xuống và ngắm chúng từ trên cao. Vị trí trống trải, không bị núi che chắn, mở ra tầm nhìn bao quát cả thung lũng sâu hút phía dưới và những dãy núi trùng điệp của Bắc Yên xếp lớp mờ dần về phía chân trời.",
            "Đó cũng là lý do nơi đây hợp với cả những người không muốn đi bộ nhiều: chỉ mất 10–15 phút cuốc bộ từ chỗ gửi xe, và quanh đó có vài quán nhỏ của người dân bán trà nóng, ngô nướng. Nhiều người chọn cách mua một ấm trà Shan tuyết, ngồi bệt xuống tảng đá gần mỏm và chờ mặt trời lên — không vội chụp ảnh, chỉ nhìn mây trôi qua bên dưới cho tới khi nắng làm tan hết. Sáng lạnh, tay ôm chén trà nóng, trước mặt là mây: đó là kiểu trải nghiệm mà nhiều người nhớ lâu hơn cả tấm ảnh mang về.",
          ],
        },
      ],
      tips: [
        "Nhờ người đi cùng giữ máy/điện thoại khi ra mỏm — gió trên đó khá mạnh.",
        "Đến sớm vì mỏm nhỏ, cuối tuần phải xếp hàng chờ chụp ảnh.",
        "Kết hợp ghé mỏm cá heo trước rồi qua sống lưng khủng long trong cùng buổi sáng.",
      ],
      gettingThere:
        "Nằm ngay ven trục đường chính qua bản Tà Xùa, cách trung tâm bản khoảng 2–3km. Gửi xe ở quán/homestay gần đó rồi đi bộ xuống chừng 10–15 phút theo bậc đất.",
      tags: ["săn mây", "check-in", "bình minh"],
    },
    {
      slug: "dinh-ta-xua",
      name: "Đỉnh Tà Xùa (2.865m)",
      tagline: "Nóc nhà ranh giới Sơn La – Yên Bái, top 10 đỉnh cao Việt Nam.",
      category: SpotCategory.mountain,
      lat: 21.3128,
      lng: 104.4766,
      address: "Ranh giới huyện Bắc Yên (Sơn La) – huyện Trạm Tấu (Yên Bái)",
      description:
        "Cao 2.865m và nằm trong nhóm mười đỉnh cao nhất Việt Nam, đỉnh Tà Xùa là cung trekking khét tiếng với ba mỏm nhấp nhô mà dân leo núi quen gọi là 'sống lưng khủng long thật'. Đường lên xuyên qua rừng nguyên sinh phủ rêu, những vạt trúc lùn và các đoạn sống núi hẹp lộng gió — vất vả nhưng đổi lại là biển mây mênh mông ngay dưới chân khi bình minh lên.",
      bestTime: "Tháng 10 – 4",
      bestTimeNote:
        "Mùa khô từ tháng 10 đến tháng 4 là thời gian leo an toàn và dễ gặp biển mây nhất; tháng 2–3 thêm hoa đỗ quyên nở dọc đường. Tránh mùa mưa (tháng 6–8): đường lầy, vắt nhiều và dễ sạt.",
      ticketTiers: [
        { label: "Phí dịch vụ porter/dẫn đường", price: 800000, note: "trọn gói theo đoàn, tuỳ số người" },
        { label: "Tour trọn gói 2N1Đ", price: 2000000, note: "gồm ăn, porter, lều/lán trại" },
      ],
      ticketInfo:
        "Không bán vé tham quan; chi phí chính là thuê porter/dẫn đường bản địa và đồ ăn — bắt buộc phải có người dẫn.",
      notice:
        "BẮT BUỘC đi cùng người dẫn đường bản địa. Cung leo dài, nhiều đoạn sống núi hẹp và gió lớn, không dành cho người chưa có thể lực trekking.",
      highlights: [
        {
          title: "Ba mỏm sống lưng khủng long",
          body: [
            "Dân leo núi gọi đây là 'sống lưng khủng long thật' để phân biệt với dải sống núi nổi tiếng dưới bản — và cái tên ấy hoàn toàn xứng đáng. Chặng ấn tượng nhất của cung leo là ba mỏm núi nối nhau bằng những dải sống hẹp, có đoạn chỉ vừa một người đi, hai bên hụt hẫng xuống vực mây. Bạn vừa đi vừa phải bám vào rễ cây và các mỏm đá, gió táp ngang người, và mỗi lần lên tới đỉnh một mỏm lại tưởng đã xong thì mỏm tiếp theo hiện ra phía trước.",
            "Chính sự lặp lại có phần 'hành xác' đó lại tạo nên nhịp điệu riêng cho cung Tà Xùa: leo, tụt xuống yên ngựa, rồi lại leo. Nhưng đổi lại, không đoạn nào trên cả cung leo cho ảnh đẹp bằng ở đây — dải sống núi mảnh như sợi chỉ vắt giữa hai vực mây, người đi thành một chấm nhỏ trên nền trời. Nhiều người đã đi nhiều cung Tây Bắc vẫn nói ba mỏm này là đoạn đường đáng nhớ nhất họ từng qua.",
          ],
        },
        {
          title: "Rừng nguyên sinh phủ rêu",
          body: [
            "Sau khi rời nương rẫy và những vạt trúc lùn, đường lên đỉnh chui vào một thế giới hoàn toàn khác: khu rừng già ẩm ướt quanh năm, nơi rêu phủ kín thân cây, bò lên từng tảng đá và rủ xuống từ những cành khô như tấm màn xanh. Ánh sáng lọt qua tán lá dày trở nên mờ đục, tiếng bước chân bị lớp rêu và mùn lá nuốt gọn, chỉ còn tiếng nước nhỏ giọt đâu đó — cảm giác tĩnh lặng đến mức nhiều người tự động hạ giọng khi nói chuyện.",
            "Đây cũng là đoạn tương phản mạnh nhất với phần sống núi trống trải phía trên: một bên là gió lộng và trời rộng, một bên là rừng kín, ẩm và cổ kính. Với nhiều người leo Tà Xùa, chính chặng rừng rêu này — chứ không phải cột mốc trên đỉnh — mới là lý do khiến họ muốn quay lại lần thứ hai.",
          ],
        },
        {
          title: "Biển mây trên độ cao 2.865m",
          body: [
            "Săn mây từ dưới bản đã đẹp, nhưng săn mây ở độ cao 2.865m là một cấp độ khác. Đoàn thường ngủ lán ở khoảng 2.400m rồi dậy từ 4h, đeo đèn pin leo nốt phần còn lại trong bóng tối để kịp có mặt trên đỉnh trước bình minh. Trời hửng dần, và thứ hiện ra không phải một thung lũng mây mà là cả một vùng mây trải kín các thung lũng Bắc Yên bên này, Trạm Tấu bên kia — mênh mông tới tận chân trời, chỉ điểm xuyết những đỉnh núi nhô lên.",
            "Đêm trước đó cũng là một phần của trải nghiệm: nhiệt độ có thể xuống dưới 5°C, cả đoàn quây quanh bếp lửa trong lán, ăn cơm porter nấu và ngẩng lên thấy bầu trời sao dày đặc không vướng chút ánh đèn nào. Vất vả hai ngày để đổi lấy khoảnh khắc mặt trời nhô lên khỏi biển mây — hầu hết những người đã leo đều nói là xứng đáng.",
          ],
        },
      ],
      tips: [
        "Lịch chuẩn là 2 ngày 1 đêm (ngủ lán/lều gần đỉnh), thể lực yếu nên chọn 3 ngày.",
        "Thuê porter bản địa ngay tại bản Tà Xùa hoặc Xím Vàng — vừa an toàn vừa hỗ trợ người dân.",
        "Mang đủ nước, đồ ăn nhanh, áo ấm và túi ngủ: đêm trên đỉnh có thể xuống dưới 5°C.",
        "Giày trekking cổ cao chống trượt là bắt buộc; mang thêm gậy leo núi.",
        "Đăng ký lịch trình với homestay/người dẫn để có người biết bạn ở đâu.",
      ],
      gettingThere:
        "Điểm xuất phát phổ biến là bản Tà Xùa hoặc Xím Vàng (huyện Bắc Yên), nơi đoàn tập kết và thuê porter. Nhiều nhóm cũng leo từ phía Trạm Tấu (Yên Bái) rồi xuống Bắc Yên hoặc ngược lại.",
      tags: ["trekking", "leo núi", "săn mây", "cắm trại"],
    },
    {
      slug: "rung-reu-ta-xua",
      name: "Rừng rêu nguyên sinh Tà Xùa",
      tagline: "Khu rừng cổ tích phủ rêu xanh trên độ cao 2.000m.",
      category: SpotCategory.park,
      lat: 21.2932,
      lng: 104.4661,
      address: "Trên cung trekking đỉnh Tà Xùa, huyện Bắc Yên, Sơn La",
      description:
        "Ở độ cao trên 2.000m, hơi ẩm quanh năm biến cả cánh rừng nguyên sinh thành một thế giới xanh mướt: rêu bám kín thân cây, phủ lên đá, rủ xuống từ những cành khô như tấm màn. Ánh sáng lọt qua tán lá mờ ảo trong sương khiến nhiều người ví nơi đây là 'khu rừng cổ tích' đẹp nhất Tây Bắc.",
      bestTime: "Sáng sớm, mùa khô",
      bestTimeNote:
        "Rêu xanh và dày nhất vào những tháng ẩm nhưng đường lại trơn; đi mùa khô (tháng 10–4) là cân bằng tốt nhất. Buổi sáng khi sương còn vương trên rêu là lúc rừng huyền ảo nhất để chụp ảnh.",
      ticketFree: true,
      notice:
        "Nằm trên cung trekking đỉnh Tà Xùa — không phải điểm ghé bằng xe máy. Phải đi bộ và nên có người dẫn đường.",
      highlights: [
        {
          title: "Thảm rêu phủ kín cả cánh rừng",
          body: [
            "Ở độ cao trên 2.000m, độ ẩm gần như bão hòa quanh năm và sương mù ghé qua mỗi ngày đã tạo nên điều kiện hoàn hảo cho rêu sinh sôi. Kết quả là cả cánh rừng bị 'nuốt' trong một lớp áo xanh: rêu bám dày quanh thân cây cổ thụ, bò lên từng tảng đá, phủ kín cả những cành khô đổ ngang lối đi, có chỗ dày tới mức ấn tay xuống thấy mềm và ẩm như nhung.",
            "Đây là kiểu cảnh quan chỉ xuất hiện ở những khu rừng ẩm trên cao, và cũng vì thế mà rất mong manh. Một mảng rêu bị bóc đi có thể mất nhiều năm mới phục hồi, nên nguyên tắc bất thành văn của dân trekking ở đây là chỉ đi trên lối mòn, không bóc rêu để chụp ảnh, không bẻ cành. Rừng đẹp được đến bao lâu phụ thuộc gần như hoàn toàn vào cách những đoàn khách đi qua nó.",
          ],
        },
        {
          title: "Sương giăng giữa rừng già",
          body: [
            "Buổi sáng, khi sương còn chưa tan, ánh nắng lọt qua tán cây cổ thụ tạo thành những vệt sáng nghiêng rõ nét trong không khí ẩm — thứ ánh sáng mà dân chụp ảnh gọi là 'god ray' và ở đây thì gần như ngày nào cũng có. Cộng với thảm rêu xanh mướt bên dưới, khung cảnh khiến người ta lập tức nghĩ tới những khu rừng trong truyện cổ tích.",
            "Không khí trong rừng cũng đặc biệt: lạnh, ẩm, thoảng mùi mùn lá và gỗ mục, và tĩnh tới mức nghe rõ tiếng nước đọng trên lá nhỏ xuống. Nhiều đoàn cố tình đi chậm lại ở chặng này, dừng nghỉ lâu hơn cần thiết chỉ để ngồi im giữa rừng một lúc — điều mà cả cung leo dốc phía trên không cho phép.",
          ],
        },
      ],
      tips: [
        "Đi nhẹ chân, không bóc rêu hay bẻ cành — thảm rêu rất lâu mới phục hồi.",
        "Đường trong rừng ẩm và trơn quanh năm, giày bám tốt là bắt buộc.",
        "Mang áo mưa mỏng: trong rừng hay có mưa phùn bất chợt dù ngoài trời quang.",
      ],
      gettingThere:
        "Nằm trên đường lên đỉnh Tà Xùa, thường là chặng giữa của ngày trekking thứ nhất. Xuất phát từ bản Tà Xùa hoặc Xím Vàng cùng porter dẫn đường.",
      tags: ["trekking", "rừng nguyên sinh", "chụp ảnh"],
    },
    {
      slug: "cay-co-don-ta-xua",
      name: "Cây cô đơn Tà Xùa",
      tagline: "Một gốc cây đứng lẻ trên đồi trọc, nền trời là mây.",
      category: SpotCategory.viewpoint,
      lat: 21.2588,
      lng: 104.4501,
      address: "Bản Tà Xùa, xã Tà Xùa, huyện Bắc Yên, Sơn La",
      description:
        "Một gốc cây già đứng đơn độc trên mỏm đồi trọc, phía sau chỉ có mây và núi — hình ảnh giản dị mà lại thành biểu tượng lãng mạn của Tà Xùa. Sáng sớm khi mây tràn qua, cây như nổi trên mặt biển trắng; chiều muộn thì in bóng đen tuyền trên nền hoàng hôn.",
      bestTime: "Bình minh & hoàng hôn",
      bestTimeNote:
        "Bình minh cho ảnh cây nổi giữa biển mây; hoàng hôn cho ảnh ngược sáng với bóng cây in trên nền trời cam. Cả hai đều đẹp nhất vào mùa khô tháng 10–4.",
      ticketFree: true,
      ticketInfo: "Một số điểm quanh cây do nhà dân trông giữ, phí gửi xe/chụp ảnh khoảng 10.000–20.000đ.",
      highlights: [
        {
          title: "Khung hình tối giản đặc trưng",
          body: [
            "Không có gì cầu kỳ ở đây: một thân cây già đứng lẻ trên mỏm đồi trọc, một triền cỏ thoai thoải và cả bầu trời phía sau. Chính sự tối giản đó lại là điểm mạnh — không có chi tiết nào tranh chấp sự chú ý, nên mọi bức ảnh chụp ở đây đều tự khắc có điểm nhấn rõ ràng mà không cần kỹ thuật gì phức tạp. Chỉ cần đứng lùi lại, hạ máy thấp một chút để lấy nhiều trời hơn đất, thế là đủ.",
            "Cây cũng đổi 'vai' theo giờ trong ngày. Sáng sớm khi mây tràn qua triền đồi, nó nổi lên như một hòn đảo giữa biển trắng. Chiều muộn, chụp ngược sáng, thân và tán cây in thành bóng đen tuyền trên nền trời cam đỏ. Cùng một gốc cây, hai câu chuyện hoàn toàn khác nhau — nhiều người ghé cả hai lượt trong một chuyến chỉ vì lý do đó.",
          ],
        },
        {
          title: "Vì sao gọi là 'cây cô đơn'",
          body: [
            "Cả triền đồi trọc chỉ còn đúng một gốc cây đứng lại, không có bụi cây nào bên cạnh, không hàng rào, không mái nhà — hình ảnh ấy gợi lên cảm giác cô độc mà lại rất bình thản, và đó là lý do người đi trước đặt cho nó cái tên này. Ở Tà Xùa, giữa khung cảnh núi non mênh mông, một thân cây đơn độc trở thành thứ duy nhất có tỉ lệ con người có thể cảm nhận được.",
            "Điểm hay là cây nằm ngay ven trục đường chính qua bản, chỉ cần tấp xe vào lề và đi bộ lên vài phút. Không mất công, không tốn vé, không cần dậy sớm nếu bạn chỉ muốn ngắm hoàng hôn — nên đây thường là điểm dừng đầu tiên của những người vừa lên tới bản còn mệt sau chặng đèo, và cũng là điểm cuối cùng người ta ghé lại trước khi xuống núi.",
          ],
        },
      ],
      tips: [
        "Đi sớm hoặc chiều muộn để có ánh sáng đẹp và tránh đông người.",
        "Trên đồi trống nên gió mạnh và lạnh — mặc áo khoác gió.",
        "Ghé cùng buổi với mỏm cá heo vì hai điểm nằm khá gần nhau.",
      ],
      gettingThere:
        "Nằm ngay ven trục đường chính qua bản Tà Xùa, cách trung tâm bản chừng 2km. Chạy xe máy tới chân đồi rồi đi bộ lên vài phút.",
      tags: ["check-in", "săn mây", "hoàng hôn"],
    },
    {
      slug: "doi-che-shan-tuyet-ta-xua",
      name: "Đồi chè Shan tuyết cổ thụ",
      tagline: "Những gốc chè trăm tuổi mọc trong mây.",
      category: SpotCategory.other,
      lat: 21.2649,
      lng: 104.4413,
      address: "Bản Bẹ – bản Chung Chinh, xã Tà Xùa, huyện Bắc Yên, Sơn La",
      description:
        "Trên những sườn núi quanh năm mây phủ là các gốc chè Shan tuyết cổ thụ hàng trăm năm tuổi, thân xù xì rêu mốc, cao quá đầu người đến mức phải trèo lên hái. Búp chè phủ lớp lông trắng như tuyết cho thứ nước vàng sánh, chát nhẹ rồi ngọt hậu — đặc sản làm nên tên tuổi Tà Xùa bên cạnh biển mây.",
      bestTime: "Vụ chè xuân (tháng 3 – 5)",
      bestTimeNote:
        "Đẹp và nhộn nhịp nhất vào vụ xuân tháng 3–5 khi bà con lên đồi hái búp. Buổi sáng sớm sương còn đọng trên lá chè là lúc đồi chè huyền ảo nhất; quanh năm đều ghé được để thăm và thưởng trà.",
      ticketFree: true,
      highlights: [
        {
          title: "Gốc chè cổ thụ phải trèo mới hái được",
          body: [
            "Quên hình ảnh những đồi chè xanh mướt được cắt tỉa bằng phẳng ngang hông người mà bạn quen thấy ở Mộc Châu hay Thái Nguyên. Chè Shan tuyết ở Tà Xùa là cây cổ thụ thật sự: cao vài mét, thân xù xì phủ đầy địa y và rêu mốc, có gốc to đến mức một người ôm không xuể và tuổi đời được người dân tính bằng đời người — nhiều cây đã đứng đó từ trước khi ông bà họ sinh ra.",
            "Vì cây cao nên mỗi vụ hái, bà con phải trèo hẳn lên cành, ngồi vắt vẻo giữa tán để ngắt từng búp non phủ lớp lông trắng như tuyết. Đó là cảnh tượng khiến nhiều du khách sững người khi lần đầu nhìn thấy, và cũng giải thích vì sao sản lượng chè Shan tuyết cổ thụ rất thấp: không máy móc nào thay được đôi tay người trèo cây, và mỗi cây chỉ cho vài lứa búp mỗi năm.",
          ],
        },
        {
          title: "Thưởng trà ngay tại vườn",
          body: [
            "Ghé vườn chè ở bản Bẹ hay bản Chung Chinh, chuyện thường diễn ra thế này: chủ nhà dẫn bạn lên đồi xem cây, chỉ cho biết đâu là búp đạt chuẩn, rồi kéo về bếp cho xem chảo sao chè thủ công — công đoạn đòi hỏi canh lửa và đảo tay liên tục, sai một chút là cả mẻ chè mất hương. Sau đó là ấm trà pha ngay tại chỗ, nước vàng sánh, chát nhẹ đầu lưỡi rồi ngọt hậu kéo dài rất lâu trong cổ họng.",
            "Vừa uống vừa nghe kể chuyện nghề, chuyện những mùa chè được giá và mất giá, chuyện vì sao trà Tà Xùa bị làm giả nhiều tới vậy dưới xuôi. Mua trà trực tiếp từ hộ làm ở đây vừa rẻ hơn, vừa chắc chắn là chè thật — và đó cũng là món quà gọn nhẹ nhất mang về sau một chuyến đi mà hành lý chủ yếu là áo ấm.",
          ],
        },
      ],
      tips: [
        "Hỏi chủ vườn trước khi trèo cây hoặc hái búp để chụp ảnh.",
        "Mua trà trực tiếp từ hộ dân vừa rẻ vừa chắc chắn là chè Tà Xùa thật.",
        "Đường vào các bản chè nhỏ và dốc, đi xe số hoặc nhờ người bản địa chở.",
      ],
      gettingThere:
        "Các vườn chè cổ thụ tập trung ở bản Bẹ và bản Chung Chinh, cách trung tâm xã Tà Xùa vài km theo đường bê tông nhỏ. Nhiều homestay nhận dẫn khách đi thăm vườn.",
      tags: ["chè Shan tuyết", "văn hóa", "đặc sản", "mua quà"],
    },
    {
      slug: "ban-hong-ngai-hang-a-phu",
      name: "Bản Hồng Ngài & hang A Phủ",
      tagline: "Bản người Mông trong 'Vợ chồng A Phủ' và hang đá huyền thoại.",
      category: SpotCategory.cave,
      lat: 21.1867,
      lng: 104.4083,
      address: "Xã Hồng Ngài, huyện Bắc Yên, Sơn La",
      description:
        "Hồng Ngài chính là bản người Mông đã đi vào trang văn 'Vợ chồng A Phủ' của Tô Hoài. Ngoài những nếp nhà gỗ pơ mu, ruộng bậc thang và nhịp sống còn rất nguyên bản, nơi đây có hang A Phủ (hang Thẳm Cốp) với vòm đá rộng và hệ thạch nhũ đẹp — điểm dừng thú vị cho ai muốn ghép thêm chút văn hóa và lịch sử vào chuyến săn mây.",
      bestTime: "Tháng 9 – 12",
      bestTimeNote:
        "Tháng 9–10 ruộng bậc thang quanh bản vào mùa lúa chín; tháng 11–12 trời khô ráo, dễ đi đường. Hang mát quanh năm nhưng nên tránh ngày mưa vì đường vào trơn.",
      ticketFree: true,
      ticketInfo: "Tham quan tự do; nên gửi chút phí cho người dân dẫn đường vào hang.",
      notice: "Trong hang tối và trơn — bắt buộc mang đèn pin và không đi một mình.",
      highlights: [
        {
          title: "Bản làng bước ra từ trang sách",
          body: [
            "Với nhiều người Việt, Hồng Ngài là một cái tên đã quen từ ghế nhà trường: đây chính là bản người Mông trong 'Vợ chồng A Phủ' của Tô Hoài. Đặt chân tới nơi, thứ gây ấn tượng không phải là các bảng chỉ dẫn du lịch — hầu như không có — mà là việc mọi thứ vẫn đang vận hành như một bản làng thật: nếp nhà gỗ pơ mu ám khói bếp, hàng rào đá xếp tay chạy dọc lối đi, ruộng bậc thang ôm quanh sườn núi, phụ nữ Mông địu con lên nương.",
            "Chính vì thế, Hồng Ngài không phải nơi để 'check-in' nhanh rồi đi. Nó đáng ghé cho những ai muốn hiểu vùng đất mà mình đang đi qua: vì sao người Mông chọn sống ở độ cao này, họ trồng gì, mùa nào bận rộn nhất, và cuộc sống ở đây đã đổi khác thế nào so với trang văn viết cách đây hơn nửa thế kỷ. Đi cùng người bản địa hoặc chủ homestay biết tiếng sẽ khiến chuyến ghé thăm khác hẳn về chiều sâu.",
          ],
        },
        {
          title: "Hang A Phủ (Thẳm Cốp)",
          body: [
            "Cách bản không xa là hang A Phủ, tên địa phương gọi là Thẳm Cốp. Vòm hang mở rộng, càng vào sâu càng mát lạnh, và ánh đèn pin quét lên là hiện ra những khối thạch nhũ buông từ trần xuống cùng nhiều ngách nhỏ ăn sâu vào lòng núi. Giữa trưa nắng gắt ngoài kia, bước vào hang là một cảm giác chuyển đổi rất rõ: nhiệt độ hạ hẳn, âm thanh tắt lịm, chỉ còn tiếng nước nhỏ giọt.",
            "Người dân quanh đây gắn hang với truyền thuyết địa phương và tên nhân vật trong tác phẩm của Tô Hoài, nên chuyện kể ở mỗi nhà một khác — nghe cũng là một phần thú vị của chuyến ghé. Hang chưa được khai thác du lịch bài bản: không đèn chiếu, không lối đi lát đá, nền trơn và tối. Bắt buộc mang đèn pin hoặc đèn đội đầu, và tốt nhất là nhờ một người dân dẫn vào thay vì tự mò mẫm.",
          ],
        },
      ],
      tips: [
        "Mang đèn pin/đèn đội đầu, giày chống trơn khi vào hang.",
        "Xin phép trước khi chụp ảnh người dân, nhất là trẻ nhỏ và trong nhà.",
        "Kết hợp ghé Hồng Ngài trên đường từ thị trấn Bắc Yên lên Tà Xùa.",
      ],
      gettingThere:
        "Từ thị trấn Bắc Yên đi khoảng 10–15km theo hướng Hồng Ngài, đường đèo nhỏ. Có thể ghép làm điểm dừng khi di chuyển giữa thị trấn và xã Tà Xùa.",
      tags: ["văn hóa", "bản làng", "hang động", "người Mông"],
    },
    {
      slug: "ruong-bac-thang-xim-vang",
      name: "Ruộng bậc thang Xím Vàng",
      tagline: "Thang lúa vàng ruộm vắt quanh sườn núi Bắc Yên.",
      category: SpotCategory.village,
      lat: 21.3009,
      lng: 104.4258,
      address: "Xã Xím Vàng, huyện Bắc Yên, Sơn La",
      description:
        "Cách bản Tà Xùa chừng 15km, Xím Vàng là nơi những thửa ruộng bậc thang xếp tầng tầng lớp lớp quanh sườn núi — mùa nước đổ thì loang loáng như gương, mùa lúa chín thì vàng rực cả thung lũng. Ít khách du lịch hơn hẳn Tà Xùa nên khung cảnh còn nguyên vẻ mộc mạc, và đây cũng là một điểm xuất phát quen thuộc của cung trekking đỉnh Tà Xùa.",
      bestTime: "Mùa lúa chín (tháng 9 – 10)",
      bestTimeNote:
        "Đẹp nhất vào mùa lúa chín tháng 9–10 và mùa nước đổ tháng 5–6. Sáng sớm ánh nắng xiên làm nổi rõ từng tầng ruộng — cũng là lúc dễ gặp mây vương trên thung lũng.",
      ticketFree: true,
      highlights: [
        {
          title: "Ruộng bậc thang còn nguyên nét mộc",
          body: [
            "Chỉ cách bản Tà Xùa chừng 15km nhưng Xím Vàng gần như nằm ngoài bản đồ du lịch, và đó chính là điều làm nên giá trị của nó. Không có điểm bán vé, không có cầu kính hay khung tim dựng sẵn để chụp ảnh, không có ai chèo kéo — chỉ có những thửa ruộng bậc thang xếp tầng tầng lớp lớp quanh sườn núi và nhịp canh tác thật của bà con người Mông diễn ra ngay trước mắt bạn.",
            "Vẻ đẹp ở đây đổi theo mùa rất rõ. Tháng 5–6 mùa nước đổ, các thửa ruộng ngập nước loang loáng phản chiếu trời mây như những tấm gương xếp bậc. Tháng 9–10 lúa chín, cả thung lũng chuyển sang màu vàng ruộm, và nếu may mắn bạn sẽ gặp cảnh bà con gặt lúa, tuốt lúa ngay tại ruộng — thứ mà không sân khấu du lịch nào dựng lại được. Sáng sớm là lúc đẹp nhất, khi nắng xiên làm nổi rõ từng đường bờ ruộng và mây còn vương lại dưới thung.",
          ],
        },
        {
          title: "Điểm xuất phát trekking đỉnh Tà Xùa",
          body: [
            "Ngoài cảnh quan, Xím Vàng còn có một vai trò rất thực tế: đây là một trong hai điểm tập kết quen thuộc của các đoàn leo đỉnh Tà Xùa 2.865m. Nhiều nhóm chọn xuất phát từ đây thay vì bản Tà Xùa vì đường vào rừng ngắn hơn và dễ tìm được porter — hầu hết porter giỏi trên cung này đều là người Mông sống quanh xã.",
            "Vì vậy, nếu định leo đỉnh, ghé Xím Vàng trước một buổi là cách hợp lý: gặp trực tiếp người dẫn đường, chốt lịch trình và giá, kiểm tra lại đồ đạc, đồng thời có thời gian đi vòng quanh ngắm ruộng bậc thang trước khi bắt đầu hai ngày trong rừng. Xã ít hàng quán và dịch vụ, nên nhớ mua sẵn nước cùng đồ ăn nhẹ từ thị trấn hoặc bản Tà Xùa.",
          ],
        },
      ],
      tips: [
        "Đường từ Tà Xùa sang Xím Vàng dốc và nhiều cua — chỉ đi khi tay lái vững hoặc thuê xe ôm.",
        "Đi vào mùa gặt sẽ gặp cảnh bà con thu hoạch rất sống động.",
        "Ít hàng quán, nên mang theo nước và đồ ăn nhẹ.",
      ],
      gettingThere:
        "Từ bản Tà Xùa chạy tiếp khoảng 15km đường bê tông men sống núi (khoảng 40–50 phút xe máy) là tới trung tâm xã Xím Vàng.",
      tags: ["ruộng bậc thang", "mùa lúa chín", "bản làng", "chụp ảnh"],
    },
    {
      slug: "thac-rong-ta-xua",
      name: "Thác Rồng Tà Xùa",
      tagline: "Dòng nước trắng đổ giữa vách núi trên đường lên bản.",
      category: SpotCategory.waterfall,
      lat: 21.2382,
      lng: 104.4325,
      address: "Xã Tà Xùa, huyện Bắc Yên, Sơn La",
      description:
        "Nằm ngay bên cung đường đèo từ thị trấn Bắc Yên lên bản Tà Xùa, thác Rồng đổ trắng xóa giữa vách đá phủ cây rừng. Không quá hùng vĩ nhưng là chỗ dừng chân mát rượi lý tưởng để duỗi chân, rửa mặt và chụp vài tấm ảnh trước khi tiếp tục leo dốc.",
      bestTime: "Sau mùa mưa (tháng 8 – 10)",
      bestTimeNote:
        "Nước nhiều và đẹp nhất sau mùa mưa, khoảng tháng 8–10. Mùa khô thác nhỏ lại nhưng đường đi dễ và an toàn hơn.",
      ticketFree: true,
      notice: "Đá quanh thác trơn, không trèo ra giữa dòng khi nước lớn.",
      highlights: [
        {
          title: "Điểm dừng chân giữa cung đèo",
          body: [
            "Đoạn 13km từ thị trấn Bắc Yên lên bản Tà Xùa là chuỗi cua tay áo và dốc đứng liên tục, đủ để tay lái mỏi và động cơ nóng ran. Thác Rồng nằm đúng vào giữa chặng ấy, ngay ven đường, nên gần như thành trạm nghỉ mặc định của dân phượt: tấp xe vào lề, tắt máy, và ngay lập tức nghe tiếng nước đổ cùng luồng khí mát lạnh phả ra từ vách núi.",
            "Thác không lớn và cũng không hùng vĩ như những cái tên nổi tiếng khác ở Tây Bắc — dòng nước trắng xóa đổ giữa vách đá phủ cây rừng, cao vừa phải. Nhưng đúng vào lúc bạn cần nghỉ, nó lại là thứ hợp lý nhất: rửa mặt cho tỉnh táo, duỗi chân vài phút, chụp một tấm ảnh rồi lên xe đi tiếp phần đèo còn lại với tinh thần khác hẳn.",
          ],
        },
        {
          title: "Đẹp nhất sau mùa mưa",
          body: [
            "Lượng nước ở thác thay đổi rất rõ theo mùa. Khoảng tháng 8–10, sau mùa mưa, nước từ thượng nguồn đổ về mạnh, dòng thác trắng xóa và tiếng nước vang cả một khúc đèo — đây là lúc thác đáng ghé nhất. Sang mùa khô, dòng chảy thu nhỏ lại thành vài dải mảnh len giữa đá, cảnh vẫn dễ chịu nhưng không còn ấn tượng.",
            "Đổi lại, mùa khô đường đi an toàn hơn nhiều. Đá quanh chân thác luôn trơn vì ẩm, và tuyệt đối không nên xuống lòng suối khi trời vừa mưa lớn ở phía trên — nước có thể dâng nhanh mà không báo trước. Cũng nhớ dừng xe sát lề: đây là đường đèo hẹp, tầm nhìn khuất và vẫn có xe tải chạy qua.",
          ],
        },
      ],
      tips: [
        "Dừng xe sát lề an toàn, đường đèo hẹp và có xe tải chạy qua.",
        "Không xuống lòng suối khi trời vừa mưa to ở thượng nguồn.",
      ],
      gettingThere:
        "Nằm ven đường tỉnh từ thị trấn Bắc Yên lên xã Tà Xùa, cách bản Tà Xùa khoảng 6–8km. Có chỗ dừng xe ngay ven đường.",
      tags: ["thác nước", "dừng chân", "chụp ảnh"],
    },
  ];

  const spotId: Record<string, string> = {};
  for (const s of spots) {
    const { slug, name, highlights, ticketTiers, ...rest } = s;
    const hl =
      highlights && highlights.length > 0
        ? highlights.map((h, i) => {
            const paras = h.body
              ? Array.isArray(h.body)
                ? h.body
                : [h.body]
              : [];
            return {
              title: h.title,
              body: paras.length
                ? paras.map((p) => `<p>${p}</p>`).join("")
                : null,
              order: i,
            };
          })
        : null;
    const tt =
      ticketTiers && ticketTiers.length > 0
        ? (ticketTiers as Prisma.InputJsonValue)
        : Prisma.DbNull;
    const row = await prisma.spot.upsert({
      where: { slug },
      update: {
        ...rest,
        ticketTiers: tt,
        placeId: taXua.id,
        ...PUB,
        // sửa: xoá điểm nhấn cũ rồi tạo lại theo thứ tự
        highlights: hl ? { deleteMany: {}, create: hl } : undefined,
      },
      create: {
        slug,
        name,
        ...rest,
        ticketTiers: tt,
        placeId: taXua.id,
        ...PUB,
        highlights: hl ? { create: hl } : undefined,
      },
    });
    spotId[slug] = row.id;
    await setImages({ spotId: row.id }, IMAGES[slug] ?? [], name);
  }

  // 4) Activities (M:N tới Spot)
  // spots[].blurb = nội dung RIÊNG của hoạt động này TẠI spot đó (qua SpotActivity).
  type ActivitySeed = {
    slug: string;
    name: string;
    kind: ActivityKind;
    category?: ActivityCategory;
    durationText?: string;
    seasonText?: string;
    operatorName?: string;
    phone?: string;
    ticketFree?: boolean;
    ticketTiers?: { label: string; price: number; note?: string }[];
    description?: string;
    // Thân bài chi tiết dạng blog — mảng các khối HTML (<h2>, <p>, <ul>,
    // <blockquote>…) sẽ được nối lại thành rich text. Xem proseClass để biết
    // các thẻ được style trên trang công khai.
    content?: string[];
    tags?: string[];
    spots: { slug: string; blurb?: string }[];
  };
  const activities: ActivitySeed[] = [
    {
      slug: "san-may-ta-xua",
      name: "Săn mây",
      kind: ActivityKind.common,
      category: ActivityCategory.nature,
      durationText: "Sáng sớm, 2–3 giờ",
      seasonText: "Tháng 10 – 4 (đẹp nhất 11–2)",
      ticketFree: true,
      description:
        "Việc phải làm ở Tà Xùa: dậy từ 4h30 khi trời còn tối đặc, khoác áo ấm chạy xe ra mỏm núi rồi ngồi chờ. Trời hửng dần, và bên dưới chân bạn cả thung lũng biến thành một biển mây trắng cuộn sóng, chỉ còn vài đỉnh núi nhô lên như đảo. Không cần kỹ năng gì — chỉ cần dậy sớm, mặc đủ ấm và một chút may mắn về thời tiết.",
      content: [
        "<p>Có những chuyến đi mà điểm đến là một nơi chốn. Tà Xùa thì khác: thứ người ta lặn lội 240km lên đây để tìm là một hiện tượng thời tiết. Mây — không phải mây trên đầu, mà mây nằm dưới chân, dày như một mặt biển, cuộn sóng chậm rãi giữa các sườn núi cho tới khi mặt trời lên và xóa sạch tất cả trong vài chục phút.</p>",
        "<h2>Vì sao Tà Xùa có nhiều mây đến vậy?</h2>",
        "<p>Bản Tà Xùa nằm ở độ cao khoảng 1.600m, còn các thung lũng bên dưới thì thấp hơn cả nghìn mét. Ban đêm, hơi ẩm từ thung lũng gặp không khí lạnh ngưng tụ lại thành một tầng mây dày mắc kẹt dưới thấp, trong khi bạn đang đứng ở phía trên nó. Đó là lý do bạn nhìn <em>xuống</em> mây chứ không nhìn lên, và cũng là lý do mây tan rất nhanh: chỉ cần nắng đủ mạnh làm ấm không khí, cả biển mây bốc hơi trong chưa đầy một giờ.</p>",
        "<h2>Đi mùa nào, sáng nào thì có mây?</h2>",
        "<p>Mùa săn mây kéo dài từ tháng 10 đến tháng 4, cao điểm là tháng 11 đến tháng 2. Nhưng đúng mùa không có nghĩa là sáng nào cũng có — điều đó phụ thuộc vào đêm hôm trước. Dấu hiệu đáng tin nhất mà dân bản hay dùng:</p>",
        "<ul><li><strong>Đêm lạnh, trời quang, nhìn thấy sao</strong> → sáng hôm sau khả năng cao có mây đẹp.</li><li><strong>Đêm mưa hoặc sương mù dày đặc ngay tại bản</strong> → nhiều khả năng sáng ra bạn ở <em>trong</em> mây chứ không ở trên mây, tầm nhìn chỉ vài mét.</li><li><strong>Trời nhiều gió mạnh</strong> → mây bị thổi tan hoặc không kịp tích tụ.</li></ul>",
        "<p>Hỏi chủ homestay tối hôm trước là cách đơn giản nhất: họ nhìn trời mỗi ngày và đoán khá chuẩn. Nếu đi được 2 đêm thì cơ hội gặp mây gần như gấp đôi — rất nhiều người lên một đêm, gặp sương mù, rồi về tay trắng.</p>",
        "<h2>Một buổi săn mây diễn ra thế nào</h2>",
        "<p><strong>4h00–4h30:</strong> chuông báo thức reo giữa cái lạnh có khi chỉ 5–8°C. Mặc lớp trong giữ nhiệt, khoác áo phao và áo gió ngoài cùng, đeo găng tay — trên mỏm núi lạnh hơn trong phòng rất nhiều.</p>",
        "<p><strong>4h30–5h15:</strong> chạy xe ra điểm ngắm trong bóng tối. Đường đèo dốc, sương mù và không đèn đường, nên nếu tay lái chưa vững, hãy hẹn xe ôm bản địa từ tối hôm trước thay vì tự đi.</p>",
        "<p><strong>5h15–6h00:</strong> gửi xe, đi bộ theo đường mòn ra mỏm. Cần đèn pin. Chọn chỗ ngồi, và chờ trong bóng tối — đây là quãng lạnh nhất, cũng là lúc bạn hiểu vì sao phải mang theo cốc trà nóng.</p>",
        "<p><strong>6h00–8h00:</strong> trời hửng, biển mây hiện dần từ xám sang trắng, rồi rìa mây bắt lửa thành hồng cam khi mặt trời lên. Đây là toàn bộ lý do bạn có mặt ở đây.</p>",
        "<p><strong>Sau 8h30:</strong> nắng lên, mây tan dần, thung lũng lộ ra bên dưới. Về homestay ăn sáng và ngủ bù — hầu như ai cũng làm vậy.</p>",
        "<h2>Nên chọn điểm nào?</h2>",
        "<p><strong>Sống lưng khủng long</strong> cho cảm giác mạnh nhất: bạn đi <em>giữa</em> hai biển mây, và đây cũng là nơi ra bức ảnh biểu tượng. <strong>Mỏm cá heo</strong> gần đường, dễ đi, hợp người muốn ngồi yên ngắm hơn là leo trèo. <strong>Cây cô đơn</strong> cho bố cục ảnh đẹp nhất mà gần như không tốn sức. Nếu ở hai đêm, hãy chia ra mỗi sáng một điểm thay vì cố nhồi cả ba vào một buổi.</p>",
        "<h2>Mang gì theo</h2>",
        "<ul><li>Áo phao/áo ấm dày, mũ len, găng tay — nhiệt độ trên mỏm có thể dưới 5°C, gió mạnh.</li><li>Đèn pin hoặc đèn đội đầu (điện thoại sẽ tụt pin rất nhanh vì lạnh).</li><li>Giày bám tốt: đường mòn đất, ẩm sương và trơn.</li><li>Sạc dự phòng, và giữ điện thoại trong túi áo trong để pin không sụt.</li><li>Bình giữ nhiệt đựng trà hoặc cà phê nóng — thứ nhỏ bé nhưng cứu cả buổi sáng.</li></ul>",
        "<blockquote>Nếu sáng hôm đó không có mây, đừng coi là hỏng chuyến. Trời quang cho tầm nhìn tuyệt đẹp xuống toàn bộ thung lũng Bắc Yên, và bạn vẫn còn cả ngày để đi đồi chè, sang Xím Vàng hoặc ghé Hồng Ngài. Mây là món quà, không phải lịch trình có thể đặt trước.</blockquote>",
      ],
      tags: ["săn mây", "bình minh", "miễn phí"],
      spots: [
        {
          slug: "song-lung-khung-long-ta-xua",
          blurb:
            "Điểm săn mây kinh điển nhất: đứng trên dải sống núi hẹp, mây dâng đầy cả hai bên vực khiến bạn như đi giữa hai biển mây.",
        },
        {
          slug: "mom-ca-heo-ta-xua",
          blurb:
            "Mỏm đá vươn hẳn ra khoảng không — ngồi trên mỏm nhìn mây trôi bên dưới là khung hình được săn đón nhất buổi sáng.",
        },
        {
          slug: "cay-co-don-ta-xua",
          blurb:
            "Gốc cây lẻ loi nổi lên giữa biển mây trắng, bố cục tối giản mà bức ảnh nào chụp ra cũng đẹp.",
        },
        {
          slug: "dinh-ta-xua",
          blurb:
            "Săn mây ở độ cao 2.865m dành cho người leo núi: phải cắm trại qua đêm, đổi lại là biển mây trải rộng nhất vùng.",
        },
      ],
    },
    {
      slug: "trekking-dinh-ta-xua",
      name: "Trekking chinh phục đỉnh Tà Xùa 2.865m",
      kind: ActivityKind.experience,
      category: ActivityCategory.adventure,
      durationText: "2 ngày 1 đêm (thong thả: 3 ngày)",
      seasonText: "Tháng 10 – 4; đẹp nhất 11–3",
      operatorName: "Porter & người dẫn đường bản Tà Xùa / Xím Vàng",
      ticketTiers: [
        { label: "Porter dẫn đường", price: 800000, note: "trọn gói theo đoàn 4–6 người" },
        { label: "Tour trọn gói 2N1Đ", price: 2000000, note: "gồm ăn uống, lều/lán, porter" },
      ],
      description:
        "Một trong những cung trekking đáng nhớ nhất Tây Bắc: hai ngày băng qua rừng nguyên sinh phủ rêu, những vạt trúc lùn và ba mỏm 'sống lưng khủng long' hẹp đến thót tim, để rồi đón bình minh trên biển mây ở độ cao 2.865m. Cung dài và dốc, cần thể lực tốt và bắt buộc có người dẫn đường bản địa.",
      content: [
        "<p>Trong danh sách những đỉnh cao nhất Việt Nam, Tà Xùa đứng ở nhóm mười — nhưng dân leo núi nhớ nó không phải vì con số 2.865m. Họ nhớ ba mỏm sống núi hẹp nối nhau, nhớ khu rừng phủ rêu như bước ra từ truyện cổ tích, và nhớ cái cảm giác đứng trên đỉnh lúc 6h sáng nhìn mây trải kín hai tỉnh dưới chân. Đây là cung leo đủ khó để thấy mình đã cố gắng, nhưng không đến mức chỉ dành cho dân chuyên nghiệp.</p>",
        "<h2>Cung leo này khó tới đâu?</h2>",
        "<p>Xếp hạng chung: <strong>khó vừa đến khó</strong>. Tổng quãng đường cả lên lẫn xuống khoảng 25–30km với chênh cao hơn 1.200m, trải trong hai ngày. Cái mệt của Tà Xùa không nằm ở một đoạn dốc đứng nào cụ thể mà ở nhịp lên–xuống liên tục: bạn leo hết một mỏm, tụt xuống yên ngựa, rồi lại leo tiếp mỏm nữa, ba lần như thế ở chặng gần đỉnh.</p>",
        "<p>Người có thói quen chạy bộ hoặc leo cầu thang đều đặn sẽ theo được. Người ít vận động vẫn leo được nhưng nên chọn lịch 3 ngày cho thong thả thay vì cố nhồi vào 2 ngày.</p>",
        "<h2>Lịch trình 2 ngày 1 đêm</h2>",
        "<h3>Ngày 1 — từ bản vào rừng, lên lán 2.400m</h3>",
        "<p>Buổi sáng tập kết ở bản Tà Xùa hoặc Xím Vàng, gặp porter, chia lại đồ: thứ gì không dùng tới trong hai ngày thì gửi lại homestay. Chặng đầu đi qua nương rẫy và những vạt trúc lùn, nắng và trống trải. Càng lên cao rừng càng kín, và đến trưa thì bạn đã ở trong khu rừng nguyên sinh phủ rêu — nghỉ ăn trưa ngay giữa rừng.</p>",
        "<p>Chiều là chặng nặng nhất trong ngày: dốc liên tục cho tới lán nghỉ ở khoảng 2.400m, thường tới nơi lúc 15h–17h. Porter nấu ăn, cả đoàn quây bếp lửa, và trời tối rất nhanh. Ngủ sớm vì hôm sau dậy từ 4h.</p>",
        "<h3>Ngày 2 — đón bình minh trên đỉnh rồi xuống núi</h3>",
        "<p>4h dậy, ăn nhẹ, đeo đèn đội đầu leo nốt phần còn lại trong bóng tối để kịp lên đỉnh trước khi mặt trời mọc. Đây là lúc đi qua ba mỏm sống lưng khủng long — đoạn đẹp nhất và cũng cheo leo nhất của cả cung. Trên đỉnh, nếu may mắn, bạn sẽ thấy biển mây trải kín các thung lũng Bắc Yên bên này và Trạm Tấu bên kia.</p>",
        "<p>Chụp ảnh, ăn sáng, rồi quay xuống. Đường xuống nhanh hơn nhưng hại đầu gối hơn — đây là lúc gậy leo núi phát huy tác dụng. Về tới bản khoảng đầu giờ chiều, kịp tắm rửa và bắt xe khách chiều muộn nếu cần.</p>",
        "<h2>Chi phí khoảng bao nhiêu?</h2>",
        "<ul><li><strong>Porter/người dẫn đường:</strong> khoảng 800.000đ trọn gói cho đoàn 4–6 người, chia đầu người ra khá nhẹ.</li><li><strong>Tour trọn gói 2N1Đ:</strong> khoảng 2.000.000đ/người, gồm ăn uống, lều hoặc chỗ ngủ lán và porter.</li><li><strong>Thuê đồ:</strong> túi ngủ, gậy leo núi thuê tại bản, vài chục tới hơn trăm nghìn mỗi món.</li></ul>",
        "<p>Không có vé tham quan — toàn bộ chi phí là trả cho người bản địa và đồ ăn. Nên đặt porter trước 1–2 ngày qua homestay, nhất là cuối tuần mùa cao điểm.</p>",
        "<h2>Đồ cần mang</h2>",
        "<ul><li><strong>Giày trekking cổ cao, bám tốt</strong> — quan trọng nhất, đừng đi giày thể thao đế phẳng.</li><li>Gậy leo núi (ít nhất một chiếc, tốt nhất là hai).</li><li>Túi ngủ ấm: đêm ở 2.400m có thể xuống dưới 5°C.</li><li>Áo ấm nhiều lớp + áo mưa mỏng (rừng hay mưa phùn bất chợt).</li><li>Đèn đội đầu và pin dự phòng — bắt buộc, vì cả hai buổi sáng đều xuất phát trong tối.</li><li>Sạc dự phòng, thuốc cá nhân, băng cá nhân, thuốc chống côn trùng.</li><li>Nước và đồ ăn nhanh; nếu đi tour trọn gói thì porter đã lo phần ăn chính.</li></ul>",
        "<h2>An toàn</h2>",
        "<p><strong>Bắt buộc có người dẫn đường bản địa.</strong> Rừng nhiều ngã rẽ, sương xuống là mất phương hướng rất nhanh, và sóng điện thoại gần như không có trên cung. Đã có những trường hợp nhóm tự đi bị lạc phải huy động dân bản tìm.</p>",
        "<p>Báo lịch trình cho homestay hoặc người thân trước khi vào rừng. Ở ba mỏm sống núi, đi chậm, không đùa nghịch và không cố tạo dáng sát mép khi gió mạnh. Nếu trời mưa lớn hoặc sương mù dày đặc, porter khuyên quay xuống thì hãy nghe theo — cung leo còn đó, đi lại lần sau.</p>",
        "<blockquote>Tránh mùa mưa tháng 6–8: đường lầy, vắt nhiều, đá trơn và nguy cơ sạt lở. Đẹp nhất là tháng 11–3, trời khô và dễ gặp biển mây; đi tháng 2–4 thì được thêm hoa đỗ quyên nở dọc đường lên đỉnh.</blockquote>",
      ],
      tags: ["trekking", "leo núi", "cắm trại", "thể lực tốt"],
      spots: [
        {
          slug: "dinh-ta-xua",
          blurb: "Đích đến của cung leo — ba mỏm sống núi và biển mây ở độ cao 2.865m.",
        },
        {
          slug: "rung-reu-ta-xua",
          blurb: "Chặng giữa ngày thứ nhất xuyên qua rừng rêu nguyên sinh — điểm ấn tượng nhất của cả cung.",
        },
        {
          slug: "ruong-bac-thang-xim-vang",
          blurb: "Điểm tập kết và thuê porter quen thuộc trước khi vào rừng.",
        },
      ],
    },
    {
      slug: "trekking-rung-reu-ta-xua",
      name: "Đi bộ rừng rêu",
      kind: ActivityKind.spot,
      category: ActivityCategory.nature,
      durationText: "Nửa ngày (trong cung leo đỉnh)",
      seasonText: "Tháng 10 – 4",
      description:
        "Chặng đi bộ xuyên khu rừng nguyên sinh nơi rêu phủ kín từ thân cây tới từng tảng đá. Sương giăng giữa tán lá, ánh sáng lọt xuống mờ ảo — quãng đường ngắn nhưng đủ để hiểu vì sao người ta gọi đây là khu rừng cổ tích.",
      content: [
        "<p>Hỏi những người đã leo đỉnh Tà Xùa rằng đoạn nào đáng nhớ nhất, câu trả lời thường không phải cột mốc trên đỉnh mà là khu rừng rêu ở chặng giữa. Bước từ nương rẫy nắng chang chang vào đây giống như đi qua một cánh cửa: ánh sáng dịu hẳn, không khí ẩm và lạnh, và mọi thứ trước mắt đều phủ một lớp xanh mềm.</p>",
        "<h2>Vì sao rêu mọc dày đến vậy?</h2>",
        "<p>Ở độ cao trên 2.000m, mây và sương ghé qua gần như mỗi ngày, giữ độ ẩm gần bão hòa suốt năm. Trong điều kiện đó, rêu và địa y phát triển không kiểm soát: bám kín thân cây cổ thụ, bò lên từng tảng đá, rủ xuống từ các cành khô thành những dải như màn cửa. Có chỗ lớp rêu dày tới mức ấn tay xuống thấy mềm và ướt như miếng bọt biển.</p>",
        "<h2>Đi bộ trong rừng rêu cảm giác thế nào</h2>",
        "<p>Điều gây bất ngờ nhất là âm thanh — hay đúng hơn là sự vắng mặt của nó. Lớp rêu và mùn lá nuốt gọn tiếng bước chân, nên bạn chỉ còn nghe tiếng nước đọng trên lá nhỏ giọt và tiếng thở của chính mình. Nhiều đoàn tự động hạ giọng khi đi qua đây mà không ai bảo ai.</p>",
        "<p>Buổi sáng là lúc rừng đẹp nhất: sương chưa tan, nắng lọt qua tán lá thành những vệt sáng nghiêng rõ nét trong không khí ẩm. Đây cũng là khung giờ để chụp ảnh — nhưng hãy chuẩn bị tinh thần ống kính sẽ bị mờ hơi nước liên tục, mang theo khăn lau mềm.</p>",
        "<h2>Đi thế nào?</h2>",
        "<p>Rừng rêu <strong>không phải điểm ghé bằng xe máy</strong> — nó nằm trên cung trekking lên đỉnh Tà Xùa, thường rơi vào chặng giữa của ngày leo thứ nhất. Nghĩa là muốn vào đây, bạn phải đi cùng đoàn leo núi và có porter dẫn đường. Một số đoàn đi thong thả chọn cách dừng nghỉ lâu hơn ở chặng này thay vì cố lên lán sớm.</p>",
        "<p>Đường trong rừng ẩm và trơn quanh năm, rễ cây chằng chịt ngang lối đi. Giày bám tốt là bắt buộc, và nên có áo mưa mỏng vì trong rừng hay có mưa phùn dù ngoài trời quang.</p>",
        "<blockquote>Thảm rêu rất mong manh: một mảng bị bóc đi có thể mất nhiều năm mới phục hồi. Chỉ đi trên lối mòn, không bóc rêu để chụp ảnh, không bẻ cành, không khắc tên lên thân cây. Rừng còn đẹp được bao lâu phụ thuộc gần như hoàn toàn vào những đoàn khách đi qua nó.</blockquote>",
      ],
      tags: ["rừng nguyên sinh", "chụp ảnh", "đi bộ"],
      spots: [
        {
          slug: "rung-reu-ta-xua",
          blurb: "Toàn bộ trải nghiệm nằm trong khu rừng rêu trên đường lên đỉnh Tà Xùa.",
        },
      ],
    },
    {
      slug: "phuot-xe-may-deo-ta-xua",
      name: "Phượt xe máy cung đèo Tà Xùa",
      kind: ActivityKind.common,
      category: ActivityCategory.adventure,
      durationText: "Nửa ngày – 1 ngày",
      seasonText: "Quanh năm; tránh ngày mưa lớn",
      ticketTiers: [
        { label: "Thuê xe máy / ngày", price: 150000 },
        { label: "Xe ôm bản địa / lượt", price: 100000, note: "chặng ngắn quanh bản" },
      ],
      description:
        "Cung 13km từ thị trấn Bắc Yên lên bản Tà Xùa rồi chạy tiếp sang Xím Vàng là một trong những đoạn đèo đẹp nhất Tây Bắc: đường vắt trên sống núi, một bên là vực mây, cua tay áo nối nhau và sương có thể ập xuống bất cứ lúc nào. Chạy chậm, dừng nhiều — mỗi khúc cua lại là một khung cảnh khác.",
      content: [
        "<p>Ở Tà Xùa, đường đi không phải phần phải chịu đựng để tới nơi — nó là một nửa lý do người ta lên đây. Mười ba cây số từ thị trấn Bắc Yên lên bản là chuỗi cua tay áo vắt trên sống núi, một bên vách đá một bên vực sâu, và cứ vài khúc cua thì cảnh lại đổi hoàn toàn: đang nắng chói bỗng chui vào một dải sương trắng đục, ra khỏi sương lại thấy cả thung lũng trải dưới chân.</p>",
        "<h2>Cung đường có gì</h2>",
        "<h3>Bắc Yên → bản Tà Xùa (13km)</h3>",
        "<p>Đoạn kinh điển. Đường bê tông và nhựa xen kẽ, mặt đường nhìn chung ổn nhưng độ dốc lớn và cua gấp liên tục, có những khúc cua tay áo phải về số 2 mới bò lên nổi. Càng lên cao càng dễ gặp sương: có hôm giữa trưa vẫn mù đặc, tầm nhìn chỉ chừng chục mét. Giữa chặng có thác Rồng ngay ven đường — chỗ dừng chân quen thuộc để nghỉ tay và làm nguội máy.</p>",
        "<h3>Bản Tà Xùa → Xím Vàng (15km)</h3>",
        "<p>Ít người chạy hơn nhưng cảnh thì xứng đáng: đường men theo sống núi, nhìn xuống là những thửa ruộng bậc thang xếp tầng của Xím Vàng, đẹp nhất mùa nước đổ tháng 5–6 và mùa lúa chín tháng 9–10. Đường hẹp và dốc hơn đoạn dưới, vài chỗ có vệt sạt lở sau mưa.</p>",
        "<h3>Cung dài từ Hà Nội (240km)</h3>",
        "<p>Dân phượt thường chạy Hà Nội – Sơn Tây – Thanh Sơn – Thu Cúc – Phù Yên – Bắc Yên, mất khoảng 7–9 giờ kể cả nghỉ. Đường tới thị trấn Bắc Yên nhìn chung dễ đi; toàn bộ phần khó dồn vào 13km cuối.</p>",
        "<h2>Chuẩn bị xe và người</h2>",
        "<ul><li><strong>Chọn xe số</strong> nếu thuê tại bản. Dốc đứng và liên tục khiến xe tay ga vừa yếu vừa nóng phanh; xe số cho phép ghì số để hãm khi xuống dốc.</li><li><strong>Kiểm tra phanh trước khi nhận xe</strong> — đây là thứ quan trọng nhất trên cung này, quan trọng hơn cả động cơ.</li><li><strong>Đổ đầy xăng ở thị trấn Bắc Yên.</strong> Trên bản rất ít chỗ bán xăng, có cũng thường là xăng chai giá cao.</li><li>Áo mưa và áo gió luôn để sẵn trong cốp: thời tiết trên núi đổi trong mười phút.</li></ul>",
        "<h2>Chạy sao cho an toàn</h2>",
        "<p>Nguyên tắc số một: <strong>không chạy đoạn đèo sau khi trời tối.</strong> Không đèn đường, sương dày và cua khuất khiến đèn xe gần như vô dụng. Nếu xe khách của bạn tới Bắc Yên lúc rạng sáng, hãy đợi trời hửng rồi mới lên bản, hoặc bắt xe ôm bản địa.</p>",
        "<p>Khi xuống dốc, dùng số thấp để ghì máy thay vì rà phanh liên tục — phanh nóng sẽ mất tác dụng đúng lúc bạn cần nhất. Vào cua thì giảm tốc trước khi vào, bám lề phải, bấm còi ở những khúc khuất tầm nhìn vì xe tải và xe máy dân bản chạy khá nhanh. Gặp sương mù dày thì bật đèn, giảm hẳn tốc độ và tấp vào chỗ rộng đợi tan bớt.</p>",
        "<h2>Chi phí</h2>",
        "<ul><li>Thuê xe máy tại bản: khoảng 150.000–200.000đ/ngày, thường kèm mũ bảo hiểm.</li><li>Xe ôm bản địa: khoảng 50.000–150.000đ mỗi chặng ngắn quanh bản.</li><li>Xăng: nhớ tính cả chặng đi Xím Vàng nếu định chạy sang đó.</li></ul>",
        "<blockquote>Nếu tay lái chưa vững hoặc chưa từng chạy đường đèo, đừng lấy Tà Xùa làm nơi tập. Thuê xe ôm bản địa vừa an toàn hơn nhiều, vừa được người thuộc đường chở tới đúng chỗ đúng giờ mây đẹp — và tiền đó ở lại với người dân trong bản.</blockquote>",
      ],
      tags: ["phượt", "đèo", "xe máy"],
      spots: [
        { slug: "thac-rong-ta-xua", blurb: "Điểm dừng chân mát rượi ngay ven đường lên bản." },
        { slug: "cay-co-don-ta-xua", blurb: "Tấp xe vào lề, đi bộ vài phút là tới gốc cây biểu tượng." },
        { slug: "ruong-bac-thang-xim-vang", blurb: "Đoạn Tà Xùa – Xím Vàng dốc và nhiều cua, nhưng cảnh ruộng bậc thang thì xứng đáng." },
      ],
    },
    {
      slug: "thuong-tra-shan-tuyet-ta-xua",
      name: "Thưởng trà Shan tuyết cổ thụ",
      kind: ActivityKind.experience,
      category: ActivityCategory.culture,
      durationText: "1 – 2 giờ",
      seasonText: "Quanh năm; vụ hái xuân tháng 3 – 5",
      operatorName: "Hộ làm chè bản Bẹ, bản Chung Chinh",
      ticketTiers: [{ label: "Thăm vườn & thưởng trà", price: 50000, note: "tuỳ hộ, nhiều nơi mời miễn phí" }],
      description:
        "Theo chân chủ vườn lên đồi thăm những gốc chè Shan tuyết hàng trăm tuổi phải trèo mới hái được búp, xem cách sao chè thủ công bên bếp củi, rồi ngồi nhấp chén trà vàng sánh giữa mây núi. Trà Tà Xùa chát nhẹ đầu lưỡi rồi ngọt hậu rất lâu — và cũng là món quà mang về gọn nhẹ nhất.",
      content: [
        "<p>Trước khi trở thành thiên đường săn mây, Tà Xùa đã nổi tiếng vì một thứ khác: chè. Cái tên 'Shan tuyết Tà Xùa' xuất hiện trong giới uống trà từ lâu, và nếu bạn dành nửa buổi rời khỏi các mỏm check-in để lên bản Bẹ hay bản Chung Chinh, bạn sẽ hiểu vì sao thứ trà này đắt và vì sao nó bị làm giả nhiều đến thế.</p>",
        "<h2>Chè Shan tuyết cổ thụ khác gì chè thường?</h2>",
        "<p>Hãy quên hình ảnh những đồi chè xanh mướt cắt tỉa bằng phẳng ngang hông người. Chè ở đây là <strong>cây cổ thụ thật</strong>: cao vài mét, thân xù xì phủ địa y và rêu mốc, nhiều gốc to đến mức một người ôm không xuể, tuổi đời tính bằng đời người. Búp non phủ một lớp lông trắng mịn như tuyết — đó là nguồn gốc cái tên 'Shan tuyết'.</p>",
        "<p>Cây mọc tự nhiên trên sườn núi cao, quanh năm trong mây, không phân bón, không thuốc. Đổi lại là sản lượng rất thấp: mỗi cây chỉ cho vài lứa búp một năm, và mỗi lứa phải có người trèo lên cành ngắt từng búp một — không máy móc nào thay được.</p>",
        "<h2>Một buổi ở vườn chè diễn ra thế nào</h2>",
        "<p><strong>Lên đồi xem cây.</strong> Chủ vườn dẫn bạn đi giữa những gốc chè cổ thụ, chỉ đâu là búp đạt chuẩn 'một tôm hai lá', kể cây nào bao nhiêu tuổi, cây nào của ông bà để lại. Đúng vụ xuân tháng 3–5 thì bạn sẽ thấy cả cảnh bà con ngồi vắt vẻo trên cành hái búp.</p>",
        "<p><strong>Xem sao chè.</strong> Về bếp, chảo gang đặt trên lửa củi, búp chè được đảo liên tục bằng tay. Đây là công đoạn quyết định: canh lửa sai hoặc đảo không đều là cả mẻ mất hương, cháy xém hoặc ngái. Nhìn một lần mới thấy vì sao chè thủ công không thể rẻ.</p>",
        "<p><strong>Thưởng trà.</strong> Nước pha phải già nhưng không sôi sục, tráng ấm rồi bỏ nước đầu. Nước ra màu vàng sánh như mật, thơm mùi khói nhẹ. Vị chát đến trước, rất nhanh, rồi nhường chỗ cho vị ngọt hậu đọng lại trong cổ họng lâu bất ngờ — dân trà gọi là 'hồi cam'.</p>",
        "<h2>Mua trà làm quà — và tránh mua nhầm</h2>",
        "<p>Trà Shan tuyết Tà Xùa bị trộn và làm giả khá phổ biến dưới xuôi, nên mua trực tiếp từ hộ làm tại bản vừa rẻ hơn vừa yên tâm hơn. Vài điểm để nhận biết:</p>",
        "<ul><li><strong>Búp phủ lông trắng</strong> rõ, cánh chè xoăn chặt, không vụn nát.</li><li><strong>Nước vàng sánh</strong>, trong; nước đục hoặc nâu sẫm là dấu hiệu chè kém hoặc sao hỏng.</li><li><strong>Hậu ngọt kéo dài</strong> sau vị chát; chè trộn thường chát gắt rồi tắt hẳn.</li><li>Hỏi thẳng chủ nhà chè hái vụ nào, cây ở khu nào — người làm thật luôn trả lời được.</li></ul>",
        "<p>Giá dao động khá rộng tùy loại và vụ hái. Cứ hỏi vài hộ để có mặt bằng chung trước khi mua nhiều, và mua ngay tại vườn thì thường được uống thử thoải mái trước khi quyết định.</p>",
        "<blockquote>Đây là hoạt động hiếm hoi ở Tà Xùa không phụ thuộc thời tiết. Hôm nào sương mù dày, săn mây thất bại, thì nửa buổi ở vườn chè là phương án thay thế tốt nhất — vẫn được ở giữa mây, chỉ là ngồi trong bếp ấm với một ấm trà nóng.</blockquote>",
      ],
      tags: ["chè Shan tuyết", "văn hóa", "mua quà", "trải nghiệm bản địa"],
      spots: [
        {
          slug: "doi-che-shan-tuyet-ta-xua",
          blurb: "Thăm vườn chè cổ thụ ở bản Bẹ, xem sao chè và thưởng trà ngay tại nhà dân.",
        },
      ],
    },
    {
      slug: "cam-trai-ngu-leu-ta-xua",
      name: "Cắm trại ngủ lều săn mây",
      kind: ActivityKind.experience,
      category: ActivityCategory.adventure,
      durationText: "1 đêm",
      seasonText: "Tháng 10 – 4 (đêm rất lạnh)",
      operatorName: "Homestay & điểm cắm trại tại bản Tà Xùa",
      ticketTiers: [
        { label: "Lều 2 người (thuê)", price: 300000, note: "gồm túi ngủ" },
        { label: "Combo lều + ăn tối", price: 500000 },
      ],
      description:
        "Dựng lều ngay trên mỏm đồi, tối đốt lửa ăn lẩu gà bản, đêm ngẩng lên là bầu trời sao không vướng chút ánh đèn thành phố — rồi sáng chỉ cần mở cửa lều là thấy biển mây ngay trước mặt. Đêm trên núi có thể xuống dưới 5°C nên túi ngủ và áo ấm là bắt buộc.",
      content: [
        "<p>Có một lý lẽ rất thực dụng đằng sau việc ngủ lều ở Tà Xùa: nếu cắm trại ngay tại điểm ngắm mây, bạn không phải dậy lúc 4h rồi mò mẫm chạy xe qua đường đèo tối om nữa. Chỉ cần kéo khóa lều là biển mây đã ở ngay trước mặt. Nhưng phần thưởng thật ra đến sớm hơn thế — từ đêm hôm trước.</p>",
        "<h2>Một đêm trên đồi</h2>",
        "<p>Chiều muộn dựng lều, chọn hướng cửa quay ra thung lũng. Trời tối rất nhanh và lạnh ập xuống cũng nhanh không kém. Bữa tối thường là lẩu gà bản hoặc đồ nướng quanh bếp lửa do homestay chuẩn bị sẵn, ăn trong cái lạnh nên mọi thứ đều ngon hơn bình thường.</p>",
        "<p>Rồi tới phần mà ít ai lường trước: bầu trời. Tà Xùa cách xa mọi nguồn sáng đô thị, nên vào đêm quang mây, số sao nhìn thấy bằng mắt thường nhiều đến mức gây choáng, và dải Ngân Hà hiện rõ trong những tháng thích hợp. Nhiều người kể rằng họ nhớ đêm ngắm sao hơn cả buổi săn mây sáng hôm sau.</p>",
        "<h2>Lạnh tới mức nào?</h2>",
        "<p>Đây là điều cần nói thẳng: <strong>đêm mùa đông trên đồi có thể xuống 0–5°C</strong>, cộng thêm gió và hơi ẩm khiến cảm giác còn lạnh hơn con số. Một chiếc chăn mỏng hay túi ngủ mùa hè sẽ khiến bạn thức trắng và run cầm cập tới sáng.</p>",
        "<ul><li><strong>Túi ngủ ấm</strong> (loại chịu được 0–5°C) — quan trọng nhất, thường thuê được kèm lều.</li><li>Tấm cách nhiệt lót dưới túi ngủ: hơi lạnh bốc từ mặt đất lên mới là thứ làm bạn mất ngủ.</li><li>Mũ len, tất dày, găng tay — ngủ luôn cả mũ và tất.</li><li>Áo phao, áo gió mặc ngoài khi ngồi bên bếp lửa.</li><li>Đèn pin/đèn đội đầu, sạc dự phòng (pin tụt rất nhanh trong lạnh).</li><li>Bình giữ nhiệt đựng nước nóng.</li></ul>",
        "<h2>Cắm trại ở đâu, chi phí bao nhiêu</h2>",
        "<p>Hai khu được chọn nhiều nhất là <strong>đồi gần sống lưng khủng long</strong> — sáng ra đi bộ vài phút là tới điểm săn mây — và <strong>bãi đất trống quanh cây cô đơn</strong>, thoáng, dễ dựng lều, tiện ngắm cả hoàng hôn lẫn bình minh.</p>",
        "<ul><li>Thuê lều 2 người kèm túi ngủ: khoảng 300.000đ.</li><li>Combo lều + bữa tối: khoảng 500.000đ.</li></ul>",
        "<p>Đặt trước qua homestay tại bản, nhất là cuối tuần mùa cao điểm tháng 11–2. Hầu hết homestay đều nhận dựng lều sẵn và lo phần ăn, bạn chỉ việc mang đồ cá nhân lên.</p>",
        "<h2>Lưu ý</h2>",
        "<p>Không dựng lều sát mép vực hay ngay trên sống núi hẹp — gió đêm mạnh hơn nhiều so với ban ngày. Dập kỹ bếp lửa trước khi ngủ. Và điều quan trọng nhất: <strong>mang rác của mình xuống núi</strong>. Các đồi cắm trại ở Tà Xùa đã bắt đầu quá tải vì vỏ lon, hộp xốp và túi nilon bỏ lại; không có ai dọn thay bạn ngoài chính người dân trong bản.</p>",
        "<blockquote>Nếu thời tiết dự báo mưa hoặc sương mù dày, hãy đổi sang ngủ homestay. Lều ướt trong cái lạnh 5°C là một đêm rất khổ, và sáng hôm sau cũng sẽ không có mây để ngắm.</blockquote>",
      ],
      tags: ["cắm trại", "săn mây", "ngắm sao"],
      spots: [
        { slug: "song-lung-khung-long-ta-xua", blurb: "Khu đồi gần sống lưng khủng long là điểm dựng lều được ưa chuộng nhất để sáng ra là săn mây luôn." },
        { slug: "cay-co-don-ta-xua", blurb: "Bãi đất trống quanh cây cô đơn thoáng và dễ dựng lều, tiện ngắm hoàng hôn lẫn bình minh." },
      ],
    },
    {
      slug: "kham-pha-ban-nguoi-mong-ta-xua",
      name: "Khám phá bản người Mông",
      kind: ActivityKind.common,
      category: ActivityCategory.culture,
      durationText: "Nửa ngày",
      seasonText: "Quanh năm; rộn ràng nhất dịp Tết Mông (tháng 12 âm)",
      ticketFree: true,
      description:
        "Rời các mỏm check-in, đi bộ vào bản để gặp một Tà Xùa rất khác: nếp nhà gỗ pơ mu, hàng rào đá, phụ nữ Mông ngồi thêu bên hiên và lũ trẻ chạy chân đất trên đường bê tông. Nhiều homestay nhận dẫn khách đi thăm bản, ăn cơm cùng gia đình và nghe kể chuyện nghề chè, nghề rừng.",
      content: [
        "<p>Phần lớn khách lên Tà Xùa đi theo một quỹ đạo khá giống nhau: săn mây lúc sáng, ngủ bù, chiều chụp ảnh ở cây cô đơn, tối ăn lẩu rồi hôm sau xuống núi. Nhưng ngay bên cạnh những mỏm check-in ấy là các bản người Mông đã sống ở độ cao này từ nhiều đời, và chỉ cần bỏ ra nửa buổi đi bộ vào bản là chuyến đi có thêm một lớp nghĩa khác hẳn.</p>",
        "<h2>Bản làng ở đây trông thế nào</h2>",
        "<p>Nhà gỗ pơ mu lợp ván, ám khói bếp qua nhiều năm. Hàng rào đá xếp tay chạy dọc lối đi, thứ mà người Mông làm từ chính đá nhặt trên nương. Ngô treo lủng lẳng dưới mái hiên để dành cho mùa giáp hạt. Phụ nữ ngồi thêu hoặc se lanh bên cửa, trẻ con chạy chân đất, và ở đâu đó luôn có tiếng lợn, tiếng gà.</p>",
        "<p>Nhịp sống ấy đổi theo mùa rõ rệt: vụ hái chè xuân tháng 3–5 thì cả bản lên đồi, mùa gặt tháng 9–10 thì ra ruộng bậc thang, còn quanh Tết Mông (khoảng tháng 12 âm lịch) là lúc rộn ràng nhất trong năm với hội, với những bộ váy áo thêu rực rỡ mang ra mặc.</p>",
        "<h2>Đi đâu</h2>",
        "<p><strong>Bản Hồng Ngài</strong> — bản người Mông trong 'Vợ chồng A Phủ' của Tô Hoài, kèm hang A Phủ (Thẳm Cốp) gần đó. Nằm trên đường từ thị trấn Bắc Yên lên bản Tà Xùa nên rất tiện ghép làm điểm dừng.</p>",
        "<p><strong>Xím Vàng</strong> — cách bản Tà Xùa 15km, ít khách du lịch hơn hẳn, ruộng bậc thang và nhịp canh tác còn nguyên bản.</p>",
        "<p><strong>Bản Bẹ, bản Chung Chinh</strong> — các bản làm chè Shan tuyết, nơi dễ bắt chuyện nhất vì bà con quen tiếp khách tới thăm vườn.</p>",
        "<h2>Đi cùng ai</h2>",
        "<p>Tự đi bộ lang thang trong bản cũng được, nhưng trải nghiệm sẽ khác hẳn nếu có người bản địa đi cùng. Nhiều homestay nhận dẫn khách đi thăm bản, và họ là cầu nối ngôn ngữ — không phải ai trong bản cũng nói tiếng Kinh thành thạo, nhất là người lớn tuổi và phụ nữ.</p>",
        "<p>Một số gia đình nhận nấu cơm mời khách ăn cùng: cơm nếp nương, gà đen, rau rừng hái quanh nhà, rượu ngô. Đây thường là lúc câu chuyện thật sự bắt đầu — chuyện nghề chè được giá mất giá, chuyện đi rừng, chuyện con cái xuống núi học rồi có quay về hay không.</p>",
        "<h2>Ứng xử — phần quan trọng nhất</h2>",
        "<ul><li><strong>Xin phép trước khi chụp ảnh</strong>, đặc biệt là trẻ nhỏ, người già và trong nhà. Một câu hỏi và một nụ cười là đủ, và nếu người ta từ chối thì tôn trọng.</li><li><strong>Đừng cho trẻ con tiền hoặc bánh kẹo</strong> — việc này tạo thói quen xin xỏ và đã làm hỏng không khí ở nhiều điểm du lịch vùng cao. Muốn giúp thì mua hàng của bà con hoặc gửi qua trường học trong xã.</li><li>Hỏi trước khi vào nhà; nhiều gia đình Mông có bàn thờ và những khu vực kiêng kỵ với người lạ.</li><li>Mua đồ thì trả giá nhẹ nhàng, đừng mặc cả tới cùng vì vài chục nghìn.</li><li>Ăn mặc kín đáo khi vào bản, nhất là dịp lễ.</li></ul>",
        "<blockquote>Cách đóng góp thiết thực nhất cho bản không phải là quà bánh mà là tiêu tiền đúng chỗ: ngủ homestay của người bản địa, thuê xe ôm và porter trong bản, mua chè trực tiếp từ hộ làm. Đó là thứ giữ cho Tà Xùa còn là một nơi có người sống, chứ không chỉ là một phông nền chụp ảnh.</blockquote>",
      ],
      tags: ["văn hóa", "bản làng", "người Mông", "trải nghiệm bản địa"],
      spots: [
        { slug: "ban-hong-ngai-hang-a-phu", blurb: "Bản Hồng Ngài trong 'Vợ chồng A Phủ' — ghé bản rồi vào thăm hang A Phủ." },
        { slug: "ruong-bac-thang-xim-vang", blurb: "Xím Vàng ít khách hơn, nhịp sống và mùa gặt còn rất nguyên bản." },
        { slug: "doi-che-shan-tuyet-ta-xua", blurb: "Các bản làm chè là nơi dễ trò chuyện và hiểu nghề truyền đời của bà con nhất." },
      ],
    },
    {
      slug: "ngam-hoa-do-quyen-ta-xua",
      name: "Ngắm hoa đỗ quyên nở",
      kind: ActivityKind.common,
      category: ActivityCategory.nature,
      durationText: "Theo cung trekking",
      seasonText: "Tháng 2 – 4",
      ticketFree: true,
      description:
        "Cuối mùa đông sang xuân, đỗ quyên bung nở đỏ rực và hồng phớt dọc các sườn núi cao trên đường lên đỉnh Tà Xùa. Đây là lý do nhiều dân trekking chọn đi cung này vào tháng 2–4 thay vì mùa mây cao điểm.",
      content: [
        "<p>Mùa săn mây cao điểm rơi vào tháng 11–2, nên nhiều người mặc định đó là thời điểm duy nhất đáng lên Tà Xùa. Nhưng dân trekking lại có một mùa riêng của họ: khoảng tháng 2 đến tháng 4, khi đỗ quyên trên các sườn núi cao đồng loạt bung nở và cả cung leo lên đỉnh đổi màu.</p>",
        "<h2>Hoa nở khi nào, ở đâu</h2>",
        "<p>Đỗ quyên ở Tà Xùa là loài mọc tự nhiên trên độ cao lớn, nở lác đác từ tháng 2 và rộ nhất khoảng tháng 3. Càng lên cao hoa càng dày: đoạn từ khoảng 2.500m trở lên gần đỉnh là nơi tập trung nhiều nhất, với sắc đỏ rực và hồng phớt xen giữa nền xanh của rừng. Ở chặng rừng rêu phía dưới cũng có vài vạt nở sớm hơn.</p>",
        "<p>Thời điểm chính xác xê dịch theo năm, phụ thuộc vào việc mùa đông năm đó lạnh sâu hay ấm sớm. Cách đáng tin nhất là hỏi porter hoặc homestay ngay trước chuyến đi — họ lên xuống cung này thường xuyên và biết tuần nào hoa đang đẹp.</p>",
        "<h2>Đi ngắm hoa nghĩa là phải leo núi</h2>",
        "<p>Cần nói rõ để không nhầm: đây <strong>không phải điểm ghé bằng xe máy</strong>. Đỗ quyên nở trên cao, dọc cung trekking lên đỉnh Tà Xùa, nên muốn thấy hoa thì phải đi cả cung leo 2 ngày 1 đêm cùng porter dẫn đường. Ở dưới bản không có.</p>",
        "<p>Bù lại, tháng 2–4 là quãng thời tiết khá dễ chịu để leo: đã hết mùa lạnh sâu, chưa vào mùa mưa, đường khô ráo. Và nếu may mắn, bạn vẫn có thể gặp biển mây vào sáng sớm — cuối mùa mây vắt sang đầu mùa hoa là khoảng giao nhau đẹp nhất trong năm.</p>",
        "<h2>Chụp ảnh</h2>",
        "<p>Ánh sáng đẹp nhất là buổi sáng sớm khi sương chưa tan, hoa còn đọng nước. Cụm đỗ quyên nở trên nền trời hoặc nền biển mây phía sau cho bố cục mạnh hơn nhiều so với chụp cận cảnh bông hoa đơn lẻ. Đừng bẻ cành để cầm tạo dáng — đỗ quyên núi cao lớn rất chậm.</p>",
        "<blockquote>Nếu bạn định leo Tà Xùa một lần trong đời và phân vân chọn mùa: tháng 11–1 cho biển mây dày nhất, tháng 2–3 cho hoa đỗ quyên và thời tiết dễ chịu hơn. Cả hai đều đúng — chỉ là hai chuyến đi khác nhau.</blockquote>",
      ],
      tags: ["hoa đỗ quyên", "mùa xuân", "trekking"],
      spots: [
        { slug: "dinh-ta-xua", blurb: "Đỗ quyên nở dày nhất ở đoạn gần đỉnh, trên độ cao 2.500m trở lên." },
        { slug: "rung-reu-ta-xua", blurb: "Vài vạt đỗ quyên xen giữa rừng rêu, nở lác đác từ tháng 2." },
      ],
    },
    {
      slug: "check-in-song-lung-khung-long",
      name: "Check-in sống lưng khủng long",
      kind: ActivityKind.spot,
      category: ActivityCategory.relax,
      durationText: "1 – 2 giờ",
      seasonText: "Quanh năm",
      ticketFree: true,
      description:
        "Bức ảnh 'phải có' của mọi chuyến Tà Xùa: một người nhỏ xíu đứng giữa dải sống núi hẹp, hai bên là vực mây trắng xóa. Đi bộ chừng 20–30 phút từ chỗ gửi xe, chọn góc từ mỏm cao nhìn xuống để lấy trọn đường sống núi uốn lượn.",
      content: [
        "<p>Hãy thành thật: một phần lý do rất nhiều người lên Tà Xùa là để có bằng được tấm ảnh đó — dáng người nhỏ xíu đứng giữa dải sống núi hẹp, hai bên là vực mây trắng xóa. Tin tốt là bức ảnh ấy không khó chụp và cũng chẳng cần máy móc đắt tiền. Chỉ cần đúng giờ, đúng góc và một chút kiên nhẫn.</p>",
        "<h2>Chọn giờ</h2>",
        "<p>Khung giờ vàng là <strong>6h–7h30 sáng</strong>: mây còn dày, nắng vừa đủ để tách chủ thể khỏi nền mà chưa gắt. Sau 8h30, mây tan và nắng lên cao khiến ảnh bệt màu, tương phản gắt.</p>",
        "<p>Cuối chiều là lựa chọn thứ hai ít người biết: nắng xiên tạo bóng đổ dài trên sống núi và trời thường có màu ấm, tuy mây mỏng hơn sáng sớm. Đổi lại, chiều vắng hơn nhiều — không phải chờ tới lượt.</p>",
        "<h2>Góc chụp</h2>",
        "<p><strong>Góc kinh điển:</strong> đứng ở mỏm cao đầu đường mòn, nhìn dọc theo sống núi. Người mẫu đi ra đoạn xa, người chụp ở lại mỏm. Lấy trọn đường cong uốn lượn của sống núi làm đường dẫn, và để dáng người thật nhỏ trong khung — chính sự chênh lệch tỉ lệ đó mới tạo ra hiệu ứng choáng ngợp.</p>",
        "<p><strong>Hạ máy thấp</strong> gần sát mặt đất rồi hướng lên: sống núi sẽ nổi bật hơn trên nền trời và mây, tránh được phần đất trống ở tiền cảnh.</p>",
        "<p><strong>Chụp ngược sáng</strong> lúc mặt trời vừa ló: để mặt trời khuất sau người mẫu, chấp nhận bóng đổ tối để lấy viền sáng quanh dáng người. Điện thoại đời mới xử lý cảnh này khá tốt ở chế độ HDR.</p>",
        "<p><strong>Đừng quên chụp rộng không có người.</strong> Nhiều người mải chụp chân dung rồi về nhà mới tiếc vì không có tấm nào ghi lại toàn cảnh biển mây.</p>",
        "<h2>Vài điều nên biết trước</h2>",
        "<ul><li><strong>Đi sớm để khỏi xếp hàng.</strong> Cuối tuần mùa cao điểm, các góc đẹp có thể phải chờ 15–20 phút mới tới lượt.</li><li><strong>Pin tụt rất nhanh</strong> trong lạnh — mang sạc dự phòng và giữ điện thoại trong túi áo trong khi chưa dùng.</li><li>Mang khăn mềm lau ống kính: hơi ẩm bám liên tục khi mây tràn qua.</li><li>Áo màu đỏ, cam hoặc vàng nổi bật hẳn trên nền mây trắng và trời xám; áo trắng thì gần như biến mất.</li><li>Chân máy nhỏ hoặc gậy chụp ảnh hữu ích nếu đi một mình, nhưng gió trên sống núi khá mạnh — giữ chắc.</li></ul>",
        "<blockquote>Không tấm ảnh nào đáng đổi bằng một cú trượt chân. Sống núi hẹp, đất trơn khi có sương và hai bên là vực thật. Đừng lùi lại để 'lấy thêm khung', đừng nhảy, đừng tạo dáng sát mép khi gió mạnh, và nếu chỗ đó đang đông thì chờ thay vì chen.</blockquote>",
      ],
      tags: ["check-in", "chụp ảnh", "bình minh"],
      spots: [
        {
          slug: "song-lung-khung-long-ta-xua",
          blurb: "Góc đẹp nhất là từ mỏm cao đầu đường mòn nhìn dọc theo sống núi; đi sớm để tránh phải xếp hàng chụp.",
        },
      ],
    },
  ];

  for (const a of activities) {
    const { slug, name, spots: aSpots, ticketTiers, content, ...rest } = a;
    const html = content && content.length > 0 ? content.join("") : null;
    const tt =
      ticketTiers && ticketTiers.length > 0
        ? (ticketTiers as Prisma.InputJsonValue)
        : Prisma.DbNull;
    const links = aSpots.map((s, i) => ({
      spotId: spotId[s.slug],
      order: i,
      blurb: s.blurb ?? null,
    }));
    const row = await prisma.activity.upsert({
      where: { slug },
      update: {
        ...rest,
        content: html,
        ticketTiers: tt,
        placeId: taXua.id,
        ...PUB,
        spotLinks: { deleteMany: {}, create: links },
      },
      create: {
        slug,
        name,
        ...rest,
        content: html,
        ticketTiers: tt,
        placeId: taXua.id,
        ...PUB,
        spotLinks: { create: links },
      },
    });
    await setImages({ activityId: row.id }, IMAGES[slug] ?? [], name);
  }

  // ──────────────────────────────────────────────────────────────────────
  // 5) Quán ăn (Eatery)
  //
  // Ẩm thực Tà Xùa KHÔNG giống một phố biển: cả xã chỉ có một con đường độc
  // đạo, quán xá đếm trên đầu ngón tay và phần lớn khách ăn ngay tại bếp
  // homestay (đặt cơm trước từ chiều). Danh sách dưới đây tôn trọng thực tế
  // đó — thà ít mà đúng còn hơn dựng ra một "khu ẩm thực" không tồn tại.
  //
  // CHỦ Ý KHÔNG có `phone`/`bookingUrl`: số điện thoại là dữ liệu phải xác
  // minh với chính chủ (xem định vị "danh bạ đã xác minh" trong CLAUDE.md).
  // Seed ra một dãy số bịa là tiếp tay cho chính cái mà sản phẩm này muốn
  // chống. Biên tập điền sau trong CMS khi đã gọi kiểm chứng.
  // Toạ độ là VỊ TRÍ TƯƠNG ĐỐI quanh trung tâm bản, đủ để bản đồ không vỡ —
  // cũng cần chỉnh lại khi khảo sát thực địa.
  // ──────────────────────────────────────────────────────────────────────
  const LOC = {
    provinceName: "Sơn La",
    districtName: "Huyện Bắc Yên",
    wardName: "Xã Tà Xùa",
  } as const;

  const eateries = [
    {
      slug: "bep-homestay-ta-xua",
      name: "Bếp homestay bản Tà Xùa",
      category: EateryCategory.local,
      meals: [Meal.breakfast, Meal.lunch, Meal.dinner],
      address: "Bản Tà Xùa, dọc trục đường chính qua xã",
      ...LOC,
      lat: 21.2521,
      lng: 104.4507,
      openingHours: "Theo bữa đã đặt · sáng từ 5:30 cho khách săn mây",
      notice:
        "Phải báo trước ít nhất nửa buổi — bếp đi chợ theo số suất, không có sẵn để khách vãng lai vào gọi món.",
      tags: ["cơm bản", "đặt trước", "ăn cùng chủ nhà"],
      description:
        "Cách ăn phổ biến nhất ở Tà Xùa: đặt cơm ngay tại homestay đang ở. Mâm thường có gà đen hoặc lợn bản, rau cải mèo hái sau nhà, măng rừng và một bát canh nóng — nấu theo kiểu người Mông, mặn tay và nhiều gia vị rừng. Khách săn mây có thể xin gói xôi mang đi từ 5h sáng.",
    },
    {
      slug: "lau-ga-den-ta-xua",
      name: "Lẩu gà đen Tà Xùa",
      category: EateryCategory.local,
      meals: [Meal.dinner, Meal.latenight],
      address: "Trung tâm bản Tà Xùa, gần khu homestay",
      ...LOC,
      lat: 21.2508,
      lng: 104.4516,
      openingHours: "11:00 – 21:00",
      notice: "Gà đen làm mất khoảng 45 phút — gọi điện đặt trước khi lên tới bản.",
      tags: ["lẩu", "gà đen", "buổi tối", "hợp nhóm"],
      description:
        "Quán ăn tối đông nhất bản, hầu như đoàn nào cũng ghé một bữa. Nồi lẩu gà đen nấu với thuốc bắc và gừng núi rất hợp thời tiết 10 độ; ăn kèm rau cải mèo nhúng, măng chua và chén muối chấm hạt dổi.",
    },
    {
      slug: "quan-com-doi-che-ta-xua",
      name: "Quán cơm đồi chè",
      category: EateryCategory.local,
      meals: [Meal.breakfast, Meal.lunch],
      address: "Đoạn đường qua đồi chè cổ thụ, bản Bẹ",
      ...LOC,
      lat: 21.2634,
      lng: 104.4429,
      openingHours: "7:00 – 15:00",
      notice: "Hết đồ là nghỉ sớm, ngày vắng khách có khi đóng cửa cả buổi chiều.",
      tags: ["cơm bình dân", "ăn trưa", "ven đường"],
      description:
        "Quán cơm bình dân bên đường vòng qua đồi chè, tiện cho chặng giữa buổi khi vừa đi bộ về từ cây cô đơn. Món quen: cơm rang, mì xào, trứng ốp, thêm đĩa rau cải mèo xào tỏi và ấm chè Shan tuyết nóng miễn phí.",
    },
    {
      slug: "quan-nuong-dem-ta-xua",
      name: "Quán nướng đêm bản Tà Xùa",
      category: EateryCategory.bbq,
      meals: [Meal.dinner, Meal.latenight],
      address: "Trung tâm bản Tà Xùa",
      ...LOC,
      lat: 21.2497,
      lng: 104.4523,
      openingHours: "17:00 – 23:00",
      notice: "Ngồi ngoài trời quanh bếp than — mùa đông nhớ mặc đủ ấm.",
      tags: ["nướng", "ăn đêm", "lai rai"],
      description:
        "Bếp than đỏ giữa trời lạnh, phục vụ thịt lợn bản ba chỉ, cá suối kẹp tre, ngô nướng và rau củ. Chỗ tụ tập buổi tối của cả khách lẫn thanh niên trong bản, thường mở tới khi hết khách.",
    },
    {
      slug: "nha-tra-shan-tuyet-ta-xua",
      name: "Nhà trà Shan tuyết",
      category: EateryCategory.cafe,
      meals: [Meal.cafe],
      address: "Bản Bẹ, cạnh vùng chè cổ thụ",
      ...LOC,
      lat: 21.2657,
      lng: 104.4418,
      openingHours: "8:00 – 18:00",
      tags: ["thưởng trà", "chè Shan tuyết", "mua quà"],
      description:
        "Không gian pha trà của một hộ làm chè trong bản: chủ nhà tráng ấm, pha thử vài lứa chè Shan tuyết cổ thụ và kể chuyện trèo hái búp trên cây trăm tuổi. Uống xong mua chè khô mang về — đây là chỗ mua đúng gốc, khỏi lo hàng trộn.",
    },
    {
      slug: "ca-phe-ngam-may-ta-xua",
      name: "Cà phê ngắm mây",
      category: EateryCategory.cafe,
      meals: [Meal.cafe, Meal.breakfast],
      address: "Sườn núi rìa bản Tà Xùa, hướng ra thung lũng",
      ...LOC,
      lat: 21.2545,
      lng: 104.4489,
      openingHours: "5:30 – 20:00",
      notice: "Sáng có mây thì kín chỗ ban công từ 6h — muốn ngồi mép ngoài phải đi sớm.",
      tags: ["view thung lũng", "săn mây", "buổi sáng"],
      description:
        "Quán cà phê có ban công đua ra thung lũng, mở từ tờ mờ sáng đúng giờ mây lên. Cách ngắm mây nhàn nhất cho ai ngại trèo mỏm: gọi một ly cà phê nóng hoặc ấm trà, ngồi nhìn sương dâng kín bên dưới.",
    },
    {
      slug: "quan-pho-sang-bac-yen",
      name: "Phở sáng thị trấn Bắc Yên",
      category: EateryCategory.local,
      meals: [Meal.breakfast],
      address: "Thị trấn Bắc Yên, gần bến xe",
      provinceName: "Sơn La",
      districtName: "Huyện Bắc Yên",
      wardName: "Thị trấn Bắc Yên",
      lat: 21.1889,
      lng: 104.4145,
      openingHours: "5:00 – 10:00",
      tags: ["ăn sáng", "trên đường lên", "bình dân"],
      description:
        "Bữa sáng của khách vừa xuống xe khách đêm, trước khi chạy 13km đèo lên bản. Phở bò nước trong, bánh phở dai, thêm quẩy — ăn cho ấm bụng vì trên bản sáng sớm hầu như chưa quán nào mở.",
    },
  ];

  const eateryId: Record<string, string> = {};
  for (const [i, e] of eateries.entries()) {
    const { slug, name, ...rest } = e;
    const row = await prisma.eatery.upsert({
      where: { slug },
      // KHÔNG áp `...PUB` khi update (chỉ khi create): biên tập đã ẩn/hiện mục
      // nào trong CMS thì lần chạy seed sau phải TÔN TRỌNG lựa chọn đó. Ép
      // published mỗi lần chạy là âm thầm bật lại đúng những thứ người ta vừa
      // tắt — kiểu bug rất khó lần ra.
      update: { ...rest, order: i, placeId: taXua.id },
      create: { slug, name, ...rest, order: i, placeId: taXua.id, ...PUB },
    });
    eateryId[slug] = row.id;
    await setImages({ eateryId: row.id }, IMAGES[slug] ?? [], name);
  }

  // ──────────────────────────────────────────────────────────────────────
  // 6) Đặc sản (Specialty) — MÓN ĂN dùng lại, gắn 2–4 quán tiêu biểu
  //
  // Đúng mô hình trong CLAUDE.md: đặc sản là "món", quán là "chỗ" — không tạo
  // kiểu "gà đen quán X".
  //
  // PHẠM VI: chỉ MÓN ĂN TẠI CHỖ. Dự án KHÔNG làm phần đặc sản mua làm quà, nên
  // sản vật đóng gói (táo mèo, rượu táo mèo) không có mặt ở đây — lần seed đầu
  // có, nay đã bỏ và có bước dọn bên dưới. Sản vật nào vẫn cần kể thì sống ở
  // nơi khác: chè Shan tuyết là `Activity` "Thưởng trà" + `Eatery` "Nhà trà".
  // ──────────────────────────────────────────────────────────────────────
  const specialties: {
    slug: string;
    name: string;
    description: string;
    tags: string[];
    isFeatured?: boolean;
    eateries?: string[];
  }[] = [
    {
      slug: "che-shan-tuyet-ta-xua",
      name: "Chè Shan tuyết Tà Xùa",
      isFeatured: true,
      description:
        "Búp chè hái trên những gốc Shan tuyết cổ thụ vài trăm tuổi, thân phủ địa y trắng như tuyết, phải trèo lên cây mới hái được. Nước vàng sánh, chát nhẹ đầu lưỡi rồi ngọt hậu rất lâu — thứ đặc sản làm nên tên tuổi Tà Xùa trước cả biển mây. Ngồi ở nhà trà trong bản để chủ nhà tráng ấm pha thử vài lứa là cách thưởng đúng nhất.",
      tags: ["chè", "cổ thụ", "đặc sản gốc"],
      eateries: ["nha-tra-shan-tuyet-ta-xua", "ca-phe-ngam-may-ta-xua"],
    },
    {
      slug: "ga-den-ta-xua",
      name: "Gà đen (gà H'Mông)",
      isFeatured: true,
      description:
        "Giống gà người Mông nuôi thả trên núi, da và xương đều đen, thịt chắc và ngọt hơn hẳn gà xuôi. Ngon nhất là nồi lẩu nấu thuốc bắc với gừng núi ăn giữa trời lạnh, hoặc nướng nguyên con trên than xoa mật ong rừng.",
      tags: ["lẩu", "bữa tối", "đặc sản", "hợp trời lạnh"],
      eateries: ["lau-ga-den-ta-xua", "bep-homestay-ta-xua"],
    },
    {
      slug: "thit-trau-gac-bep-ta-xua",
      name: "Thịt trâu gác bếp",
      description:
        "Thịt trâu thái dọc thớ, ướp mắc khén, hạt dổi và ớt rồi treo lên gác bếp hun khói hàng tháng trời. Miếng thịt khô quắt, xé ra vẫn đỏ và thơm mùi khói — nhâm nhi với rượu ngô trong bữa tối ở bản.",
      tags: ["hun khói", "nhậu", "mắc khén"],
      eateries: ["bep-homestay-ta-xua", "quan-nuong-dem-ta-xua"],
    },
    {
      slug: "lon-ban-nuong-ta-xua",
      name: "Lợn bản nướng",
      description:
        "Lợn cắp nách nuôi thả trong bản, con chỉ chừng mươi mười lăm cân nên thịt săn, lớp mỡ mỏng. Ba chỉ ướp mắc khén nướng than là món gọi nhiều nhất ở quán nướng đêm; bếp homestay thì hay làm thêm món hấp hoặc xào lăn.",
      tags: ["nướng", "bữa tối", "mắc khén"],
      eateries: ["quan-nuong-dem-ta-xua", "bep-homestay-ta-xua"],
    },
    {
      slug: "ca-suoi-nuong-ta-xua",
      name: "Cá suối nướng",
      description:
        "Cá bắt ở các con suối chảy dưới thung lũng, con nhỏ bằng hai ngón tay, kẹp tre nướng nguyên con trên than. Giòn từ đầu đến đuôi, chấm muối ớt hạt dổi — ăn vặt lai rai chứ không phải món chính.",
      tags: ["nướng", "ăn vặt", "cá suối"],
      eateries: ["quan-nuong-dem-ta-xua"],
    },
    {
      slug: "rau-cai-meo-ta-xua",
      name: "Rau cải mèo",
      description:
        "Rau người Mông trồng quanh nhà, lá dày, cọng giòn, vị hơi đắng rồi ngọt lại — càng rét càng ngon. Đơn giản nhất là xào tỏi hoặc nhúng lẩu; bát canh cải mèo nấu gừng là thứ giải rượu quen thuộc của bữa tối trên bản.",
      tags: ["rau", "bữa cơm", "mùa đông"],
      eateries: ["bep-homestay-ta-xua", "quan-com-doi-che-ta-xua", "lau-ga-den-ta-xua"],
    },
    {
      slug: "mang-rung-ta-xua",
      name: "Măng rừng",
      description:
        "Măng đắng, măng nứa lấy từ rừng quanh bản, mùa rộ vào cuối xuân. Măng đắng nướng cả củ rồi chấm chẩm chéo là kiểu ăn bản địa nhất; ngoài ra còn măng chua om, măng xào — món nào cũng có mặt trong mâm cơm homestay.",
      tags: ["rừng", "bữa cơm", "mùa xuân"],
      eateries: ["bep-homestay-ta-xua", "lau-ga-den-ta-xua"],
    },
    {
      slug: "xoi-nep-nuong-ta-xua",
      name: "Xôi nếp nương",
      description:
        "Nếp nương trồng trên rẫy, đồ trong chõ gỗ nên hạt dẻo mà rời, để nguội vẫn mềm. Gói lá chuối mang theo đi săn mây từ 5h sáng là hợp nhất — no lâu, không cần hâm, ăn với muối vừng hoặc thịt gác bếp xé.",
      tags: ["ăn sáng", "mang đi đường", "săn mây"],
      eateries: ["bep-homestay-ta-xua"],
    },
  ];

  // Dọn hai bản ghi của lần seed đầu: sản vật đóng gói, không phải món ăn tại
  // chỗ → ngoài phạm vi (xem chú thích mục 6). Xoá theo slug nên chỉ đụng đúng
  // hai cái này, không ảnh hưởng gì do biên tập tự thêm trong CMS.
  await prisma.specialty.deleteMany({
    where: { slug: { in: ["tao-meo-bac-yen", "ruou-tao-meo-hang-chu"] } },
  });

  for (const [i, sp] of specialties.entries()) {
    const { slug, name, eateries: eaterySlugs, ...rest } = sp;
    const connect = (eaterySlugs ?? []).map((sl) => ({ id: eateryId[sl] }));
    const row = await prisma.specialty.upsert({
      where: { slug },
      // KHÔNG áp `...PUB` khi update — xem chú thích ở vòng lặp Eatery.
      update: {
        ...rest,
        order: i,
        placeId: taXua.id,
        eateries: { set: connect },
      },
      create: {
        slug,
        name,
        ...rest,
        order: i,
        placeId: taXua.id,
        eateries: { connect },
        ...PUB,
      },
    });
    await setImages({ specialtyId: row.id }, IMAGES[slug] ?? [], name);
  }

  // 7) Di chuyển (Transport) — getTo: cách đến từ ngoài; getAround: tại chỗ.
  // Không có slug → idempotent bằng deleteMany theo placeId rồi tạo lại.
  const D = TransportDirection;
  const M = TransportMode;
  const transports = [
    // ── Đến nơi ──
    {
      direction: D.getTo,
      mode: M.bus,
      name: "Xe khách Mỹ Đình → Bắc Yên",
      fromName: "Hà Nội",
      duration: "6 – 7 giờ",
      distanceKm: 240,
      priceFrom: 200000,
      priceTo: 300000,
      operatorName: "Nhà xe tuyến Mỹ Đình – Bắc Yên (Bảo Yến, Hải Vân…)",
      phone: "1900 6067",
      isRecommended: true,
      notice:
        "Xe đêm khởi hành khoảng 20h–22h, tới Bắc Yên lúc rạng sáng — vừa kịp lên bản săn mây. Nên gọi đặt chỗ trước 1–2 ngày, cuối tuần rất đông.",
      description:
        "Cách phổ biến nhất. Xe chạy từ bến Mỹ Đình về thị trấn Bắc Yên; xuống bến rồi bắt xe ôm hoặc thuê xe máy đi tiếp 13km đèo lên xã Tà Xùa.",
    },
    {
      direction: D.getTo,
      mode: M.motorbike,
      name: "Chạy xe máy cung Tây Bắc",
      fromName: "Hà Nội",
      duration: "7 – 9 giờ",
      distanceKm: 240,
      isRecommended: true,
      notice:
        "Đổ đầy xăng ở thị trấn Bắc Yên — lên bản rất ít cây xăng. Không chạy đoạn đèo sau khi trời tối vì sương mù dày đặc.",
      description:
        "Cung quen của dân phượt: Hà Nội – Sơn Tây – Thanh Sơn – Thu Cúc – Phù Yên – Bắc Yên – Tà Xùa. Đường đẹp tới thị trấn, 13km cuối là đèo dốc liên tục.",
    },
    {
      direction: D.getTo,
      mode: M.car,
      name: "Ô tô riêng / thuê xe có tài",
      fromName: "Hà Nội",
      duration: "5,5 – 7 giờ",
      distanceKm: 240,
      priceFrom: 2500000,
      priceTo: 3500000,
      operatorName: "Dịch vụ thuê xe 7 chỗ có tài",
      notice:
        "Đoạn 13km cuối dốc và nhiều cua gấp — nên đi xe gầm cao, tài xế quen đường đèo. Chỗ đỗ xe trên bản hạn chế.",
      description:
        "Phù hợp nhóm gia đình. Đi cao tốc Hoà Lạc – Hoà Bình hoặc QL32 lên Phù Yên rồi rẽ Bắc Yên; lên tới bản thì vẫn nên thuê xe máy/xe ôm để ra các mỏm ngắm mây.",
    },
    {
      direction: D.getTo,
      mode: M.bus,
      name: "Xe khách tuyến Tây Bắc",
      fromName: "Sơn La / Mộc Châu",
      duration: "3 – 4 giờ",
      distanceKm: 120,
      priceFrom: 100000,
      priceTo: 180000,
      description:
        "Hợp khách đang đi cung Mộc Châu – Sơn La muốn ghép thêm Tà Xùa. Bắt xe về Bắc Yên rồi đi tiếp lên bản.",
    },
    // ── Đi lại tại chỗ ──
    {
      direction: D.getAround,
      mode: M.motorbike,
      name: "Thuê xe máy tại bản",
      duration: "theo ngày",
      priceFrom: 150000,
      priceTo: 200000,
      operatorName: "Homestay tại bản Tà Xùa",
      isRecommended: true,
      notice:
        "Chỉ thuê nếu tay lái vững: đường dốc đứng, nhiều cua và trơn khi sương. Kiểm tra phanh kỹ trước khi nhận xe; nên thuê xe số.",
      description:
        "Cách chủ động nhất để đi giữa các mỏm ngắm mây, đồi chè và sang Xím Vàng. Hầu hết homestay đều cho thuê kèm mũ bảo hiểm.",
    },
    {
      direction: D.getAround,
      mode: M.taxi,
      name: "Xe ôm bản địa",
      priceFrom: 50000,
      priceTo: 150000,
      operatorName: "Người dân bản Tà Xùa",
      notice: "Chốt giá trước từng chặng; đi săn mây sớm nên hẹn tài xế từ tối hôm trước.",
      description:
        "Lựa chọn an toàn cho ai không quen đường đèo. Tài xế bản địa thuộc đường, biết chỗ đỗ và giờ mây đẹp — thường kiêm luôn hướng dẫn.",
    },
    {
      direction: D.getAround,
      mode: M.walk,
      name: "Đi bộ tới các mỏm ngắm mây",
      duration: "15 – 40 phút mỗi điểm",
      description:
        "Từ chỗ gửi xe ra sống lưng khủng long, mỏm cá heo hay cây cô đơn đều phải cuốc bộ theo đường mòn đất. Đi giày bám tốt và mang đèn pin nếu xuất phát lúc trời còn tối.",
    },
    {
      direction: D.getAround,
      mode: M.other,
      name: "Porter / người dẫn đường trekking",
      priceFrom: 400000,
      priceTo: 800000,
      operatorName: "Porter bản Tà Xùa & Xím Vàng",
      notice: "Bắt buộc cho cung leo đỉnh Tà Xùa 2.865m — không tự đi vào rừng.",
      description:
        "Người bản địa dẫn đường, mang vác đồ và nấu ăn cho đoàn trekking. Đặt qua homestay trước 1–2 ngày, giá thường tính trọn gói theo đoàn.",
    },
  ];

  await prisma.transport.deleteMany({ where: { placeId: taXua.id } });
  for (const [i, t] of transports.entries()) {
    await prisma.transport.create({
      data: { ...t, currency: "VND", order: i, placeId: taXua.id, ...PUB },
    });
  }

  console.log(
    `✓ Seed Tà Xùa xong: 1 tỉnh, 1 điểm đến, ${spots.length} địa điểm, ${activities.length} hoạt động, ${eateries.length} quán ăn, ${specialties.length} đặc sản, ${transports.length} cách di chuyển.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
