const banner = document.querySelector('.interaction-banner');
const headline = document.querySelector('.interaction-title');
const body = document.querySelector('.interaction-text');

export function showPrompt(text) {
  if (!banner || !headline || !body) return;
  banner.classList.remove('hidden');
  banner.dataset.state = 'prompt';
  headline.textContent = 'Interakce';
  body.textContent = text;
}

export function showDialogue(speaker, line) {
  if (!banner || !headline || !body) return;
  banner.classList.remove('hidden');
  banner.dataset.state = 'dialogue';
  headline.textContent = speaker;
  body.textContent = line;
}

export function hideInteraction() {
  if (!banner) return;
  banner.classList.add('hidden');
  banner.dataset.state = 'hidden';
}
