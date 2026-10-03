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
    const maxHealth = Number(props.MAXHEALTH ?? 0);

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
  function v6ArmHealthDial(sheet, actor) {
    v6SetHealthNeedle(sheet, actor);

    const observer = new MutationObserver(() => {
      v6SetHealthNeedle(sheet, actor);
    });

    observer.observe(sheet, {
      childList: true,
      subtree: true
    });

    globalThis.v6HealthDialObservers.set(sheet, observer);

    sheet.dataset.v6HealthDialArmed = "true";

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

      ui.notifications.info(
        `V6 detected ${owner.name}'s Garage.`
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

      ui.notifications.info(
        `V6 detected ${owner.name}'s Stable.`
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

  ui.notifications.info("V6 Startup — SORK");
});
