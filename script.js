'use strict';

const $ = (id) => document.getElementById(id);
const presets = [...document.querySelectorAll('.preset')];
let duration = 25 * 60 * 1000;
let remaining = duration;
let deadline = 0;
let running = false;
let interval = null;
let audioContext;

function formatTime(milliseconds) {
  const total = Math.ceil(milliseconds / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function render() {
  const value = formatTime(remaining);
  $('time').textContent = value;
  $('time').classList.toggle('long', remaining >= 100 * 60 * 1000);
  $('progress').style.strokeDashoffset = 100 * (1 - remaining / duration);
  document.title = running ? `${value} — ひといき` : 'ひといき — タイマー';
}

function updateControls() {
  $('start').innerHTML = running ? '<span aria-hidden="true">Ⅱ</span> 一時停止' : `<span aria-hidden="true">▶</span> ${remaining === 0 ? 'もう一度' : remaining < duration ? '再開する' : 'スタート'}`;
  [...presets, $('minutes'), $('seconds'), $('apply')].forEach((element) => { element.disabled = running; });
}

function prepareAudio() {
  if (!$('sound').checked) return;
  try {
    const AudioClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioClass) return;
    audioContext ||= new AudioClass();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  } catch { /* The timer remains usable when audio is unavailable. */ }
}

function playChime() {
  if (!$('sound').checked || !audioContext || audioContext.state !== 'running') return;
  [660, 880, 1046].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = audioContext.currentTime + index * 0.3;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.8);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.85);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  });
}

function tick() {
  if (!running) return;
  remaining = Math.max(0, deadline - Date.now());
  if (remaining === 0) {
    running = false;
    clearInterval(interval);
    $('state').textContent = 'おつかれさまでした';
    $('end-time').textContent = 'ひと息、つきましょう。';
    $('announcement').textContent = '時間になりました。おつかれさまでした！';
    document.querySelector('.timer-card').classList.add('finished');
    updateControls();
    playChime();
  }
  render();
}

function reset() {
  running = false;
  clearInterval(interval);
  remaining = duration;
  $('state').textContent = '準備できました';
  $('end-time').textContent = '小さな集中を、ここから。';
  $('announcement').textContent = '準備ができたら、はじめましょう。';
  document.querySelector('.timer-card').classList.remove('finished');
  updateControls();
  render();
}

function setDuration(totalSeconds) {
  duration = totalSeconds * 1000;
  $('minutes').value = Math.floor(totalSeconds / 60);
  $('seconds').value = totalSeconds % 60;
  $('input-error').textContent = '';
  presets.forEach((button) => {
    const selected = Number(button.dataset.minutes) * 60 === totalSeconds;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  reset();
}

$('start').addEventListener('click', () => {
  if (running) {
    tick();
    if (!running) return;
    running = false;
    clearInterval(interval);
    $('state').textContent = '一時停止中';
    $('end-time').textContent = 'あなたのペースで、大丈夫。';
    $('announcement').textContent = '再開すると、残り時間から続けられます。';
  } else {
    prepareAudio();
    if (remaining === 0) reset();
    deadline = Date.now() + remaining;
    running = true;
    $('state').textContent = 'タイマー進行中';
    $('end-time').textContent = `${new Date(deadline).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} に終了予定`;
    $('announcement').textContent = 'ひとつずつ、ゆっくりと。';
    interval = setInterval(tick, 100);
  }
  updateControls();
  render();
});

$('reset').addEventListener('click', reset);
$('sound').addEventListener('change', prepareAudio);
presets.forEach((button) => button.addEventListener('click', () => setDuration(Number(button.dataset.minutes) * 60)));
$('custom-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (running) return;
  const minutes = Number($('minutes').value);
  const seconds = Number($('seconds').value);
  if (!Number.isInteger(minutes) || !Number.isInteger(seconds) || minutes < 0 || minutes > 999 || seconds < 0 || seconds > 59 || minutes * 60 + seconds === 0) {
    $('input-error').textContent = '分は0〜999、秒は0〜59で、1秒以上を設定してください。';
    return;
  }
  setDuration(minutes * 60 + seconds);
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
render();
