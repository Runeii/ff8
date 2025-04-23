import { create } from "zustand";

export const createSFXController = (id: string | number) => {
  const {getState, setState} = create(() => ({
    id,
    generalChannel: [] as Howl[],
    channels: {} as {
      [key: number]: Howl;
    },
  }));

  const setPanForHowl = (howl: Howl, pan: number) => {
    howl.stereo((pan - 256 / 2));
  }

  const setVolumeForHowl = (howl: Howl, volume: number) => {
    howl.volume(volume / 255);
  }

  const fadeVolumeForHowl = (howl: Howl, volume: number, duration: number) => {
    howl.fade(howl.volume(), volume / 255, duration);
  }

  const fadePanForHowl = (howl: Howl, pan: number, duration: number) => {
    howl.fade(howl.stereo(), (pan - 256 / 2) - 1, duration);
  }

  const stopHowl = (howl: Howl) => {
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
      volume: 1,
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
    const howls = getExistingHowlsByChannel(channel);

    howls.forEach((howl) => {
      stopHowl(howl);
    })
  }


  const setVolume = (channel: number | undefined, volume: number, duration?: number) => {
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