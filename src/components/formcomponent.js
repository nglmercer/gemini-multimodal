class CustomModal extends HTMLElement {
    constructor() {
        super();
        this.isOpen = false;
        this.currentMode = 'dark'; // Default to dark mode
        this.onOpenCallback = null;
        this.onCloseCallback = null;
        
        // Create shadow DOM
        this.attachShadow({ mode: 'open' });
        
        // Create base modal structure
        const htmlelement = /*html*/`
            <style>
              ${this.getStyles()}
            </style>
            <div class="modal-overlay">
                <div class="modal-content">
                    <button class="close-button">&times;</button>
                    <div class="modal-body">
                        <slot></slot>
                    </div>
                </div>
            </div>
        `;

        // Add modal structure to shadow DOM
        this.shadowRoot.innerHTML = htmlelement;
        
        // Get references within shadow DOM
        this.overlay = this.shadowRoot.querySelector('.modal-overlay');
        this.closeButton = this.shadowRoot.querySelector('.close-button');
        this.modalBody = this.shadowRoot.querySelector('.modal-body');
        
        this.setupEventListeners();
        
        // Set default to dark mode
        this.setMode('dark');
    }
    getStyles(){
      return /*css*/`
                :host {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 1000;
                    opacity: 0;
                    transition: opacity 0.5s ease;
                }
                :host([visible]) {
                    opacity: 1;
                }
                .modal-content {
                    padding: 1rem;
                    border-radius: 8px;
                    position: relative;
                    min-width: 360px;
                    min-height: 360px;
                    max-height: 95dvh;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    opacity: 0;
                    transition: all 0.3s ease;
                    transform: scale(0.9);
                }
                :host([visible]) .modal-content {
                    transform: scale(1);
                    opacity: 1;
                }
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    transition: background-color 0.3s ease;
                }
                
                /* Dark Mode Styles */
                :host(.dark-mode) .modal-overlay {
                    background: rgba(0, 0, 0, 0.5);
                }
                :host(.dark-mode) .modal-content {
                    background: #1c1c1c;
                    color: #f4f4f4;
                }
                
                /* Light Mode Styles */
                :host(.light-mode) .modal-overlay {
                    background: rgba(0, 0, 0, 0.3);
                }
                :host(.light-mode) .modal-content {
                    background: #ffffff;
                    color: #333;
                    border: 1px solid #e0e0e0;
                }
                
                .close-button {
                    position: absolute;
                    top: 1px;
                    right: 1px;
                    border: none;
                    cursor: pointer;
                    width: 36px;
                    height: 36px;
                    border-radius: 10%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                }
                
                /* Dark Mode Button */
                :host(.dark-mode) .close-button {
                    background-color: #dc3545;
                    color: white;
                }
                :host(.dark-mode) .close-button:hover {
                    background-color: #c82333;
                }
                
                /* Light Mode Button */
                :host(.light-mode) .close-button {
                    background-color: #f0f0f0;
                    color: #333;
                }
                :host(.light-mode) .close-button:hover {
                    background-color: #e0e0e0;
                }
                
                .modal-body {
                    margin-top: 20px;
                }
                
                ::slotted(*) {
                    max-width: 100%;
                }
      `;
    }
    connectedCallback() {
        // No additional setup needed in connectedCallback
    }

    setupEventListeners() {
        this.closeButton.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });
    }

    // New method to set mode
    setMode(mode = 'dark') {
        // Validate mode
        if (!['dark', 'light'].includes(mode)) {
            console.warn('Invalid mode. Using default dark mode.');
            mode = 'dark';
        }

        // Remove existing mode classes
        this.classList.remove('dark-mode', 'light-mode');
        
        // Add new mode class
        this.classList.add(`${mode}-mode`);
        this.currentMode = mode;
    }

    // Toggle between dark and light modes
    toggleMode() {
        const newMode = this.currentMode === 'dark' ? 'light' : 'dark';
        this.setMode(newMode);
    }

    open(onOpenCallback = null) {
        this.onOpenCallback = onOpenCallback;
        this.style.display = 'block';
        // Force reflow
        this.offsetHeight;
        this.setAttribute('visible', '');
        this.isOpen = true;
        
        if (this.onOpenCallback) {
            this.onOpenCallback();
        }
    }

    close(onCloseCallback = null) {
        this.onCloseCallback = onCloseCallback;
        this.removeAttribute('visible');
        this.isOpen = false;
        
        // Wait for transition to complete
        setTimeout(() => {
            this.style.display = 'none';
            this.isOpen = false;
            if (this.onCloseCallback) {
                this.onCloseCallback();
            }
        }, 300); // Same as transition time
    }

    appendChild(element) {
        // Ensure element is added to light DOM
        super.appendChild(element);
    }

    setContent(content) {
        // Clear current content
        while (this.firstChild) {
            this.removeChild(this.firstChild);
        }

        // Add new content
        if (typeof content === 'string') {
            const div = document.createElement('div');
            div.innerHTML = content;
            this.appendChild(div);
        } else if (content instanceof Node) {
            this.appendChild(content);
        }
    }

    getContentContainer() {
        return this;
    }
}

customElements.define('custom-modal', CustomModal);
if (!customElements.get('custom-input')) {
    class CustomInput extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: 'open', delegatesFocus: true });
        this.handleInputChange = this.handleInputChange.bind(this);
      }
  
      static get observedAttributes() {
        return ['type', 'id', 'name', 'value', 'placeholder', 'disabled', 'readonly', 'darkmode', 'options', 'required', 'title', 'pattern'];
      }
  
      getStyles() {
        const darkMode = this.hasAttribute('darkmode');
  
        return `
          :host {
            display: block;
            margin: inherit;
            color-scheme: light dark;
            margin: 0.5rem;
            padding: 0.5rem;
          }
          
          .input-container {
            display: flex;
            flex-direction: column;
            padding: inherit;
          }
          
          input, textarea, select {
            padding: inherit;
            padding: 0.5rem;  /* Valor de respaldo si no se hereda */
            border: inherit;
            border-color: ${darkMode ? '#555' : '#ccc'};
            border-radius: 4px;
            font-size: 14px;
            background-color: inherit;
            color: inherit;
          }
          textarea {
            resize: vertical;
            min-height: 100px;
          }
          input:disabled, textarea:disabled, select:disabled {
            background-color: ${darkMode ? '#222' : '#f5f5f5'};
            cursor: not-allowed;
            color: ${darkMode ? '#666' : '#888'};
          }
          
          .switch {
            position: relative;
            display: inline-block;
            width: 60px;
            height: 30px;
          }
          
          .switch input {
            opacity: 0;
            width: 0;
            height: 0;
          }
          
          .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: ${darkMode ? '#555' : '#ccc'};
            transition: .4s;
            border-radius: 34px;
          }
          
          .slider:before {
            position: absolute;
            content: "";
            height: 22px;
            width: 22px;
            left: 4px;
            bottom: 4px;
            background-color: ${darkMode ? '#888' : 'white'};
            transition: .4s;
            border-radius: 50%;
          }
          
          input:checked + .slider {
            background-color: #2196F3;
          }
          
          input:checked + .slider:before {
            transform: translateX(28px);
          }
          
          input:focus, textarea:focus, select:focus {
            outline: none;
            border-color: #2196F3;
            box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
          }
        `;
      }
  
      connectedCallback() {
        this.render();
        const input = this.shadowRoot.querySelector('input, textarea, select');
        if (input) {
          input.addEventListener('input', this.handleInputChange);
          input.addEventListener('change', this.handleInputChange);
        }
        // Corregimos el manejo del evento submit
        const form = this.shadowRoot.querySelectorAll('form');
      }
    
      disconnectedCallback() {
        const input = this.shadowRoot.querySelector('input, textarea, select');
        if (input) {
          input.removeEventListener('input', this.handleInputChange);
          input.removeEventListener('change', this.handleInputChange);
        }
        // Limpiamos el evento submit
        const form = this.shadowRoot.querySelector('.validate-form');
      }
  
      handleInputChange(event) {
        const value = this.getInputValues();
        this.dispatchEvent(new CustomEvent('input-change', {
          detail: {
            id: this.getAttribute('id'),
            name: this.getAttribute('name'),
            value: value
          },
          bubbles: true,
          composed: true
        }));
      }
  
      attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
          this.render();
        }
      }
      handleSubmit(e) {
        e.preventDefault(); // Prevenimos la recarga de la página
        
        // Validamos el formulario
        const form = e.target;
        const isValid = form.checkValidity();
        
        if (isValid) {
          // Disparamos un evento personalizado con los datos del formulario
          this.dispatchEvent(new CustomEvent('form-submit', {
            detail: {
              id: this.getAttribute('id'),
              name: this.getAttribute('name'),
              value: this.getInputValues()
            },
            bubbles: true,
            composed: true
          }));
        }
      }
      render() {
        const type = this.getAttribute('type') || 'text';
        const id = this.getAttribute('id');
        const name = this.getAttribute('name');
        const value = this.getAttribute('value') || '';
        const placeholder = this.getAttribute('placeholder') || '';
        const disabled = this.hasAttribute('disabled');
        const readonly = this.hasAttribute('readonly');
        const options = this.getAttribute('options') || '[]';
        const required = this.hasAttribute('required') ? 'required' : '';
        const title = this.getAttribute('title') || '';
        const pattern = this.getAttribute('pattern') || '';
        const allarguments = { type, id, name, value, placeholder, disabled, readonly, options, required, title, pattern };
        this.shadowRoot.innerHTML = `
          <style>${this.getStyles()}</style>
          <form class="validate-form">
            <div class="input-container">
              ${this.renderInput(allarguments)}
            </div>
          </form>
        `;
  
        // Reattach event listeners after rendering
        const input = this.shadowRoot.querySelector('input, textarea, select');
        if (input) {
          input.addEventListener('input', this.handleInputChange);
          input.addEventListener('change', this.handleInputChange);
        }
      }
  
      renderInput(allarguments) {
        const { type, id, name, value, placeholder, disabled, readonly, options, required, title, pattern } = allarguments;
        const requiredAttr = required ? 'required' : ''; // This will output just 'required' when needed
        
        switch (type) {
          case 'textarea':
            return `
              <textarea
                id="${id}"
                name="${name}"
                placeholder="${placeholder}"
                ${disabled ? 'disabled' : ''}
                ${readonly ? 'readonly' : ''}
                ${requiredAttr}
                  ${title ? `title="${title}" oninvalid="this.setCustomValidity('${title}')" oninput="this.setCustomValidity('')"` : ''}
                  ${pattern ? `pattern="${pattern}"` : ''}
              >${value}</textarea>
            `;
          
          case 'checkbox':
          case 'switch':
          case 'boolean':
            return `
              <label class="switch">
                <input
                  type="checkbox"
                  id="${id}"
                  name="${name}"
                  ${value === 'true' ? 'checked' : ''}
                  ${disabled ? 'disabled' : ''}
                  ${readonly ? 'readonly' : ''}
                  ${requiredAttr}
                  ${title ? `title="${title}" oninvalid="this.setCustomValidity('${title}')" oninput="this.setCustomValidity('')"` : ''}
                  ${pattern ? `pattern="${pattern}"` : ''}
                >
                <span class="slider"></span>
              </label>
            `;
          
          case 'select':
            const optionsArray = JSON.parse(options);
            return `
              <select
                id="${id}"
                name="${name}"
                ${disabled ? 'disabled' : ''}
                ${readonly ? 'readonly' : ''}
                ${required ? 'required' : ''}
                  ${title ? `title="${title}" oninvalid="this.setCustomValidity('${title}')" oninput="this.setCustomValidity('')"` : ''}
                  ${pattern ? `pattern="${pattern}"` : ''}
              >
                ${optionsArray.map(option => `
                  <option value="${option.value}" ${option.value === value ? 'selected' : ''}>
                    ${option.image ? `<img src="${option.image}" alt="${option.label}" style="vertical-align: middle; margin-right: 5px;">` : ''}
                    ${option.label}
                  </option>
                `).join('')}
              </select>
            `;
          
          case 'radio':
            const radioOptions = JSON.parse(options);
            return radioOptions.map(option => `
              <label>
                <input
                  type="radio"
                  id="${id}"
                  name="${name}"
                  value="${option.value}"
                  ${option.value === value ? 'checked' : ''}
                  ${disabled ? 'disabled' : ''}
                  ${readonly ? 'readonly' : ''}
                >
                ${option.label}
              </label>
            `).join('');
          
            default:
              return `
                <input
                  type="${type === 'string' ? 'text' : type}"
                  id="${id}"
                  name="${name}"
                  value="${value}"
                  placeholder="${placeholder}"
                  ${disabled ? 'disabled' : ''}
                  ${readonly ? 'readonly' : ''}
                  ${requiredAttr}
                  ${title ? `title="${title}" oninvalid="this.setCustomValidity('${title}')" oninput="this.setCustomValidity('')"` : ''}
                  ${pattern ? `pattern="${pattern}"` : ''}
                >
              `;
          
        }
      }
  
      getInputValues() {
        const input = this.shadowRoot.querySelector('input, textarea, select');
        if (!input) return null;
      
        if (input.type === 'checkbox') {
          return input.checked;
        }
        
        if (input.tagName.toLowerCase() === 'textarea') {
          const value = input.value.trim();
          return value ? value.split('\n') : [];
        }
      
        if (input.tagName.toLowerCase() === 'select') {
          return input.value;
        }
      
        if (input.type === 'radio') {
          const selectedRadio = this.shadowRoot.querySelector(`input[name="${input.name}"]:checked`);
          return selectedRadio ? selectedRadio.value : null;
        }
      
        const inputvalue = this.parseValueByType(input);
        const validate_form = this.shadowRoot.querySelectorAll('form');
        if (validate_form) {
          validate_form.forEach(form => {
            const form_validity = form.reportValidity();
            if (!form_validity) {
              form.classList.add('invalid');
            } else {
              form.classList.remove('invalid');
            }
        //console.log("form_validity", form_validity);
          });
        }

        return inputvalue;
      }
      getvalidation(){
        let isValid = false;
        const validate_form = this.shadowRoot.querySelectorAll('form');
        if (validate_form) {
          validate_form.forEach(form => {
            const form_validity = form.reportValidity();
            if (!form_validity) {
              isValid = false;
            } else {
              isValid = true;
            }
         // console.log("form_validity", form_validity);
          });
        }
        return isValid;
      }
      parseValueByType(input) {
        const valueType = typeof input.value;
        const inputType = input.type;
        const value = input.value;
        switch (inputType) {
          case 'number':
            const num = Number(value);
            return isNaN(num) ? 0 : num * 1;
          case 'text':
          case 'string':
            return value;
          default:
            return value;
        }
      }
  
      setInputValues(value) {
        const input = this.shadowRoot.querySelector('input, textarea, select');
        if (!input) return;
      
        if (input.type === 'checkbox') {
          input.checked = Boolean(value);
        } else if (Array.isArray(value) && input.tagName.toLowerCase() === 'textarea') {
          input.value = value.join('\n');
        } else if (input.tagName.toLowerCase() === 'select') {
          input.value = value;
        } else if (input.type === 'radio') {
          const radioToSelect = this.shadowRoot.querySelector(`input[name="${input.name}"][value="${value}"]`);
          if (radioToSelect) {
            radioToSelect.checked = true;
          }
        } else {
          input.value = value;
        }
      
        // Dispatch event when setting values programmatically
        this.handleInputChange();
      }
  
      resetInputValues() {
        const input = this.shadowRoot.querySelector('input, textarea, select');
        if (!input) return;
  
        if (input.type === 'checkbox') {
          input.checked = false;
        } else {
          input.value = '';
        }
  
        // Dispatch event when resetting values
        this.handleInputChange();
      }
  
      setOptions(options) {
        if (this.getAttribute('type') === 'select') {
          this.setAttribute('options', JSON.stringify(options));
          this.render();
        }
      }
  
      getSelectedOption() {
        if (this.getAttribute('type') === 'select') {
          const select = this.shadowRoot.querySelector('select');
          return select ? select.value : null;
        }
        return null;
      }
    }
  
    customElements.define('custom-input', CustomInput);
  }
  class EnhancedSelect extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open', delegatesFocus: true });
      this.selectedValues = [];
      this.options = [];
      this.multiple = false;
    }
  
    static get observedAttributes() {
      return ['multiple', "grid"];
    }
  
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'multiple') {
        this.multiple = newValue !== null;
        // Reset selections when switching modes
        this.selectedValues = [];
        this.render();
        this.updateSelections();
      }
    }
  
    connectedCallback() {
      this.multiple = this.hasAttribute('multiple');
      this.render();
      this.addEventListeners();
    }
  
    render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: inherit;
            grid-template-columns: inherit;
            grid-template-rows: inherit;
            font-family: Arial, sans-serif;
            border: 0px;
          }
          .select-container {
            border-radius: 4px;
            max-width: ${this.hasAttribute('grid') ? '100%' : '300px'};
            max-height: 480px;
            overflow-y: auto;
            padding: 8px;
          }
          .preview-container {
            border: 0px;
            margin-bottom: 12px;
            padding: 8px;
            border-bottom: 1px solid #eee;
            min-height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-wrap: wrap;
            gap: 8px;
          }
          .preview-container img {
            max-width: 100%;
            max-height: 150px;
            object-fit: contain;
          }
          .options-list {
            display: ${this.hasAttribute('grid') ? 'grid' : 'flex'};
            flex-direction: column;
            grid-template-columns: repeat(auto-fit, minmax(100px, auto));
            gap: ${this.hasAttribute('grid') ? '8px' : '4px'};
          }
          .option {
            padding: 8px 12px;
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.2s ease;
            border: 2px solid transparent;
            display: flex;
            align-items: center;
            gap: 8px;
            background-color: #222c3a;
            border: 3px solid #2e3e53;
          }
          .option:hover {
            background-color: inherit;
            color: inherit;
          }
          .option.selected {
            background-color: inherit;
            color: #32d583;;
            border-color: #32d583;;
            font-weight: 500;
          }
          .option img {
            width: 24px;
            height: 24px;
            object-fit: cover;
            border-radius: 2px;
          }
        </style>
        <div class="select-container">
          <div class="preview-container" style="display: none;"></div>
          <div class="options-list"></div>
        </div>
      `;
    }
  
    addEventListeners() {
      const optionsList = this.shadowRoot.querySelector('.options-list');
      optionsList.addEventListener('click', (e) => {
        const optionElement = e.target.closest('.option');
        if (optionElement) {
          //console.log("optionElement", optionElement);
          if (this.multiple) {
            this.toggleOption(optionElement);
          } else {
            this.selectOption(optionElement);
          }
        }
      });
    }
  
    updatePreview(selectedOptions) {
      const previewContainer = this.shadowRoot.querySelector('.preview-container');
      previewContainer.innerHTML = '';
  
      if (!Array.isArray(selectedOptions)) {
        selectedOptions = selectedOptions ? [selectedOptions] : [];
      }
  
      if (selectedOptions.length > 0) {
        previewContainer.style.display = 'flex';
        selectedOptions.forEach(option => {
          if (option.img || option.image) {
            const img = document.createElement('img');
            img.src = option.img || option.image;
            img.alt = option.label;
            previewContainer.appendChild(img);
          } else if (option.html) {
            const div = document.createElement('div');
            div.innerHTML = option.html;
            previewContainer.appendChild(div);
          } else {
            previewContainer.style.display = 'none';
          }
        });
      } else {
        previewContainer.style.display = 'none';
      }
    }
  
    toggleOption(optionElement) {
      const value = optionElement.dataset.value;
      const index = this.selectedValues.indexOf(value);
      
      if (index === -1) {
        this.selectedValues.push(value);
      } else {
        this.selectedValues.splice(index, 1);
      }
      
      this.updateSelections();
      
      const selectedOptions = this.options.filter(opt => this.selectedValues.includes(opt.value));
      this.updatePreview(selectedOptions);
  
      this.dispatchEvent(new CustomEvent('change', {
        detail: selectedOptions
      }));
    }
  
    selectOption(optionElement) {
      const value = optionElement.dataset.value;
      const selectedOption = this.options.find(opt => opt.value === value);
      console.log("selectedOption", selectedOption, value);
      if (!selectedOption) return;
      
      this.selectedValues = [value];
      this.updateSelections();
      this.updatePreview(selectedOption);
  
      this.dispatchEvent(new CustomEvent('change', {
        detail: selectedOption
      }));
    }
    setSelectedValues(values) {
      this.selectedValues = values;
      this.updateSelections();
    }
    updateSelections() {
      const options = this.shadowRoot.querySelectorAll('.option');
      options.forEach(option => {
        option.classList.toggle('selected', this.selectedValues.includes(option.dataset.value));
      });
    }
  
    setOptions(options) {
      console.log("options EnhancedSelect", options);
      this.options = options;
      const optionsList = this.shadowRoot.querySelector('.options-list');
      
      optionsList.innerHTML = options.map(option => {
        let optionContent = '';
        let optionState = '';
        if (option.img || option.image) {
          optionContent += `<img src="${option.img || option.image}" alt="${option.label}">`;
        }
        if (option.state) {
          optionState = `<span class="state">${option.state}</span>`;
        }
        optionContent += `<span>${option.label}</span>`;
  
        return `
          <div class="option ${this.selectedValues.includes(option.value) ? 'selected' : ''}" 
               data-value="${option.value}">
            ${optionContent}
            ${optionState}
          </div>
        `;
      }).join('');
  
      if (this.selectedValues.length > 0) {
        if (this.multiple) {
          const selectedOptions = options.filter(opt => this.selectedValues.includes(opt.value));
          this.updatePreview(selectedOptions);
        } else {
          const selectedOption = options.find(opt => opt.value === this.selectedValues[0]);
          if (selectedOption) {
            this.updatePreview(selectedOption);
          }
        }
      }
    }
  
    getValue() {
      return this.multiple ? this.selectedValues : this.selectedValues[0] || null;
    }
  
    getSelectedOptions() {
      const selected = this.options.filter(opt => this.selectedValues.includes(opt.value));
      return this.multiple ? selected : selected[0] || null;
    }
  }
  
  customElements.define('enhanced-select', EnhancedSelect);