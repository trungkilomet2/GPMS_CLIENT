const CONTACT_DETAILS = [
  { label: "Hotline tư vấn", value: "(+84) 123 456 789" },
  { label: "Email", value: "info@garmentpro.vn" },
  { label: "Địa chỉ", value: "123 Đường ABC, Quận 1, TP.HCM" },
  { label: "Thời gian làm việc", value: "08:00 - 18:00 từ Thứ 2 đến Thứ 7" },
];

const DEFAULT_CTA = {
  title: "Cần tư vấn mẫu may hoặc quy trình vận hành xưởng?",
  description: "Đội ngũ GPMS có thể tư vấn nhanh về mô hình gia công, năng lực chuyền may, kiểm soát chất lượng và triển khai hệ thống quản lý phù hợp cho xưởng của bạn.",
  primaryLabel: "Liên hệ ngay",
  primaryPath: "/pages/lien-he",
  secondaryLabel: "Xem dịch vụ",
  secondaryPath: "/pages/dich-vu",
};

const SHARED_SIDEBAR = {
  title: "Thông tin liên hệ",
  description: "Kết nối với đội ngũ GPMS để nhận tư vấn năng lực xưởng, báo giá gia công hoặc demo hệ thống quản lý sản xuất.",
  items: CONTACT_DETAILS,
};

function createPage(config) {
  return {
    heroEyebrow: config.heroEyebrow ?? "Garment Production Management System",
    ...config,
    contactDetails: config.contactDetails ?? CONTACT_DETAILS,
    sidebar: config.sidebar ?? SHARED_SIDEBAR,
    cta: config.cta ?? DEFAULT_CTA,
  };
}

function createProductPage({ slug, label, audience, image, strengths }) {
  return [
    slug,
    createPage({
      label,
      heroEyebrow: "Sản phẩm gia công",
      title: `${label} với quy trình rõ ràng, kiểm soát tiến độ tốt`,
      summary: `GPMS hỗ trợ xưởng theo dõi đơn ${label.toLowerCase()} từ khâu nhận mẫu, làm rập, sản xuất thử đến giao hàng. Mỗi mã hàng đều có checkpoint chất lượng và báo cáo tiến độ minh bạch.`,
      image,
      stats: [
        { value: "24h", label: "Phản hồi yêu cầu mẫu" },
        { value: "3 lớp", label: "Kiểm soát chất lượng" },
        { value: "100%", label: "Theo dõi tiến độ theo chuyền" },
      ],
      highlights: strengths,
      sections: [
        {
          title: `Phù hợp với ${audience}`,
          description: `Chúng tôi xây dựng quy trình riêng cho nhóm ${audience}, từ chốt thông số kỹ thuật, duyệt màu, duyệt phụ liệu đến cân đối năng lực chuyền may.`,
          bullets: [
            "Tiếp nhận yêu cầu kỹ thuật và style guide chi tiết.",
            "Theo dõi tiến độ mẫu duyệt, mẫu size set và mẫu PP.",
            "Đồng bộ sản lượng theo ngày để khách hàng dễ kiểm tra.",
          ],
        },
        {
          title: "Điểm mạnh khi triển khai bằng GPMS",
          description: "Hệ thống giúp hạn chế trao đổi rời rạc qua nhiều kênh và gom toàn bộ dữ liệu sản xuất về một nơi.",
          bullets: [
            "Lưu lịch sử cập nhật cho từng đơn hàng và từng công đoạn.",
            "Theo dõi lỗi chuyền, hoàn thiện và tỉ lệ đạt theo thời gian thực.",
            "Hỗ trợ chấm công, tính lương theo sản lượng cho xưởng may.",
          ],
        },
      ],
    }),
  ];
}

function createWorkshopPage({ slug, label, focus, image }) {
  return [
    slug,
    createPage({
      label,
      heroEyebrow: "Thông tin xưởng may",
      title: `${label} với năng lực linh hoạt và quy trình chuẩn hóa`,
      summary: `Trang này tổng hợp thông tin về ${label.toLowerCase()}, mô hình nhận đơn, cách kiểm soát chất lượng và giải pháp phù hợp để vận hành ${focus}.`,
      image,
      stats: [
        { value: "200+", label: "Nhân sự theo ca" },
        { value: "12", label: "Chuyền may linh hoạt" },
        { value: "98%", label: "Tỉ lệ giao đúng hẹn" },
      ],
      highlights: [
        `Quy trình vận hành tối ưu cho ${focus}.`,
        "Theo dõi tiến độ theo chuyền và theo tổ may.",
        "Có dashboard trực quan cho quản lý và chủ xưởng.",
        "Kiểm soát lỗi đầu chuyền, giữa chuyền và cuối chuyền.",
      ],
      sections: [
        {
          title: "Năng lực vận hành",
          description: "Xưởng được tổ chức theo mô hình linh hoạt để nhận cả đơn lặp và đơn cần thay đổi nhanh về mẫu mã.",
          bullets: [
            "Quản lý năng lực chuyền theo từng nhóm sản phẩm.",
            "Điều phối công đoạn cắt, may, hoàn thiện và đóng gói.",
            "Báo cáo sản lượng, lỗi và tồn công đoạn theo ngày.",
          ],
        },
        {
          title: "Hình thức hợp tác",
          description: "Khách hàng có thể bắt đầu từ đơn thử nhỏ hoặc triển khai đơn hàng định kỳ theo quý.",
          bullets: [
            "Phù hợp với đơn hàng số lượng nhỏ đến trung bình.",
            "Có thể mở rộng quy mô khi sản lượng tăng.",
            "Tư vấn cấu hình hệ thống theo mô hình xưởng thực tế.",
          ],
        },
      ],
    }),
  ];
}

function createNewsPage({ slug, label, angle, image }) {
  return [
    slug,
    createPage({
      label,
      heroEyebrow: "Tin tức & kiến thức",
      title: `${label} dành cho chủ xưởng và đội sản xuất`,
      summary: `Chuyên mục ${label.toLowerCase()} tập trung vào ${angle}, giúp đội ngũ quản lý xưởng cập nhật xu hướng mới và đưa ra quyết định vận hành nhanh hơn.`,
      image,
      stats: [
        { value: "Hàng tuần", label: "Cập nhật nội dung" },
        { value: "Thực chiến", label: "Góc nhìn vận hành" },
        { value: "Ngắn gọn", label: "Dễ áp dụng" },
      ],
      highlights: [
        "Tổng hợp insight phù hợp cho xưởng may vừa và nhỏ.",
        "Nội dung tập trung vào bài toán sản xuất thực tế.",
        "Dễ dùng cho cả đội quản lý lẫn đội vận hành.",
      ],
      sections: [
        {
          title: "Bạn sẽ tìm thấy gì ở đây",
          description: "Mỗi bài viết được biên soạn theo hướng thực tế, dễ đọc và có thể áp dụng ngay trong xưởng.",
          bullets: [
            "Các chỉ số cần theo dõi khi vận hành xưởng may.",
            "Kinh nghiệm xử lý chậm chuyền và giảm lỗi phát sinh.",
            "Gợi ý tổ chức dữ liệu đơn hàng và chất lượng.",
          ],
        },
        {
          title: "Cách dùng nội dung hiệu quả",
          description: "Bạn có thể dùng các bài viết như tài liệu tham khảo nội bộ cho quản lý chuyền và nhân sự mới.",
          bullets: [
            "Chọn bài viết theo vấn đề đang gặp trong xưởng.",
            "Đối chiếu với dữ liệu thực tế để đưa ra hành động.",
            "Kết hợp với dashboard GPMS để theo dõi sau cải tiến.",
          ],
        },
      ],
    }),
  ];
}

const marketingEntries = [
  [
    "thong-tin",
    createPage({
      label: "Thông tin",
      title: "Thông tin tổng quan về GPMS và mô hình xưởng may",
      summary: "Trang thông tin giúp khách hàng hiểu rõ cách GPMS hỗ trợ xưởng may từ giai đoạn chào giá, lên kế hoạch sản xuất đến quản lý chất lượng và giao hàng.",
      image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1200&q=80",
      stats: [
        { value: "10+", label: "Năm kinh nghiệm" },
        { value: "500+", label: "Đơn hàng mỗi tháng" },
        { value: "24/7", label: "Hỗ trợ dữ liệu" },
      ],
      highlights: [
        "Giải pháp phù hợp cho chủ xưởng, quản lý sản xuất và khách hàng đặt may.",
        "Theo dõi đơn hàng, tiến độ và chất lượng trong một hệ thống.",
        "Tăng tính minh bạch khi phối hợp giữa xưởng và khách hàng.",
      ],
      sections: [
        {
          title: "Chúng tôi đang giải quyết vấn đề gì",
          description: "Nhiều xưởng may vẫn quản lý đơn hàng bằng file rời, tin nhắn hoặc sổ tay, khiến tiến độ và chất lượng khó kiểm soát.",
          bullets: [
            "Thiếu dữ liệu tập trung về tiến độ, lỗi và sản lượng.",
            "Khó phối hợp giữa chủ xưởng, quản lý chuyền và khách hàng.",
            "Mất thời gian tổng hợp báo cáo và đối soát cuối kỳ.",
          ],
        },
        {
          title: "GPMS mang lại điều gì",
          description: "Hệ thống được thiết kế để giúp xưởng vận hành gọn hơn, báo cáo nhanh hơn và kiểm soát rủi ro tốt hơn.",
          bullets: [
            "Quản lý xuyên suốt từ đơn hàng đến lương sản phẩm.",
            "Tự động hóa một phần báo cáo vận hành hằng ngày.",
            "Dễ mở rộng khi xưởng tăng quy mô hoặc thêm chuyền.",
          ],
        },
      ],
    }),
  ],
  [
    "gioi-thieu",
    createPage({
      label: "Giới thiệu",
      title: "GPMS đồng hành cùng xưởng may từ sản xuất đến tăng trưởng",
      summary: "Chúng tôi xây dựng nền tảng quản lý sản xuất dành riêng cho ngành may mặc, giúp chủ xưởng có dữ liệu rõ ràng hơn để ra quyết định nhanh và chính xác.",
      image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=1200&q=80",
      stats: [
        { value: "200+", label: "Công nhân lành nghề" },
        { value: "12", label: "Chuyền may theo dõi" },
        { value: "98%", label: "Khách hàng hài lòng" },
      ],
      highlights: [
        "Am hiểu quy trình vận hành xưởng may Việt Nam.",
        "Tập trung vào dữ liệu thực tế, không rườm rà tính năng.",
        "Dễ dùng cho cả quản lý văn phòng và đội sản xuất.",
      ],
      sections: [
        {
          title: "Cách chúng tôi làm việc",
          description: "Mỗi xưởng có cách vận hành khác nhau, vì vậy GPMS ưu tiên khảo sát thực tế trước khi đề xuất quy trình và cách dùng hệ thống.",
          bullets: [
            "Khảo sát mô hình nhận đơn và sơ đồ tổ chức xưởng.",
            "Chuẩn hóa cách theo dõi tiến độ và chất lượng.",
            "Đào tạo đội ngũ sử dụng theo vai trò công việc.",
          ],
        },
        {
          title: "Điều khách hàng nhận được",
          description: "Không chỉ là phần mềm, GPMS còn là bộ khung vận hành giúp xưởng làm việc trơn tru hơn mỗi ngày.",
          bullets: [
            "Giảm phụ thuộc vào file Excel rời rạc.",
            "Báo cáo nhanh hơn cho chủ xưởng và khách hàng.",
            "Tăng khả năng kiểm soát khi số lượng đơn hàng tăng.",
          ],
        },
      ],
    }),
  ],
  [
    "nang-luc-xuong-may",
    createPage({
      label: "Năng lực xưởng may",
      title: "Năng lực xưởng may được quản lý bằng dữ liệu thay vì cảm tính",
      summary: "Trang này mô tả cách GPMS hỗ trợ theo dõi năng lực chuyền, nhân sự, chất lượng và tiến độ để xưởng nhận đơn phù hợp với khả năng thực tế.",
      image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1200&q=80",
      stats: [
        { value: "12", label: "Chuyền may" },
        { value: "3", label: "Lớp QC" },
        { value: "500+", label: "Đơn hàng mỗi tháng" },
      ],
      highlights: [
        "Theo dõi năng lực từng chuyền và từng công đoạn.",
        "Phân bổ đơn hàng theo năng lực thực tế của xưởng.",
        "Giảm tình trạng dồn chuyền hoặc nghẽn công đoạn.",
      ],
      sections: [
        {
          title: "Các chỉ số chính được theo dõi",
          description: "Năng lực xưởng không chỉ nằm ở số người hay số máy, mà còn ở nhịp sản xuất và khả năng giữ chất lượng ổn định.",
          bullets: [
            "Sản lượng theo ngày, theo chuyền và theo mã hàng.",
            "Tỉ lệ lỗi theo công đoạn, theo nhân sự hoặc theo chuyền.",
            "Khả năng đáp ứng deadline khi nhận thêm đơn mới.",
          ],
        },
        {
          title: "Ứng dụng thực tế",
          description: "Chủ xưởng có thể nhìn thấy chuyền nào đang mạnh, công đoạn nào đang chậm và ra quyết định điều phối nhanh hơn.",
          bullets: [
            "Ưu tiên đơn gấp vào chuyền có độ ổn định cao.",
            "Cảnh báo sớm khi lỗi hoặc tồn công đoạn tăng.",
            "Làm cơ sở để thương lượng lead time với khách hàng.",
          ],
        },
      ],
    }),
  ],
  [
    "quy-trinh-dat-may",
    createPage({
      label: "Quy trình đặt may",
      title: "Quy trình đặt may rõ ràng từ yêu cầu đầu vào đến giao hàng",
      summary: "Khách hàng có thể theo dõi từng bước từ gửi yêu cầu, duyệt mẫu, xác nhận đơn hàng, sản xuất đến kiểm tra chất lượng và giao hàng.",
      image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1200&q=80",
      stats: [
        { value: "6 bước", label: "Triển khai chuẩn" },
        { value: "24h", label: "Phản hồi ban đầu" },
        { value: "100%", label: "Lưu vết trạng thái" },
      ],
      highlights: [
        "Minh bạch vai trò của khách hàng và xưởng trong từng giai đoạn.",
        "Giảm sai lệch thông tin khi duyệt mẫu và duyệt phụ liệu.",
        "Dễ kiểm soát tiến độ khi sản xuất nhiều mã hàng cùng lúc.",
      ],
      sections: [
        {
          title: "Bước 1 đến bước 3",
          description: "Giai đoạn đầu tập trung chốt yêu cầu kỹ thuật và xác định rõ phạm vi đơn hàng.",
          bullets: [
            "Tiếp nhận yêu cầu, file thiết kế và thông số kỹ thuật.",
            "Báo giá sơ bộ và tư vấn mô hình gia công phù hợp.",
            "Làm mẫu, điều chỉnh và xác nhận mẫu duyệt.",
          ],
        },
        {
          title: "Bước 4 đến bước 6",
          description: "Sau khi mẫu duyệt được chốt, xưởng sẽ triển khai kế hoạch sản xuất và theo dõi chất lượng theo từng công đoạn.",
          bullets: [
            "Lên kế hoạch cắt, may, hoàn thiện và đóng gói.",
            "Cập nhật tiến độ theo ngày trên hệ thống.",
            "Kiểm tra chất lượng trước khi giao hàng và chốt đối soát.",
          ],
        },
      ],
    }),
  ],
  [
    "nhan-gia-cong-fob-cmt-odm",
    createPage({
      label: "Nhận gia công FOB/CMT/ODM",
      title: "Tư vấn hình thức gia công phù hợp với từng giai đoạn phát triển",
      summary: "GPMS hỗ trợ xưởng và khách hàng quản lý quy trình gia công theo nhiều mô hình như FOB, CMT và ODM, giúp phối hợp rõ trách nhiệm và dòng công việc.",
      image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1200&q=80",
      stats: [
        { value: "3 mô hình", label: "FOB, CMT, ODM" },
        { value: "1 nền tảng", label: "Theo dõi tập trung" },
        { value: "Nhiều vai trò", label: "Chủ xưởng, PM, khách hàng" },
      ],
      highlights: [
        "Làm rõ trách nhiệm cung ứng nguyên phụ liệu và sản xuất.",
        "Theo dõi tiến độ theo từng mô hình gia công.",
        "Dễ mở rộng khi khách hàng chuyển từ CMT sang FOB hoặc ODM.",
      ],
      sections: [
        {
          title: "FOB, CMT, ODM khác nhau thế nào",
          description: "Mỗi mô hình có mức độ tham gia khác nhau của xưởng trong khâu nguyên phụ liệu, phát triển mẫu và hoàn thiện sản phẩm.",
          bullets: [
            "CMT phù hợp khi khách hàng đã có nguyên phụ liệu và thông số rõ.",
            "FOB phù hợp khi cần xưởng hỗ trợ quản lý đầu vào và giao hàng.",
            "ODM phù hợp khi cần thêm năng lực phát triển mẫu và ý tưởng.",
          ],
        },
        {
          title: "GPMS hỗ trợ quản lý ra sao",
          description: "Hệ thống giúp các bên cùng nhìn vào một tiến độ chung và giảm lệch thông tin khi phối hợp nhiều công đoạn.",
          bullets: [
            "Theo dõi tình trạng mẫu, nguyên phụ liệu và sản xuất.",
            "Cập nhật từng mốc quan trọng để khách hàng dễ theo dõi.",
            "Lưu lịch sử trao đổi và điều chỉnh trên cùng một đơn hàng.",
          ],
        },
      ],
    }),
  ],
  [
    "dich-vu",
    createPage({
      label: "Dịch vụ",
      title: "Dịch vụ dành cho chủ xưởng, quản lý sản xuất và khách hàng đặt may",
      summary: "Ngoài hệ thống GPMS, chúng tôi còn cung cấp tư vấn chuẩn hóa quy trình, triển khai theo vai trò, đào tạo vận hành và hỗ trợ số hóa dữ liệu đơn hàng.",
      image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80",
      stats: [
        { value: "4 nhóm", label: "Dịch vụ chính" },
        { value: "1-1", label: "Tư vấn theo xưởng" },
        { value: "Nhanh", label: "Triển khai theo nhu cầu" },
      ],
      highlights: [
        "Tư vấn quy trình quản lý đơn hàng và sản xuất.",
        "Thiết lập dashboard theo vai trò sử dụng thực tế.",
        "Đào tạo đội ngũ để dùng hệ thống trơn tru ngay từ đầu.",
      ],
      sections: [
        {
          title: "Nhóm dịch vụ chính",
          description: "GPMS phù hợp cả khi bạn cần công cụ quản lý lẫn khi muốn chuẩn hóa lại quy trình vận hành.",
          bullets: [
            "Tư vấn triển khai hệ thống quản lý sản xuất.",
            "Chuẩn hóa biểu mẫu, đầu việc và luồng xử lý đơn hàng.",
            "Đào tạo quản lý chuyền, PM và chủ xưởng theo vai trò.",
          ],
        },
        {
          title: "Cách triển khai",
          description: "Mỗi dự án được triển khai từng bước để hạn chế xáo trộn hoạt động hiện tại của xưởng.",
          bullets: [
            "Khảo sát quy trình đang dùng và các điểm nghẽn lớn nhất.",
            "Đề xuất cấu hình phù hợp thay vì áp dụng cứng một mẫu.",
            "Đo hiệu quả sau triển khai bằng dữ liệu vận hành thực tế.",
          ],
        },
      ],
    }),
  ],
  [
    "san-pham-gia-cong",
    createPage({
      label: "Sản phẩm gia công",
      title: "Danh mục sản phẩm gia công phù hợp nhiều mô hình kinh doanh",
      summary: "Từ local brand, đồng phục đến thời trang trẻ em hay thể thao, GPMS hỗ trợ quản lý tiến độ và chất lượng xuyên suốt cho nhiều nhóm sản phẩm.",
      image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=1200&q=80",
      stats: [
        { value: "6 nhóm", label: "Sản phẩm chính" },
        { value: "Linh hoạt", label: "Theo quy mô đơn" },
        { value: "Chi tiết", label: "Theo mã hàng" },
      ],
      highlights: [
        "Mỗi nhóm sản phẩm có cách kiểm soát khác nhau và được theo dõi riêng.",
        "Hỗ trợ từ đơn mẫu, đơn nhỏ đến đơn sản xuất định kỳ.",
        "Phù hợp với cả xưởng gia công và thương hiệu tự vận hành.",
      ],
      sections: [
        {
          title: "Các nhóm sản phẩm nổi bật",
          description: "Danh mục được xây dựng theo nhu cầu phổ biến của xưởng may Việt Nam hiện nay.",
          bullets: [
            "Áo thun local brand, đồng phục công ty, hàng thời trang.",
            "Quần áo trẻ em, đồ thể thao, hàng thiết kế riêng.",
            "Có thể mở rộng danh mục theo thế mạnh riêng của xưởng.",
          ],
        },
        {
          title: "Điểm cần theo dõi",
          description: "Mỗi nhóm sản phẩm có thông số kỹ thuật, lead time và yêu cầu chất lượng khác nhau.",
          bullets: [
            "Kiểm soát nguyên phụ liệu theo từng mã hàng.",
            "Phân chuyền hợp lý theo độ khó và kỹ thuật may.",
            "Theo dõi sản lượng, lỗi và hoàn thiện riêng cho từng nhóm.",
          ],
        },
      ],
    }),
  ],
  [
    "xuong-may",
    createPage({
      label: "Xưởng may",
      title: "Thông tin xưởng may và năng lực nhận đơn theo từng phân khúc",
      summary: "Đây là trang tổng quan về các mô hình xưởng mà GPMS hỗ trợ, từ local brand, đồng phục đến đơn số lượng ít cần độ linh hoạt cao.",
      image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1200&q=80",
      stats: [
        { value: "Nhiều mô hình", label: "Theo nhu cầu xưởng" },
        { value: "Linh hoạt", label: "Nhận đơn nhỏ đến vừa" },
        { value: "Rõ ràng", label: "Theo dõi năng lực thực tế" },
      ],
      highlights: [
        "Có thể cấu hình theo loại đơn hàng và mô hình xưởng.",
        "Giúp chủ xưởng dễ nhìn thấy điểm mạnh vận hành của mình.",
        "Thích hợp để làm trang giới thiệu năng lực với khách hàng.",
      ],
      sections: [
        {
          title: "Mỗi xưởng cần một cách trình bày khác nhau",
          description: "Khách hàng đặt may thường quan tâm tới lead time, quy mô và mức độ ổn định chất lượng. GPMS giúp bạn tổng hợp các thông tin này rõ ràng.",
          bullets: [
            "Giới thiệu năng lực chuyền và sản phẩm thế mạnh.",
            "Cho thấy mức độ minh bạch về tiến độ và chất lượng.",
            "Tăng sự tin tưởng khi trao đổi với khách hàng mới.",
          ],
        },
        {
          title: "Khi nào nên dùng trang này",
          description: "Trang phù hợp để dùng như landing page giới thiệu xưởng hoặc để hỗ trợ sale khi tư vấn khách hàng.",
          bullets: [
            "Chia sẻ nhanh cho khách hàng đang hỏi năng lực xưởng.",
            "Làm nền cho chiến dịch marketing hoặc chạy quảng cáo.",
            "Tập trung thông tin dịch vụ, liên hệ và quy trình trên một trang.",
          ],
        },
      ],
    }),
  ],
  [
    "tin-tuc",
    createPage({
      label: "Tin tức",
      title: "Tin tức, kinh nghiệm và xu hướng dành cho ngành may",
      summary: "Chuyên mục tin tức ngoài homepage được thiết kế như nơi tập hợp nội dung marketing, kiến thức vận hành và góc nhìn thị trường cho chủ xưởng may.",
      image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200&q=80",
      stats: [
        { value: "3 nhóm", label: "Chủ đề chính" },
        { value: "Ngắn gọn", label: "Dễ đọc" },
        { value: "Thực tế", label: "Dễ áp dụng" },
      ],
      highlights: [
        "Kết hợp giữa nội dung marketing và kiến thức vận hành.",
        "Phù hợp để mở rộng SEO cho website của xưởng.",
        "Có thể phát triển tiếp thành blog hoặc cẩm nang nội bộ.",
      ],
      sections: [
        {
          title: "Các nhóm nội dung",
          description: "Chuyên mục được chia thành tin tức ngành may, kinh nghiệm sản xuất và xu hướng thời trang.",
          bullets: [
            "Tin tức để nắm tình hình chung của thị trường.",
            "Kinh nghiệm sản xuất để tối ưu vận hành xưởng.",
            "Xu hướng thời trang để cập nhật nhu cầu sản phẩm.",
          ],
        },
        {
          title: "Lợi ích cho website",
          description: "Ngoài vai trò cung cấp thông tin, các trang nội dung này còn giúp website đầy đặn và chuyên nghiệp hơn khi khách hàng tham khảo.",
          bullets: [
            "Tăng độ tin cậy khi khách hàng tìm hiểu xưởng.",
            "Có thêm điểm chạm nội dung ngoài trang bán hàng.",
            "Tạo nền tảng để mở rộng chiến lược SEO sau này.",
          ],
        },
      ],
    }),
  ],
  [
    "lien-he",
    createPage({
      label: "Liên hệ",
      title: "Liên hệ với GPMS để được tư vấn nhanh về xưởng may và hệ thống",
      summary: "Bạn có thể liên hệ để trao đổi về nhu cầu gia công, năng lực xưởng, triển khai hệ thống quản lý hoặc cần hỗ trợ demo cho đội ngũ quản lý sản xuất.",
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80",
      stats: [
        { value: "08:00-18:00", label: "Giờ hỗ trợ" },
        { value: "1 ngày", label: "Phản hồi ban đầu" },
        { value: "Nhiều kênh", label: "Điện thoại, email, trực tiếp" },
      ],
      highlights: [
        "Phù hợp cho cả khách hàng đặt may lẫn chủ xưởng cần tối ưu vận hành.",
        "Dễ dùng như trang đích cho quảng cáo hoặc chăm sóc khách hàng.",
        "Có thể mở rộng thêm form liên hệ hoặc bản đồ ở bước sau.",
      ],
      sections: [
        {
          title: "Các hình thức liên hệ",
          description: "Bạn có thể liên hệ nhanh qua điện thoại, email hoặc hẹn buổi trao đổi trực tiếp với đội ngũ GPMS.",
          bullets: CONTACT_DETAILS.map((item) => `${item.label}: ${item.value}`),
        },
        {
          title: "Trước khi liên hệ nên chuẩn bị gì",
          description: "Nếu bạn đang cần tư vấn triển khai, chuẩn bị trước một vài thông tin cơ bản sẽ giúp buổi làm việc hiệu quả hơn.",
          bullets: [
            "Mô hình xưởng hiện tại và số lượng nhân sự/chuyền may.",
            "Các khó khăn chính đang gặp trong quản lý đơn hàng hoặc sản xuất.",
            "Mục tiêu muốn cải thiện trong 3 đến 6 tháng tới.",
          ],
        },
      ],
      cta: {
        title: "Sẵn sàng bắt đầu trao đổi?",
        description: "Chúng tôi có thể giúp bạn rà soát quy trình hiện tại, gợi ý hướng triển khai phù hợp và lên lộ trình số hóa từng bước cho xưởng may.",
        primaryLabel: "Gọi ngay",
        primaryPath: "/pages/lien-he",
        secondaryLabel: "Xem giới thiệu",
        secondaryPath: "/pages/gioi-thieu",
      },
    }),
  ],
  createProductPage({
    slug: "ao-thun-local-brand",
    label: "Áo thun local brand",
    audience: "các local brand cần ra mẫu nhanh và sản xuất ổn định",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&q=80",
    strengths: [
      "Hỗ trợ theo dõi từng đợt drop hoặc từng collection.",
      "Dễ quản lý size, màu và số lượng theo mã sản phẩm.",
      "Phù hợp cho local brand cần kiểm soát tiến độ chặt.",
    ],
  }),
  createProductPage({
    slug: "dong-phuc-cong-ty",
    label: "Đồng phục công ty",
    audience: "doanh nghiệp cần sản xuất đồng bộ theo nhiều size và nhiều bộ phận",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1200&q=80",
    strengths: [
      "Dễ quản lý đơn số lượng lớn nhưng nhiều size.",
      "Kiểm soát màu sắc và nhận diện thương hiệu đồng nhất.",
      "Theo dõi tiến độ chia theo đợt giao hoặc theo phòng ban.",
    ],
  }),
  createProductPage({
    slug: "vay-dam-thoi-trang",
    label: "Váy đầm thời trang",
    audience: "thương hiệu thời trang cần quản lý mẫu mã và kỹ thuật may tinh chỉnh",
    image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=1200&q=80",
    strengths: [
      "Phù hợp với dòng sản phẩm cần kiểm soát form và hoàn thiện.",
      "Dễ theo dõi chỉnh sửa mẫu trong giai đoạn đầu.",
      "Hạn chế thất lạc thông tin khi làm việc nhiều lần duyệt mẫu.",
    ],
  }),
  createProductPage({
    slug: "quan-ao-tre-em",
    label: "Quần áo trẻ em",
    audience: "đơn vị cần kiểm soát kỹ tiêu chuẩn an toàn và độ hoàn thiện",
    image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=1200&q=80",
    strengths: [
      "Chú trọng kiểm tra đường may và phụ liệu phù hợp.",
      "Theo dõi size set và thông số kỹ hơn theo lứa tuổi.",
      "Dễ xây quy trình QC cho sản phẩm trẻ em.",
    ],
  }),
  createProductPage({
    slug: "quan-ao-the-thao",
    label: "Quần áo thể thao",
    audience: "thương hiệu cần tốc độ sản xuất tốt và kiểm soát vật liệu co giãn",
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=80",
    strengths: [
      "Hỗ trợ quản lý nguyên liệu co giãn và kỹ thuật may chuyên biệt.",
      "Theo dõi tỉ lệ lỗi ở các công đoạn dễ phát sinh như in ép hoặc ráp nối.",
      "Phù hợp với đơn cần chạy theo mùa hoặc chiến dịch.",
    ],
  }),
  createProductPage({
    slug: "hang-thiet-ke",
    label: "Hàng thiết kế",
    audience: "các thương hiệu cần linh hoạt chỉnh sửa mẫu và sản xuất số lượng vừa phải",
    image: "https://images.unsplash.com/photo-1495385794356-15371f348c31?w=1200&q=80",
    strengths: [
      "Tập trung vào tính linh hoạt và theo dõi từng phiên bản mẫu.",
      "Dễ kiểm soát chi tiết hoàn thiện cho sản phẩm đặc thù.",
      "Phù hợp với đơn hàng yêu cầu cao về thẩm mỹ.",
    ],
  }),
  createWorkshopPage({
    slug: "xuong-may-ha-noi",
    label: "Xưởng may Hà Nội",
    focus: "xưởng phục vụ thị trường phía Bắc với nhu cầu linh hoạt về lead time",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200&q=80",
  }),
  createWorkshopPage({
    slug: "xuong-may-local-brand",
    label: "Xưởng may local brand",
    focus: "mô hình làm việc với các thương hiệu thời trang trẻ, cần đổi mẫu nhanh",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80",
  }),
  createWorkshopPage({
    slug: "xuong-may-dong-phuc",
    label: "Xưởng may đồng phục",
    focus: "đơn hàng đồng phục doanh nghiệp, trường học hoặc chuỗi cửa hàng",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1200&q=80",
  }),
  createWorkshopPage({
    slug: "xuong-may-so-luong-it",
    label: "Xưởng may số lượng ít",
    focus: "đơn nhỏ, đơn thử và đơn cần phản hồi nhanh",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&q=80",
  }),
  createNewsPage({
    slug: "tin-tuc-nganh-may",
    label: "Tin tức ngành may",
    angle: "biến động thị trường, xu hướng đơn hàng và các vấn đề ảnh hưởng đến vận hành xưởng",
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1200&q=80",
  }),
  createNewsPage({
    slug: "kinh-nghiem-san-xuat",
    label: "Kinh nghiệm sản xuất",
    angle: "những kinh nghiệm thực chiến để giảm lỗi, tăng sản lượng và tổ chức chuyền hiệu quả hơn",
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1200&q=80",
  }),
  createNewsPage({
    slug: "xu-huong-thoi-trang",
    label: "Xu hướng thời trang",
    angle: "các dòng sản phẩm, phong cách và nhu cầu mới mà thương hiệu đang quan tâm",
    image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=1200&q=80",
  }),
];

export const MARKETING_PAGES = Object.fromEntries(marketingEntries);

export function getMarketingPageBySlug(slug) {
  return MARKETING_PAGES[slug] ?? null;
}

export function getMarketingPageLabel(slug) {
  return getMarketingPageBySlug(slug)?.label ?? "Trang thông tin";
}
