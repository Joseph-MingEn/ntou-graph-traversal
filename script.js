// Every adjacency list is alphabetical so each run has a reproducible order.
const graph = {
  A: ['B', 'C'], B: ['A', 'C', 'D'], C: ['A', 'B', 'D', 'E'],
  D: ['B', 'C', 'E', 'F'], E: ['C', 'D', 'F'], F: ['D', 'E'],
};
const methods = {
  DFS: { label: '遞迴堆疊 Stack', hint: '右側為目前頂端', explain: '<b>深度優先 DFS</b><p>先拜訪目前節點，再按鄰接順序逐條檢查邊。遇到尚未發現的鄰點，就立刻遞迴深入；已發現的鄰點略過。所有鄰邊檢查完才回溯。</p>' },
  BFS: { label: '佇列 Queue', hint: '左側先取出', explain: '<b>廣度優先 BFS</b><p>從佇列取出一個節點，再按鄰接順序逐條檢查邊。新發現的鄰點標記距離並加入佇列；已發現的鄰點不重複入列。佇列先進先出。</p>' },
};

const nodes = [...document.querySelectorAll('.node')];
const edges = [...document.querySelectorAll('[data-edge]')];
const methodButtons = [...document.querySelectorAll('.method')];
const startSelect = document.querySelector('#startSelect');
const previousButton = document.querySelector('#previousButton');
const nextButton = document.querySelector('#nextButton');
const playButton = document.querySelector('#playButton');
const resetButton = document.querySelector('#resetButton');
const methodExplain = document.querySelector('#methodExplain');
const frontierLabel = document.querySelector('#frontierLabel');
const frontierHint = document.querySelector('#frontierHint');
const frontierOutput = document.querySelector('#frontier');
const orderOutput = document.querySelector('#order');
const visitedCount = document.querySelector('#visitedCount');
const stepBadge = document.querySelector('#stepBadge');
const statusTitle = document.querySelector('#statusTitle');
const statusText = document.querySelector('#statusText');
const traceFrontierHead = document.querySelector('#traceFrontierHead');
const traceBody = document.querySelector('#traceBody');

let method = 'DFS';
let start = 'A';
let trace = [];
let step = 0;
let playTimer = null;

function edgeKey(a, b) {
  return [a, b].sort().join('-');
}

function buildTrace(kind, origin) {
  const events = [];
  const discovered = new Set();
  const visited = new Set();
  const order = [];
  const visitEdges = new Set();
  const shortestEdges = new Set();
  const distances = { [origin]: 0 };
  const stack = [];
  const queue = [];
  let head = 0;

  function record(type, details = {}) {
    events.push({
      type,
      ...details,
      discovered: [...discovered],
      visited: [...visited],
      order: [...order],
      stack: [...stack],
      queue: kind === 'BFS' ? queue.slice(head) : [],
      visitEdges: [...visitEdges],
      shortestEdges: [...shortestEdges],
    });
  }

  if (kind === 'DFS') {
    function visit(vertex, parent = null) {
      discovered.add(vertex);
      visited.add(vertex);
      order.push(vertex);
      stack.push(vertex);
      if (parent) visitEdges.add(edgeKey(parent, vertex));
      record('visit', {
        current: vertex,
        message: `拜訪 ${vertex}，進入遞迴呼叫；目前堆疊為 ${stack.join(' → ')}。接著逐條檢查 ${graph[vertex].join('、')}。`,
      });

      for (const neighbor of graph[vertex]) {
        if (discovered.has(neighbor)) {
          record('check', {
            current: vertex,
            neighbor,
            result: 'known',
            edge: edgeKey(vertex, neighbor),
            message: `檢查邊 ${vertex}–${neighbor}：${neighbor} 已發現，略過，不重複深入。`,
          });
        } else {
          discovered.add(neighbor);
          visitEdges.add(edgeKey(vertex, neighbor));
          record('check', {
            current: vertex,
            neighbor,
            result: 'discover',
            edge: edgeKey(vertex, neighbor),
            message: `檢查邊 ${vertex}–${neighbor}：${neighbor} 尚未發現，標記並沿此邊深入。`,
          });
          visit(neighbor, vertex);
        }
      }

      stack.pop();
      const parentOfCurrent = stack.at(-1) ?? null;
      record('backtrack', {
        current: parentOfCurrent,
        completed: vertex,
        message: parentOfCurrent
          ? `${vertex} 的所有相鄰邊都檢查完畢，回溯到 ${parentOfCurrent}。`
          : `${vertex} 的所有相鄰邊都檢查完畢，DFS 走訪完成。`,
      });
    }

    visit(origin);
    return events;
  }

  // BFS marks on enqueue and uses a head index so each vertex enters once.
  discovered.add(origin);
  queue.push(origin);
  while (head < queue.length) {
    const current = queue[head++];
    visited.add(current);
    order.push(current);
    record('dequeue', {
      current,
      message: `從佇列取出 ${current}（距起點 ${distances[current]} 條邊）；現在逐一檢查它的每個鄰點。`,
    });

    for (const neighbor of graph[current]) {
      if (discovered.has(neighbor)) {
        record('check', {
          current,
          neighbor,
          result: 'known',
          edge: edgeKey(current, neighbor),
          message: `檢查邊 ${current}–${neighbor}：${neighbor} 已發現（距起點 ${distances[neighbor]} 條邊），略過、不重複入列。`,
        });
      } else {
        discovered.add(neighbor);
        distances[neighbor] = distances[current] + 1;
        queue.push(neighbor);
        shortestEdges.add(edgeKey(current, neighbor));
        record('check', {
          current,
          neighbor,
          result: 'discover',
          edge: edgeKey(current, neighbor),
          message: `檢查邊 ${current}–${neighbor}：首次發現 ${neighbor}，距起點 ${distances[neighbor]} 條邊；加入佇列。這條實線確認了最短距離。`,
        });
      }
    }
  }

  record('complete', { current: null, message: '佇列清空；所有可達節點及其相鄰邊都已處理完畢。' });
  return events;
}

function stopPlayback() {
  if (playTimer) window.clearInterval(playTimer);
  playTimer = null;
}

function resetTraversal() {
  stopPlayback();
  trace = buildTrace(method, start);
  step = 0;
  render();
}

function renderTraceTable() {
  traceBody.replaceChildren();
  if (!step) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'empty-row';
    cell.textContent = '按「下一步」開始；每一步只執行一項拜訪、邊檢查或回溯操作。';
    row.append(cell);
    traceBody.append(row);
    return;
  }

  trace.slice(0, step).forEach((event, index) => {
    const row = document.createElement('tr');
    if (index === step - 1) row.classList.add('current-row');
    const actionLabel = {
      visit: '拜訪節點', check: event.result === 'discover' ? '發現新節點' : '檢查／略過',
      backtrack: '回溯', dequeue: '取出佇列', complete: '完成',
    }[event.type];
    const frontier = method === 'DFS' ? event.stack : event.queue;
    const values = [
      String(index + 1).padStart(2, '0'), actionLabel, event.current ?? '—',
      event.neighbor ? `${event.current}–${event.neighbor}` : '—',
      event.message,
      frontier.length ? frontier.join(' → ') : '空',
    ];
    values.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    });
    traceBody.append(row);
  });
}

function render() {
  const event = step ? trace[step - 1] : null;
  const visited = event?.visited ?? [];
  const discovered = new Set(event?.discovered ?? [start]);
  const frontier = method === 'DFS' ? (event?.stack ?? []) : (event?.queue ?? [start]);
  const current = event?.current ?? null;

  nodes.forEach((node) => {
    const name = node.dataset.node;
    node.classList.toggle('start-node', name === start);
    node.classList.toggle('visited-node', visited.includes(name));
    node.classList.toggle('current-node', name === current);
    node.classList.toggle('frontier-node', name !== current && !visited.includes(name) && discovered.has(name));
    node.setAttribute('aria-pressed', String(name === start));
  });

  const visitEdges = new Set(event?.visitEdges ?? []);
  const shortestEdges = new Set(event?.shortestEdges ?? []);
  edges.forEach((line) => {
    const edge = line.dataset.edge;
    line.classList.toggle('visit-edge', visitEdges.has(edge));
    line.classList.toggle('shortest-edge', shortestEdges.has(edge));
    line.classList.toggle('active-edge', event?.type === 'check' && event.edge === edge);
  });

  const config = methods[method];
  methodExplain.innerHTML = config.explain;
  frontierLabel.textContent = config.label;
  frontierHint.textContent = config.hint;
  traceFrontierHead.textContent = method === 'DFS' ? '遞迴堆疊（底 → 頂）' : '佇列（前 → 後）';
  frontierOutput.textContent = frontier.length ? `[ ${frontier.join(' → ')} ]` : '[ 空 ]';
  orderOutput.textContent = visited.length ? event.order.join('  →  ') : '尚未開始';
  visitedCount.textContent = `${visited.length} / 6 個頂點`;
  stepBadge.textContent = step ? `操作 ${step} / ${trace.length}` : '準備開始';
  previousButton.disabled = step === 0 || Boolean(playTimer);
  nextButton.disabled = step === trace.length || Boolean(playTimer);
  playButton.disabled = step === trace.length && !playTimer;
  playButton.setAttribute('aria-pressed', String(Boolean(playTimer)));
  playButton.textContent = playTimer ? '■ 停止播放' : '▶ 自動播放';
  statusTitle.textContent = event?.type === 'check'
    ? `檢查邊 ${event.current}–${event.neighbor}`
    : event?.type === 'backtrack'
      ? `從 ${event.completed} 回溯`
      : event?.type === 'dequeue'
        ? `從佇列取出 ${event.current}`
        : event?.type === 'complete'
          ? '走訪完成'
          : event?.type === 'visit'
            ? `拜訪節點 ${event.current}`
            : `準備從 ${start} 開始`;
  statusText.textContent = event?.message ?? `起點 ${start} 準備就緒。每按一次「下一步」，只處理一個節點或一條相鄰邊。`;
  renderTraceTable();
}

function advance() {
  if (step < trace.length) step += 1;
  render();
  if (step === trace.length) stopPlayback();
}

methodButtons.forEach((button) => button.addEventListener('click', () => {
  method = button.dataset.method;
  methodButtons.forEach((candidate) => {
    const active = candidate === button;
    candidate.classList.toggle('active', active);
    candidate.setAttribute('aria-pressed', String(active));
  });
  resetTraversal();
}));
startSelect.addEventListener('change', () => {
  start = startSelect.value;
  resetTraversal();
});
nodes.forEach((node) => {
  const select = () => { start = node.dataset.node; startSelect.value = start; resetTraversal(); };
  node.addEventListener('click', select);
  node.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); }
  });
});
resetButton.addEventListener('click', resetTraversal);
previousButton.addEventListener('click', () => { if (step > 0) step -= 1; render(); });
nextButton.addEventListener('click', advance);
playButton.addEventListener('click', () => {
  if (playTimer) { stopPlayback(); render(); return; }
  if (step >= trace.length) return;
  playTimer = window.setInterval(advance, 850);
  render();
});

resetTraversal();
