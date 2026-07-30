// Service worker: open editor in a dedicated tab when the action icon is clicked.
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('editor.html')
  })
})
