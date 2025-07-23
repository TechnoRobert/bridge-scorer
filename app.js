// Constants
const NUM_TEAMS = 6;
const NUM_BOARDS = 20;
const TEAM_NAMES = [
  "Bordenets", "Clarks", "Jake & Rick", "Leedoms", "Rudegeairs", "Vaessens", "Guests"
];
const SCORE_LABELS = ["0", "x", "1", "1x", "2"];

let currentBoardNum = 1;
// Data structure to store scores: scores[boardNum][teamIndex] = "0"|"x"|"1"|"1x"|"2"
let scores = Array.from({ length: NUM_BOARDS }, () => Array(NUM_TEAMS).fill(""));
let teamNames = Array.from({ length: NUM_TEAMS }, (_, i) => `Team #${i + 1}`);
let guestNames = [];
let guestModalOpen = false;
let lastDropdownValues = Array(NUM_TEAMS).fill("");
let showPairings = false;

// Error checking toggle (default: enabled)
let errorCheckingEnabled = true;

// Pairings mapping: for each board, an array of [teamA, teamB, colorClass]
const PAIRING_COLORS = [
  '#e6f7ff', // light blue (Pairing 1)
  '#ffe6f7', // light magenta (Pairing 2)
];
const HOST_COLOR = '#d1e7dd'; // Team 6 color (subtle green)

function getAllTeamNames() {
  // Merge and alphabetize, keep 'Guests' last
  const baseNames = TEAM_NAMES.filter(n => n !== 'Guests');
  const all = baseNames.concat(guestNames).sort((a, b) => a.localeCompare(b));
  all.push('Guests');
  return all;
}

// Returns an array of pairings for each board: [[teamA, teamB, color], ...]
function getBoardPairings() {
  // Each round: 4 boards, 3 pairings
  // Format: [ [N/S, E/W], ... ]
  const rounds = [
    [ [2,4], [3,5], [6,1] ],    // boards 1-4
    [ [3,4], [5,1], [6,2] ],    // boards 5-8
    [ [1,2], [4,5], [6,3] ],    // boards 9-12
    [ [1,3], [5,2], [6,4] ],    // boards 13-16
    [ [2,3], [4,1], [6,5] ],    // boards 17-20
  ];
  let boardPairings = [];
  for (let r = 0; r < rounds.length; r++) {
    for (let b = 0; b < 4; b++) {
      let pairings = [];
      for (let p = 0; p < rounds[r].length; p++) {
        let [a, b_] = rounds[r][p];
        let color = (a === 6 || b_ === 6) ? HOST_COLOR : PAIRING_COLORS[p];
        pairings.push([a, b_, color]);
      }
      boardPairings.push(pairings);
    }
  }
  return boardPairings;
}

// Render Score Entry (with board selector, radio buttons, and team dropdowns)
function renderScoreEntry(boardNum = 1) {
  const scoreEntry = document.getElementById('score-entry');
  scoreEntry.innerHTML = `
    <h2 style="display: flex; align-items: center; gap: 0.1em;">
      Board
      <span class="board-num-group">
        #<span id="board-num" class="mono-board-num">${String(boardNum).padStart(2, ' ')}</span>
        <span class="board-spinner">
          <button id="board-up" title="Next board">&#9650;</button>
          <button id="board-down" title="Previous board">&#9660;</button>
        </span>
      </span>
      <input type="range" id="board-slider" min="1" max="20" value="${boardNum}" style="vertical-align: middle; width: 120px; margin-left: 1em;">
    </h2>
  `;

  // Label row for radio buttons + Team label above dropdowns
  let labelRow = '<div class="score-label-row">';
  SCORE_LABELS.forEach(label => {
    labelRow += `<span class="score-label">${label}</span>`;
  });
  labelRow += '<span class="team-label" style="margin-left:0.5em;font-weight:bold;">Team</span></div>';
  scoreEntry.innerHTML += labelRow;

  // Radio button rows with team number label and dropdown
  const allNames = getAllTeamNames();
  for (let i = 0; i < NUM_TEAMS; i++) {
    let row = `<div class="score-row">`;
    SCORE_LABELS.forEach((label, idx) => {
      // Always render as unchecked
      row += `<input type="radio" name="team${i}-score" value="${label}">`;
    });
    let options = `<option value="">Team #${i + 1}</option>` +
      allNames.map(name => `<option value="${name}"${teamNames[i] === name ? ' selected' : ''}>${name}</option>`).join('');
    row += `<span class="team-num-label">#${i + 1}</span>`;
    row += `<select class="team-dropdown" id="team${i + 1}-dropdown">${options}</select>`;
    row += `</div>`;
    scoreEntry.innerHTML += row;
  }
}

function renderBoardScores() {
  const boardScores = document.getElementById('board-scores');
  let html = '';
  html += `<table class="mono-table"><thead><tr>`;
  for (let b = 1; b <= NUM_BOARDS; b++) {
    html += `<th>${b}</th>`;
  }
  html += `</tr></thead><tbody>`;
  const boardPairings = getBoardPairings();
  for (let t = 0; t < NUM_TEAMS; t++) {
    html += `<tr>`;
    for (let b = 1; b <= NUM_BOARDS; b++) {
      const val = scores[b - 1][t];
      let style = '';
      if (showPairings) {
        // Find the pairing for this board
        let pairings = boardPairings[b - 1];
        if (pairings) {
          for (let p = 0; p < pairings.length; p++) {
            let [a, b_, color] = pairings[p];
            if (a === t + 1 || b_ === t + 1) {
              style = `background:${color};`;
              break;
            }
          }
        }
      }
      html += `<td style="${style}">${val ? val : "."}</td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  boardScores.innerHTML = html;
  boardScores.style.fontFamily = 'Consolas, Menlo, Monaco, monospace';
}

function calculateStandings() {
  // Calculate total scores and percentage for each team
  const SCORE_VALUES = [0, 0.5, 1, 1.5, 2];
  let teamTotals = [];
  // Count how many boards have at least one score entered
  let boardsScored = 0;
  for (let b = 0; b < NUM_BOARDS; b++) {
    if (scores[b].some(val => val)) boardsScored++;
  }
  for (let t = 0; t < NUM_TEAMS; t++) {
    let total = 0;
    for (let b = 0; b < NUM_BOARDS; b++) {
      const val = scores[b][t];
      if (val) {
        let idx = SCORE_LABELS.indexOf(val);
        if (idx !== -1) total += SCORE_VALUES[idx];
      }
    }
    let percentage = boardsScored > 0 ? Math.round((total / (2 * boardsScored)) * 100) : 0;
    teamTotals.push({ team: t + 1, name: teamNames[t], total, percentage });
  }
  // Sort by total descending
  teamTotals.sort((a, b) => b.total - a.total);
  // Assign ordinals and handle ties
  let lastScore = null;
  let lastOrdinal = 0;
  let tieCount = 0;
  let ordinals = [];
  let tieGroups = [];
  teamTotals.forEach((team, idx) => {
    if (lastScore === null || team.total < lastScore) {
      lastOrdinal = idx + 1;
      tieCount = 1;
      tieGroups.push([idx]);
    } else {
      tieCount++;
      tieGroups[tieGroups.length - 1].push(idx);
    }
    ordinals.push({ ordinal: lastOrdinal });
    lastScore = team.total;
  });
  // Mark which teams are in a tie
  let tieFlags = Array(teamTotals.length).fill(false);
  tieGroups.forEach(group => {
    if (group.length > 1) {
      group.forEach(idx => { tieFlags[idx] = true; });
    }
  });
  return teamTotals.map((team, idx) => {
    const { ordinal } = ordinals[idx];
    let ordinalStr = ordinal + (ordinal === 1 ? 'st' : ordinal === 2 ? 'nd' : ordinal === 3 ? 'rd' : 'th');
    if (tieFlags[idx]) ordinalStr += ' (Tie)';
    let scoreStr = Number.isInteger(team.total) ? team.total.toString() : (team.total % 1 === 0.5 ? (team.total - 0.5) + '.5' : team.total.toString());
    return {
      ordinal: ordinalStr,
      team: team.name,
      score: scoreStr,
      percentage: team.percentage
    };
  });
}

function renderStandings() {
  const standingsSection = document.getElementById('standings');
  const standings = calculateStandings();
  // Check if all scores are zero
  const allZero = standings.every(row => Number(row.score) === 0);
  // Check if all boards are fully scored
  let allBoardsScored = true;
  for (let b = 0; b < NUM_BOARDS; b++) {
    if (scores[b].some(val => !val)) {
      allBoardsScored = false;
      break;
    }
  }
  let label = allBoardsScored ? 'Final Standings' : 'Standings';
  let html = `<h2 style="margin-top:0;text-align:center;">${label}</h2>`;
  if (allZero) {
    html += '<div style="display:flex; flex-direction:column; align-items:center; margin-top:1em;">';
    for (let t = 0; t < NUM_TEAMS; t++) {
      let name = teamNames[t] || `Team #${t + 1}`;
      html += `<div style="margin:0.2em 0; font-size:1.1em;">${name}</div>`;
    }
    html += '</div>';
  } else {
    html += '<div style="display:flex; justify-content:center; width:100%;"><table class="mono-table" style="margin-top:1em; min-width:0; width:auto;">';
    html += '<thead><tr>';
    html += '<th style="text-align:left; max-width:7.5em; padding-right:0.7em;">Rank</th>';
    html += '<th style="text-align:left; max-width:18ch; padding-right:0.7em;">Team</th>';
    html += '<th style="text-align:left; min-width:6ch;">Score</th>';
    html += '</tr></thead><tbody>';
    standings.forEach(row => {
      html += `<tr><td style="text-align:left; max-width:7.5em; padding-right:0.7em;">${row.ordinal}</td><td style="text-align:left; max-width:18ch; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding-right:0.7em;">${row.team}</td><td style="text-align:left; min-width:6ch;">${row.score} (${row.percentage}%)</td></tr>`;
    });
    html += '</tbody></table></div>';
  }
  standingsSection.innerHTML = html;
}

function renderAll() {
  renderScoreEntry(currentBoardNum);
  setRadioButtonStates(currentBoardNum); // Add this line to set radio buttons based on stored scores
  renderBoardScores();
  renderStandings();
  setupBoardControls();
  setupScoreEntryListeners();
  setupTeamDropdownListeners();
  setupPairingsToggle();
}

// Add this new function to set radio button states based on stored scores
function setRadioButtonStates(boardNum) {
  for (let i = 0; i < NUM_TEAMS; i++) {
    const storedScore = scores[boardNum - 1][i];
    if (storedScore) {
      const radios = document.getElementsByName(`team${i}-score`);
      radios.forEach(radio => {
        if (radio.value === storedScore) {
          radio.checked = true;
        }
      });
    }
  }
}

function setupBoardControls() {
  const slider = document.getElementById('board-slider');
  const upBtn = document.getElementById('board-up');
  const downBtn = document.getElementById('board-down');
  const boardNumSpan = document.getElementById('board-num');

  // Live update the number as you drag
  slider.addEventListener('input', (e) => {
    boardNumSpan.textContent = String(e.target.value).padStart(2, ' ');
  });

  // Only re-render everything when the user releases the slider
  slider.addEventListener('change', (e) => {
    currentBoardNum = Number(e.target.value);
    renderAll();
  });

  upBtn.addEventListener('click', () => {
    if (currentBoardNum < NUM_BOARDS) {
      currentBoardNum++;
      renderAll();
    }
  });
  downBtn.addEventListener('click', () => {
    if (currentBoardNum > 1) {
      currentBoardNum--;
      renderAll();
    }
  });
}

function setupScoreEntryListeners() {
  for (let i = 0; i < NUM_TEAMS; i++) {
    const radios = document.getElementsByName(`team${i}-score`);
    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        // Check if all teams have a selected value
        let allSelected = true;
        let newScores = [];
        for (let j = 0; j < NUM_TEAMS; j++) {
          const selected = document.querySelector(`input[name="team${j}-score"]:checked`);
          if (selected) {
            newScores.push(selected.value);
          } else {
            allSelected = false;
            break;
          }
        }
        if (allSelected) {
          if (errorCheckingEnabled) {
            const err = validateBridgeScores(newScores);
            if (err) {
              showErrorModal(err);
              return;
            }
          }
          scores[currentBoardNum - 1] = newScores;
          renderBoardScores();
          renderStandings(); // Re-render standings after scores change
        }
      });
    });
  }
}

// Add event listeners for team dropdowns to update teamNames and re-render
function setupTeamDropdownListeners() {
  for (let i = 0; i < NUM_TEAMS; i++) {
    const dropdown = document.getElementById(`team${i + 1}-dropdown`);
    if (dropdown) {
      dropdown.value = teamNames[i] && getAllTeamNames().includes(teamNames[i]) ? teamNames[i] : '';
      lastDropdownValues[i] = dropdown.value;
      dropdown.addEventListener('change', (e) => {
        if (e.target.value === 'Guests') {
          if (!guestModalOpen) {
            guestModalOpen = true;
            showGuestModal(i);
          }
        } else {
          teamNames[i] = e.target.value || `Team #${i + 1}`;
          lastDropdownValues[i] = dropdown.value;
          if (!guestModalOpen) renderAll();
        }
      });
    }
  }
}

function showGuestModal(dropdownIndex) {
  const modal = document.getElementById('guest-modal');
  const input = document.getElementById('guest-name-input');
  const okBtn = document.getElementById('guest-modal-ok');
  const cancelBtn = document.getElementById('guest-modal-cancel');
  modal.style.display = 'flex';
  input.value = '';
  input.focus();

  function closeModal(setName) {
    modal.style.display = 'none';
    okBtn.removeEventListener('click', okHandler);
    cancelBtn.removeEventListener('click', cancelHandler);
    input.removeEventListener('keydown', enterHandler);
    guestModalOpen = false;
    // After closing, re-render and set dropdown value
    renderAll();
    const dropdown = document.getElementById(`team${dropdownIndex + 1}-dropdown`);
    if (dropdown) {
      if (setName) {
        dropdown.value = setName;
        teamNames[dropdownIndex] = setName;
        lastDropdownValues[dropdownIndex] = setName;
      } else {
        dropdown.value = lastDropdownValues[dropdownIndex];
        teamNames[dropdownIndex] = lastDropdownValues[dropdownIndex] || `Team #${dropdownIndex + 1}`;
      }
    }
  }
  function okHandler() {
    let name = input.value.trim();
    if (name && !getAllTeamNames().includes(name)) {
      guestNames.push(name);
      guestNames.sort((a, b) => a.localeCompare(b));
      closeModal(name);
    } else {
      // If name is empty or duplicate, just close and restore
      closeModal();
    }
  }
  function cancelHandler() {
    closeModal();
  }
  function enterHandler(e) {
    if (e.key === 'Enter') okHandler();
    if (e.key === 'Escape') cancelHandler();
  }
  okBtn.addEventListener('click', okHandler);
  cancelBtn.addEventListener('click', cancelHandler);
  input.addEventListener('keydown', enterHandler);
}

// Toggle button event
function setupPairingsToggle() {
  const btn = document.getElementById('toggle-pairings');
  if (btn) {
    btn.textContent = showPairings ? 'Hide Pairings' : 'Show Pairings';
    btn.onclick = () => {
      showPairings = !showPairings;
      btn.textContent = showPairings ? 'Hide Pairings' : 'Show Pairings';
      renderBoardScores();
    };
  }
}

// Set the event date at startup
function setEventDate() {
  const eventDateDiv = document.getElementById('event-date');
  if (eventDateDiv) {
    if (loadedEventDate) {
      eventDateDiv.textContent = loadedEventDate;
    } else {
      const now = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const day = days[now.getDay()];
      const month = months[now.getMonth()];
      const date = now.getDate();
      const year = now.getFullYear();
      eventDateDiv.textContent = `${day}, ${month} ${date}, ${year}`;
    }
  }
}

// Initial render
// setEventDate(); // Removed top-level call
// renderAll(); // Removed top-level call

// --- Settings Modal Logic ---
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const errorCheckToggle = document.getElementById('error-check-toggle');
const settingsOk = document.getElementById('settings-modal-ok');
const settingsCancel = document.getElementById('settings-modal-cancel');

if (settingsBtn && settingsModal && errorCheckToggle && settingsOk && settingsCancel) {
  settingsBtn.addEventListener('click', () => {
    errorCheckToggle.checked = errorCheckingEnabled;
    settingsModal.style.display = 'flex';
    errorCheckToggle.focus();
  });
  function closeSettingsModal(save) {
    settingsModal.style.display = 'none';
    if (save) {
      errorCheckingEnabled = errorCheckToggle.checked;
    } else {
      errorCheckToggle.checked = errorCheckingEnabled;
    }
  }
  settingsOk.addEventListener('click', () => closeSettingsModal(true));
  settingsCancel.addEventListener('click', () => closeSettingsModal(false));
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal(false);
  });
  errorCheckToggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') closeSettingsModal(true);
    if (e.key === 'Escape') closeSettingsModal(false);
  });
}

// --- Error Modal Logic ---
function showErrorModal(message) {
  let modal = document.getElementById('error-modal');
  let msgDiv = document.getElementById('error-modal-msg');
  let okBtn = document.getElementById('error-modal-ok');
  const scoreEntry = document.getElementById('score-entry');
  if (!modal) {
    // Create modal if not present
    modal = document.createElement('div');
    modal.id = 'error-modal';
    // Position absolutely below and left of score-entry
    modal.style = 'display:none; position:absolute; z-index:2000; align-items:center; justify-content:center;';
    modal.innerHTML = `<div style="background:#fff; padding:2em; border-radius:8px; box-shadow:0 2px 16px rgba(0,0,0,0.2); min-width:300px; max-width:90vw; margin:auto; display:flex; flex-direction:column; align-items:center;">
      <img src="club.png" alt="Club" style="width: 32px; height: 32px; margin-bottom: 0.5em;">
      <div style="font-size: 1.2em; font-weight: bold; color: #b00; margin-bottom: 0.5em;">ERROR</div>
      <div id='error-modal-msg' style='font-size:1.1em; margin-bottom:1.5em; color:#b00; text-align: center;'></div>
      <button id='error-modal-ok'>OK</button>
    </div>`;
    document.body.appendChild(modal);
    msgDiv = document.getElementById('error-modal-msg');
    okBtn = document.getElementById('error-modal-ok');
  }
  // Position modal below and left of score-entry
  if (scoreEntry) {
    const rect = scoreEntry.getBoundingClientRect();
    modal.style.left = (window.scrollX + rect.left) + 'px';
    modal.style.top = (window.scrollY + rect.bottom + 12) + 'px'; // 12px below
    modal.style.width = 'auto';
    modal.style.height = 'auto';
    modal.style.right = '';
    modal.style.bottom = '';
    modal.style.position = 'absolute';
  } else {
    // fallback to fixed center
    modal.style.position = 'fixed';
    modal.style.left = '50vw';
    modal.style.top = '50vh';
    modal.style.transform = 'translate(-50%, -50%)';
  }
  msgDiv.innerHTML = message.replace(/\n/g, '<br>');
  modal.style.display = 'flex';
  okBtn.focus();
  function close() {
    modal.style.display = 'none';
    okBtn.removeEventListener('click', close);
    okBtn.removeEventListener('keydown', keyHandler);
    // Clear all radio buttons and restore previous valid state
    for (let i = 0; i < NUM_TEAMS; i++) {
      const radios = document.getElementsByName(`team${i}-score`);
      radios.forEach(radio => { radio.checked = false; });
    }
    // Restore the previous valid state for this board
    setRadioButtonStates(currentBoardNum);
  }
  function keyHandler(e) {
    if (e.key === 'Enter' || e.key === 'Escape') close();
  }
  okBtn.addEventListener('click', close);
  okBtn.addEventListener('keydown', keyHandler);
}

// --- Bridge error-checking function ---
function validateBridgeScores(boardScores) {
  // boardScores: array of 6 strings ("0", "x", "1", "1x", "2")
  const SCORE_MAP = { '0': 0, 'x': 0.5, '1': 1, '1x': 1.5, '2': 2 };
  const nums = boardScores.map(val => SCORE_MAP[val] ?? NaN);
  if (nums.some(isNaN)) return 'All teams must have a valid score.\n\nPlease re-score the board.';

  // Pairings for this board
  const boardPairings = getBoardPairings()[currentBoardNum - 1];
  for (let i = 0; i < boardPairings.length; i++) {
    const [a, b] = boardPairings[i];
    const sum = nums[a - 1] + nums[b - 1];
    if (Math.abs(sum - 2.0) > 0.001) return `The scores of\nTeams ${a} and ${b} must total 2.0.\n\nPlease re-score the board.`;
  }

  // NS/EW totals: for each pairing, first team is NS, second is EW
  let nsTotal = 0, ewTotal = 0;
  for (let i = 0; i < boardPairings.length; i++) {
    const [a, b] = boardPairings[i];
    nsTotal += nums[a - 1];
    ewTotal += nums[b - 1];
  }
  if (Math.abs(nsTotal - 3.0) > 0.001 || Math.abs(ewTotal - 3.0) > 0.001) {
    return `Pair-scores are incorrect.\nTotal for all N/S's is ${nsTotal}.\nTotal for all E/W's is ${ewTotal}.\nEach direction should have three points.\n\nPlease re-score the board.`;
  }

  // Board total (check this last since it's more generic)
  const total = nums.reduce((a, b) => a + b, 0);
  if (Math.abs(total - 6.0) > 0.001) return 'Board total is incorrect.\nIt must be exactly 6.0.\n\nPlease re-score the board.';

  return null; // valid
}

// --- Save/Open Logic ---
let lastFileHandle = null;
let loadedEventDate = null;

function getTodayString() {
  if (loadedEventDate) return loadedEventDate;
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function formatLongDate(dateStr) {
  // Expects mm/dd/yyyy
  const [mm, dd, yyyy] = dateStr.split('/').map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function setEventDateDisplay(dateStr) {
  const eventDateDiv = document.getElementById('event-date');
  if (eventDateDiv) {
    if (dateStr && dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      eventDateDiv.textContent = formatLongDate(dateStr);
    } else {
      eventDateDiv.textContent = dateStr;
    }
  }
}

function getSaveText() {
  // Line 1: date
  let lines = [getTodayString()];
  // Lines 2-7: team names
  for (let i = 0; i < NUM_TEAMS; i++) lines.push(teamNames[i] || '');
  // Lines 8-27: board numbers 1-20
  for (let i = 1; i <= NUM_BOARDS; i++) lines.push(String(i));
  // Lines 28-147: scores for each team, 20 lines per team
  for (let t = 0; t < NUM_TEAMS; t++) {
    for (let b = 0; b < NUM_BOARDS; b++) {
      let val = scores[b][t];
      // Convert 'x' to 0.5 and '1x' to 1.5 for file output
      if (val === 'x') val = '0.5';
      if (val === '1x') val = '1.5';
      lines.push(val === undefined ? '' : val);
    }
  }
  return lines.join('\r\n');
}

async function saveAsFile() {
  console.log('Save As... button clicked');
  let defaultName = `Bridge scores ${getTodayString().replace(/\//g, '-')}.txt`;
  if (window.showSaveFilePicker) {
    // File System Access API
    const handle = await window.showSaveFilePicker({
      suggestedName: defaultName,
      types: [{ description: 'Text Files', accept: { 'text/plain': ['.txt'] } }]
    });
    lastFileHandle = handle;
    const writable = await handle.createWritable();
    await writable.write(getSaveText());
    await writable.close();
  } else {
    // Fallback: download
    const blob = new Blob([getSaveText()], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); }, 100);
    lastFileHandle = null; // can't overwrite
  }
}

async function saveFile() {
  console.log('Save button clicked');
  if (lastFileHandle && window.showSaveFilePicker) {
    const writable = await lastFileHandle.createWritable();
    await writable.write(getSaveText());
    await writable.close();
  } else {
    await saveAsFile();
  }
}

function parseLegacyFile(text) {
  let lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 147) throw new Error('File too short.');
  // Date
  loadedEventDate = lines[0] || null;
  setEventDateDisplay(loadedEventDate || getTodayString());
  // Team names
  let fileTeamNames = [];
  for (let i = 0; i < NUM_TEAMS; i++) fileTeamNames.push(lines[1 + i] || '');
  // Add any new team names to dropdowns (and guestNames if not in TEAM_NAMES)
  guestNames = [];
  for (let name of fileTeamNames) {
    if (name && !TEAM_NAMES.includes(name) && !guestNames.includes(name)) {
      guestNames.push(name);
    }
  }
  guestNames.sort((a, b) => a.localeCompare(b));
  for (let i = 0; i < NUM_TEAMS; i++) teamNames[i] = fileTeamNames[i];
  // Board numbers (lines 7-26) are ignored
  // Scores
  let idx = 27;
  for (let t = 0; t < NUM_TEAMS; t++) {
    for (let b = 0; b < NUM_BOARDS; b++) {
      let val = lines[idx++] || '';
      // Convert 0.5 to 'x' and 1.5 to '1x' for display
      if (val === '0.5') val = 'x';
      if (val === '1.5') val = '1x';
      scores[b][t] = val;
    }
  }
}

function openFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt,text/plain';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        parseLegacyFile(evt.target.result);
        renderAll();
      } catch (err) {
        const lines = evt.target.result.split(/\r?\n/);
        showErrorModal('Failed to open file.\n' + err.message + `\n(Line count: ${lines.length})`);
      }
      input.value = '';
    };
    reader.readAsText(file);
  };
  input.click();
}

// --- Download Logic ---
function downloadFile() {
  let defaultName = `Bridge scores ${getTodayString().replace(/\//g, '-')}.txt`;
  const blob = new Blob([getSaveText()], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = defaultName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); }, 100);
}

// --- Attach Download/Open listeners after DOM is loaded ---
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('download').addEventListener('click', downloadFile);
  document.getElementById('open').addEventListener('click', openFile);
  setEventDate();
  renderAll();
}); 
