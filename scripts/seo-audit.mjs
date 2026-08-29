import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const posts = JSON.parse(read('story/posts.json'));
JSON.parse(read('products.json'));

const publicPages = [
  'index.html',
  'about.html',
  'products.html',
  'story/index.html',
  ...posts.filter((post) => !post.draft).map((post) => `story/${post.url}`),
  'contact.html',
];

const results = [];
const record = (name, pass, detail = '') => results.push({ name, pass, detail });
const titles = new Set();
const canonicals = new Set();

for (const file of publicPages) {
  const html = read(file);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1]?.trim() ?? '';
  const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/)?.[1]
    ?? html.match(/<meta[\s\S]*?name="description"[\s\S]*?content="([^"]+)"/)?.[1]
    ?? '';
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/)?.[1] ?? '';
  const ogComplete = ['og:title', 'og:description', 'og:url'].every((name) =>
    html.includes(`property="${name}"`)
  );
  const h1Count = (html.match(/<h1(?:\s|>)/g) ?? []).length;
  const images = [...html.matchAll(/<img\s[^>]*>/g)].map((match) => match[0]);
  const missingAlt = images.filter((image) => !/\salt="[^"]*"/.test(image));

  record(`${file}: title`, Boolean(title) && !titles.has(title), title);
  record(`${file}: description`, description.length >= 50 && description.length <= 180, `${description.length}자`);
  record(`${file}: canonical`, canonical.startsWith('https://guernsey-woollens-swpark.vercel.app/') && !canonicals.has(canonical), canonical);
  record(`${file}: Open Graph`, ogComplete);
  record(`${file}: H1`, h1Count === 1, `${h1Count}개`);
  record(`${file}: image alt`, missingAlt.length === 0, `${missingAlt.length}개 누락`);

  titles.add(title);
  canonicals.add(canonical);

  for (const match of html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let valid = true;
    try {
      JSON.parse(match[1]);
    } catch {
      valid = false;
    }
    record(`${file}: JSON-LD`, valid);
  }
}

const publicPosts = posts.filter((post) => !post.draft);
record(
  '공개 글 정적 URL',
  publicPosts.every((post) => post.url && fs.existsSync(path.join(root, 'story', post.url))),
  `${publicPosts.length}개`
);

const sitemap = read('sitemap.xml');
const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
record('sitemap 공개 URL', sitemapLocations.every((url) => !url.includes('?') && !url.includes('admin.html')));
record(
  'sitemap 글 URL',
  publicPosts.every((post) => sitemap.includes(`/story/${post.url}`))
);

const feed = read('feed.xml');
record(
  'feed 최신 글',
  publicPosts.every((post) => feed.includes(`/story/${post.url}`))
);

const llms = read('llms.txt');
record('llms 브랜드·제품·페이지', ['건지울른스', '코튼 나그랑 크루넥 스웨터', '## 주요 페이지'].every((value) => llms.includes(value)));

const article = read('story/why-knit-feels-scratchy.html');
const questions = posts.find((post) => post.id === 'why-knit-feels-scratchy')?.faq ?? [];
record('새 글 FAQ 화면·JSON 일치', questions.length === 3 && questions.every(({ q, a }) => article.includes(q) && article.includes(a)));
record('새 글 작성자·출처·CTA', article.includes('박성우BM') && article.includes('Cotton Incorporated') && article.includes('스토어에서 제품 확인하기'));
record('금지 표현', !['국내 1위', '최고', '표정', '형태'].some((word) => article.includes(word)));

const ideas = read('story/ideas.md');
record('글감 체크', ideas.includes('- [x] 니트의 촉감이 까슬거리는 이유는 무엇인가요?'));
record('남은 글감', (ideas.match(/^- \[ \]/gm) ?? []).length >= 5, `${(ideas.match(/^- \[ \]/gm) ?? []).length}개`);
record('admin noindex', read('story/admin.html').includes('content="noindex,nofollow"'));

const failed = results.filter((result) => !result.pass);
for (const result of results) {
  console.log(`${result.pass ? 'PASS' : 'FAIL'} | ${result.name}${result.detail ? ` | ${result.detail}` : ''}`);
}
console.log(`\nSUMMARY | ${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exitCode = 1;
