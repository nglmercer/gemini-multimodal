import { LitElement, html, css, unsafeCSS } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { marked } from 'marked';

const styles =/*css*/unsafeCSS(`
  :host {
    display: block;
    padding: 1rem;
    color-scheme: light dark;
  }
  .todo-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: 4px;
  }
  .todo-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .todo-actions {
    display: flex;
    gap: 8px;
  }
  button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
  }
  .edit-btn {
    background-color: #3b82f6;
    color: white;
  }
  .edit-btn:hover {
    background-color: #258ee6;
  }
  .delete-btn {
    background-color: #ef4444;
    color: white;
  }
  .delete-btn:hover {
    background-color: #dc2626;
  }
  textarea {
    box-sizing: border-box;
    border-radius: 4px;
  }

  .markdown-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .markdown-editor {
    width: 100%;
    min-height: 100px;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: monospace;
  }

  .markdown-preview {
    padding: 8px;
    border: 1px solid #eee;
    border-radius: 4px;
  }

  .markdown-preview :first-child {
    margin-top: 0;
  }

  .markdown-preview :last-child {
    margin-bottom: 0;
  }

  .preview-header {
    font-size: 0.8em;
    color: #666;
    margin-bottom: 4px;
  }

  .edit-mode .markdown-preview {
    display: block;
  }

  .view-mode .markdown-editor {
    display: none;
  }

  .view-mode .markdown-preview {
    border: none;
    background: none;
    padding: 4px 0;
  }

  .view-mode .preview-header {
    display: none;
  }
`);

export class TodoComponent extends LitElement {
  static styles = css`
    ${styles}
  `;

  static properties = {
    todo: { type: Object },
    editingId: { type: String },
  };

  constructor() {
    super();
    this.todo = {};
    this.editingId = null;
  }

  render() {
    return html`
      <div class="todo-container">
        ${this.renderTodoItem(this.todo)}
      </div>
    `;
  }

  renderTodoItem(item, depth = 0) {
    const isEditing = this.editingId === item.id;
    const tags = item.tags ? item.tags.map(tag => html`<span class="tag">${tag}</span>`) : '';
    
    const todoContent = html`
      <div class="todo-item" style="margin-left: ${depth * 20}px;">
        <input
          type="checkbox"
          .checked=${item.completed}
          @change=${() => this.toggleComplete(item)}
        />
        <span class="todo-title">${item.title}</span>
        ${tags}
        <div class="markdown-container ${isEditing ? 'edit-mode' : 'view-mode'}">
          ${isEditing ? html`
            <textarea
              class="markdown-editor"
              @input=${(e) => this.handleMarkdownInput(e, item)}
              placeholder="${item.task ? 'Subtask Description' : 'Task Description'}"
            >${item.description}</textarea>
            <div class="preview-header">Preview:</div>
          ` : ''}
          <div class="markdown-preview">
            ${unsafeHTML(this.renderMarkdown(item.description))}
          </div>
        </div>
        <div class="todo-actions">
          <button
            class="edit-btn"
            @click=${() => this.toggleEdit(item)}
          >
            ${isEditing ? 'Save' : 'Edit'}
          </button>
          <button
            class="delete-btn"
            @click=${() => this.deleteTodo(item)}
          >
            Delete
          </button>
        </div>
      </div>
      <details>
      <summary>
        ${item.tasks.length} ${item.completed ? '(Completed)' : 'elements'}
      </summary>
      ${item.tasks ? item.tasks.map(task => this.renderTodoItem(task, depth + 1)) : ''}

    </details>
    `;
    console.log(depth, item.tasks.length);
    // If depth is greater than 1, wrap the content in a details element
    if (depth > 0) {
      return html`
        <details>
          <summary>
            ${item.title} ${item.completed ? '(Completed)' : ''}
          </summary>
          ${todoContent}
        </details>
      `;
    }
  
    // Otherwise return the content directly
    return todoContent;
  }

  renderMarkdown(text) {
    if (!text) return '';
    return marked(text);
  }

  handleMarkdownInput(e, item) {
    item.description = e.target.value;
    this.requestUpdate();
  }

  toggleEdit(item) {
    if (this.editingId === item.id) {
      this.editingId = null;
      this.dispatchEvent(new CustomEvent('edit-todo', {
        detail: { item },
        bubbles: true,
        composed: true
      }));
    } else {
      this.editingId = item.id;
    }
    this.requestUpdate();
  }

  toggleComplete(item) {
    item.completed = !item.completed;
    this.dispatchEvent(new CustomEvent('task-completed', {
      detail: { id: item },
      bubbles: true,
      composed: true
    }));
    this.requestUpdate();
  }

  deleteTodo(item) {
    this.dispatchEvent(new CustomEvent('delete-todo', {
      detail: { id: item.id },
      bubbles: true,
      composed: true
    }));
  }
}

customElements.define('todo-component', TodoComponent);

