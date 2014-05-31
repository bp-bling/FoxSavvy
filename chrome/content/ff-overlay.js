var foxsavvy = {
  onLoad: function() {
    // initialization code
    this.initialized = true;
    this.strings = document.getElementById("foxsavvy-strings");
  }
};

window.addEventListener("load", function () { foxsavvy.onLoad(); }, false);


foxsavvy.onFirefoxLoad = function(event) {
  document.getElementById("contentAreaContextMenu")
          .addEventListener("popupshowing", function (e) {
    foxsavvy.showFirefoxContextMenu(e);
  }, false);
};

foxsavvy.showFirefoxContextMenu = function(event) {
  // show or hide the menuitem based on what the context menu is on
  document.getElementById("context-foxsavvy").hidden = gContextMenu.onImage;
};

window.addEventListener("load", function () { foxsavvy.onFirefoxLoad(); }, false);