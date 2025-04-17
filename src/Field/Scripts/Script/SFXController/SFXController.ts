import { create } from "zustand";

export const createSFXController = (id: string | number) => {
  const {getState, setState} = create(() => ({
    id,
    generalChannel: [] as Howl[],
    channels: {} as {
      [key: number]: Howl;
    }
  }));

  const setPanForHowl = (howl: Howl, pan: number) => {
    howl.stereo((pan - 256 / 2) - 1);
    console.log('Pan', (pan - 256 / 2) - 1);
  }

  const setVolumeForHowl = (howl: Howl, volume: number) => {
    howl.volume(volume / 255);
    console.log('volume', volume / 255)
  }

  const fadeVolumeForHowl = (howl: Howl, volume: number, duration: number) => {
    howl.fade(howl.volume(), volume / 255, duration);
    console.log('fadeVolume', volume / 255, duration);
  }

  const fadePanForHowl = (howl: Howl, pan: number, duration: number) => {
    howl.fade(howl.stereo(), (pan - 256 / 2) - 1, duration);
    console.log('fadePan', (pan - 256 / 2) - 1, duration);
  }

  const stopHowl = (howl: Howl) => {
    console.log('stop', howl);
    howl.stop();
    howl.unload();
  }

  const playLoopingEffect = (loopingBackgroundEffectId: number) => {
    console.log('playLoopingEffect', loopingBackgroundEffectId);
  }

  const play = (id: number, channel: number, volume: number, pan: number) => {
    const {channels} = getState();

    const src = `/audio/effects/${id}.mp3`;
    const howl = new Howl({
      src: [src],
      preload: true,
      loop: false,
      autoplay: false,
      volume,
    });
    setVolumeForHowl(howl, volume);
    setPanForHowl(howl, pan);
    howl.play();

    setState({
      generalChannel: channel === 0 ? [
        ...getState().generalChannel,
        howl,
      ] : getState().generalChannel,
      channels: channel === 0 ?{
        ...channels,
        [channel]: howl,
      } : channels,
    })

    console.log('play', id, channel, volume, pan);
  }

  const getExistingHowlsByChannel = (channel?: number) => {
    const {channels, generalChannel} = getState();
    if (channel === 0) {
      return generalChannel.filter(Boolean);
    }
    if (channel) {
      return [channels[channel]].filter(Boolean);
    }

    return [
      ...Object.values(channels),
      ...generalChannel,
    ].filter(Boolean);
  }

  const stop = (channel: number) => {
    console.log('stop', channel);
    const howls = getExistingHowlsByChannel(channel);

    howls.forEach((howl) => {
      stopHowl(howl);
    })
  }


  const setVolume = (channel: number | undefined, volume: number, duration?: number) => {
    console.log('setVolume', channel, volume, duration);
    const howls = getExistingHowlsByChannel(channel);
    howls.forEach((howl) => {
      if (duration) {
        fadeVolumeForHowl(howl, volume, duration);
        return;
      }
      setVolumeForHowl(howl, volume);
    })
  }

  const setPan = (channel: number | undefined, pan: number, duration?: number) => {
    console.log('setPan', channel, pan, duration);
    const howls = getExistingHowlsByChannel(channel);
    howls.forEach((howl) => {
      if (duration) {
        fadePanForHowl(howl, pan, duration);
        return;
      }
      setPanForHowl(howl, pan);
    })
  }

  return {
    play,
    playLoopingEffect,
    setPan,
    setVolume,
    stop,
  }
}

export default createSFXController;