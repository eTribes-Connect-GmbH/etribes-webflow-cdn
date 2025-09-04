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

//<div class="hs-form-frame" data-region="na1" data-form-id="234a7024-bf51-4934-9d74-f331fc420788" data-portal-id="4659131"></div>

// Main Form Handler Class
class OptimizedFormHandler {
  constructor(config = {}) {
    this.config = {
      portalId: "4659131",
      formId: "234a7024-bf51-4934-9d74-f331fc420788",
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
    this.isStartingQuiz = false; // Flag to track if we're in start process

    // Initialize
    this.init();
  }

  init() {
    this.setupForm();
    this.bindEvents();
    this.initializeSteps();
    this.setupConditionalLogic();

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
    console.log("setupForm: Found steps with [if-step] attribute:", this.steps);
    console.log("setupForm: Steps length:", this.steps.length);

    this.totalSteps = this.steps.length;

    // Create step mapping: logical index -> HTML step index
    // currentStep 0 = first quiz question (HTML index 1)
    // currentStep 1 = second quiz question (HTML index 2)
    // etc.
    this.stepMapping = {};
    for (let i = 0; i < this.totalSteps - 1; i++) {
      this.stepMapping[i] = i + 1; // Skip landing page (index 0)
    }
    console.log("setupForm: Step mapping created:", this.stepMapping);

    // Create reverse mapping for progress bar: HTML index -> logical index
    this.progressMapping = {};
    for (let i = 0; i < this.totalSteps - 1; i++) {
      this.progressMapping[i] = i; // HTML index 0 = logical step 0, HTML index 1 = logical step 1, etc.
    }
    console.log("setupForm: Progress mapping created:", this.progressMapping);

    // Initialize step states
    this.initializeStepStates(this.steps);
  }

  initializeStepStates(steps) {
    console.log("initializeStepStates called with steps:", steps);
    console.log("Steps length:", steps.length);

    steps.forEach((step, index) => {
      console.log(`Step ${index}:`, step);
      console.log(`Step ${index} display before:`, step.style.display);

      if (index === 0) {
        // First step (landing page) - show by default
        step.style.display = "block";
        step.classList.add("is-active");
        step.setAttribute("data-if-active", "true");
        console.log(`Step ${index} (landing page): shown by default`);
      } else {
        // All other steps - hide initially
        step.style.display = "none";
        step.classList.remove("is-active");
        step.removeAttribute("data-if-active");
        console.log(`Step ${index}: hidden initially`);
      }

      console.log(`Step ${index} display after:`, step.style.display);
    });
  }

  bindEvents() {
    // Set up event handling
    this.bindFormEvents();
    this.bindStepNavigation();
    this.bindValidationEvents();
    this.bindQuizOptionEvents();
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
    // Next step buttons - target specific quiz_next class
    utils.qa(".quiz_next", this.form).forEach((btn) => {
      console.log(
        "Binding next step to quiz_next button:",
        btn.textContent.trim()
      );
      utils.addEvent(btn, "click", (e) => {
        console.log("Quiz next button clicked");
        e.preventDefault();
        this.nextStep();
      });
    });

    // Previous step buttons - target specific quiz_back class
    utils.qa(".quiz_back", this.form).forEach((btn) => {
      console.log(
        "Binding previous step to quiz_back button:",
        btn.textContent.trim()
      );
      utils.addEvent(btn, "click", (e) => {
        console.log("Quiz back button clicked");
        e.preventDefault();
        this.previousStep();
      });
    });

    // Reset buttons - keep existing attribute-based approach or add specific class if needed
    utils.qa('[if-element="button-reset"]', this.form).forEach((btn) => {
      console.log(
        "Binding reset functionality to button:",
        btn.textContent.trim()
      );
      utils.addEvent(btn, "click", (e) => {
        console.log("Reset button clicked");
        e.preventDefault();
        this.resetForm();
      });
    });

    // Start quiz button - target specific start_the_quiz class
    const startButtons = utils.qa(".start_the_quiz", this.form);
    console.log("Start buttons found:", startButtons.length);

    startButtons.forEach((btn, index) => {
      console.log(`Start button ${index}: "${btn.textContent.trim()}"`);
    });

    if (startButtons.length > 0) {
      startButtons.forEach((btn) => {
        console.log(
          "Binding start functionality to start_the_quiz button:",
          btn.textContent.trim()
        );
        utils.addEvent(btn, "click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log(
            "Start the quiz button clicked, calling activateFirstProgressNode"
          );
          this.activateFirstProgressNode();
        });
      });
    } else {
      console.log("No start_the_quiz buttons found");
    }
  }

  activateFirstProgressNode() {
    console.log("=== activateFirstProgressNode START ===");
    console.log("Current state before activation:");
    console.log("- currentStep:", this.currentStep);
    console.log("- isStartingQuiz:", this.isStartingQuiz);
    console.log("- totalSteps:", this.totalSteps);

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

    // Show the second step when user starts the quiz (first step is already visible on landing page)
    console.log("Checking steps array:", this.steps);
    console.log("Steps length:", this.steps ? this.steps.length : "undefined");

    if (this.steps && this.steps[1]) {
      console.log("Second step found, making it visible");
      console.log("Second step element:", this.steps[1]);
      console.log("Second step display before:", this.steps[1].style.display);

      // Hide the first step (landing page step)
      if (this.steps[0]) {
        this.steps[0].style.display = "none";
        this.steps[0].classList.remove("is-active");
        this.steps[0].removeAttribute("data-if-active");
        console.log("First step hidden");
      }

      // Show the second step (first actual quiz step)
      this.steps[1].style.display = "block";
      this.steps[1].classList.add("is-active");
      this.steps[1].setAttribute("data-if-active", "true");

      // Force the step to be visible and check computed styles
      this.steps[1].style.visibility = "visible";
      this.steps[1].style.opacity = "1";

      console.log("Second step display after:", this.steps[1].style.display);
      console.log("Second step classes after:", this.steps[1].className);
      console.log(
        "Second step computed display:",
        window.getComputedStyle(this.steps[1]).display
      );
      console.log(
        "Second step computed visibility:",
        window.getComputedStyle(this.steps[1]).visibility
      );
      console.log(
        "Second step computed opacity:",
        window.getComputedStyle(this.steps[1]).opacity
      );
    } else {
      console.log("No second step found or steps[1] is undefined");
    }

    // Set currentStep to 0 (first quiz step) and reset flag to allow progression
    this.currentStep = 0;
    this.isStartingQuiz = false; // Reset flag to allow next step progression
    console.log("=== activateFirstProgressNode END ===");
    console.log("Final state after activation:");
    console.log("- currentStep:", this.currentStep);
    console.log("- isStartingQuiz:", this.isStartingQuiz);
    console.log("- totalSteps:", this.totalSteps);
    console.log("Ready for progression!");
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

  bindQuizOptionEvents() {
    // Bind events for quiz options to handle is-active class switching
    const quizOptions = utils.qa(".quiz_option", this.form);

    quizOptions.forEach((option) => {
      // Bind to both the label and the input for better coverage
      utils.addEvent(option, "click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleQuizOptionClick(option);
      });

      // Also bind to the input's change event as a backup
      const input = option.querySelector(
        'input[type="radio"], input[type="checkbox"]'
      );
      if (input) {
        utils.addEvent(input, "change", (e) => {
          this.handleQuizOptionClick(option);
        });
      }
    });
  }

  handleQuizOptionClick(clickedOption) {
    console.log("=== handleQuizOptionClick called ===");
    console.log("Clicked option:", clickedOption);

    // Find the radio/checkbox input within the clicked option
    const input = clickedOption.querySelector(
      'input[type="radio"], input[type="checkbox"]'
    );
    if (!input) {
      console.log("No input found in clicked option");
      return;
    }

    const questionName = input.name;
    const isRadio = input.type === "radio";

    console.log("Input found:", input);
    console.log("Question name:", questionName);
    console.log("Is radio:", isRadio);

    if (isRadio) {
      // For radio buttons: remove is-active from all options in the same group, then add to clicked option
      console.log("Processing radio button selection");

      const allOptionsInGroup = utils.qa(
        `.quiz_option input[name="${questionName}"]`,
        this.form
      );

      console.log("Found options in group:", allOptionsInGroup.length);

      allOptionsInGroup.forEach((optionInput, index) => {
        const optionLabel = optionInput.closest(".quiz_option");
        if (optionLabel) {
          console.log(`Removing is-active from option ${index}:`, optionLabel);
          optionLabel.classList.remove("is-active");

          // Also remove classes from the radio input icon
          const radioIcon = optionLabel.querySelector(".w-form-formradioinput");
          if (radioIcon) {
            radioIcon.classList.remove("is-active", "w--redirected-checked");
            console.log(`Removed classes from radio icon ${index}:`, radioIcon);
          }

          // Also remove classes from the option label span
          const optionLabelSpan =
            optionLabel.querySelector(".quiz_option-label");
          if (optionLabelSpan) {
            optionLabelSpan.classList.remove("is-active");
            console.log(
              `Removed is-active from option label span ${index}:`,
              optionLabelSpan
            );
          }
        }
      });

      // Add is-active to the clicked option
      console.log("Adding is-active to clicked option:", clickedOption);
      clickedOption.classList.add("is-active");

      // Also add classes to the radio input icon
      const radioIcon = clickedOption.querySelector(".w-form-formradioinput");
      if (radioIcon) {
        radioIcon.classList.add("is-active", "w--redirected-checked");
        console.log("Added classes to radio icon:", radioIcon);
      }

      // Also add classes to the option label span
      const optionLabelSpan = clickedOption.querySelector(".quiz_option-label");
      if (optionLabelSpan) {
        optionLabelSpan.classList.add("is-active");
        console.log("Added is-active to option label span:", optionLabelSpan);
      }

      // Also check the input to make sure it's selected
      input.checked = true;

      // Clear any validation errors for this question since user has made a selection
      this.clearQuestionValidationErrors(questionName);
    } else {
      // For checkboxes: toggle is-active class
      console.log("Processing checkbox selection");
      clickedOption.classList.toggle("is-active");

      // Also toggle classes on the checkbox icon
      const checkboxIcon = clickedOption.querySelector(
        ".w-form-formradioinput"
      );
      if (checkboxIcon) {
        checkboxIcon.classList.toggle("is-active");
        checkboxIcon.classList.toggle("w--redirected-checked");
        console.log("Toggled classes on checkbox icon:", checkboxIcon);
      }

      // Also toggle classes on the option label span
      const optionLabelSpan = clickedOption.querySelector(".quiz_option-label");
      if (optionLabelSpan) {
        optionLabelSpan.classList.toggle("is-active");
        console.log("Toggled is-active on option label span:", optionLabelSpan);
      }

      console.log(
        "Checkbox is-active state:",
        clickedOption.classList.contains("is-active")
      );

      // Clear any validation errors for this question since user has made a selection
      this.clearQuestionValidationErrors(questionName);
    }

    console.log(
      `Quiz option clicked: ${input.value}, is-active class ${
        clickedOption.classList.contains("is-active") ? "added" : "removed"
      }`
    );
    console.log(
      "Final state - clicked option classes:",
      clickedOption.className
    );
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

  updateProgress(direction = "next") {
    if (!this.config.showProgress) return;

    console.log("=== updateProgress called ===");
    console.log("currentStep:", this.currentStep);
    console.log("stepMapping:", this.stepMapping);
    console.log("Direction passed to updateProgress:", direction);

    // Only update the specific steps that need to change, not the entire progress bar
    this.updateProgressTargeted(direction);
  }

  updateProgressTargeted(direction = "next") {
    // Simple logic: if is-active and you proceed to next step,
    // now previous step is is-completed and next step is is-active
    // When user clicks back, just reverse it
    console.log("=== updateProgressTargeted called ===");
    console.log("Direction:", direction);
    console.log("Current step:", this.currentStep);

    if (direction === "next") {
      // Mark previous step as completed, current step as active
      const previousStepIndex = this.currentStep - 1;
      const currentStepIndex = this.currentStep;

      // Previous step becomes completed (only if it exists)
      if (previousStepIndex >= 0) {
        const previousProgressStep =
          this.findProgressStepByLogicalIndex(previousStepIndex);
        if (previousProgressStep) {
          console.log(
            `Marking previous step ${previousStepIndex} as completed`
          );
          console.log(
            "Previous step element before:",
            previousProgressStep.outerHTML
          );
          this.updateProgressStepClasses(previousProgressStep, "completed");
          console.log(
            "Previous step element after:",
            previousProgressStep.outerHTML
          );
        }
      } else {
        console.log(
          `No previous step to mark as completed (currentStep: ${this.currentStep})`
        );
      }

      // Current step becomes active
      const currentProgressStep =
        this.findProgressStepByLogicalIndex(currentStepIndex);
      if (currentProgressStep) {
        console.log(`Marking current step ${currentStepIndex} as active`);
        console.log(
          "Current step element before:",
          currentProgressStep.outerHTML
        );
        this.updateProgressStepClasses(currentProgressStep, "active");
        console.log(
          "Current step element after:",
          currentProgressStep.outerHTML
        );
      } else {
        console.log(
          `ERROR: Could not find progress step for logical index ${currentStepIndex}`
        );
      }
    } else if (direction === "back") {
      // When going back: the NEW current step should be active, OLD current step should be inactive
      const newCurrentStepIndex = this.currentStep; // This is the step we're going TO
      const oldCurrentStepIndex = this.currentStep + 1; // This is the step we're coming FROM

      // Old current step (the one we're leaving) becomes inactive
      const oldCurrentProgressStep =
        this.findProgressStepByLogicalIndex(oldCurrentStepIndex);
      if (oldCurrentProgressStep) {
        console.log(
          `Marking old current step ${oldCurrentStepIndex} as inactive (removing all classes)`
        );
        console.log(
          "Old current step element before:",
          oldCurrentProgressStep.outerHTML
        );
        this.updateProgressStepClasses(oldCurrentProgressStep, "future");
        console.log(
          "Old current step element after:",
          oldCurrentProgressStep.outerHTML
        );
      }

      // New current step (the one we're going to) becomes active
      const newCurrentProgressStep =
        this.findProgressStepByLogicalIndex(newCurrentStepIndex);
      if (newCurrentProgressStep) {
        console.log(
          `Marking new current step ${newCurrentStepIndex} as active`
        );
        console.log(
          "New current step element before:",
          newCurrentProgressStep.outerHTML
        );
        this.updateProgressStepClasses(newCurrentProgressStep, "active");
        console.log(
          "New current step element after:",
          newCurrentProgressStep.outerHTML
        );
      }
    }
  }

  findProgressStepByLogicalIndex(logicalIndex) {
    // Helper method to find a progress step by its logical index
    const progressSteps = utils.qa(
      '[if-element="progress-step"]',
      document.body
    );

    for (let i = 0; i < progressSteps.length; i++) {
      const step = progressSteps[i];
      const stepLogicalIndex = this.progressMapping[i];

      if (stepLogicalIndex === logicalIndex) {
        return step;
      }
    }

    return null;
  }

  updateProgressStepClasses(step, state) {
    // Helper method to update classes for a progress step and all its children
    const progressGraphic = step.querySelector(".quiz_progress-graphic");
    const progressPoint = step.querySelector(".quiz_progress-point");
    const progressLine = step.querySelector(".quiz_progress-line");
    const progressLineFill = step.querySelector(".quiz_progress-line-fill");
    const progressName = step.querySelector(".quiz_progress-name");

    switch (state) {
      case "completed":
        // Mark parent step as completed
        step.classList.add("is-completed");
        step.classList.remove("is-active");

        // Mark ALL child elements as completed
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
        break;

      case "active":
        // Mark parent step as active
        step.classList.add("is-active");
        step.classList.remove("is-completed");

        // Mark ALL child elements as active (except progress lines which extend to future)
        if (progressGraphic) {
          progressGraphic.classList.remove("is-completed");
          progressGraphic.classList.add("is-active");
        }
        if (progressPoint) {
          progressPoint.classList.remove("is-completed");
          progressPoint.classList.add("is-active");
        }
        // Progress lines should have NO classes when step is active (they extend to future)
        if (progressLine) {
          progressLine.classList.remove("is-active", "is-completed");
        }
        if (progressLineFill) {
          progressLineFill.classList.remove("is-active", "is-completed");
        }
        if (progressName) {
          progressName.classList.remove("is-completed");
          progressName.classList.add("is-active");
        }
        break;

      case "future":
        step.classList.remove("is-active", "is-completed");

        if (progressGraphic) {
          progressGraphic.classList.remove("is-active", "is-completed");
        }
        if (progressPoint) {
          progressPoint.classList.remove("is-active", "is-completed");
        }
        if (progressLine) {
          progressLine.classList.remove("is-active", "is-completed");
        }
        if (progressLineFill) {
          progressLineFill.classList.remove("is-active", "is-completed");
        }
        if (progressName) {
          progressName.classList.remove("is-active", "is-completed");
        }
        break;
    }
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
    console.log("nextStep called with currentStep:", this.currentStep);
    console.log("totalSteps:", this.totalSteps);
    console.log("isStartingQuiz:", this.isStartingQuiz);

    // Prevent nextStep from running when we're starting the quiz
    if (this.isStartingQuiz) {
      console.log("nextStep blocked - quiz is starting");
      return;
    }

    if (!this.steps || this.currentStep >= this.totalSteps - 1) {
      console.log("nextStep blocked - no steps or at last step");
      console.log("steps:", this.steps);
      console.log("currentStep:", this.currentStep);
      console.log("totalSteps:", this.totalSteps);
      return;
    }

    // Validate current step
    console.log("Validating current step...");
    const validationResult = this.validateCurrentStep();
    console.log("Validation result:", validationResult);

    if (validationResult) {
      // Get the actual HTML step indices from the mapping
      const currentHtmlIndex = this.stepMapping[this.currentStep];
      const nextHtmlIndex = this.stepMapping[this.currentStep + 1];
      const currentStep = this.steps[currentHtmlIndex];
      const nextStep = this.steps[nextHtmlIndex];
      console.log("Current step element:", currentStep);
      console.log("Next step element:", nextStep);
      console.log("Current HTML index:", currentHtmlIndex);
      console.log("Next HTML index:", nextHtmlIndex);

      // Animate step transition
      await this.transitionToStep(currentStep, nextStep, "next");

      this.currentStep++;
      this.isStartingQuiz = false; // Reset flag - user is now moving between steps
      console.log("nextStep: currentStep incremented to:", this.currentStep);

      console.log("Calling updateStepStates after step increment...");
      this.updateStepStates();

      console.log("Calling updateProgress after step increment...");
      this.updateProgress("next");

      this.scrollToTop();

      // Dispatch step change event
      this.dispatchStepChangeEvent();
    } else {
      // Show validation error message
      this.showStepValidationError();

      // Shake the current step to indicate error
      if (this.steps && this.stepMapping[this.currentStep] !== undefined) {
        const currentHtmlIndex = this.stepMapping[this.currentStep];
        this.shakeStep(this.steps[currentHtmlIndex]);
      }
    }
  }

  async previousStep() {
    console.log("=== previousStep called ===");
    console.log("currentStep before:", this.currentStep);
    console.log("stepMapping:", this.stepMapping);

    if (!this.steps || this.currentStep <= 0) {
      console.log("previousStep blocked - no steps or at first step");
      return;
    }

    // Get the actual HTML step indices from the mapping
    const currentHtmlIndex = this.stepMapping[this.currentStep];
    const prevHtmlIndex = this.stepMapping[this.currentStep - 1];
    const currentStep = this.steps[currentHtmlIndex];
    const prevStep = this.steps[prevHtmlIndex];

    console.log("Current logical step:", this.currentStep);
    console.log("Previous logical step:", this.currentStep - 1);
    console.log("Current HTML index:", currentHtmlIndex);
    console.log("Previous HTML index:", prevHtmlIndex);

    console.log("currentHtmlIndex:", currentHtmlIndex);
    console.log("prevHtmlIndex:", prevHtmlIndex);
    console.log("currentStep element:", currentStep);
    console.log("prevStep element:", prevStep);

    // Animate step transition
    await this.transitionToStep(currentStep, prevStep, "prev");

    this.currentStep--;
    console.log("currentStep after decrement:", this.currentStep);

    console.log("Calling updateProgress...");
    this.updateProgress("back");

    console.log("Calling updateStepStates...");
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
    if (!this.steps) return;

    this.steps.forEach((step, index) => {
      // Get the logical step index from the mapping
      const logicalStepIndex = Object.keys(this.stepMapping).find(
        (key) => this.stepMapping[key] === index
      );

      if (
        logicalStepIndex !== undefined &&
        parseInt(logicalStepIndex) === this.currentStep
      ) {
        step.classList.add("is-active");
        step.setAttribute("data-if-active", "true");
      } else {
        step.classList.remove("is-active");
        step.removeAttribute("data-if-active");
      }
    });
  }

  validateCurrentStep() {
    console.log("=== validateCurrentStep called ===");
    console.log("- this.steps:", this.steps);
    console.log("- this.currentStep:", this.currentStep);
    console.log("- this.stepMapping:", this.stepMapping);

    // Get the actual HTML step index from the mapping
    const htmlStepIndex = this.stepMapping[this.currentStep];
    console.log("- htmlStepIndex:", htmlStepIndex);
    console.log(
      "- this.steps[htmlStepIndex]:",
      this.steps ? this.steps[htmlStepIndex] : "undefined"
    );

    if (!this.steps || !this.steps[htmlStepIndex]) {
      console.log(
        "Validation returning true due to missing steps or htmlStepIndex"
      );
      return true;
    }
    const currentStepElement = this.steps[htmlStepIndex];
    console.log("- currentStepElement:", currentStepElement);

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
    console.log("- Fields found for validation:", allFields.length);
    console.log("- Fields:", allFields);

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

    // Apply error styling with absolute positioning to prevent layout shifts
    errorElement.style.cssText =
      "color: #e74c3c; font-size: 0.875rem; margin-top: 0.25rem; position: absolute; top: 100%; left: 0; width: 100%; z-index: 10;";

    // For quiz options, show error after the quiz_option-cols container
    if (field.closest(".quiz_option-cols")) {
      const quizOptionContainer = field.closest(".quiz_option-cols");
      // Ensure the container has relative positioning for absolute error positioning
      quizOptionContainer.style.position = "relative";
      quizOptionContainer.appendChild(errorElement);
    } else {
      // For regular fields, show error after the field itself
      field.parentNode.appendChild(errorElement);
    }

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

  clearQuestionValidationErrors(questionName) {
    // Clear validation errors for a specific question (useful for quiz options)
    console.log(`Clearing validation errors for question: ${questionName}`);

    // Find all fields with this question name
    const fieldsWithQuestionName = utils.qa(
      `input[name="${questionName}"]`,
      this.form
    );

    fieldsWithQuestionName.forEach((field) => {
      // Clear the field error class
      field.classList.remove("error");

      // Remove any validation error elements
      const errorElement = this.validationErrors.get(field);
      if (errorElement) {
        errorElement.remove();
        this.validationErrors.delete(field);
      }
    });

    // Also remove any error elements that might be in the quiz_option-cols container
    const quizOptionContainer =
      fieldsWithQuestionName[0]?.closest(".quiz_option-cols");
    if (quizOptionContainer) {
      const errorElements =
        quizOptionContainer.querySelectorAll(".field-error");
      errorElements.forEach((errorElement) => {
        errorElement.remove();
      });
    }
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
      const result = await this.submitToHubSpot(formData);
      //const result = { success: true, data: {} };

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
    // Use the correct HubSpot API endpoint that supports JSON
    const url = `https://api.hsforms.com/submissions/v3/integration/submit/${this.config.portalId}/${this.config.formId}`;

    console.log("Submitting to HubSpot:", url);
    console.log("Form data:", data);

    // Prepare data in HubSpot's expected format
    const payload = {
      fields: [
        { name: "test_question_1", value: data.test_question_1 },
        { name: "test_question_2", value: data.test_question_2 },
        { name: "test_question_3", value: data.test_question_3 },
        { name: "test_question_4", value: data.test_question_4 },
        { name: "firstname", value: data.firstname },
        { name: "lastname", value: data.lastname },
        { name: "email", value: data.Email },
        { name: "phone", value: data.phone || "" },
        { name: "company", value: data.company },
      ],
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

      if (response.ok) {
        console.log("Successfully submitted to HubSpot!");
        return { success: true, message: "Form submitted successfully!" };
      } else {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${response.statusText} - ${errorText}`
        );
      }
    } catch (error) {
      console.error("Error submitting to HubSpot:", error);
      return { success: false, error: error.message };
    }
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
  }

  showErrorMessage(form, message) {
    // Show error message
    const errorElement =
      utils.q(".w-form-fail", form) || this.createMessageElement("error");
    errorElement.style.display = "block";
    errorElement.textContent = message;
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
    console.log("=== resetForm called ===");
    console.log("Resetting currentStep from", this.currentStep, "to 0");

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
    console.log("=== showStep called ===");
    console.log("Setting currentStep from", this.currentStep, "to", stepIndex);

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
