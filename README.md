# render-pipeline


实现一个 webgpu 和 webgl 的渲染流水线。

Rust/WASM 批量判断路径覆盖，TypeScript 使用预计算的三角形重心变换插值颜色。Node.js 需要 `20.19+`（20.x）或 `22.12+`；推荐使用 Node.js 22.12.0。项目通过 pnpm 12 管理依赖。

```sh
nvm install
nvm use
corepack enable
corepack prepare pnpm@12.3.4 --activate
pnpm install
```

`pnpm install` 会自动运行 `prepare`：安装示例项目依赖；缺少 Rust 时通过 rustup 安装稳定版 Rust/Cargo；添加 `wasm32-unknown-unknown` target 并编译项目所需的 WASM 文件。工具链已安装后也可以单独执行：

```sh
pnpm prepare
```

之后运行示例或构建：

```sh
pnpm dev
```

运行 Rust/WASM 单元测试和基准：

```sh
pnpm test
```

