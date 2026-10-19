// 화면 쪽에 열어 주는 기능은 이것뿐이다.
const { contextBridge, ipcRenderer } = require('electron');

function on(channel, cb) {
  const handler = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld('island', {
  getState: () => ipcRenderer.invoke('state:get'),
  onState: (cb) => on('state', cb),
  onPanelShown: (cb) => on('panel:shown', cb),
  onPanelOpen: (cb) => on('panel:open', cb),
  togglePanel: () => ipcRenderer.send('panel:toggle'),
  hidePanel: () => ipcRenderer.send('panel:hide'),
  setPanelSize: (w, h) => ipcRenderer.send('panel:size', { w, h }),
  setWidgetSize: (w, h) => ipcRenderer.send('widget:size', { w, h }),
  setWidgetEnabled: (on) => ipcRenderer.send('widget:enabled', Boolean(on)),
  moveWidget: () => ipcRenderer.send('widget:move'),
  placeWidget: () => ipcRenderer.send('widget:place'),
  addAccount: (provider) => ipcRenderer.invoke('account:add', provider),
  removeAccount: (id) => ipcRenderer.invoke('account:remove', id),
  relogin: (id) => ipcRenderer.invoke('account:relogin', id),
  refresh: () => ipcRenderer.invoke('usage:refresh'),
  quit: () => ipcRenderer.send('app:quit'),
});
