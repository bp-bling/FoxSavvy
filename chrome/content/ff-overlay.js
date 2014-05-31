var foxsavvy = {
  onLoad: function() {
    // initialization code
    this.initialized = true;
    this.strings = document.getElementById("foxsavvy-strings");
  },
  
  Refresh: function() {
    document.getElementById('lblISP').value = "TODO ISP";
    document.getElementById('lblCurrentUsage').value = "123.45 GB";
    document.getElementById('lblPredictedUsage').value = "543.21 GB";
    
    setTimeout("foxsavvy.Refresh();", 30 * 60 * 1000); // 30 minutes
  }
};

window.addEventListener("load", function () { foxsavvy.onLoad(); }, false);

setTimeout("foxsavvy.Refresh();", 1000);