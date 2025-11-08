
import { EventEmitter } from 'events';

// Create a global event emitter
// This will be used to propagate rich Firestore permission errors
// from the data layer up to the UI layer without prop drilling.
export const errorEmitter = new EventEmitter();

    