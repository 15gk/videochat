let video;
let handPoseNet;
let pose = [];
let predictions = [];
let nn;
let currentState = "waiting";
let targetLabel = null;

let collectingData = false;

let poseLabel = "";

// number of hand features detected = 21

function isvalidKey(pressedKey) {
  if (pressedKey.toLowerCase() >= "a" && pressedKey.toLowerCase() <= "z")
    return true;

  return false;
}

function displayResult(result) {
  const gestureMapping = {
    A: "Hello",
    B: "Power",
    C: "ok",
    D: "Peace",
    E: "Thumps up",
    F: "Thump down",
    G: "I love you",
    H: "rock",
    I: "call me",
    J: "Bang bang",
  };
  console.log(result[0].label)
  // Get the gesture corresponding to the label
  const gesture = gestureMapping[result[0].label];

  res.innerHTML = gesture || result[0].label;
  // const res = document.getElementById("res");
  const confidence = document.getElementById("confidence");
  // res.innerHTML = result[0].label;
  let score = (result[0].confidence * 100).toFixed(2);

  let confidenceStr = score.toString() + " %";
  confidence.innerHTML = confidenceStr;
}

// check for key presses
function keyPressed() {
  // targetLabel = key;
  pressedKey = key;
  targetLabel = isvalidKey(pressedKey) ? pressedKey : null;
  // save collected data if 's' is pressed
  if (targetLabel === "s" || targetLabel === "S") {
    nn.saveData();
  } else if (targetLabel) {
    console.log("Collecting");
    console.log(targetLabel);
    currentState = "collecting";

    // Stop collecting after 5 seconds
    setTimeout(() => {
      console.log("Stopped Collecting");
      currentState = "waiting";
      targetLabel = null;
    }, 10000);
  }
}

function modelLoaded() {
  console.log("Handpose net loaded");
}

function trainModel() {
  // console.log("loading data");
  // console.log(nn.data);
  // nn.loadData("gestures.json", beginTraining());
  // beginTraining();
}

function beginTraining() {
  console.log("Training started");
  nn.normalizeData();
  nn.train({ epochs: 50 }, finishTrain);
}

function finishTrain() {
  console.log("train finished");
  nn.save();
}

function setup() {
  const cnv = createCanvas(640, 480);

  video = createCapture(VIDEO);
  
  video.size(width, height);

  // initialize hand pose net
  handPoseNet = ml5.handpose(video, modelLoaded);
  // handPoseNet.on("predict", gotHandPoses);
  handPoseNet.on("predict", (results) => {
    predictions = results;
    console.log(results);
    gotHandPoses(results);
  });

  video.hide();

  const options = {
    inputs: 21 * 3,
    outputs: 10,
    task: "classification",
    debug: true,
  };

  const modelInfo = {
    model: "model/model.json",
    metadata: "model/model_meta.json",
    weights: "model/model.weights.bin",
  };

  nn = ml5.neuralNetwork(options); // initialize dense neural network
  nn.load(modelInfo, nnLoaded);

  cnv.id("mycanvas");
  cnv.parent("canvasContainer");
}

function nnLoaded() {
  console.log("Dense Model loaded");
  classifyGesture();
}

function classifyGesture() {
  if (pose.length > 0) {
    let inputs = []; // inputs for neural network

    for (let i = 0; i < pose.length; i++) {
      // Storing feature co-ordinates in 1-D array
      const x = parseFloat(pose[i][0].toFixed(2));
      const y = parseFloat(pose[i][1].toFixed(2));
      const z = parseFloat(pose[i][2].toFixed(2));
      inputs.push(x);
      inputs.push(y);
      inputs.push(z);
    }
    nn.classify(inputs, gotResults);
    // console.log(gotResults)
  } else {
    setTimeout(classifyGesture, 100);
  }
}

function gotResults(err, results) {
  // console.log("label: ", results[0].label);
  poseLabel = results[0].label;
  // console.log(results)
  displayResult(results);
  classifyGesture();
}

function gotHandPoses(result) {
  if (result.length > 0) {
    pose = result[0].landmarks; // co-ordinates of the features

    if (currentState == "collecting") {
      let inputs = []; // inputs for neural network

      for (let i = 0; i < pose.length; i++) {
        // Storing feature co-ordinates in 1-D array
        const x = parseFloat(pose[i][0].toFixed(2));
        const y = parseFloat(pose[i][1].toFixed(2));
        const z = parseFloat(pose[i][2].toFixed(2));
        inputs.push(x);
        inputs.push(y);
        inputs.push(z);
      }
      let target = [targetLabel];
      nn.addData(inputs, target); // Add the data to neural network raw array
    }
  }
}

function draw() {
  image(video, 0, 0, width, height);
  drawKeypoints();

  // fill(39, 177, 229);
  // noStroke();
  // textSize(256);
  // textAlign(CENTER, CENTER);
  // text(poseLabel, width / 2, height / 2);
}

// A function to draw ellipses over the detected keypoints
function drawKeypoints() {
  for (let i = 0; i < predictions.length; i += 1) {
    const prediction = predictions[i];
    for (let j = 0; j < prediction.landmarks.length; j += 1) {
      const keypoint = prediction.landmarks[j];
      fill(0, 255, 0);
      noStroke();
      ellipse(keypoint[0], keypoint[1], 10, 10);
    }
  }
}
