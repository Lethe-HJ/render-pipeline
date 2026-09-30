# render-pipeline


实现一个 webgpu 和 webgl 的渲染流水线。

当前三角形覆盖与重心权重由 Rust/WASM 批量计算。运行示例或构建前需要安装 Rust，并添加 `wasm32-unknown-unknown` 目标；项目脚本会自动编译 WASM 资源。

```sh
rustup target add wasm32-unknown-unknown
pnpm dev
```

运行 Rust/WASM 单元测试和基准：

```sh
pnpm test
```

