"use client";

import { motion, useReducedMotion, type Transition } from "motion/react";

// Hiệu ứng mở màn cho nội dung tĩnh, dựng trên `motion` (framer-motion).
//
// LUẬT CỦA DỰ ÁN, giữ nguyên ở đây: hiệu ứng KHÔNG được là điều kiện để chữ
// nhìn thấy được (xem chú thích ở khối hero trong `globals.css`). Vì vậy không
// keyframe nào đụng tới `opacity` — mọi thứ chỉ dịch chuyển. JS hỏng, hydrate
// chậm hay người dùng tắt hiệu ứng thì cùng lắm chữ nằm sẵn ở đúng chỗ, không
// bao giờ biến mất.
//
// Đó cũng là lý do có `Curtain`: muốn một dòng chữ "trồi lên" mà không fade thì
// phải có KHUNG CẮT che nó — chữ bị khung che chứ không bị làm mờ.

const EASE_OUT: Transition = {
  duration: 0.7,
  ease: [0.22, 1, 0.36, 1],
};

/** Nhích lên khi vào chỗ. Dùng cho câu chữ, nút, khối nhỏ. */
export function Rise({
  children,
  delay = 0,
  distance = 16,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  /** Quãng nhích, px. */
  distance?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ y: distance }}
      animate={{ y: 0 }}
      transition={{ ...EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Trồi lên từ sau một khung cắt. Khung phải ôm sát dòng chữ, nên `Curtain` tự
 * đặt `overflow-hidden` — và vì tiếng Việt có dấu tụt dưới đường chân chữ, khối
 * bên trong được chừa thêm `pb` rồi kéo lại bằng `-mb` để dấu không bị xén.
 */
export function Curtain({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <div className={className} style={{ overflow: "hidden" }}>
      <motion.div
        className="pb-[0.18em] -mb-[0.18em]"
        initial={{ y: "105%" }}
        animate={{ y: "0%" }}
        transition={{ ...EASE_OUT, duration: 0.85, delay }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Nhích lên khi CUỘN TỚI, một lần duy nhất. Dùng cho các khối nằm dưới màn đầu
 * — thẻ trong dải, tiêu đề từng miền.
 * `amount: 0.2` để khối chỉ chạy khi đã lộ ra một phần năm, tránh cảnh mọi thứ
 * chạy cùng lúc lúc trang vừa dựng xong.
 */
export function RiseInView({
  children,
  delay = 0,
  distance = 22,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ y: distance }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ ...EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}
