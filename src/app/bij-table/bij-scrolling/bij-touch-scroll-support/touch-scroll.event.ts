import { TouchScrollEventSource } from './touch-scroll-event-source.enum';

export interface TouchScrollEvent {
  deltaRatio: number;
  source: TouchScrollEventSource;
}
