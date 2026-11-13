// app/ を dist/fx-tokei/ にそのまま出す（サクッと計算の /fx-tokei/ と ios-kobo が取りこむ形）
import { cpSync, rmSync, mkdirSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
cpSync('app', 'dist/fx-tokei', { recursive: true });
console.log('dist/fx-tokei/ を作った');
