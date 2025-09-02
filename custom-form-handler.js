// Utility functions
const utils = {
  // DOM utilities
  q: (selector, context = document) => context.querySelector(selector),
  qa: (selector, context = document) =>
    Array.from(context.querySelectorAll(selector)),

  // Event handling
  addEvent: (element, events, handler, options = {}) => {
    const eventList = Array.isArray(events) ? events : [events];
    eventList.forEach((event) =>
      element.addEventListener(event, handler, options)
    );
  },

  // Animation utilities
  animate: (element, properties, duration = 200) => {
    return new Promise((resolve) => {
      element.style.transition = `all ${duration}ms ease-out`;
      Object.assign(element.style, properties);
      setTimeout(resolve, duration);
    });
  },

  // Validation utilities
  isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  isValidPhone: (phone) =>
    /^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/[\s\-\(\)]/g, "")),

  // Math utilities
  roundTo: (value, step) => Math.round(value / step) * step,
  isEqual: (a, b) => Math.abs(a - b) < 1e-5,

  // CSS utilities
  addShakeAnimation: () => {
    if (!document.getElementById("shake-animation")) {
      const style = document.createElement("style");
      style.id = "shake-animation";
      style.textContent = `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `;
      document.head.appendChild(style);
    }
  },

  addProgressAnimations: () => {
    if (!document.getElementById("progress-animations")) {
      const style = document.createElement("style");
      style.id = "progress-animations";
      style.textContent = `
        [if-element="progress-step"] {
          transition: opacity 200ms ease-out;
        }
        
        [if-element="progress-step"].is-active {
          opacity: 1 !important;
          transform: scale(1.05);
          transition: all 200ms ease-out;
        }
        
        [if-element="progress-step"].is-completed {
          opacity: 1 !important;
          transition: opacity 200ms ease-out;
        }
        
        [if-element="progress-step"]:not(.is-active):not(.is-completed) {
          opacity: 0.3 !important;
          transition: opacity 200ms ease-out;
        }
        
        [if-element="progress-bar"] {
          transition: width 300ms ease-out;
        }
      `;
      document.head.appendChild(style);
    }
  },
};

// Main Form Handler Class
class OptimizedFormHandler {
  constructor(config = {}) {
    this.config = {
      portalId: config.portalId || "",
      formId: config.formId || "",
      region: config.region || "na1",
      multiStep: config.multiStep || true,
      showProgress: config.showProgress || true,
      autoAdvance: config.autoAdvance || false,
      validation: config.validation || "real-time",
      ...config,
    };

    // Form state management
    this.currentStep = 0;
    this.totalSteps = 1;
    this.formData = {};
    this.validationErrors = new Map();
    this.isSubmitting = false;
    this.stepHistory = [];
    this.variables = new Map();
    this.conditionalStyles = [];

    // Initialize
    this.init();
  }

  init() {
    this.setupForm();
    this.bindEvents();
    this.initializeSteps();
    this.setupConditionalLogic();
    this.updateProgress();

    // Add animation CSS
    utils.addShakeAnimation();
    utils.addProgressAnimations();
  }

  setupForm() {
    // Find form with multi-step attributes
    this.form = utils.q("form[if-id]") || utils.q("form[data-hubspot-form]");
    if (!this.form) return;

    // Set HubSpot attributes
    this.form.setAttribute("data-portal-id", this.config.portalId);
    this.form.setAttribute("data-form-id", this.config.formId);
    this.form.setAttribute("data-region", this.config.region);

    // Count steps
    const steps = utils.qa("[if-step]", this.form);
    this.totalSteps = steps.length;

    // Initialize step states
    this.initializeStepStates(steps);
  }

  initializeStepStates(steps) {
    steps.forEach((step, index) => {
      if (index === 0) {
        step.style.display = "block";
        step.classList.add("is-active");
        step.setAttribute("data-if-active", "true");
      } else {
        step.style.display = "none";
        step.classList.remove("is-active");
        step.removeAttribute("data-if-active");
      }
    });
  }

  bindEvents() {
    // Set up event handling
    this.bindFormEvents();
    this.bindStepNavigation();
    this.bindValidationEvents();
    this.bindAutoAdvance();
  }

  bindFormEvents() {
    // Form submission
    utils.addEvent(this.form, "submit", (e) => {
      e.preventDefault();
      this.handleFormSubmit(e.target);
    });

    // Input change events
    utils.addEvent(this.form, ["input", "change"], (e) => {
      this.handleInputChange(e.target);
    });
  }

  bindStepNavigation() {
    // Next step buttons
    utils.qa('[if-element="button-next"]', this.form).forEach((btn) => {
      utils.addEvent(btn, "click", (e) => {
        e.preventDefault();
        this.nextStep();
      });
    });

    // Previous step buttons
    utils.qa('[if-element="button-back"]', this.form).forEach((btn) => {
      utils.addEvent(btn, "click", (e) => {
        e.preventDefault();
        this.previousStep();
      });
    });

    // Reset buttons
    utils.qa('[if-element="button-reset"]', this.form).forEach((btn) => {
      utils.addEvent(btn, "click", (e) => {
        e.preventDefault();
        this.resetForm();
      });
    });
  }

  bindValidationEvents() {
    if (this.config.validation === "real-time") {
      utils.addEvent(
        this.form,
        "blur",
        (e) => {
          if (e.target.matches("input, select, textarea")) {
            this.validateField(e.target);
          }
        },
        true
      );
    }
  }

  bindAutoAdvance() {
    if (this.config.autoAdvance) {
      utils.addEvent(this.form, "change", (e) => {
        if (e.target.matches('input[type="radio"], input[type="checkbox"]')) {
          this.handleAutoAdvance(e.target);
        }
      });
    }
  }

  initializeSteps() {
    // Initialize multi-step form
    const steps = utils.qa("[if-step]", this.form);
    this.steps = steps;

    // Set up step transitions
    this.setupStepTransitions();

    // Initialize progress tracking (uses existing progress elements)
    if (this.config.showProgress) {
      this.initializeProgressSteps();
    }
  }

  setupStepTransitions() {
    // Set up step transition logic
    this.steps.forEach((step, index) => {
      // Set transition classes
      step.style.transition = "opacity 200ms ease-out";

      // Set initial state
      if (index === 0) {
        step.style.opacity = "1";
        step.style.display = "block";
      } else {
        step.style.opacity = "0";
        step.style.display = "none";
      }
    });
  }

  createProgressBar() {
    // Don't create a custom progress bar - use the existing one
    // The original form already has progress elements with [if-element='progress-step'] and [if-element='progress-bar']
    return;
  }

  initializeProgressSteps() {
    // Initialize existing progress steps with proper classes and fade effects
    const progressSteps = utils.qa(
      '[if-element="progress-step"]',
      document.body
    );
    if (progressSteps.length) {
      progressSteps.forEach((step, index) => {
        // Set transition for smooth animations
        step.style.transition = "opacity 200ms ease-out";

        if (index === 0) {
          // First step - active and visible
          step.classList.add("is-active");
          step.classList.remove("is-completed");
          step.style.opacity = "1";
        } else {
          // Other steps - inactive and faded
          step.classList.remove("is-active", "is-completed");
          step.style.opacity = "0.3";
        }
      });
    }

    // Initialize progress bar width with smooth transition
    const progressBar = utils.qa('[if-element="progress-bar"]', document.body);
    if (progressBar.length) {
      const initialProgress = 1 / this.totalSteps;
      progressBar.forEach((bar) => {
        bar.style.transition = "width 300ms ease-out";
        bar.style.setProperty("width", `${initialProgress * 100}%`);
      });
    }
  }

  updateProgress() {
    if (!this.config.showProgress) return;

    // Update progress steps with proper fade animations (like original InputFlow)
    const progressSteps = utils.qa(
      '[if-element="progress-step"]',
      document.body
    );
    if (progressSteps.length) {
      progressSteps.forEach((step, index) => {
        // Apply fade transition
        step.style.transition = "opacity 200ms ease-out";

        if (index <= this.currentStep) {
          // Completed steps - fade in with completed class
          step.classList.add("is-completed");
          step.classList.remove("is-active");
          step.style.opacity = "1";
        } else if (index === this.currentStep + 1) {
          // Current active step - highlight with active class
          step.classList.add("is-active");
          step.classList.remove("is-completed");
          step.style.opacity = "1";
        } else {
          // Future steps - fade out and remove classes
          step.classList.remove("is-active", "is-completed");
          step.style.opacity = "0.3";
        }
      });
    }

    // Update progress bar width with smooth animation
    const progressBar = utils.qa('[if-element="progress-bar"]', document.body);
    if (progressBar.length) {
      const progressPercentage = (this.currentStep + 1) / this.totalSteps;
      progressBar.forEach((bar) => {
        bar.style.transition = "width 300ms ease-out";
        bar.style.setProperty("width", `${progressPercentage * 100}%`);
      });
    }
  }

  async nextStep() {
    if (this.currentStep >= this.totalSteps - 1) return;

    // Validate current step
    if (this.validateCurrentStep()) {
      const currentStep = this.steps[this.currentStep];
      const nextStep = this.steps[this.currentStep + 1];

      // Animate step transition
      await this.transitionToStep(currentStep, nextStep, "next");

      this.currentStep++;
      this.updateProgress();
      this.updateStepStates();
      this.scrollToTop();

      // Dispatch step change event
      this.dispatchStepChangeEvent();
    } else {
      // Show validation error message
      this.showStepValidationError();

      // Shake the current step to indicate error
      this.shakeStep(this.steps[this.currentStep]);
    }
  }

  async previousStep() {
    if (this.currentStep <= 0) return;

    const currentStep = this.steps[this.currentStep];
    const prevStep = this.steps[this.currentStep - 1];

    // Animate step transition
    await this.transitionToStep(currentStep, prevStep, "prev");

    this.currentStep--;
    this.updateProgress();
    this.updateStepStates();
    this.scrollToTop();

    // Dispatch step change event
    this.dispatchStepChangeEvent();
  }

  async transitionToStep(fromStep, toStep, direction) {
    // Handle step transition animations
    const transitionDuration = 200;

    // Fade out current step
    fromStep.style.transition = `opacity ${transitionDuration}ms ease-out`;
    fromStep.style.opacity = "0";

    await new Promise((resolve) => setTimeout(resolve, transitionDuration));

    // Hide current step, show next step
    fromStep.style.display = "none";
    toStep.style.display = "block";

    // Fade in next step
    toStep.style.transition = `opacity ${transitionDuration}ms ease-in`;
    toStep.style.opacity = "1";

    await new Promise((resolve) => setTimeout(resolve, transitionDuration));

    // Update progress steps with animation after step change
    this.animateProgressSteps(direction);
  }

  updateStepStates() {
    // Update step state management
    this.steps.forEach((step, index) => {
      if (index === this.currentStep) {
        step.classList.add("is-active");
        step.setAttribute("data-if-active", "true");
      } else {
        step.classList.remove("is-active");
        step.removeAttribute("data-if-active");
      }
    });
  }

  validateCurrentStep() {
    const currentStepElement = this.steps[this.currentStep];
    if (!currentStepElement) return true;

    // Validate all fields that have validation (using original InputFlow attributes)
    const fields = utils.qa(
      "input[data-if-has-validation], select[data-if-has-validation], textarea[data-if-has-validation], input[required], select[required], textarea[required]",
      currentStepElement
    );

    // Also check for fields with specific validation rules
    const validationFields = utils.qa(
      "input[data-validation], select[data-validation], textarea[data-validation]",
      currentStepElement
    );

    const allFields = [...fields, ...validationFields];
    let isValid = true;

    allFields.forEach((field) => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });

    // If no validation fields found, check if step has any inputs that should be validated
    if (allFields.length === 0) {
      const allInputs = utils.qa("input, select, textarea", currentStepElement);
      if (allInputs.length > 0) {
        // Validate all inputs in the step
        allInputs.forEach((field) => {
          if (!this.validateField(field)) {
            isValid = false;
          }
        });
      }
    }

    return isValid;
  }

  validateField(field) {
    const value = field.value.trim();
    const isRequired =
      field.hasAttribute("required") ||
      field.hasAttribute("data-if-has-validation");
    const type = field.type;
    const tagName = field.tagName.toLowerCase();

    // Check if field should be validated based on InputFlow attributes
    const shouldValidate = this.shouldValidateField(field);
    if (!shouldValidate) {
      return true;
    }

    // Clear previous errors
    this.clearFieldError(field);

    // Required field validation
    if (isRequired && !value) {
      const fieldName =
        field.getAttribute("placeholder") ||
        field.getAttribute("name") ||
        "This field";
      this.showFieldError(field, `${fieldName} is required`);
      return false;
    }

    // Skip validation for empty non-required fields
    if (!isRequired && !value) {
      return true;
    }

    // Type-specific validation
    if (value) {
      switch (type) {
        case "email":
          if (!utils.isValidEmail(value)) {
            this.showFieldError(field, "Please enter a valid email address");
            return false;
          }
          break;

        case "tel":
        case "phone":
          if (!utils.isValidPhone(value)) {
            this.showFieldError(field, "Please enter a valid phone number");
            return false;
          }
          break;

        case "number":
          if (
            isNaN(value) ||
            value < (field.min || -Infinity) ||
            value > (field.max || Infinity)
          ) {
            this.showFieldError(field, "Please enter a valid number");
            return false;
          }
          break;

        case "url":
          try {
            new URL(value);
          } catch {
            this.showFieldError(field, "Please enter a valid URL");
            return false;
          }
          break;
      }

      // Textarea length validation
      if (tagName === "textarea") {
        const minLength = field.getAttribute("minlength");
        const maxLength = field.getAttribute("maxlength");

        if (minLength && value.length < parseInt(minLength)) {
          this.showFieldError(
            field,
            `Please enter at least ${minLength} characters`
          );
          return false;
        }

        if (maxLength && value.length > parseInt(maxLength)) {
          this.showFieldError(
            field,
            `Please enter no more than ${maxLength} characters`
          );
          return false;
        }
      }
    }

    // Custom validation attributes
    if (field.hasAttribute("data-pattern")) {
      const pattern = new RegExp(field.getAttribute("data-pattern"));
      if (!pattern.test(value)) {
        this.showFieldError(
          field,
          field.getAttribute("data-error-message") || "Invalid format"
        );
        return false;
      }
    }

    // Radio button group validation
    if (type === "radio" && isRequired) {
      const name = field.name;
      const radioGroup = utils.qa(`input[name="${name}"]`, this.form);
      const hasSelection = radioGroup.some((radio) => radio.checked);

      if (!hasSelection) {
        this.showFieldError(field, "Please select an option");
        return false;
      }
    }

    // Checkbox group validation
    if (type === "checkbox" && isRequired) {
      const name = field.name;
      const checkboxGroup = utils.qa(`input[name="${name}"]`, this.form);
      const hasSelection = checkboxGroup.some((checkbox) => checkbox.checked);

      if (!hasSelection) {
        this.showFieldError(field, "Please select at least one option");
        return false;
      }
    }

    return true;
  }

  showFieldError(field, message) {
    // Create error display element
    const errorElement = document.createElement("div");
    errorElement.className = "field-error";
    errorElement.setAttribute("if-element", "error");
    errorElement.textContent = message;

    // Apply error styling
    errorElement.style.cssText =
      "color: #e74c3c; font-size: 0.875rem; margin-top: 0.25rem;";

    field.parentNode.appendChild(errorElement);
    field.classList.add("error");

    this.validationErrors.set(field, errorElement);
  }

  clearFieldError(field) {
    const errorElement = this.validationErrors.get(field);
    if (errorElement) {
      errorElement.remove();
      this.validationErrors.delete(field);
    }
    field.classList.remove("error");
  }

  showStepValidationError() {
    // Show a general validation error for the step
    const currentStep = this.steps[this.currentStep];
    const existingError = currentStep.querySelector(".step-validation-error");

    if (!existingError) {
      const errorElement = document.createElement("div");
      errorElement.className = "step-validation-error";
      errorElement.setAttribute("if-element", "error");
      errorElement.textContent =
        "Please complete all required fields before proceeding";
      errorElement.style.cssText =
        "color: #e74c3c; font-size: 0.875rem; margin: 1rem 0; text-align: center; padding: 0.5rem; background: #fdf2f2; border: 1px solid #fecaca; border-radius: 0.375rem;";

      // Insert at the top of the step
      currentStep.insertBefore(errorElement, currentStep.firstChild);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (errorElement.parentNode) {
          errorElement.remove();
        }
      }, 5000);
    }
  }

  shakeStep(stepElement) {
    // Add shake animation to indicate validation error
    stepElement.style.animation = "shake 0.5s ease-in-out";

    // Remove animation after it completes
    setTimeout(() => {
      stepElement.style.animation = "";
    }, 500);
  }

  shouldValidateField(field) {
    // Check if field should be validated based on InputFlow attributes
    if (field.hasAttribute("data-if-has-validation")) {
      return true;
    }

    if (field.hasAttribute("required")) {
      return true;
    }

    // Check if field is in a step that requires validation
    const stepElement = field.closest("[if-step]");
    if (stepElement) {
      const stepId = stepElement.getAttribute("if-step");
      // If step has validation rules, validate all fields
      if (stepElement.hasAttribute("data-if-has-validation")) {
        return true;
      }
    }

    // Default: validate if field has any value or is required
    return field.value.trim() !== "" || field.hasAttribute("required");
  }

  animateProgressSteps(direction) {
    // Animate progress steps with fade effects (like original InputFlow)
    const progressSteps = utils.qa(
      '[if-element="progress-step"]',
      document.body
    );
    if (!progressSteps.length) return;

    const currentStepIndex = this.currentStep;

    progressSteps.forEach((step, index) => {
      // Set transition for smooth animations
      step.style.transition = "opacity 200ms ease-out";

      if (index <= currentStepIndex) {
        // Completed steps - fade in with completed class
        step.classList.add("is-completed");
        step.classList.remove("is-active");
        step.style.opacity = "1";
      } else if (index === currentStepIndex + 1) {
        // Current active step - highlight with active class
        step.classList.add("is-active");
        step.classList.remove("is-completed");
        step.style.opacity = "1";
      } else {
        // Future steps - fade out and remove classes
        step.classList.remove("is-active", "is-completed");
        step.style.opacity = "0.3";
      }
    });

    // Animate progress bar width smoothly
    const progressBar = utils.qa('[if-element="progress-bar"]', document.body);
    if (progressBar.length) {
      const progressPercentage = (currentStepIndex + 1) / this.totalSteps;
      progressBar.forEach((bar) => {
        bar.style.transition = "width 300ms ease-out";
        bar.style.setProperty("width", `${progressPercentage * 100}%`);
      });
    }
  }

  handleAutoAdvance(field) {
    if (!this.config.autoAdvance) return;

    // Handle radio button auto-advance
    if (field.type === "radio") {
      setTimeout(() => {
        this.nextStep();
      }, 300);
    }

    // Handle checkbox auto-advance
    if (field.type === "checkbox") {
      const currentStep = this.steps[this.currentStep];
      const requiredCheckboxes = utils.qa(
        'input[type="checkbox"][required]',
        currentStep
      );
      const checkedCheckboxes = utils.qa(
        'input[type="checkbox"]:checked',
        currentStep
      );

      if (
        requiredCheckboxes.length > 0 &&
        checkedCheckboxes.length >= requiredCheckboxes.length
      ) {
        setTimeout(() => {
          this.nextStep();
        }, 300);
      }
    }
  }

  handleInputChange(field) {
    // Update variables
    this.updateVariables(field);
    this.updateConditionalStyles();
  }

  updateVariables(field) {
    // Update variables
    const name = field.name || field.getAttribute("data-name");
    if (name) {
      this.variables.set(name, field.value);
    }
  }

  updateConditionalStyles() {
    // Update conditional styles
    this.conditionalStyles.forEach((style) => {
      if (this.evaluateCondition(style.condition)) {
        this.applyConditionalStyle(style);
      } else {
        this.removeConditionalStyle(style);
      }
    });
  }

  evaluateCondition(condition) {
    // Evaluate condition
    // This is a simplified version - you may need to expand based on your specific conditions
    return true; // Placeholder - implement based on your specific logic
  }

  applyConditionalStyle(style) {
    // Apply conditional style
    const elements = utils.qa(style.selector);
    elements.forEach((element) => {
      element.classList.add(style.className);
    });
  }

  removeConditionalStyle(style) {
    // Remove conditional style
    const elements = utils.qa(style.selector);
    elements.forEach((element) => {
      element.classList.remove(style.className);
    });
  }

  setupConditionalLogic() {
    // Initialize conditional logic
    this.conditionalStyles = [];
  }

  async handleFormSubmit(form) {
    if (this.isSubmitting) return;

    // Validate form submission
    if (this.config.multiStep) {
      for (let i = 0; i < this.totalSteps; i++) {
        this.currentStep = i;
        if (!this.validateCurrentStep()) {
          this.showStep(i);
          this.updateProgress();
          return;
        }
      }
      this.currentStep = this.totalSteps - 1;
    }

    this.isSubmitting = true;
    this.showLoadingState(form);

    try {
      // Collect form data
      const formData = this.collectFormData(form);

      // Submit to HubSpot
      // const result = await this.submitToHubSpot(formData);
      const result = { success: true, data: {} };

      if (result.success) {
        this.showSuccessMessage(form);
      } else {
        this.showErrorMessage(form, result.error || "Submission failed");
      }
    } catch (error) {
      console.error("Form submission error:", error);
      this.showErrorMessage(form, "An unexpected error occurred");
    } finally {
      this.isSubmitting = false;
      this.hideLoadingState(form);
    }
  }

  collectFormData(form) {
    // Collect form data
    const formData = new FormData(form);
    const data = {};

    for (const [key, value] of formData.entries()) {
      if (data[key]) {
        if (Array.isArray(data[key])) {
          data[key].push(value);
        } else {
          data[key] = [data[key], value];
        }
      } else {
        data[key] = value;
      }
    }

    // Add step information
    if (this.config.multiStep) {
      data._stepData = {
        currentStep: this.currentStep + 1,
        totalSteps: this.totalSteps,
        stepHistory: this.stepHistory,
      };
    }

    return data;
  }

  async submitToHubSpot(data) {
    // Submit to HubSpot
    const url = `https://api.hsforms.com/submissions/v3/integration/submit/${this.config.portalId}/${this.config.formId}`;

    const payload = {
      fields: this.formatHubSpotFields(data),
      context: {
        pageUri: window.location.href,
        pageName: document.title,
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  formatHubSpotFields(data) {
    const fields = [];

    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith("_")) continue;

      if (Array.isArray(value)) {
        value.forEach((val) => {
          fields.push({ name: key, value: val });
        });
      } else {
        fields.push({ name: key, value: value });
      }
    }

    return fields;
  }

  showLoadingState(form) {
    // Show loading state
    const submitButton = utils.q(
      'input[type="submit"], button[type="submit"]',
      form
    );
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute(
        "data-original-text",
        submitButton.value || submitButton.textContent
      );
      submitButton.value = submitButton.textContent = "Submitting...";
    }
  }

  hideLoadingState(form) {
    const submitButton = utils.q(
      'input[type="submit"], button[type="submit"]',
      form
    );
    if (submitButton) {
      submitButton.disabled = false;
      const originalText = submitButton.getAttribute("data-original-text");
      if (originalText) {
        submitButton.value = submitButton.textContent = originalText;
      }
    }
  }

  showSuccessMessage(form) {
    // Show success message
    const successElement =
      utils.q(".w-form-done", form) || this.createMessageElement("success");
    successElement.style.display = "block";

    form.style.display = "none";
    successElement.scrollIntoView({ behavior: "smooth" });
  }

  showErrorMessage(form, message) {
    // Show error message
    const errorElement =
      utils.q(".w-form-fail", form) || this.createMessageElement("error");
    errorElement.style.display = "block";
    errorElement.textContent = message;

    form.style.display = "block";
    errorElement.scrollIntoView({ behavior: "smooth" });
  }

  createMessageElement(type) {
    const element = document.createElement("div");
    element.className = type === "success" ? "w-form-done" : "w-form-fail";
    element.style.cssText = `
      padding: 1rem;
      margin: 1rem 0;
      border-radius: 4px;
      ${
        type === "success"
          ? "background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;"
          : "background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;"
      }
    `;

    return element;
  }

  scrollToTop() {
    // Scroll to top
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  resetForm() {
    // Reset form
    this.form.reset();
    this.currentStep = 0;
    this.showStep(0);
    this.updateProgress();
    this.clearAllErrors();
    this.variables.clear();
  }

  clearAllErrors() {
    this.validationErrors.forEach((errorElement) => {
      errorElement.remove();
    });
    this.validationErrors.clear();

    utils.qa(".error", this.form).forEach((field) => {
      field.classList.remove("error");
    });
  }

  showStep(stepIndex) {
    // Show step
    this.currentStep = stepIndex;
    this.updateStepStates();
    this.updateProgress();
  }

  dispatchStepChangeEvent() {
    // Dispatch step change event
    const event = new CustomEvent("form-step-changed", {
      bubbles: true,
      cancelable: true, // eslint-disable-line
      detail: {
        oldStep: { id: this.currentStep - 1, formId: this.config.formId },
        newStep: { id: this.currentStep, formId: this.config.formId },
      },
    });

    this.form.dispatchEvent(event);
  }

  // Public methods for external control
  goToStep(stepIndex) {
    if (stepIndex >= 0 && stepIndex < this.totalSteps) {
      this.currentStep = stepIndex;
      this.showStep(stepIndex);
    }
  }

  // Static methods
  static create(config) {
    return new OptimizedFormHandler(config);
  }

  static getInstance() {
    return window.optimizedFormHandler;
  }
}

// Auto-initialize
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.optimizedFormHandler = OptimizedFormHandler.create();
  });
} else {
  window.optimizedFormHandler = OptimizedFormHandler.create();
}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = OptimizedFormHandler;
}

// Global initialization function
window.initOptimizedForm = (config) => {
  return OptimizedFormHandler.create(config);
};

// Preserve global function names for compatibility
window.initHubSpotForm = window.initOptimizedForm;
window.HubSpotFormHandler = OptimizedFormHandler;
