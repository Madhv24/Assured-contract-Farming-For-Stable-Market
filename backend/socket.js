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

function emitProgressUpdate(contractId, step, status, notes, updatedAt) {
  if (ioInstance) {
    ioInstance.to(`contract_${contractId}`).emit('progress:update', { 
      contractId, 
      step, 
      status, 
      notes, 
      updatedAt 
    });
    ioInstance.to(`contract_${contractId}`).emit('progressUpdated', { 
      contractId, step, status, notes, updatedAt 
    });
  }
}

function emitProgressFilesUpdate(contractId, step, files) {
  if (ioInstance) {
    ioInstance.to(`contract_${contractId}`).emit('progress:files:update', { 
      contractId, 
      step, 
      files 
    });
  }
}

module.exports = { 
  setIO, 
  getIO, 
  emitAvailabilityUpdate, 
  emitProfileStatusChanged,
  emitProgressUpdate,
  emitProgressFilesUpdate
};


