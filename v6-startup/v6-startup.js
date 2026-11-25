/* =========================================
   V6 STARTUP
   Health Dial + Garage + Stable Automation
   ========================================= */

Hooks.once("ready", async () => {

  console.log("V6 STARTUP — SORK");
/* =========================================
   V6 APPLICATION ROOTS
   Main Foundry + detached browser windows
   ========================================= */

function v6GetApplicationRoots() {

  return [
    ...foundry.applications.api.ApplicationV2.instances()
  ]
    .map(app => app.element)
    .filter(root =>
      root &&
      typeof root.querySelector === "function"
    );
}
	/* =========================================
   V6 KILL NATIVE CSB ACTOR CHROME
   ========================================= */

function v6KillCsbActorChrome(root) {

  if (
    !root ||
    typeof root.querySelectorAll !== "function"
  ) return;

  const selectors = [
	".custom-system-actor-content .sheet-header .profile-img-container",
    ".custom-system-actor-content .sheet-header h1.charname",
    ".custom-system-template-select",
    ".custom-system-sheet-actions"
  ];

  for (const selector of selectors) {

    root
      .querySelectorAll(selector)
      .forEach(element => {

        element.style.setProperty(
          "display",
          "none",
          "important"
        );

      });
  }
}
	/* =========================================
   V6 CHILD SHEET — REAL DETACH BUTTON
   ========================================= */

function v6InstallDetachButton(app) {

  const root =
    app?.element;

  if (
    !root ||
    typeof root.querySelector !== "function"
  ) return;

  const header =
    root.querySelector(
      ".window-header"
    );

  if (!header) return;

  if (
    header.querySelector(
      ".v6-real-detach"
    )
  ) return;

  const doc =
    root.ownerDocument;

  const button =
    doc.createElement("button");

  button.type = "button";

  button.classList.add(
    "v6-real-detach"
  );

  button.title =
    "Pop Out Sheet";

  button.innerHTML =
    '<i class="fa-solid fa-up-right-from-square"></i>';

  button.style.flex =
    "0 0 auto";

  button.onpointerdown = event => {

    event.preventDefault();
    event.stopPropagation();

    /*
     * It is no longer deliberately being
     * hosted as another sheet's child.
     */
    app._v6RenderAsChild = false;

    void app
      .detachWindow()
      .catch(error => {

        console.warn(
          "V6 CHILD DETACH FAILED:",
          error
        );

      });
  };

  const closeButton =
    header.querySelector(
      '[data-action="close"]'
    );

  if (closeButton) {
    closeButton.before(button);
  } else {
    header.appendChild(button);
  }
}
	/* =========================================
   V6 CUSTOM TEMPLATE CONTROLS
   Bottom-of-sheet CSB template proxy
   ========================================= */

function v6InstallTemplateControls(app) {

  const root =
    app?.element;

  const actor =
    app?.actor ??
    app?.document;

  if (
    !root ||
    !actor ||
    actor.documentName !== "Actor" ||
    typeof root.querySelector !== "function"
  ) return;

  if (
    root.querySelector(".v6-template-controls")
  ) return;

  const editControl =
    root.querySelector(
      '[data-key="WeaponEdit"]'
    );

  if (!editControl) return;

  const editCheckbox =
    editControl.querySelector(
      'input[name="system.props.WeaponEdit"]'
    );

  if (!editCheckbox) return;

  /*
   * CSB's real hidden controls.
   * We leave them in the DOM and use them
   * as the actual template engine.
   */

  const nativeTemplateArea =
    root.querySelector(
      ".custom-system-template-select"
    );

  const nativeTemplateSelect =
    nativeTemplateArea?.querySelector(
      "select"
    );

  const nativeActions =
    root.querySelector(
      ".custom-system-sheet-actions"
    );

  if (
    !nativeTemplateSelect ||
    !nativeActions
  ) {
    console.warn(
      "V6 TEMPLATE CONTROLS: Native CSB controls not found.",
      actor.name
    );

    return;
  }

  const nativeUpdateControl =
    nativeActions.querySelector(
      'button, a'
    );

  if (!nativeUpdateControl) {

    console.warn(
      "V6 TEMPLATE CONTROLS: CSB update control not found.",
      actor.name
    );

    return;
  }


  const doc =
    root.ownerDocument;

  const controls =
    doc.createElement("div");

  controls.classList.add(
    "v6-template-controls"
  );

  controls.style.display = "none";
  controls.style.alignItems = "center";
  controls.style.justifyContent = "flex-end";
  controls.style.gap = "6px";
  controls.style.marginRight = "6px";


  /* -------------------------
     CUSTOM TEMPLATE DROPDOWN
     ------------------------- */

  const select =
    doc.createElement("select");

  select.classList.add(
    "v6-template-select"
  );

	select.style.width = "180px";
	select.style.flex = "0 0 180px";
  /*
   * Copy CSB's current options exactly.
   */
  for (
    const nativeOption
    of nativeTemplateSelect.options
  ) {

    const option =
      doc.createElement("option");

    option.value =
      nativeOption.value;

    option.textContent =
      nativeOption.textContent;

    option.disabled =
      nativeOption.disabled;

    select.appendChild(option);
  }

  select.value =
    nativeTemplateSelect.value;


  select.addEventListener(
    "change",
    event => {

      nativeTemplateSelect.value =
        event.currentTarget.value;

      /*
       * Let CSB process its own template
       * selection normally.
       */
      nativeTemplateSelect.dispatchEvent(
        new root.ownerDocument.defaultView.Event(
          "change",
          {
            bubbles: true
          }
        )
      );

    }
  );


  /* -------------------------
     CUSTOM UPDATE BUTTON
     ------------------------- */

  const updateButton =
    doc.createElement("button");

  updateButton.type = "button";

  updateButton.classList.add(
    "v6-template-update"
  );

  updateButton.title =
    "Update sheet from selected template";

  updateButton.innerHTML =
    '<i class="fa-solid fa-arrows-rotate"></i>';

  updateButton.addEventListener(
    "click",
    event => {

      event.preventDefault();
      event.stopPropagation();

      /*
       * First synchronize the selected value
       * with CSB's hidden native selector.
       */
      nativeTemplateSelect.value =
        select.value;

      nativeTemplateSelect.dispatchEvent(
        new root.ownerDocument.defaultView.Event(
          "change",
          {
            bubbles: true
          }
        )
      );

      /*
       * Then use CSB's own Apply / Reload control.
       */
      nativeUpdateControl.click();

    }
  );


  controls.appendChild(select);
  controls.appendChild(updateButton);


  /*
   * Put our controls immediately before the
   * existing Edit Mode wrench / lock.
   */
  editControl.insertAdjacentElement(
    "beforebegin",
    controls
  );


  function refreshVisibility() {

    const editing =
      editCheckbox.checked === true;

    controls.style.display =
      editing
        ? "flex"
        : "none";

    /*
     * Keep our dropdown synchronized if CSB
     * changes the current template elsewhere.
     */
    if (
      select.value !==
      nativeTemplateSelect.value
    ) {

      select.value =
        nativeTemplateSelect.value;
    }
  }


  editCheckbox.addEventListener(
    "change",
    refreshVisibility
  );

  refreshVisibility();
}


/*
 * Install on every Actor-sheet render.
 */
Hooks.on(
  "renderApplicationV2",
  app => {

    const actor =
      app?.actor ??
      app?.document;

    if (
      !actor ||
      actor.documentName !== "Actor"
    ) return;

    v6InstallTemplateControls(app);

  }
);
	/* =========================================
   V6 SHEET PHOTO PICKER
   Character / Vehicle / Beast
   ========================================= */

function v6ArmSheetPhotoPicker(app) {

  const root =
    app?.element;

  const actor =
    app?.actor ??
    app?.document;

  if (
    !root ||
    !actor ||
    actor.documentName !== "Actor"
  ) return;

  if (
    root.dataset.v6PhotoPickerArmed === "true"
  ) return;

  root.dataset.v6PhotoPickerArmed = "true";

  root.addEventListener(
    "click",
    async event => {

      const photo =
        event.target?.closest?.(
          '[data-key="Pic"], [data-key="VPic"]'
        );

      if (
        !photo ||
        !root.contains(photo)
      ) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const key =
        photo.dataset.key;

      const current =
        String(
          actor.system?.props?.[key] ?? ""
        );

      const picker =
        new foundry.applications.apps.FilePicker({
          type: "image",
          current,

          callback: async path => {

            if (!path) return;

            await actor.update({
              [`system.props.${key}`]: path
            });
          }
        });

      if (
  typeof app.renderChild === "function"
) {

  await app.renderChild(
    picker,
    {
      force: true
    }
  );

  /*
   * Foundry v14 registers FilePicker as the
   * Actor sheet's child, but still inserts its
   * element into the main Foundry document.
   *
   * Move the already-rendered picker into the
   * Actor sheet's actual document.
   */
  const targetDocument =
    root.ownerDocument;

  const pickerElement =
    picker.element;

  if (
    pickerElement &&
    pickerElement.ownerDocument !== targetDocument
  ) {

    targetDocument.body.appendChild(
      targetDocument.adoptNode(
        pickerElement
      )
    );

    picker.setPosition();
  }

} else {

  await picker.render({
    force: true
  });
}
    },
    true
  );
}
	/* =========================================
   V6 PHOTO FRAMING — ZOOM TEST
   ========================================= */

function v6ApplyPhotoZoom(app) {

  const root =
    app?.element;

  const actor =
    app?.actor ??
    app?.document;

  if (
    !root ||
    !actor ||
    actor.documentName !== "Actor"
  ) return;

  const applyZoom = () => {

    const photo =
      root.querySelector(
        '[data-key="Pic"], [data-key="VPic"]'
      );

    if (!photo) return;

    let image =
      photo.querySelector("img");

    if (!image) return;

    let viewport =
      image.parentElement?.classList?.contains(
        "v6-photo-viewport"
      )
        ? image.parentElement
        : null;

    /*
     * CSB does not provide a usable clipping box
     * around the portrait, so create our own.
     */
    if (!viewport) {

      const width =
        image.offsetWidth ||
        120;

      const height =
        image.offsetHeight ||
        157;

      viewport =
        root.ownerDocument.createElement("div");

      viewport.classList.add(
        "v6-photo-viewport"
      );

      viewport.style.setProperty(
        "width",
        `${width}px`,
        "important"
      );

      viewport.style.setProperty(
        "height",
        `${height}px`,
        "important"
      );

      viewport.style.setProperty(
        "overflow",
        "hidden",
        "important"
      );

      viewport.style.setProperty(
        "position",
        "relative",
        "important"
      );

      viewport.style.setProperty(
        "display",
        "inline-block",
        "important"
      );

      viewport.style.setProperty(
        "vertical-align",
        "top",
        "important"
      );

      image.before(viewport);

      viewport.appendChild(image);

      image.style.setProperty(
        "position",
        "absolute",
        "important"
      );

      image.style.setProperty(
        "left",
        "0",
        "important"
      );

      image.style.setProperty(
        "top",
        "0",
        "important"
      );

      image.style.setProperty(
        "width",
        "100%",
        "important"
      );

      image.style.setProperty(
        "height",
        "100%",
        "important"
      );

	  image.style.setProperty(
  		"object-fit",
  		"cover",
  		"important"
	  );	
      image.style.setProperty(
        "max-width",
        "none",
        "important"
      );

      image.style.setProperty(
        "max-height",
        "none",
        "important"
      );
    }

    const zoom =
      Number(
        actor.getFlag(
          "world",
          "v6PhotoZoom"
        ) ?? 1
      );

    const expectedTransform =
      `scale(${zoom})`;

    image.style.setProperty(
      "transform-origin",
      "50% 50%",
      "important"
    );

    if (
      image.style.transform !==
      expectedTransform
    ) {
      image.style.setProperty(
        "transform",
        expectedTransform,
        "important"
      );
    }
  };

  applyZoom();

  if (root._v6PhotoZoomObserver) {
    return;
  }

  const observer =
    new MutationObserver(() => {
      applyZoom();
    });

  observer.observe(
    root,
    {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "style",
        "src"
      ]
    }
  );

  root._v6PhotoZoomObserver =
    observer;
}
     /* =========================================
     CHARACTER SHEET SIZE
     ========================================= */

 function v6SetCharacterSheetSize() {
  const sheetTemplates = [
    game.actors.getName("Character"),
    game.actors.getName("Vehicle"),
    game.actors.getName("Beast")
  ].filter(Boolean);

  if (sheetTemplates.length === 0) return;

  const templateIds = new Set(
    sheetTemplates.map(template => template.id)
  );

  for (const app of foundry.applications.api.ApplicationV2.instances()) {
    const sheet = app.element;

    if (
  !sheet ||
  typeof sheet.querySelector !== "function" ||
  typeof sheet.getBoundingClientRect !== "function"
) continue;

const currentWidth =
  Math.round(sheet.getBoundingClientRect().width);

const currentHeight =
  Math.round(sheet.getBoundingClientRect().height);

if (
  currentWidth === 762 &&
  currentHeight === 778
) continue;

    const actorId =
      sheet.id?.replace("CharacterSheetV2-Actor-", "");

    const actor = game.actors.get(actorId);

    if (
      !actor ||
      !templateIds.has(actor.system?.template)
    ) continue;

    app.setPosition({
      width: 762,
      height: 778
    });

    sheet.dataset.v6CharacterSizeSet = "true";
  }
}

  globalThis.v6CharacterSizeObserver =
    new MutationObserver(() => {
      v6SetCharacterSheetSize();
    });

  globalThis.v6CharacterSizeObserver.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

  v6SetCharacterSheetSize();
   
/* =========================================
   CUSTOM SKILL TAPE — TEST #1
   ========================================= */

function v6RefreshCustomSkillTape1() {
  const sheets =
  v6GetApplicationRoots();

  for (const sheet of sheets) {
    const button =
      sheet.querySelector(
        ".v6-custom-skill-1 > a.custom-system-rollable"
      );

    if (!button) continue;

    const actor = game.actors.find(a =>
      sheet.id?.includes(a.id)
    );

    if (!actor) continue;

    const customName =
  String(
    actor.system?.props?.CustomName1 ?? ""
  ).trim();

    if (customName) {
  button.dataset.v6CustomName = customName;
} else {
  delete button.dataset.v6CustomName;
}

    button.title =
      `${customName} — Shift+click to rename`;
  }
}

if (globalThis.v6CustomTapeObserver) {
  globalThis.v6CustomTapeObserver.disconnect();
}

globalThis.v6CustomTapeObserver =
  new MutationObserver(() => {
  v6RefreshCustomSkillTape1();
  v6RefreshRemainingCustomSkillTapes();
});

globalThis.v6CustomTapeObserver.observe(
  document.body,
  {
    childList: true,
    subtree: true
  }
);


   v6RefreshCustomSkillTape1();

function v6RefreshRemainingCustomSkillTapes() {
  const sheets =
  v6GetApplicationRoots();

  const customSkills = [
    {
      selector: ".v6-custom-skill-2 > a.custom-system-rollable",
      nameKey: "CustomName2"
    },
    {
      selector: ".v6-custom-skill-3 > a.custom-system-rollable",
      nameKey: "CustomName3"
    },
    {
      selector: ".v6-custom-skill-4 > a.custom-system-rollable",
      nameKey: "CustomName4"
    }
  ];

  for (const sheet of sheets) {
    const actor = game.actors.find(a =>
      sheet.id?.includes(a.id)
    );

    if (!actor) continue;

    for (const customSkill of customSkills) {
      const button =
        sheet.querySelector(customSkill.selector);

      if (!button) continue;

      const customName =
        String(
          actor.system?.props?.[customSkill.nameKey] ?? ""
        ).trim();

      if (customName) {
  		button.dataset.v6CustomName = customName;
			} else {
  		delete button.dataset.v6CustomName;
			}

      button.title =
        customName
          ? `${customName} — Shift+click to rename`
          : "Shift+click to rename";
    }
  }
}

v6RefreshRemainingCustomSkillTapes();

  /* =========================================
     HEALTH DIAL
     ========================================= */
  /* =========================================
     HEALTH DIAL
     ========================================= */

  globalThis.v6HealthDialObservers = new Map();

function v6SetHealthNeedle(sheet, actor) {
  const props = actor?.system?.props;
  if (!props) return;

  const health = Number(props.Health ?? 0);

  let maxHealth = Number(props.MAXHEALTH ?? 0);

  // Vehicles do not use MAXHEALTH.
  // Vehicle Health = (Muscle + Toughness) × HMULT.
  if (maxHealth <= 0) {
    maxHealth =
      (Number(props.Muscle ?? 0) +
       Number(props.Toughness ?? 0)) *
      Number(props.HMULT ?? 0);
  }

  if (maxHealth <= 0) return;

  const needle =
    sheet.querySelector(
      ".v6-health-dial-needle img"
    );

  if (!needle) return;

  const ratio =
    Math.max(
      0,
      Math.min(1, health / maxHealth)
    );

  const targetAngle =
    -90 + (180 * ratio);

  const displayedAngleText =
    sheet.dataset.v6HealthNeedleDisplayedAngle;

  /*
   * First render:
   * place needle directly at correct position.
   */
  if (displayedAngleText === undefined) {
    needle.style.setProperty(
      "transform-origin",
      "50% 50%",
      "important"
    );

    needle.style.setProperty(
      "transition",
      "none",
      "important"
    );

    needle.style.setProperty(
      "transform",
      `rotate(${targetAngle}deg)`,
      "important"
    );

    sheet.dataset.v6HealthNeedleDisplayedAngle =
      String(targetAngle);

    sheet.dataset.v6HealthNeedleTargetAngle =
      String(targetAngle);

    return;
  }

  const displayedAngle =
    Number(displayedAngleText);

  const oldTargetAngle =
    Number(
      sheet.dataset.v6HealthNeedleTargetAngle ??
      displayedAngle
    );

  /*
   * New Health value:
   * create a fresh animation token.
   */
  if (
    Math.abs(oldTargetAngle - targetAngle) > 0.01
  ) {
    sheet._v6HealthNeedleToken =
      (sheet._v6HealthNeedleToken ?? 0) + 1;

    sheet.dataset.v6HealthNeedleTargetAngle =
      String(targetAngle);
  }

  const token =
    sheet._v6HealthNeedleToken ?? 0;

  needle.style.setProperty(
    "transform-origin",
    "50% 50%",
    "important"
  );

  /*
   * Force replacement needle to begin at
   * the last position actually displayed.
   */
  needle.style.setProperty(
    "transition",
    "none",
    "important"
  );

  needle.style.setProperty(
    "transform",
    `rotate(${displayedAngle}deg)`,
    "important"
  );

  void needle.offsetHeight;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {

      if (
        sheet._v6HealthNeedleToken !== token
      ) return;

      needle.style.setProperty(
        "transition",
        "transform 1400ms cubic-bezier(0.20, 0.70, 0.25, 1)",
        "important"
      );

      needle.style.setProperty(
        "transform",
        `rotate(${targetAngle}deg)`,
        "important"
      );

    });
  });

  clearTimeout(
    sheet._v6HealthNeedleTimer
  );

  /*
   * Only declare the needle "arrived"
   * after the physical sweep is finished.
   */
  sheet._v6HealthNeedleTimer =
    setTimeout(() => {

      if (
        sheet._v6HealthNeedleToken !== token
      ) return;

      sheet.dataset.v6HealthNeedleDisplayedAngle =
        String(targetAngle);

    }, 1450);
}

   function v6SetHealthOdometer(sheet, actor) {
  const props = actor?.system?.props;
  if (!props) return;

  const health = Number(props.Health ?? 0);

  let maxHealth = Number(props.MAXHEALTH ?? 0);

  // Vehicles do not use MAXHEALTH.
  // Vehicle Health = (Muscle + Toughness) × HMULT.
  if (maxHealth <= 0) {
    maxHealth =
      (Number(props.Muscle ?? 0) +
       Number(props.Toughness ?? 0)) *
      Number(props.HMULT ?? 0);
  }

  const healthDigits =
    String(Math.max(0, Math.min(999, Math.floor(health))))
      .padStart(3, "0");

  const maxDigits =
    String(Math.max(0, Math.min(999, Math.floor(maxHealth))))
      .padStart(3, "0");

  const drums = {
    health: [
      sheet.querySelector('[data-key="HEALTHODO100"]'),
      sheet.querySelector('[data-key="HEALTHODO10"]'),
      sheet.querySelector('[data-key="HEALTHODO"]')
    ],
    max: [
      sheet.querySelector('[data-key="HEALTHODO100MAX"]'),
      sheet.querySelector('[data-key="HEALTHODO10MAX"]'),
      sheet.querySelector('[data-key="HEALTHODOMAX"]')
    ]
  };

  function setDigit(drum, value) {
    if (!drum) return;

    const digit = Number(value);
    const offset = digit === 9 ? 32 : digit * -30;

    if (digit === 0) {
      drum.style.removeProperty("background-position");
    } else {
      drum.style.setProperty(
        "background-position",
        `center calc(50% + ${offset + 4}px)`,
        "important"
      );
    }
  }

  healthDigits.split("").forEach(
    (digit, index) => setDigit(drums.health[index], digit)
  );

  maxDigits.split("").forEach(
    (digit, index) => setDigit(drums.max[index], digit)
  );

              /* =========================================
     HEALTH ODOMETER — slow mechanical crawl
     ========================================= */

  const previousHealthText =
    sheet.dataset.v6DisplayedHealth ??
    sheet.dataset.v6LastHealth;

  const previousMaxHealthText =
    sheet.dataset.v6DisplayedMaxHealth ??
    sheet.dataset.v6LastMaxHealth;

  const previousHealth =
    previousHealthText === undefined
      ? health
      : Number(previousHealthText);

  const previousMaxHealth =
    previousMaxHealthText === undefined
      ? maxHealth
      : Number(previousMaxHealthText);

  function v6OdoDigits(value) {
    return String(
      Math.max(
        0,
        Math.min(
          999,
          Math.floor(Number(value) || 0)
        )
      )
    )
      .padStart(3, "0")
      .split("")
      .map(Number);
  }

  function v6OdoOffset(digit) {
    return digit === 9 ? 32 : digit * -30;
  }

  function v6OdoY(digit) {
    return `calc(50% + ${v6OdoOffset(digit) + 4}px)`;
  }

  const V6_ODO_ROLL_MS = 650;
  const V6_ODO_STEP_MS = 800;
  const V6_ODO_START_HOLD_MS = 200;

  function v6SetOdoValue(keys, value) {
    const digits = v6OdoDigits(value);

    keys.forEach((key, index) => {
      const drum =
        sheet.querySelector(`[data-key="${key}"]`);

      if (!drum) return;

      drum.style.setProperty(
        "transition",
        "none",
        "important"
      );

      drum.style.setProperty(
        "background-position-y",
        v6OdoY(digits[index]),
        "important"
      );
    });
  }

  function v6RollOdoStep(
    keys,
    fromValue,
    toValue,
    token
  ) {
    const fromDigits = v6OdoDigits(fromValue);
    const toDigits = v6OdoDigits(toValue);

    keys.forEach((key, index) => {
      const fromDigit = fromDigits[index];
      const toDigit = toDigits[index];

      if (fromDigit === toDigit) return;

      const drum =
        sheet.querySelector(`[data-key="${key}"]`);

      if (!drum) return;

      const distance = Math.abs(
        v6OdoOffset(toDigit) -
        v6OdoOffset(fromDigit)
      );

      drum.style.setProperty(
        "transition",
        "none",
        "important"
      );

      drum.style.setProperty(
        "background-position-y",
        v6OdoY(fromDigit),
        "important"
      );

      void drum.offsetHeight;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (sheet._v6OdoToken !== token) return;

          if (distance <= 45) {
            drum.style.setProperty(
              "transition",
              `background-position-y ${V6_ODO_ROLL_MS}ms linear`,
              "important"
            );

            drum.style.setProperty(
              "background-position-y",
              v6OdoY(toDigit),
              "important"
            );
          } else {
            const wrapHeight = 302;

            const wrappedTarget =
              fromDigit === 9 && toDigit === 8
                ? v6OdoOffset(toDigit) + 4 + wrapHeight
                : v6OdoOffset(toDigit) + 4 - wrapHeight;

            drum.style.setProperty(
              "background-repeat",
              "repeat-y",
              "important"
            );

            drum.style.setProperty(
              "transition",
              `background-position-y ${V6_ODO_ROLL_MS}ms linear`,
              "important"
            );

            drum.style.setProperty(
              "background-position-y",
              `calc(50% + ${wrappedTarget}px)`,
              "important"
            );

            setTimeout(() => {
              if (sheet._v6OdoToken !== token) return;

              drum.style.setProperty(
                "transition",
                "none",
                "important"
              );

              drum.style.setProperty(
                "background-repeat",
                "no-repeat",
                "important"
              );

              drum.style.setProperty(
                "background-position-y",
                v6OdoY(toDigit),
                "important"
              );
            }, V6_ODO_ROLL_MS);
          }
        });
      });
    });
  }

  function v6StartOdoCrawl(
    keys,
    fromValue,
    toValue,
    displayDatasetKey,
    timerProperty,
    token
  ) {
    clearTimeout(sheet[timerProperty]);

    let displayed = Math.max(
      0,
      Math.min(
        999,
        Math.floor(Number(fromValue) || 0)
      )
    );

    const target = Math.max(
      0,
      Math.min(
        999,
        Math.floor(Number(toValue) || 0)
      )
    );

    v6SetOdoValue(keys, displayed);
    sheet.dataset[displayDatasetKey] =
      String(displayed);

    if (displayed === target) return;

    const direction =
      target > displayed ? 1 : -1;

    const step = () => {
      if (sheet._v6OdoToken !== token) return;

      const next =
        displayed + direction;

      v6RollOdoStep(
        keys,
        displayed,
        next,
        token
      );

      displayed = next;

      sheet.dataset[displayDatasetKey] =
        String(displayed);

      if (displayed !== target) {
        sheet[timerProperty] =
          setTimeout(
            step,
            V6_ODO_STEP_MS
          );
      }
    };

    sheet[timerProperty] =
      setTimeout(
        step,
        V6_ODO_START_HOLD_MS
      );
  }

  const healthKeys = [
    "HEALTHODO100",
    "HEALTHODO10",
    "HEALTHODO"
  ];

  const maxKeys = [
    "HEALTHODO100MAX",
    "HEALTHODO10MAX",
    "HEALTHODOMAX"
  ];

  sheet._v6OdoToken =
    (sheet._v6OdoToken ?? 0) + 1;

  const odoToken =
    sheet._v6OdoToken;

  clearTimeout(
    sheet._v6HealthRollTimer
  );

  sheet._v6HealthRollTimer =
    setTimeout(() => {
      if (
        sheet._v6OdoToken !== odoToken
      ) return;

      v6StartOdoCrawl(
        healthKeys,
        previousHealth,
        health,
        "v6DisplayedHealth",
        "_v6HealthCrawlTimer",
        odoToken
      );

      v6StartOdoCrawl(
        maxKeys,
        previousMaxHealth,
        maxHealth,
        "v6DisplayedMaxHealth",
        "_v6MaxHealthCrawlTimer",
        odoToken
      );
    }, 50);

  sheet.dataset.v6LastHealth =
    String(health);

  sheet.dataset.v6LastMaxHealth =
    String(maxHealth);
      const vehicleTemplate =
  game.actors.getName("Vehicle");

const isVehicle =
  vehicleTemplate &&
  actor.system?.template === vehicleTemplate.id;

        const healthMultDrum =
    sheet.querySelector('[data-key="HMULT"] select');

  if (healthMultDrum && !isVehicle) {
    const digit = Math.max(
      0,
      Math.min(
        9,
        Math.floor(Number(props.HMULT ?? 0))
      )
    );

    const offset =
      digit === 9 ? 32 : digit * -30;

    if (digit === 0) {
      healthMultDrum.style.removeProperty(
        "background-position"
      );
    } else {
      healthMultDrum.style.setProperty(
        "background-position",
        `center calc(50% + ${offset + 4}px)`,
        "important"
      );
    }
  }
}
   
function v6SetNonLethalBar(sheet, actor) {
  const bar = sheet.querySelector('[data-key="NLBar"] img');
  if (!bar) return;

  const dmg = Number(actor?.system?.props?.NONLETHALDMG ?? 0);
  const maxHealth = Number(actor?.system?.props?.MAXHEALTH ?? 0);

  if (maxHealth <= 0) return;

  const ratio = Math.max(0, Math.min(1, dmg / maxHealth));
  const sweep = 180 * ratio;

  const mask = `conic-gradient(
    from 270deg at 50% 50%,
    black 0deg ${sweep}deg,
    transparent ${sweep}deg 360deg
  )`;

  bar.style.setProperty(
    "-webkit-mask-image",
    mask,
    "important"
  );

  bar.style.setProperty(
    "mask-image",
    mask,
    "important"
  );
}
   async function v6RenderDialogFromSheet(sheet, config) {

  const parentApp =
    [
      ...foundry.applications.api.ApplicationV2.instances()
    ].find(app =>
      app.element === sheet
    );

  const dialog =
    new foundry.applications.api.DialogV2(config);

  if (
    parentApp &&
    typeof parentApp.renderChild === "function"
  ) {

    await parentApp.renderChild(
      dialog,
      {
        force: true
      }
    );

  } else {

    await dialog.render({
      force: true
    });

  }

  return dialog;
}
	async function v6PromptFromSheet(sheet, config) {

  const parentApp =
    [
      ...foundry.applications.api.ApplicationV2.instances()
    ].find(app =>
      app.element === sheet
    );

		console.log("V6 PROMPT PARENT CHECK:", {
  sheet,
  sheetDocument: sheet?.ownerDocument,
  parentApp,
  applications: [
    ...foundry.applications.api.ApplicationV2.instances()
  ].map(app => ({
    id: app.id,
    element: app.element,
    sameElement: app.element === sheet,
    sameDocument:
      app.element?.ownerDocument === sheet?.ownerDocument
  }))
});
		
  const {
    ok = {},
    ...dialogConfig
  } = config;

  return await new Promise(async resolve => {

    let settled = false;

    const finish = value => {

      if (settled) return;

      settled = true;
      resolve(value);
    };

    const originalCallback =
      ok.callback;

    const dialog =
      new foundry.applications.api.DialogV2({
        ...dialogConfig,

        buttons: [
          {
            action: "ok",
            label: ok.label ?? "OK",
            default: true,

            callback: async (...args) => {

              const value =
                originalCallback
                  ? await originalCallback(...args)
                  : "ok";

              finish(value);

              return value;
            }
          }
        ]
      });

    dialog.addEventListener(
      "close",
      () => finish(null),
      {
        once: true
      }
    );

    if (
      parentApp &&
      typeof parentApp.renderChild === "function"
    ) {

      await parentApp.renderChild(
        dialog,
        {
          force: true
        }
      );

    } else {

      await dialog.render({
        force: true
      });
    }
  });
}
async function v6OpenHealthDialog(actor, sheet) {
  const props = actor?.system?.props ?? {};

  const health = Number(props.Health ?? 0);
  const maxHealth = Number(props.MAXHEALTH ?? 0);
  const nonLethal = Number(props.NONLETHALDMG ?? 0);
  const protection = Number(props.PROTECTION ?? 0);

  const persistentType = props.PERSISTENTTYPE ?? "blank";
  const persistentDmg = Number(props.PERSISTENTDMG ?? 0);
  const persistentDuration = Number(props.PERSISTENTDURATION ?? 0);

  const vehicleTemplate = game.actors.getName("Vehicle");

  const isVehicle =
    vehicleTemplate &&
    actor.system?.template === vehicleTemplate.id;

  await v6RenderDialogFromSheet(sheet, {
    window: {
      title: `${actor.name}: Health`
    },

    content: `
      <div style="text-align:center;">
        <h2>V6 HEALTH INTERFACE</h2>

        <p><strong>Health:</strong> ${health} / ${maxHealth}</p>
        <p><strong>Non-Lethal Damage:</strong> ${nonLethal}</p>
        <p><strong>Protection:</strong> ${protection}</p>

        ${isVehicle && protection > 0 ? `
          <p>
            <strong>VEHICLE ARMOR:</strong>
            Weapons with Base Damage ${protection} or less cause Cosmetic Damage Only.
          </p>
        ` : ""}

        <hr>

        <div style="margin: 12px 0;">
          <label for="v6hi-damage"><strong>Amount:</strong></label>
          <input
            id="v6hi-damage"
            name="damage"
            type="number"
            min="0"
            value="0"
            style="width: 80px; margin-left: 8px; text-align:center;"
          >
        </div>

        <div style="margin: 12px 0;">
          <strong>Damage Type:</strong>

          <label style="margin-left: 10px;">
            <input
              type="radio"
              name="damageType"
              value="lethal"
              checked
            >
            Lethal
          </label>

          <label style="margin-left: 10px;">
            <input
              type="radio"
              name="damageType"
              value="nonlethal"
            >
            Non-Lethal
          </label>
        </div>
      </div>
    `,

    buttons: [
      {
        action: "damage",
        label: "APPLY DAMAGE",

        callback: async (event, button, dialog) => {
          const damageInput =
            dialog.element.querySelector("#v6hi-damage");

          const damage = Math.max(
            0,
            Number(damageInput?.value ?? 0)
          );

          const damageType =
            dialog.element.querySelector(
              'input[name="damageType"]:checked'
            )?.value;

          if (damageType === "nonlethal") {

            if (isVehicle) {
              ui.notifications.info(
                `${actor.name}: Cosmetic damage only.`
              );
              return;
            }

            const currentNonLethal = Number(
              actor.system?.props?.NONLETHALDMG ?? 0
            );

            const currentHealth = Number(
              actor.system?.props?.Health ?? 0
            );

            const currentMaxHealth = Number(
              actor.system?.props?.MAXHEALTH ?? 0
            );

            const characterTemplate =
              game.actors.getName("Character");

            const beastTemplate =
              game.actors.getName("Beast");

            const usesPersonalProtection =
              (characterTemplate &&
                actor.system?.template === characterTemplate.id) ||
              (beastTemplate &&
                actor.system?.template === beastTemplate.id);

            const currentProtection =
              usesPersonalProtection
                ? Number(actor.system?.props?.PROTECTION ?? 0)
                : 0;

            const damageTaken =
              Math.max(0, damage - currentProtection);

            const totalNonLethal =
              currentNonLethal + damageTaken;

            const newNonLethal =
              Math.min(totalNonLethal, currentMaxHealth);

            const overflow =
              Math.max(0, totalNonLethal - currentMaxHealth);

            const newHealth =
              Math.max(0, currentHealth - overflow);

            await actor.update({
              "system.props.NONLETHALDMG": newNonLethal,
              "system.props.Health": newHealth
            });

            ui.notifications.info(
              `${actor.name}: Incoming ${damage} — Protection ${currentProtection} — Non-Lethal Taken ${damageTaken}`
            );

          } else {

            const currentHealth = Number(
              actor.system?.props?.Health ?? 0
            );

            const characterTemplate =
              game.actors.getName("Character");

            const beastTemplate =
              game.actors.getName("Beast");

            const usesPersonalProtection =
              (characterTemplate &&
                actor.system?.template === characterTemplate.id) ||
              (beastTemplate &&
                actor.system?.template === beastTemplate.id);

            const currentProtection =
              (usesPersonalProtection || isVehicle)
                ? Number(actor.system?.props?.PROTECTION ?? 0)
                : 0;

            const damageTaken =
              Math.max(0, damage - currentProtection);

            const newHealth =
              Math.max(0, currentHealth - damageTaken);

            await actor.update({
              "system.props.Health": newHealth
            });

            ui.notifications.info(
              `${actor.name}: Incoming ${damage} — Protection ${currentProtection} — Damage Taken ${damageTaken}`
            );
          }
        }
      },

      {
        action: "heal",
        label: "HEAL",

callback: async (event, button, dialog) => {
  const damageInput =
    dialog.element.querySelector("#v6hi-damage");

  const healing = Math.max(
    0,
    Number(damageInput?.value ?? 0)
  );

  const damageType =
    dialog.element.querySelector(
      'input[name="damageType"]:checked'
    )?.value;

  if (damageType === "nonlethal") {

    const currentNonLethal = Number(
      actor.system?.props?.NONLETHALDMG ?? 0
    );

    const newNonLethal =
      Math.max(0, currentNonLethal - healing);

    await actor.update({
      "system.props.NONLETHALDMG": newNonLethal
    });

  } else {

    const currentHealth = Number(
      actor.system?.props?.Health ?? 0
    );

    const currentMaxHealth = Number(
      actor.system?.props?.MAXHEALTH ?? 0
    );

    const newHealth =
      Math.min(
        currentMaxHealth,
        currentHealth + healing
      );

    await actor.update({
      "system.props.Health": newHealth
    });
  }
}
      },

      {
        action: "continuing",
        label: "CONTINUING DAMAGE",

        callback: async () => {
          await v6RenderDialogFromSheet(sheet, {
            window: {
              title: `${actor.name}: Continuing Damage`
            },

            content: `
              <div style="text-align:center;">
                <h2>CONTINUING DAMAGE</h2>

                <div style="margin: 12px 0;">
                  <label><strong>Type:</strong></label>

                  <select id="v6hi-persistent-type">
                    <option
                      value="fire"
                      ${persistentType === "fire" ? "selected" : ""}
                    >
                      Fire
                    </option>

                    <option
                      value="acid"
                      ${persistentType === "acid" ? "selected" : ""}
                    >
                      Acid
                    </option>
                  </select>
                </div>

                <div style="margin: 12px 0;">
                  <label><strong>Damage:</strong></label>

                  <input
                    id="v6hi-persistent-dmg"
                    type="number"
                    min="0"
                    value="${persistentDmg}"
                    style="width: 80px; text-align:center;"
                  >
                </div>

                <div style="margin: 12px 0;">
                  <label><strong>Duration:</strong></label>

                  <input
                    id="v6hi-persistent-duration"
                    type="number"
                    min="0"
                    value="${persistentDuration}"
                    style="width: 80px; text-align:center;"
                  >
                </div>
              </div>
            `,

            buttons: [
              {
                action: "set",
                label: "SET",

                callback: async (event, button, dialog) => {
                  const type =
                    dialog.element.querySelector(
                      "#v6hi-persistent-type"
                    )?.value ?? "blank";

                  const damage = Math.max(
                    0,
                    Number(
                      dialog.element.querySelector(
                        "#v6hi-persistent-dmg"
                      )?.value ?? 0
                    )
                  );

                  const duration = Math.max(
                    0,
                    Number(
                      dialog.element.querySelector(
                        "#v6hi-persistent-duration"
                      )?.value ?? 0
                    )
                  );

                  await actor.update({
                    "system.props.PERSISTENTTYPE": type,
                    "system.props.PERSISTENTDMG": damage,
                    "system.props.PERSISTENTDURATION": duration
                  });
                }
              },

              {
                action: "clear",
                label: "CLEAR",

                callback: async () => {
                  await actor.update({
                    "system.props.PERSISTENTTYPE": "blank",
                    "system.props.PERSISTENTDMG": 0,
                    "system.props.PERSISTENTDURATION": 0
                  });
                }
              },

              {
                action: "close",
                label: "Close"
              }
            ],

          });
        }
      },

      {
        action: "close",
        label: "Close"
      }
    ],

  });
}

   function v6DisableDashboardHitbox(sheet) {

  const dashInd =
    sheet.querySelector(
      '[data-key="DASHIND"]'
    );

  if (!dashInd) return;

  dashInd.style.setProperty(
    "pointer-events",
    "none",
    "important"
  );

  dashInd
    .querySelectorAll("*")
    .forEach(element => {

      element.style.setProperty(
        "pointer-events",
        "none",
        "important"
      );

    });

	   const proneControls =
  dashInd.querySelectorAll(
    '[data-key="PRONEFALSE"], [data-key="PRONETRUE"]'
  );

proneControls.forEach(control => {

  control.style.setProperty(
    "pointer-events",
    "auto",
    "important"
  );

  control
    .querySelectorAll("*")
    .forEach(element => {

      element.style.setProperty(
        "pointer-events",
        "auto",
        "important"
      );

    });
});
	   
}
function v6ArmHealthDial(sheet, actor) {
   const vehicleTemplate =
  game.actors.getName("Vehicle");

const isVehicleSheet =
  vehicleTemplate &&
  actor.system?.template === vehicleTemplate.id;

if (isVehicleSheet) {
  sheet.classList.add("v6-vehicle-sheet");

  const healthMult =
  sheet.querySelector('[data-key="HMULT"]');

if (healthMult) {
  healthMult.title =
    "Atomic Highway uses Health Mult 15 by default. Change only if using a house rule.";
}
}
  v6SetHealthNeedle(sheet, actor);
  v6SetHealthOdometer(sheet, actor);
  v6SetNonLethalBar(sheet, actor);
  v6DisableDashboardHitbox(sheet);	
     const healthDial = sheet.querySelector('[data-key="HEALTHDIAL"]');

if (healthDial) {
  healthDial.style.cursor = "pointer";

  healthDial.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    v6OpenHealthDialog(actor, sheet);
  };
}
     
const observer = new MutationObserver(() => {
v6SetHealthNeedle(sheet, actor);
v6SetHealthOdometer(sheet, actor);
v6SetNonLethalBar(sheet, actor);
v6DisableDashboardHitbox(sheet);
  const currentHealthDial =
    sheet.querySelector('[data-key="HEALTHDIAL"]');

  if (currentHealthDial) {
    currentHealthDial.style.cursor = "pointer";

    currentHealthDial.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();

      v6OpenHealthDialog(actor, sheet);
    };
  }
});

    observer.observe(sheet, {
      childList: true,
      subtree: true
    });

    globalThis.v6HealthDialObservers.set(sheet, observer);

     sheet.dataset.v6HealthDialArmed = "true";
     
// Beast Name: stack label above input after CSB finishes rendering
setTimeout(() => {
    const bname = sheet.querySelector('[data-key="bname"]');

    if (bname) {
        bname.style.setProperty("display", "flex", "important");
        bname.style.setProperty("flex-direction", "column", "important");
        bname.style.setProperty("align-items", "flex-start", "important");
    }
}, 500);  

    console.log(`V6 Health Dial armed: ${actor.name}`);
  }

  function v6FindHealthDials() {
    const sheets =
  v6GetApplicationRoots();

    for (const sheet of sheets) {
      if (sheet.dataset.v6HealthDialArmed === "true") continue;

      const needle = sheet.querySelector(".v6-health-dial-needle");
      if (!needle) continue;

      const actor = game.actors.find(a =>
        sheet.id?.includes(a.id)
      );

      if (!actor) continue;

      v6ArmHealthDial(sheet, actor);
    }
  }

  globalThis.v6HealthDialStartupObserver =
    new MutationObserver(() => {
      v6FindHealthDials();
    });

  globalThis.v6HealthDialStartupObserver.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

  v6FindHealthDials();

  /* =========================================
     SKILL DRUMS
     ========================================= */

  function v6ArmSkillDrum(root, actor, drumKey, skillKey, skillName) {

    function setDrum() {
      const drum = root.querySelector(`[data-key="${drumKey}"]`);

      if (!drum) return;

      const skillValue = Number(actor.system?.props?.[skillKey] ?? 0);
      const digit = Math.max(0, Math.min(9, Math.floor(skillValue)));
      const offset = digit === 9 ? 32 : digit * -30;

      if (digit === 0) {
        drum.style.removeProperty("background-position");
      } else {
        drum.style.setProperty(
          "background-position",
          `center calc(50% + ${offset + 4}px)`,
          "important"
        );
      }

      drum.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const current = Number(actor.system?.props?.[skillKey] ?? 0);

        const result = await v6PromptFromSheet(root, {
          window: {
            title: skillName
          },

          content: `
            <div style="padding: 8px;">
              <label>${skillName}:</label>

              <div style="
                display: grid;
                grid-template-columns: 50px 1fr 50px;
                gap: 8px;
                align-items: center;
                margin-top: 6px;
              ">
                <button type="button" data-action="minus">−1</button>

                <input
                  type="number"
                  name="skillValue"
                  value="${current}"
                  min="0"
                  max="5"
                  step="1"
                  style="text-align: center;"
                  autofocus
                >

                <button type="button" data-action="plus">+1</button>
              </div>
            </div>
          `,

          render: (event, dialog) => {
            const input =
              dialog.element.querySelector('[name="skillValue"]');

            const minus =
              dialog.element.querySelector('[data-action="minus"]');

            const plus =
              dialog.element.querySelector('[data-action="plus"]');

            minus.onclick = () => {
              const value = Number(input.value) || 0;
              input.value = Math.max(0, value - 1);
            };

            plus.onclick = () => {
              const value = Number(input.value) || 0;
              input.value = Math.min(5, value + 1);
            };
          },

          ok: {
            label: "SET",
            callback: (event, button, dialog) => {
              return Number(
                dialog.element.querySelector('[name="skillValue"]').value
              );
            }
          }
        });

        if (result === null || result === undefined) return;

        const value =
          Math.max(0, Math.min(5, Math.floor(Number(result) || 0)));

        await actor.update({
          [`system.props.${skillKey}`]: value
        });
      };
    }

    setDrum();

    const observer = new MutationObserver(() => {
      setDrum();
    });

    observer.observe(root, {
      childList: true,
      subtree: true
    });
  }

  /* V6 SKILL DRUM TEST — ATHLETICS ONLY */

  function v6FindSkillDrums() {
    const sheets =
  v6GetApplicationRoots();

    for (const sheet of sheets) {
      if (sheet.dataset.v6SkillDrumsArmed === "true") continue;

      const athleticsDrum =
        sheet.querySelector('[data-key="DAthletics"]');

      if (!athleticsDrum) continue;

      const actor = game.actors.find(a =>
        sheet.id?.includes(a.id)
      );

      if (!actor) continue;

          v6ArmSkillDrum(sheet, actor, "DAthletics",  "Athletics",  "Athletics");
      v6ArmSkillDrum(sheet, actor, "DBoat",       "Boat",       "Boat");
      v6ArmSkillDrum(sheet, actor, "DBrawl",      "Brawl",      "Brawl");
      v6ArmSkillDrum(sheet, actor, "DCriminal",   "Criminal",   "Criminal");
      v6ArmSkillDrum(sheet, actor, "DDrive",      "Drive",      "Drive");
      v6ArmSkillDrum(sheet, actor, "DHeal",       "Heal",       "Heal");
      v6ArmSkillDrum(sheet, actor, "DIntimidate", "Intimidate", "Intimidate");
      v6ArmSkillDrum(sheet, actor, "DLore",       "Lore",       "Lore");
      v6ArmSkillDrum(sheet, actor, "DMelee",      "Melee",      "Melee");
      v6ArmSkillDrum(sheet, actor, "DNotice",     "Notice",     "Notice");
      v6ArmSkillDrum(sheet, actor, "DPersuade",   "Persuade",   "Persuade");
      v6ArmSkillDrum(sheet, actor, "DPilot",      "Pilot",      "Pilot");
      v6ArmSkillDrum(sheet, actor, "DRide",       "Ride",       "Ride");
      v6ArmSkillDrum(sheet, actor, "DScavenge",   "Scavenge",   "Scavenge");
      v6ArmSkillDrum(sheet, actor, "DShoot",      "Shoot",      "Shoot");
      v6ArmSkillDrum(sheet, actor, "DSleight",    "Sleight",    "Sleight");
      v6ArmSkillDrum(sheet, actor, "DStealth",    "Stealth",    "Stealth");
      v6ArmSkillDrum(sheet, actor, "DSurvive",    "Survive",    "Survive");
      v6ArmSkillDrum(sheet, actor, "DTech",       "Tech",       "Tech");
      v6ArmSkillDrum(sheet, actor, "DZoofinity",  "Zoofinity",  "Zoofinity");
      v6ArmSkillDrum(sheet, actor, "DCustom1",    "Custom1",    "Custom 1");
      v6ArmSkillDrum(sheet, actor, "DCustom2",    "Custom2",    "Custom 2");
      v6ArmSkillDrum(sheet, actor, "DCustom3",    "Custom3",    "Custom 3");
      v6ArmSkillDrum(sheet, actor, "DCustom4",    "Custom4",    "Custom 4");

      sheet.dataset.v6SkillDrumsArmed = "true";
    }
  }

  globalThis.v6SkillDrumStartupObserver =
    new MutationObserver(() => {
      v6FindSkillDrums();
    });

  globalThis.v6SkillDrumStartupObserver.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

  v6FindSkillDrums();
  
  /* =========================================
     GARAGE
     ========================================= */

  if (globalThis.v6GarageObserver) {
    globalThis.v6GarageObserver.disconnect();
  }

  globalThis.v6ArmedGarages = new WeakSet();

  async function v6ArmGarages() {

    const garages =
  v6GetApplicationRoots()
    .flatMap(root =>
      [...root.querySelectorAll(".v6-garage-drop")]
    );
    for (const garage of garages) {

      if (globalThis.v6ArmedGarages.has(garage)) continue;

      globalThis.v6ArmedGarages.add(garage);

      const sheet = garage.closest(".application");
		const doc =
  			garage.ownerDocument;
      console.log("V6 NEW GARAGE DETECTED:", {
        garage,
        sheet,
        sheetId: sheet?.id
      });

      const actorId =
        sheet?.id?.replace("CharacterSheetV2-Actor-", "");

      const owner = game.actors.get(actorId);

      if (!owner) {
        console.warn("V6 GARAGE: Could not identify owner.", {
          actorId,
          sheet
        });
        continue;
      }

      console.log(
        "V6 GARAGE OWNER:",
        owner.name,
        owner.id
      );

      const savedUuids =
        owner.getFlag("world", "v6GarageVehicles") ?? [];

      console.log(
        "V6 SAVED VEHICLES:",
        savedUuids
      );

      const originalLabel =
        garage.querySelector(".v6-garage-drop-label");

      if (!originalLabel) continue;

      let list =
        garage.querySelector(".v6-garage-list");

      if (!list) {
        list = doc.createElement("div");
        list.classList.add("v6-garage-list");

        originalLabel.insertAdjacentElement(
          "beforebegin",
          list
        );
      }

      list.replaceChildren();

      originalLabel.textContent = "PARK VEHICLE HERE";
      originalLabel.style.display = "";

      if (savedUuids.length > 0) {

        for (const uuid of savedUuids) {

          const vehicle = await fromUuid(uuid);

          if (!vehicle) continue;

          const entry =
            doc.createElement("div");

          entry.classList.add("v6-garage-entry");

          entry.style.display = "flex";
          entry.style.alignItems = "center";
          entry.style.justifyContent = "center";
          entry.style.gap = "6px";

          const vehicleLink =
            doc.createElement("span");

          vehicleLink.textContent = vehicle.name;
          vehicleLink.style.cursor = "pointer";
          vehicleLink.style.textDecoration = "underline";

          vehicleLink.onclick = async (event) => {
  event.preventDefault();
  event.stopPropagation();

  await vehicle.setFlag(
    "world",
    "v6GarageOperator",
    owner.id
  );

  const vehicleSheet =
    vehicle.sheet;

  const parentApp =
    [
      ...foundry.applications.api.ApplicationV2.instances()
    ].find(app =>
      app.element === sheet
    );

  if (
    parentApp &&
    vehicleSheet &&
    typeof parentApp.renderChild === "function"
  ) {

    vehicleSheet._v6RenderAsChild = true;

    try {

      await parentApp.renderChild(
        vehicleSheet,
        {
          force: true
        }
      );

      vehicleSheet.setPosition({
        width: 762,
        height: 778
      });

      v6KillCsbActorChrome(
        vehicleSheet.element
      );

      v6InstallDetachButton(
        vehicleSheet
      );

    } catch (error) {

      vehicleSheet._v6RenderAsChild = false;

      console.warn(
        "V6 VEHICLE CHILD RENDER FAILED:",
        vehicle.name,
        error
      );

    }

    return;
  }

  vehicleSheet?.render(true);
};
          const removeButton =
            doc.createElement("span");

          removeButton.textContent = "×";
          removeButton.title =
            `Remove ${vehicle.name} from Garage`;

          removeButton.style.cursor = "pointer";
          removeButton.style.fontWeight = "bold";

          removeButton.onclick = async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const currentUuids =
              owner.getFlag(
                "world",
                "v6GarageVehicles"
              ) ?? [];

            const newUuids =
              currentUuids.filter(
                savedUuid => savedUuid !== uuid
              );

            await owner.setFlag(
              "world",
              "v6GarageVehicles",
              newUuids
            );

            ui.notifications.info(
              `${vehicle.name} removed from ${owner.name}'s Garage.`
            );
          };

          entry.appendChild(vehicleLink);
          entry.appendChild(removeButton);

          list.appendChild(entry);
        }
      }

      const dragDrop =
        new foundry.applications.ux.DragDrop({

          dropSelector: ".v6-garage-drop",

          permissions: {
            drop: () => true
          },

          callbacks: {

            drop: async (event) => {

              const data =
                foundry.applications.ux.TextEditor
                  .implementation
                  .getDragEventData(event);

              console.log(
                "V6 AUTO GARAGE DROP:",
                data
              );

              if (
                data.type !== "Actor" ||
                !data.uuid
              ) return;

              const vehicle =
                await fromUuid(data.uuid);

              if (!vehicle) return;

              const vehicleTemplate =
                game.actors.getName("Vehicle");

              if (
                !vehicleTemplate ||
                vehicle.system?.template !==
                  vehicleTemplate.id
              ) {
                ui.notifications.warn(
                  `${vehicle.name} is not a vehicle and cannot be parked in ${owner.name}'s Garage.`
                );
                return;
              }

              let currentUuids =
                owner.getFlag(
                  "world",
                  "v6GarageVehicles"
                ) ?? [];

              if (
                currentUuids.includes(data.uuid)
              ) {
                ui.notifications.warn(
                  `${vehicle.name} is already in ${owner.name}'s Garage.`
                );
                return;
              }

              currentUuids = [
                ...currentUuids,
                data.uuid
              ];

              await owner.setFlag(
                "world",
                "v6GarageVehicles",
                currentUuids
              );

              ui.notifications.info(
                `${vehicle.name} added to ${owner.name}'s Garage.`
              );
            }
          }
        });

      dragDrop.bind(garage);

      console.log(
        "V6 AUTO GARAGE ARMED:",
        owner.name
      );


    }
  }

  globalThis.v6GarageObserver =
    new MutationObserver(() => {
      v6ArmGarages();
    });

  globalThis.v6GarageObserver.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

  await v6ArmGarages();


  /* =========================================
     STABLE
     ========================================= */

  if (globalThis.v6StableObserver) {
    globalThis.v6StableObserver.disconnect();
  }

  globalThis.v6ArmedStables = new WeakSet();

  async function v6ArmStables() {

    const stables =
  v6GetApplicationRoots()
    .flatMap(root =>
      [...root.querySelectorAll(".v6-stable-drop")]
    );

    for (const stable of stables) {

      if (globalThis.v6ArmedStables.has(stable)) continue;

      globalThis.v6ArmedStables.add(stable);

      const sheet = stable.closest(".application");
		const doc =
  			stable.ownerDocument;
      console.log("V6 NEW STABLE DETECTED:", {
        stable,
        sheet,
        sheetId: sheet?.id
      });

      const actorId =
        sheet?.id?.replace("CharacterSheetV2-Actor-", "");

      const owner = game.actors.get(actorId);

      if (!owner) {
        console.warn(
          "V6 STABLE: Could not identify owner.",
          {
            actorId,
            sheet
          }
        );
        continue;
      }

      console.log(
        "V6 STABLE OWNER:",
        owner.name,
        owner.id
      );

      const savedUuids =
        owner.getFlag("world", "v6StableBeasts") ?? [];

      console.log(
        "V6 SAVED BEASTS:",
        savedUuids
      );

      const originalLabel =
        stable.querySelector(".v6-stable-drop-label");

      if (!originalLabel) continue;

      let list =
        stable.querySelector(".v6-stable-list");

      if (!list) {
        list = doc.createElement("div");
        list.classList.add("v6-stable-list");

        originalLabel.insertAdjacentElement(
          "beforebegin",
          list
        );
      }

      list.replaceChildren();

      originalLabel.textContent = "DRAG BEAST HERE";
      originalLabel.style.display = "";

      if (savedUuids.length > 0) {

        for (const uuid of savedUuids) {

          const beast = await fromUuid(uuid);

          if (!beast) continue;

          const entry =
          doc.createElement("div");

          entry.classList.add("v6-stable-entry");

          entry.style.display = "flex";
          entry.style.alignItems = "center";
          entry.style.justifyContent = "center";
          entry.style.gap = "6px";

          const beastLink =
          doc.createElement("span");

          beastLink.textContent = beast.name;
          beastLink.style.cursor = "pointer";
          beastLink.style.textDecoration = "underline";

        beastLink.onclick = async (event) => {
  event.preventDefault();
  event.stopPropagation();

  const beastSheet =
    beast.sheet;

  const parentApp =
    [
      ...foundry.applications.api.ApplicationV2.instances()
    ].find(app =>
      app.element === sheet
    );

  if (
    parentApp &&
    beastSheet &&
    typeof parentApp.renderChild === "function"
  ) {

    beastSheet._v6RenderAsChild = true;

try {

  await parentApp.renderChild(
    beastSheet,
    {
      force: true
    }
  );

  /*
   * Give child the same standard dimensions.
   */
  beastSheet.setPosition({
    width: 762,
    height: 778
  });

  v6KillCsbActorChrome(
    beastSheet.element
  );

  v6InstallDetachButton(
    beastSheet
  );

} catch (error) {

  beastSheet._v6RenderAsChild = false;

  console.warn(
    "V6 CHILD RENDER FAILED:",
    beast.name,
    error
  );

}

    return;
  }

  beastSheet?.render(true);
};

          const removeButton =
            doc.createElement("span");

          removeButton.textContent = "×";
          removeButton.title =
            `Remove ${beast.name} from Stable`;

          removeButton.style.cursor = "pointer";
          removeButton.style.fontWeight = "bold";

          removeButton.onclick = async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const currentUuids =
              owner.getFlag(
                "world",
                "v6StableBeasts"
              ) ?? [];

            const newUuids =
              currentUuids.filter(
                savedUuid => savedUuid !== uuid
              );

            await owner.setFlag(
              "world",
              "v6StableBeasts",
              newUuids
            );

            ui.notifications.info(
              `${beast.name} removed from ${owner.name}'s Stable.`
            );
          };

          entry.appendChild(beastLink);
          entry.appendChild(removeButton);

          list.appendChild(entry);
        }
      }

      const dragDrop =
        new foundry.applications.ux.DragDrop({

          dropSelector: ".v6-stable-drop",

          permissions: {
            drop: () => true
          },

          callbacks: {

            drop: async (event) => {

              const data =
                foundry.applications.ux.TextEditor
                  .implementation
                  .getDragEventData(event);

              console.log(
                "V6 AUTO STABLE DROP:",
                data
              );

              if (
                data.type !== "Actor" ||
                !data.uuid
              ) return;

              const beast =
                await fromUuid(data.uuid);

              if (!beast) return;

              const beastTemplate =
                game.actors.getName("Beast");

              if (
                !beastTemplate ||
                beast.system?.template !==
                  beastTemplate.id
              ) {
                ui.notifications.warn(
                  `${beast.name} is not a beast and cannot be placed in ${owner.name}'s Stable.`
                );
                return;
              }

              let currentUuids =
                owner.getFlag(
                  "world",
                  "v6StableBeasts"
                ) ?? [];

              if (
                currentUuids.includes(data.uuid)
              ) {
                ui.notifications.warn(
                  `${beast.name} is already in ${owner.name}'s Stable.`
                );
                return;
              }

              currentUuids = [
                ...currentUuids,
                data.uuid
              ];

              await owner.setFlag(
                "world",
                "v6StableBeasts",
                currentUuids
              );

              ui.notifications.info(
                `${beast.name} added to ${owner.name}'s Stable.`
              );
            }
          }
        });

      dragDrop.bind(stable);

      console.log(
        "V6 AUTO STABLE ARMED:",
        owner.name
      );


    }
  }

  globalThis.v6StableObserver =
    new MutationObserver(() => {
      v6ArmStables();
    });

  globalThis.v6StableObserver.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

  await v6ArmStables();

   /* =========================================
   V6 BEAST — ATTACK 1
   Shift+click = configure
   Click = roll
   ========================================= */

function v6ArmBeastAttack1() {

  const sheets =
  v6GetApplicationRoots();

  for (const sheet of sheets) {

    const button =
      sheet.querySelector(
        '[data-key="BATTACK1"] .custom-system-label-label'
      );

    if (!button) continue;

    const actor =
      game.actors.find(a =>
        sheet.id?.includes(a.id)
      );

    if (!actor) continue;

    /*
     * Refresh visible button name every time this
     * function sees the sheet.
     */
    const props =
      actor.system?.props ?? {};

    const attackName =
      String(
        props.BATTACK1NAME ??
        "ATTACK 1"
      ).trim() || "ATTACK 1";

    if (button.textContent !== attackName) {
        button.textContent = attackName;
      }

   const attackTitle = "";

if (button.title !== attackTitle) {
  button.title = attackTitle;
}

    /*
     * Do not attach another click handler to the
     * same rendered button.
     */
    if (
      button.dataset.v6Attack1Armed === "true"
    ) continue;

    button.dataset.v6Attack1Armed = "true";

    button.style.cursor = "pointer";

    button.onclick = async event => {

      event.preventDefault();
      event.stopPropagation();

      const currentProps =
        actor.system?.props ?? {};


      /* =====================================
         SHIFT+CLICK — CONFIGURE ATTACK
         ===================================== */

      if (event.shiftKey) {

        const currentName =
          String(
            currentProps.BATTACK1NAME ??
            "ATTACK 1"
          ).trim() || "ATTACK 1";

        const currentAttribute =
          String(
            currentProps.BATTACK1ATTRIBUTE ??
            "Nimbleness"
          );

        const currentSkill =
          String(
            currentProps.BATTACK1SKILL ??
            "Brawl"
          );

        const currentDamage =
          Number(
            currentProps.BATTACK1DAMAGE ??
            1
          );

        /*
         * RAW beasts overwhelmingly inflict
         * lethal damage, so undefined defaults
         * to Lethal.
         */
        const currentLethal =
          currentProps.BATTACK1LETHAL !== false &&
          currentProps.BATTACK1LETHAL !== "false";


        /* -----------------------------
           ATTRIBUTE DROPDOWN
           ----------------------------- */

        const attributes = [
          "Muscle",
          "Understanding",
          "Tenacity",
          "Appeal",
          "Nimbleness",
          "Toughness",
          "Senses"
        ];

        const attributeOptions =
          attributes.map(attribute => `
            <option
              value="${attribute}"
              ${
                attribute === currentAttribute
                  ? "selected"
                  : ""
              }
            >
              ${attribute}
            </option>
          `).join("");


        /* -----------------------------
           BEAST SKILL DROPDOWN
           ----------------------------- */

        const skills = [
          {
            key: "Athletics",
            label: "Athletics"
          },
          {
            key: "Brawl",
            label: "Brawl"
          },
          {
            key: "Intimidate",
            label: "Intimidate"
          },
          {
            key: "Notice",
            label: "Notice"
          },
          {
            key: "Stealth",
            label: "Stealth"
          },

          /*
           * Custom skills use their actual
           * displayed names when available.
           */
          {
            key: "Custom1",
            label:
              String(
                currentProps.CustomName1 ??
                "Custom 1"
              ).trim() || "Custom 1"
          },
          {
            key: "Custom2",
            label:
              String(
                currentProps.CustomName2 ??
                "Custom 2"
              ).trim() || "Custom 2"
          },
          {
            key: "Custom3",
            label:
              String(
                currentProps.CustomName3 ??
                "Custom 3"
              ).trim() || "Custom 3"
          },
          {
            key: "Custom4",
            label:
              String(
                currentProps.CustomName4 ??
                "Custom 4"
              ).trim() || "Custom 4"
          }
        ];

        const skillOptions =
          skills.map(skill => `
            <option
              value="${skill.key}"
              ${
                skill.key === currentSkill
                  ? "selected"
                  : ""
              }
            >
              ${foundry.utils.escapeHTML(
                skill.label
              )}
            </option>
          `).join("");


        const result =
          await foundry.applications.api.DialogV2.prompt({

            window: {
              title:
                `${actor.name}: Configure Attack 1`
            },

            content: `
              <div
                style="
                  display:grid;
                  grid-template-columns:100px 1fr;
                  gap:10px;
                  align-items:center;
                  padding:10px;
                "
              >

                <label>
                  <strong>Name:</strong>
                </label>

                <input
                  type="text"
                  name="attackName"
                  value="${foundry.utils.escapeHTML(
                    currentName
                  )}"
                >


                <label>
                  <strong>Attribute:</strong>
                </label>

                <select name="attackAttribute">
                  ${attributeOptions}
                </select>


                <label>
                  <strong>Skill:</strong>
                </label>

                <select name="attackSkill">
                  ${skillOptions}
                </select>


                <label>
                  <strong>Damage:</strong>
                </label>

                <input
                  type="number"
                  name="attackDamage"
                  min="0"
                  step="1"
                  value="${currentDamage}"
                  style="
                    width:70px;
                    text-align:center;
                  "
                >


                <label>
                  <strong>Lethal:</strong>
                </label>

                <input
                  type="checkbox"
                  name="attackLethal"
                  ${currentLethal ? "checked" : ""}
                >

              </div>
            `,

            ok: {
              label: "SAVE",

              callback:
                (event, dialogButton, dialog) => {

                  const root =
                    dialog.element;

                  return {

                    name:
                      root.querySelector(
                        '[name="attackName"]'
                      )?.value.trim() ||
                      "ATTACK 1",

                    attribute:
                      root.querySelector(
                        '[name="attackAttribute"]'
                      )?.value ||
                      "Nimbleness",

                    skill:
                      root.querySelector(
                        '[name="attackSkill"]'
                      )?.value ||
                      "Brawl",

                    damage:
                      Number(
                        root.querySelector(
                          '[name="attackDamage"]'
                        )?.value ?? 0
                      ),

                    lethal:
                      root.querySelector(
                        '[name="attackLethal"]'
                      )?.checked === true
                  };
                }
            }
          });


        if (!result) return;


        const savedDamage =
          Math.max(
            0,
            Math.floor(
              Number(result.damage) || 0
            )
          );


        await actor.update({

          "system.props.BATTACK1NAME":
            result.name,

          "system.props.BATTACK1ATTRIBUTE":
            result.attribute,

          "system.props.BATTACK1SKILL":
            result.skill,

          "system.props.BATTACK1DAMAGE":
            savedDamage,

          "system.props.BATTACK1LETHAL":
            result.lethal
        });


        /*
         * Change the visible steel button
         * immediately instead of waiting for
         * the sheet to rerender.
         */
        if (button.textContent !== result.name) {
              button.textContent = result.name;
            }

         const editToggle =
  		sheet.querySelector(
    		'input[name="system.props.WeaponEdit"]'
  	);

	const savedTitle =
  		editToggle?.checked === true
    		? `${result.name} — Shift+click to configure`
    		: "";

	if (button.title !== savedTitle) {
  	button.title = savedTitle;
		}

        return;
      }


      /* =====================================
         NORMAL CLICK — ROLL ATTACK
         ===================================== */

      const name =
        String(
          currentProps.BATTACK1NAME ??
          "ATTACK 1"
        ).trim() || "ATTACK 1";


      const attributeKey =
        String(
          currentProps.BATTACK1ATTRIBUTE ??
          "Nimbleness"
        );


      const skillKey =
        String(
          currentProps.BATTACK1SKILL ??
          "Brawl"
        );


      const baseDamage =
        Math.max(
          0,
          Number(
            currentProps.BATTACK1DAMAGE ??
            1
          )
        );


      const lethal =
        currentProps.BATTACK1LETHAL !== false &&
        currentProps.BATTACK1LETHAL !== "false";


      const damageType =
        lethal
          ? "L"
          : "NL";


      /*
       * Attribute supplies the dice pool.
       */
      let pool =
        Number(
          currentProps[attributeKey] ??
          0
        );


      /*
       * Attribute values above 5 become
       * automatic Successes, matching the
       * existing V6 Roll Engine behavior.
       */
      let autoSuccesses = 0;

      if (pool > 5) {
        autoSuccesses =
          pool - 5;

        pool = 5;
      }


      /*
       * Selected Beast skill supplies
       * Skill Points.
       */
      const skill =
        Number(
          currentProps[skillKey] ??
          0
        );


      const rollEngine =
        game.macros.getName(
          "V6 Roll Engine"
        );


      if (!rollEngine) {
        ui.notifications.error(
          "V6 Roll Engine macro not found."
        );

        return;
      }


      await rollEngine.execute({

        pool,
        autoSuccesses,

        name,

        skill,

        props: currentProps,

        actorId: actor.id,

        baseDamage,

        damageType
      });
    };
  }
}


/* =========================================
   V6 BEAST — ATTACK 1 STARTUP OBSERVER
   ========================================= */

if (globalThis.v6BeastAttack1Observer) {
  globalThis.v6BeastAttack1Observer.disconnect();
}

globalThis.v6BeastAttack1Observer =
  new MutationObserver(() => {

    v6ArmBeastAttack1();

  });

globalThis.v6BeastAttack1Observer.observe(
  document.body,
  {
    childList: true,
    subtree: true
  }
);

v6ArmBeastAttack1();

      /* =========================================
   V6 BEAST — ATTACK 2
   Shift+click = configure
   Click = roll
   ========================================= */

function v6ArmBeastAttack2() {

  const sheets =
  v6GetApplicationRoots();
	
  for (const sheet of sheets) {

    const button =
      sheet.querySelector(
        '[data-key="BATTACK2"] .custom-system-label-label'
      );

    if (!button) continue;

    const actor =
      game.actors.find(a =>
        sheet.id?.includes(a.id)
      );

    if (!actor) continue;

    /*
     * Refresh visible button name every time this
     * function sees the sheet.
     */
    const props =
      actor.system?.props ?? {};

    const attackName =
      String(
        props.BATTACK2NAME ??
        "ATTACK 2"
      ).trim() || "ATTACK 2";

    if (button.textContent !== attackName) {
        button.textContent = attackName;
      }

   const attackTitle = "";

if (button.title !== attackTitle) {
  button.title = attackTitle;
}
    /*
     * Do not attach another click handler to the
     * same rendered button.
     */
    if (
      button.dataset.v6Attack2Armed === "true"
    ) continue;

    button.dataset.v6Attack2Armed = "true";

    button.style.cursor = "pointer";

    button.onclick = async event => {

      event.preventDefault();
      event.stopPropagation();

      const currentProps =
        actor.system?.props ?? {};


      /* =====================================
         SHIFT+CLICK — CONFIGURE ATTACK
         ===================================== */

      if (event.shiftKey) {

        const currentName =
          String(
            currentProps.BATTACK2NAME ??
            "ATTACK 2"
          ).trim() || "ATTACK 2";

        const currentAttribute =
          String(
            currentProps.BATTACK2ATTRIBUTE ??
            "Nimbleness"
          );

        const currentSkill =
          String(
            currentProps.BATTACK2SKILL ??
            "Brawl"
          );

        const currentDamage =
          Number(
            currentProps.BATTACK2DAMAGE ??
            1
          );

        /*
         * RAW beasts overwhelmingly inflict
         * lethal damage, so undefined defaults
         * to Lethal.
         */
        const currentLethal =
          currentProps.BATTACK2LETHAL !== false &&
          currentProps.BATTACK2LETHAL !== "false";


        /* -----------------------------
           ATTRIBUTE DROPDOWN
           ----------------------------- */

        const attributes = [
          "Muscle",
          "Understanding",
          "Tenacity",
          "Appeal",
          "Nimbleness",
          "Toughness",
          "Senses"
        ];

        const attributeOptions =
          attributes.map(attribute => `
            <option
              value="${attribute}"
              ${
                attribute === currentAttribute
                  ? "selected"
                  : ""
              }
            >
              ${attribute}
            </option>
          `).join("");


        /* -----------------------------
           BEAST SKILL DROPDOWN
           ----------------------------- */

        const skills = [
          {
            key: "Athletics",
            label: "Athletics"
          },
          {
            key: "Brawl",
            label: "Brawl"
          },
          {
            key: "Intimidate",
            label: "Intimidate"
          },
          {
            key: "Notice",
            label: "Notice"
          },
          {
            key: "Stealth",
            label: "Stealth"
          },

          /*
           * Custom skills use their actual
           * displayed names when available.
           */
          {
            key: "Custom1",
            label:
              String(
                currentProps.CustomName1 ??
                "Custom 1"
              ).trim() || "Custom 1"
          },
          {
            key: "Custom2",
            label:
              String(
                currentProps.CustomName2 ??
                "Custom 2"
              ).trim() || "Custom 2"
          },
          {
            key: "Custom3",
            label:
              String(
                currentProps.CustomName3 ??
                "Custom 3"
              ).trim() || "Custom 3"
          },
          {
            key: "Custom4",
            label:
              String(
                currentProps.CustomName4 ??
                "Custom 4"
              ).trim() || "Custom 4"
          }
        ];

        const skillOptions =
          skills.map(skill => `
            <option
              value="${skill.key}"
              ${
                skill.key === currentSkill
                  ? "selected"
                  : ""
              }
            >
              ${foundry.utils.escapeHTML(
                skill.label
              )}
            </option>
          `).join("");


        const result =
          await foundry.applications.api.DialogV2.prompt({

            window: {
              title:
                `${actor.name}: Configure Attack 2`
            },

            content: `
              <div
                style="
                  display:grid;
                  grid-template-columns:100px 1fr;
                  gap:10px;
                  align-items:center;
                  padding:10px;
                "
              >

                <label>
                  <strong>Name:</strong>
                </label>

                <input
                  type="text"
                  name="attackName"
                  value="${foundry.utils.escapeHTML(
                    currentName
                  )}"
                >


                <label>
                  <strong>Attribute:</strong>
                </label>

                <select name="attackAttribute">
                  ${attributeOptions}
                </select>


                <label>
                  <strong>Skill:</strong>
                </label>

                <select name="attackSkill">
                  ${skillOptions}
                </select>


                <label>
                  <strong>Damage:</strong>
                </label>

                <input
                  type="number"
                  name="attackDamage"
                  min="0"
                  step="1"
                  value="${currentDamage}"
                  style="
                    width:70px;
                    text-align:center;
                  "
                >


                <label>
                  <strong>Lethal:</strong>
                </label>

                <input
                  type="checkbox"
                  name="attackLethal"
                  ${currentLethal ? "checked" : ""}
                >

              </div>
            `,

            ok: {
              label: "SAVE",

              callback:
                (event, dialogButton, dialog) => {

                  const root =
                    dialog.element;

                  return {

                    name:
                      root.querySelector(
                        '[name="attackName"]'
                      )?.value.trim() ||
                      "ATTACK 2",

                    attribute:
                      root.querySelector(
                        '[name="attackAttribute"]'
                      )?.value ||
                      "Nimbleness",

                    skill:
                      root.querySelector(
                        '[name="attackSkill"]'
                      )?.value ||
                      "Brawl",

                    damage:
                      Number(
                        root.querySelector(
                          '[name="attackDamage"]'
                        )?.value ?? 0
                      ),

                    lethal:
                      root.querySelector(
                        '[name="attackLethal"]'
                      )?.checked === true
                  };
                }
            }
          });


        if (!result) return;


        const savedDamage =
          Math.max(
            0,
            Math.floor(
              Number(result.damage) || 0
            )
          );


        await actor.update({

          "system.props.BATTACK2NAME":
            result.name,

          "system.props.BATTACK2ATTRIBUTE":
            result.attribute,

          "system.props.BATTACK2SKILL":
            result.skill,

          "system.props.BATTACK2DAMAGE":
            savedDamage,

          "system.props.BATTACK2LETHAL":
            result.lethal
        });


        /*
         * Change the visible steel button
         * immediately instead of waiting for
         * the sheet to rerender.
         */
        if (button.textContent !== result.name) {
              button.textContent = result.name;
            }

         const editToggle =
  		sheet.querySelector(
    		'input[name="system.props.WeaponEdit"]'
  	);

	const savedTitle =
  		editToggle?.checked === true
    		? `${result.name} — Shift+click to configure`
    		: "";

if (button.title !== savedTitle) {
  button.title = savedTitle;
}

        return;
      }


      /* =====================================
         NORMAL CLICK — ROLL ATTACK
         ===================================== */

      const name =
        String(
          currentProps.BATTACK2NAME ??
          "ATTACK 2"
        ).trim() || "ATTACK 2";


      const attributeKey =
        String(
          currentProps.BATTACK2ATTRIBUTE ??
          "Nimbleness"
        );


      const skillKey =
        String(
          currentProps.BATTACK2SKILL ??
          "Brawl"
        );


      const baseDamage =
        Math.max(
          0,
          Number(
            currentProps.BATTACK2DAMAGE ??
            1
          )
        );


      const lethal =
        currentProps.BATTACK2LETHAL !== false &&
        currentProps.BATTACK2LETHAL !== "false";


      const damageType =
        lethal
          ? "L"
          : "NL";


      /*
       * Attribute supplies the dice pool.
       */
      let pool =
        Number(
          currentProps[attributeKey] ??
          0
        );


      /*
       * Attribute values above 5 become
       * automatic Successes, matching the
       * existing V6 Roll Engine behavior.
       */
      let autoSuccesses = 0;

      if (pool > 5) {
        autoSuccesses =
          pool - 5;

        pool = 5;
      }


      /*
       * Selected Beast skill supplies
       * Skill Points.
       */
      const skill =
        Number(
          currentProps[skillKey] ??
          0
        );


      const rollEngine =
        game.macros.getName(
          "V6 Roll Engine"
        );


      if (!rollEngine) {
        ui.notifications.error(
          "V6 Roll Engine macro not found."
        );

        return;
      }


      await rollEngine.execute({

        pool,
        autoSuccesses,

        name,

        skill,

        props: currentProps,

        actorId: actor.id,

        baseDamage,

        damageType
      });
    };
  }
}


/* =========================================
   V6 BEAST — ATTACK 2 STARTUP OBSERVER
   ========================================= */

if (globalThis.v6BeastAttack2Observer) {
  globalThis.v6BeastAttack2Observer.disconnect();
}

globalThis.v6BeastAttack2Observer =
  new MutationObserver(() => {

    v6ArmBeastAttack2();

  });

globalThis.v6BeastAttack2Observer.observe(
  document.body,
  {
    childList: true,
    subtree: true
  }
);

v6ArmBeastAttack2();

/* =========================================
   V6 ACTOR IDENTITY SYNC
   Sheet Name / Portrait -> Native Foundry Actor
   ========================================= */

globalThis.v6IdentitySyncing ??=
  new WeakSet();

function v6GetActorIdentity(actor) {

  if (
    !actor ||
    actor.documentName !== "Actor"
  ) return null;

  const props =
    actor.system?.props ?? {};

  const characterTemplate =
    game.actors.getName("Character");

  const vehicleTemplate =
    game.actors.getName("Vehicle");

  const beastTemplate =
    game.actors.getName("Beast");

  const templateId =
    actor.system?.template;

  const isCharacter =
    characterTemplate &&
    templateId === characterTemplate.id;

  const isVehicle =
    vehicleTemplate &&
    templateId === vehicleTemplate.id;

  const isBeast =
    beastTemplate &&
    templateId === beastTemplate.id;

  if (
    !isCharacter &&
    !isVehicle &&
    !isBeast
  ) return null;

  const name =
    String(
      props.chName ?? ""
    ).trim();

  const rawImage =
    isVehicle
      ? props.VPic
      : props.Pic;

  const img =
    typeof rawImage === "string"
      ? rawImage.trim()
      : String(
          rawImage?.path ??
          rawImage?.src ??
          rawImage?.img ??
          ""
        ).trim();

  return {
    name,
    img
  };
}


async function v6SyncActorIdentity(actor) {

  if (
    globalThis.v6IdentitySyncing.has(actor)
  ) return;

  const identity =
    v6GetActorIdentity(actor);

  if (!identity) return;

  const updates = {};

  if (
    identity.name &&
    actor.name !== identity.name
  ) {
    updates.name =
      identity.name;
  }

  if (
    identity.img &&
    actor.img !== identity.img
  ) {
    updates.img =
      identity.img;
  }

  if (
    Object.keys(updates).length === 0
  ) return;

  globalThis.v6IdentitySyncing.add(actor);

  try {

    await actor.update(updates);

    console.log(
      "V6 ACTOR IDENTITY SYNC:",
      identity.name || actor.name
    );

  } finally {

    globalThis.v6IdentitySyncing.delete(actor);

  }
}


/*
 * Keep native Foundry Actor identity synchronized
 * whenever CSB Actor data changes.
 */
Hooks.on(
  "updateActor",
  async actor => {

    await v6SyncActorIdentity(actor);

  }
);


/*
 * Synchronize actors that already existed
 * when the world loaded.
 */
for (const actor of game.actors) {

  void v6SyncActorIdentity(actor);

}
	
 /* =========================================
   AUTO-PRONE / VEHICLE WRECKED AT ZERO HEALTH
   ========================================= */

Hooks.on("updateActor", async (actor, changes) => {

  const characterTemplate =
  game.actors.getName("Character");

  const vehicleTemplate =
    game.actors.getName("Vehicle");

  const isCharacter =
    characterTemplate &&
    actor.system?.template === characterTemplate.id;

  const isVehicle =
    vehicleTemplate &&
    actor.system?.template === vehicleTemplate.id;

  if (!isCharacter && !isVehicle) return;


  const healthWasChanged =
    foundry.utils.hasProperty(
      changes,
      "system.props.Health"
    ) ||
    Object.prototype.hasOwnProperty.call(
      changes,
      "system.props.Health"
    );

  if (!healthWasChanged) return;


  const health =
    Number(actor.system?.props?.Health ?? 0);

  const prone =
    actor.system?.props?.PRONE === true;


  /* CHARACTER:
     Same behavior as before.
     At 0 Health, automatically go prone.
  */

  if (isCharacter) {

    if (health <= 0 && !prone) {
      await actor.update({
        "system.props.PRONE": true
      });
    }

    return;
  }


  /* VEHICLE:
     PRONE means WRECKED / UPSIDE DOWN.
     It is entirely controlled by Health.
  */

  if (isVehicle) {

    const shouldBeWrecked =
      health <= 0;

    if (prone !== shouldBeWrecked) {
      await actor.update({
        "system.props.PRONE": shouldBeWrecked
      });
    }
  }
});


	
	/* =========================================
   V6 EMBEDDED ITEM LINKS
   Open Items as children of their Actor sheet
   ========================================= */

function v6ArmEmbeddedItemLinks(app) {

  const root =
    app?.element;

  if (
    !root ||
    typeof root.querySelector !== "function"
  ) return;

  if (
    root.dataset.v6ItemLinksArmed === "true"
  ) return;

  root.dataset.v6ItemLinksArmed = "true";

  root.addEventListener(
    "click",
    async event => {

      const link =
        event.target?.closest?.(
          ".content-link"
        );

      if (
        !link ||
        !root.contains(link)
      ) return;

      const uuid =
        link.dataset?.uuid ??
        link.getAttribute("data-uuid") ??
        "";

      /*
       * Only take over Item links.
       * Leave Actor, Journal, etc. links alone.
       */
      if (
        !uuid ||
        !/(^|\.)Item\./.test(uuid)
      ) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const item =
        await fromUuid(uuid);

      if (
        !item ||
        item.documentName !== "Item"
      ) return;

      const itemSheet =
        item.sheet;

      if (
        !itemSheet ||
        typeof app.renderChild !== "function"
      ) return;

      itemSheet._v6RenderAsChild = true;

      try {

        await app.renderChild(
  itemSheet,
  {
    force: true
  }
);

/*
 * Restore the Item sheet's own default dimensions
 * instead of inheriting the Actor sheet size.
 */
const itemPosition =
  itemSheet.options?.position ?? {};

const itemWidth =
  Number(
    itemPosition.width ??
    itemSheet.position?.width ??
    0
  );

itemSheet.setPosition({
  width:
    Math.max(
      580,
      itemWidth
    ),

  height:
    itemPosition.height ??
    itemSheet.position?.height
});

v6InstallDetachButton(
  itemSheet
);

      } catch (error) {

        itemSheet._v6RenderAsChild = false;

        console.warn(
          "V6 ITEM CHILD RENDER FAILED:",
          item.name,
          error
        );

      }
    },
    true
  );
}
	
	/* =========================================
   V6 AUTO POP-OUT — ACTOR SHEETS TEST
   ========================================= */

Hooks.on("renderApplicationV2", async (app, element) => {

  const actor =
    app.actor ??
    app.document;

  if (
  !actor ||
  actor.documentName !== "Actor"
) return;

/*
 * Kill CSB's native Name / Template /
 * template-control chrome on every render.
 */
v6KillCsbActorChrome(app.element);
v6InstallTemplateControls(app);
v6ArmEmbeddedItemLinks(app);
v6ArmSheetPhotoPicker(app);
v6ApplyPhotoZoom(app);
/*
 * V6 CROSS-WINDOW INITIALIZATION
 * Re-arm all actor-sheet enhancements whether
 * this sheet lives in Foundry, inside another
 * detached sheet, or in its own browser window.
 */

v6SetCharacterSheetSize();

v6RefreshCustomSkillTape1();
v6RefreshRemainingCustomSkillTapes();

v6FindHealthDials();
v6FindSkillDrums();

void v6ArmGarages();
void v6ArmStables();

v6ArmBeastAttack1();
v6ArmBeastAttack2();
if (app._v6RenderAsChild === true) {

  app.setPosition({
    width: 762,
    height: 778
  });

  v6InstallDetachButton(app);

  return;
}
  const characterTemplate =
    game.actors.getName("Character");

  const vehicleTemplate =
    game.actors.getName("Vehicle");

  const beastTemplate =
    game.actors.getName("Beast");

  const validTemplateIds =
    new Set(
      [
        characterTemplate?.id,
        vehicleTemplate?.id,
        beastTemplate?.id
      ].filter(Boolean)
    );

  if (
    !validTemplateIds.has(
      actor.system?.template
    )
  ) return;

  /*
 * Only detach applications currently rendered
 * inside the main Foundry browser document.
 *
 * If already detached, its element belongs to
 * the detached window's document instead.
 */
const currentRoot = app.element;

if (!currentRoot) return;

if (currentRoot.ownerDocument !== document) {
  return;
}

/*
 * ApplicationV2 only.
 */
if (
  typeof app.detachWindow !== "function"
) return;
  try {

    await app.detachWindow();
	  	const detachedRoot = app.element;

if (detachedRoot) {

  const v6RefreshDetachedChrome = () => {

  v6KillCsbActorChrome(
    detachedRoot
  );

};

  const detachedObserver =
    new MutationObserver(() => {

      v6RefreshDetachedChrome();

      v6ArmBeastAttack1();
      v6ArmBeastAttack2();

    });

  detachedObserver.observe(
    detachedRoot,
    {
      childList: true,
      subtree: true
    }
  );

  app._v6DetachedObserver =
    detachedObserver;

  v6RefreshDetachedChrome();

  v6ApplyPhotoZoom(app);
	
  v6ArmBeastAttack1();
  v6ArmBeastAttack2();
	
}

    console.log(
      "V6 AUTO POP-OUT:",
      actor.name
    );

  } catch (error) {

    console.warn(
      "V6 AUTO POP-OUT FAILED:",
      actor.name,
      error
    );

  }
});
	
  /* =========================================
     STARTUP COMPLETE
     ========================================= */


});
/* =========================================
   V6 ACTOR DIRECTORY — ADD TO COMBAT
   Tokenless Character / Beast combatants
   ========================================= */

const v6CombatAddsInProgress = new Set();

async function v6AddActorToCombat(actor) {
	
  if (
    !actor ||
    actor.documentName !== "Actor"
  ) return;
	
  if (v6CombatAddsInProgress.has(actor.id)) return;

v6CombatAddsInProgress.add(actor.id);
	
  const characterTemplate =
    game.actors.getName("Character");

  const beastTemplate =
    game.actors.getName("Beast");

  const validTemplateIds =
    new Set(
      [
        characterTemplate?.id,
        beastTemplate?.id
      ].filter(Boolean)
    );

  if (
    !validTemplateIds.has(
      actor.system?.template
    )
  ) return;


  let combat =
    game.combat;

  if (!combat) {

    combat =
      await foundry.documents.Combat.create({
        name: "Combat"
      });
  }


 if (
  combat.getCombatantsByActor(actor).length > 0
) {
  return;
}


  try {

  await combat.createEmbeddedDocuments(
    "Combatant",
    [
      {
        actorId: actor.id
      }
    ]
  );

  ui.notifications.info(
    `${actor.name} added to combat.`
  );

} finally {

  v6CombatAddsInProgress.delete(actor.id);
}
}

Hooks.on(
  "getActorContextOptions",
  (application, menuItems) => {

    menuItems.push({

      name: "Add to Combat",

      icon:
        '<i class="fa-solid fa-swords"></i>',

      condition: element => {

  const actorId =
    element.dataset?.entryId ??
    element.dataset?.documentId ??
    element.dataset?.actorId;

  const actor =
    game.actors.get(actorId);

  if (!actor) return false;

  const characterTemplate =
    game.actors.getName("Character");

  const beastTemplate =
    game.actors.getName("Beast");

  return (
    actor.system?.template === characterTemplate?.id ||
    actor.system?.template === beastTemplate?.id
  );
},

      callback: async element => {

        const actorId =
          element.dataset?.entryId ??
          element.dataset?.documentId ??
          element.dataset?.actorId;

        const actor =
          game.actors.get(actorId);

        await v6AddActorToCombat(actor);
      }

    });
  }
);

/* =========================================
   V6 COMBAT — MAJOR / MINOR INITIATIVE TIES
   Equal initiative: Major acts before Minor
   ========================================= */

const v6OriginalCombatSort =
  foundry.documents.Combat.prototype._sortCombatants;

foundry.documents.Combat.prototype._sortCombatants =
  function(a, b) {

    const normalSort =
      v6OriginalCombatSort.call(this, a, b);

    /*
     * Only intervene when both combatants have
     * the same actual initiative score.
     */
    if (
      a.initiative === null ||
      a.initiative === undefined ||
      b.initiative === null ||
      b.initiative === undefined ||
      a.initiative !== b.initiative
    ) {
      return normalSort;
    }

    const aMinor =
      a.actor?.system?.props?.Minor === true;

    const bMinor =
      b.actor?.system?.props?.Minor === true;

    /*
     * Same classification:
     * leave Foundry's normal tie-break alone.
     */
    if (aMinor === bMinor) {

  const aName =
    String(a.actor?.name ?? a.name ?? "");

  const bName =
    String(b.actor?.name ?? b.name ?? "");

  return aName.localeCompare(
    bName,
    undefined,
    {
      sensitivity: "base"
    }
  );
}

    /*
     * Major = Minor unchecked.
     * Major sorts ahead of Minor.
     */
    return aMinor ? 1 : -1;
  };
/* =========================================================
   V6 VEHICLE WEAPONS — LINKED WEAPON DROPDOWN
   ========================================================= */

Hooks.on("renderApplicationV2", (app, element) => {

    const item = app.item ?? app.document;

    if (!item || item.documentName !== "Item") return;

    const root =
  element &&
  typeof element.querySelector === "function"
    ? element
    : app.element;

if (!root) return;

const doc =
  root.ownerDocument;

    const select =
        root.querySelector('[data-key="LNKDWPN"] select');

    // Not one of our Vehicle Weapon sheets
    if (!select) return;

    console.log("V6 LINKED WEAPON SHEET FOUND:", item.name);

    const vehicle = item.parent;

    console.log("V6 LINK OWNER:", vehicle);

    if (!vehicle || vehicle.documentName !== "Actor") {
        select.innerHTML =
            '<option value="">— Mount weapon on vehicle first —</option>';

        return;
    }

    const currentValue =
        item.system?.props?.LNKDWPN ?? "";

    const weapons =
    vehicle.items
        .filter(other => {

            // Don't link weapon to itself
            if (other.id === item.id) return false;

            const props =
                other.system?.props ?? {};

            const partnerId =
                props.LNKDWPN ?? "";

            /*
             * Exclude weapons already paired
             * with some third weapon.
             */
            if (
                partnerId &&
                partnerId !== item.id
            ) {
                return false;
            }

            return (
                Object.hasOwn(props, "LINKD") ||
                Object.hasOwn(props, "LNKDWPN")
            );
        })
            .sort(
                (a, b) =>
                    a.name.localeCompare(b.name)
            );

    console.log(
        "V6 LINKABLE WEAPONS:",
        weapons.map(w => ({
            name: w.name,
            id: w.id
        }))
    );

    select.replaceChildren();

    const none =
        doc.createElement("option");

    none.value = "";
    none.textContent = "— None —";

    select.appendChild(none);

    for (const weapon of weapons) {

        const option =
            doc.createElement("option");

        option.value = weapon.id;
        option.textContent = weapon.name;

        select.appendChild(option);
    }

    if (
        weapons.some(
            weapon => weapon.id === currentValue
        )
    ) {
        select.value = currentValue;
    }

if (!select.dataset.v6LinkedBound) {

    select.dataset.v6LinkedBound = "true";

    select.addEventListener(
        "change",
        async event => {

            const newPartnerId =
                event.currentTarget.value;

            const oldPartnerId =
                item.system?.props?.LNKDWPN ?? "";

            if (newPartnerId === oldPartnerId) return;

            const oldPartner =
                oldPartnerId
                    ? vehicle.items.get(oldPartnerId)
                    : null;

            const newPartner =
                newPartnerId
                    ? vehicle.items.get(newPartnerId)
                    : null;

            /*
             * Don't allow a weapon that is already
             * linked to somebody else.
             */
            if (newPartner) {

                const theirPartnerId =
                    newPartner.system?.props?.LNKDWPN ?? "";

                if (
                    theirPartnerId &&
                    theirPartnerId !== item.id
                ) {
                    const theirPartner =
                        vehicle.items.get(theirPartnerId);

                    ui.notifications.warn(
                        `${newPartner.name} is already linked to `
                        + `${theirPartner?.name ?? "another weapon"}.`
                    );

                    event.currentTarget.value =
                        oldPartnerId;

                    return;
                }
            }

            const updates = [];

            /*
             * Break the old pair from both ends.
             */
            if (
                oldPartner &&
                oldPartner.system?.props?.LNKDWPN === item.id
            ) {
                updates.push(
                    oldPartner.update({
                      "system.props.LNKDWPN": "",
                      "system.props.LINKD": false,
                      "flags.world.v6LinkedPrimary": false
                     })
                );
            }

            /*
             * Update this weapon.
             */
            updates.push(
                item.update({
                   "system.props.LNKDWPN":
                       newPartnerId,

                   "system.props.LINKD":
                       Boolean(newPartnerId),

                   "flags.world.v6LinkedPrimary":
                       Boolean(newPartnerId)
               })
            );

            /*
             * Create reciprocal link.
             */
            if (newPartner) {
                updates.push(
                    newPartner.update({
                      "system.props.LNKDWPN":
                          item.id,

                      "system.props.LINKD":
                          true,

                      "flags.world.v6LinkedPrimary":
                          false
                  })
                );
            }

            await Promise.all(updates);
        }
    );
}
});

/* =========================================================
   V6 VEHICLE WEAPONS — LINKED PAIR DISPLAY
   ========================================================= */

Hooks.on("renderApplicationV2", (app, element) => {

    const actor =
        app.actor ?? app.document;

    if (
        !actor ||
        actor.documentName !== "Actor"
    ) return;

    const vehicleTemplate =
        game.actors.getName("Vehicle");

    if (
        !vehicleTemplate ||
        actor.system?.template !== vehicleTemplate.id
    ) return;

    const root =
  element &&
  typeof element.querySelector === "function"
    ? element
    : app.element;
    if (!root) return;
	const doc =
  root.ownerDocument;
	
    const weaponDrop =
        root.querySelector(
            '[data-key="WEAPONSDROP"]'
        );

    if (!weaponDrop) return;

    const rows =
        Array.from(
            weaponDrop.querySelectorAll(
                "tr.custom-system-dynamicRow"
            )
        );

    if (rows.length === 0) return;


    /*
     * Find which embedded Item belongs to each
     * CSB weapon-list row.
     */
    const rowsByItemId =
        new Map();

    for (const row of rows) {

        row.classList.remove(
            "v6-linked-secondary"
        );

        row.querySelectorAll(
            ".v6-linked-branch"
        ).forEach(branch => branch.remove());

        const link =
            row.querySelector(".content-link");

        if (!link) continue;

        const uuid =
            link.dataset?.uuid ??
            link.getAttribute("data-uuid") ??
            "";

        let itemId = "";

        if (uuid) {
            itemId =
                uuid.split(".").at(-1);
        }

        if (!itemId) {
            itemId =
                link.dataset?.id ??
                row.dataset?.itemId ??
                "";
        }

        if (!itemId) continue;

        rowsByItemId.set(
            itemId,
            row
        );
    }


    /*
     * Put each secondary weapon directly beneath
     * its primary weapon.
     */
    for (const primary of actor.items) {

        const isPrimary =
            primary.getFlag(
                "world",
                "v6LinkedPrimary"
            ) === true;

        if (!isPrimary) continue;

        const secondaryId =
            primary.system?.props?.LNKDWPN ?? "";

        if (!secondaryId) continue;

        const primaryRow =
            rowsByItemId.get(primary.id);

        const secondaryRow =
            rowsByItemId.get(secondaryId);

        if (
            !primaryRow ||
            !secondaryRow
        ) continue;

        /*
         * Move the existing row.
         * We are NOT creating a duplicate.
         */
        primaryRow.insertAdjacentElement(
            "afterend",
            secondaryRow
        );

        secondaryRow.classList.add(
            "v6-linked-secondary"
        );

        const secondaryLink =
            secondaryRow.querySelector(
                ".content-link"
            );

        if (!secondaryLink) continue;

        const branch =
            doc.createElement("span");

        branch.classList.add(
            "v6-linked-branch"
        );

        branch.textContent = "└ ";

        branch.style.marginRight = "2px";

        secondaryLink.insertAdjacentElement(
            "beforebegin",
            branch
        );
    }
});
