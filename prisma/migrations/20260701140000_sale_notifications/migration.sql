-- Thêm loại thông báo cho duyệt/từ chối hồ sơ CTV.
ALTER TYPE "NotificationType" ADD VALUE 'sale_approved';
ALTER TYPE "NotificationType" ADD VALUE 'sale_rejected';
