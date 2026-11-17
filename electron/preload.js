// Exposes a small, explicit API to the game page. The page itself has no Node.js access.

const { contextBridge, ipcRenderer } = require('electron');

const on = (channel, cb) => {
  const h = (e, ...args) => cb(...args);
  ipcRenderer.on(channel, h);
  return () => ipcRenderer.removeListener(channel, h);
};

contextBridge.exposeInMainWorld('native', {
  info: () => ipcRenderer.invoke('qc:info'),
  refreshDlc: () => ipcRenderer.invoke('qc:dlc'),
  quit: () => ipcRenderer.send('qc:quit'),
  setFullscreen: (v) => ipcRenderer.send('qc:fullscreen', !!v),
  openStore: (key) => ipcRenderer.send('qc:store', String(key)),
  achieve: (id) => ipcRenderer.send('qc:achieve', String(id)),
  lan: {
    host: (port) => ipcRenderer.invoke('lan:host', Number(port) || 7777),
    stop: () => ipcRenderer.invoke('lan:stop'),
  },
  steam: {
    createLobby: (max, pub) => ipcRenderer.invoke('steam:create', Number(max) || 6, !!pub),
    joinLobby: (id) => ipcRenderer.invoke('steam:join', String(id)),
    leaveLobby: () => ipcRenderer.send('steam:leave'),
    invite: () => ipcRenderer.send('steam:invite'),
    send: (to, text, reliable) => ipcRenderer.send('steam:send', String(to), String(text), !!reliable),
    broadcast: (text, reliable) => ipcRenderer.send('steam:broadcast', String(text), !!reliable),
    onMessage: (cb) => on('steam:msg', cb),
    onLobby: (cb) => on('steam:lobby', cb),
    onJoinRequest: (cb) => on('steam:joinRequest', cb),
  },
});
