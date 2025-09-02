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
    this.steps = utils.qa("[if-step]", this.form);
    this.totalSteps = this.steps.length;

    // Initialize step states
    this.initializeStepStates(this.steps);
  }

  initializeStepStates(steps) {
    steps.forEach((step, index) => {
      // Hide all steps initially, only show first step when user starts
      step.style.display = "none";
      step.classList.remove("is-active");
      step.removeAttribute("data-if-active");
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

    // Start quiz button - activate first progress node
    // Try multiple selector strategies for the start button
    const startButtonSelectors = [
      '[if-element="button-start"]',
      ".start-quiz-btn",
      "button[data-start-quiz]",
      'button:has-text("Start the quiz")',
      "button",
    ];

    // Find the start button by checking text content
    const allButtons = utils.qa("button", this.form);
    const startButton = allButtons.find(
      (btn) =>
        btn.textContent.trim().toLowerCase().includes("start the quiz") ||
        btn.textContent.trim().toLowerCase().includes("start quiz") ||
        btn.textContent.trim().toLowerCase().includes("start")
    );

    if (startButton) {
      utils.addEvent(startButton, "click", (e) => {
        this.activateFirstProgressNode();
      });
    }
  }

  activateFirstProgressNode() {
    console.log("activateFirstProgressNode called");

    // Find the first progress step and activate it completely
    const firstProgressStep = utils.qa(
      '[if-element="progress-step"]',
      document.body
    )[0];
    if (firstProgressStep) {
      console.log("Found first progress step, removing existing classes");

      // Remove any existing active classes from all progress steps
      utils
        .qa('[if-element="progress-step"]', document.body)
        .forEach((step) => {
          step.classList.remove("is-active", "is-completed");
        });

      // Add is-active to the first progress step (parent div)
      console.log("Adding is-active to first progress step");
      firstProgressStep.classList.add("is-active");

      // Find and activate all child elements
      const progressGraphic = firstProgressStep.querySelector(
        ".quiz_progress-graphic"
      );
      const progressPoint = firstProgressStep.querySelector(
        ".quiz_progress-point"
      );
      const progressLine = firstProgressStep.querySelector(
        ".quiz_progress-line"
      );
      const progressLineFill = firstProgressStep.querySelector(
        ".quiz_progress-line-fill"
      );
      const progressName = firstProgressStep.querySelector(
        ".quiz_progress-name"
      );

      // Add is-active to all child elements
      if (progressGraphic) progressGraphic.classList.add("is-active");
      if (progressPoint) progressPoint.classList.add("is-active");
      if (progressLine) progressLine.classList.add("is-active");
      if (progressLineFill) progressLineFill.classList.add("is-active");
      if (progressName) progressName.classList.add("is-active");
    }

    // Also show the first step when user starts the quiz
    if (this.steps && this.steps[0]) {
      this.steps[0].style.display = "block";
      this.steps[0].classList.add("is-active");
      this.steps[0].setAttribute("data-if-active", "true");
    }

    // Ensure currentStep is set to 0 when starting the quiz
    this.currentStep = 0;
    console.log("Set currentStep to 0");
  }

  updateProgressClasses() {
    // Update progress classes based on current step
    const progressSteps = utils.qa(
      '[if-element="progress-step"]',
      document.body
    );

    // Debug: log current step
    console.log(
      "updateProgressClasses called with currentStep:",
      this.currentStep
    );

    progressSteps.forEach((step, index) => {
      console.log(
        `Processing step ${index}: currentStep=${this.currentStep}, index=${index}`
      );

      if (index < this.currentStep) {
        // Completed steps - add is-completed to outer div and all children
        console.log(`Step ${index}: Setting as completed`);
        step.classList.remove("is-active");
        step.classList.add("is-completed");

        const progressGraphic = step.querySelector(".quiz_progress-graphic");
        const progressPoint = step.querySelector(".quiz_progress-point");
        const progressLine = step.querySelector(".quiz_progress-line");
        const progressLineFill = step.querySelector(".quiz_progress-line-fill");
        const progressName = step.querySelector(".quiz_progress-name");

        if (progressGraphic) {
          progressGraphic.classList.remove("is-active");
          progressGraphic.classList.add("is-completed");
        }
        if (progressPoint) {
          progressPoint.classList.remove("is-active");
          progressPoint.classList.add("is-completed");
        }
        if (progressLine) {
          progressLine.classList.remove("is-active");
          progressLine.classList.add("is-completed");
        }
        if (progressLineFill) {
          progressLineFill.classList.remove("is-active");
          progressLineFill.classList.add("is-completed");
        }
        if (progressName) {
          progressName.classList.remove("is-active");
          progressName.classList.add("is-completed");
        }
      } else if (index === this.currentStep) {
        // Current active step - add is-active to outer div and all children
        console.log(`Step ${index}: Setting as active`);
        step.classList.remove("is-completed");
        step.classList.add("is-active");

        const progressGraphic = step.querySelector(".quiz_progress-graphic");
        const progressPoint = step.querySelector(".quiz_progress-point");
        const progressLine = step.querySelector(".quiz_progress-line");
        const progressLineFill = step.querySelector(".quiz_progress-line-fill");
        const progressName = step.querySelector(".quiz_progress-name");

        if (progressGraphic) {
          progressGraphic.classList.remove("is-completed");
          progressGraphic.classList.add("is-active");
        }
        if (progressPoint) {
          progressPoint.classList.remove("is-completed");
          progressPoint.classList.add("is-active");
        }
        if (progressLine) {
          progressLine.classList.remove("is-completed");
          progressLine.classList.add("is-active");
        }
        if (progressLineFill) {
          progressLineFill.classList.remove("is-completed");
          progressLineFill.classList.add("is-active");
        }
        if (progressName) {
          progressName.classList.remove("is-completed");
          progressName.classList.add("is-active");
        }
      } else {
        // Future steps - remove all classes
        console.log(`Step ${index}: Removing all classes (future step)`);
        step.classList.remove("is-active", "is-completed");

        const progressGraphic = step.querySelector(".quiz_progress-graphic");
        const progressPoint = step.querySelector(".quiz_progress-point");
        const progressLine = step.querySelector(".quiz_progress-line");
        const progressLineFill = step.querySelector(".quiz_progress-line-fill");
        const progressName = step.querySelector(".quiz_progress-name");

        if (progressGraphic)
          progressGraphic.classList.remove("is-active", "is-completed");
        if (progressPoint)
          progressPoint.classList.remove("is-active", "is-completed");
        if (progressLine)
          progressLine.classList.remove("is-active", "is-completed");
        if (progressLineFill)
          progressLineFill.classList.remove("is-active", "is-completed");
        if (progressName)
          progressName.classList.remove("is-active", "is-completed");
      }
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
      // Set initial state
      if (index === 0) {
        step.style.display = "block";
      } else {
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
    // Just initialize the step structure - let CSS handle the styling
    const progressSteps = utils.qa(
      '[if-element="progress-step"]',
      document.body
    );
    if (progressSteps.length) {
      // Remove any existing active classes - start fresh
      progressSteps.forEach((step) => {
        step.classList.remove("is-active", "is-completed");
      });
    }

    // Also remove all completed classes from progress elements on load
    this.removeAllCompletedClasses();

    // Start the fade-away animation immediately on page load
    this.startInitialFadeAway();

    // Force a complete reset of all progress elements
    this.forceResetAllProgress();

    // Add a small delay to ensure DOM is fully ready, then reset again
    setTimeout(() => {
      this.forceResetAllProgress();
    }, 100);
  }

  forceResetAllProgress() {
    // Force reset all progress-related elements to ensure clean state
    const progressSelectors = [
      '[if-element="progress-step"]',
      ".quiz_progress-step",
      ".quiz_progress-graphic",
      ".quiz_progress-point",
      ".quiz_progress-line",
      ".quiz_progress-line-fill",
      ".quiz_progress-name",
      '[if-element="progress-bar"]',
    ];

    progressSelectors.forEach((selector) => {
      const elements = utils.qa(selector, document.body);
      elements.forEach((element) => {
        element.classList.remove("is-active", "is-completed");
      });
    });

    // Also use a more aggressive approach - remove from ALL elements with these classes
    const allActiveElements = document.querySelectorAll(
      ".is-active, .is-completed"
    );
    allActiveElements.forEach((element) => {
      element.classList.remove("is-active", "is-completed");
    });
  }

  removeAllCompletedClasses() {
    // Aggressive approach: remove is-active and is-completed from every element on the page
    const allElements = document.querySelectorAll("*");
    allElements.forEach((element) => {
      element.classList.remove("is-active", "is-completed");
    });
  }

  updateProgress() {
    if (!this.config.showProgress) return;

    // Update progress steps using classes only - let CSS handle animations
    const progressSteps = utils.qa(
      '[if-element="progress-step"]',
      document.body
    );
    if (progressSteps.length) {
      progressSteps.forEach((step, index) => {
        if (index <= this.currentStep) {
          // Completed steps - fade in with completed class
          step.classList.add("is-completed");
          step.classList.remove("is-active");
        } else if (index === this.currentStep + 1) {
          // Current active step - highlight with active class
          step.classList.add("is-active");
          step.classList.remove("is-completed");
        } else {
          // Future steps - fade out and remove classes
          step.classList.remove("is-active", "is-completed");
        }
      });
    }

    // Progress bar width is handled by CSS based on classes
    // No inline styles needed
  }

  updateProgressLineFill() {
    // Update progress line fill with quiz_progress-line-fill class
    const progressLineFill = utils.qa(
      ".quiz_progress-line-fill",
      document.body
    );
    if (progressLineFill.length) {
      const progressPercentage = (this.currentStep + 1) / this.totalSteps;
      progressLineFill.forEach((fill) => {
        // Only manage classes, no inline styles
        if (progressPercentage > 0) {
          fill.classList.add("is-completed");
        } else {
          fill.classList.remove("is-completed");
        }
      });
    }
  }

  animateProgressFadeAway() {
    // Animate existing progress to fade away slowly and reset to default
    // Only manage classes, no inline styles - let CSS handle animations
    const progressElements = [
      ...utils.qa('[if-element="progress-bar"]', document.body),
      ...utils.qa(".quiz_progress-line-fill", document.body),
    ];

    progressElements.forEach((element) => {
      // Only manage classes, CSS will handle the visual transitions
      const currentProgress = (this.currentStep + 1) / this.totalSteps;

      if (currentProgress > 0) {
        element.classList.add("is-completed");
      } else {
        element.classList.remove("is-completed");
      }
    });
  }

  startInitialFadeAway() {
    // Aggressive approach: remove is-completed from every element on the page
    const allElements = document.querySelectorAll("*");
    allElements.forEach((element) => {
      element.classList.remove("is-completed");
    });
  }

  resetProgressToDefault() {
    // Reset any additional progress elements to default state
    const allProgressElements = utils.qa(
      '[class*="progress"], [class*="step"], [if-element*="progress"]',
      document.body
    );

    allProgressElements.forEach((element) => {
      // Skip elements we've already handled
      if (
        element.hasAttribute("if-element") &&
        element.getAttribute("if-element").includes("progress-step")
      ) {
        return;
      }

      // Reset any progress-related elements to default using classes only
      if (
        element.classList.contains("active") ||
        element.classList.contains("completed") ||
        element.classList.contains("is-active") ||
        element.classList.contains("is-completed")
      ) {
        // Remove classes instead of adding inline styles
        element.classList.remove(
          "active",
          "completed",
          "is-active",
          "is-completed"
        );
      }
    });
  }

  async nextStep() {
    if (!this.steps || this.currentStep >= this.totalSteps - 1) return;

    // Validate current step
    if (this.validateCurrentStep()) {
      const currentStep = this.steps[this.currentStep];
      const nextStep = this.steps[this.currentStep + 1];

      // Animate step transition
      await this.transitionToStep(currentStep, nextStep, "next");

      this.currentStep++;
      this.updateProgress();
      this.updateStepStates();
      this.updateProgressClasses();
      this.scrollToTop();

      // Dispatch step change event
      this.dispatchStepChangeEvent();
    } else {
      // Show validation error message
      this.showStepValidationError();

      // Shake the current step to indicate error
      if (this.steps && this.steps[this.currentStep]) {
        this.shakeStep(this.steps[this.currentStep]);
      }
    }
  }

  async previousStep() {
    if (!this.steps || this.currentStep <= 0) return;

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

    // Animate progress fade away effect
    this.animateProgressFadeAway();
  }

  updateStepStates() {
    // Update step state management
    if (!this.steps) return;

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
    if (!this.steps || !this.steps[this.currentStep]) return true;
    const currentStepElement = this.steps[this.currentStep];

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
      // Only manage classes, let CSS handle animations
      if (index <= currentStepIndex) {
        // Completed steps - fade in with completed class
        step.classList.add("is-completed");
        step.classList.remove("is-active");
      } else if (index === currentStepIndex + 1) {
        // Current active step - highlight with active class
        step.classList.add("is-active");
        step.classList.remove("is-completed");
      } else {
        // Future steps - fade out and remove classes
        step.classList.remove("is-active", "is-completed");
      }
    });

    // Progress bar width is handled by CSS based on classes
    // No inline styles needed
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
