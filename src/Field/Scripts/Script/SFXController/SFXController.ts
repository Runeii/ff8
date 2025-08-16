import { create } from "zustand";
import { FieldData } from "../../../Field";
import { getSoundFromId } from "./utils";

export const createSFXController = (id: string | number, sounds: FieldData['sounds']) => {
  const {getState, setState} = create(() => ({
    id,
    generalChannel: [] as Howl[],
    channels: {} as {
      [key: number]: Howl;
    },
    preloadedSoundBank: {} as Record<number, Howl>,
  }));

  const setPanForHowl = (howl: Howl, pan: number) => {
    howl.stereo((pan - 256 / 2));
  }

  const setVolumeForHowl = (howl: Howl, volume: number) => {
    howl.volume(volume / 256);
  }

  const fadeVolumeForHowl = (howl: Howl, volume: number, duration: number) => {
    howl.fade(howl.volume(), volume / 256, duration);
  }

  const fadePanForHowl = (howl: Howl, pan: number, duration: number) => {
    howl.fade(howl.stereo(), (pan - 256 / 2) - 1, duration);
  }

  const stopHowl = (howl: Howl) => {
    howl.stop();
    howl.unload();
  }

  const createSound = (id: number) => {
    const src = `/audio/effects/${id}.mp3`;
    return new Howl({
      src: [src],
      preload: true,
      loop: false,
      autoplay: false,
      volume: 1,
    });
  }

  const play = (id: number, channel: number, volume: number, pan: number) => {
    const {channels, preloadedSoundBank} = getState();

    const howl = preloadedSoundBank[id] ?? createSound(id);

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

  const playFieldSound = (index: number, channel: number, volume: number, pan: number) => {
    const sound = getSoundFromId(sounds[index])
    if (!sound) {
      console.warn('No sound at index', index, 'in field data.')
      return;
    }
    play(sound, channel, volume, pan);
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

  const preloadMapSoundBank = async (sounds: number[]) => {
    const preloadedSoundBank: Record<number, Howl> = {}
    for await (const sound of sounds.slice(0, 10)) {
      const howl = createSound(sound);
      preloadedSoundBank[sound] = howl;
    }
    setState({ preloadedSoundBank });
  }
  
  preloadMapSoundBank(sounds);

  return {
    play,
    playFieldSound,
    setPan,
    setVolume,
    stop,
  }
}

export default createSFXController;