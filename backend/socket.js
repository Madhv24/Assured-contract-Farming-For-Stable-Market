let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

function getIO() {
  return ioInstance;
}

function emitAvailabilityUpdate(entity, id, isAvailable) {
  if (ioInstance) {
    ioInstance.emit('availability:update', { entity, id, isAvailable });
  }
}

function emitProfileStatusChanged(entity, id, status, isAvailable) {
  if (ioInstance) {
    ioInstance.emit('profileStatusChanged', { entity, id, status, isAvailable });
  }
}

module.exports = { setIO, getIO, emitAvailabilityUpdate, emitProfileStatusChanged };


