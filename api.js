/**
 * QuickNotes API Client
 * Interacts with JSONPlaceholder mock REST API (https://jsonplaceholder.typicode.com/posts)
 */

const API_URL = 'https://jsonplaceholder.typicode.com/posts';

// DOM Elements
const loadBtn = document.getElementById('load-btn');
const statusElem = document.getElementById('status');
const noteForm = document.getElementById('note-form');
const titleInput = document.getElementById('title-input');
const bodyInput = document.getElementById('body-input');
const submitBtn = document.getElementById('submit-btn');
const notesList = document.getElementById('notes-list');
const titleCharCounter = document.getElementById('title-char-counter');

/**
 * Reusable async HTTP request wrapper
 * Calls fetch, validates response.ok, and throws on HTTP or network errors
 *
 * @param {string} url - Target URL
 * @param {RequestInit} [options={}] - Fetch configuration options
 * @returns {Promise<any>} Parsed JSON response body
 */
async function request(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorDetails = `Request failed with status ${response.status} (${response.statusText || 'Error'})`;
    throw new Error(errorDetails);
  }

  // Handle 204 No Content responses gracefully
  if (response.status === 204) {
    return {};
  }

  return await response.json();
}

/**
 * Update the user-facing status message banner
 *
 * @param {'loading' | 'success' | 'error'} type - Message type
 * @param {string} message - Text message content
 */
function setStatus(type, message) {
  if (!statusElem) return;

  statusElem.className = `status-box active status-${type}`;
  // Strictly use textContent to prevent XSS injection
  statusElem.textContent = message;
}

/**
 * Toggle disabled state of action buttons during active network requests
 *
 * @param {boolean} disabled - Whether buttons should be disabled
 */
function setButtonsDisabled(disabled) {
  if (loadBtn) loadBtn.disabled = disabled;
  if (submitBtn) submitBtn.disabled = disabled;

  const deleteButtons = document.querySelectorAll('.delete-btn');
  deleteButtons.forEach((btn) => {
    btn.disabled = disabled;
  });
}

/**
 * Render empty state placeholder when no notes are available
 */
function renderEmptyState() {
  notesList.innerHTML = '';
  const emptyItem = document.createElement('li');
  emptyItem.className = 'empty-state';

  const iconSpan = document.createElement('span');
  iconSpan.className = 'empty-state-icon';
  iconSpan.textContent = '📭';

  const messagePara = document.createElement('p');
  messagePara.textContent = 'No notes found. Click "Load notes" or create one above!';

  emptyItem.appendChild(iconSpan);
  emptyItem.appendChild(messagePara);
  notesList.appendChild(emptyItem);
}

/**
 * Create a DOM list item representing a single note
 * Strictly uses textContent to insert any dynamic/user-supplied text
 *
 * @param {{ id: number|string, title: string, body?: string }} note
 * @returns {HTMLLIElement}
 */
function createNoteElement(note) {
  const li = document.createElement('li');
  li.className = 'note-item';
  li.dataset.noteId = String(note.id);

  // Header row (title + badge)
  const headerRow = document.createElement('div');
  headerRow.className = 'note-header-row';

  const titleEl = document.createElement('h3');
  titleEl.className = 'note-title';
  titleEl.textContent = note.title || 'Untitled Note';

  const badgeEl = document.createElement('span');
  badgeEl.className = 'note-badge';
  badgeEl.textContent = `ID #${note.id}`;

  headerRow.appendChild(titleEl);
  headerRow.appendChild(badgeEl);
  li.appendChild(headerRow);

  // Body content
  if (note.body) {
    const bodyEl = document.createElement('p');
    bodyEl.className = 'note-body';
    bodyEl.textContent = note.body;
    li.appendChild(bodyEl);
  }

  return li;
}

/**
 * Task 1: Load 10 notes from the server via GET request
 */
async function loadNotes() {
  setStatus('loading', 'Loading notes...');
  setButtonsDisabled(true);

  try {
    const notes = await request(`${API_URL}?_limit=10`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    notesList.innerHTML = '';

    if (!notes || notes.length === 0) {
      renderEmptyState();
      setStatus('success', 'No notes available on the server.');
      return;
    }

    notes.forEach((note) => {
      const noteEl = createNoteElement(note);
      notesList.appendChild(noteEl);
    });

    setStatus('success', 'Loaded 10 notes from the server.');
  } catch (error) {
    console.error('Error loading notes:', error);
    setStatus('error', 'Failed to load notes. Please check your network connection and try again.');
  } finally {
    setButtonsDisabled(false);
  }
}

// Live character counter for note title
if (titleInput && titleCharCounter) {
  titleInput.addEventListener('input', () => {
    titleCharCounter.textContent = String(titleInput.value.length);
  });
}

// Initial event listener for Task 1
if (loadBtn) {
  loadBtn.addEventListener('click', loadNotes);
}

// Display initial empty state on page load
renderEmptyState();
