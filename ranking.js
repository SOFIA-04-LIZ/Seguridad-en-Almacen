'use strict';
(() => {
  const endpoint = 'https://hmdulvilzuvxyingbcfx.supabase.co/rest/v1/rpc/';
  const key = 'sb_publishable_9MdBtUP-zWk0BTu7F7s74g_Wb1UlKJq';
  async function request(method, body = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(endpoint + method, {
        method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: controller.signal,
      });
      if (!response.ok) throw new Error('Ranking HTTP ' + response.status);
      return await response.json();
    } finally { clearTimeout(timeout); }
  }
  window.WAREHOUSE_RANKING = {
    list: () => request('warehouse_top5'),
    submit: (runId, name, score) => request('warehouse_submit_score', {
      p_run_id: runId, p_name: name, p_score: score,
    }),
    newRun: () => crypto.randomUUID(),
  };
})();
