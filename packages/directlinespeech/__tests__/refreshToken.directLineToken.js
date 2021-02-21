/**
 * @jest-environment jsdom
 */

import 'global-agent/bootstrap';

import { PropertyId } from 'microsoft-cognitiveservices-speech-sdk';
import { timeouts } from './constants.json';
import createTestHarness from './utilities/createTestHarness';
import MockAudioContext from './utilities/MockAudioContext';

jest.setTimeout(timeouts.test);

beforeEach(() => {
  global.AudioContext = MockAudioContext;
});

const realSetTimeout = setTimeout;

function sleep(intervalMS) {
  return new Promise(resolve => realSetTimeout(resolve, intervalMS));
}

async function waitUntil(fn, timeout = 5000, intervalMS = 1000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (fn()) {
      return;
    }

    await sleep(intervalMS);
  }

  throw new Error('timed out');
}

test('should refresh Direct Line token', async () => {
  jest.useFakeTimers('modern');

  const { directLine } = await createTestHarness({ enableInternalHTTPSupport: true });
  const initialToken = directLine.dialogServiceConnector.properties.getProperty(PropertyId.Conversation_ApplicationId);

  // Wait until 2 seconds in real-time clock, to make sure the token renewed is different (JWT has a per-second timestamp).
  await sleep(2000);

  // Fast-forward 15 minutes to kick-off the token renewal
  jest.advanceTimersByTime(900000);

  // Wait for 5 seconds until the token get updated
  await waitUntil(
    () =>
      initialToken !==
      directLine.dialogServiceConnector.properties.getProperty(PropertyId.Conversation_ApplicationId, 5000)
  );
});
