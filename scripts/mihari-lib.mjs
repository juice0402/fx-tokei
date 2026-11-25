// 毎朝の取りこみ（fetch-events・fetch-holidays）で使う共通の道具：外のページの読みこみと、mihari の issue
// issue の作り方はプロジェクトの claude/mihari-spec.md のとおり（同じ題が開いていれば作らず、1日1回「まだ続いている」）
import { readFileSync } from 'node:fs';
import { jstStamp } from './events-lib.mjs';

export const UA = 'fx-tokei/1.0 (+https://github.com/juice0402/fx-tokei)';

export const readJson = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch (e) { return null; } };

// timeout 20秒・1回だけやり直し・User-Agent を付ける。binary=true のときは ArrayBuffer
export async function fetchText(url, binary = false) {
  let last;
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return binary ? await res.arrayBuffer() : await res.text();
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

// 読めない日を数える（state.units[unit].firstFail）。読めた日は null に戻す。続けて読めない日数を返す
export function trackFail(st, ok, today) {
  if (ok) { st.firstFail = null; return 0; }
  st.firstFail = st.firstFail || today;
  return Math.round((Date.parse(today) - Date.parse(st.firstFail)) / 864e5) + 1;
}

export function makeMihari({ now, dry, by }) {
  const env = process.env;
  const GH = env.GITHUB_TOKEN && env.GITHUB_REPOSITORY ? { token: env.GITHUB_TOKEN, repo: env.GITHUB_REPOSITORY } : null;
  const RUN = env.GITHUB_RUN_ID
    ? `${env.GITHUB_SERVER_URL || 'https://github.com'}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` : '（手元で動かした）';
  const today = jstStamp(now).slice(0, 10);

  async function api(path, method = 'GET', body) {
    const res = await fetch(`https://api.github.com/repos/${GH.repo}${path}`, {
      method,
      headers: { Authorization: `Bearer ${GH.token}`, Accept: 'application/vnd.github+json', 'User-Agent': UA, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok && res.status !== 422) throw new Error(`GitHub ${method} ${path}: ${res.status}`);
    return res.status === 204 ? null : res.json();
  }

  async function openIssue(title) {
    const list = await api('/issues?state=open&labels=mihari&per_page=100');
    return list.find((i) => i.title === title && !i.pull_request) || null;
  }

  async function report(title, lines) {
    const body = [...lines, `いつ：${jstStamp(now)}（日本時間）`, `実行：${RUN}`, '', `見張り（.github/workflows/data.yml の ${by}）が作った`].join('\n');
    if (dry || !GH) { console.log(`[issue を作るはず] ${title}`); return; }
    try {
      const found = await openIssue(title);
      if (found) {
        const cs = await api(`/issues/${found.number}/comments?per_page=100`);
        if (!cs.some((c) => c.body.startsWith('まだ続いている') && jstStamp(Date.parse(c.created_at)).startsWith(today))) {
          await api(`/issues/${found.number}/comments`, 'POST', { body: `まだ続いている（${RUN}）` });
        }
        console.log(`issue #${found.number} はもうある：${title}`);
        return;
      }
      await api('/labels', 'POST', { name: 'mihari', color: 'd93f0b', description: '見張りが見つけた。しょーくんに知らせるだけ' });
      const made = await api('/issues', 'POST', { title, body, labels: ['mihari'] });
      console.log(`issue #${made.number} を作った：${title}`);
    } catch (e) {
      console.log(`issue を作れなかった：${e.message}`);
    }
  }

  async function resolve(title) {
    if (dry || !GH) return;
    try {
      const found = await openIssue(title);
      if (!found) return;
      await api(`/issues/${found.number}/comments`, 'POST', { body: `直った（${RUN}）` });
      await api(`/issues/${found.number}`, 'PATCH', { state: 'closed', state_reason: 'completed' });
      console.log(`issue #${found.number} を閉じた：${title}`);
    } catch (e) {
      console.log(`issue を閉じられなかった：${e.message}`);
    }
  }

  return { report, resolve, today };
}
