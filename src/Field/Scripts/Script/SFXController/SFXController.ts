import { create } from "zustand";
import { FieldData } from "../../../Field";
import { getSoundFromId } from "./utils";
import loopPoints from './loop_points.json';
import {
  AudioSourceNode,
  setupUserActivation,
  preloadMapSoundBank,
  createAudioSource,
  setVolumeForSource,
  setPanForSource,
  stopSource,
  playWithLoop,
} from './webAudio';

const typedLoopPoints = loopPoints as unknown as Record<number, [number, number]>;

interface SFXControllerState {
  id: string | number;
  generalChannel: AudioSourceNode[];
  channels: Record<number, AudioSourceNode[]>;
}

export const createSFXController = (id: string | number, sounds: FieldData['sounds']) => {
  setupUserActivation();

  const { getState, setState } = create<SFXControllerState>(() => ({
    id,
    generalChannel: [],
    channels: {},
  }));

  const replaceSourceInState = (oldSource: AudioSourceNode, newSource: AudioSourceNode): void => {
    const state = getState();
    const replaceInArray = (array: AudioSourceNode[]) => 
      array.map(node => node === oldSource ? newSource : node);

    setState({
      ...state,
      generalChannel: replaceInArray(state.generalChannel),
      channels: Object.fromEntries(
        Object.entries(state.channels).map(([key, nodes]) => [key, replaceInArray(nodes)])
      ),
    });
  };

  const createLoopSource = async (originalSource: AudioSourceNode): Promise<void> => {
    if (!originalSource.loopStart || !originalSource.loopEnd) {
      return
    };

    try {
      const loopSource = await createAudioSource(
        originalSource.id, 
        originalSource.gainNode.gain.value * 256, 
        originalSource.panNode.pan.value * 128 + 128,
        typedLoopPoints
      );
      
      loopSource.source.loop = true;
      loopSource.source.loopStart = originalSource.loopStart;
      loopSource.source.loopEnd = originalSource.loopEnd;
      loopSource.isLooping = true;

      console.log(`Looping sound ${originalSource.id}. Loop start: ${originalSource.loopStart}, Loop end: ${originalSource.loopEnd}`);
      loopSource.source.start(0, originalSource.loopStart);
      
      replaceSourceInState(originalSource, loopSource);
    } catch (error) {
      console.error('Failed to create loop source:', error);
    }
  };

  const addSourceToChannel = (sourceNode: AudioSourceNode, channel: number): void => {
    const state = getState();
    
    if (channel === 0) {
      setState({
        ...state,
        generalChannel: [...state.generalChannel, sourceNode],
      });
      return;
    }

    setState({
      ...state,
      channels: {
        ...state.channels,
        [channel]: [...(state.channels[channel] || []), sourceNode],
      },
    });
  };

  const play = async (id: number, channel: number, volume: number, pan: number): Promise<void> => {
    try {
      const sourceNode = await createAudioSource(id, volume, pan, typedLoopPoints);
      addSourceToChannel(sourceNode, channel);
      
      playWithLoop(sourceNode, createLoopSource);
    } catch (error) {
      console.error(`Failed to play sound ${id}:`, error);
    }
  };

  const playFieldSound = async (index: number, channel: number, volume: number, pan: number): Promise<void> => {
    const sound = getSoundFromId(sounds[index]);
    
    if (!sound) {
      console.warn('No sound at index', index, 'in field data.');
      return;
    }
    
    await play(sound, channel, volume, pan);
  };

  const getExistingSourcesByChannel = (channel?: number): AudioSourceNode[] => {
    const { channels, generalChannel } = getState();
    
    if (channel === undefined) {
      // Return all sources when no channel specified
      return [...generalChannel, ...Object.values(channels).flat()];
    }
    
    if (channel === 0) {
      return generalChannel;
    }
    
    return channels[channel] || [];
  };

  const stop = (channel?: number): void => {
    const state = getState();
    const sources = getExistingSourcesByChannel(channel);
    
    sources.forEach(stopSource);
    
    // Clear state based on channel
    if (channel === undefined) {
      setState({ ...state, generalChannel: [], channels: {} });
      return;
    } else if (channel === 0) {
      setState({ ...state, generalChannel: [] });
    } else {
      setState({
        ...state,
        channels: { ...state.channels, [channel]: [] },
      });
    }
  };

  const setVolume = (channel: number | undefined, volume: number, duration?: number): void => {
    const sources = getExistingSourcesByChannel(channel);
    sources.forEach(source => setVolumeForSource(source, volume, duration));
  };

  const setPan = (channel: number | undefined, pan: number, duration?: number): void => {
    const sources = getExistingSourcesByChannel(channel);
    sources.forEach(source => setPanForSource(source, pan, duration));
  };

  return {
    play,
    playFieldSound,
    setPan,
    setVolume,
    stop,
  };
};

export default createSFXController;