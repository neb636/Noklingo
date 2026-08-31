type ActiveAudio = {
  owner: symbol;
  stop: () => void;
};

let activeAudio: ActiveAudio | undefined;

export function claimAudioChannel(owner: symbol, stop: () => void) {
  if (activeAudio?.owner !== owner) activeAudio?.stop();
  activeAudio = { owner, stop };
}

export function releaseAudioChannel(owner: symbol) {
  if (activeAudio?.owner === owner) activeAudio = undefined;
}
