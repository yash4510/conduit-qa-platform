// Load smoke test: a few virtual users read the public endpoints and write one article each loop,
// for 20 seconds. It is a smoke test, not a capacity test: it shows whether the API stays healthy and
// fast under light concurrent use, and it fails the run when it does not.
//
// Run:  npm run perf:smoke      (needs the app running; k6 runs from a Docker image)
import http from 'k6/http';
import { check, sleep } from 'k6';

const API = __ENV.API_URL || 'http://localhost:3000/api';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const options = {
  vus: 5,
  duration: '20s',
  thresholds: {
    // Fewer than 1% of requests may fail, and 95% must finish within 300 ms. Measured p95 was 9.6 ms in CI and
    // 20.4 ms on a laptop, so this leaves wide room for a slow runner and still catches a real slowdown.
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<300'],
    checks: ['rate>0.99'],
  },
};

// Runs once before the load: one account shared by every virtual user.
export function setup() {
  const name = `k6${Date.now()}`;
  const res = http.post(
    `${API}/users`,
    JSON.stringify({ user: { username: name, email: `${name}@example.test`, password: 'Conduit@123' } }),
    { headers: JSON_HEADERS },
  );
  check(res, { 'setup: user registered': (r) => r.status === 201 });
  return { token: res.json('user.token') };
}

export default function (data) {
  const auth = { headers: { ...JSON_HEADERS, Authorization: `Token ${data.token}` } };

  const tags = http.get(`${API}/tags`);
  check(tags, { 'tags: 200': (r) => r.status === 200 });

  const list = http.get(`${API}/articles?limit=10`);
  check(list, { 'articles: 200': (r) => r.status === 200 });

  // Write path: create an article, read it back, delete it, so the run leaves no data behind.
  const title = `k6 ${__VU}-${__ITER}-${Date.now()}`;
  const created = http.post(
    `${API}/articles`,
    JSON.stringify({ article: { title, description: 'load smoke', body: 'body', tagList: ['k6'] } }),
    auth,
  );
  check(created, { 'create: 201': (r) => r.status === 201 });

  const slug = created.json('article.slug');
  if (slug) {
    check(http.get(`${API}/articles/${slug}`), { 'read: 200': (r) => r.status === 200 });
    check(http.del(`${API}/articles/${slug}`, null, auth), { 'delete: 204': (r) => r.status === 204 });
  }

  sleep(1);
}
