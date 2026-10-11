/* =========================================
   V6 STARTUP
   Health Dial + Garage + Stable Automation
   ========================================= */

Hooks.once("ready", async () => {

  console.log("V6 STARTUP — SORK");


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

  const needle = sheet.querySelector(".v6-health-dial-needle img");
  if (!needle) return;

  const ratio = Math.max(0, Math.min(1, health / maxHealth));
  const angle = -90 + (180 * ratio);

  needle.style.setProperty(
    "transform",
    `rotate(${angle}deg)`,
    "important"
  );

  needle.style.setProperty(
    "transform-origin",
    "50% 50%",
    "important"
  );
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
   
async function v6OpenHealthDialog(actor) {
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

  await foundry.applications.api.DialogV2.wait({
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
              game.actors.getName("Wrench");

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
              game.actors.getName("Wrench");

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
      },

      {
        action: "continuing",
        label: "CONTINUING DAMAGE",

        callback: async () => {
          await foundry.applications.api.DialogV2.wait({
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

            close: () => null
          });
        }
      },

      {
        action: "close",
        label: "Close"
      }
    ],

    close: () => null
  });
}

   
  function v6ArmHealthDial(sheet, actor) {
    v6SetHealthNeedle(sheet, actor);
    v6SetNonLethalBar(sheet, actor);  
     const healthDial = sheet.querySelector('[data-key="HEALTHDIAL"]');

if (healthDial) {
  healthDial.style.cursor = "pointer";

  healthDial.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    v6OpenHealthDialog(actor);
  };
}
     
    const observer = new MutationObserver(() => {
      v6SetHealthNeedle(sheet, actor);
      v6SetNonLethalBar(sheet, actor);  
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
    const sheets = [...document.querySelectorAll(".application")];

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
     GARAGE
     ========================================= */

  if (globalThis.v6GarageObserver) {
    globalThis.v6GarageObserver.disconnect();
  }

  globalThis.v6ArmedGarages = new WeakSet();

  async function v6ArmGarages() {

    const garages =
      document.querySelectorAll(".v6-garage-drop");

    for (const garage of garages) {

      if (globalThis.v6ArmedGarages.has(garage)) continue;

      globalThis.v6ArmedGarages.add(garage);

      const sheet = garage.closest(".application");

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
        list = document.createElement("div");
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
            document.createElement("div");

          entry.classList.add("v6-garage-entry");

          entry.style.display = "flex";
          entry.style.alignItems = "center";
          entry.style.justifyContent = "center";
          entry.style.gap = "6px";

          const vehicleLink =
            document.createElement("span");

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

            vehicle.sheet.render(true);
          };

          const removeButton =
            document.createElement("span");

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
      document.querySelectorAll(".v6-stable-drop");

    for (const stable of stables) {

      if (globalThis.v6ArmedStables.has(stable)) continue;

      globalThis.v6ArmedStables.add(stable);

      const sheet = stable.closest(".application");

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
        list = document.createElement("div");
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
            document.createElement("div");

          entry.classList.add("v6-stable-entry");

          entry.style.display = "flex";
          entry.style.alignItems = "center";
          entry.style.justifyContent = "center";
          entry.style.gap = "6px";

          const beastLink =
            document.createElement("span");

          beastLink.textContent = beast.name;
          beastLink.style.cursor = "pointer";
          beastLink.style.textDecoration = "underline";

          beastLink.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();

            beast.sheet.render(true);
          };

          const removeButton =
            document.createElement("span");

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
     STARTUP COMPLETE
     ========================================= */


});
