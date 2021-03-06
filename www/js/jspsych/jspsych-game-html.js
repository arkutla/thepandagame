/** (July 2012, Erik Weitnauer)
The html-plugin will load and display an external html pages. To proceed to the next, the
user might either press a button on the page or a specific key. Afterwards, the page get hidden and
the plugin will wait of a specified time before it proceeds.

documentation: docs.jspsych.org
*/

jsPsych.plugins['game-html'] = (function() {

  var plugin = {};

  plugin.info = {
    name: 'game-html',
    description: '',
    parameters: {
      url: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'URL',
        default: undefined,
        description: 'The url of the external html page'
      },
      cont_key: {
        type: jsPsych.plugins.parameterType.KEYCODE,
        pretty_name: 'Continue key',
        default: null,
        description: 'The key to continue to the next page.'
      },
      cont_btn: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Continue button',
        default: null,
        description: 'The button to continue to the next page.'
      },
      check_fn: {
        type: jsPsych.plugins.parameterType.FUNCTION,
        pretty_name: 'Check function',
        default: function() { return true; },
        description: ''
      },
      force_refresh: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Force refresh',
        default: false,
        description: 'Refresh page.'
      },
      // if execute_Script == true, then all javascript code on the external page
      // will be executed in the plugin site within your jsPsych test
      execute_script: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Execute scripts',
        default: true,
        description: 'If true, JS scripts on the external html file will be executed.'
      }
    }
  }

  plugin.trial = function(display_element, trial) {

    display_element.innerHTML = task_html;

    document.getElementById('practiceDisplay').style.display = "none";

    var url = trial.url;
    if (trial.force_refresh) {
      url = trial.url + "?t=" + performance.now();
    }

    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% //
    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% IMAGES %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% //
    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% //

    var pandaLeft = new Image();
    pandaLeft.src = "images/pandaLeft.png";
    var pandaRight = new Image();
    pandaRight.src = "images/pandaRight.png";
    var pandaHappyLeft = new Image();
    pandaHappyLeft.src = "images/pandaHappyLeft.png";
    var pandaHappyRight = new Image();
    pandaHappyRight.src = "images/pandaHappyRight.png";

    var honeyDropLarge = new Image();
    honeyDropLarge.src = "images/honeyDropLarge.png"
    var honeyDropMedium = new Image();
    honeyDropMedium.src = "images/honeyDropMedium.png"
    var honeyDropSmall = new Image();
    honeyDropSmall.src = "images/honeyDropSmall.png"

    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% //
    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% REWARDS %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% //
    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% //

    // shades of one colour for the path traces
    var colours = chroma.scale(['#e8ffe1','#79885d']).mode('lch').colors(20);
    var coloursReward = chroma.scale(['#fff9cc','#eec01b']).mode('lch').colors(3);

    for(var i = 0; i <= _MAXDIMENSIONX; i++) {
      for(var j = 0; j<= _MAXDIMENSIONY; j++) {
        if (grid[i][j] != 0){
          if (grid[i][j] > colours.length-1){
            document.getElementById(canvas.concat(pad(i,padding),pad(j,padding))).style.background = colours[colours.length-1]; // display current number of traces
          } else {
            document.getElementById(canvas.concat(pad(i,padding),pad(j,padding))).style.background = colours[grid[i][j]]; // display current number of traces
          };
        };
        if (DEVELOPER){ // Visualisation of honeywells only in developer modus
          if (rewards[i][j] == _CENTREREWARD){
            document.getElementById(canvas.concat(pad(i,padding),pad(j,padding))).style.background = coloursReward[2];
          } else if (rewards[i][j] == _FIRSTREWARD){
            document.getElementById(canvas.concat(pad(i,padding),pad(j,padding))).style.background = coloursReward[1];
          } else if (rewards[i][j] == _SECONDREWARD){
            document.getElementById(canvas.concat(pad(i,padding),pad(j,padding))).style.background = coloursReward[0];
          };
        };
      };
    };

    document.getElementById(canvas.concat(pad(maxDimensionX,padding),pad(0,padding))).style.background = "black";
    var pandaL = document.getElementById("canvasLeft");
    var ctxL = pandaL.getContext("2d");
    pandaLeft.onload = function() {
        ctxL.drawImage(pandaLeft, 0, 0, 60, 45);
    };

    document.getElementById(canvas.concat(pad(0,padding),pad(0,padding))).style.background = "black";
    var pandaR = document.getElementById("canvasRight");
    var ctxR = pandaR.getContext("2d");
    pandaRight.onload = function() {
        ctxR.drawImage(pandaRight, 0, 0, 60, 45);
    };

    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% //
    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% START %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% //
    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% //

    if (_MAXDIMENSIONX % 2 == 0){ // if grid is of even size
      var currentX = _MAXDIMENSIONX/2; // starting one to the left of centre
    } else { // if not
      var currentX = (_MAXDIMENSIONX+1)/2; // starting in the centre
    }
    var currentY = _MAXDIMENSIONY; // starting canvas at the bottom

    grid[currentX][currentY] += 1; // add one trace to starting point and...
    // ... update the frame and colour of the starting point
    document.getElementById(canvas.concat(pad(currentX,padding),pad(currentY,padding))).style.background = colours[grid[currentX][currentY]]; // display current number of traces
    document.getElementById(canvas.concat(pad(currentX,padding),pad(currentY,padding))).style.border = "2px solid #000000"; // starting border

    honey = _HONEY;
    points = 0;
    let energy = document.getElementById("energy")
    document.getElementById("honey").innerHTML = _HONEY;
    document.getElementById("points").innerHTML = "£ "+0.00;

    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% //
    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% MOVING %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% //
    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% //

    var tracesUp = undefined;
    var tracesLeft = undefined;
    var tracesRight = undefined;
    var tracesDown = undefined;

    $(document).keyup(function(event) {
      var moved = 0;
      if (energy.value > 0 & event.keyCode == 37 & currentX > 0){ // ASCII code for key 'Arrow Left' and condition it is not on the boundary
        document.getElementById(canvas.concat(pad(currentX,padding),pad(currentY,padding))).style.border = "2px solid #FFFFFF"; // set current frame to white
        getTraces();
        var trialData = [currentX,currentY,"left",energy.value,honey,points,tracesUp,tracesLeft,tracesRight,tracesDown];
        currentX -= 1; // decrease X coordinate by 1
        moved = 1;
      } else if (energy.value > 0 & event.keyCode == 39 & currentX < maxDimensionX){ // 'right'
        document.getElementById(canvas.concat(pad(currentX,padding),pad(currentY,padding))).style.border = "2px solid #FFFFFF"; // set current frame to white
        getTraces();
        var trialData = [currentX,currentY,"right",energy.value,honey,points,tracesUp,tracesLeft,tracesRight,tracesDown];
        currentX += 1; // increase X coordinate by 1
        moved = 1;
      } else if (energy.value > 0 & event.keyCode == 38 & currentY > 0) { // 'up'
        document.getElementById(canvas.concat(pad(currentX,padding),pad(currentY,padding))).style.border = "2px solid #FFFFFF"; // set current frame to white
        getTraces();
        var trialData = [currentX,currentY,"up",energy.value,honey,points,tracesUp,tracesLeft,tracesRight,tracesDown];
        currentY -= 1; // decrease Y coordinate by 1
        moved = 1;
      } else if (energy.value > 0 & event.keyCode == 40 & currentY < maxDimensionY){ // 'down'
        document.getElementById(canvas.concat(pad(currentX,padding),pad(currentY,padding))).style.border = "2px solid #FFFFFF"; // set current frame to white
        getTraces();
        var trialData = [currentX,currentY,"down",energy.value,honey,points,tracesUp,tracesLeft,tracesRight,tracesDown];
        currentY += 1; // increase Y coordinate by 1
        moved = 1;
      };
      if (moved == 1){
        data.push(trialData); // write latest choice to data
        if (condition == "conditionEasier"){
          energy.value -= Math.max(0.1,1-((grid[currentX][currentY]^(1/3))/10)); // number of energy depends on how many people have walked there before
        } else if (condition == "conditionHarder") {
          energy.value -= Math.min(2,1+((grid[currentX][currentY]^(1/3))/10)); // number of energy depends on how many people have walked there before
        } else {
          energy.value -= 1;
        }
        grid[currentX][currentY] += 1; // increase traces counter in the grid for that cell
        if (rewards[currentX][currentY] > 0){ // display that honey has been found
          honey += _DEPLETE; // rewards based on the underlying honeywell structure
          rewards[currentX][currentY] -= _DEPLETE // deplete rewards
          if (rewards[currentX][currentY] >= _FIRSTREWARD){
            var h = document.getElementById(canvas.concat(pad(currentX,padding),pad(currentY,padding)));
            var ctx = h.getContext("2d");
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.drawImage(honeyDropLarge, 0, 0, cellSize, cellSize);
          } else if (rewards[currentX][currentY] >= _SECONDREWARD) {
            var h = document.getElementById(canvas.concat(pad(currentX,padding),pad(currentY,padding)));
            var ctx = h.getContext("2d");
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.drawImage(honeyDropMedium, 0, 0, cellSize, cellSize);
          } else if (rewards[currentX][currentY] >= 1) {
            var h = document.getElementById(canvas.concat(pad(currentX,padding),pad(currentY,padding)));
            var ctx = h.getContext("2d");
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.drawImage(honeyDropSmall, 0, 0, cellSize, cellSize);
          } else {
            var h = document.getElementById(canvas.concat(pad(currentX,padding),pad(currentY,padding)));
            var ctx = h.getContext("2d");
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          };
        };
        document.getElementById("honey").innerHTML = honey.toFixed(0); // update honey counter
        document.getElementById(canvas.concat(pad(currentX,padding),pad(currentY,padding))).style.background = colours[grid[currentX][currentY]]; // display current number of traces
        if (energy.value <= 0){ // check whether the game should be over now
          theEnd();
        } else {
          if (honey > 0){
            if ((currentX == 0 & currentY == 0) | (currentX == maxDimensionX & currentY == 0)){ // if panda is reached
              points += honey/_HONEYCONVERSION; // convert honey to points
              honey = 0; // set honey to zero
              document.getElementById("points").innerHTML = "£ " + points.toFixed(2); // update field
              document.getElementById("honey").innerHTML = honey.toFixed(0); // update field
              var c = document.getElementById("canvasLeft");
              var ctx = c.getContext("2d");
              ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
              ctx.drawImage(pandaHappyLeft, 0, 0, 60, 45);
              var c = document.getElementById("canvasRight");
              var ctx = c.getContext("2d");
              ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
              ctx.drawImage(pandaHappyRight, 0, 0, 60, 45);
              document.getElementById("bambooDisplayStart").style.visibility = "hidden"; // hide bamboo at start position
              document.getElementById("bambooDisplayEnd").style.visibility = "visible"; // show bamboo at end position
            };
          };
        document.getElementById(canvas.concat(pad(currentX,padding),pad(currentY,padding))).style.border = "2px solid #000000"; // set current frame to black
        };
      };
    });

    function getTraces(){
      if (currentY == 0){
        tracesUp = "boundary";
      } else {
        tracesUp = grid[currentX][currentY-1];
      };
      if (currentX == 0){
        tracesLeft = "boundary";
      } else {
        tracesLeft = grid[currentX-1][currentY];
      };
      if (currentX == maxDimensionX){
        tracesRight = "boundary";
      } else {
        tracesRight = grid[currentX+1][currentY];
      };
      if (currentY == maxDimensionY){
        tracesDown = "boundary";
      } else {
        tracesDown = grid[currentX][currentY+1]
      };
      return (tracesUp,tracesLeft,tracesRight,tracesDown);
    };

    function theEnd(){
      data.push(grid);
      alert("Oh no. You've run out of energy.\n\nYou'll be redirected shortly.");
      setTimeout(function(){jsPsych.finishTrial(data);}, 1000);
    };

    /*
    load(display_element, url, function() {
      var t0 = performance.now();
      var finish = function() {
        if (trial.check_fn && !trial.check_fn(display_element)) { return };
        if (trial.cont_key) { display_element.removeEventListener('keydown', key_listener); }
        var trial_data = {
          rt: performance.now() - t0,
          url: trial.url
        };
        display_element.innerHTML = '';
        jsPsych.finishTrial(trial_data);
      };

      // by default, scripts on the external page are not executed with XMLHttpRequest().
      // To activate their content through DOM manipulation, we need to relocate all script tags
      if (trial.execute_script) {
        for (const scriptElement of display_element.getElementsByTagName("script")) {
        const relocatedScript = document.createElement("script");
        relocatedScript.text = scriptElement.text;
        scriptElement.parentNode.replaceChild(relocatedScript, scriptElement);
        };
      }

      //if (trial.cont_btn) { display_element.querySelector('#'+trial.cont_btn).addEventListener('click', finish); }
      if (trial.cont_key) {
        var key_listener = function(e) {
          if (e.which == trial.cont_key) finish();
        };
        display_element.addEventListener('keydown', key_listener);
      }
    });*/
  };

  // helper to load via XMLHttpRequest
  function load(element, file, callback){
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", file, true);
    xmlhttp.onload = function(){
        if(xmlhttp.status == 200 || xmlhttp.status == 0){ //Check if loaded
            element.innerHTML = xmlhttp.responseText;
            callback();
        }
    }
    xmlhttp.send();
  }

  return plugin;
})();
