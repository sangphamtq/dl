-- Backfill: quán đã gắn category='cafe' từ trước vốn là quán nước, nhưng
-- `venueKind` mới mặc định 'eat' → chúng sẽ nằm nhầm mục "Ăn ở đâu".
-- Chỉ đụng đúng nhóm cafe; các quán còn lại giữ mặc định 'eat'.
UPDATE "Eatery" SET "venueKind" = 'drink' WHERE "category" = 'cafe';
