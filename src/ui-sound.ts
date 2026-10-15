import { $ } from "./ui-dom";

export function updateSoundControls(enabled: boolean) {
  $("#opening-audio-status").textContent = enabled
    ? "♫ OPENING THEME · SOUND ON"
    : "SOUND OFF";
  for (const button of document.querySelectorAll("[data-sound]")) {
    updateSoundButton(button, enabled);
  }
}

function updateSoundButton(button: Element, enabled: boolean) {
  button.setAttribute(
    "aria-label",
    enabled ? "Turn sound off" : "Turn sound on",
  );
  button.classList.toggle("muted", !enabled);
  const label = button.querySelector("span");
  if (label) {
    label.textContent = enabled ? "SOUND ON" : "SOUND OFF";
  }
}
