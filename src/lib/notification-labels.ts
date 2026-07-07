// Câu mô tả cho từng loại thông báo (thuần dữ liệu — dùng được ở client).
export const NOTIF_MESSAGES: Record<string, string> = {
  thread_comment: "đã bình luận bài viết của bạn",
  thread_reply: "đã trả lời bình luận của bạn",
  thread_like: "đã thích bài viết của bạn",
  reply_like: "đã thích bình luận của bạn",
  blog_reply: "đã trả lời bình luận của bạn",
  sale_approved: "đã duyệt hồ sơ CTV của bạn",
  sale_rejected: "đã từ chối hồ sơ CTV của bạn",
  thread_moderated: "đã kiểm duyệt (ẩn/khóa) nội dung của bạn",
};

export const notifMessage = (type: string): string =>
  NOTIF_MESSAGES[type] ?? "có tương tác mới";
