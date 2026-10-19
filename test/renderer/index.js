// A felület tesztjeinek belépési pontja (tools/run-tests.mjs tölti be az alkalmazásablakba)
import './logic.test.js';
import './smoke.test.js';
import './playback.test.js';
export { run } from './harness.js';
