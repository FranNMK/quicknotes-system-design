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
    return { _status: 204 };
  }

  const data = await response.json();
  if (data && typeof data === 'object') {
    data._status = response.status;
  }
  return data;
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

  // Task 3: Note action row with Delete button
  const actionsRow = document.createElement('div');
  actionsRow.className = 'note-actions';

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = 'Delete';
  deleteBtn.setAttribute('aria-label', `Delete note ${note.id}`);

  deleteBtn.addEventListener('click', () => {
    deleteNote(note.id, li);
  });

  actionsRow.appendChild(deleteBtn);
  li.appendChild(actionsRow);

  return li;
}

/**
 * Task 3: Delete note via DELETE request
 *
 * JSONPlaceholder Mock API Persistency Approach:
 * JSONPlaceholder (https://jsonplaceholder.typicode.com) is a fake online REST API
 * built for testing and prototyping. It simulates CRUD operations without persisting
 * data: POST requests return mock IDs (e.g., id 101) without writing to a backend database,
 * and DELETE requests return status 200 OK without removing persistent server records.
 *
 * Approach:
 * 1. We send a real HTTP DELETE request to `https://jsonplaceholder.typicode.com/posts/${id}`.
 * 2. On success, we update the client-side UI by removing the note DOM element.
 * 3. If removing this note leaves the list empty, we automatically render the empty state.
 * 4. If the network request fails, the DOM element is preserved and an error message is displayed.
 *
 * @param {number|string} id - The note ID to delete
 * @param {HTMLLIElement} noteElement - The DOM element representing the note
 */
async function deleteNote(id, noteElement) {
  setStatus('loading', `Deleting note #${id}...`);
  setButtonsDisabled(true);

  try {
    // Send DELETE request to JSONPlaceholder endpoint
    await request(`${API_URL}/${id}`, {
      method: 'DELETE'
    });

    // Remove the note element from the DOM
    if (noteElement && noteElement.parentNode) {
      noteElement.remove();
    }

    // Check if the list is now empty and render empty state if so
    if (notesList.children.length === 0) {
      renderEmptyState();
    }

    setStatus('success', `Note with ID #${id} deleted successfully.`);
  } catch (error) {
    console.error(`Error deleting note #${id}:`, error);
    setStatus('error', `Failed to delete note #${id}. Please try again.`);
  } finally {
    setButtonsDisabled(false);
  }
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

/**
 * Task 2: Create a new note via POST request
 * Validates inputs: title is required, max 100 characters; body is optional
 *
 * @param {SubmitEvent} event
 */
async function createNote(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  // Validation: title is required
  if (!title) {
    setStatus('error', 'Validation Error: Note title is required.');
    titleInput.focus();
    return;
  }

  // Validation: title maximum 100 characters
  if (title.length > 100) {
    setStatus('error', 'Validation Error: Title must not exceed 100 characters.');
    titleInput.focus();
    return;
  }

  setStatus('loading', 'Creating note on the server...');
  setButtonsDisabled(true);

  try {
    const payload = {
      title,
      body,
      userId: 1
    };

    const newNote = await request(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Remove empty-state placeholder if present before prepending
    const emptyState = notesList.querySelector('.empty-state');
    if (emptyState) {
      emptyState.remove();
    }

    // Add returned note to the top of the list
    const noteEl = createNoteElement(newNote);
    notesList.prepend(noteEl);

    // Show status code and new id
    const statusCode = newNote._status || 201;
    setStatus('success', `Note created (status ${statusCode}, id ${newNote.id}).`);

    // Clear form and reset counter
    noteForm.reset();
    if (titleCharCounter) {
      titleCharCounter.textContent = '0';
    }
  } catch (error) {
    console.error('Error creating note:', error);
    setStatus('error', 'Failed to create note. Please check your network connection and try again.');
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

// Event listeners for Task 1 and Task 2
if (loadBtn) {
  loadBtn.addEventListener('click', loadNotes);
}

if (noteForm) {
  noteForm.addEventListener('submit', createNote);
}

// Display initial empty state on page load
renderEmptyState();
