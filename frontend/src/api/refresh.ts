export const API_DATA_REFRESH_EVENT = "vct:data-refresh";

export const refreshCoreData = () => {
  window.dispatchEvent(new Event(API_DATA_REFRESH_EVENT));
};