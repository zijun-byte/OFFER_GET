import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { calculateChatViewport } from '../app/qa-chat/chatViewport.ts';
import { createChatMessageId } from '../app/qa-chat/chatId.ts';

test('mobile chat leaves room for the bottom navigation when the keyboard is closed', () => {
  assert.deepEqual(calculateChatViewport(844, 0, 844, 68, 66), {
    top: 68,
    height: 710,
    keyboardOpen: false,
  });
});

test('mobile chat follows the visual viewport above the keyboard', () => {
  assert.deepEqual(calculateChatViewport(500, 0, 844, 68, 66), {
    top: 0,
    height: 500,
    keyboardOpen: true,
  });
});

test('mobile chat follows a shifted visual viewport without leaving a header-sized gap', () => {
  assert.deepEqual(calculateChatViewport(500, 28, 844, 68, 66), {
    top: 28,
    height: 500,
    keyboardOpen: true,
  });
});

test('manual zoom without input focus does not hide the site navigation', () => {
  assert.deepEqual(calculateChatViewport(500, 28, 844, 68, 66, false), {
    top: 96,
    height: 366,
    keyboardOpen: false,
  });
});

test('chat messages can be created on an insecure LAN origin without crypto.randomUUID', () => {
  const first = createChatMessageId('ai', {});
  const second = createChatMessageId('ai', {});
  assert.match(first, /^ai-/);
  assert.notEqual(first, second);
});

test('mobile chat composer uses a focus-safe font size on iPhone', () => {
  const css = readFileSync(new URL('../app/qa-chat/QaChatPage.module.css', import.meta.url), 'utf8');
  const inputRule = css.match(/\.chatInput\s*\{([^}]*)\}/)?.[1] || '';
  const fontSize = Number(inputRule.match(/font-size:\s*([\d.]+)px/)?.[1]);
  assert.ok(fontSize >= 16, `chat input font-size must be at least 16px, got ${fontSize}px`);
});
