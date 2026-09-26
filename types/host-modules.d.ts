/**
 * CI 专用：把宿主提供的官方模块（`@deepseek-ai/*`）声明成通配 any。
 *
 * 为什么需要：这些模块由 DSH 宿主随运行时提供，**不在本仓库的依赖里**（约束 4「官方包一律 external」
 * 就是为此），所以干净检出（CI 机器上没有宿主、也没装官方包）时 `tsc` 找不到它们的类型，
 * 报一屏 TS2307。那个环境里能给 CI 的唯一有价值结论是「本仓库自己的代码类型自洽」——
 * 本文件让宿主模块解析为 any，从而只检查我们自己的代码。
 *
 * 只在 `tsconfig.ci.json` 里被 include；本地开发走 tsconfig.json，仍然解析到真实类型，
 * 宿主 API 的真实签名是否漂移由本地 `pnpm typecheck` 负责（CI 不管这件事）。
 *
 * 前提：`skipLibCheck: true` + `strict: false`（上游代码宽松），any 化的宿主模块不会反过来
 * 给我们的代码引入新的严格性错误——这一点由 CI 自己验证。
 */
declare module '@deepseek-ai/*'
