/* =========================================
   V6 STARTUP
   Health Dial Automation
   ========================================= */

Hooks.once("ready", () => {

  console.log("V6 STARTUP — SORK");

  globalThis.v6HealthDialObservers = new Map();

  function v6SetHealthNeedle(sheet, actor) {
    const health = Number(actor.system.props.Health ?? 0);
    const maxHealth = Number(actor.system.props.MAXHEALTH ?? 0);

    if (maxHealth <= 0) return;

    const needle = sheet.querySelector(".v6-health-dial-needle img");
    if (!needle) return;

    const ratio = Math.max(0, Math.min(1, health / maxHealth));
    const angle = -90 + (180 * ratio);

    needle.style.transform =
      `translateX(-50%) rotate(${angle}deg)`;

    needle.style.transformOrigin = "50% 50%";
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

  ui.notifications.info("V6 Startup — SORK");
});
