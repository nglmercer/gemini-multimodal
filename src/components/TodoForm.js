import { LitElement, html, css, unsafeCSS } from 'lit';

class TodoForm extends LitElement {
  static properties = {
    todos: { type: Array },
    defaultTags: { type: Array },
    depth: { type: Number },
    maxDepth: { type: Number },
    isSubtask: { type: Boolean },
    showTags: { type: Boolean },
    showSubtaskButton: { type: Boolean },
    showRemoveButton: { type: Boolean },
    showSubmitButton: { type: Boolean },
    isExpanded: { type: Boolean },
    subtaskCount: { type: Number },
    formId: { type: String },
    taskCount: { type: Number },
    readOnly: { type: Boolean },
    Id: { type: Number },
  };

  constructor() {
    super();
    this.todos = [];
    this.defaultTags = ['personal', 'work', 'family', 'friends'];
    this.depth = 0;
    this.maxDepth = 1;
    this.taskCount = 0;
    this.isSubtask = false;
    this.showTags = true;
    this.showSubtaskButton = true;
    this.showRemoveButton = true;
    this.showSubmitButton = true;
    this.customClass = '';
    this.formId = `todo-form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.readOnly = false;
    this.isCompleted = false;
    this.Id = Date.now();
  }

  static styles = css`
  :host {
    display: block;
    padding: 1rem;
    color-scheme: light dark; /* Soporta esquemas claros y oscuros */
    --primary-bg: white;
    --Secondary-bg: #f5f5f5;
    --background-color: #fff;
    --text-color: #000;

    --button-bg: #3b82f6;
    --button-text: white;
  }
  textarea {
    box-sizing: border-box;
    field-sizing: content;
    }
  .flex { display: flex; }
  .space-between { justify-content: space-between; }
  .align-center { align-items: center; }
  .w-full { width: 100%; }
  .submit-btn {
    background-color: var(--button-bg);
    color: var(--button-text);
  }

  @media (prefers-color-scheme: dark) {
    :host {
      color-scheme: light dark; /* Soporta esquemas claros y oscuros */
      --primary-bg: #333;
      --Secondary-bg: #1a1a1a;
      --background-color: #2d2d2d;
      --text-color: white;
      --button-bg: #2563eb; 
      --button-text: white;
    }
  }
    .form-container {
      max-width: 800px;
      margin: auto;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      display: grid;
      gap: 8px;
      color: var(--text-color);
      background-color: var(--background-color);
    }
    .form-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    /* Level-specific styling */
      /* Aquí, puedes personalizar el color de fondo de las tareas según el tema */
  .depth-0 {
    background-color: var(--Secondary-bg);
  }
  

    .depth-1 {
      background-color: var(--Secondary-bg);

      /* First level subtask */
/*       background-color: rgba(229, 231, 235, 0.2);
      margin-left: 16px;
      border-left: 2px solid #e5e7eb; */
      
    }

    .depth-2 {
      /* Second level subtask */
      margin-left: 24px;
      border-left: 2px solid #d1d5db;
    }

    .depth-3 {
      /* Third level subtask */
      background-color: rgba(229, 231, 235, 0.6);
      margin-left: 32px;
      border-left: 2px solid #9ca3af;
    }

    .input-field {
      width: auto;
      box-sizing: border-box;
      field-sizing: content;
      max-width: 500px;
      padding: 8px;
      margin-bottom: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }

    .submit-btn {
      background-color: #3b82f6;
      color: white;
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 8px;
    }
    .submit-btn2 {
      background-color: transparent;
      color: var(--text-color);
      border: 1px solid #258ee6;
    }
    .submit-btn2:hover {
      background-color: #258ee6;
    }
    .submit-btn:hover {
      background-color: #2563eb;
    }

    .remove-btn {
      background-color: #ef4444;
    }

    .remove-btn:hover {
      background-color: #dc2626;
    }

    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }

    .tag {
      background-color: var(--Secondary-bg);
      padding: 4px 8px;
      border-radius: 16px;
      font-size: 14px;
    }

    .nested-form {
      background-color: #1a1a1a;
      border-radius: 8px;

/*       margin-top: 16px;
      padding: 16px;
      border-radius: 8px; */
    }

    /* Custom classes for each depth level */
    .task-container-0 { /* Main task styles */ }
    .task-container-1 { 
      summary {
        display: none;
      }
      #customTags {
        display: none;
      }
      form {
      background-color: var(--primary-bg);

      }
     }
    .task-container-2 { /* Second level subtask styles */ }
    .task-container-3 { /* Third level subtask styles */ }
    .task-counter {
      font-weight: bold;
      margin-bottom: 16px;
    }
    details {
      overflow: auto;
      max-height: 400px;
      width: 100%;
    }

    summary {
      cursor: pointer;
      border-radius: 5px;
    }
    summary:hover {
      background-color: var(--Secondary-bg);
    }

    details[open] summary {
    }

    details div {
      transition: max-height 0.3s ease-out;
    }

    details[open] div {
    }
    .hidden {
      display: none;
    }
    /* You can add your custom classes here */
    ${unsafeCSS(this.customClass)}
    `;
    toggleReadOnly() {
      this.readOnly = !this.readOnly;
      this.requestUpdate();
    }
    handleCheckboxChange() {
      this.isCompleted = this.getFormData().completed;
      const task = this.getFormData();
      // Emitir un evento 
      this.dispatchEvent(
        new CustomEvent('state-changed', {
          detail: { task },
          bubbles: true,
          composed: true,
        })
      );
  
      this.requestUpdate();
    }
  getContainerClass() {
    const baseClass = this.isSubtask ? 'nested-form' : 'form-container';
    const depthClass = `depth-${this.depth}`;
    const taskClass = `task-container-${this.depth}`;
    return `${baseClass} ${depthClass} ${taskClass} ${this.customClass}`;
  }

  render() {
    const inputsIsReadOnly = this.readOnly ? 'disabled' : '';
    return html`
      <div class="${this.getContainerClass()}" id="${this.formId}">
        <form id="todoForm" class="form-container" @submit="${this.handleSubmit}">
        <div class="form-content">
        ${!this.readOnly
          ? html`
          <label class="task-checkbox">
              <input
                type="checkbox"
                id="isCompleted"
                name="isCompleted"
                @change="${() => this.handleCheckboxChange()}"
              />
              <span class="checkmark"> ${this.isCompleted ? '✔' : '❌'}</span>
            </label>
            `
          : ''}
          <input 
            type="text" 
            id="title" 
            name="title" 
            placeholder="${this.isSubtask ? 'Subtask Title' : 'Task Title'}" 
            class="input-field" 
            required 
          />
          <textarea 
            id="description" 
            name="description" 
            placeholder="${this.isSubtask ? 'Subtask Description' : 'Task Description'}" 
            class="input-field" 
            required
          ></textarea>

          ${this.showTags ? html`
            <div class="tags-container">
              ${this.defaultTags.map(
                (tag) => html`
                  <label class="tag">
                    <input type="checkbox" name="tags" value="${tag}" /> ${tag}
                  </label>
                `
              )}
            </div>

            <input
              type="text"
              id="customTags"
              name="customTags"
              placeholder="Custom Tags (comma separated)"
              class="input-field hidden"
            />
          ` : ''}
          <label for="timestamp">Fecha y Hora:</label>
          <input type="datetime-local" id="timestamp" name="timestamp" value="${new Date().toISOString().slice(0,16)}">
              <div >
              <details >
              <summary class="flex space-between align-center w-full">Subtasks (${this.taskCount})               ${this.showSubtaskButton && this.depth < this.maxDepth ? html`
                <button
                  type="button"
                  class="submit-btn submit-btn2"
                  @click="${this.addSubtaskField}"
                >
                  Add ${this.isSubtask ? 'Nested Task' : 'Subtask'}
                </button>
              ` : ''}</summary>
              <div id="subtasks"></div>
            </details>


              </div>
          


          ${this.showRemoveButton && this.isSubtask ? html`
            <button
              type="button"
              class="submit-btn remove-btn"
              @click="${this.removeSubtask}"
            >
              Remove
            </button>
          ` : ''}
        </div>


          ${this.showSubmitButton && !this.isSubtask ? html`
            <button type="submit" class="submit-btn">Guardar Todo</button>
          ` : ''}
        </form>
      </div>
    `;
  }
  showsubtasks(e) {
    e.preventDefault();
    const detailsElement = this.shadowRoot.querySelector('details');
  
    if (detailsElement) {
      if (detailsElement.hasAttribute('open')) {
        detailsElement.removeAttribute('open'); // Oculta el contenido
      } else {
        detailsElement.setAttribute('open', ''); // Muestra el contenido
      }
    }
  }
  addSubtaskField() {
    const subtasksContainer = this.shadowRoot.querySelector('#subtasks');
    const subtaskForm = document.createElement('todo-form');
    this.taskCount++;
    subtaskForm.depth = this.depth + 1;
    subtaskForm.maxDepth = this.maxDepth;
    subtaskForm.isSubtask = true;
    subtaskForm.defaultTags = this.defaultTags;
    
    subtaskForm.showTags = this.depth < 2;
    subtaskForm.showSubtaskButton = this.depth < 2;
    subtaskForm.showRemoveButton = true;
    subtaskForm.showSubmitButton = false;
    
    subtaskForm.customClass = `custom-depth-${this.depth + 1}`;
    
    subtasksContainer.appendChild(subtaskForm);

    //  evento subtarea
    this.dispatchEvent(
      new CustomEvent('subtask-added', {
        detail: { formId: subtaskForm.formId },
        bubbles: true,
        composed: true
      })
    );
  }
  removeSubtask() {
    this.taskCount--;
    //evento 
    this.dispatchEvent(
      new CustomEvent('subtask-removed', {
        detail: { formId: this.formId },
        bubbles: true,
        composed: true
      })
    );
    
    // Eliminamos el elemento del DOM
    this.parentElement.removeChild(this);
  }

  getFormData() {
    const formEl = this.shadowRoot.querySelector('form');
    const formData = new FormData(formEl);
    
    const selectedTags = this.showTags 
      ? [...this.shadowRoot.querySelectorAll('input[name="tags"]:checked')]
          .map((input) => input.value)
      : [];

    const customTags = this.showTags
      ? formData.get('customTags')
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag)
      : [];

    const subtaskForms = [...this.shadowRoot.querySelectorAll('todo-form')];
    const subtasks = subtaskForms.map(form => form.getFormData());

    return {
      id: this.Id,
      title: formData.get('title'),
      description: formData.get('description'),
      completed: formData.get('isCompleted') === 'on' ? true : false,
      tasks: subtasks,
      tags: [...selectedTags, ...customTags],
      timestamp: formData.get('timestamp'),
      depth: this.depth,
    };
  }

  handleSubmit(e) {
    e.preventDefault();
    if (this.isSubtask) return;

    const todoData = this.getFormData();

    this.dispatchEvent(
      new CustomEvent('todo-created', {
        detail: todoData,
        bubbles: true,
        composed: true,
      })
    );

    e.target.reset();
    this.shadowRoot.querySelector('#subtasks').innerHTML = '';
  }
  loadData(todoData) {
    if (!todoData) return;
    if (todoData.id) this.Id = todoData.id;
    requestAnimationFrame(() => {
      if (todoData.tasks && todoData.tasks.length > 0) {
        this.taskCount = todoData.tasks.length;
        const subtasksContainer = this.shadowRoot.querySelector('#subtasks');
        
        subtasksContainer.innerHTML = '';
        
        todoData.tasks.forEach((subtask) => {
          const subtaskForm = document.createElement('todo-form');
          
          subtaskForm.depth = this.depth + 1;
          subtaskForm.maxDepth = this.maxDepth;
          subtaskForm.isSubtask = true;
          subtaskForm.defaultTags = this.defaultTags;
          subtaskForm.showTags = this.depth < 2;
          subtaskForm.showSubtaskButton = this.depth < 2;
          subtaskForm.showRemoveButton = true;
          subtaskForm.showSubmitButton = false;
          subtaskForm.customClass = `custom-depth-${this.depth + 1}`;
          
          subtasksContainer.appendChild(subtaskForm);
        });
      }
  
      
      requestAnimationFrame(() => {
       
        const form = this.shadowRoot.querySelector('form');
        if (!form) return; 
  
        const titleInput = form.querySelector('#title');
        const descriptionInput = form.querySelector('#description');
        const customTagsInput = form.querySelector('#customTags');
  
        if (titleInput) titleInput.value = todoData.title || '';
        if (descriptionInput) descriptionInput.value = todoData.description || '';
  
        if (this.showTags && todoData.tags) {
          this.defaultTags.forEach(tag => {
            const checkbox = form.querySelector(`input[value="${tag}"]`);
            if (checkbox) {
              checkbox.checked = todoData.tags.includes(tag);
            }
          });
  
          if (customTagsInput) {
            const customTags = todoData.tags.filter(tag => !this.defaultTags.includes(tag));
            customTagsInput.value = customTags.join(', ');
          }
        }
  
        if (todoData.tasks && todoData.tasks.length > 0) {
          const subtaskForms = this.shadowRoot.querySelectorAll('todo-form');
          todoData.tasks.forEach((subtaskData, index) => {
            const subtaskForm = subtaskForms[index];
            if (subtaskForm) {
              subtaskForm.loadData(subtaskData);
            }
          });
        }
  
        this.requestUpdate();
      });
    });
  }

  clearForm() {
    this.taskCount = 0;
    this.isCompleted = false;
    const form = this.shadowRoot.querySelector('form');
    const subtasksContainer = this.shadowRoot.querySelector('#subtasks');
    
    if (form) form.reset();
    if (subtasksContainer) subtasksContainer.innerHTML = '';

    const customTagsInput = this.shadowRoot.querySelector('#customTags');
    if (customTagsInput) {
      customTagsInput.value = '';
    }

    const checkboxes = this.shadowRoot.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });

    // Solicitar una actualización del componente
    this.requestUpdate();
  }
}

customElements.define('todo-form', TodoForm);