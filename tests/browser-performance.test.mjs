import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

function detectWithUa(userAgent, options = {}) {
  const source = options.source;
  const documentElement = {
    dataset: {},
    classList: {
      values: new Set(),
      toggle(name, force) {
        if (force) this.values.add(name);
        else this.values.delete(name);
      }
    }
  };
  const media = {
    matches: options.narrow === true,
    addEventListener() {}
  };
  const sandbox = {
    console,
    Object,
    Set,
    MutationObserver: class { observe() {} },
    IntersectionObserver: class { observe() {} },
    navigator: {
      userAgent,
      userAgentData: options.brands ? { brands: options.brands.map(brand => ({ brand, version: '1' })) } : undefined,
      hardwareConcurrency: options.cores ?? 8,
      deviceMemory: options.memory ?? 8,
      maxTouchPoints: options.touchPoints ?? 0,
      connection: options.saveData ? { saveData: true } : undefined
    },
    document: {
      documentElement,
      hidden: false,
      readyState: 'complete',
      addEventListener() {},
      querySelectorAll: () => [],
      body: null
    }
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.chrome = options.chrome ? {} : undefined;
  sandbox.matchMedia = () => media;
  vm.runInNewContext(source, sandbox, { timeout: 1000 });
  return {
    api: sandbox.StarlightBrowser,
    classes: [...documentElement.classList.values],
    engine: documentElement.dataset.starlightEngine
  };
}

test('browser performance detects Firefox, Chromium, and Opera GX engines', async () => {
  const source = await read('docs/js/browser-performance.js');

  const firefox = detectWithUa('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0', { source });
  assert.equal(firefox.engine, 'firefox');
  assert.equal(firefox.api.isFirefox, true);
  assert.ok(firefox.classes.includes('firefox-performance-mode'));
  assert.ok(firefox.classes.includes('starlight-performance-lite'));

  const chrome = detectWithUa('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', {
    source,
    chrome: true,
    brands: ['Chromium', 'Google Chrome']
  });
  assert.equal(chrome.engine, 'chromium');
  assert.equal(chrome.api.isChromium, true);
  assert.equal(chrome.api.lite, false);
  assert.ok(chrome.classes.includes('starlight-engine-chromium'));
  assert.ok(!chrome.classes.includes('starlight-performance-lite'));

  const operaGx = detectWithUa('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 OPR/112.0.0.0 (Edition GX)', {
    source,
    chrome: true,
    brands: ['Chromium', 'Opera']
  });
  assert.equal(operaGx.engine, 'opera-gx');
  assert.equal(operaGx.api.isOperaGX, true);
  assert.ok(operaGx.classes.includes('starlight-engine-opera-gx'));

  const mobileChrome = detectWithUa('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36', {
    source,
    chrome: true,
    touchPoints: 5,
    narrow: true,
    brands: ['Chromium', 'Google Chrome']
  });
  assert.equal(mobileChrome.api.lite, true);
  assert.ok(mobileChrome.classes.includes('starlight-performance-lite'));
  assert.ok(mobileChrome.classes.includes('starlight-mobile'));
});

test('performance CSS lightens expensive effects for any lite engine, not only Firefox', async () => {
  const css = await read('docs/css/legacy/11-current-v82-v91.css');
  assert.match(css, /:is\(\.firefox-performance-mode, \.starlight-performance-lite\)/);
  assert.match(css, /\.starlight-mobile/);
  assert.match(css, /content-visibility:\s*auto/);
});

test('shell uses dynamic viewport units for mobile-safe framing', async () => {
  const shell = await read('docs/css/app-shell.css');
  assert.match(shell, /100dvh/);
  assert.match(shell, /safe-area-inset/);
  assert.match(shell, /starlight-mobile/);
});
