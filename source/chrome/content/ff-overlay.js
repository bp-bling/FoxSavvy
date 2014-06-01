var FoxSavvyUsageDataDetails = function (usageIsRealTime) {
  this.Down = 0;
  this.Total = 0;
  this.Up = 0;
  
  this.__defineGetter__("DownPredicted", function () {
    return ((this.Down == 0) || ((this.DayOfMonth == 1) && !this.UsageIsRealTime)) ? 0 : this.Down / (this.DayOfMonth - 1 + this.TodayFraction) * this.DaysInMonth;
  });
  
  this.__defineGetter__("UpPredicted", function () {
    return ((this.Up == 0) || ((this.DayOfMonth == 1) && !this.UsageIsRealTime)) ? 0 : this.Up / (this.DayOfMonth - 1 + this.TodayFraction) * this.DaysInMonth;
  });

  this.__defineGetter__("TotalPredicted", function () {
    return ((this.Total == 0) || ((this.DayOfMonth == 1) && !this.UsageIsRealTime)) ? 0 : this.Total / (this.DayOfMonth - 1 + this.TodayFraction) * this.DaysInMonth;
  });
  
  // Constructor
  this.UsageIsRealTime = usageIsRealTime;

  // Values we'll use in prediction calculations
  this.Date = new Date();
  this.DayOfMonth = this.Date.getDate();
  this.HourOfDay = this.Date.getHours();
  this.MinuteOfHour = this.Date.getMinutes();
  this.DaysInMonth = new Date(this.Date.getFullYear(), this.Date.getMonth() + 1, 0).getDate();
  this.TodayFraction = this.UsageIsRealTime ? (this.HourOfDay / 24) + (this.MinuteOfHour / 1440) : 0;
};
 
var FoxSavvyUsageData = function (usageIsRealTime) {
    this.OffPeak = new FoxSavvyUsageDataDetails(usageIsRealTime);
    this.Peak = new FoxSavvyUsageDataDetails(usageIsRealTime);
    this.All = new FoxSavvyUsageDataDetails(usageIsRealTime);
};

var FoxSavvy = function () {
  var that = this;
  
  this.onLoad = function() {
    // initialization code
    that.initialized = true;
    that.strings = document.getElementById("foxsavvy-strings");
    
    // Listen for preference changes
    that.prefs = Components.classes["@mozilla.org/preferences-service;1"]
         .getService(Components.interfaces.nsIPrefService)
         .getBranch("extensions.foxsavvy.");
    that.prefs.addObserver("", this, false);
  };
  
  this.observe = function(subject, topic, data) {
    if (topic != "nsPref:changed") { return; }
     
    if (data === "APIKey") {
        that.RefreshUsage();
    } else {
        that.UpdateDisplay();
    }
  };
  
  this.RefreshUsage = function() {
    if (that.Interval) {
        clearInterval(that.Interval);
        that.Interval = null;
    } else {
        // No interval means this function is already executing, so don't run it again
        return;
    }
    
    // Get the Username / API Key preference
    var prefManager = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);
    that.APIKey = prefManager.getCharPref('extensions.foxsavvy.APIKey').trim();

    // Check which ISP we're requesting usage for -- order counts! If one does't match it falls through to the next, teksavvy is the catchall.
    if (/^[a-z0-9_\-\.]{3,}@(data\.com|ebox\.com|electronicbox\.net|highspeed\.com|internet\.com|ppp\.com|www\.com)$/.test(that.APIKey)) { 
        that.ISP = 'Electronicbox Residential DSL';
        that.Usage = new FoxSavvyUsageData(false); // TODO Confirm whether this is realtime usage data or not
    } else if (/^[a-z0-9_\-\.]{3,}@ebox-business\.com$/.test(that.APIKey)) { 
        that.ISP = 'Electronicbox Business DSL';
        that.Usage = new FoxSavvyUsageData(false); // TODO Confirm whether this is realtime usage data or not
    } else if (/^vl[a-z]{6}$/.test(that.APIKey)) {
        that.ISP = 'Videotron TPIA';
        that.Usage = new FoxSavvyUsageData(false); // TODO Confirm whether this is realtime usage data or not
    } else if (/^[1-9]\d{4}$/.test(that.APIKey)) {
        // Valid logins are [a-z0-9]{3,20}@caneris (no .com on the end), but usage is retrieved by 5 digit account number.
        that.ISP = 'Caneris DSL'; 
        that.Usage = new FoxSavvyUsageData(false); // TODO Confirm whether this is realtime usage data or not
    } else if (/^[A-Z0-9]{7}[A-F0-9]{11}D@(start\.ca)$/.test(that.APIKey)) {
        that.ISP = 'Start DSL';
        that.RefreshUsageStart();
    } else if (/^[A-Z0-9]{7}[A-F0-9]{11}C@(start\.ca)$/.test(that.APIKey)) {
        that.ISP = 'Start Cable';
        that.RefreshUsageStart();
    } else if (/^[A-Z0-9]{7}[A-F0-9]{11}W@(start\.ca)$/.test(that.APIKey)) {
        that.ISP = 'Start Wireless';
        that.RefreshUsageStart();
    } else if (/^[A-Z0-9]{7}[A-F0-9]{11}D@(logins\.ca)$/.test(that.APIKey)) {
        that.ISP = 'Start Wholesale DSL';
        that.RefreshUsageStart();
    } else if (/^[A-Z0-9]{7}[A-F0-9]{11}C@(logins\.ca)$/.test(that.APIKey)) {
        that.ISP = 'Start Wholesale Cable';
        that.RefreshUsageStart();
    } else if (/^[A-Z0-9]{7}[A-F0-9]{11}W@(logins\.ca)$/.test(that.APIKey)) {
        that.ISP = 'Start Wholesale Wireless';
        that.RefreshUsageStart();
    } else if (/^([0-9A-F]{32})(|@teksavvy.com)(|\+[0-9]{1,4})$/.test(that.APIKey)) {
        that.ISP = 'TekSavvy';
        that.RefreshUsageTekSavvy();
    } else {
        // TODO What happens if the user doesn't show the ISP?  They won't know there's a problem
        // TODO Maybe force show the ISP on error?  Or hide the labels and show an error message?
        // TODO Can't show a popup, because it'll show with every keypress in the API textbox
        that.ISP = 'Invalid Username / API Key';
        that.Usage = new FoxSavvyUsageData(false); // TODO Confirm whether this is realtime usage data or not
    }

    that.Usage.All.Down = that.Usage.Peak.Down + that.Usage.OffPeak.Down;
    that.Usage.All.Total = that.Usage.Peak.Total + that.Usage.OffPeak.Total;
    that.Usage.All.Up = that.Usage.Peak.Up + that.Usage.OffPeak.Up;  

    // TODO Maybe colour FoxSavvy label based on success?  Green is OK, Red is error?
    that.Interval = setInterval(function () { that.RefreshUsage(); }, 30 * 60 * 1000); // 30 minutes
  };
  
  this.RefreshUsageStart = function() {
    that.Usage = new FoxSavvyUsageData(true);

    var xhr = new XMLHttpRequest();
    xhr.onload = function () {
        var OneGig = 1000 * 1000 * 1000; // This is how the Start usage checker does it
        
        var KeyPairs = this.responseText.split(',');
        // var KeyPairs = "DL=111111111111,UL=222222222222,TOTAL=333333333333,DLFREE=444444444444,ULFREE=555555555555,TOTALFREE=999999999999".split(',');
        
        for (var i = 0; i < KeyPairs.length; i++) {
            var KeyValue = KeyPairs[i].split('=');
            switch (KeyValue[0]) {
                case 'DL': that.Usage.Peak.Down = parseInt(KeyValue[1]) / OneGig; break;
                case 'DLFREE': that.Usage.OffPeak.Down = parseInt(KeyValue[1]) / OneGig; break;
                case 'TOTAL': that.Usage.Peak.Total = parseInt(KeyValue[1]) / OneGig; break;
                case 'TOTALFREE': that.Usage.OffPeak.Total = parseInt(KeyValue[1]) / OneGig; break;
                case 'UL': that.Usage.Peak.Up = parseInt(KeyValue[1]) / OneGig; break;
                case 'ULFREE': that.Usage.OffPeak.Up = parseInt(KeyValue[1]) / OneGig; break;
            }
        }
        
        that.UpdateDisplay();
    };
    xhr.onerror = function () {
        var promptService = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService);
        promptService.alert(window, 'FoxSavvy', 'Error retrieving usage information from your ISP:\n' + that.ISP);
    };
    xhr.open('GET', 'http://www.start.ca/support/capsavvy?code=' + that.APIKey, true);
    xhr.send(null);
  };
  
  this.RefreshUsageTekSavvy = function() {
    that.Usage = new FoxSavvyUsageData(false); // TODO Confirm whether this is realtime usage data or not

    var xhr = new XMLHttpRequest();
    xhr.onload = function () {
        var Data = JSON.parse(this.responseText);
        // var Data = {
                     // "odata.metadata":"https://<serviceUrl>/Usage/$metadata#UsageSummaryRecords","value":[
                       // {
                         // "StartDate":"2014-01-01T00:00:00","EndDate":"2014-01-09T00:00:00","OID":"120000","IsCurrent":true,"OnPeakDownload":12.56,"OnPeakUpload":7.98,"OffPeakDownload":0.1,"OffPeakUpload":1.04
                       // },{
                         // "StartDate":"2014-01-01T00:00:00","EndDate":"2014-01-09T00:00:00","OID":"320000","IsCurrent":true,"OnPeakDownload":20.56,"OnPeakUpload":9.98,"OffPeakDownload":0.1,"OffPeakUpload":2.07
                       // },{
                        // "StartDate":"2014-01-01T00:00:00","EndDate":"2014-01-09T00:00:00","OID":"568000","IsCurrent":true,"OnPeakDownload":32.56,"OnPeakUpload":9.98,"OffPeakDownload":54.1,"OffPeakUpload":1.07
                       // },{
                        // "StartDate":"2014-01-01T00:00:00","EndDate":"2014-01-09T00:00:00","OID":"428000","IsCurrent":true,"OnPeakDownload":32.56,"OnPeakUpload":9.98,"OffPeakDownload":54.1,"OffPeakUpload":1.07
                       // }
                     // ]
                   // };
                    
        if (Data.value) {
          for (var i = 0; i < Data.value.length; i++) {
            that.Usage.Peak.Down += Data.value[i].OnPeakDownload;
            that.Usage.Peak.Up += Data.value[i].OnPeakUpload;
            that.Usage.Peak.Total += (that.Usage.Peak.Down + that.Usage.Peak.Up);
            that.Usage.OffPeak.Down += Data.value[i].OffPeakDownload;
            that.Usage.OffPeak.Up += Data.value[i].OffPeakUpload;
            that.Usage.OffPeak.Total += (that.Usage.OffPeak.Down + that.Usage.OffPeak.Up);
          }
        }

        that.UpdateDisplay();
    };
    xhr.onerror = function () {
        var promptService = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService);
        promptService.alert(window, 'FoxSavvy', 'Error retrieving usage information from your ISP:\n' + that.ISP);
    };
    xhr.open('GET', 'https://api.teksavvy.com/web/Usage/UsageSummaryRecords?$filter=IsCurrent%20eq%20true', true);
    xhr.setRequestHeader('TekSavvy-APIKey', that.APIKey);
    xhr.send(null);
  };

  this.UpdateDisplay = function() {
    var prefManager = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);

    // Update toolbar labels
    if (prefManager.getBoolPref('extensions.foxsavvy.ShowPeak')) {
        // Displaying Peak in labels
        document.getElementById('lblDownToolbar').value = parseFloat(that.Usage.Peak.Down).toFixed(1) + ' GB';
        document.getElementById('lblDownPredictedToolbar').value = parseFloat(that.Usage.Peak.DownPredicted).toFixed(1) + ' GB';
        document.getElementById('lblUpToolbar').value = parseFloat(that.Usage.Peak.Up).toFixed(1) + ' GB';
        document.getElementById('lblUpPredictedToolbar').value = parseFloat(that.Usage.Peak.UpPredicted).toFixed(1) + ' GB';
        document.getElementById('lblTotalToolbar').value = parseFloat(that.Usage.Peak.Total).toFixed(1) + ' GB';
        document.getElementById('lblTotalPredictedToolbar').value = parseFloat(that.Usage.Peak.TotalPredicted).toFixed(1) + ' GB';
        document.getElementById('lblISPToolbar').value = that.ISP;
    } else {
        // Displaying All (Peak + Off-Peak) in labels
        document.getElementById('lblDownToolbar').value = parseFloat(that.Usage.All.Down).toFixed(1) + ' GB';
        document.getElementById('lblDownPredictedToolbar').value = parseFloat(that.Usage.All.DownPredicted).toFixed(1) + ' GB';
        document.getElementById('lblUpToolbar').value = parseFloat(that.Usage.All.Up).toFixed(1) + ' GB';
        document.getElementById('lblUpPredictedToolbar').value = parseFloat(that.Usage.All.UpPredicted).toFixed(1) + ' GB';
        document.getElementById('lblTotalToolbar').value = parseFloat(that.Usage.All.Total).toFixed(1) + ' GB';
        document.getElementById('lblTotalPredictedToolbar').value = parseFloat(that.Usage.All.TotalPredicted).toFixed(1) + ' GB';
        document.getElementById('lblISPToolbar').value = that.ISP;
    }
    
    // Update statusbar labels
    document.getElementById('lblDownStatusbar').value = document.getElementById('lblDownToolbar').value;
    document.getElementById('lblDownPredictedStatusbar').value = document.getElementById('lblDownPredictedToolbar').value;
    document.getElementById('lblUpStatusbar').value = document.getElementById('lblUpToolbar').value;
    document.getElementById('lblUpPredictedStatusbar').value = document.getElementById('lblUpPredictedToolbar').value;
    document.getElementById('lblTotalStatusbar').value = document.getElementById('lblTotalToolbar').value;
    document.getElementById('lblTotalPredictedStatusbar').value = document.getElementById('lblTotalPredictedToolbar').value;
    document.getElementById('lblISPStatusbar').value = document.getElementById('lblISPToolbar').value;
    
    // Update visibility of toolbar
    document.getElementById('pnlDownToolbar').style.display = (prefManager.getBoolPref('extensions.foxsavvy.ShowDown')) ? 'inline-block' : 'none';
    document.getElementById('pnlDownPredictedToolbar').style.display = (prefManager.getBoolPref('extensions.foxsavvy.ShowDownPredicted')) ? 'inline-block' : 'none';
    document.getElementById('pnlUpToolbar').style.display = (prefManager.getBoolPref('extensions.foxsavvy.ShowUp')) ? 'inline-block' : 'none';
    document.getElementById('pnlUpPredictedToolbar').style.display = (prefManager.getBoolPref('extensions.foxsavvy.ShowUpPredicted')) ? 'inline-block' : 'none';
    document.getElementById('pnlTotalToolbar').style.display = (prefManager.getBoolPref('extensions.foxsavvy.ShowTotal')) ? 'inline-block' : 'none';
    document.getElementById('pnlTotalPredictedToolbar').style.display = (prefManager.getBoolPref('extensions.foxsavvy.ShowTotalPredicted')) ? 'inline-block' : 'none';
    document.getElementById('lblISPToolbar').style.display = (prefManager.getBoolPref('extensions.foxsavvy.ShowISP')) ? 'inline-block' : 'none';
    
    // Update visibility of statusbar
    document.getElementById('pnlStatusbar').style.display = (prefManager.getBoolPref('extensions.foxsavvy.ShowStatusbar')) ? 'block' : 'none';
    document.getElementById('pnlDownStatusbar').style.display = document.getElementById('pnlDownToolbar').style.display;
    document.getElementById('pnlDownPredictedStatusbar').style.display = document.getElementById('pnlDownPredictedToolbar').style.display;
    document.getElementById('pnlUpStatusbar').style.display = document.getElementById('pnlUpToolbar').style.display;
    document.getElementById('pnlUpPredictedStatusbar').style.display = document.getElementById('pnlUpPredictedToolbar').style.display;
    document.getElementById('pnlTotalStatusbar').style.display = document.getElementById('pnlTotalToolbar').style.display;
    document.getElementById('pnlTotalPredictedStatusbar').style.display = document.getElementById('pnlTotalPredictedToolbar').style.display;
    document.getElementById('lblISPStatusbar').style.display = document.getElementById('lblISPToolbar').style.display;
  };
};
var foxsavvy = new FoxSavvy();

window.addEventListener("load", function () { foxsavvy.onLoad(); }, false);

foxsavvy.Interval = setInterval(function () { foxsavvy.RefreshUsage(); }, 1000);