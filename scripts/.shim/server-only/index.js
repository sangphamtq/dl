// Shim rỗng cho các script chạy NGOÀI Next.
// `import "server-only"` là chốt chặn lúc build của Next (chặn import nhầm vào
// Client Component). Chạy bằng tsx thì không có Next để phân giải nó, nên script
// nào import lib có chốt này phải chạy kèm NODE_PATH=scripts/.shim.
module.exports = {};
